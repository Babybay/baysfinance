"""
PaddleOCR microservice for Bay'sConsult invoice scanning.

Usage:
    pip install -r requirements.txt
    python main.py

Endpoints:
    POST /ocr          — OCR from uploaded file (multipart)
    POST /ocr/url      — OCR from file URL
    GET  /health       — Health check
"""

import io
import logging
import time

import requests
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ocr_engine import extract_from_image, extract_from_pdf, get_ocr

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="BaysConsult OCR Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Models ───────────────────────────────────────────────────────────────────

class OcrUrlRequest(BaseModel):
    url: str
    file_type: str = "auto"  # "auto", "pdf", "image"


class OcrEntry(BaseModel):
    text: str
    confidence: float


class OcrResponse(BaseModel):
    success: bool
    text: str
    entries: list[OcrEntry]
    page_count: int
    processing_time_ms: int
    error: str | None = None


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "engine": "PaddleOCR"}


@app.post("/ocr", response_model=OcrResponse)
async def ocr_upload(file: UploadFile = File(...)):
    """OCR from uploaded file."""
    start = time.time()

    try:
        file_bytes = await file.read()
        filename = (file.filename or "").lower()

        if filename.endswith(".pdf"):
            text, entries = extract_from_pdf(file_bytes)
            page_count = _count_pdf_pages(file_bytes)
        elif filename.endswith((".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp")):
            text, entries = extract_from_image(file_bytes)
            page_count = 1
        else:
            raise HTTPException(400, f"Unsupported file type: {filename}")

        elapsed_ms = int((time.time() - start) * 1000)

        return OcrResponse(
            success=True,
            text=text,
            entries=[OcrEntry(text=e["text"], confidence=e["confidence"]) for e in entries],
            page_count=page_count,
            processing_time_ms=elapsed_ms,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("OCR failed")
        elapsed_ms = int((time.time() - start) * 1000)
        return OcrResponse(
            success=False,
            text="",
            entries=[],
            page_count=0,
            processing_time_ms=elapsed_ms,
            error=str(e),
        )


@app.post("/ocr/url", response_model=OcrResponse)
async def ocr_from_url(req: OcrUrlRequest):
    """OCR from file URL (e.g. R2 public URL)."""
    start = time.time()

    try:
        # Download file
        resp = requests.get(req.url, timeout=60)
        resp.raise_for_status()
        file_bytes = resp.content
        content_type = resp.headers.get("content-type", "")

        # Determine file type
        file_type = req.file_type
        if file_type == "auto":
            if "pdf" in content_type or req.url.lower().endswith(".pdf"):
                file_type = "pdf"
            else:
                file_type = "image"

        if file_type == "pdf":
            text, entries = extract_from_pdf(file_bytes)
            page_count = _count_pdf_pages(file_bytes)
        else:
            text, entries = extract_from_image(file_bytes)
            page_count = 1

        elapsed_ms = int((time.time() - start) * 1000)

        return OcrResponse(
            success=True,
            text=text,
            entries=[OcrEntry(text=e["text"], confidence=e["confidence"]) for e in entries],
            page_count=page_count,
            processing_time_ms=elapsed_ms,
        )
    except Exception as e:
        logger.exception("OCR from URL failed")
        elapsed_ms = int((time.time() - start) * 1000)
        return OcrResponse(
            success=False,
            text="",
            entries=[],
            page_count=0,
            processing_time_ms=elapsed_ms,
            error=str(e),
        )


def _count_pdf_pages(pdf_bytes: bytes) -> int:
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            return len(pdf.pages)
    except Exception:
        return 0


# ─── Startup ──────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    """Pre-load OCR model on startup."""
    logger.info("Pre-loading PaddleOCR model...")
    get_ocr()
    logger.info("OCR service ready on port 8100")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8100)
