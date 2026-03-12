"""
PaddleOCR engine for invoice scanning.
Handles image preprocessing, OCR, and structured text output.
Uses PaddleOCR v2 API.
"""

import io
import logging
from typing import Optional

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
from paddleocr import PaddleOCR

logger = logging.getLogger(__name__)

_ocr_instance: Optional[PaddleOCR] = None


def get_ocr() -> PaddleOCR:
    """Get or create PaddleOCR instance (lazy singleton)."""
    global _ocr_instance
    if _ocr_instance is None:
        logger.info("Initializing PaddleOCR engine...")
        _ocr_instance = PaddleOCR(
            use_angle_cls=True,
            lang="id",
            show_log=False,
            use_gpu=False,
        )
        logger.info("PaddleOCR engine ready.")
    return _ocr_instance


def preprocess_image(img: Image.Image) -> Image.Image:
    """Preprocess image for better OCR accuracy."""
    if img.mode != "RGB":
        img = img.convert("RGB")

    w, h = img.size
    if max(w, h) < 1000:
        scale = 1000 / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.3)
    img = img.filter(ImageFilter.SHARPEN)

    return img


def ocr_image(img: Image.Image) -> list[dict]:
    """
    Run PaddleOCR on a PIL Image.
    Returns list of {text, confidence, bbox, center_y, center_x} dicts.
    """
    ocr = get_ocr()
    img = preprocess_image(img)
    img_array = np.array(img)

    # PaddleOCR v2 API: ocr() returns list of pages, each page is list of lines
    # Each line: [bbox, (text, confidence)]
    result = ocr.ocr(img_array, cls=True)

    entries = []
    if result and result[0]:
        for line in result[0]:
            bbox = line[0]
            text = line[1][0]
            confidence = float(line[1][1])

            center_y = sum(p[1] for p in bbox) / 4
            center_x = sum(p[0] for p in bbox) / 4

            entries.append({
                "text": text,
                "confidence": confidence,
                "bbox": bbox,
                "center_y": center_y,
                "center_x": center_x,
            })

    # Sort top-to-bottom, left-to-right
    entries.sort(key=lambda e: (round(e["center_y"] / 15), e["center_x"]))
    return entries


def ocr_to_text(entries: list[dict], line_threshold: float = 15.0) -> str:
    """Convert OCR entries to readable text, grouping entries on the same line."""
    if not entries:
        return ""

    lines: list[list[dict]] = []
    current_line: list[dict] = []
    last_y = -999.0

    for entry in entries:
        if abs(entry["center_y"] - last_y) > line_threshold:
            if current_line:
                lines.append(current_line)
            current_line = [entry]
            last_y = entry["center_y"]
        else:
            current_line.append(entry)

    if current_line:
        lines.append(current_line)

    text_lines = []
    for line in lines:
        line.sort(key=lambda e: e["center_x"])
        text_lines.append("  ".join(e["text"] for e in line))

    return "\n".join(text_lines)


def extract_from_pdf(pdf_bytes: bytes) -> tuple[str, list[dict]]:
    """Extract text from PDF using pdfplumber, then OCR on scanned pages."""
    import pdfplumber
    from pdf2image import convert_from_bytes

    all_text_parts: list[Optional[str]] = []
    all_entries: list[dict] = []

    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            if len(text.strip()) > 50:
                all_text_parts.append(text)
            else:
                all_text_parts.append(None)

    needs_ocr = [i for i, t in enumerate(all_text_parts) if t is None]

    if needs_ocr:
        try:
            images = convert_from_bytes(pdf_bytes, dpi=300)
            for page_idx in needs_ocr:
                if page_idx < len(images):
                    entries = ocr_image(images[page_idx])
                    all_entries.extend(entries)
                    all_text_parts[page_idx] = ocr_to_text(entries)
        except Exception as e:
            logger.error(f"PDF to image conversion failed: {e}")
            for idx in needs_ocr:
                if all_text_parts[idx] is None:
                    all_text_parts[idx] = ""

    full_text = "\n\n".join(t for t in all_text_parts if t)
    return full_text, all_entries


def extract_from_image(img_bytes: bytes) -> tuple[str, list[dict]]:
    """Extract text from an image file."""
    img = Image.open(io.BytesIO(img_bytes))
    entries = ocr_image(img)
    text = ocr_to_text(entries)
    return text, entries
