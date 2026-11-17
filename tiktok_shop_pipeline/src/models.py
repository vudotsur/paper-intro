"""
models.py - Strict Rust-grade data models and monadic Result[T, E] for tiktok_shop_pipeline.
Pure Python 3.14 stdlib. Zero external dependencies.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Generic, Literal, TypeVar, Union

T = TypeVar("T")
E = TypeVar("E")
U = TypeVar("U")


# ==============================================================================
# Monadic Result[T, E]
# ==============================================================================


@dataclass(frozen=True, slots=True)
class Ok(Generic[T]):
    """Represents a successful computation containing a value."""

    value: T

    def is_ok(self) -> bool:
        return True

    def is_err(self) -> bool:
        return False

    def unwrap(self) -> T:
        return self.value

    def unwrap_or(self, default: Any) -> T:
        return self.value

    def unwrap_err(self) -> None:
        raise ValueError("Called unwrap_err on Ok")

    def map(self, fn: Callable[[T], U]) -> Ok[U]:
        return Ok(fn(self.value))

    def map_err(self, fn: Callable[[Any], Any]) -> Ok[T]:
        return self

    def and_then(self, fn: Callable[[T], Result[U, E]]) -> Result[U, E]:
        return fn(self.value)

    def __repr__(self) -> str:
        return f"Ok({self.value!r})"

    def __getattr__(self, name: str) -> Any:
        if hasattr(self.value, name):
            return getattr(self.value, name)
        raise AttributeError(f"'{type(self).__name__}' object has no attribute '{name}'")

    def __getitem__(self, item: Any) -> Any:
        return self.value[item]


@dataclass(frozen=True, slots=True)
class Err(Generic[E]):
    """Represents a failed computation containing an error payload."""

    error: E

    def is_ok(self) -> bool:
        return False

    def is_err(self) -> bool:
        return True

    def unwrap(self) -> None:
        raise ValueError(f"Called unwrap on Err: {self.error!r}")

    def unwrap_or(self, default: U) -> U:
        return default

    def unwrap_err(self) -> E:
        return self.error

    def map(self, fn: Callable[[Any], U]) -> Err[E]:
        return self

    def map_err(self, fn: Callable[[E], U]) -> Err[U]:
        return Err(fn(self.error))

    def and_then(self, fn: Callable[[Any], Any]) -> Err[E]:
        return self

    def __repr__(self) -> str:
        return f"Err({self.error!r})"


Result = Union[Ok[T], Err[E]]


# ==============================================================================
# Domain Data Models
# ==============================================================================


@dataclass(frozen=True, slots=True)
class PasScript:
    """Semiotic structure: Problem -> Agitation -> Solution + Call-to-Action."""

    hook: str
    agitation: str
    solution: str
    cta: str

    def to_dict(self) -> dict[str, str]:
        return {
            "hook": self.hook,
            "agitation": self.agitation,
            "solution": self.solution,
            "cta": self.cta,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> PasScript:
        return cls(
            hook=str(data.get("hook", "")),
            agitation=str(data.get("agitation", "")),
            solution=str(data.get("solution", "")),
            cta=str(data.get("cta", "")),
        )

    def full_script_text(self) -> str:
        return (
            f"[HOOK (0-3s)]\n{self.hook}\n\n"
            f"[AGITAÇÃO (3-9s)]\n{self.agitation}\n\n"
            f"[SOLUÇÃO (9-20s)]\n{self.solution}\n\n"
            f"[CTA (20-26s)]\n{self.cta}\n"
        )

    def spoken_narration_text(self) -> str:
        """Return clean spoken text for TTS voiceover without formatting headers."""
        return f"{self.hook} {self.agitation} {self.solution} {self.cta}"


@dataclass(frozen=True, slots=True)
class ReferenceRecord:
    """Structured competitive intelligence record (Module 1)."""

    record_id: str  # Deterministic UUIDv5 from reference_video_url
    product_id: str  # TikTok Shop SKU or Low-Ticket Identifier
    reference_video_url: str  # Original public reference URL observed
    competitor_hook_text: str  # Exact transcription of 0-3s hook
    script_structure_pas: PasScript  # Structured PAS dictionary
    pacing_cut_intervals: tuple[float, ...]  # Timing intervals in seconds
    target_audience_pain: str  # Core audience pain point
    commission_rate: float  # Affiliate commission (e.g. 0.18 = 18%)
    aigc_disclosure_required: bool = True  # TikTok mandatory disclosure
    created_at_utc: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    niche_name: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "record_id": self.record_id,
            "product_id": self.product_id,
            "reference_video_url": self.reference_video_url,
            "competitor_hook_text": self.competitor_hook_text,
            "script_structure_pas": self.script_structure_pas.to_dict(),
            "pacing_cut_intervals": list(self.pacing_cut_intervals),
            "target_audience_pain": self.target_audience_pain,
            "commission_rate": self.commission_rate,
            "aigc_disclosure_required": self.aigc_disclosure_required,
            "created_at_utc": self.created_at_utc,
            "niche_name": self.niche_name,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> ReferenceRecord:
        pas_raw = data.get("script_structure_pas", {})
        pas = (
            pas_raw
            if isinstance(pas_raw, PasScript)
            else PasScript.from_dict(pas_raw)
        )
        cuts = tuple(float(x) for x in data.get("pacing_cut_intervals", ()))
        return cls(
            record_id=str(data.get("record_id", "")),
            product_id=str(data.get("product_id", "")),
            reference_video_url=str(data.get("reference_video_url", "")),
            competitor_hook_text=str(data.get("competitor_hook_text", "")),
            script_structure_pas=pas,
            pacing_cut_intervals=cuts,
            target_audience_pain=str(data.get("target_audience_pain", "")),
            commission_rate=float(data.get("commission_rate", 0.0)),
            aigc_disclosure_required=bool(data.get("aigc_disclosure_required", True)),
            created_at_utc=str(
                data.get("created_at_utc", datetime.now(timezone.utc).isoformat())
            ),
            niche_name=str(data.get("niche_name", "")),
        )


JobStatus = Literal["PENDING_REVIEW", "APPROVED", "REJECTED"]
MonetizationTrack = Literal["TIKTOK_SHOP_AFFILIATE", "BIO_PIX_FALLBACK"]


@dataclass(frozen=True, slots=True)
class RenderJobResult:
    """Result of synthetic rendering job placed in review_queue (Module 2 & 3)."""

    job_id: str
    record_id: str
    output_video_path: str
    duration_sec: float
    resolution: str = "1080x1920"
    fps: int = 30
    status: JobStatus = "PENDING_REVIEW"
    aigc_labeled: bool = True
    monetization_track: MonetizationTrack = "TIKTOK_SHOP_AFFILIATE"
    preview_image_path: str = ""
    script_text_path: str = ""
    audio_wav_path: str = ""
    created_at_utc: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    notes: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "job_id": self.job_id,
            "record_id": self.record_id,
            "output_video_path": self.output_video_path,
            "duration_sec": self.duration_sec,
            "resolution": self.resolution,
            "fps": self.fps,
            "status": self.status,
            "aigc_labeled": self.aigc_labeled,
            "monetization_track": self.monetization_track,
            "preview_image_path": self.preview_image_path,
            "script_text_path": self.script_text_path,
            "audio_wav_path": self.audio_wav_path,
            "created_at_utc": self.created_at_utc,
            "notes": self.notes,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> RenderJobResult:
        return cls(
            job_id=str(data.get("job_id", "")),
            record_id=str(data.get("record_id", "")),
            output_video_path=str(data.get("output_video_path", "")),
            duration_sec=float(data.get("duration_sec", 0.0)),
            resolution=str(data.get("resolution", "1080x1920")),
            fps=int(data.get("fps", 30)),
            status=data.get("status", "PENDING_REVIEW"),  # type: ignore[arg-type]
            aigc_labeled=bool(data.get("aigc_labeled", True)),
            monetization_track=data.get("monetization_track", "TIKTOK_SHOP_AFFILIATE"),  # type: ignore[arg-type]
            preview_image_path=str(data.get("preview_image_path", "")),
            script_text_path=str(data.get("script_text_path", "")),
            audio_wav_path=str(data.get("audio_wav_path", "")),
            created_at_utc=str(
                data.get("created_at_utc", datetime.now(timezone.utc).isoformat())
            ),
            notes=str(data.get("notes", "")),
        )
