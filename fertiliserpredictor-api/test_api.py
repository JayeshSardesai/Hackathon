"""
Test script for Fertilizer Predictor API
Run this after starting the Flask application to verify it's working correctly
"""

import requests
import json

# API endpoint
API_URL = "http://localhost:5001/predict"

# Test data
test_cases = [
    {
        "name": "Test 1: Wheat with moderate nutrients",
        "data": {
            "crop_type": "Wheat",
            "moisture": 45.0,
            "nitrogen": 50.0,
            "potassium": 40.0,
            "phosphorous": 30.0
        }
    },
    {
        "name": "Test 2: Rice with high nutrients",
        "data": {
            "crop_type": "Rice",
            "moisture": 60.0,
            "nitrogen": 80.0,
            "potassium": 70.0,
            "phosphorous": 60.0
        }
    },
    {
        "name": "Test 3: Maize with low nutrients",
        "data": {
            "crop_type": "Maize",
            "moisture": 30.0,
            "nitrogen": 20.0,
            "potassium": 15.0,
            "phosphorous": 10.0
        }
    }
]

def test_api():
    print("=" * 60)
    print("Testing Fertilizer Predictor API")
    print("=" * 60)
    print()
    
    # Check if API is running
    try:
        response = requests.get("http://localhost:5001/")
        print("✅ API is running on port 5001")
    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Cannot connect to API on port 5001")
        print("   Make sure the Flask application is running:")
        print("   python application.py")
        return
    
    print()
    
    # Run test cases
    for i, test_case in enumerate(test_cases, 1):
        print(f"Running {test_case['name']}...")
        print(f"Input: {json.dumps(test_case['data'], indent=2)}")
        
        try:
            response = requests.post(
                API_URL,
                json=test_case['data'],
                headers={'Content-Type': 'application/json'},
                timeout=5
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Success!")
                print(f"   Prediction: {result.get('prediction', 'N/A')}")
            else:
                print(f"❌ Failed with status code: {response.status_code}")
                print(f"   Response: {response.text}")
        
        except requests.exceptions.Timeout:
            print("❌ Request timed out")
        except Exception as e:
            print(f"❌ Error: {str(e)}")
        
        print("-" * 60)
        print()
    
    print("=" * 60)
    print("Testing Complete!")
    print("=" * 60)

if __name__ == "__main__":
    test_api()
