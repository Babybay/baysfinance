"""
FastAPI application for the Bay'sConsult document ingestion service.
Processes uploaded Excel templates and writes structured accounting data to PostgreSQL.
"""

import os
import asyncio
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from pipeline import ingest_template_file
from db import get_connection, rollback_batch, get_import_batches


# ── LIFESPAN ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.upload_dir, exist_ok=True)
    print(f"🚀 Ingestion service started on port {settings.port}")
    yield
    print("👋 Ingestion service shutting down")


app = FastAPI(
    title="Bay'sConsult Ingestion Service",
    description="Processes Excel templates into structured accounting data",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── ENDPOINTS ─────────────────────────────────────────────────────────────────


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "ingestion", "version": "1.0.0"}


@app.post("/process")
async def process_file(
    file: UploadFile = File(...),
    client_id: str = Form(...),
    imported_by: str = Form("System"),
):
    """Process a single Excel template file."""
    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(400, "File harus berformat Excel (.xlsx)")

    file_path = os.path.join(
        settings.upload_dir,
        f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}",
    )
    try:
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)

        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, ingest_template_file, file_path, client_id, imported_by
        )

        return {
            "success": result.status != "FAILED",
            "batch_id": result.batch_id,
            "status": result.status,
            "company_name": result.company_name,
            "period": result.period,
            "total_entries": result.total_entries,
            "total_assets": result.total_assets,
            "total_skipped": result.total_skipped,
            "total_errors": result.total_errors,
            "sheet_results": result.sheet_results,
            "warnings": result.warnings,
            "errors": result.errors,
        }
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)


@app.post("/batch")
async def batch_process(
    files: list[UploadFile] = File(...),
    client_ids: str = Form(...),
    imported_by: str = Form("System"),
):
    """Batch process multiple Excel files. client_ids: comma-separated."""
    ids = [cid.strip() for cid in client_ids.split(",")]
    if len(ids) != len(files):
        raise HTTPException(400, "Jumlah client_ids harus sama dengan jumlah file.")

    results = []
    semaphore = asyncio.Semaphore(5)

    async def process_one(upload: UploadFile, cid: str):
        async with semaphore:
            file_path = os.path.join(
                settings.upload_dir,
                f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{upload.filename}",
            )
            try:
                with open(file_path, "wb") as f:
                    content = await upload.read()
                    f.write(content)

                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(
                    None, ingest_template_file, file_path, cid, imported_by
                )
                return {
                    "file_name": upload.filename or "unknown",
                    "client_id": cid,
                    "success": result.status != "FAILED",
                    "batch_id": result.batch_id,
                    "status": result.status,
                    "total_entries": result.total_entries,
                    "errors": result.errors,
                }
            except Exception as e:
                return {
                    "file_name": upload.filename or "unknown",
                    "client_id": cid,
                    "success": False,
                    "errors": [str(e)],
                }
            finally:
                if os.path.exists(file_path):
                    os.remove(file_path)

    tasks = [process_one(f, cid) for f, cid in zip(files, ids)]
    results = await asyncio.gather(*tasks)

    completed = sum(1 for r in results if r["success"])
    failed = sum(1 for r in results if not r["success"])

    return {
        "success": failed == 0,
        "total_files": len(files),
        "completed": completed,
        "failed": failed,
        "results": results,
    }


@app.get("/batches/{client_id}")
async def list_batches(client_id: str):
    """List import history for a client."""
    try:
        conn = get_connection()
        try:
            batches = get_import_batches(conn, client_id)
            for b in batches:
                for key in ("completedAt", "createdAt"):
                    if b.get(key) and hasattr(b[key], "isoformat"):
                        b[key] = b[key].isoformat()
            return {"success": True, "data": batches}
        finally:
            conn.close()
    except Exception:
        return {"success": False, "data": []}


@app.post("/rollback/{batch_id}")
async def rollback(batch_id: str):
    """Rollback all entries from an import batch."""
    try:
        conn = get_connection()
        try:
            rollback_batch(conn, batch_id)
            conn.commit()
            return {"success": True, "message": "Batch berhasil di-rollback."}
        finally:
            conn.close()
    except Exception as e:
        return {"success": False, "message": str(e)}


# ── MAIN ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=True)
