from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import pandas as pd

application = Flask(__name__)
CORS(application)  # Enable CORS for all routes

# Load your model and encoders
model = pickle.load(open('model.pkl', 'rb'))
crop_encoder = pickle.load(open('crop_encoder.pkl', 'rb'))
fertilizer_encoder = pickle.load(open('fertilizer_encoder.pkl', 'rb'))

@application.route('/predict', methods=['POST'])
def predict():
    try:
        # Get data from Post request
        data = request.get_json()
        
        # Validate input data
        if not data:
            return jsonify({'error': 'No data provided', 'message': 'Request body is empty'}), 400
        
        required_fields = ['crop_type', 'moisture', 'nitrogen', 'potassium', 'phosphorous']
        missing_fields = [field for field in required_fields if field not in data or data[field] is None]
        
        if missing_fields:
            return jsonify({
                'error': f'Missing required fields: {", ".join(missing_fields)}',
                'message': 'Please provide all required parameters'
            }), 400
        
        # Print debug information
        print(f"Received data: {data}")
        
        # Validate crop type
        crop_type = data['crop_type']
        try:
            # Check if crop type is supported
            encoded_crop = crop_encoder.transform([crop_type])[0]
            print(f"Encoded crop: {encoded_crop}")
        except ValueError as e:
            # Get available crop types
            available_crops = list(crop_encoder.classes_)
            return jsonify({
                'error': f'Unsupported crop type: {crop_type}',
                'message': f'Supported crops: {", ".join(available_crops)}',
                'available_crops': available_crops
            }), 400
        
        # Validate numeric values
        try:
            moisture = float(data['moisture'])
            nitrogen = float(data['nitrogen'])
            potassium = float(data['potassium'])
            phosphorous = float(data['phosphorous'])
        except (ValueError, TypeError) as e:
            return jsonify({
                'error': 'Invalid numeric values',
                'message': 'Moisture, nitrogen, potassium, and phosphorous must be valid numbers'
            }), 400
        
        # Create input data
        input_data = pd.DataFrame([[encoded_crop, moisture, nitrogen, potassium, phosphorous]],
                                  columns=["CropType", "Moisture", "Nitrogen", "Potassium", "Phosphorous"])
        
        print(f"Input data: {input_data}")
        
        # Make prediction
        prediction = model.predict(input_data)[0]
        print(f"Raw prediction: {prediction}")
        
        decoded_prediction = fertilizer_encoder.inverse_transform([prediction])[0]
        print(f"Decoded prediction: {decoded_prediction}")
        
        # Return prediction
        return jsonify({'prediction': decoded_prediction})
        
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'message': 'An unexpected error occurred during prediction'
        }), 500

@application.route('/crops', methods=['GET'])
def get_available_crops():
    """Get list of available crop types"""
    try:
        available_crops = list(crop_encoder.classes_)
        return jsonify({
            'available_crops': available_crops,
            'count': len(available_crops)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@application.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'Fertilizer prediction API is running'
    })

if __name__ == '__main__':
    application.run(port=5002, debug=True)
