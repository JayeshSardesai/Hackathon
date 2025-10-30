import React, { useEffect, useState } from 'react';
import T from './T';
import { useTranslation } from 'react-i18next';
import { getCropLabelFromName } from '../constants/crops';

const CropPrediction = () => {
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState([]);
  const [season, setSeason] = useState('');
  const [error, setError] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const resp = await fetch('http://localhost:5000/api/crop-prediction', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await resp.json();
        if (!resp.ok || !data.success) throw new Error(data.error || 'Failed to load predictions');
        const items = data.predictions
          .map((p, i) => ({ id: i+1, crop: p.crop.toUpperCase(), probability: p.probability }))
          .sort((a,b) => b.probability - a.probability);
        setPredictions(items);
        setSeason(data.season);
      } catch (e) {
        setError(e.message || 'Failed');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-soft-beige-950 py-6">
      <div className="container mx-auto px-4">
        <div className="farm-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground font-poppins"><T k="cropPrediction.title">Crop Prediction</T></h2>
            {season && <span className="px-2 py-1 text-xs bg-farm-green-100 text-farm-green-800 rounded-full">{season} <T k="common.season">Season</T></span>}
          </div>
          {loading && (
            <div className="py-10 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-farm-green-500 mx-auto"></div>
            </div>
          )}
          {error && <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded mb-3 text-sm">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {predictions.map(p => (
              <div key={p.id} className="p-4 border border-soft-beige-200 rounded-lg bg-white">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-foreground font-poppins">{getCropLabelFromName(p.crop, t)}</h4>
                </div>
                <div className="space-y-2">
                  <div className="w-full bg-soft-beige-200 rounded-full h-2">
                    <div className="bg-farm-green-600 h-2 rounded-full" style={{ width: `${p.probability}%` }}></div>
                  </div>
                  <p className="text-xs text-muted-600 font-poppins text-right">{p.probability}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CropPrediction;


