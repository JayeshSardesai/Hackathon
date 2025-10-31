import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, Leaf, Sun, Sprout } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import T from './T';
import LanguageSwitcher from './LanguageSwitcher';

const FertilizerPredictor = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);

  const [user, setUser] = useState({
    name: 'User',
    email: '',
  });

  const [formData, setFormData] = useState({
    crop_type: '',
    moisture: '',
    nitrogen: '',
    potassium: '',
    phosphorous: ''
  });

  // Available crop types for fertilizer prediction (will be loaded from API)
  const [cropTypes, setCropTypes] = useState([
    'Wheat', 'Rice', 'Maize', 'Cotton', 'Sugarcane', 'Barley',
    'Groundnut', 'Soybean', 'Sunflower', 'Potato', 'Tomato',
    'Onion', 'Cabbage', 'Cauliflower', 'Brinjal', 'Chilli'
  ]);

  useEffect(() => {
    checkAuthentication();
    fetchAvailableCrops();
  }, []);

  const fetchAvailableCrops = async () => {
    try {
      const response = await fetch('http://localhost:5002/crops');
      if (response.ok) {
        const data = await response.json();
        if (data.available_crops && data.available_crops.length > 0) {
          setCropTypes(data.available_crops);
          console.log('✅ Loaded available crops from API:', data.available_crops);
        }
      } else {
        console.log('⚠️ Could not fetch crops from API, using default list');
      }
    } catch (error) {
      console.log('⚠️ Error fetching crops from API, using default list:', error);
    }
  };

  const checkAuthentication = () => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/');
      return;
    }

    try {
      verifyToken(token);
    } catch (error) {
      console.error('Authentication error:', error);
      handleLogout();
    }
  };

  const verifyToken = async (token) => {
    try {
      const response = await fetch('http://localhost:5000/api/verify-token', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        await loadProfile();
        setIsAuthenticated(true);
        setLoading(false);
      } else {
        handleLogout();
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      handleLogout();
    }
  };

  const loadProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUser({ name: data.name || 'User', email: data.email || '' });
        
        // Pre-fill form with profile data if available
        if (data.profile) {
          setFormData(prev => ({
            ...prev,
            nitrogen: data.profile.nitrogen || '',
            phosphorous: data.profile.phosphorus || '',
            potassium: data.profile.potassium || '',
            crop_type: data.profile.crop || ''
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load profile', err);
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch('http://localhost:5000/api/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsAuthenticated(false);
      navigate('/');
    }
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setPrediction(null);
    setPredicting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/fertilizer-prediction', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          crop_type: formData.crop_type,
          moisture: parseFloat(formData.moisture),
          nitrogen: parseFloat(formData.nitrogen),
          potassium: parseFloat(formData.potassium),
          phosphorous: parseFloat(formData.phosphorous)
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setPrediction(data.prediction);
      } else {
        // Handle different types of errors
        if (data.available_crops) {
          setError(`${data.message}\nSupported crops: ${data.available_crops.join(', ')}`);
        } else {
          setError(data.message || data.error || 'Failed to get fertilizer prediction');
        }
        console.error('API Error:', data);
      }
    } catch (err) {
      console.error('Prediction error:', err);
      setError('Failed to connect to the prediction service. Please try again.');
    } finally {
      setPredicting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      crop_type: '',
      moisture: '',
      nitrogen: '',
      potassium: '',
      phosphorous: ''
    });
    setPrediction(null);
    setError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-soft-beige-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-farm-green-500 mx-auto mb-4"></div>
          <p className="text-muted-600 font-poppins">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-soft-beige-950">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 w-full border-b border-farm-green-200 bg-white/95 backdrop-blur shadow-sm">
        <div className="container mx-auto px-4 flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative inline-flex items-center">
              <Leaf className="h-7 w-7 text-farm-green-600" />
              <Sun className="h-3.5 w-3.5 text-golden-yellow-500 absolute -top-1 -right-1" />
            </div>
            <span className="ml-1 text-xl font-bold text-farm-green-700 font-poppins">FarmFlow</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4 flex-shrink-0">
            <button onClick={() => navigate('/dashboard')} className="text-foreground hover:text-farm-green-600 transition-colors font-medium font-poppins">
              <T k="dashboard.title">Dashboard</T>
            </button>
            <button onClick={() => navigate('/select-crop')} className="text-foreground hover:text-farm-green-600 transition-colors font-medium font-poppins">
              <T k="dashboard.selectCrop">Select Crop</T>
            </button>
            <button onClick={() => navigate('/fertilizer-predictor')} className="text-farm-green-600 font-semibold transition-colors font-poppins">
              <T k="dashboard.fertilizerPredictor">Fertilizer Predictor</T>
            </button>
            <LanguageSwitcher inline={true} className="ml-2" />

            <div className="relative flex-shrink-0">
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 text-foreground hover:text-farm-green-600 transition-colors font-medium font-poppins max-w-[200px]"
              >
                <div className="h-8 w-8 rounded-full border-2 border-farm-green-200 bg-farm-green-100 flex items-center justify-center">
                  <span role="img" aria-label="user" className="text-farm-green-700">👤</span>
                </div>
                <span className="hidden md:block truncate">{user.name}</span>
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="ml-2 whitespace-nowrap text-foreground hover:text-farm-green-600 transition-colors font-medium font-poppins cursor-pointer flex-shrink-0"
            >
              <T k="dashboard.logout">Logout</T>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button onClick={toggleMenu} className="md:hidden p-2">
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-farm-green-200">
            <div className="container mx-auto py-4 space-y-3 px-4">
              <button onClick={() => { navigate('/dashboard'); setIsMenuOpen(false); }} className="block w-full text-left py-2 text-foreground hover:text-farm-green-600 font-poppins">
                <T k="dashboard.title">Dashboard</T>
              </button>
              <button onClick={() => { navigate('/select-crop'); setIsMenuOpen(false); }} className="block w-full text-left py-2 text-foreground hover:text-farm-green-600 font-poppins">
                <T k="dashboard.selectCrop">Select Crop</T>
              </button>
              <button onClick={() => { navigate('/fertilizer-predictor'); setIsMenuOpen(false); }} className="block w-full text-left py-2 text-farm-green-600 font-semibold font-poppins">
                <T k="dashboard.fertilizerPredictor">Fertilizer Predictor</T>
              </button>
              <button onClick={() => { navigate('/profile'); setIsMenuOpen(false); }} className="block w-full text-left py-2 text-foreground hover:text-farm-green-600 font-poppins">
                <T k="dashboard.profile">Profile</T> ({user.name})
              </button>
              <div className="py-2">
                <LanguageSwitcher inline={true} className="w-full" />
              </div>
              <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="block w-full text-left py-2 text-foreground hover:text-farm-green-600 font-poppins">
                <T k="dashboard.logout">Logout</T>
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 pt-6 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-farm-green-100 rounded-lg">
                <Sprout className="h-8 w-8 text-farm-green-600" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-farm-green-800 font-poppins">
                  <T k="fertilizer.title">Fertilizer Predictor</T>
                </h2>
                <p className="text-muted-600 font-poppins mt-1">
                  <T k="fertilizer.subtitle">Get personalized fertilizer recommendations for your crops</T>
                </p>
              </div>
            </div>
          </div>

          {/* Prediction Form */}
          <div className="farm-card p-6 mb-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Crop Type */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 font-poppins">
                    <T k="fertilizer.cropType">Crop Type</T> <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="crop_type"
                    value={formData.crop_type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-soft-beige-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green-500 font-poppins"
                    required
                  >
                    <option value=""><T k="fertilizer.selectCrop">Select Crop</T></option>
                    {cropTypes.map(crop => (
                      <option key={crop} value={crop}>{crop}</option>
                    ))}
                  </select>
                </div>

                {/* Moisture */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 font-poppins">
                    <T k="fertilizer.moisture">Soil Moisture (%)</T> <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="moisture"
                    value={formData.moisture}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-soft-beige-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green-500 font-poppins"
                    placeholder={t('fertilizer.moisturePlaceholder', 'e.g., 45')}
                    min="0"
                    max="100"
                    step="0.1"
                    required
                  />
                </div>

                {/* Nitrogen */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 font-poppins">
                    <T k="fertilizer.nitrogen">Nitrogen (N) Content</T> <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="nitrogen"
                    value={formData.nitrogen}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-soft-beige-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green-500 font-poppins"
                    placeholder={t('fertilizer.nitrogenPlaceholder', 'e.g., 50')}
                    min="0"
                    step="0.1"
                    required
                  />
                </div>

                {/* Potassium */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 font-poppins">
                    <T k="fertilizer.potassium">Potassium (K) Content</T> <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="potassium"
                    value={formData.potassium}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-soft-beige-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green-500 font-poppins"
                    placeholder={t('fertilizer.potassiumPlaceholder', 'e.g., 40')}
                    min="0"
                    step="0.1"
                    required
                  />
                </div>

                {/* Phosphorous */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 font-poppins">
                    <T k="fertilizer.phosphorous">Phosphorous (P) Content</T> <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="phosphorous"
                    value={formData.phosphorous}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-soft-beige-300 rounded-md focus:outline-none focus:ring-2 focus:ring-farm-green-500 font-poppins"
                    placeholder={t('fertilizer.phosphorousPlaceholder', 'e.g., 30')}
                    min="0"
                    step="0.1"
                    required
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-end">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-6 py-2 border border-soft-beige-300 text-foreground rounded-md hover:bg-soft-beige-100 transition-colors font-poppins"
                >
                  <T k="fertilizer.reset">Reset</T>
                </button>
                <button
                  type="submit"
                  disabled={predicting}
                  className="farm-button-primary px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {predicting ? <T k="fertilizer.predicting">Predicting...</T> : <T k="fertilizer.getRecommendation">Get Recommendation</T>}
                </button>
              </div>
            </form>
          </div>

          {/* Error Message */}
          {error && (
            <div className="farm-card p-6 mb-6 bg-red-50 border-red-200">
              <div className="flex items-start gap-3">
                <div className="text-red-500 mt-0.5">⚠️</div>
                <div>
                  <h3 className="font-semibold text-red-800 font-poppins mb-1"><T k="fertilizer.error">Error</T></h3>
                  <p className="text-red-700 font-poppins">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Prediction Result */}
          {prediction && (
            <div className="farm-card p-6 bg-gradient-to-br from-farm-green-50 to-white border-farm-green-200">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-farm-green-100 rounded-lg">
                  <Sprout className="h-8 w-8 text-farm-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-farm-green-800 font-poppins mb-2">
                    <T k="fertilizer.recommendedFertilizer">Recommended Fertilizer</T>
                  </h3>
                  <div className="bg-white rounded-lg p-4 border border-farm-green-200">
                    <p className="text-2xl font-bold text-farm-green-700 font-poppins">
                      {prediction}
                    </p>
                  </div>
                  <p className="text-sm text-muted-600 font-poppins mt-3">
                    <T k="fertilizer.disclaimer">This recommendation is based on your soil parameters and selected crop type. For best results, consult with a local agricultural expert.</T>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Information Card */}
          <div className="farm-card p-6 mt-6 bg-blue-50 border-blue-200">
            <h3 className="font-semibold text-blue-800 font-poppins mb-3 flex items-center gap-2">
              <span>ℹ️</span>
              <T k="fertilizer.howToUse">How to Use</T>
            </h3>
            <ul className="space-y-2 text-blue-700 font-poppins text-sm">
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <T k="fertilizer.step1">Select your crop type from the dropdown menu</T>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <T k="fertilizer.step2">Enter the soil moisture percentage (0-100%)</T>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <T k="fertilizer.step3">Provide the Nitrogen (N), Potassium (K), and Phosphorous (P) content values</T>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <T k="fertilizer.step4">Click "Get Recommendation" to receive your personalized fertilizer suggestion</T>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FertilizerPredictor;
