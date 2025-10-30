import React from 'react';
import T from './T';

const YieldEstimation = () => {
  return (
    <div className="min-h-screen bg-soft-beige-950 py-6">
      <div className="container mx-auto px-4">
        <div className="farm-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground font-poppins"><T k="yield.title">Yield Estimation</T></h2>
          </div>
          <div className="w-full h-[75vh] bg-white rounded overflow-hidden">
            <iframe
              title="Yield Estimation"
              src="http://127.0.0.1:7860/"
              className="w-full h-full border-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default YieldEstimation;


