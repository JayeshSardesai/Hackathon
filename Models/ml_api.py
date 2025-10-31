from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import pandas as pd
from predict_pipeline import LogEnsemblePredictor

app = Flask(__name__)
CORS(app)

# --- LAZY LOADING SETUP ---
# We initialize the models as None. They will only be loaded into memory when needed.
_yield_predictor = None
_crop_model = None
_xtrain_columns = None
_plant_watering_model = None

def get_yield_predictor():
    """Loads the yield prediction model on the first request."""
    global _yield_predictor
    if _yield_predictor is None:
        print("🚀 Loading Yield Prediction model for the first time...")
        _yield_predictor = LogEnsemblePredictor(
            categorical_cols_path="categorical_cols.pkl",
            xtrain_engineered_log_cols_path="X_train_engineered_log_cols.pkl",
            ensemble_models_path="log_transformed_averaging_ensemble_models.pkl"
        )
        print("✅ Yield Prediction model loaded successfully.")
    return _yield_predictor

def get_crop_model():
    """Loads the crop recommendation model on the first request."""
    global _crop_model, _xtrain_columns
    if _crop_model is None:
        print("🚀 Loading Crop Recommendation model for the first time...")
        with open("new_voting_classifier.pkl", "rb") as f:
            _crop_model = pickle.load(f)
        with open("X_train_columns.pkl", "rb") as f:
            _xtrain_columns = pickle.load(f)
        print("✅ Crop Recommendation model loaded successfully.")
    return _crop_model, _xtrain_columns

def get_plant_watering_model():
    """Loads the plant watering prediction model on the first request."""
    global _plant_watering_model
    if _plant_watering_model is None:
        print("🚀 Loading Plant Watering model for the first time...")
        with open("plant_watering_xgb_model.pkl", "rb") as f:
            _plant_watering_model = pickle.load(f)
        print("✅ Plant Watering model loaded successfully.")
    return _plant_watering_model

# --- API ROUTES ---

@app.route("/api/predict-yield", methods=["POST"])
def api_predict_yield():
    try:
        # Load the model (only if it's not already in memory)
        predictor = get_yield_predictor()
        
        data = request.get_json(force=True)
        row = {
            "Area": float(data["Area"]),
            "State_Name": data["State_Name"],
            "District_Name": data["District_Name"],
            "Season": data["Season"],
            "Crop": data["Crop"]
        }
        pred = predictor.predict_from_row(row)
        return jsonify({"predicted_yield": pred})
    except Exception as e:
        print(f"❌ Error in /api/predict-yield: {e}")
        return jsonify({"error": str(e)}), 400

@app.route("/api/recommend-crop", methods=["POST"])
def api_recommend_crop():
    try:
        # Load the model (only if it's not already in memory)
        model, xtrain_columns = get_crop_model()

        data = request.get_json(force=True)
        data_sample = {
            "SOIL_PH": [float(data["SOIL_PH"])], "TEMP": [float(data["TEMP"])],
            "RELATIVE_HUMIDITY": [float(data["RELATIVE_HUMIDITY"])], "N": [float(data["N"])],
            "P": [float(data["P"])], "K": [float(data["K"])], "SOIL": [data["SOIL"]],
            "SEASON": [data["SEASON"]]
        }
        sample_df = pd.DataFrame(data_sample)
        categorical_cols_sample = sample_df.select_dtypes(include=['object']).columns
        sample_df = pd.get_dummies(sample_df, columns=categorical_cols_sample, drop_first=True)
        sample_df = sample_df.reindex(columns=xtrain_columns, fill_value=0)
        
        probabilities = model.predict_proba(sample_df)[0]
        class_labels = model.classes_
        probability_series = pd.Series(probabilities, index=class_labels)
        top_crops = probability_series.sort_values(ascending=False).head(5).round(3).to_dict()
        prediction = max(top_crops, key=top_crops.get)
        
        return jsonify({
            "prediction": prediction,
            "top_5_crops": top_crops
        })
    except Exception as e:
        print(f"❌ Error in /api/recommend-crop: {e}")
        return jsonify({"error": str(e)}), 400

@app.route("/api/predict-watering", methods=["POST"])
def api_predict_watering():
    try:
        from datetime import datetime
        
        # Load the model (only if it's not already in memory)
        model = get_plant_watering_model()
        
        data = request.get_json(force=True)
        
        # Calculate hours since last watering
        last_watering_str = data.get('last_watering')
        if last_watering_str:
            # Parse the datetime string (format: YYYY-MM-DDTHH:MM)
            last_watering = datetime.fromisoformat(last_watering_str)
            current_time = datetime.now()
            hours_since_watering = (current_time - last_watering).total_seconds() / 3600
        else:
            hours_since_watering = 24  # Default to 24 hours if not provided
        
        # Get input values
        crop_type = data.get('crop_type', 'RICE').upper()
        soil_type = data.get('soil_type', 'HUMID').upper()
        region = data.get('region', 'SEMI HUMID').upper().replace('-', ' ')
        temperature = float(data.get('temperature', 25))
        weather_condition = data.get('weather_condition', 'NORMAL').upper()
        
        # Map weather conditions from OpenWeatherMap to model categories
        weather_mapping = {
            'CLEAR': 'NORMAL',
            'CLOUDS': 'NORMAL',
            'RAIN': 'RAINY',
            'DRIZZLE': 'RAINY',
            'THUNDERSTORM': 'RAINY',
            'SNOW': 'RAINY',
            'MIST': 'NORMAL',
            'SMOKE': 'NORMAL',
            'HAZE': 'NORMAL',
            'DUST': 'WINDY',
            'FOG': 'NORMAL',
            'SAND': 'WINDY',
            'ASH': 'NORMAL',
            'SQUALL': 'WINDY',
            'TORNADO': 'WINDY'
        }
        weather_condition = weather_mapping.get(weather_condition, 'NORMAL')
        
        # Determine temperature range (model uses: 10-20, 20-30, 30-40, 40-50)
        if temperature < 10:
            temp_range = '10-20'  # Use lowest available range
        elif temperature < 20:
            temp_range = '10-20'
        elif temperature < 30:
            temp_range = '20-30'
        elif temperature < 40:
            temp_range = '30-40'
        else:
            temp_range = '40-50'
        
        # Map soil types to model categories (DRY, HUMID, WET)
        soil_mapping = {
            'SANDY': 'DRY',
            'LOAMY': 'HUMID',
            'CLAY': 'WET',
            'SILT': 'HUMID',
            'PEATY': 'WET',
            'CHALKY': 'DRY'
        }
        soil_type = soil_mapping.get(soil_type, 'HUMID')
        
        # Map regions to model categories (DESERT, SEMI ARID, SEMI HUMID, HUMID)
        region_mapping = {
            'TROPICAL': 'HUMID',
            'TEMPERATE': 'SEMI HUMID',
            'ARID': 'SEMI ARID',
            'SEMI-ARID': 'SEMI ARID',
            'HUMID': 'HUMID'
        }
        region = region_mapping.get(region, 'SEMI HUMID')
        
        # Create base dataframe with all possible one-hot encoded columns
        # Based on the EXACT features the model was trained on
        crop_types = ['BEAN', 'CABBAGE', 'CITRUS', 'COTTON', 'MAIZE', 'MELON', 'MUSTARD', 'ONION', 'POTATO', 'RICE', 'SOYABEAN', 'SUGARCANE', 'TOMATO', 'WHEAT']
        soil_types = ['HUMID', 'WET']
        regions = ['HUMID', 'SEMI ARID', 'SEMI HUMID']
        temp_ranges = ['20-30', '30-40', '40-50']
        weather_conditions = ['RAINY', 'SUNNY', 'WINDY']
        
        # Initialize all features to 0
        features = {}
        
        # One-hot encode CROP TYPE
        for crop in crop_types:
            features[f'CROP TYPE_{crop}'] = 1 if crop == crop_type else 0
        
        # One-hot encode SOIL TYPE
        for soil in soil_types:
            features[f'SOIL TYPE_{soil}'] = 1 if soil == soil_type else 0
        
        # One-hot encode REGION
        for reg in regions:
            features[f'REGION_{reg}'] = 1 if reg == region else 0
        
        # One-hot encode TEMPERATURE range
        for temp in temp_ranges:
            features[f'TEMPERATURE_{temp}'] = 1 if temp == temp_range else 0
        
        # One-hot encode WEATHER CONDITION
        for weather in weather_conditions:
            features[f'WEATHER CONDITION_{weather}'] = 1 if weather == weather_condition else 0
        
        # Create DataFrame
        input_df = pd.DataFrame([features])
        
        print(f"🌱 Plant watering prediction input shape: {input_df.shape}")
        print(f"🌱 Features: crop={crop_type}, soil={soil_type}, region={region}, temp={temperature}°C ({temp_range}), weather={weather_condition}")
        
        # Make prediction
        prediction = model.predict(input_df)[0]
        
        # The model outputs water requirement directly (0.1 to 21.5 liters)
        water_requirement = float(prediction)
        
        # Ensure reasonable bounds
        water_requirement = max(0.1, min(25.0, water_requirement))
        
        return jsonify({
            "water_requirement": round(water_requirement, 2),
            "unit": "liters",
            "hours_since_watering": round(hours_since_watering, 2),
            "message": "Prediction successful"
        })
    except Exception as e:
        print(f"❌ Error in /api/predict-watering: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    app.run(debug=False, port=5001)