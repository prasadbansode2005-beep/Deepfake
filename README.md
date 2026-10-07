# TrustAI Flask AI Service

This Flask service provides the AI/ML backend for deepfake detection analysis.

## Setup

### 1. Create Virtual Environment
```bash
cd ai-service
python -m venv venv

# On Windows:
venv\Scripts\activate

# On macOS/Linux:
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the Service
```bash
python app.py
```

The service will start on `http://localhost:5000`

## API Endpoints

### Health Check
```
GET /api/health
```

### Analyze File
```
POST /api/analyze
Content-Type: multipart/form-data

file: <binary file>

Response:
{
  "success": true,
  "message": "Analysis completed",
  "fakeProbability": 42.5,
  "authenticityScore": 75.8,
  "analysis": {
    "faceManipulation": 45.2,
    "lightingConsistency": 82.1,
    "textureAnalysis": 65.4,
    "audioVideoSync": 91.2
  },
  "trust": {
    "sourceReliability": 62.3,
    "manipulationRisk": 35.8,
    "metadataIntegrity": 78.9,
    "aiConfidence": 85.4
  },
  "fileName": "example.mp4",
  "fileSize": 5242880
}
```

## DEMO MODE

This service currently runs in **DEMO MODE** - it generates realistic but random analysis results.

### To Replace with Real ML Model:

1. Install ML dependencies in `requirements.txt`:
   - tensorflow
   - torch
   - torchvision

2. Implement real analysis functions:
   - Replace `generate_demo_analysis()` in `app.py`
   - Add preprocessing logic
   - Implement actual model inference

3. Example real implementation pattern:
```python
import torch
from torchvision import transforms

def analyze_with_model(file_path):
    # Load model
    model = load_deepfake_detector()
    
    # Preprocess
    frames = extract_frames(file_path)
    processed = preprocess(frames)
    
    # Inference
    with torch.no_grad():
        predictions = model(processed)
    
    # Post-process
    return format_results(predictions)
```

## Configuration

Set environment variables in `.env`:
```
FLASK_ENV=development
FLASK_DEBUG=True
AI_MODEL_PATH=path/to/model
```

## File Upload Limits

- **Max File Size**: 100MB
- **Supported Formats**: jpg, jpeg, png, mp4, mov, avi, mkv, wav, mp3, m4a
