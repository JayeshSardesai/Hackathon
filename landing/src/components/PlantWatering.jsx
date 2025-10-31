import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Navbar from './Navbar';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || '';

const PlantWatering = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    crop_type: 'Rice',
    soil_type: 'Loamy',
    region: 'Temperate',
    last_watering: '',
  });
  const [weatherData, setWeatherData] = useState(null);
  const [location, setLocation] = useState(null);
  const [predictionResult, setPredictionResult] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const cropTypes = ['Rice', 'Wheat', 'Maize', 'Cotton', 'Sugarcane', 'Tomato', 'Potato', 'Bean', 'Cabbage', 'Citrus', 'Melon', 'Mustard', 'Onion', 'Banana', 'Soyabean'];
  const soilTypes = ['Sandy', 'Loamy', 'Clay', 'Silt', 'Peaty', 'Chalky'];
  const regions = ['Tropical', 'Temperate', 'Arid', 'Semi-Arid', 'Humid'];

  const fetchLocationAndWeather = async () => {
    setLocationLoading(true);
    setError('');

    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser');
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ latitude, longitude });

          try {
            if (OPENWEATHER_API_KEY) {
              const weatherResponse = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}&units=metric`
              );

              if (weatherResponse.ok) {
                const weatherJson = await weatherResponse.json();
                setWeatherData({
                  temperature: weatherJson.main.temp,
                  condition: weatherJson.weather[0].main,
                  description: weatherJson.weather[0].description,
                  humidity: weatherJson.main.humidity,
                  location: weatherJson.name,
                });
              }
            } else {
              setWeatherData({
                temperature: 25,
                condition: 'Clear',
                description: 'clear sky',
                humidity: 60,
                location: 'Your Location',
              });
            }
          } catch (weatherError) {
            console.error('Weather fetch error:', weatherError);
            setError('Could not fetch weather data. Using default values.');
            setWeatherData({
              temperature: 25,
              condition: 'Clear',
              description: 'clear sky',
              humidity: 60,
              location: 'Your Location',
            });
          }

          setLocationLoading(false);
        },
        (error) => {
          setLocationLoading(false);
          setError('Location permission denied. Using default weather values.');
          setWeatherData({
            temperature: 25,
            condition: 'Clear',
            description: 'clear sky',
            humidity: 60,
            location: 'Default Location',
          });
        }
      );
    } catch (err) {
      setLocationLoading(false);
      setError(err.message);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setPredictionResult(null);

    try {
      const token = localStorage.getItem('token');
      
      const requestData = {
        crop_type: formData.crop_type,
        soil_type: formData.soil_type,
        region: formData.region,
        temperature: weatherData?.temperature || 25,
        weather_condition: weatherData?.condition || 'Clear',
        last_watering: formData.last_watering,
      };

      console.log('Sending plant watering request:', requestData);

      const response = await fetch(`${apiUrl}/api/plant-watering`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to get prediction.');
      }

      const data = await response.json();
      console.log('Plant watering prediction result:', data);
      setPredictionResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF3E0]">
      <Navbar />
      <div className="py-12 flex justify-center items-start">
        <div className="w-full max-w-3xl bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-[#E8DCC0]">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-[#2E7D32] text-center">
            💧 {t('watering.title', 'Plant Watering Prediction')}
          </h1>

          <p className="text-center text-gray-600 mb-6">
            {t('watering.subtitle', 'Get AI-powered water requirement predictions based on weather and time since last watering')}
          </p>

          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700">
                🌍 {t('watering.locationWeather', 'Location & Weather')}
              </h3>
              <button
                onClick={fetchLocationAndWeather}
                disabled={locationLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm"
              >
                {locationLoading ? t('watering.fetching', 'Fetching...') : t('watering.getLocation', 'Get Weather')}
              </button>
            </div>

            {weatherData && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <div className="text-sm text-gray-700">📍 {weatherData.location}</div>
                <div className="text-sm text-gray-700">🌡️ {weatherData.temperature.toFixed(1)}°C</div>
                <div className="text-sm text-gray-700">☁️ {weatherData.condition}</div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="last_watering" className="block font-semibold text-gray-700 mb-1">
                📅 {t('watering.lastWatering', 'Last Watering Date & Time')} *
              </label>
              <input
                id="last_watering"
                type="datetime-local"
                name="last_watering"
                value={formData.last_watering}
                onChange={handleChange}
                required
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('watering.lastWateringHelp', 'When did you last water your plants?')}
              </p>
            </div>

            <div>
              <label htmlFor="crop_type" className="block font-semibold text-gray-700 mb-1">
                🌾 {t('watering.cropType', 'Crop Type')} *
              </label>
              <select
                id="crop_type"
                name="crop_type"
                value={formData.crop_type}
                onChange={handleChange}
                required
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {cropTypes.map((crop) => (
                  <option key={crop} value={crop}>{crop}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="soil_type" className="block font-semibold text-gray-700 mb-1">
                🏞️ {t('watering.soilType', 'Soil Type')} *
              </label>
              <select
                id="soil_type"
                name="soil_type"
                value={formData.soil_type}
                onChange={handleChange}
                required
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {soilTypes.map((soil) => (
                  <option key={soil} value={soil}>{soil}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="region" className="block font-semibold text-gray-700 mb-1">
                🌏 {t('watering.region', 'Region')} *
              </label>
              <select
                id="region"
                name="region"
                value={formData.region}
                onChange={handleChange}
                required
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {regions.map((region) => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 py-3 px-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isLoading ? t('watering.predicting', 'Predicting...') : t('watering.predict', '💧 Predict Water Requirement')}
            </button>
          </form>

          {predictionResult && (
            <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-center mb-4">
                <p className="font-semibold text-gray-700 mb-2">
                  {t('watering.waterRequirement', 'Predicted Water Requirement:')}
                </p>
                <p className="text-4xl font-bold text-blue-700">
                  {Number(predictionResult.water_requirement).toFixed(2)} {predictionResult.unit}
                </p>
              </div>
              {predictionResult.hours_since_watering && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <p className="text-sm text-gray-600">
                    ⏱️ Time since last watering: <span className="font-semibold">{predictionResult.hours_since_watering} hours</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {t('watering.basedOn', 'Based on current weather and plant conditions')}
                  </p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-center">
              <p className="font-semibold text-red-700">{t('watering.error', 'Error:')}</p>
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-2">
              ℹ️ {t('watering.howItWorks', 'How it works:')}
            </h4>
            <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
              <li>{t('watering.step1', 'Click "Get Weather" to fetch current weather conditions')}</li>
              <li>{t('watering.step2', 'Enter when you last watered your plants')}</li>
              <li>{t('watering.step3', 'Select your crop type, soil type, and region')}</li>
              <li>{t('watering.step4', 'Get AI-powered water requirement prediction based on time elapsed and weather')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlantWatering;