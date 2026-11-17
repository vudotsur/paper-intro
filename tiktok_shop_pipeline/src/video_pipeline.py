"""
video_pipeline.py - Kinetic Typography & Safe-Zone Audiovisual Generator (Module 2 & 3).
Generates 100% original 1080x1920 vertical video frames respecting TikTok Safe Zone
(y_min=220, y_max=1580, right_margin=190px), AIGC disclosure rules, and dual monetization.
Strict Rust-grade rigor, timeout=30s subprocess controls, and zero external dependency fallbacks.
"""

from __future__ import annotations

import json
import os
import shutil
import struct
import subprocess
import sys
import wave
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Sequence

from .models import (
    Err,
    JobStatus,
    MonetizationTrack,
    Ok,
    PasScript,
    ReferenceRecord,
    RenderJobResult,
    Result,
)
from .reference_registry import ReferenceRegistry

# Optional Pillow import with graceful fallback
try:
    from PIL import Image, ImageDraw, ImageFont

    HAS_PIL = True
except ImportError:
    HAS_PIL = False

# ==============================================================================
# TikTok Safe Zone & Formatting Specifications
# ==============================================================================

CANVAS_WIDTH = 1080
CANVAS_HEIGHT = 1920
SAFE_ZONE_Y_MIN = 220
SAFE_ZONE_Y_MAX = 1580
SAFE_ZONE_RIGHT_MARGIN = 190
SAFE_ZONE_LEFT_MARGIN = 80
SAFE_WIDTH = CANVAS_WIDTH - SAFE_ZONE_RIGHT_MARGIN - SAFE_ZONE_LEFT_MARGIN  # 810px

# High contrast palette
COLOR_BG = (11, 15, 25)  # #0B0F19 Dark tech backdrop
COLOR_YELLOW = (255, 230, 0)  # #FFE600 High-contrast kinetic text
COLOR_WHITE = (255, 255, 255)  # #FFFFFF WCAG AAA contrast
COLOR_BLACK = (0, 0, 0)  # #000000 4px text outline
COLOR_ACCENT_RED = (255, 0, 80)  # #FF0050 TikTok pink/red
COLOR_CYAN = (0, 242, 254)  # #00F2FE Tech accent
COLOR_EMERALD = (16, 185, 129)  # #10B981 Pix D+0 / Conversion
COLOR_MUTED = (148, 163, 184)  # #94A3B8 Secondary info
COLOR_CARD_BG = (20, 26, 40)  # Dark container box

REVIEW_QUEUE_DIR = Path(__file__).resolve().parent.parent / "review_queue"
QUEUE_INDEX_FILE = REVIEW_QUEUE_DIR / "review_queue_index.json"


# ==============================================================================
# Pure-Python BMP Generator (Fallback when Pillow is absent)
# ==============================================================================


def generate_pure_bmp_frame(
    width: int,
    height: int,
    bg_color: tuple[int, int, int] = COLOR_BG,
    accent_box_color: tuple[int, int, int] = COLOR_YELLOW,
) -> bytes:
    """
    Generate valid uncompressed 24-bit BMP image in pure Python stdlib.
    Guarantees $0 external dependency survival.
    """
    row_bytes = width * 3
    padding = (4 - (row_bytes % 4)) % 4
    image_size = (row_bytes + padding) * height
    file_size = 54 + image_size

    # BMP Header (14 bytes) + DIB Header (40 bytes)
    header = struct.pack(
        "<2sIHHI",
        b"BM",
        file_size,
        0,
        0,
        54,
    )
    dib = struct.pack(
        "<IIIHHIIIIII",
        40,
        width,
        height,
        1,
        24,
        0,
        image_size,
        2835,  # 72 DPI
        2835,
        0,
        0,
    )

    bg_bgr = bytes([bg_color[2], bg_color[1], bg_color[0]])
    accent_bgr = bytes([accent_box_color[2], accent_box_color[1], accent_box_color[0]])
    pad_bytes = b"\x00" * padding

    # Construct pixel array bottom-to-top (standard BMP order)
    pixel_rows: list[bytes] = []
    box_y_start = height - SAFE_ZONE_Y_MAX
    box_y_end = height - SAFE_ZONE_Y_MIN

    for y in range(height):
        if box_y_start <= y <= box_y_end:
            # Draw safe-zone vertical indicator block
            left_part = bg_bgr * SAFE_ZONE_LEFT_MARGIN
            box_part = accent_bgr * 12 + bg_bgr * (SAFE_WIDTH - 24) + accent_bgr * 12
            right_part = bg_bgr * SAFE_ZONE_RIGHT_MARGIN
            row = left_part + box_part + right_part + pad_bytes
        else:
            row = (bg_bgr * width) + pad_bytes
        pixel_rows.append(row)

    return header + dib + b"".join(pixel_rows)


# ==============================================================================
# Native Windows SAPI Audio & Silent WAV Synthesizer ($0.00 OpEx)
# ==============================================================================


def generate_silent_wav(
    output_wav: Path,
    duration_sec: float = 26.0,
    sample_rate: int = 44100,
) -> bool:
    """
    Generate clean silent PCM 16-bit mono WAV as robust headless fallback.
    Pure Python standard library (wave).
    """
    try:
        output_wav.parent.mkdir(parents=True, exist_ok=True)
        num_frames = int(sample_rate * duration_sec)
        with wave.open(str(output_wav.resolve()), "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(b"\x00\x00" * num_frames)
        return output_wav.exists() and output_wav.stat().st_size > 0
    except Exception:
        return False


def generate_voiceover_sapi(
    script_text: str,
    output_wav: Path,
    timeout_sec: int = 30,
) -> bool:
    """
    Generates spoken narration audio using native Windows SAPI via PowerShell.
    Selects pt-BR voice (Maria/Daniel) with Rate=1 energetic pace.
    Executes under BELOW_NORMAL_PRIORITY_CLASS and timeout guard per Rust-Rigor directives.
    """
    try:
        output_wav.parent.mkdir(parents=True, exist_ok=True)
        # Clean script text of any newlines or bracket headers
        clean_text = " ".join(script_text.replace("\r", " ").replace("\n", " ").split())
        escaped_text = clean_text.replace("'", "''")
        wav_path_str = str(output_wav.resolve()).replace("'", "''")

        ps_script = (
            "Add-Type -AssemblyName System.Speech; "
            "$synthesizer = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
            "$voice = $synthesizer.GetInstalledVoices() | "
            "Where-Object { $_.VoiceInfo.Culture.Name -eq 'pt-BR' } | Select-Object -First 1; "
            "if ($voice) { $synthesizer.SelectVoice($voice.VoiceInfo.Name) }; "
            "$synthesizer.Rate = 1; "
            f"$synthesizer.SetOutputToWaveFile('{wav_path_str}'); "
            f"$synthesizer.Speak('{escaped_text}'); "
            "$synthesizer.Dispose();"
        )

        proc_kwargs: dict[str, Any] = {
            "stdout": subprocess.PIPE,
            "stderr": subprocess.PIPE,
            "timeout": timeout_sec,
        }
        if sys.platform == "win32":
            proc_kwargs["creationflags"] = subprocess.BELOW_NORMAL_PRIORITY_CLASS

        result = subprocess.run(
            ["powershell", "-NoProfile", "-Command", ps_script],
            **proc_kwargs,
        )
        return result.returncode == 0 and output_wav.exists() and output_wav.stat().st_size > 0
    except Exception:
        return False


def synthesize_narration(
    script_text: str,
    output_wav: Path,
    duration_sec: float = 26.0,
    timeout_sec: int = 30,
) -> bool:
    """
    Primary voiceover synthesizer:
    1. Attempts Windows SAPI pt-BR narration ($0.00 OpEx).
    2. Fallback to clean silent WAV if SAPI fails or runs in headless Linux/CI environment.
    Guarantees an audio WAV is always present on disk.
    """
    sapi_ok = generate_voiceover_sapi(script_text, output_wav, timeout_sec=timeout_sec)
    if sapi_ok:
        return True
    return generate_silent_wav(output_wav, duration_sec=duration_sec)


# ==============================================================================
# Pillow Kinetic Typography Renderer
# ==============================================================================


def _load_font(size: int) -> Any:
    """Attempt to load high-visibility sans-serif system font, fallback to default."""
    if not HAS_PIL:
        return None
    font_candidates = [
        "arialbd.ttf",
        "arial.ttf",
        "segoeuib.ttf",
        "segoeui.ttf",
        "calibrib.ttf",
        "DejaVuSans-Bold.ttf",
    ]
    for font_name in font_candidates:
        try:
            return ImageFont.truetype(font_name, size)
        except (IOError, OSError):
            continue
    return ImageFont.load_default()


def _wrap_text(text: str, max_chars_per_line: int = 24) -> list[str]:
    """Wrap words into readable kinetic lines."""
    words = text.split()
    lines: list[str] = []
    current_line: list[str] = []
    current_length = 0

    for word in words:
        if current_length + len(word) + (1 if current_line else 0) <= max_chars_per_line:
            current_line.append(word)
            current_length += len(word) + (1 if current_line else 0)
        else:
            if current_line:
                lines.append(" ".join(current_line))
            current_line = [word]
            current_length = len(word)

    if current_line:
        lines.append(" ".join(current_line))
    return lines


def render_kinetic_frame_pillow(
    record: ReferenceRecord,
    phase: str,  # 'hook' | 'agitation' | 'solution' | 'cta'
    monetization_track: MonetizationTrack,
) -> Any:
    """Render 1080x1920 kinetic frame with strict TikTok Safe Zone compliance."""
    if not HAS_PIL:
        return None

    img = Image.new("RGB", (CANVAS_WIDTH, CANVAS_HEIGHT), COLOR_BG)
    draw = ImageDraw.Draw(img)

    # 1. Subtle decorative background lines inside safe boundaries
    for y_coord in range(SAFE_ZONE_Y_MIN, SAFE_ZONE_Y_MAX, 180):
        draw.line(
            [(SAFE_ZONE_LEFT_MARGIN, y_coord), (SAFE_ZONE_LEFT_MARGIN + SAFE_WIDTH, y_coord)],
            fill=(25, 33, 50),
            width=2,
        )

    # 2. Top Header inside Safe Zone (y = 230 to 300)
    font_header = _load_font(26)
    font_badge = _load_font(22)
    font_title = _load_font(46)
    font_body = _load_font(32)
    font_cta = _load_font(36)

    # Mandatory AIGC Badge
    aigc_text = "● AIGC: CONTEÚDO GERADO POR IA"
    draw.rounded_rectangle(
        [
            (SAFE_ZONE_LEFT_MARGIN, SAFE_ZONE_Y_MIN + 10),
            (SAFE_ZONE_LEFT_MARGIN + 480, SAFE_ZONE_Y_MIN + 56),
        ],
        radius=8,
        fill=(220, 38, 38),  # Red alert badge
    )
    draw.text(
        (SAFE_ZONE_LEFT_MARGIN + 16, SAFE_ZONE_Y_MIN + 20),
        aigc_text,
        fill=COLOR_WHITE,
        font=font_badge,
    )

    # Track Badge (Top Right of Safe Zone)
    track_title = (
        "TIKTOK SHOP AFILIADO"
        if monetization_track == "TIKTOK_SHOP_AFFILIATE"
        else "BIO PIX D+0"
    )
    draw.rounded_rectangle(
        [
            (SAFE_ZONE_LEFT_MARGIN + SAFE_WIDTH - 280, SAFE_ZONE_Y_MIN + 10),
            (SAFE_ZONE_LEFT_MARGIN + SAFE_WIDTH, SAFE_ZONE_Y_MIN + 56),
        ],
        radius=8,
        fill=(30, 41, 59),
        outline=COLOR_CYAN,
        width=2,
    )
    draw.text(
        (SAFE_ZONE_LEFT_MARGIN + SAFE_WIDTH - 265, SAFE_ZONE_Y_MIN + 20),
        track_title,
        fill=COLOR_CYAN,
        font=font_badge,
    )

    # 3. Phase Banner (y = 330)
    phase_labels = {
        "hook": ("GANCHO VIRAL (0-3s)", COLOR_ACCENT_RED),
        "agitation": ("DOR REAL & AGITAÇÃO (3-9s)", (249, 115, 22)),
        "solution": ("SOLUÇÃO & DEMO (9-20s)", COLOR_EMERALD),
        "cta": ("CHAMADA PARA AÇÃO (20-26s)", COLOR_YELLOW),
    }
    label_txt, label_col = phase_labels.get(phase, ("DESTAQUE", COLOR_YELLOW))

    draw.rounded_rectangle(
        [
            (SAFE_ZONE_LEFT_MARGIN, SAFE_ZONE_Y_MIN + 110),
            (SAFE_ZONE_LEFT_MARGIN + 380, SAFE_ZONE_Y_MIN + 155),
        ],
        radius=6,
        fill=(15, 23, 42),
        outline=label_col,
        width=2,
    )
    draw.text(
        (SAFE_ZONE_LEFT_MARGIN + 16, SAFE_ZONE_Y_MIN + 120),
        label_txt,
        fill=label_col,
        font=font_header,
    )

    # 4. Central Kinetic Typography Headline (y = 420 to 900)
    pas = record.script_structure_pas
    current_text = {
        "hook": pas.hook,
        "agitation": pas.agitation,
        "solution": pas.solution,
        "cta": pas.cta,
    }.get(phase, pas.hook)

    lines = _wrap_text(current_text, max_chars_per_line=24)
    y_text = SAFE_ZONE_Y_MIN + 220
    for line in lines[:5]:
        # High contrast text with black stroke outline
        draw.text(
            (SAFE_ZONE_LEFT_MARGIN + 10, y_text),
            line,
            fill=COLOR_YELLOW if phase in ("hook", "cta") else COLOR_WHITE,
            font=font_title,
            stroke_width=4,
            stroke_fill=COLOR_BLACK,
        )
        y_text += 64

    # 5. Middle Context Card (y = 920 to 1340)
    draw.rounded_rectangle(
        [
            (SAFE_ZONE_LEFT_MARGIN, SAFE_ZONE_Y_MIN + 700),
            (SAFE_ZONE_LEFT_MARGIN + SAFE_WIDTH, SAFE_ZONE_Y_MIN + 1080),
        ],
        radius=16,
        fill=COLOR_CARD_BG,
        outline=(51, 65, 85),
        width=2,
    )

    card_y = SAFE_ZONE_Y_MIN + 725
    if phase == "hook":
        draw.text(
            (SAFE_ZONE_LEFT_MARGIN + 24, card_y),
            f"PRODUTO: {record.product_id}",
            fill=COLOR_CYAN,
            font=font_header,
        )
        card_y += 40
        draw.text(
            (SAFE_ZONE_LEFT_MARGIN + 24, card_y),
            f"NICHO: {record.niche_name or 'Comércio Eletrônico'}",
            fill=COLOR_MUTED,
            font=font_badge,
        )
        card_y += 45
        pain_lines = _wrap_text(f"Alerta: {record.target_audience_pain}", max_chars_per_line=36)
        for pl in pain_lines[:3]:
            draw.text(
                (SAFE_ZONE_LEFT_MARGIN + 24, card_y),
                pl,
                fill=COLOR_WHITE,
                font=font_body,
            )
            card_y += 38
    elif phase == "agitation":
        draw.text(
            (SAFE_ZONE_LEFT_MARGIN + 24, card_y),
            "CONSEQUÊNCIA INVISÍVEL NO BOLSO",
            fill=(249, 115, 22),
            font=font_header,
        )
        card_y += 40
        draw.text(
            (SAFE_ZONE_LEFT_MARGIN + 24, card_y),
            "Falta de controle gera perdas diárias no caixa",
            fill=COLOR_MUTED,
            font=font_badge,
        )
        card_y += 45
        agit_lines = _wrap_text(
            "Sem ferramentas adequadas, pequenas perdas e taxas acumulam centenas de reais todo mês sem você perceber.",
            max_chars_per_line=36,
        )
        for al in agit_lines[:3]:
            draw.text(
                (SAFE_ZONE_LEFT_MARGIN + 24, card_y),
                al,
                fill=COLOR_WHITE,
                font=font_body,
            )
            card_y += 38
    elif phase == "solution":
        draw.text(
            (SAFE_ZONE_LEFT_MARGIN + 24, card_y),
            "APRESENTAÇÃO PRÁTICA DA FERRAMENTA",
            fill=COLOR_EMERALD,
            font=font_header,
        )
        card_y += 40
        draw.text(
            (SAFE_ZONE_LEFT_MARGIN + 24, card_y),
            f"Solução Direta: {record.product_id}",
            fill=COLOR_CYAN,
            font=font_badge,
        )
        card_y += 45
        sol_lines = _wrap_text(
            "Cálculo automático de contas, fluxo de caixa e lucro líquido em menos de 5 minutos por dia.",
            max_chars_per_line=36,
        )
        for sl in sol_lines[:3]:
            draw.text(
                (SAFE_ZONE_LEFT_MARGIN + 24, card_y),
                sl,
                fill=COLOR_WHITE,
                font=font_body,
            )
            card_y += 38
    else:  # cta
        draw.text(
            (SAFE_ZONE_LEFT_MARGIN + 24, card_y),
            "OFERTA & GARANTIA INCONDICIONAL",
            fill=COLOR_YELLOW,
            font=font_header,
        )
        card_y += 40
        draw.text(
            (SAFE_ZONE_LEFT_MARGIN + 24, card_y),
            "Garantia de 7 dias (CDC Art. 49) • Reembolso via Pix",
            fill=COLOR_MUTED,
            font=font_badge,
        )
        card_y += 45
        cta_lines = _wrap_text(
            "Acesso imediato no seu e-mail/WhatsApp. Pagamento único sem assinaturas recorrentes.",
            max_chars_per_line=36,
        )
        for cl in cta_lines[:3]:
            draw.text(
                (SAFE_ZONE_LEFT_MARGIN + 24, card_y),
                cl,
                fill=COLOR_WHITE,
                font=font_body,
            )
            card_y += 38

    # 6. Bottom Safe Zone Interactive Strip (y = 1380 to 1540)
    btn_top = SAFE_ZONE_Y_MIN + 1160
    btn_bottom = SAFE_ZONE_Y_MIN + 1280

    if phase == "hook":
        draw.rounded_rectangle(
            [
                (SAFE_ZONE_LEFT_MARGIN, btn_top),
                (SAFE_ZONE_LEFT_MARGIN + SAFE_WIDTH, btn_bottom),
            ],
            radius=18,
            fill=(30, 41, 59),
            outline=COLOR_ACCENT_RED,
            width=2,
        )
        draw.text(
            (SAFE_ZONE_LEFT_MARGIN + 80, btn_top + 25),
            "⚠️ ATENÇÃO: NÃO IGNORE ESTE AVISO",
            fill=COLOR_WHITE,
            font=font_cta,
        )
        draw.text(
            (SAFE_ZONE_LEFT_MARGIN + 140, btn_top + 75),
            "Assista até o final para entender a solução",
            fill=COLOR_MUTED,
            font=font_badge,
        )
    elif phase == "agitation":
        draw.rounded_rectangle(
            [
                (SAFE_ZONE_LEFT_MARGIN, btn_top),
                (SAFE_ZONE_LEFT_MARGIN + SAFE_WIDTH, btn_bottom),
            ],
            radius=18,
            fill=(35, 23, 20),
            outline=(249, 115, 22),
            width=2,
        )
        draw.text(
            (SAFE_ZONE_LEFT_MARGIN + 55, btn_top + 25),
            "💸 O PREJUÍZO INVISÍVEL NO FIM DO MÊS",
            fill=(249, 115, 22),
            font=font_cta,
        )
        draw.text(
            (SAFE_ZONE_LEFT_MARGIN + 150, btn_top + 75),
            "Veja a demonstração da ferramenta a seguir ⬇️",
            fill=COLOR_WHITE,
            font=font_badge,
        )
    elif phase == "solution":
        draw.rounded_rectangle(
            [
                (SAFE_ZONE_LEFT_MARGIN, btn_top),
                (SAFE_ZONE_LEFT_MARGIN + SAFE_WIDTH, btn_bottom),
            ],
            radius=18,
            fill=(15, 35, 25),
            outline=COLOR_EMERALD,
            width=2,
        )
        draw.text(
            (SAFE_ZONE_LEFT_MARGIN + 75, btn_top + 25),
            "📊 DEMONSTRAÇÃO PRÁTICA EM VÍDEO",
            fill=COLOR_EMERALD,
            font=font_cta,
        )
        draw.text(
            (SAFE_ZONE_LEFT_MARGIN + 130, btn_top + 75),
            "Planilha Inteligente • Sem Mensalidades • Celular/PC",
            fill=COLOR_WHITE,
            font=font_badge,
        )
    else:  # cta
        if monetization_track == "TIKTOK_SHOP_AFFILIATE":
            draw.rounded_rectangle(
                [
                    (SAFE_ZONE_LEFT_MARGIN, btn_top),
                    (SAFE_ZONE_LEFT_MARGIN + SAFE_WIDTH, btn_bottom),
                ],
                radius=18,
                fill=COLOR_YELLOW,
            )
            draw.text(
                (SAFE_ZONE_LEFT_MARGIN + 45, btn_top + 25),
                "🛒 CLIQUE NA SACOLINHA AMARELA",
                fill=COLOR_BLACK,
                font=font_cta,
                stroke_width=1,
                stroke_fill=COLOR_BLACK,
            )
            draw.text(
                (SAFE_ZONE_LEFT_MARGIN + 120, btn_top + 75),
                "Frete Grátis • Estoque no Brasil • Envio Imediato",
                fill=(30, 41, 59),
                font=font_badge,
            )
        else:
            price_tag = "R$ 37,00" if "LT11" in record.product_id else "R$ 19,90"
            draw.rounded_rectangle(
                [
                    (SAFE_ZONE_LEFT_MARGIN, btn_top),
                    (SAFE_ZONE_LEFT_MARGIN + SAFE_WIDTH, btn_bottom),
                ],
                radius=18,
                fill=COLOR_EMERALD,
            )
            draw.text(
                (SAFE_ZONE_LEFT_MARGIN + 70, btn_top + 25),
                "⚡ LINK NO PERFIL (BIO) • PIX D+0",
                fill=COLOR_WHITE,
                font=font_cta,
                stroke_width=2,
                stroke_fill=COLOR_BLACK,
            )
            draw.text(
                (SAFE_ZONE_LEFT_MARGIN + 110, btn_top + 75),
                f"Apenas {price_tag} • Entrega Imediata • Garantia 7 Dias",
                fill=(240, 253, 244),
                font=font_badge,
            )

    return img


# ==============================================================================
# VideoPipeline Implementation
# ==============================================================================


class VideoPipeline:
    """
    Module 2 & 3: Kinetic Typography Rendering, FFmpeg Compilation, and Review Queue Management.
    """

    def __init__(self, review_queue_dir: Path | None = None) -> None:
        self.review_queue_dir = review_queue_dir or REVIEW_QUEUE_DIR
        self.queue_index_file = self.review_queue_dir / "review_queue_index.json"
        self._ensure_queue_storage()

    def _ensure_queue_storage(self) -> None:
        self.review_queue_dir.mkdir(parents=True, exist_ok=True)
        if not self.queue_index_file.exists():
            self._save_queue_index([])

    def load_queue_index(self) -> list[dict[str, Any]]:
        """Load list of review items from review_queue_index.json."""
        if not self.queue_index_file.exists():
            return []
        try:
            with open(self.queue_index_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    def _save_queue_index(self, items: list[dict[str, Any]]) -> None:
        with open(self.queue_index_file, "w", encoding="utf-8") as f:
            json.dump(items, f, indent=2, ensure_ascii=False)

    def _build_job_id(self, record_id: str) -> str:
        short_id = record_id.replace("-", "")[:8]
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        return f"job_{short_id}_{timestamp}"

    def render_job(
        self,
        record: ReferenceRecord,
        monetization_track: MonetizationTrack | None = None,
    ) -> Result[RenderJobResult, str]:
        """
        Execute full synthesis pipeline for a reference record:
        1. Determine monetization track.
        2. Generate kinetic frames (Hook, Agitation, Solution, CTA) with Safe Zone compliance.
        3. Save preview frame (.png or .bmp) and script text.
        4. Attempt FFmpeg compilation if available in PATH (with timeout=30 and priority limits).
        5. Write manifest.json and update review_queue_index.json.
        """
        track: MonetizationTrack = monetization_track or (
            "BIO_PIX_FALLBACK"
            if (
                record.product_id.startswith("BIO-PIX")
                or record.product_id.startswith("LT")
                or "PIX" in record.product_id
            )
            else "TIKTOK_SHOP_AFFILIATE"
        )

        job_id = self._build_job_id(record.record_id)
        job_dir = self.review_queue_dir / job_id
        job_dir.mkdir(parents=True, exist_ok=True)

        # 1. Write script_pas.txt
        script_file = job_dir / "script_pas.txt"
        script_text = record.script_structure_pas.full_script_text()
        script_file.write_text(script_text, encoding="utf-8")

        # 2. 4-Scene dynamic vertical 9:16 pacing (Hook 0-3s, Agitation 3-9s, Solution 9-20s, CTA 20-26s)
        phases = ["hook", "agitation", "solution", "cta"]
        durations = [3.0, 6.0, 11.0, 6.0]
        total_duration = sum(durations)  # 26.0s

        # 3. Synthesize spoken narration audio (Windows SAPI pt-BR or clean silent WAV fallback)
        narration_wav = job_dir / "narration.wav"
        spoken_text = record.script_structure_pas.spoken_narration_text()
        synthesize_narration(spoken_text, narration_wav, duration_sec=total_duration)

        # 4. Render kinetic frames
        preview_image_file = job_dir / "preview_frame.png"
        frame_files: list[Path] = []

        if HAS_PIL:
            for idx, phase_name in enumerate(phases):
                frame_img = render_kinetic_frame_pillow(record, phase_name, track)
                fpath = job_dir / f"frame_{idx:02d}_{phase_name}.png"
                frame_img.save(fpath)
                frame_files.append(fpath)
            # Copy first frame (hook) as primary preview
            shutil.copy2(frame_files[0], preview_image_file)
        else:
            # Fallback pure BMP
            bmp_bytes = generate_pure_bmp_frame(CANVAS_WIDTH, CANVAS_HEIGHT)
            bmp_file = job_dir / "preview_frame.bmp"
            bmp_file.write_bytes(bmp_bytes)
            preview_image_file = bmp_file

        # 5. Attempt FFmpeg compilation with spoken audio multiplexing
        ffmpeg_bin = shutil.which("ffmpeg")
        output_video_file = job_dir / "video.mp4"
        video_compiled = False

        if ffmpeg_bin and HAS_PIL and len(frame_files) == 4 and narration_wav.exists():
            try:
                concat_file = job_dir / "concat_list.txt"
                concat_lines = []
                for fpath, dur in zip(frame_files, durations):
                    # Use forward slashes for ffmpeg concat
                    clean_path = str(fpath.resolve()).replace("\\", "/")
                    concat_lines.append(f"file '{clean_path}'")
                    concat_lines.append(f"duration {dur}")
                concat_lines.append(f"file '{str(frame_files[-1].resolve()).replace('\\', '/')}'")
                concat_file.write_text("\n".join(concat_lines), encoding="utf-8")

                ffmpeg_cmd = [
                    ffmpeg_bin,
                    "-y",
                    "-loop", "1", "-t", str(durations[0]), "-i", str(frame_files[0].resolve()),
                    "-loop", "1", "-t", str(durations[1]), "-i", str(frame_files[1].resolve()),
                    "-loop", "1", "-t", str(durations[2]), "-i", str(frame_files[2].resolve()),
                    "-loop", "1", "-t", str(durations[3]), "-i", str(frame_files[3].resolve()),
                    "-i", str(narration_wav.resolve()),
                    "-filter_complex", "[0:v][1:v][2:v][3:v]concat=n=4:v=1:a=0[v]",
                    "-map", "[v]",
                    "-map", "4:a",
                    "-c:v", "libx264",
                    "-pix_fmt", "yuv420p",
                    "-r", "30",
                    "-preset", "veryfast",
                    "-c:a", "aac",
                    "-b:a", "192k",
                    "-af", "apad",
                    "-t", str(total_duration),
                    str(output_video_file.resolve()),
                ]

                proc_kwargs: dict[str, Any] = {
                    "stdout": subprocess.PIPE,
                    "stderr": subprocess.PIPE,
                    "timeout": 30,
                }
                if sys.platform == "win32":
                    proc_kwargs["creationflags"] = subprocess.BELOW_NORMAL_PRIORITY_CLASS

                res = subprocess.run(ffmpeg_cmd, **proc_kwargs)
                if res.returncode == 0 and output_video_file.exists() and output_video_file.stat().st_size > 0:
                    video_compiled = True
            except Exception:
                video_compiled = False

        # 6. Construct RenderJobResult
        job_result = RenderJobResult(
            job_id=job_id,
            record_id=record.record_id,
            output_video_path=str(output_video_file) if video_compiled else "",
            duration_sec=total_duration,
            resolution=f"{CANVAS_WIDTH}x{CANVAS_HEIGHT}",
            fps=30,
            status="PENDING_REVIEW",
            aigc_labeled=True,
            monetization_track=track,
            preview_image_path=str(preview_image_file),
            script_text_path=str(script_file),
            audio_wav_path=str(narration_wav) if narration_wav.exists() else "",
            created_at_utc=datetime.now(timezone.utc).isoformat(),
            notes="Aguardando validação do operador.",
        )

        # 7. Write manifest.json
        manifest_data = {
            "job": job_result.to_dict(),
            "reference_provenance": record.to_dict(),
            "audio": {
                "narration_wav_path": str(narration_wav),
                "has_audio": narration_wav.exists() and narration_wav.stat().st_size > 0,
                "audio_size_bytes": narration_wav.stat().st_size if narration_wav.exists() else 0,
            },
            "scenes": [
                {
                    "scene_index": idx,
                    "phase": phase_name,
                    "duration_sec": dur,
                    "frame_path": str(fpath),
                }
                for idx, (phase_name, dur, fpath) in enumerate(zip(phases, durations, frame_files))
            ],
        }
        manifest_file = job_dir / "manifest.json"
        manifest_file.write_text(
            json.dumps(manifest_data, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

        # 8. Update review_queue_index.json
        current_index = self.load_queue_index()
        # Relative paths for portable web viewing
        rel_preview = f"{job_id}/{preview_image_file.name}"
        rel_video = f"{job_id}/{output_video_file.name}" if video_compiled else ""
        rel_audio = f"{job_id}/{narration_wav.name}" if narration_wav.exists() else ""
        rel_script = f"{job_id}/{script_file.name}"

        index_entry = {
            "job_id": job_id,
            "record_id": record.record_id,
            "status": job_result.status,
            "product_id": record.product_id,
            "niche_name": record.niche_name,
            "monetization_track": track,
            "commission_rate": record.commission_rate,
            "duration_sec": total_duration,
            "resolution": job_result.resolution,
            "aigc_labeled": job_result.aigc_labeled,
            "preview_image": rel_preview,
            "video_path": rel_video,
            "audio_path": rel_audio,
            "script_path": rel_script,
            "created_at_utc": job_result.created_at_utc,
            "notes": job_result.notes,
            # Provenance comparison fields
            "reference_video_url": record.reference_video_url,
            "competitor_hook_text": record.competitor_hook_text,
            "target_audience_pain": record.target_audience_pain,
            "pacing_cut_intervals": list(record.pacing_cut_intervals),
            "script_structure_pas": record.script_structure_pas.to_dict(),
        }

        # Prepend to top of queue
        current_index.insert(0, index_entry)
        self._save_queue_index(current_index)

        return Ok(job_result)

    def render_all_from_registry(
        self, registry: ReferenceRegistry | None = None
    ) -> list[RenderJobResult]:
        """Iterate all records in reference registry and render jobs."""
        reg = registry or ReferenceRegistry()
        records = reg.list_records()
        if not records:
            records = reg.seed_default_catalog()

        results: list[RenderJobResult] = []
        for rec in records:
            res = self.render_job(rec)
            if res.is_ok():
                results.append(res.unwrap())
        return results

    def get_job(self, job_id: str) -> Result[RenderJobResult, str]:
        """Retrieve job manifest by job_id."""
        manifest_file = self.review_queue_dir / job_id / "manifest.json"
        if not manifest_file.exists():
            return Err(f"Job '{job_id}' not found.")
        try:
            data = json.loads(manifest_file.read_text(encoding="utf-8"))
            return Ok(RenderJobResult.from_dict(data.get("job", {})))
        except Exception as exc:
            return Err(f"Error loading job '{job_id}': {exc}")

    def update_job_status(
        self,
        job_id: str,
        status: JobStatus,
        notes: str = "",
    ) -> Result[RenderJobResult, str]:
        """Update review decision (APPROVED / REJECTED) with operator notes."""
        if status not in ("PENDING_REVIEW", "APPROVED", "REJECTED"):
            return Err(f"Invalid status '{status}'.")

        job_dir = self.review_queue_dir / job_id
        manifest_file = job_dir / "manifest.json"
        if not manifest_file.exists():
            return Err(f"Job '{job_id}' manifest not found.")

        try:
            data = json.loads(manifest_file.read_text(encoding="utf-8"))
            job_dict = data.get("job", {})
            job_dict["status"] = status
            if notes:
                job_dict["notes"] = notes
            data["job"] = job_dict

            manifest_file.write_text(
                json.dumps(data, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )

            # Update index
            index_items = self.load_queue_index()
            for item in index_items:
                if item.get("job_id") == job_id:
                    item["status"] = status
                    if notes:
                        item["notes"] = notes
                    break
            self._save_queue_index(index_items)

            return Ok(RenderJobResult.from_dict(job_dict))
        except Exception as exc:
            return Err(f"Failed to update job '{job_id}': {exc}")


# ==============================================================================
# CLI Entry Point
# ==============================================================================


def main() -> int:
    import argparse

    parser = argparse.ArgumentParser(
        description="TikTok Shop Video Generation & Review Queue Pipeline CLI"
    )
    parser.add_argument(
        "--render-all",
        action="store_true",
        help="Render all items from the reference provenance registry",
    )
    parser.add_argument(
        "--seed-registry",
        action="store_true",
        help="Populate reference provenance registry with default seed catalog",
    )
    parser.add_argument(
        "--list-queue",
        action="store_true",
        help="List current review queue entries",
    )
    parser.add_argument(
        "--approve",
        type=str,
        metavar="JOB_ID",
        help="Approve a job in review queue",
    )
    parser.add_argument(
        "--reject",
        type=str,
        metavar="JOB_ID",
        help="Reject a job in review queue",
    )
    parser.add_argument(
        "--notes",
        type=str,
        default="",
        help="Operator notes for approve/reject",
    )

    args = parser.parse_args()
    pipeline = VideoPipeline()
    registry = ReferenceRegistry()

    if args.seed_registry:
        seeds = registry.seed_default_catalog()
        print(f"[SUCCESS] Seeded {len(seeds)} records into registry.")
        return 0

    if args.render_all:
        print("[INFO] Rendering all records from reference registry...")
        jobs = pipeline.render_all_from_registry(registry)
        print(f"[SUCCESS] Rendered {len(jobs)} jobs into review_queue.")
        for j in jobs:
            print(f"  - {j.job_id} [{j.status}] video={bool(j.output_video_path)}")
        return 0

    if args.list_queue:
        items = pipeline.load_queue_index()
        print(f"[INFO] Review Queue contains {len(items)} items:")
        for it in items:
            print(
                f"  - {it.get('job_id')} | {it.get('product_id')} | Status: {it.get('status')} | Niche: {it.get('niche_name')}"
            )
        return 0

    if args.approve:
        res = pipeline.update_job_status(args.approve, "APPROVED", args.notes)
        if res.is_ok():
            print(f"[SUCCESS] Job '{args.approve}' set to APPROVED.")
            return 0
        print(f"[ERROR] {res.unwrap_err()}", file=sys.stderr)
        return 1

    if args.reject:
        res = pipeline.update_job_status(args.reject, "REJECTED", args.notes)
        if res.is_ok():
            print(f"[SUCCESS] Job '{args.reject}' set to REJECTED.")
            return 0
        print(f"[ERROR] {res.unwrap_err()}", file=sys.stderr)
        return 1

    parser.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
