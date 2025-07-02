// components/ProcessFiles.js
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

const ProcessFiles = ({
  processingSteps,
  setProcessingSteps,
  processingProgress,
  setProcessingProgress,
  processingStarted,
  setProcessingStarted,
  processingComplete,
  setProcessingComplete,
  templateType,
  files,
  onBack,
  onViewResults
}) => {
  // Update step status
  const updateStepStatus = (stepId, status) => {
    setProcessingSteps(steps => 
      steps.map(step => 
        step.id === stepId ? { ...step, status } : step
      )
    );
  };

  // Simulate processing
  const simulateProcessing = () => {
    // Update step 1
    updateStepStatus(1, 'processing');
    
    setTimeout(() => {
      updateStepStatus(1, 'completed');
      setProcessingProgress(25);
      
      // Update step 2
      updateStepStatus(2, 'processing');
      
      setTimeout(() => {
        updateStepStatus(2, 'completed');
        setProcessingProgress(50);
        
        // Update step 3
        updateStepStatus(3, 'processing');
        
        setTimeout(() => {
          updateStepStatus(3, 'completed');
          setProcessingProgress(75);
          
          // Update step 4
          updateStepStatus(4, 'processing');
          
          setTimeout(() => {
            updateStepStatus(4, 'completed');
            setProcessingProgress(100);
            setProcessingComplete(true);
          }, 2500);
        }, 3500);
      }, 2000);
    }, 1500);
  };

  // Start processing automatically when component mounts if not already started
  useEffect(() => {
    if (processingStarted && !processingComplete) {
      simulateProcessing();
    }
  }, [processingStarted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get status icon for processing steps
  const getStatusIcon = (status) => {
    switch(status) {
      case 'waiting':
        return (
          <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-gray-500"></div>
          </div>
        );
      case 'processing':
        return (
          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          </div>
        );
      case 'completed':
        return (
          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Processing Files</h2>
        <div className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm">
          {templateType === 'fixed' ? 'Fixed Format' : 'Running Format'}
        </div>
      </div>

      <div className="bg-gray-700/50 rounded-lg p-6">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Overall Progress</h3>
            <span className="text-sm text-gray-300">{processingProgress}%</span>
          </div>
          <div className="h-2 w-full bg-gray-600 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-500"
              initial={{ width: '0%' }}
              animate={{ width: `${processingProgress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <div className="space-y-4">
          {processingSteps.map((step) => (
            <motion.div 
              key={step.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: step.id * 0.1 }}
              className={`flex items-center p-4 rounded-md ${
                step.status === 'processing' ? 'bg-blue-900/20 border border-blue-800' :
                step.status === 'completed' ? 'bg-green-900/10 border border-green-800' :
                'bg-gray-800/50'
              }`}
            >
              {getStatusIcon(step.status)}
              <div className="ml-4 flex-grow">
                <div className="font-medium">{step.name}</div>
                {step.status === 'processing' && (
                  <div className="text-sm text-gray-400 mt-1">
                    This may take a few moments...
                  </div>
                )}
              </div>
              {step.status === 'completed' && (
                <div className="text-green-500 text-sm font-medium">Completed</div>
              )}
            </motion.div>
          ))}
        </div>

        {processingComplete && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.5 }}
            className="mt-8 p-4 bg-green-900/20 border border-green-800 rounded-md"
          >
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-green-400">Processing Complete!</h3>
                <p className="text-sm text-gray-300 mt-1">
                  {files.length} {files.length === 1 ? 'file has' : 'files have'} been successfully processed.
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button 
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                onClick={onViewResults}
              >
                View Results
              </button>
            </div>
          </motion.div>
        )}
      </div>

      <div className="flex justify-between">
        <button
          className={`px-4 py-2 text-gray-300 bg-gray-700 rounded-md transition-colors ${
            processingStarted ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-600'
          }`}
          onClick={onBack}
          disabled={processingStarted}
        >
          Back
        </button>
        
        {!processingStarted && (
          <button
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
            onClick={() => setProcessingStarted(true)}
          >
            Start Processing
          </button>
        )}
      </div>
    </div>
  );
};

export default ProcessFiles;