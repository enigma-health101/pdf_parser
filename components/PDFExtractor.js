// PDFExtractor.js - Main component file
import React, { useState } from 'react';
import SelectTemplateType from './components/SelectTemplateType';
import UploadPDFFiles from './components/UploadPDFFiles';
import ConfigureExtraction from './components/ConfigureExtraction';
import ProcessFiles from './components/ProcessFiles';
import ViewResults from './components/ViewResults';
import StepIndicator from './components/common/StepIndicator';

const PDFExtractor = () => {
  // States for overall workflow
  const [currentStep, setCurrentStep] = useState(1); // Start at template selection
  const [templateType, setTemplateType] = useState('running'); // 'fixed' or 'running'
  const [files, setFiles] = useState([]); // Will hold uploaded files
  
  // Configure extraction states
  const [configStep, setConfigStep] = useState(1); // 1: Split, 2: Review, 3: Extract, 4: Save
  const [sections, setSections] = useState([]);
  const [parameters, setParameters] = useState({});
  const [projectDetails, setProjectDetails] = useState({
    projectId: '',
    inputFolder: '',
    outputFolder: ''
  });
  
  // Process files states
  const [processingSteps, setProcessingSteps] = useState([
    { id: 1, name: 'Preparing documents', status: 'waiting' },
    { id: 2, name: 'Analyzing document structure', status: 'waiting' },
    { id: 3, name: 'Extracting content based on instructions', status: 'waiting' },
    { id: 4, name: 'Formatting output data', status: 'waiting' },
  ]);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStarted, setProcessingStarted] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);

  // Navigation functions
  const goToNextStep = () => {
    setCurrentStep(currentStep + 1);
  };

  const goToPreviousStep = () => {
    setCurrentStep(currentStep - 1);
  };

  // Reset application state
  const startNewProject = () => {
    setCurrentStep(1);
    setConfigStep(1);
    setSections([]);
    setParameters({});
    setProjectDetails({
      projectId: '',
      inputFolder: '',
      outputFolder: ''
    });
    setProcessingStarted(false);
    setProcessingComplete(false);
    setProcessingSteps(processingSteps.map(step => ({ ...step, status: 'waiting' })));
    setProcessingProgress(0);
  };

  // Render the main workflow content based on current step
  const renderWorkflowContent = () => {
    switch (currentStep) {
      case 1: // Select Template Type
        return (
          <SelectTemplateType 
            templateType={templateType} 
            setTemplateType={setTemplateType} 
            onNext={goToNextStep}
          />
        );
        
      case 2: // Upload PDF Files
        return (
          <UploadPDFFiles 
            files={files} 
            setFiles={setFiles} 
            onNext={goToNextStep} 
            onBack={goToPreviousStep}
          />
        );
        
      case 3: // Configure Extraction
        return (
          <ConfigureExtraction 
            configStep={configStep}
            setConfigStep={setConfigStep}
            templateType={templateType}
            files={files}
            sections={sections}
            setSections={setSections}
            parameters={parameters}
            setParameters={setParameters}
            projectDetails={projectDetails}
            setProjectDetails={setProjectDetails}
            onBack={goToPreviousStep}
            onContinue={goToNextStep}
            setProcessingStarted={setProcessingStarted}
          />
        );
        
      case 4: // Process Files
        return (
          <ProcessFiles 
            processingSteps={processingSteps}
            setProcessingSteps={setProcessingSteps}
            processingProgress={processingProgress}
            setProcessingProgress={setProcessingProgress}
            processingStarted={processingStarted}
            setProcessingStarted={setProcessingStarted}
            processingComplete={processingComplete}
            setProcessingComplete={setProcessingComplete}
            templateType={templateType}
            files={files}
            onBack={goToPreviousStep}
            onViewResults={goToNextStep}
          />
        );
        
      case 5: // View Results
        return (
          <ViewResults 
            projectDetails={projectDetails}
            templateType={templateType}
            files={files}
            sections={sections}
            parameters={parameters}
            onNewProject={startNewProject}
          />
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">PDF Data Extractor</h1>
        
        <StepIndicator currentStep={currentStep} />
        
        {renderWorkflowContent()}
      </div>
    </div>
  );
};

export default PDFExtractor;