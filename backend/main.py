from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import shutil
import uuid
from typing import Optional
import logging
from pdf2image import convert_from_path
from PIL import Image
import os

from model_inference import get_extractor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Passport Extraction API",
    description="Extract passport information from PDF or image files using deep learning",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create upload and extracted directories
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

EXTRACTED_DIR = Path("uploads/extracted")
EXTRACTED_DIR.mkdir(parents=True, exist_ok=True)

# Mount static files for extracted images
app.mount("/extracted", StaticFiles(directory=str(EXTRACTED_DIR)), name="extracted")

# Supported file extensions
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".tiff", ".bmp"}


def is_allowed_file(filename: str) -> bool:
    """Check if file extension is allowed."""
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


def convert_pdf_to_image(pdf_path: Path, page_number: int = 1) -> Path:
    """
    Convert PDF to image.
    
    Args:
        pdf_path: Path to PDF file
        page_number: Page number to extract (1-indexed)
        
    Returns:
        Path to converted image
    """
    try:
        # Convert PDF to images
        images = convert_from_path(
            pdf_path,
            first_page=page_number,
            last_page=page_number,
            dpi=300
        )
        
        if not images:
            raise ValueError(f"No images found in PDF page {page_number}")
        
        # Save as PNG
        image_path = pdf_path.with_suffix(".png")
        images[0].save(image_path, "PNG")
        
        logger.info(f"Converted PDF to image: {image_path}")
        return image_path
        
    except Exception as e:
        logger.error(f"Error converting PDF to image: {e}")
        raise HTTPException(status_code=500, detail=f"PDF conversion failed: {str(e)}")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Passport Extraction API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "extract": "/extract"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        extractor = get_extractor()
        return {
            "status": "healthy",
            "model_loaded": extractor.model is not None,
            "model_type": extractor.model_type,
            "device": str(extractor.device)
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }


@app.post("/extract")
async def extract_passport(
    file: UploadFile = File(...),
    page_number: Optional[int] = 1
):
    """
    Extract passport information from uploaded file.
    
    Args:
        file: Uploaded PDF or image file
        page_number: Page number for PDF files (1-indexed)
        
    Returns:
        JSON response with extracted passport fields
    """
    # Validate file
    if not is_allowed_file(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Supported: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Generate unique filename
    file_id = str(uuid.uuid4())
    file_extension = Path(file.filename).suffix.lower()
    upload_path = UPLOAD_DIR / f"{file_id}{file_extension}"
    
    try:
        # Save uploaded file
        with upload_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info(f"File uploaded: {upload_path}")
        
        # Convert PDF to image if needed
        if file_extension == ".pdf":
            image_path = convert_pdf_to_image(upload_path, page_number)
        else:
            image_path = upload_path
        
        # Extract passport fields (photo and signature)
        extractor = get_extractor()
        results = extractor.extract_fields(str(image_path))
        
        # Convert file paths to URLs for frontend access
        if "extracted_images" in results:
            for field_name, field_data in results["extracted_images"].items():
                # Convert absolute path to relative URL
                file_path = Path(field_data["path"])
                field_data["url"] = f"/extracted/{file_path.name}"
        
        # Add metadata
        results["metadata"] = {
            "filename": file.filename,
            "file_type": file_extension,
            "page_number": page_number if file_extension == ".pdf" else None
        }
        
        return JSONResponse(content=results)
        
    except Exception as e:
        logger.error(f"Error processing file: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        # Cleanup uploaded files (but keep extracted images)
        try:
            if upload_path.exists():
                upload_path.unlink()
            if file_extension == ".pdf":
                image_path = upload_path.with_suffix(".png")
                if image_path.exists():
                    image_path.unlink()
        except Exception as e:
            logger.warning(f"Error cleaning up files: {e}")


@app.delete("/cleanup")
async def cleanup_uploads():
    """Clean up all uploaded files (for maintenance)."""
    try:
        count = 0
        for file_path in UPLOAD_DIR.glob("*"):
            if file_path.is_file():
                file_path.unlink()
                count += 1
        
        return {
            "message": f"Cleaned up {count} files",
            "count": count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
