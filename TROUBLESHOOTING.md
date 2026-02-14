# Troubleshooting: No Detection Output

## Problem
The model loads successfully but doesn't detect any photo or signature from the passport image.

## Possible Causes

### 1. **Model Class IDs Don't Match**
Your model might be trained with different class IDs than what we're using.

**Solution:** Check your model's class configuration
- Open your training configuration or check model.names
- Verify class 0 = photo and class 1 = signature
- If different, update the `field_mapping` in `backend/model_inference.py`

### 2. **Confidence Threshold Too High**
The default threshold (0.25) might be filtering out detections.

**Solution:** I've lowered it to 0.1 in the latest update. If still no detections, try even lower (0.05).

### 3. **Model Not Trained on This Data**
The model might not recognize the passport format you're testing with.

**Solution:**
- Test with a passport image similar to your training data
- Ensure the image is clear and well-lit
- Try different passport samples

### 4. **Image Preprocessing Issues**
The image might need different preprocessing.

**Solution:** Check if your model expects:
- Specific image size
- Grayscale vs color
- Normalized pixel values

## Debugging Steps

### Step 1: Check Backend Logs
Run `debug_backend.bat` and look for:
```
Running inference on: <path>
Number of results: 1
Number of boxes detected: 0  <-- This means no detections
```

### Step 2: Test Model Directly
Create a test script to verify your model works:

```python
from ultralytics import YOLO

# Load model
model = YOLO('passport_layout.pt')

# Run inference
results = model('test_passport.jpg', conf=0.05)

# Check results
for r in results:
    print(f"Boxes: {len(r.boxes)}")
    for box in r.boxes:
        print(f"Class: {int(box.cls[0])}, Conf: {float(box.conf[0]):.2f}")
```

### Step 3: Verify Model Classes
Check what classes your model was trained on:

```python
from ultralytics import YOLO
model = YOLO('passport_layout.pt')
print(model.names)  # Should show: {0: 'photo', 1: 'signature'}
```

### Step 4: Check Training Data
- Ensure your model was actually trained to detect photo and signature
- Verify training completed successfully
- Check if model file is the correct one (not an untrained model)

## Quick Fixes to Try

1. **Lower confidence threshold:**
   Edit `backend/model_inference.py` line 119:
   ```python
   results = self.model(image_path, conf=0.05, verbose=True)  # Try 0.05 or even 0.01
   ```

2. **Update class mapping:**
   If your model uses different class IDs, update line 122-125:
   ```python
   field_mapping = {
       0: "photo",      # Change these numbers if needed
       1: "signature"   # to match your model's classes
   }
   ```

3. **Test with original training image:**
   Use an image from your training dataset to verify the model works

## Need More Help?

Please provide:
1. Backend console output when you upload an image
2. How you trained the model (what classes, how many images)
3. A sample image from your training data
4. The model.names or class configuration from training
