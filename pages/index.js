// pages/index.js - Updated with Fixed Template Workflow Support and Proper Navigation
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';
import ProjectList from '../components/ProjectList';
import SelectTemplateType from '../components/SelectTemplateType';
import FileUploader from '../components/FileUploader';
import ProcessingStatus from '../components/ProcessingStatus';
import ConfigurationEditor from '../components/ConfigurationEditor';
import StepIndicator from '../components/StepIndicator';
import SchemaMapping from '../components/SchemaMapping';
import ViewResultsComponent from '../components/ViewResultsComponent';
import BatchProcessing from '../components/BatchProcessing';
import { Box, Heading, Text, VStack, Button } from '@chakra-ui/react';
//import MasterProjectList from '../components/MasterProjectList';
import { ArrowLeft } from 'lucide-react';
import MasterDashboard from '../components/MasterDashboard';

export default function Home() {
  const [currentView, setCurrentView] = useState('projects'); // 'projects', 'setup', 'config', 'viewResults', 'schemaMapping', 'batchProcessing'
  const [step, setStep] = useState(1);
  const [currentMasterProject, setCurrentMasterProject] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);
  const [templateType, setTemplateType] = useState(null);
  const [files, setFiles] = useState([]);
  const [configuration, setConfiguration] = useState(null);
  const [results, setResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Configure extraction states
  const [configStep, setConfigStep] = useState(1);
  const [sections, setSections] = useState([]);
  const [parameters, setParameters] = useState({});
  const [extractedData, setExtractedData] = useState({});

  // Handle project selection (for configuration flow)
  const handleSelectProject = (project) => {
    console.log('Selecting project for configuration:', project);
    setCurrentProject(project);
    
    // Check project status and navigate accordingly
    if (project.status === 'saved' || project.status === 'active') {
      setCurrentView('setup');
      setStep(3); // Go to configuration
    } else if (project.status === 'in_progress') {
      setCurrentView('setup');
      setStep(project.lastStep || 1);
    } else {
      setCurrentView('setup');
      setStep(1);
    }
    
    // Reset states for selected project
    setTemplateType(project.templateType || null);
    setFiles([]);
    setConfiguration(null);
    setResults(null);
    setConfigStep(1);
    setSections([]);
    setParameters({});
    setExtractedData({});
  };

  // Handle viewing results directly (for Eye icon)
  const handleViewResults = async (project) => {
  console.log('Viewing results for project:', project);
  
  try {
    // Set loading state or show spinner if needed
    setIsProcessing(true);
    
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://pdf-api.enigmahealth.io/api';
    const projectId = project.project_id || project.projectId;
    
    console.log('Fetching data for project ID:', projectId);
    
    // Fetch template type if not available
    let templateType = project.templateType;
    if (!templateType) {
      try {
        console.log('Fetching template type from API...');
        const templateResponse = await fetch(`/api/config/projects/${projectId}/template-type`);
        if (templateResponse.ok) {
          const templateInfo = await templateResponse.json();
          templateType = templateInfo.template_type || 'running';
          console.log('Template type fetched:', templateType);
        } else {
          console.warn('Template type API call failed, using fallback');
          templateType = 'running'; // fallback
        }
      } catch (err) {
        console.warn('Could not fetch template type, using fallback:', err);
        templateType = 'running';
      }
    }
    
    // Create comprehensive configuration data for ViewResultsComponent
    const configurationData = {
      projectDetails: {
        projectId: projectId,
        description: project.description || project.project_description,
        name: project.name || project.project_name,
        status: project.status,
        created: project.created || project.created_at,
        lastModified: project.lastModified || project.last_modified
      },
      templateType: templateType,
      // Add any additional data that ViewResultsComponent might need
      files: [], // Will be populated by ViewResultsComponent from API
      extractedData: {}, // Will be populated by ViewResultsComponent from API
      totalSections: 0, // Will be calculated by ViewResultsComponent
      totalParameters: 0 // Will be calculated by ViewResultsComponent
    };
    
    console.log('Configuration data prepared:', configurationData);
    
    // Update current project with full information
    setCurrentProject({
      ...project,
      projectId: projectId,
      templateType: templateType
    });
    
    // Set configuration and navigate
    setConfiguration(configurationData);
    setTemplateType(templateType);
    setCurrentView('viewResults');
    
    console.log('Navigated to viewResults with template type:', templateType);
    
  } catch (error) {
    console.error('Error preparing view results:', error);
    // Still try to navigate with basic data
    const basicConfigurationData = {
      projectDetails: {
        projectId: project.project_id || project.projectId,
        description: project.description || 'No description available'
      },
      templateType: project.templateType || 'running'
    };
    
    console.log('Using basic configuration data due to error:', basicConfigurationData);
    
    setCurrentProject({
      ...project,
      projectId: project.project_id || project.projectId
    });
    setConfiguration(basicConfigurationData);
    setCurrentView('viewResults');
  } finally {
    setIsProcessing(false);
  }
};

  // Handle schema mapping directly (for Database icon)
  const handleSchemaMapping = (project) => {
    console.log('Going to schema mapping for project:', project);
    
    setCurrentProject({
      ...project,
      projectId: project.project_id || project.projectId
    });
    setCurrentView('schemaMapping');
  };

  // Handle batch processing directly (for Activity icon)
  const handleBatchProcessing = (project) => {
    console.log('Going to batch processing for project:', project);
    
    setCurrentProject({
      ...project,
      projectId: project.project_id || project.projectId
    });
    setCurrentView('batchProcessing');
  };

  // Handle template selection
  const handleTemplateSelection = (type) => {
    console.log('Template selected:', type);
    setTemplateType(type);
    setStep(2);
  };

  // Handle file upload
  const handleFileUpload = (uploadedFiles) => {
    console.log('Files uploaded:', uploadedFiles);
    setFiles(uploadedFiles);
    setStep(3);
  };

  // Handle configuration save (from ConfigurationEditor)
  const handleConfigurationSave = (config) => {
    console.log('Configuration saved:', config);
    setConfiguration(config);
  };

  // Updated configuration completion handler - considers template type
  const handleConfigurationComplete = () => {
    console.log('Configuration completed, moving to results step');
    console.log('Template type:', templateType);
    console.log('Current sections:', sections);
    console.log('Current parameters:', parameters);
    
    // Create results from extracted parameters/sections based on template type
    const extractionResults = {
      projectId: currentProject.projectId,
      templateType: templateType,
      files: files.map(file => ({
        name: file.name || 'Document.pdf',
        fileId: file.fileId || file.id,
        sections: templateType === 'fixed' 
          ? sections.filter(section => section.isParameterSection) // For fixed: only parameter sections
          : sections.map(section => ({ // For running: sections with parameters
              id: section.id,
              title: section.title,
              parameters: parameters[section.id] || []
            }))
      })),
      extractedParameters: parameters,
      totalSections: sections.length,
      totalParameters: templateType === 'fixed' 
        ? sections.filter(section => section.isParameterSection).length 
        : Object.values(parameters).flat().length
    };
    
    setResults(extractionResults);
    setExtractedData(parameters);
    setStep(4); // Go directly to results (step 4)
  };

  // Handle processing (simulate or trigger backend processing)
  const handleProcessing = async () => {
    console.log('Starting processing...');
    setIsProcessing(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (currentProject) {
        console.log('Processing complete for project:', currentProject.projectId);
      }
      
      setStep(5);
    } catch (error) {
      console.error('Processing failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle viewing summary - now goes to schema mapping
  const handleViewSummary = () => {
    console.log('Going to schema mapping from results');
    setCurrentView('schemaMapping');
  };

  // Reset to projects view
  const handleBackToProjects = () => {
    console.log('Going back to projects');
    setCurrentView('projects');
    setStep(1);
    setCurrentProject(null);
    setTemplateType(null);
    setFiles([]);
    setConfiguration(null);
    setResults(null);
    setConfigStep(1);
    setSections([]);
    setParameters({});
    setExtractedData({});
  };

  const handleSelectMasterProject = (master) => {
    setCurrentMasterProject(master);
    handleBackToProjects();
  };

  const handleBackToMasters = () => {
    handleBackToProjects();
    setCurrentMasterProject(null);
  };

  // Handle back navigation within setup flow
  const handleBackInSetup = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      handleBackToProjects();
    }
  };

  // Handle back from schema mapping to results
  const handleBackToResults = () => {
    console.log('Going back to view results from schema mapping');
    setCurrentView('viewResults');
  };

  // Handle back from batch processing
  const handleBackFromBatch = () => {
    console.log('Going back from batch processing');
    // If we came from schema mapping, go back there
   // if (currentView === 'batchProcessing') {
   //   setCurrentView('schemaMapping');
  //  } else {
      handleBackToProjects();
  //  }
    handleBackToProjects();
  };

  // Updated edit configuration handler - considers template types
  const handleEditConfiguration = async () => {
    console.log('Editing configuration for project:', currentProject);
    
    // Ensure we have the required data before navigating to configuration
    if (currentProject) {
      let projectTemplateType = currentProject.templateType;
      let projectFiles = [];
      
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://pdf-api.enigmahealth.io/api';

        // If template type is not available, fetch it from the API
        if (!projectTemplateType) {
          console.log('Template type not found, fetching from API...');
          const templateResponse = await fetch(`${API_BASE_URL}/config/projects/${currentProject.projectId}/template-type`);
          
          if (templateResponse.ok) {
            const templateInfo = await templateResponse.json();
            projectTemplateType = templateInfo.template_type;
            console.log('Template type fetched from API:', templateInfo);
            
            // Update current project with the fetched template type
            setCurrentProject(prev => ({
              ...prev,
              templateType: projectTemplateType
            }));
          } else {
            console.error('Failed to fetch template type from API:', templateResponse.status);
            // Fallback to 'running' if API call fails
            projectTemplateType = 'running';
          }
        }
        
        // Fetch project files
        console.log('Fetching project files from API...');
        const filesResponse = await fetch(`/api/config/projects/${currentProject.projectId}/files`);

        
        if (filesResponse.ok) {
          const filesData = await filesResponse.json();
          console.log('Project files fetched from API:', filesData);
          
          // Transform API response to match expected file format
          projectFiles = filesData.files.map(file => {
            const fileId = file.fileId || file.id || file;
            const fileName = typeof file === 'string' ? file : (file.name || file.fileName || fileId);
            
            return {
              id: fileId,
              fileId: fileId,
              name: fileName,
              size: file.size || 0,
              type: file.type || 'application/pdf',
              lastModified: file.lastModified || new Date().toISOString(),
              projectId: currentProject.projectId,
              path: file.path,
              url: file.url,
              previewUrl: `/api/projects/${currentProject.projectId}/configuration/files/${encodeURIComponent(fileId)}/preview`,
downloadUrl: `/api/projects/${currentProject.projectId}/configuration/files/${encodeURIComponent(fileId)}/preview`
            };
          });
        } else {
          console.error('Failed to fetch project files from API:', filesResponse.status);
          // Create a placeholder file if API call fails
          projectFiles = [{
            id: 'placeholder-file',
            fileId: 'placeholder-file',
            name: 'Project File.pdf',
            size: 0,
            type: 'application/pdf',
            lastModified: new Date().toISOString(),
            projectId: currentProject.projectId,
            previewUrl: `${API_BASE_URL}/projects/${currentProject.projectId}/files/placeholder-file/preview`
          }];
        }
        
      } catch (error) {
        console.error('Error fetching project data:', error);
        // Fallback values if API calls fail
        projectTemplateType = projectTemplateType || 'running';
        projectFiles = [{
          id: 'fallback-file',
          fileId: 'fallback-file', 
          name: 'Project File.pdf',
          size: 0,
          type: 'application/pdf',
          lastModified: new Date().toISOString(),
          projectId: currentProject.projectId,
          previewUrl: `${API_BASE_URL}/projects/${currentProject.projectId}/files/fallback-file/preview`
        }];
      }
      
      // Set the template type and files
      setTemplateType(projectTemplateType);
      setFiles(projectFiles);
      
      // Reset configuration states to ensure clean state
      setConfigStep(1);
      setSections([]);
      setParameters({});
      setExtractedData({});
      
      // Navigate to configuration flow
      setCurrentView('setup');
      setStep(3); // Go to configuration step
    } else {
      console.error('No current project available for editing configuration');
      // Fallback to projects view
      handleBackToProjects();
    }
  };

  const handleCompleteResults = () => {
    console.log('Results viewing completed, going to schema mapping');
    setCurrentView('schemaMapping');
  };

  // Updated to navigate to batch processing
  const handleSchemaComplete = (data) => {
    console.log('Schema mapping completed:', data);
    console.log('Navigating to batch processing...');
    // Navigate to batch processing
    setCurrentView('batchProcessing');
  };

  // Handle batch processing completion
  const handleBatchComplete = () => {
    console.log('Batch processing completed, going back to projects');
    handleBackToProjects();
  };

  const getCurrentStepTitle = () => {
    if (currentView === 'projects') return 'Projects';
    if (currentView === 'viewResults') return 'View Results';
    if (currentView === 'schemaMapping') return 'Database Schema Mapping';
    if (currentView === 'batchProcessing') return 'Batch Processing';
    
    switch (step) {
      case 1: return 'Select Template Type';
      case 2: return 'Upload PDF Files';
      case 3: return 'Configure Extraction';
      case 4: return 'View Results';
      case 5: return 'Processing Complete';
      default: return '';
    }
  };

  const getCurrentStepDescription = () => {
    if (currentView === 'projects') return 'Manage your PDF extraction projects';
    if (currentView === 'viewResults') return 'View extracted data and configuration details';
    if (currentView === 'schemaMapping') return 'Configure database schema for extracted parameters';
    if (currentView === 'batchProcessing') return 'Automate PDF processing and monitor batch operations';
    
    switch (step) {
      case 1: return 'Choose the type of PDF template you want to process';
      case 2: return 'Upload your PDF files to process';
      case 3: return templateType === 'fixed' 
        ? 'Select regions on the PDF to extract data from specific positions'
        : 'Configure how data should be extracted from flowing content';
      case 4: return 'View and download your extracted data';
      case 5: return 'Processing has been completed successfully';
      default: return '';
    }
  };

  // Debug logging
  useEffect(() => {
    console.log('Current state:', {
      currentView,
      step,
      configStep,
      templateType,
      sectionsCount: sections.length,
      parametersCount: Object.keys(parameters).length,
      extractedDataCount: Object.keys(extractedData).length,
      currentProject: currentProject?.projectId
    });
  }, [currentView, step, configStep, templateType, sections, parameters, extractedData, currentProject]);

  if (!currentMasterProject) {
    return (
      <Layout>
        <MasterDashboard onSelectMasterProject={handleSelectMasterProject} />
      </Layout>
    );
  }

  return (
    <Layout>
      <Box className="min-h-screen flex flex-col">
        <Box mb={4} display="flex" justifyContent="flex-start" alignItems="center">
          <Button
            variant="ghost"
            colorScheme="blue"
            leftIcon={<ArrowLeft size={16} />}
            onClick={handleBackToMasters}
          >
            Back to Master Projects
          </Button>
        </Box>

        <Box textAlign="center" mb={4}>
          <Heading as="h1" size="lg" mb={1}>
            Master Project: {currentMasterProject.masterId}
          </Heading>
          <Text color="gray.500" fontSize="md" mb={4}>
            {currentMasterProject.description}
          </Text>
        </Box>

        {/* Step Indicator - show during setup/config, viewResults, schemaMapping, and batchProcessing */}
        {currentView !== 'projects' && (
          <StepIndicator 
            currentStep={
              currentView === 'viewResults' ? 4 : 
              currentView === 'schemaMapping' ? 5 :
              currentView === 'batchProcessing' ? 6 : 
              step
            } 
          />
        )}

        {/* Step Title and Description */}
        <Box textAlign="center" mb={4}>
          <Heading as="h2" size="lg" mb={1}>
            {getCurrentStepTitle()}
          </Heading>
          <Text color="gray.400" fontSize="sm">
            {getCurrentStepDescription()}
          </Text>
          {currentProject && (
            <Text color="blue.300" fontSize="sm" mt={1}>
              Project: {currentProject.projectId || currentProject.project_id}
              {templateType && (
                <Text as="span" color="orange.300" ml={2}>
                  • {templateType.toUpperCase()} Format
                </Text>
              )}
            </Text>
          )}
        </Box>

        <motion.div
          key={`${currentView}-${step}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className={`bg-gray-800 rounded-lg shadow-xl max-w-6xl mx-auto w-full ${
            step === 2 || currentView === 'schemaMapping' || currentView === 'batchProcessing' ? 'p-6 flex-1' : 'p-6'
          }`}
          style={{ overflowX: 'hidden' }}
        >
          {/* Projects View */}
          {currentView === 'projects' && (
            <ProjectList
              masterProjectId={currentMasterProject.masterId}
              onSelectProject={handleSelectProject}
              onViewResults={handleViewResults}
              onSchemaMapping={handleSchemaMapping}
              onBatchProcessing={handleBatchProcessing}
            />
          )}

          {/* View Results */}
          {currentView === 'viewResults' && configuration && (
            <ViewResultsComponent
              configurationData={configuration}
              onEdit={handleEditConfiguration}
              onComplete={handleCompleteResults}
              onBack={handleBackToProjects}
            />
          )}

          {/* Schema Mapping View */}
          {currentView === 'schemaMapping' && (
            <SchemaMapping
              project={currentProject}
              sections={sections}
              parameters={parameters}
              extractedData={extractedData}
              onBack={handleBackToResults} // Back to results
              onBackToProjects={handleBackToProjects} // Back to projects
              onComplete={handleSchemaComplete}
            />
          )}

          {/* Batch Processing View */}
          {currentView === 'batchProcessing' && (
            <BatchProcessing
              project={currentProject}
              onBack={handleBackFromBatch}
              onComplete={handleBatchComplete}
            />
          )}

          {/* Setup Flow */}
          {currentView === 'setup' && (
            <>
              {step === 1 && (
                <SelectTemplateType 
                  onSelect={handleTemplateSelection}
                  templateType={templateType}
                  setTemplateType={setTemplateType}
                  hideTitle={true}
                  onBack={handleBackToProjects}
                  projectId={currentProject?.projectId}
                />
              )}
              
              {step === 2 && (
                <FileUploader 
                  templateType={templateType} 
                  onUpload={handleFileUpload} 
                  onBack={() => setStep(1)}
                  hideTitle={true}
                  projectId={currentProject?.projectId}
                />
              )}
              
              {step === 3 && (
                <ConfigurationEditor
                  templateType={templateType}
                  files={files}
                  configStep={configStep}
                  setConfigStep={setConfigStep}
                  sections={sections}
                  setSections={setSections}
                  parameters={parameters}
                  setParameters={setParameters}
                  projectDetails={currentProject}
                  onSave={handleConfigurationSave}
                  onBack={() => setStep(2)}
                  hideTitle={true}
                  onComplete={handleConfigurationComplete}
                />
              )}
              
              {step === 4 && (
                <ViewResultsComponent
                  configurationData={{
                    projectDetails: currentProject,
                    templateType: templateType,
                    sections: sections,
                    parameters: parameters,
                    extractedData: extractedData
                  }}
                  onEdit={handleEditConfiguration}
                  onComplete={handleCompleteResults}
                  onBack={() => setStep(3)}
                />
              )}
            </>
          )}
        </motion.div>
      </Box>
    </Layout>
  );
}