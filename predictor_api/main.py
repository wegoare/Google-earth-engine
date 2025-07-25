

# --------------------
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import joblib
from typing import List
import logging
from datetime import datetime
from pathlib import Path
import os
import numpy as np
from sklearn.ensemble import RandomForestRegressor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Crop Yield Prediction API",
    description="API for predicting crop yield based on crop type and NDVI values",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model input schemas
class YieldInput(BaseModel):
    crop_type: str
    ndvi: float

    class Config:
        json_schema_extra = {
            "example": {
                "crop_type": "Wheat",
                "ndvi": 0.75
            }
        }

class BatchYieldInput(BaseModel):
    items: List[YieldInput]

class NDVIInput(BaseModel):
    ndvi: float

    class Config:
        json_schema_extra = {
            "example": {
                "ndvi": 0.65
            }
        }

def create_placeholder_model():
    """Create a simple model if the real one can't be loaded"""
    logger.warning("Creating placeholder model - replace with your real trained model")
    
    crops = ["Wheat", "Rice", "Maize", "Millet", "Barley"]
    
    # Create synthetic training data
    X = []
    y = []
    for i in range(len(crops)):
        for ndvi in np.linspace(0.3, 0.9, 10):
            X.append([i, ndvi])  # [crop_index, ndvi]
            y.append((i+1)*2 + (ndvi*5))  # Simple yield calculation
    
    model = RandomForestRegressor(n_estimators=10, random_state=42)
    model.fit(X, y)
    return model, crops

# Load or create model
try:
    # Get the absolute path to the model file
    base_dir = Path(__file__).parent
    model_path = base_dir / "training_data" / "crop_yield_predictor.pkl"
    
    logger.info(f"Attempting to load model from: {model_path}")
    
    if model_path.exists():
        model = joblib.load(model_path)
        logger.info("Model loaded successfully")
        
        # Get crop types from model or use default
        if hasattr(model, 'classes_'):
            CROP_LIST = [c.title() for c in model.classes_.tolist()]
        else:
            CROP_LIST = ["Wheat", "Rice", "Maize", "Millet", "Barley"]
    else:
        raise FileNotFoundError(f"Model file not found at {model_path}")
        
except Exception as e:
    logger.error(f"Failed to load model: {str(e)}")
    logger.info("Creating placeholder model")
    model, CROP_LIST = create_placeholder_model()

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "model_status": "placeholder" if "placeholder" in str(model) else "production",
        "available_crops": CROP_LIST
    }

@app.post("/api/predict-yield", response_model=dict)
async def predict_yield(data: YieldInput):
    try:
        # Convert to title case for consistency
        crop_type = data.crop_type.title()
        
        if crop_type not in CROP_LIST:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Invalid crop type",
                    "available_crops": CROP_LIST,
                    "received": data.crop_type
                }
            )
            
        if not (0 <= data.ndvi <= 1):
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Invalid NDVI",
                    "message": "NDVI must be between 0 and 1",
                    "received": data.ndvi
                }
            )

        # Get crop index
        crop_idx = CROP_LIST.index(crop_type)
        input_data = [[crop_idx, data.ndvi]]
        
        prediction = model.predict(input_data)[0]
        
        return {
            "predicted_yield": round(prediction, 2),
            "crop_type": crop_type,
            "units": "tons/hectare",
            "model_version": "1.0"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Prediction failed",
                "message": str(e)
            }
        )

@app.post("/api/recommended-crop", response_model=dict)
async def recommend_crop(data: NDVIInput):
    try:
        if not (0 <= data.ndvi <= 1):
            raise HTTPException(
                status_code=400,
                detail="NDVI must be between 0 and 1"
            )

        results = []
        for i, crop in enumerate(CROP_LIST):
            prediction = model.predict([[i, data.ndvi]])[0]
            results.append({
                "crop": crop,
                "predicted_yield": round(prediction, 2)
            })

        best_crop = max(results, key=lambda x: x["predicted_yield"])
        
        return {
            "recommended_crop": best_crop["crop"],
            "predicted_yield": best_crop["predicted_yield"],
            "all_options": results,
            "units": "tons/hectare"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Recommendation error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Recommendation failed: {str(e)}"
        )