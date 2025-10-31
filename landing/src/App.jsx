import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './components/Landing';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import SelectCrop from './components/SelectCrop';
import CropPrediction from './components/CropPrediction';
import YieldEstimation from './components/YieldEstimation';
import CropDetails from './components/CropDetails';
import FertilizerPredictor from './components/FertilizerPredictor';
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/plant-watering" element={<PlantWatering />} />
        <Route path="/select-crop" element={<SelectCrop />} />
        <Route path="/crop-prediction" element={<CropPrediction />} />
        <Route path="/yield-estimation" element={<YieldEstimation />} />
        <Route path="/crop-details/:cropName" element={<CropDetails />} />
        <Route path="/fertilizer-predictor" element={<FertilizerPredictor />} />
      </Routes>
    </Router>
  );
}

export default App;