from fastapi import FastAPI, UploadFile, File, HTTPException
from pathlib import Path
from docx import Document
from pptx import Presentation
import fitz
import csv
import io

app = FastAPI(title="StudySphere AI Document Processor", version="1.1.0")
MAX_FILE_SIZE = 25 * 1024 * 1024

@app.get("/health")
def health():
    return {"status": "ok", "service": "studysphere-processor"}

@app.post("/extract")
async def extract(file: UploadFile = File(...)):
    name = file.filename or "uploaded_file"
    ext = Path(name).suffix.lower()
    data = await file.read()

    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds 25 MB limit.")

    blocks = []
    try:
        if ext == ".pdf":
            with fitz.open(stream=data, filetype="pdf") as doc:
                page_count = len(doc)
                for page_number, page in enumerate(doc, start=1):
                    page_text = page.get_text("text").strip()
                    if page_text:
                        blocks.append(f"[Page {page_number}]\\n{page_text}")
            report = {"format": "PDF", "pages": page_count, "text_pages": len(blocks), "ocr_performed": False}

        elif ext == ".docx":
            doc = Document(io.BytesIO(data))
            for number, paragraph in enumerate(doc.paragraphs, start=1):
                if paragraph.text.strip():
                    blocks.append(f"[Paragraph {number}]\\n{paragraph.text}")
            for table_number, table in enumerate(doc.tables, start=1):
                rows = [" | ".join(cell.text.replace("\\n", " ") for cell in row.cells) for row in table.rows]
                blocks.append(f"[Table {table_number}]\\n" + "\\n".join(rows))
            report = {"format": "DOCX", "paragraphs": len(doc.paragraphs), "tables": len(doc.tables)}

        elif ext == ".pptx":
            presentation = Presentation(io.BytesIO(data))
            for slide_number, slide in enumerate(presentation.slides, start=1):
                texts = [shape.text for shape in slide.shapes if hasattr(shape, "text") and shape.text.strip()]
                if texts:
                    blocks.append(f"[Slide {slide_number}]\\n" + "\\n".join(texts))
            report = {"format": "PPTX", "slides": len(presentation.slides), "text_slides": len(blocks)}

        elif ext == ".txt":
            blocks.append(data.decode("utf-8-sig", errors="replace"))
            report = {"format": "TXT"}

        elif ext == ".csv":
            content = data.decode("utf-8-sig", errors="replace")
            rows = list(csv.reader(io.StringIO(content)))
            blocks.append("[CSV data]\\n" + "\\n".join(" | ".join(row) for row in rows[:5000]))
            report = {"format": "CSV", "rows_extracted": min(len(rows), 5000), "truncated": len(rows) > 5000}

        else:
            raise HTTPException(status_code=415, detail="Supported formats: PDF, DOCX, PPTX, TXT, CSV.")

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not extract this file: {exc}") from exc

    extracted_text = "\\n\\n".join(blocks)
    return {
        "text": extracted_text,
        "report": {
            **report,
            "characters_extracted": len(extracted_text),
            "empty_text": not bool(extracted_text.strip())
        }
    }
