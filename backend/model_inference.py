import torch
import cv2
import numpy as np
from PIL import Image
from pathlib import Path
from typing import Dict, List, Any
import logging
import uuid

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PassportExtractor:
    """
    Passport field extraction using trained deep learning model.
    Supports YOLOv8, Detectron2, and custom PyTorch models.
    """
    
    def __init__(self, model_path: str):
        self.model_path = Path(model_path)
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self.model_type = None
        self.load_model()
        
    def load_model(self):
        """Load the trained model and detect its type."""
        try:
            logger.info(f"Loading model from {self.model_path}")
            
            # Try loading as YOLOv8 first (most common for document detection)
            try:
                from ultralytics import YOLO
                self.model = YOLO(str(self.model_path))
                self.model_type = "yolo"
                logger.info("Model loaded as YOLOv8")
                return
            except Exception as e:
                logger.info(f"Not a YOLO model: {e}")
            
            # Try loading as standard PyTorch model
            try:
                self.model = torch.load(self.model_path, map_location=self.device)
                if hasattr(self.model, 'eval'):
                    self.model.eval()
                self.model_type = "pytorch"
                logger.info("Model loaded as PyTorch model")
                return
            except Exception as e:
                logger.info(f"Not a standard PyTorch model: {e}")
            
            # Try loading state dict
            try:
                state_dict = torch.load(self.model_path, map_location=self.device)
                # You may need to define your model architecture here
                # self.model = YourModelClass()
                # self.model.load_state_dict(state_dict)
                self.model_type = "state_dict"
                logger.info("Model loaded as state dict")
                return
            except Exception as e:
                logger.error(f"Failed to load model: {e}")
                raise
                
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            raise
    
    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """Preprocess image for model inference."""
        # Convert to RGB if needed
        if len(image.shape) == 2:
            image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        elif image.shape[2] == 4:
            image = cv2.cvtColor(image, cv2.COLOR_BGRA2RGB)
        elif image.shape[2] == 3:
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        return image
    
    def extract_fields(self, image_path: str) -> Dict[str, Any]:
        """
        Extract passport fields from image.
        
        Args:
            image_path: Path to passport image
            
        Returns:
            Dictionary containing extracted fields and metadata
        """
        try:
            # Load and preprocess image
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Failed to load image: {image_path}")
            
            image = self.preprocess_image(image)
            
            # Run inference based on model type
            if self.model_type == "yolo":
                return self._extract_with_yolo(image, image_path)
            elif self.model_type == "pytorch":
                return self._extract_with_pytorch(image)
            else:
                return self._extract_generic(image)
                
        except Exception as e:
            logger.error(f"Error during extraction: {e}")
            return {
                "success": False,
                "error": str(e),
                "fields": {}
            }
    
    def _extract_with_yolo(self, image: np.ndarray, image_path: str) -> Dict[str, Any]:
        """Extract photo and signature using YOLOv8 model."""
        # Lower confidence threshold to detect more objects
        results = self.model(image_path, conf=0.1, verbose=True)
        
        logger.info(f"Running inference on: {image_path}")
        logger.info(f"Number of results: {len(results)}")
        
        detected_fields = []
        # Updated field mapping for photo and signature extraction
        field_mapping = {
            0: "photo",
            1: "signature"
        }
        
        # Load original image for cropping
        original_image = cv2.imread(image_path)
        extracted_images = {}
        
        for result in results:
            boxes = result.boxes
            logger.info(f"Number of boxes detected: {len(boxes)}")
            
            if len(boxes) == 0:
                logger.warning("No objects detected! Check if:")
                logger.warning("1. Model is trained for the correct classes (0=photo, 1=signature)")
                logger.warning("2. Input image quality is good")
                logger.warning("3. Model confidence threshold is appropriate")
            
            for box in boxes:
                class_id = int(box.cls[0])
                confidence = float(box.conf[0])
                bbox = box.xyxy[0].tolist()
                
                logger.info(f"Detected: class_id={class_id}, confidence={confidence:.2f}")
                
                field_name = field_mapping.get(class_id, f"field_{class_id}")
                
                # Crop the detected region
                x1, y1, x2, y2 = map(int, bbox)
                cropped_region = original_image[y1:y2, x1:x2]
                
                # Save cropped image
                output_dir = Path("uploads/extracted")
                output_dir.mkdir(parents=True, exist_ok=True)
                
                output_filename = f"{field_name}_{uuid.uuid4().hex[:8]}.png"
                output_path = output_dir / output_filename
                cv2.imwrite(str(output_path), cropped_region)
                
                logger.info(f"Saved extracted {field_name} to: {output_path}")
                
                extracted_images[field_name] = {
                    "path": str(output_path),
                    "confidence": confidence,
                    "bbox": {
                        "x1": bbox[0],
                        "y1": bbox[1],
                        "x2": bbox[2],
                        "y2": bbox[3]
                    }
                }
                
                detected_fields.append({
                    "field": field_name,
                    "confidence": confidence,
                    "bbox": {
                        "x1": bbox[0],
                        "y1": bbox[1],
                        "x2": bbox[2],
                        "y2": bbox[3]
                    }
                })
        
        logger.info(f"Total extracted images: {len(extracted_images)}")
        
        return {
            "success": True,
            "extracted_images": extracted_images,
            "detections": detected_fields,
            "model_type": "yolo",
            "message": f"Extracted {len(extracted_images)} items" if extracted_images else "No photo or signature detected"
        }
    
    def _extract_with_pytorch(self, image: np.ndarray) -> Dict[str, Any]:
        """Extract fields using custom PyTorch model."""
        # Implement your custom model inference here
        # This is a placeholder implementation
        
        return {
            "success": True,
            "fields": {
                "passport_number": {"value": "", "confidence": 0.0},
                "surname": {"value": "", "confidence": 0.0},
                "given_names": {"value": "", "confidence": 0.0},
            },
            "model_type": "pytorch",
            "note": "Custom PyTorch inference - implement based on your model"
        }
    
    def _extract_generic(self, image: np.ndarray) -> Dict[str, Any]:
        """Generic extraction fallback."""
        return {
            "success": True,
            "fields": {},
            "model_type": "generic",
            "note": "Generic inference - please configure model-specific extraction"
        }


# Singleton instance
_extractor_instance = None


def get_extractor(model_path: str = None) -> PassportExtractor:
    """Get or create passport extractor instance."""
    global _extractor_instance
    
    if _extractor_instance is None:
        if model_path is None:
            model_path = Path(__file__).parent.parent / "passport_layout.pt"
        _extractor_instance = PassportExtractor(str(model_path))
    
    return _extractor_instance
