// components/common/StepIndicator.js
import React from 'react';

const StepIndicator = ({ currentStep }) => {
  const steps = [
    { id: 1, name: 'Select Template Type' },
    { id: 2, name: 'Upload PDF Files' },
    { id: 3, name: 'Configure Extraction' },
    { id: 4, name: 'Process Files' },
    { id: 5, name: 'View Results' }
  ];

  return (
    <div className="flex justify-between items-center mb-8">
      {steps.map((step) => (
        <React.Fragment key={step.id}>
          <div className={`flex flex-col items-center ${
            currentStep >= step.id ? (currentStep === step.id ? 'text-blue-500' : 'text-green-500') : 'text-gray-500'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep > step.id ? 'bg-green-500/20 text-green-500' : 
              currentStep === step.id ? 'bg-blue-500 text-white' : 
              'bg-gray-700 text-gray-500'
            }`}>
              {currentStep > step.id ? '✓' : step.id}
            </div>
            <span className="text-xs mt-2">{step.name}</span>
          </div>
          
          {step.id < steps.length && (
            <div className={`flex-1 h-px ${
              currentStep > step.id ? 'bg-green-500' :
              currentStep === step.id || currentStep === step.id + 1 ? 'bg-blue-500/50' :
              'bg-gray-700'
            } mx-2`}></div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default StepIndicator;