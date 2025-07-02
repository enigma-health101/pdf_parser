// File: components/ProcessingStatus.js
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  Textarea,
  useDisclosure,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  Box,
  Text,
  Spinner,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Badge,
  Divider,
  useToast,
  Flex,
  Heading
} from '@chakra-ui/react';

// Mock API functions to simulate backend operations
const mockSplitPDF = async (file, prompt) => {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Return mock sections (in a real app, this would be actual PDF sections)
  return [
    { id: 'section-1', title: 'Introduction', content: 'This is the introduction section...' },
    { id: 'section-2', title: 'Methods', content: 'This section describes methods used...' },
    { id: 'section-3', title: 'Results', content: 'These are the results of our analysis...' },
    { id: 'section-4', title: 'Discussion', content: 'In this section we discuss implications...' }
  ];
};

const mockExtractParameters = async (section, parameters) => {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Return mock extracted data
  const mockData = {};
  parameters.forEach(param => {
    mockData[param] = `Extracted ${param} content from section "${section.title}"`;
  });
  
  return mockData;
};

const mockSaveConfiguration = async (config) => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { success: true, configId: 'cfg-' + Date.now() };
};

const ProcessingStatus = ({ isProcessing, files, configuration, onProcess, onBack }) => {
  const toast = useToast();
  
  // Workflow states
  const [workflowStep, setWorkflowStep] = useState(1); // 1: View PDF, 2: Split, 3: Extract params, 4: Project details
  const [splitPrompt, setSplitPrompt] = useState('Split this document into logical sections based on headings');
  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sectionsConfirmed, setSectionsConfirmed] = useState(false);
  const [currentSection, setCurrentSection] = useState(null);
  const [parameters, setParameters] = useState({});
  const [projectDetails, setProjectDetails] = useState({
    projectId: '',
    inputFolder: '',
    outputFolder: ''
  });

  // Original processing status states
  const [processingSteps, setProcessingSteps] = useState([
    { id: 1, name: 'Preparing documents', status: 'waiting' },
    { id: 2, name: 'Analyzing document structure', status: 'waiting' },
    { id: 3, name: 'Extracting content based on instructions', status: 'waiting' },
    { id: 4, name: 'Formatting output data', status: 'waiting' },
  ]);
  const [currentStep, setCurrentStep] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [processingStarted, setProcessingStarted] = useState(false);

  // File reference for the PDF
  const pdfFile = files && files.length > 0 ? files[0].url : null;

  // Handle splitting PDF into sections
  const handleSplitPDF = async () => {
    setIsLoading(true);
    try {
      const newSections = await mockSplitPDF(pdfFile, splitPrompt);
      setSections(newSections);
      setWorkflowStep(2);
      toast({
        title: "Document Split",
        description: `Successfully split into ${newSections.length} sections`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to split document. Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
    setIsLoading(false);
  };

  // Handle confirming sections
  const handleConfirmSections = () => {
    setSectionsConfirmed(true);
    setCurrentSection(sections[0]);
    setWorkflowStep(3);
  };

  // Handle redoing section split
  const handleRedoSplit = () => {
    setSectionsConfirmed(false);
    setWorkflowStep(1);
  };

  // Handle adding a parameter to extract
  const handleAddParameter = (sectionId) => {
    setParameters(prev => ({
      ...prev,
      [sectionId]: [...(prev[sectionId] || []), { name: '', description: '' }]
    }));
  };

  // Handle updating parameter info
  const handleUpdateParameter = (sectionId, index, field, value) => {
    setParameters(prev => {
      const updatedParams = [...(prev[sectionId] || [])];
      updatedParams[index] = {
        ...updatedParams[index],
        [field]: value
      };
      return { ...prev, [sectionId]: updatedParams };
    });
  };

  // Handle extracting parameters from a section
  const handleExtractParameters = async (section) => {
    if (!parameters[section.id] || parameters[section.id].length === 0) {
      toast({
        title: "No Parameters",
        description: "Please add at least one parameter to extract",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      const paramNames = parameters[section.id].map(p => p.name);
      const extracted = await mockExtractParameters(section, paramNames);

      // Update parameters with extracted values
      setParameters(prev => {
        const updatedParams = prev[section.id].map((param, idx) => ({
          ...param,
          extractedValue: extracted[param.name]
        }));
        return { ...prev, [section.id]: updatedParams };
      });

      toast({
        title: "Parameters Extracted",
        description: `Successfully extracted ${paramNames.length} parameters`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to extract parameters. Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
    setIsLoading(false);
  };

  // Navigate to next section
  const handleNextSection = () => {
    const currentIndex = sections.findIndex(s => s.id === currentSection.id);
    if (currentIndex < sections.length - 1) {
      setCurrentSection(sections[currentIndex + 1]);
    } else {
      setWorkflowStep(4);
    }
  };

  // Navigate to previous section
  const handlePrevSection = () => {
    const currentIndex = sections.findIndex(s => s.id === currentSection.id);
    if (currentIndex > 0) {
      setCurrentSection(sections[currentIndex - 1]);
    }
  };

  // Handle updating project details
  const handleUpdateProject = (field, value) => {
    setProjectDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle saving the entire configuration
  const handleSaveConfiguration = async () => {
    if (!projectDetails.projectId) {
      toast({
        title: "Missing Information",
        description: "Please provide a Project ID",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      // Build complete configuration
      const config = {
        projectId: projectDetails.projectId,
        inputFolder: projectDetails.inputFolder,
        outputFolder: projectDetails.outputFolder,
        file: pdfFile,
        sections: sections.map(section => ({
          id: section.id,
          title: section.title,
          parameters: parameters[section.id] || []
        }))
      };

      await mockSaveConfiguration(config);
      
      setWorkflowStep(5);
      simulateProcessing(); // Start the original processing simulation
      setProcessingStarted(true);
      
      toast({
        title: "Configuration Saved",
        description: "Your extraction configuration has been saved successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save configuration. Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
    setIsLoading(false);
  };

  // Original processing simulation
  const simulateProcessing = () => {
    // Step 1
    updateStepStatus(1, 'processing');
    
    setTimeout(() => {
      updateStepStatus(1, 'completed');
      setOverallProgress(25);
      setCurrentStep(2);
      
      // Step 2
      updateStepStatus(2, 'processing');
      
      setTimeout(() => {
        updateStepStatus(2, 'completed');
        setOverallProgress(50);
        setCurrentStep(3);
        
        // Step 3
        updateStepStatus(3, 'processing');
        
        setTimeout(() => {
          updateStepStatus(3, 'completed');
          setOverallProgress(75);
          setCurrentStep(4);
          
          // Step 4
          updateStepStatus(4, 'processing');
          
          setTimeout(() => {
            updateStepStatus(4, 'completed');
            setOverallProgress(100);
            setCurrentStep(5); // All complete
          }, 2500);
        }, 3500);
      }, 2000);
    }, 1500);
  };

  const updateStepStatus = (stepId, status) => {
    setProcessingSteps(steps => 
      steps.map(step => 
        step.id === stepId ? { ...step, status } : step
      )
    );
  };

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
    }
  };

  // Render Step 1: PDF Splitting
  const renderPDFSplitStep = () => {
    return (
      <div className="bg-gray-700/50 rounded-lg p-6">
        <Heading size="md" mb={4}>Split Document into Sections</Heading>
        <Text color="gray.400" mb={4}>
          Provide instructions on how to split this document into logical sections.
        </Text>
        <FormControl mb={4}>
          <FormLabel>Split instructions</FormLabel>
          <Textarea
            value={splitPrompt}
            onChange={(e) => setSplitPrompt(e.target.value)}
            placeholder="E.g., Split on major headings, or Split every page..."
            size="md"
            rows={4}
            bg="gray.800"
            border="1px"
            borderColor="gray.600"
          />
        </FormControl>
        <Button
          colorScheme="blue"
          onClick={handleSplitPDF}
          isLoading={isLoading}
          loadingText="Splitting..."
          mt={2}
          width="full"
        >
          Split Document
        </Button>
      </div>
    );
  };

  // Render Step 2: Section Review
  const renderSectionsReviewStep = () => {
    return (
      <div className="bg-gray-700/50 rounded-lg p-6">
        <Flex justify="space-between" align="center" mb={4}>
          <Heading size="md">Document Sections</Heading>
          <Badge colorScheme="blue" p={2}>
            {sections.length} sections detected
          </Badge>
        </Flex>
        
        <Accordion allowToggle defaultIndex={[0]} mb={4} className="bg-gray-800 rounded-md">
          {sections.map((section, index) => (
            <AccordionItem key={section.id} border="none" mb={2} className="border-b border-gray-700 last:border-b-0">
              <AccordionButton _hover={{ bg: "gray.750" }} className="py-3">
                <Box flex="1" textAlign="left" fontWeight="medium">
                  {section.title}
                </Box>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel pb={4} className="text-gray-300">
                {section.content}
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
        
        <HStack mt={6} spacing={4} justify="center">
          <Button colorScheme="gray" onClick={handleRedoSplit} className="flex-1">
            Redo Split
          </Button>
          <Button colorScheme="blue" onClick={handleConfirmSections} className="flex-1">
            Confirm Sections
          </Button>
        </HStack>
      </div>
    );
  };

  // Render Step 3: Parameter Extraction
  const renderParameterExtractionStep = () => {
    return (
      <div className="bg-gray-700/50 rounded-lg p-6">
        <Heading size="md" mb={2}>
          Extract Parameters from Section
        </Heading>
        
        <Flex justify="space-between" align="center" mb={4}>
          <Text color="blue.300" fontWeight="medium">
            {currentSection?.title}
          </Text>
          <Badge colorScheme="green">
            Section {sections.findIndex(s => s.id === currentSection?.id) + 1} of {sections.length}
          </Badge>
        </Flex>
        
        <Box mb={4} p={3} bg="gray.800" rounded="md" className="text-sm text-gray-300 max-h-32 overflow-y-auto">
          {currentSection?.content}
        </Box>
        
        <Divider my={4} />
        
        <Heading size="sm" mb={3}>Parameters to Extract</Heading>
        
        <VStack spacing={3} align="stretch" maxH="250px" overflow="auto" pr={2}>
          {currentSection && parameters[currentSection.id]?.map((param, index) => (
            <Box key={index} p={3} bg="gray.800" rounded="md">
              <HStack spacing={4} mb={2}>
                <FormControl>
                  <FormLabel fontSize="xs">Parameter Name</FormLabel>
                  <Input 
                    size="sm"
                    value={param.name} 
                    onChange={(e) => handleUpdateParameter(currentSection.id, index, 'name', e.target.value)}
                    placeholder="E.g., invoice_number"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="xs">Description</FormLabel>
                  <Input 
                    size="sm"
                    value={param.description} 
                    onChange={(e) => handleUpdateParameter(currentSection.id, index, 'description', e.target.value)}
                    placeholder="What to extract"
                  />
                </FormControl>
              </HStack>
              {param.extractedValue && (
                <FormControl>
                  <FormLabel fontSize="xs">Extracted Value</FormLabel>
                  <Box p={2} bg="gray.700" rounded="md">
                    <Text fontSize="sm">{param.extractedValue}</Text>
                  </Box>
                </FormControl>
              )}
            </Box>
          ))}
        </VStack>
        
        <Button
          leftIcon={<span>+</span>}
          variant="outline"
          onClick={() => currentSection && handleAddParameter(currentSection.id)}
          mt={4}
          width="full"
          size="sm"
        >
          Add Parameter
        </Button>
        
        <HStack mt={5} spacing={4}>
          <Button 
            colorScheme="blue" 
            onClick={() => currentSection && handleExtractParameters(currentSection)}
            isLoading={isLoading}
            loadingText="Extracting..."
            className="flex-1"
          >
            Extract Parameters
          </Button>
          
          <HStack spacing={2} className="flex-1">
            <Button 
              colorScheme="gray" 
              onClick={handlePrevSection}
              isDisabled={!currentSection || sections.indexOf(currentSection) === 0}
              size="sm"
              width="50%"
            >
              Previous
            </Button>
            <Button 
              colorScheme="gray" 
              onClick={handleNextSection}
              size="sm"
              width="50%"
            >
              {sections.indexOf(currentSection) === sections.length - 1 ? "Finish" : "Next"}
            </Button>
          </HStack>
        </HStack>
      </div>
    );
  };

  // Render Step 4: Project Details
  const renderProjectDetailsStep = () => {
    return (
      <div className="bg-gray-700/50 rounded-lg p-6">
        <Heading size="md" mb={4}>Project Details</Heading>
        <Text color="gray.400" mb={4}>
          Provide information about where to store and process these files.
        </Text>
        
        <VStack spacing={4} align="stretch">
          <FormControl isRequired>
            <FormLabel>Project ID</FormLabel>
            <Input 
              value={projectDetails.projectId} 
              onChange={(e) => handleUpdateProject('projectId', e.target.value)}
              placeholder="Enter a unique identifier for this project"
              bg="gray.800"
              border="1px"
              borderColor="gray.600"
            />
          </FormControl>
          
          <FormControl>
            <FormLabel>Input Folder</FormLabel>
            <Input 
              value={projectDetails.inputFolder} 
              onChange={(e) => handleUpdateProject('inputFolder', e.target.value)}
              placeholder="Path to input folder (optional)"
              bg="gray.800"
              border="1px"
              borderColor="gray.600"
            />
          </FormControl>
          
          <FormControl>
            <FormLabel>Output Folder</FormLabel>
            <Input 
              value={projectDetails.outputFolder} 
              onChange={(e) => handleUpdateProject('outputFolder', e.target.value)}
              placeholder="Path to output folder (optional)"
              bg="gray.800"
              border="1px"
              borderColor="gray.600"
            />
          </FormControl>
        </VStack>
        
        <Button
          colorScheme="blue"
          onClick={handleSaveConfiguration}
          isLoading={isLoading}
          loadingText="Saving..."
          mt={6}
          width="full"
        >
          Save & Continue
        </Button>
      </div>
    );
  };

  // Render workflow steps based on current step
  const renderWorkflowContent = () => {
    if (workflowStep === 5) {
      // For step 5, use the original full-width processing UI
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Processing Files</h2>
            <div className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm">
              {configuration.templateType === 'fixed' ? 'Fixed Format' : 'Running Format'}
            </div>
          </div>

          <div className="bg-gray-700/50 rounded-lg p-6">
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Overall Progress</h3>
                <span className="text-sm text-gray-300">{overallProgress}%</span>
              </div>
              <div className="h-2 w-full bg-gray-600 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-blue-500"
                  initial={{ width: '0%' }}
                  animate={{ width: `${overallProgress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            <div className="space-y-6">
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

            {currentStep === 5 && (
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
              </motion.div>
            )}
          </div>
        </div>
      );
    } else {
      // For steps 1-4, return null since we'll use the side-by-side layout
      return null;
    }
  };

  // The main action button based on workflow step
  const renderActionButton = () => {
    if (workflowStep < 5) {
      // For steps 1-4, don't need a button in the footer as the actions are in the right panel
      return null;
    } else if (!processingStarted) {
      // For step 5, before processing
      return (
        <button
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-medium transition-colors"
          onClick={onProcess}
        >
          Start Processing
        </button>
      );
    } else if (currentStep < 5) {
      // During processing
      return (
        <div className="px-6 py-2 bg-gray-700 text-gray-300 rounded-md font-medium">
          Processing...
        </div>
      );
    } else {
      // After processing completes
      return (
        <button
          className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-md font-medium transition-colors"
          onClick={onProcess}
        >
          View Results
        </button>
      );
    }
  };

  // Render the step indicator
  const renderStepIndicator = () => {
    if (workflowStep >= 5) return null;
    
    return (
      <div className="flex justify-center mb-6">
        {[1, 2, 3, 4].map((step) => (
          <div 
            key={step}
            className={`flex flex-col items-center mx-4 ${workflowStep >= step ? 'text-blue-400' : 'text-gray-500'}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
              workflowStep === step ? 'bg-blue-500 text-white' : 
              workflowStep > step ? 'bg-blue-900 text-blue-300' : 
              'bg-gray-700 text-gray-500'
            }`}>
              {workflowStep > step ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step
              )}
            </div>
            <div className="text-xs">
              {step === 1 ? "Split" : 
               step === 2 ? "Review" : 
               step === 3 ? "Extract" : "Save"}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderStepIndicator()}
      
      {workflowStep < 5 ? (
        // Side-by-side layout for steps 1-4
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left side: PDF Viewer (always visible) */}
          <div className="bg-gray-800 rounded-lg overflow-hidden" style={{ height: '600px' }}>
            {pdfFile ? (
              <PDFPreview file={pdfFile} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Text color="gray.400">No PDF file available</Text>
              </div>
            )}
          </div>
          
          {/* Right side: Step-specific UI */}
          <div>
            <Heading size="lg" mb={4}>
              {workflowStep === 1 ? "Step 1: Split Document" : 
               workflowStep === 2 ? "Step 2: Review Sections" : 
               workflowStep === 3 ? "Step 3: Extract Parameters" : 
               "Step 4: Project Details"}
            </Heading>
            
            {workflowStep === 1 && renderPDFSplitStep()}
            {workflowStep === 2 && renderSectionsReviewStep()}
            {workflowStep === 3 && renderParameterExtractionStep()}
            {workflowStep === 4 && renderProjectDetailsStep()}
          </div>
        </div>
      ) : (
        // Full-width layout for step 5 (processing)
        renderWorkflowContent()
      )}

      <div className="flex justify-between pt-4">
        <button
          className={`px-4 py-2 text-gray-300 bg-gray-700 rounded-md transition-colors ${
            isProcessing || isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:text-white hover:bg-gray-600'
          }`}
          onClick={onBack}
          disabled={isProcessing || isLoading}
        >
          Back
        </button>
        
        {renderActionButton()}
      </div>
    </div>
  );
};

export default ProcessingStatus;