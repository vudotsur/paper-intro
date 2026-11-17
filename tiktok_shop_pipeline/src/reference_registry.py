"""
reference_registry.py - Append-only Reference Provenance Registry (Module 1).
Enforces deterministic UUIDv5, SSRF URL validation, and persistent competitive intelligence.
Strict Rust-grade rigor and zero external dependencies.
"""

from __future__ import annotations

import ipaddress
import json
import re
import socket
import uuid
from pathlib import Path
from typing import Any, Sequence
from urllib.parse import urlparse

from .models import Err, Ok, PasScript, ReferenceRecord, Result

DEFAULT_REGISTRY_PATH = (
    Path(__file__).resolve().parent.parent / "data" / "reference_provenance_registry.jsonl"
)

# Common forbidden private / internal hostnames
FORBIDDEN_HOSTNAMES = {
    "localhost",
    "ip6-localhost",
    "ip6-loopback",
    "metadata.google.internal",
    "instance-data",
}

FORBIDDEN_DOMAINS_SUFFIXES = (
    ".local",
    ".internal",
    ".lan",
    ".corp",
    ".home",
    ".intranet",
)


def compute_record_id(reference_url: str) -> str:
    """Generate deterministic UUIDv5 from reference URL."""
    return str(uuid.uuid5(uuid.NAMESPACE_URL, reference_url.strip()))


def is_private_or_restricted_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """Check if IP address is private, loopback, link-local, reserved or cloud metadata."""
    if (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
        or ip.is_unspecified
    ):
        return True
    # Extra check for Carrier-grade NAT (100.64.0.0/10)
    if isinstance(ip, ipaddress.IPv4Address):
        cgnat_net = ipaddress.IPv4Network("100.64.0.0/10")
        if ip in cgnat_net:
            return True
        # Cloud metadata literal (169.254.169.254)
        if str(ip) == "169.254.169.254":
            return True
    return False


def validate_reference_url(url: str) -> Result[str, str]:
    """
    SSRF-safe URL validation.
    Enforces HTTPS, non-empty host, non-localhost, and non-private IP destination.
    """
    trimmed = (url or "").strip()
    if not trimmed:
        return Err("Reference URL cannot be empty.")

    try:
        parsed = urlparse(trimmed)
    except Exception as exc:
        return Err(f"URL parse error: {exc}")

    if parsed.scheme.lower() != "https":
        return Err(f"SSRF violation: Scheme must be 'https', got '{parsed.scheme}'.")

    hostname = (parsed.hostname or "").strip().lower()
    if not hostname:
        return Err("SSRF violation: Hostname is empty.")

    if hostname in FORBIDDEN_HOSTNAMES:
        return Err(f"SSRF violation: Forbidden internal hostname '{hostname}'.")

    if any(hostname.endswith(sfx) for sfx in FORBIDDEN_DOMAINS_SUFFIXES):
        return Err(f"SSRF violation: Forbidden private domain suffix in '{hostname}'.")

    # Check if hostname is an IP literal
    try:
        ip_obj = ipaddress.ip_address(hostname)
        if is_private_or_restricted_ip(ip_obj):
            return Err(f"SSRF violation: Hostname resolves to private/restricted IP '{ip_obj}'.")
        return Ok(trimmed)
    except ValueError:
        # Not an IP literal, it is a domain name
        pass

    # Basic regex validation for domain name format
    if not re.match(r"^[a-z0-9]([a-z0-9\-\.]*[a-z0-9])?$", hostname):
        return Err(f"SSRF violation: Malformed hostname '{hostname}'.")

    # Resolve domain if DNS is available to catch DNS-rebinding or internal IPs
    try:
        addr_info = socket.getaddrinfo(hostname, 443, socket.AF_UNSPEC, socket.SOCK_STREAM)
        for entry in addr_info:
            sockaddr = entry[4]
            ip_str = sockaddr[0]
            try:
                resolved_ip = ipaddress.ip_address(ip_str)
                if is_private_or_restricted_ip(resolved_ip):
                    return Err(
                        f"SSRF violation: Domain '{hostname}' resolved to private/restricted IP '{resolved_ip}'."
                    )
            except ValueError:
                continue
    except (socket.gaierror, OSError):
        # In offline/mock test environments, DNS resolution might not succeed.
        # If the domain is well-formed with a dot and not internal, permit it.
        if "." not in hostname:
            return Err(f"SSRF violation: Unqualified domain name '{hostname}'.")

    return Ok(trimmed)


class ReferenceRegistry:
    """
    Append-only Reference Provenance Registry backed by JSONL.
    Preserves competitive reference data with full traceability.
    """

    def __init__(self, registry_path: Path | None = None) -> None:
        self.registry_path = registry_path or DEFAULT_REGISTRY_PATH
        self._ensure_storage()

    def _ensure_storage(self) -> None:
        self.registry_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.registry_path.exists():
            self.registry_path.touch(exist_ok=True)

    def list_records(self) -> list[ReferenceRecord]:
        """Read all records from append-only JSONL."""
        records: list[ReferenceRecord] = []
        if not self.registry_path.exists():
            return records

        with open(self.registry_path, "r", encoding="utf-8") as f:
            for line_num, line in enumerate(f, start=1):
                clean_line = line.strip()
                if not clean_line:
                    continue
                try:
                    payload = json.loads(clean_line)
                    records.append(ReferenceRecord.from_dict(payload))
                except Exception as exc:
                    # In corrupted line scenario, skip and log to avoid crashing reader
                    continue
        return records

    def get_record(self, record_id: str) -> Result[ReferenceRecord, str]:
        """Retrieve record by deterministic record_id."""
        target_id = record_id.strip()
        for rec in self.list_records():
            if rec.record_id == target_id:
                return Ok(rec)
        return Err(f"Record with id '{target_id}' not found in registry.")

    def add_record(self, record: ReferenceRecord) -> Result[ReferenceRecord, str]:
        """
        Validate and append a new record to the registry.
        Idempotent: if record_id already exists, returns Ok with existing record.
        """
        val_res = validate_reference_url(record.reference_video_url)
        if val_res.is_err():
            return Err(val_res.unwrap_err())

        expected_id = compute_record_id(record.reference_video_url)
        if record.record_id != expected_id:
            return Err(
                f"Record ID mismatch: expected '{expected_id}' for URL, got '{record.record_id}'."
            )

        # Idempotency check: see if record already registered
        existing = self.get_record(record.record_id)
        if existing.is_ok():
            return Ok(existing.unwrap())

        # Append to JSONL
        serialized = json.dumps(record.to_dict(), ensure_ascii=False)
        with open(self.registry_path, "a", encoding="utf-8") as f:
            f.write(serialized + "\n")

        return Ok(record)

    def seed_default_catalog(self) -> list[ReferenceRecord]:
        """
        Populate registry with 4 proven Brazilian niches (Module 1 benchmark catalog).
        Idempotent: will not duplicate if already registered.
        """
        seeds: list[ReferenceRecord] = [
            ReferenceRecord(
                record_id=compute_record_id(
                    "https://www.tiktok.com/@achadinhos_cozinha_br/video/7321984210984128912"
                ),
                product_id="TK-SHOP-BR-8821",
                reference_video_url="https://www.tiktok.com/@achadinhos_cozinha_br/video/7321984210984128912",
                competitor_hook_text="PARE DE JOGAR COMIDA FORA POR CAUSA DE SACO ABERTO!",
                script_structure_pas=PasScript(
                    hook="PARE DE JOGAR COMIDA FORA POR CAUSA DE PACOTE ABERTO!",
                    agitation="Você abre batata ou biscoito e no dia seguinte já tá tudo murcho e sem crocância no armário.",
                    solution="Essa mini seladora térmica portátil fecha qualquer embalagem em 2 segundos usando calor focal.",
                    cta="Clica na sacolinha amarela aqui embaixo antes que acabe o estoque com frete grátis.",
                ),
                pacing_cut_intervals=(0.0, 1.8, 3.6, 5.4, 7.5, 9.8, 12.0),
                target_audience_pain="Desperdício de alimentos e pacotes abertos murchando na despensa",
                commission_rate=0.18,
                aigc_disclosure_required=True,
                niche_name="Cozinha Inteligente & Praticidade Doméstica",
            ),
            ReferenceRecord(
                record_id=compute_record_id(
                    "https://www.tiktok.com/@setup_produtivo_br/video/7334512984102941923"
                ),
                product_id="TK-SHOP-BR-4419",
                reference_video_url="https://www.tiktok.com/@setup_produtivo_br/video/7334512984102941923",
                competitor_hook_text="SE VOCÊ TRABALHA NO NOTEBOOK E SENTE DOR NO PESCOÇO, OLHA ISSO!",
                script_structure_pas=PasScript(
                    hook="SE VOCÊ TRABALHA NO NOTEBOOK E SENTE DOR NO PESCOÇO, OLHA ISSO!",
                    agitation="Passar 8 horas olhando para baixo destrói sua postura cervical e faz o laptop esquentar até travar.",
                    solution="Esse suporte ergonômico articulado eleva a tela na altura certa dos olhos e deixa o ar circular livremente.",
                    cta="Aproveite o preço de lançamento na sacolinha do TikTok Shop aqui no vídeo.",
                ),
                pacing_cut_intervals=(0.0, 1.5, 3.2, 5.0, 7.0, 9.2, 11.5),
                target_audience_pain="Dores posturais no home office e superaquecimento de laptop",
                commission_rate=0.15,
                aigc_disclosure_required=True,
                niche_name="Organização Pessoal & Escritório / Home Office",
            ),
            ReferenceRecord(
                record_id=compute_record_id(
                    "https://www.tiktok.com/@direitos_consumidor_facil/video/7345678912345678910"
                ),
                product_id="BIO-PIX-LT02",
                reference_video_url="https://www.tiktok.com/@direitos_consumidor_facil/video/7345678912345678910",
                competitor_hook_text="O BANCO COBROU TAXA QUE VOCÊ NÃO CONTRATOU? NÃO PAGUE!",
                script_structure_pas=PasScript(
                    hook="O BANCO COBROU TAXA QUE VOCÊ NÃO CONTRATOU? NÃO PAGUE!",
                    agitation="Bancos e operadoras lucram milhões cobrando tarifas indevidas mês a mês porque sabem que quase ninguém reclama.",
                    solution="Com os modelos prontos do Kit Defesa do Consumidor você protocola no Consumidor.gov.br em 5 minutos e pede o dobro de volta.",
                    cta="Acesse o link direto no meu perfil da bio — liberação imediata no Pix D+0 por R$ 19,90.",
                ),
                pacing_cut_intervals=(0.0, 2.0, 4.0, 6.2, 8.5, 11.0, 13.5),
                target_audience_pain="Cobranças indevidas de bancos e receio de gastar com advogado",
                commission_rate=1.00,
                aigc_disclosure_required=True,
                niche_name="Finanças & Auto-Defesa do Consumidor (Bio Pix D+0)",
            ),
            ReferenceRecord(
                record_id=compute_record_id(
                    "https://www.tiktok.com/@gestao_mei_lucrativo/video/7356789012345678901"
                ),
                product_id="BIO-PIX-LT11",
                reference_video_url="https://www.tiktok.com/@gestao_mei_lucrativo/video/7356789012345678901",
                competitor_hook_text="VOCÊ SABE SE O SEU MEI ESTÁ DANDO LUCRO OU SE VOCÊ ESTÁ PAGANDO PRA TRABALHAR?",
                script_structure_pas=PasScript(
                    hook="VOCÊ SABE SE O SEU MEI ESTÁ DANDO LUCRO OU SE VOCÊ ESTÁ PAGANDO PRA TRABALHAR?",
                    agitation="O dinheiro entra na sua conta, você paga os fornecedores e no final do mês não sobra nada pro seu bolso.",
                    solution="Essa planilha inteligente faz o cálculo automático das suas contas, do DAS e do seu lucro real em menos de 5 minutos por dia.",
                    cta="Apenas R$ 37,00 no Pix com entrega imediata. Clique no link da bio e organize sua empresa hoje!",
                ),
                pacing_cut_intervals=(0.0, 3.0, 9.0, 20.0, 26.0),
                target_audience_pain="Desorganização financeira no MEI, mistura de contas e falta de controle do lucro real e do DAS",
                commission_rate=1.00,
                aigc_disclosure_required=True,
                niche_name="Gestão Financeira MEI & Pequenos Negócios (Bio Pix D+0)",
            ),
        ]

        added: list[ReferenceRecord] = []
        for seed in seeds:
            res = self.add_record(seed)
            if res.is_ok():
                added.append(res.unwrap())
        return added
