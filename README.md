# Passport Extraction Application

AI-powered passport information extraction system using deep learning. Upload passport images or PDFs and automatically extract key information fields.

## Features

✨ **Modern UI** - Beautiful, user-friendly interface with glassmorphism design  
📤 **Drag & Drop** - Easy file upload with drag-and-drop support  
📄 **PDF Support** - Process PDF documents with page selection  
🖼️ **Image Support** - Handle JPG, PNG, TIFF, and BMP formats  
🤖 **AI-Powered** - Deep learning model for accurate field extraction  
⚡ **Fast API** - High-performance FastAPI backend  
📱 **Responsive** - Works on desktop, tablet, and mobile devices

## Project Structure

```
passport extract/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── model_inference.py   # Model loading and inference
│   ├── requirements.txt     # Python dependencies
│   └── uploads/            # Temporary upload directory (auto-created)
├── frontend/
│   ├── index.html          # Main HTML page
│   ├── style.css           # Styling with modern design
│   └── script.js           # Frontend logic
└── passport_layout.pt      # Trained model file
```

## Installation

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Modern web browser (Chrome, Firefox, Edge, Safari)

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd "d:\passport extract\backend"
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

   **Note for PDF support:** You also need to install `poppler-utils`:
   - **Windows:** Download from [poppler releases](https://github.com/oschwartz10612/poppler-windows/releases) and add to PATH
   - **Linux:** `sudo apt-get install poppler-utils`
   - **macOS:** `brew install poppler`

3. **Start the backend server:**
   ```bash
   python main.py
   ```
   
   Or using uvicorn directly:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

   The backend will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd "d:\passport extract\frontend"
   ```

2. **Open in browser:**
   - Simply open `index.html` in your web browser
   - Or use a local server (recommended):
     ```bash
     python -m http.server 3000
     ```
   - Then visit `http://localhost:3000`

## Usage

### Starting the Application

1. **Start Backend:**
   ```bash
   cd backend
   python main.py
   ```

2. **Open Frontend:**
   - Open `frontend/index.html` in your browser
   - Or visit `http://localhost:3000` if using a local server

### Extracting Passport Data

1. **Upload File:**
   - Drag and drop a passport image or PDF onto the upload area
   - Or click to browse and select a file
   - Supported formats: PDF, JPG, PNG, TIFF, BMP

2. **Select Page (PDF only):**
   - If you uploaded a PDF, select the page number containing the passport

3. **Extract:**
   - Click "Extract Passport Data" button
   - Wait for processing (usually 1-3 seconds)

4. **View Results:**
   - Extracted fields will be displayed with confidence scores
   - Review the detected information

5. **New Extraction:**
   - Click "New Extraction" to process another document

## API Documentation

### Endpoints

#### `GET /`
Root endpoint with API information.

**Response:**
```json
{
  "message": "Passport Extraction API",
  "version": "1.0.0",
  "endpoints": {
    "health": "/health",
    "extract": "/extract"
  }
}
```

#### `GET /health`
Health check endpoint to verify backend status.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_type": "yolo",
  "device": "cuda"
}
```

#### `POST /extract`
Extract passport information from uploaded file.

**Parameters:**
- `file` (form-data, required): Passport image or PDF file
- `page_number` (form-data, optional): Page number for PDF files (default: 1)

**Response:**
```json
{
  "success": true,
  "fields": {
    "passport_number": {
      "value": "AB1234567",
      "confidence": 0.95,
      "bbox": {"x1": 100, "y1": 200, "x2": 300, "y2": 250}
    },
    "surname": {
      "value": "DOE",
      "confidence": 0.92
    }
  },
  "metadata": {
    "filename": "passport.jpg",
    "file_type": ".jpg",
    "page_number": null
  },
  "model_type": "yolo"
}
```

## Model Configuration

The application supports multiple model types:

### YOLOv8 (Default)
If your `passport_layout.pt` is a YOLOv8 model, it will be automatically detected and used.

### Custom PyTorch Model
If you have a custom PyTorch model, you may need to modify `model_inference.py`:

1. Define your model architecture
2. Update the `_extract_with_pytorch` method
3. Adjust preprocessing as needed

### Field Mapping
Edit the `field_mapping` dictionary in `model_inference.py` to match your model's class IDs:

```python
field_mapping = {
    0: "passport_number",
    1: "surname",
    2: "given_names",
    # Add your fields here
}
```

## Customization

### Frontend Styling
Edit `frontend/style.css` to customize:
- Color scheme (CSS variables at top of file)
- Layout and spacing
- Animations and transitions

### Backend Configuration
Edit `backend/main.py` to customize:
- Upload file size limits
- Allowed file extensions
- CORS settings
- API endpoints

## Troubleshooting

### Backend won't start
- Ensure all dependencies are installed: `pip install -r requirements.txt`
- Check if port 8000 is available
- Verify Python version is 3.8+

### Model loading errors
- Ensure `passport_layout.pt` is in the correct location
- Check model file is not corrupted
- Verify PyTorch is installed correctly

### PDF conversion fails
- Install poppler-utils (see Installation section)
- Ensure PDF is not password-protected
- Try converting PDF to image manually first

### Frontend can't connect to backend
- Verify backend is running on `http://localhost:8000`
- Check browser console for CORS errors
- Ensure firewall isn't blocking the connection

### No fields detected
- Your model may need specific training data
- Check model output format matches expected structure
- Enable debug logging in `model_inference.py`

## Development

### Adding OCR Support
To extract text from detected fields, integrate an OCR library:

```python
# Install: pip install easyocr
import easyocr

reader = easyocr.Reader(['en'])
text = reader.readtext(image_crop)
```

### Adding More Fields
1. Update the `field_mapping` in `model_inference.py`
2. Retrain your model to detect new fields
3. Frontend will automatically display new fields

## License

This project is provided as-is for educational and commercial use.

## Support

For issues or questions:
1. Check the Troubleshooting section
2. Review the API documentation
3. Examine browser console and backend logs

---

**Built with ❤️ using FastAPI, PyTorch, and Modern Web Technologies**
