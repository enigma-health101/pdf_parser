// Updated BatchProcessing.js component with backend integration
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Badge,
  Progress,
  Alert,
  AlertIcon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  Divider,
  List,
  ListItem,
  ListIcon,
  Code,
  Textarea,
  useToast,
  Spinner,
  IconButton,
  Tooltip,
  Collapse,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Flex,
  Switch,
  FormControl,
  FormLabel,
  Link
} from '@chakra-ui/react';
import {
  Play,
  RotateCcw,
  Download,
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  Info,
  Settings,
  Eye,
  Trash2,
  ArrowLeft,
  RefreshCw,
  Folder,
  Clock,
  ChevronDown,
  ChevronRight,
  Code as CodeIcon,
  Edit3,
  Save,
  X,
  File,
  ExternalLink,
  Database
} from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://pdf-api.enigmahealth.io/api';

const BatchProcessing = ({ project, onBack, onComplete }) => {
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingLogs, setProcessingLogs] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [results, setResults] = useState(null);
  const [outputFiles, setOutputFiles] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [batchEnabled, setBatchEnabled] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState(null);
  const [dbProcessingEnabled, setDbProcessingEnabled] = useState(false);
  const [dbStatus, setDbStatus] = useState(null);
  const [dbResults, setDbResults] = useState(null);
  
  const toast = useToast();
  const logsEndRef = useRef(null);
  const refreshInterval = useRef(null);
  
  const { isOpen: isResultsOpen, onOpen: onResultsOpen, onClose: onResultsClose } = useDisclosure();
  const { isOpen: isFilesOpen, onOpen: onFilesOpen, onClose: onFilesClose } = useDisclosure();
  const { isOpen: isDbResultsOpen, onOpen: onDbResultsOpen, onClose: onDbResultsClose } = useDisclosure();
  useEffect(() => {
    loadBatchStatus();
    loadDbProcessingStatus(); 
    // Auto-refresh if enabled
    if (autoRefresh) {
      refreshInterval.current = setInterval(() => {
        loadBatchStatus();
        loadOutputFiles();
        loadDbProcessingStatus();
      }, 5000);
    }
    
    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [project?.project_id, autoRefresh]);

  const initialRender = useRef(true);

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    if (logs.length > 0) {
      scrollToBottom();
    }
  }, [logs]);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addLog = (message, level = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const newLog = { timestamp, message, level, id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
    setLogs(prev => [...prev, newLog]);
  };

  const loadBatchStatus = async () => {
  if (!project?.project_id) return;
  
  try {
    const response = await axios.get(`${API_BASE_URL}/batch/projects/${project.project_id}/batch/status`);
    setStatus(response.data);
    setBatchEnabled(response.data.batch_enabled || false);
    setDbProcessingEnabled(response.data.db_processing_enabled || false);
    
    // For fixed format projects, also load template type info
    if (response.data.template_type) {
      addLog(`Template type: ${response.data.template_type}`, 'info');
      if (response.data.template_type === 'fixed') {
        addLog('Fixed format detected - using vision-based extraction', 'info');
      }
    }
  } catch (error) {
    console.error('Error loading batch status:', error);
    addLog(`Failed to load status: ${error.message}`, 'error');
  }
};

  const loadResults = async () => {
  if (!project?.project_id) return;
  
  try {
    addLog('Loading processing results...', 'info');
    const response = await axios.get(`${API_BASE_URL}/batch/projects/${project.project_id}/batch/results`);
    setResults(response.data);
    
    // Handle both fixed and running format results
    const resultCount = response.data.summary?.total_files || response.data.results?.length || 0;
    addLog(`✓ Loaded results: ${resultCount} files processed`, 'success');
    
    // For fixed format, also check for parameters count
    if (status?.template_type === 'fixed') {
      const paramCount = response.data.summary?.total_parameters || 0;
      addLog(`✓ Fixed format: ${paramCount} parameters extracted`, 'info');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error loading results:', error);
    addLog(`✗ Failed to load results: ${error.message}`, 'error');
    toast({
      title: 'Error Loading Results',
      description: error.response?.data?.message || error.message,
      status: 'error',
      duration: 5000
    });
    throw error;
  }
};

const loadDbProcessingStatus = async () => {
  if (!project?.project_id) return;
  
  try {
    const response = await axios.get(`${API_BASE_URL}/batch/projects/${project.project_id}/batch/db-processing/status`);
    setDbStatus(response.data);
    setDbProcessingEnabled(response.data.db_processing_enabled || false);
  } catch (error) {
    console.error('Error loading DB processing status:', error);
  }
};

const enableDbProcessing = async () => {
  if (!project?.project_id) return;
  
  setLoading(true);
  addLog('Enabling database processing...', 'info');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/batch/projects/${project.project_id}/batch/db-processing/enable`);
    
    if (response.data.success) {
      addLog('✓ Database processing enabled successfully!', 'success');
      setDbProcessingEnabled(true);
      await loadDbProcessingStatus();
      
      toast({
        title: 'Database Processing Enabled',
        description: 'Project is now configured for database processing',
        status: 'success',
        duration: 3000
      });
    } else {
      addLog(`✗ Enable failed: ${response.data.error}`, 'error');
      toast({
        title: 'Enable Failed',
        description: response.data.error,
        status: 'error',
        duration: 5000
      });
    }
  } catch (error) {
    addLog(`✗ Enable error: ${error.message}`, 'error');
    toast({
      title: 'Enable Error',
      description: error.message,
      status: 'error',
      duration: 5000
    });
  } finally {
    setLoading(false);
  }
};

const disableDbProcessing = async () => {
  if (!project?.project_id) return;
  
  setLoading(true);
  addLog('Disabling database processing...', 'info');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/batch/projects/${project.project_id}/batch/db-processing/disable`);
    
    if (response.data.success) {
      addLog('✓ Database processing disabled successfully!', 'success');
      setDbProcessingEnabled(false);
      await loadDbProcessingStatus();
      
      toast({
        title: 'Database Processing Disabled',
        description: 'Project is no longer configured for database processing',
        status: 'success',
        duration: 3000
      });
    } else {
      addLog(`✗ Disable failed: ${response.data.error}`, 'error');
    }
  } catch (error) {
    addLog(`✗ Disable error: ${error.message}`, 'error');
  } finally {
    setLoading(false);
  }
};

const processToDatabase = async () => {
  if (!project?.project_id) return;
  
  setLoading(true);
  addLog('Processing files to database...', 'info');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/batch/projects/${project.project_id}/batch/db-processing/process`);
    
    if (response.data.success) {
      addLog(`✓ Database processing completed successfully!`, 'success');
      addLog(`Processed: ${response.data.processed_files} files, Failed: ${response.data.failed_files} files`, 'info');
      addLog(`Database table: ${response.data.schema_table}`, 'info');
      
      // Refresh status and files
      await Promise.all([loadDbProcessingStatus(), loadOutputFiles()]);
      
      toast({
        title: 'Database Processing Complete',
        description: `Processed ${response.data.processed_files} files to database`,
        status: 'success',
        duration: 5000
      });
    } else {
      addLog(`✗ Database processing failed: ${response.data.error}`, 'error');
      
      toast({
        title: 'Database Processing Failed',
        description: response.data.error || 'Database processing failed',
        status: 'error',
        duration: 5000
      });
    }
  } catch (error) {
    addLog(`✗ Database processing error: ${error.message}`, 'error');
    toast({
      title: 'Database Processing Error',
      description: error.message,
      status: 'error',
      duration: 5000
    });
  } finally {
    setLoading(false);
  }
};

const loadDatabaseResults = async () => {
  if (!project?.project_id) return;
  
  try {
    addLog('Loading database results...', 'info');
    const response = await axios.get(`${API_BASE_URL}/batch/projects/${project.project_id}/batch/db-processing/results`);
    
    if (response.data.success) {
      setDbResults(response.data);
      addLog(`✓ Loaded database results: ${response.data.total_records} records`, 'success');
      return response.data;
    } else {
      addLog(`✗ Failed to load database results: ${response.data.error}`, 'error');
      throw new Error(response.data.error);
    }
  } catch (error) {
    console.error('Error loading database results:', error);
    addLog(`✗ Failed to load database results: ${error.message}`, 'error');
    toast({
      title: 'Error Loading Database Results',
      description: error.response?.data?.message || error.message,
      status: 'error',
      duration: 5000
    });
    throw error;
  }
};

  const loadOutputFiles = async () => {
  if (!project?.project_id) return;
  
  try {
    const response = await axios.get(`${API_BASE_URL}/batch/projects/${project.project_id}/batch/files`);
    
    // Enhanced file type detection for fixed format
    const enhancedFiles = response.data.files.map(file => {
      let enhancedType = file.type;
      
      if (file.filename.includes('_coordinates')) {
        enhancedType = 'coordinates';
      } else if (file.filename.includes('_normalized') || file.filename.includes('_dynamic_normalized')) {
        enhancedType = 'normalized';
      }
      
      return {
        ...file,
        type: enhancedType
      };
    });
    
    setOutputFiles(enhancedFiles);
  } catch (error) {
    console.error('Error loading output files:', error);
  }
};

  const downloadAllResults = async () => {
    if (!project?.project_id) return;
    
    try {
      addLog('Preparing download...', 'info');
      setDownloadingFile('all');
      
      // Create a download link
      const downloadUrl = `${API_BASE_URL}/batch/projects/${project.project_id}/batch/download`;
      
      // Use fetch to handle the download with proper error handling
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Download failed');
      }
      
      // Get the filename from the response headers
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `${project.project_id}_batch_results.zip`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      addLog(`✓ Download started: ${filename}`, 'success');
      toast({
        title: 'Download Started',
        description: 'Your files are being downloaded',
        status: 'success',
        duration: 3000
      });
      
    } catch (error) {
      addLog(`✗ Download failed: ${error.message}`, 'error');
      toast({
        title: 'Download Failed',
        description: error.message,
        status: 'error',
        duration: 5000
      });
    } finally {
      setDownloadingFile(null);
    }
  };

  const downloadSingleFile = async (filename) => {
    if (!project?.project_id || !filename) return;
    
    try {
      setDownloadingFile(filename);
      addLog(`Downloading ${filename}...`, 'info');
      
      const downloadUrl = `${API_BASE_URL}/batch/projects/${project.project_id}/batch/download/file/${encodeURIComponent(filename)}`;
      
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Download failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      addLog(`✓ Downloaded: ${filename}`, 'success');
      
    } catch (error) {
      addLog(`✗ Download failed for ${filename}: ${error.message}`, 'error');
      toast({
        title: 'Download Failed',
        description: `Failed to download ${filename}`,
        status: 'error',
        duration: 3000
      });
    } finally {
      setDownloadingFile(null);
    }
  };

  const enableBatchProcessing = async () => {
    if (!project?.project_id) return;
    
    setLoading(true);
    addLog('Enabling batch processing...', 'info');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/batch/projects/${project.project_id}/batch/enable`);
      
      if (response.data.success) {
        addLog('✓ Batch processing enabled successfully!', 'success');
        setBatchEnabled(true);
        await loadBatchStatus();
        
        toast({
          title: 'Batch Processing Enabled',
          description: 'Project is now configured for batch processing',
          status: 'success',
          duration: 3000
        });
      } else {
        addLog(`✗ Enable failed: ${response.data.error}`, 'error');
        toast({
          title: 'Enable Failed',
          description: response.data.error,
          status: 'error',
          duration: 5000
        });
      }
    } catch (error) {
      addLog(`✗ Enable error: ${error.message}`, 'error');
      toast({
        title: 'Enable Error',
        description: error.message,
        status: 'error',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const disableBatchProcessing = async () => {
    if (!project?.project_id) return;
    
    setLoading(true);
    addLog('Disabling batch processing...', 'info');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/batch/projects/${project.project_id}/batch/disable`);
      
      if (response.data.success) {
        addLog('✓ Batch processing disabled successfully!', 'success');
        setBatchEnabled(false);
        await loadBatchStatus();
        
        toast({
          title: 'Batch Processing Disabled',
          description: 'Project is no longer configured for batch processing',
          status: 'success',
          duration: 3000
        });
      } else {
        addLog(`✗ Disable failed: ${response.data.error}`, 'error');
      }
    } catch (error) {
      addLog(`✗ Disable error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const runBatchProcessing = async () => {
  if (!project?.project_id) return;
  
  setLoading(true);
  setProcessingLogs('');
  addLog('Starting batch processing...', 'info');
  
  try {
    // Enhanced logging based on template type
    if (status?.template_type === 'fixed') {
      addLog('Processing fixed format PDF with OCR extraction...', 'info');
      addLog(`Using region-based coordinate extraction for ${status?.regions_count || 0} parameters`, 'info');
    } else {
      addLog('Processing running format PDF with text extraction...', 'info');
    }
    
    const response = await axios.post(`${API_BASE_URL}/batch/projects/${project.project_id}/batch/process`);
    
    if (response.data.success) {
      addLog('✓ Batch processing completed successfully!', 'success');
      
      // Show processing details
      const processedFiles = response.data.processed_files || 0;
      const failedFiles = response.data.failed_files || 0;
      addLog(`Processed: ${processedFiles} files, Failed: ${failedFiles} files`, 'info');
      
      // Show template-specific success messages
      if (status?.template_type === 'fixed') {
        addLog('✓ Fixed format extraction completed using OCR', 'success');
        addLog('✓ Created metadata worksheets with extraction details', 'success');
      } else {
        addLog('✓ Running format extraction completed using text parsing', 'success');
      }
      
      // Load results and files
      await Promise.all([loadResults(), loadOutputFiles(), loadBatchStatus()]);
      
      toast({
        title: 'Processing Complete',
        description: status?.template_type === 'fixed' ? 
          `Processed ${processedFiles} files with region-based extraction` :
          `Processed ${processedFiles} files successfully`,
        status: 'success',
        duration: 5000
      });
    } else {
      addLog(`✗ Processing failed: ${response.data.error}`, 'error');
      
      toast({
        title: 'Processing Failed',
        description: response.data.error || 'Batch processing failed',
        status: 'error',
        duration: 5000
      });
    }
  } catch (error) {
    addLog(`✗ Processing error: ${error.message}`, 'error');
    toast({
      title: 'Processing Error',
      description: error.message,
      status: 'error',
      duration: 5000
    });
  } finally {
    setLoading(false);
  }
};

  const cleanupOutputs = async () => {
    if (!project?.project_id) return;
    
    if (!window.confirm('Are you sure you want to delete all output files?')) return;
    
    try {
      const response = await axios.post(`${API_BASE_URL}/batch/projects/${project.project_id}/batch/cleanup`);
      
      if (response.data.success) {
        addLog(`✓ Cleanup completed: ${response.data.deleted_count} files deleted`, 'success');
        setResults(null);
        setOutputFiles([]);
        await loadBatchStatus();
        
        toast({
          title: 'Cleanup Complete',
          description: `${response.data.deleted_count} files deleted`,
          status: 'success',
          duration: 3000
        });
      } else {
        addLog(`✗ Cleanup failed: ${response.data.error}`, 'error');
      }
    } catch (error) {
      addLog(`✗ Cleanup error: ${error.message}`, 'error');
    }
  };

  const getStatusColor = (ready) => {
    return ready ? 'green' : 'orange';
  };

  const getLogColor = (level) => {
    switch (level) {
      case 'error': return 'red.300';
      case 'success': return 'green.300';
      case 'warning': return 'orange.300';
      default: return 'gray.300';
    }
  };

  const getLogIcon = (level) => {
    switch (level) {
      case 'error': return AlertTriangle;
      case 'success': return CheckCircle;
      case 'warning': return AlertTriangle;
      default: return Info;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeIcon = (type) => {
  switch (type) {
    case 'excel': return FileText;
    case 'json': return CodeIcon;
    case 'csv': return FileText;
    case 'coordinates': return Settings;
    case 'normalized': return FileText;
    default: return File;
  }
};

  const getFileTypeBadge = (type) => {
  switch (type) {
    case 'excel': return { colorScheme: 'green', label: 'Excel' };
    case 'json': return { colorScheme: 'blue', label: 'JSON' };
    case 'csv': return { colorScheme: 'purple', label: 'CSV' };
    case 'coordinates': return { colorScheme: 'orange', label: 'Coords' };
    case 'normalized': return { colorScheme: 'teal', label: 'Normalized' };
    default: return { colorScheme: 'gray', label: 'File' };
  }
};

  return (
    <Box maxW="7xl" mx="auto" p={6}>
      {/* Header */}
      <HStack justify="space-between" mb={6}>
        <HStack>
          <FormControl display="flex" alignItems="center">
            <FormLabel htmlFor="auto-refresh" mb="0" fontSize="sm">
              Auto-refresh
            </FormLabel>
            <Switch
              id="auto-refresh"
              isChecked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              size="sm"
            />
          </FormControl>
          
          <IconButton
            icon={<RefreshCw />}
            onClick={() => {
              loadBatchStatus();
              loadOutputFiles();
            }}
            variant="outline"
            aria-label="Refresh"
          />
        </HStack>
      </HStack>

      {/* Status Overview - Enhanced for template type and DB processing */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 5 }} spacing={4} mb={6}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Template Type</StatLabel>
              <StatNumber>
                <Badge 
                  colorScheme={status?.template_type === 'fixed' ? 'purple' : 'blue'} 
                  size="lg"
                >
                  {status?.template_type === 'fixed' ? 'Fixed Format' : 
                  status?.template_type === 'running' ? 'Running Format' : 'Unknown'}
                </Badge>
              </StatNumber>
              <StatHelpText>
                {status?.template_type === 'fixed' ? 
                  'Vision-based extraction' : 
                  status?.template_type === 'running' ?
                  'Text-based extraction' :
                  'Template type detection failed'
                }
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Batch Processing</StatLabel>
              <StatNumber>
                <Badge colorScheme={batchEnabled ? 'green' : 'red'} size="lg">
                  {batchEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </StatNumber>
              <StatHelpText>
                {status?.template_type === 'fixed' ? 
                  'Uses region coordinates for extraction' :
                  'Uses stored configurations for processing'
                }
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Database Processing</StatLabel>
              <StatNumber>
                <Badge colorScheme={dbProcessingEnabled ? 'green' : 'red'} size="lg">
                  {dbProcessingEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </StatNumber>
              <StatHelpText>
                {dbStatus?.has_schema_config ? 
                  `Table: ${dbStatus.table_name || 'Not configured'}` :
                  'No schema configuration'
                }
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Ready for Batch</StatLabel>
              <StatNumber>
                <Badge colorScheme={getStatusColor(status?.ready_for_batch)} size="lg">
                  {status?.ready_for_batch ? 'Ready' : 'Not Ready'}
                </Badge>
              </StatNumber>
              <StatHelpText>
                {status?.template_type === 'fixed' ? 
                  `Regions: ${status?.regions_count || 0} defined` :
                  `Configuration: ${status?.configuration_complete ? 'Complete' : 'Incomplete'}`
                }
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Input Files</StatLabel>
              <StatNumber>{status?.input_files || 0}</StatNumber>
              <StatHelpText>
                <HStack spacing={1}>
                  <Folder size={2} />
                  <Text fontSize="xs">projects/{project?.project_id}/Input</Text>
                </HStack>
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>
      {/* Progress Bar */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 5 }} spacing={4} mb={6}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Output Files</StatLabel>
              <StatNumber>{status?.output_excel_files || 0}</StatNumber>
              <StatHelpText>
                <Text fontSize="xs" color="gray.500">
                  Excel files ready for DB processing
                </Text>
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>DB Processed</StatLabel>
              <StatNumber>{status?.db_processed_files || 0}</StatNumber>
              <StatHelpText>
                <Text fontSize="xs" color="gray.500">
                  Files processed to database
                </Text>
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              {/* <StatLabel>
                {status?.template_type === 'fixed' ? 'Parameter Regions' : 'Parameter Configs'}
              </StatLabel>
              <StatNumber>
                {status?.template_type === 'fixed' ? 
                  (status?.regions_count || 0) : 
                  (status?.parameter_configs_count || 0)
                }
              </StatNumber> */}
              <StatLabel>Failed Files</StatLabel>
              <StatNumber>{status?.failed_files || 0}</StatNumber>
              <StatHelpText>
                {/* {status?.template_type === 'fixed' ? 
                  (status?.has_coordinate_file ? 
                    'With coordinate transformation' : 
                    'Using original coordinates'
                  ) :
                  'Extracted parameter configurations'
                } */}
                <Text fontSize="xs" color="gray.500">
                  Files with processing errors
                </Text>
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Extraction Method</StatLabel>
              <StatNumber>
                <Badge 
                  colorScheme={status?.template_type === 'fixed' ? 'purple' : 'blue'} 
                  size="sm"
                >
                  {status?.extraction_method || 'Unknown'}
                </Badge>
              </StatNumber>
              <StatHelpText>
                {status?.template_type === 'fixed' ? 
                  'Vision Model' :
                  'Text parsing with regex'
                }
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Database Table</StatLabel>
              <StatNumber>
                <Badge 
                  colorScheme={dbStatus?.table_exists ? 'green' : 'red'} 
                  size="sm"
                >
                  {dbStatus?.table_exists ? 'Ready' : 'Not Found'}
                </Badge>
              </StatNumber>
              <StatHelpText>
                <Text fontSize="xs" color="gray.500">
                  {dbStatus?.table_name || 'No table configured'}
                </Text>
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

      </SimpleGrid>

      {/* Action Buttons - Enhanced for template type */}
      <Card mb={6}>
        <CardHeader>
          <Heading size="md">
            Actions for {status?.template_type === 'fixed' ? 'Fixed Format' : 'Running Format'} Processing
          </Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={3}>
            {/* Row 1: Core Batch Processing */}
            <HStack spacing={3} w="full">
              {!batchEnabled ? (
                <Button
                  leftIcon={<Settings />}
                  onClick={enableBatchProcessing}
                  colorScheme="blue"
                  size="sm"
                  isLoading={loading}
                  loadingText="Enabling..."
                  isDisabled={
                    status?.template_type === 'fixed' ? 
                      (!status?.regions_count || status.regions_count === 0) :
                      !status?.configuration_complete
                  }
                  flex="1"
                >
                  Enable Batch
                </Button>
              ) : (
                <Button
                  leftIcon={<Settings />}
                  onClick={disableBatchProcessing}
                  colorScheme="red"
                  variant="outline"
                  size="sm"
                  isLoading={loading}
                  loadingText="Disabling..."
                  flex="1"
                >
                  Disable Batch
                </Button>
              )}

              <Button
                leftIcon={<Play />}
                onClick={runBatchProcessing}
                colorScheme="green"
                size="sm"
                isLoading={loading}
                loadingText="Processing..."
                isDisabled={!batchEnabled || !status?.ready_for_batch || (status?.input_files || 0) === 0}
                flex="1"
              >
                Run Processing
              </Button>

              <Button
                leftIcon={<Eye />}
                onClick={async () => {
                  try {
                    await loadResults();
                    onResultsOpen();
                  } catch (error) {
                    // Error is already handled in loadResults
                  }
                }}
                colorScheme="purple"
                variant="outline"
                size="sm"
                isDisabled={(status?.output_files || 0) === 0}
                flex="1"
              >
                View Results
              </Button>

              
            </HStack>

            {/* Row 2: Database Processing */}
            <HStack spacing={3} w="full">
              {!dbProcessingEnabled ? (
                <Button
                  leftIcon={<Database />}
                  onClick={enableDbProcessing}
                  colorScheme="cyan"
                  size="sm"
                  isLoading={loading}
                  loadingText="Enabling..."
                  isDisabled={!dbStatus?.has_schema_config || !dbStatus?.table_exists}
                  flex="1"
                >
                  Enable DB
                </Button>
              ) : (
                <Button
                  leftIcon={<Database />}
                  onClick={disableDbProcessing}
                  colorScheme="red"
                  variant="outline"
                  size="sm"
                  isLoading={loading}
                  loadingText="Disabling..."
                  flex="1"
                >
                  Disable DB
                </Button>
              )}

              <Button
                leftIcon={<Upload />}
                onClick={processToDatabase}
                colorScheme="green"
                size="sm"
                isLoading={loading}
                loadingText="Processing..."
                isDisabled={!dbStatus?.ready_for_db_processing}
                flex="1"
              >
                Process to DB
              </Button>
              <Button
                leftIcon={<Database />}
                onClick={async () => {
                  try {
                    await loadDatabaseResults();
                    onDbResultsOpen();
                  } catch (error) {
                    // Error is already handled in loadDatabaseResults
                  }
                }}
                colorScheme="cyan"
                variant="outline"
                size="sm"
                isDisabled={!dbProcessingEnabled || (dbStatus?.db_processed_files || 0) === 0}
                flex="1"
              >
                View DB Data
              </Button>
              
            </HStack>

            {/* Row 3: View Results and Downloads */}
            <HStack spacing={3} w="full">
              
              <Button
                leftIcon={<File />}
                onClick={async () => {
                  await loadOutputFiles();
                  onFilesOpen();
                }}
                colorScheme="orange"
                variant="outline"
                size="sm"
                isDisabled={(status?.output_files || 0) === 0 && (status?.db_processed_files || 0) === 0}
                flex="1"
              >
                Browse Files
              </Button>
              <Button
                leftIcon={<Download />}
                onClick={downloadAllResults}
                colorScheme="teal"
                variant="outline"
                size="sm"
                isLoading={downloadingFile === 'all'}
                loadingText="Downloading..."
                isDisabled={(status?.output_files || 0) === 0 && (status?.db_processed_files || 0) === 0}
                flex="1"
              >
                Download All
              </Button>
              <Button
                leftIcon={<Trash2 />}
                onClick={cleanupOutputs}
                colorScheme="red"
                variant="outline"
                size="sm"
                isDisabled={(status?.output_files || 0) === 0}
                flex="1"
              >
                Cleanup
              </Button>
            </HStack>
          </VStack>
        </CardBody>
      </Card>

      {/* Recommendations - Enhanced for template type */}
      {status && !status.ready_for_batch && (
        <Alert status="warning" mb={6}>
          <AlertIcon />
          <VStack align="start" spacing={2}>
            <Text fontWeight="bold">
              Setup Required for {status.template_type === 'fixed' ? 'Fixed Format' : 'Running Format'} Processing
            </Text>
            <List spacing={1}>
              {status.template_type === 'fixed' ? (
                // Fixed format recommendations
                <>
                  {(!status.regions_count || status.regions_count === 0) && (
                    <ListItem>
                      <ListIcon as={AlertTriangle} color="orange.500" />
                      Define parameter extraction regions for fixed format (currently: {status.regions_count || 0} regions)
                    </ListItem>
                  )}
                  {!status.has_coordinate_file && status.regions_count > 0 && (
                    <ListItem>
                      <ListIcon as={Settings} color="blue.500" />
                      Consider using coordinate transformation file for better accuracy
                    </ListItem>
                  )}
                  {status.regions_count > 0 && (
                    <ListItem>
                      <ListIcon as={CheckCircle} color="green.500" />
                      {status.regions_count} parameter regions configured for vision extraction
                    </ListItem>
                  )}
                </>
              ) : (
                // Running format recommendations
                <>
                  {!status.configuration_complete && (
                    <ListItem>
                      <ListIcon as={AlertTriangle} color="orange.500" />
                      Complete project configuration and parameter extraction
                    </ListItem>
                  )}
                  {status.configuration_complete && (
                    <ListItem>
                      <ListIcon as={CheckCircle} color="green.500" />
                      Configuration completed with {status.sections_count || 0} sections
                    </ListItem>
                  )}
                </>
              )}

              {status.template_type === 'running' && (status.input_files || 0) > 0 && (
                <ListItem>
                  <ListIcon as={Info} color="blue.500" />
                  Running format: Missing parameters are normal - only actual processing errors count as failures
                </ListItem>
              )}
              
              {/* Common recommendations */}
              {!batchEnabled && (
                <ListItem>
                  <ListIcon as={Settings} color="orange.500" />
                  Enable batch processing mode
                </ListItem>
              )}
              {(status.input_files || 0) === 0 && (
                <ListItem>
                  <ListIcon as={Upload} color="orange.500" />
                  Add PDF files to Input directory: projects/{project?.project_id}/Input
                </ListItem>
              )}
              {(status.input_files || 0) > 0 && (
                <ListItem>
                  <ListIcon as={CheckCircle} color="green.500" />
                  {status.input_files} PDF file(s) ready for processing
                </ListItem>
              )}
            </List>
          </VStack>
        </Alert>
      )}

      {/* Progress and Logs */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        {/* Live Logs */}
        <Card>
          <CardHeader>
            <HStack justify="space-between">
              <Heading size="md">Live Activity Log</Heading>
              <Button size="sm" variant="ghost" onClick={() => setLogs([])}>
                Clear
              </Button>
            </HStack>
          </CardHeader>
          <CardBody>
            <Box
              bg="gray.900"
              p={4}
              borderRadius="md"
              maxH="400px"
              overflowY="auto"
              border="1px solid"
              borderColor="gray.600"
            >
              <VStack align="start" spacing={2}>
                {logs.length === 0 ? (
                  <Text color="gray.500" fontSize="sm">No activity yet...</Text>
                ) : (
                  logs.map((log) => {
                    const Icon = getLogIcon(log.level);
                    return (
                      <HStack key={log.id} spacing={2} align="start">
                        <Icon size={12} color={getLogColor(log.level)} />
                        <Text fontSize="xs" color="gray.400" minW="16">
                          [{log.timestamp}]
                        </Text>
                        <Text fontSize="sm" color={getLogColor(log.level)}>
                          {log.message}
                        </Text>
                      </HStack>
                    );
                  })
                )}
                <div ref={logsEndRef} />
              </VStack>
            </Box>
          </CardBody>
        </Card>

        {/* Processing Logs */}
        <Card>
          <CardHeader>
            <HStack justify="space-between">
              <Heading size="md">Processing Output</Heading>
              <IconButton
                icon={showLogs ? <ChevronDown /> : <ChevronRight />}
                size="sm"
                variant="ghost"
                onClick={() => setShowLogs(!showLogs)}
              />
            </HStack>
          </CardHeader>
          <Collapse in={showLogs || processingLogs}>
            <CardBody>
              <Textarea
                value={processingLogs || 'No processing output yet...'}
                readOnly
                fontFamily="mono"
                fontSize="xs"
                minH="200px"
                maxH="400px"
                bg="gray.900"
                color="green.300"
                border="1px solid"
                borderColor="gray.600"
                placeholder="Processing output will appear here..."
              />
            </CardBody>
          </Collapse>
        </Card>
      </SimpleGrid>

      {/* Results Modal - Enhanced for both template types */}
      <Modal isOpen={isResultsOpen} onClose={onResultsClose} size="6xl">
        <ModalOverlay />
        <ModalContent bg="blue.50" maxH="90vh">
          <ModalHeader>
            Processing Results 
            {status?.template_type && (
              <Badge ml={2} colorScheme={status.template_type === 'fixed' ? 'purple' : 'blue'}>
                {status.template_type === 'fixed' ? 'Fixed Format' : 'Running Format'}
              </Badge>
            )}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody overflowY="auto">
            {results ? (
              <VStack spacing={6} align="stretch">
                {/* Summary - Enhanced for template types */}
                <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
                  <Stat>
                    <StatLabel>Total Files</StatLabel>
                    <StatNumber>{results.summary?.total_files || 0}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Parameters Extracted</StatLabel>
                    <StatNumber>{results.summary?.total_parameters || 0}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>
                      {status?.template_type === 'fixed' ? 'Avg Confidence' : 'Table Rows'}
                    </StatLabel>
                    <StatNumber>
                      {status?.template_type === 'fixed' ? 
                        (results.summary?.average_confidence ? `${results.summary.average_confidence}%` : 'N/A') : 
                        (results.summary?.total_tables || 0)
                      }
                    </StatNumber>
                    <StatHelpText>
                      {status?.template_type === 'fixed' ? 
                        `${results.summary?.total_confidence_count || 0} OCR measurements` :
                        'Extracted table data'
                      }
                    </StatHelpText>
                  </Stat>
                  <Stat>
                    <StatLabel>Extraction Method</StatLabel>
                    <StatNumber>
                      <Badge colorScheme={status?.template_type === 'fixed' ? 'purple' : 'blue'} size="sm">
                        {status?.template_type === 'fixed' ? 'OCR' : 'Text'}
                      </Badge>
                    </StatNumber>
                    <StatHelpText>
                      {status?.template_type === 'fixed' ? 
                        'Region-based extraction' :
                        'Pattern-based parsing'
                      }
                    </StatHelpText>
                  </Stat>
                </SimpleGrid>

                <Divider />

                {/* Processed Files Table - Enhanced */}
                {results.results && results.results.length > 0 && (
                  <Box>
                    <HStack justify="space-between" mb={4}>
                      <Heading size="sm">Processed Files</Heading>
                      <HStack>
                        <Badge colorScheme="green">
                          {results.results.filter(r => !r.has_error).length} Success
                        </Badge>
                        <Badge colorScheme="red">
                          {results.results.filter(r => r.has_error).length} Error
                        </Badge>
                        <Button
                          size="sm"
                          leftIcon={<Download />}
                          onClick={downloadAllResults}
                          colorScheme="teal"
                          isLoading={downloadingFile === 'all'}
                        >
                          Download All
                        </Button>
                      </HStack>
                    </HStack>
                    <TableContainer>
                      <Table size="sm">
                        <Thead>
                          <Tr>
                            <Th>Filename</Th>
                            <Th>Template</Th>
                            <Th>Parameters</Th>
                            {status?.template_type !== 'fixed' && <Th>Tables</Th>}
                            <Th>Method</Th>
                            <Th>{status?.template_type === 'fixed' ? 'Avg Confidence' : 'Process Success'}</Th>
                            <Th>Extraction Rate</Th>
                            <Th>Processed At</Th>
                            <Th>Status</Th>
                            <Th>Error</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {results.results.slice(0, 10).map((result, index) => (
                            <Tr key={index}>
                              <Td color="gray.800" fontWeight="medium">{result.filename}</Td>
                              <Td>
                                <Badge 
                                  size="sm" 
                                  colorScheme={result.template_type === 'fixed' ? 'purple' : 'blue'}
                                >
                                  {result.template_type === 'fixed' ? 'Fixed' : 'Running'}
                                </Badge>
                              </Td>
                              <Td color="gray.800">{result.parameters_count}</Td>
                              {status?.template_type !== 'fixed' && (
                                <Td color="gray.800">{result.tables_count || 0}</Td>
                              )}
                              <Td>
                                <Badge size="xs" colorScheme="gray">
                                  {result.extraction_method || 'Unknown'}
                                </Badge>
                              </Td>
                              <Td color="gray.800">
                                {/* Show confidence for fixed format, process success for running format */}
                                <Text fontWeight="medium">
                                  {status?.template_type === 'fixed' ? 
                                    (result.average_confidence ? `${result.average_confidence}%` : 'N/A') :
                                    (result.success_rate ? `${result.success_rate}%` : 'N/A')
                                  }
                                </Text>
                                <Text fontSize="xs" color="gray.500">
                                  {status?.template_type === 'fixed' ? 
                                    `${result.confidence_count || 0} measurements` :
                                    `${result.failed_extractions || 0} errors`
                                  }
                                </Text>
                              </Td>
                              <Td color="gray.800">
                                {/* Show extraction completion rate */}
                                {result.successful_extractions !== undefined && 
                                (result.successful_extractions + result.failed_extractions) > 0 ? 
                                  `${Math.round((result.successful_extractions / (result.successful_extractions + result.failed_extractions)) * 100)}%` :
                                  'N/A'
                                }
                                <Text fontSize="xs" color="gray.500">
                                  ({result.successful_extractions || 0}/{(result.successful_extractions || 0) + (result.failed_extractions || 0)})
                                </Text>
                              </Td>
                              <Td fontSize="xs" color="gray.600">
                                {new Date(result.processed_at).toLocaleString()}
                              </Td>
                              <Td>
                                <Badge colorScheme={result.has_error ? 'red' : 'green'}>
                                  {result.has_error ? 'Error' : 'Success'}
                                </Badge>
                              </Td>
                              <Td maxW="200px">
                                {result.has_error ? (
                                  <Tooltip
                                    label={<Text whiteSpace="pre-wrap">{result.error || 'Unknown error'}</Text>}
                                    placement="top-start"
                                    hasArrow
                                  >
                                    <Text fontSize="xs" color="red.600" noOfLines={2}>
                                      {result.error || 'Unknown error'}
                                    </Text>
                                  </Tooltip>
                                ) : ''}
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </TableContainer>
                    
                    {/* Show extraction details based on template type */}
                    {results.results.length > 0 && (
                      <Box mt={4} p={4} bg={status?.template_type === 'fixed' ? 'purple.50' : 'blue.50'} borderRadius="md">
                        <Text fontSize="sm" color={status?.template_type === 'fixed' ? 'purple.700' : 'blue.700'} fontWeight="medium" mb={2}>
                          {status?.template_type === 'fixed' ? 'Fixed Format Extraction Details:' : 'Running Format Extraction Details:'}
                        </Text>
                        <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
                          {status?.template_type === 'fixed' ? (
                            // Fixed format details
                            <>
                              <Box>
                                <Text fontSize="xs" color="gray.600">Overall Avg Confidence</Text>
                                <Text fontSize="sm" fontWeight="medium" color="purple.700">
                                  {results.summary?.average_confidence ? 
                                    `${results.summary.average_confidence}%` : 
                                    'N/A'
                                  }
                                </Text>
                                <Text fontSize="xs" color="gray.500">
                                  {results.summary?.total_confidence_count || 0} measurements
                                </Text>
                              </Box>
                              <Box>
                                <Text fontSize="xs" color="gray.600">Success Rate</Text>
                                <Text fontSize="sm" fontWeight="medium">
                                  {results.summary?.overall_success_rate ? `${results.summary.overall_success_rate}%` : 'N/A'}
                                </Text>
                                <Text fontSize="xs" color="gray.500">
                                  Extraction completion
                                </Text>
                              </Box>
                              <Box>
                                <Text fontSize="xs" color="gray.600">Total Regions</Text>
                                <Text fontSize="sm" fontWeight="medium">
                                  {results.summary?.total_parameters || 0}
                                </Text>
                                <Text fontSize="xs" color="gray.500">
                                  Across all files
                                </Text>
                              </Box>
                              <Box>
                                <Text fontSize="xs" color="gray.600">Extraction Speed</Text>
                                <Text fontSize="sm" fontWeight="medium">
                                  ~{Math.round((results.summary?.total_parameters || 0) / Math.max(results.results.length, 1))} params/file
                                </Text>
                                <Text fontSize="xs" color="gray.500">
                                  Average per file
                                </Text>
                              </Box>
                            </>
                          ) : (
                            // Running format details
                            <>
                            <Box>
                              <Text fontSize="xs" color="gray.600">Extraction Success Rate</Text>
                              <Text fontSize="sm" fontWeight="medium" color="blue.700">
                                {results.summary?.overall_success_rate ? 
                                  `${results.summary.overall_success_rate}%` : 
                                  'N/A'
                                }
                              </Text>
                              <Text fontSize="xs" color="gray.500">
                                Process completion rate
                              </Text>
                            </Box>
                            <Box>
                              <Text fontSize="xs" color="gray.600">Parameters Processed</Text>
                              <Text fontSize="sm" fontWeight="medium">
                                {results.summary?.total_parameters || 0}
                              </Text>
                              <Text fontSize="xs" color="gray.500">
                                Extraction attempts
                              </Text>
                            </Box>
                            <Box>
                              <Text fontSize="xs" color="gray.600">Actual Errors</Text>
                              <Text fontSize="sm" fontWeight="medium" color={
                                (results.summary?.total_failed || 0) === 0 ? 'green.600' : 'red.600'
                              }>
                                {results.summary?.total_failed || 0}
                              </Text>
                              <Text fontSize="xs" color="gray.500">
                                Processing failures
                              </Text>
                            </Box>
                            <Box>
                              <Text fontSize="xs" color="gray.600">Table Data</Text>
                              <Text fontSize="sm" fontWeight="medium">
                                {results.summary?.total_tables || 0} rows
                              </Text>
                              <Text fontSize="xs" color="gray.500">
                                Structured data extracted
                              </Text>
                            </Box>
                          </>
                          )}
                        </SimpleGrid>
                        
                        {/* Success analysis */}
                        <Box mt={3} p={3} bg="white" borderRadius="md" border="1px" borderColor={status?.template_type === 'fixed' ? 'purple.200' : 'blue.200'}>
                          <Text fontSize="xs" color={status?.template_type === 'fixed' ? 'purple.600' : 'blue.600'} fontWeight="medium" mb={1}>
                            Performance Analysis:
                          </Text>
                          <HStack spacing={4}>
                            <Text fontSize="xs" color="gray.600">
                              Success Rate: <strong>{results.summary?.overall_success_rate || 0}%</strong>
                            </Text>
                            {status?.template_type === 'running' ? (
                              <>
                                <Text fontSize="xs" color="gray.600">
                                  Parameters Processed: <strong>{results.summary?.total_parameters || 0}</strong>
                                </Text>
                                <Text fontSize="xs" color="gray.600">
                                  Actual Errors: <strong>{results.summary?.total_failed || 0}</strong>
                                </Text>
                                {(results.summary?.total_failed || 0) === 0 && (
                                  <Text fontSize="xs" color="green.600" fontWeight="medium">
                                    No processing errors detected
                                  </Text>
                                )}
                              </>
                            ) : (
                              <>
                                <Text fontSize="xs" color="gray.600">
                                  Total Extractions: <strong>{(results.summary?.total_successful || 0) + (results.summary?.total_failed || 0)}</strong>
                                </Text>
                                {results.summary?.average_confidence && (
                                  <Text fontSize="xs" color="gray.600">
                                    Backend calculated: <strong>{results.summary.average_confidence}%</strong> confidence
                                  </Text>
                                )}
                              </>
                            )}
                            <Badge size="sm" colorScheme={
                              (results.summary?.overall_success_rate || 0) >= 99 ? 'green' : 
                              (results.summary?.overall_success_rate || 0) >= 95 ? 'yellow' : 'red'
                            }>
                              {(results.summary?.overall_success_rate || 0) >= 99 ? 'Excellent' : 
                              (results.summary?.overall_success_rate || 0) >= 95 ? 'Good' : 'Has Errors'}
                            </Badge>
                          </HStack>
                        </Box>

                      </Box>
                    )}
                  </Box>
                )}
              </VStack>
            ) : (
              <Box textAlign="center" py={8}>
                <Spinner size="lg" />
                <Text mt={4}>Loading results...</Text>
              </Box>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onResultsClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      {/* Database Results Modal */}
      <Modal isOpen={isDbResultsOpen} onClose={onDbResultsClose} size="6xl">
        <ModalOverlay />
        <ModalContent bg="cyan.50" maxH="90vh">
          <ModalHeader>
            Database Results
            <Badge ml={2} colorScheme="cyan">
              {dbStatus?.table_name || 'Database'}
            </Badge>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody overflowY="auto">
            {dbResults ? (
              <VStack spacing={6} align="stretch">
                {/* Database Summary */}
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                  <Stat>
                    <StatLabel>Total Records</StatLabel>
                    <StatNumber>{dbResults.total_records || 0}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Records Shown</StatLabel>
                    <StatNumber>{dbResults.records_returned || 0}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Table</StatLabel>
                    <StatNumber>
                      <Badge colorScheme="cyan" size="sm">
                        {dbResults.table_name}
                      </Badge>
                    </StatNumber>
                  </Stat>
                </SimpleGrid>

                <Divider />

                {/* Database Records Table */}
                {dbResults.records && dbResults.records.length > 0 && (
                  <Box>
                    <HStack justify="space-between" mb={4}>
                      <Heading size="sm">Recent Database Records</Heading>
                      <Text fontSize="sm" color="gray.500">
                        Showing latest {dbResults.records_returned} of {dbResults.total_records} records
                      </Text>
                    </HStack>
                    <TableContainer>
                      <Table size="sm">
                        <Thead>
                          <Tr>
                            <Th>ID</Th>
                            <Th>File ID</Th>
                            <Th>Processed At</Th>
                            {/* Dynamic columns based on first record */}
                            {dbResults.records[0] && Object.keys(dbResults.records[0])
                              .filter(key => !['id', 'projectid', 'fileid', 'processed_at'].includes(key))
                              .slice(0, 5)
                              .map(key => (
                                <Th key={key}>{key.charAt(0).toUpperCase() + key.slice(1)}</Th>
                              ))
                            }
                          </Tr>
                        </Thead>
                        <Tbody>
                          {dbResults.records.slice(0, 20).map((record, index) => (
                            <Tr key={index}>
                              <Td color="gray.800" fontWeight="medium">{record.id}</Td>
                              <Td color="gray.800">{record.fileid}</Td>
                              <Td fontSize="xs" color="gray.600">
                                {record.processed_at ? new Date(record.processed_at).toLocaleString() : 'N/A'}
                              </Td>
                              {/* Dynamic data columns */}
                              {Object.keys(record)
                                .filter(key => !['id', 'projectid', 'fileid', 'processed_at'].includes(key))
                                .slice(0, 5)
                                .map(key => (
                                  <Td key={key} color="gray.800" maxW="200px">
                                    <Text isTruncated>
                                      {record[key] ? String(record[key]).substring(0, 50) : '-'}
                                    </Text>
                                  </Td>
                                ))
                              }
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}

                {(!dbResults.records || dbResults.records.length === 0) && (
                  <Box textAlign="center" py={8}>
                    <Text color="gray.500">No database records found</Text>
                  </Box>
                )}
              </VStack>
            ) : (
              <Box textAlign="center" py={8}>
                <Spinner size="lg" />
                <Text mt={4}>Loading database results...</Text>
              </Box>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onDbResultsClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      {/* Files Browser Modal - Enhanced for template types */}
      <Modal isOpen={isFilesOpen} onClose={onFilesClose} size="5xl">
        <ModalOverlay />
        <ModalContent bg="green.50" maxH="90vh">
          <ModalHeader>
            Output Files
            {status?.template_type && (
              <Badge ml={2} colorScheme={status.template_type === 'fixed' ? 'purple' : 'blue'}>
                {status.template_type === 'fixed' ? 'Fixed Format' : 'Running Format'}
              </Badge>
            )}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody overflowY="auto">
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between">
                <VStack align="start" spacing={0}>
                  <Text color="gray.600" fontSize="sm">
                    {outputFiles.length} files in output directory
                  </Text>
                </VStack>
                <HStack>
                  <Button
                    size="sm"
                    leftIcon={<RefreshCw />}
                    onClick={loadOutputFiles}
                    variant="outline"
                  >
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    leftIcon={<Download />}
                    onClick={downloadAllResults}
                    colorScheme="teal"
                    isLoading={downloadingFile === 'all'}
                  >
                    Download All
                  </Button>
                </HStack>
              </HStack>

              {outputFiles.length > 0 ? (
                <TableContainer>
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>File</Th>
                        <Th>Type</Th>
                        <Th>Description</Th>
                        <Th>Size</Th>
                        <Th>Modified</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {outputFiles.map((file, index) => {
                        const FileIcon = getFileTypeIcon(file.type);
                        const typeBadge = getFileTypeBadge(file.type);
                        
                        // Enhanced file descriptions for fixed format
                        let fileDescription = '';
                        if (status?.template_type === 'fixed') {
                          if (file.filename.includes('_dynamic_normalized')) {
                            fileDescription = 'Dynamic normalization';
                          } else if (file.filename.includes('_coordinates')) {
                            fileDescription = 'Region coordinates';
                          } else if (file.filename.endsWith('.xlsx')) {
                            fileDescription = 'Parameters (main sheet + metadata)';
                          } else if (file.filename.endsWith('.json')) {
                            fileDescription = 'Complete extraction results';
                          }
                        } else {
                          if (file.filename.endsWith('.xlsx')) {
                            fileDescription = 'Extracted data';
                          } else if (file.filename.endsWith('.json')) {
                            fileDescription = 'Processing results';
                          }
                        }
                        
                        return (
                          <Tr key={index}>
                            <Td>
                              <HStack spacing={2}>
                                <FileIcon size={16} />
                                <Text fontSize="sm">{file.filename}</Text>
                              </HStack>
                            </Td>
                            <Td>
                              <Badge colorScheme={typeBadge.colorScheme} size="sm">
                                {typeBadge.label}
                              </Badge>
                            </Td>
                            <Td>
                              <Text fontSize="xs" color="gray.600">
                                {fileDescription}
                              </Text>
                            </Td>
                            <Td fontSize="sm">{formatFileSize(file.size)}</Td>
                            <Td fontSize="sm">
                              {new Date(file.modified).toLocaleString()}
                            </Td>
                            <Td>
                              <Button
                                size="xs"
                                leftIcon={<Download />}
                                onClick={() => downloadSingleFile(file.filename)}
                                colorScheme="blue"
                                variant="outline"
                                isLoading={downloadingFile === file.filename}
                                loadingText="..."
                              >
                                Download
                              </Button>
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </TableContainer>
              ) : (
                <Box textAlign="center" py={8}>
                  <Text color="gray.500">No output files found</Text>
                </Box>
              )}
              
              {/* File Structure Information for Fixed Format */}
              {status?.template_type === 'fixed' && outputFiles.length > 0 && (
                <Box mt={4} p={4} bg="purple.50" borderRadius="md">
                  <Text fontSize="sm" color="purple.700" fontWeight="medium" mb={2}>
                    Fixed Format File Structure:
                  </Text>
                  <VStack align="start" spacing={1}>
                    <Text fontSize="xs" color="gray.600">
                      • <strong>*.xlsx</strong> - Main file  (Extracted_Data sheet) + metadata (Metadata_Details sheet)
                    </Text>
                    <Text fontSize="xs" color="gray.600">
                      • <strong>*.json</strong> - Complete processing results with all extraction details
                    </Text>
                  </VStack>
                </Box>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onFilesClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Bottom Actions */}
      <HStack justify="space-between" mt={8}>
        <Button leftIcon={<ArrowLeft />} variant="outline" colorScheme="blue" onClick={onBack}>
          Back to Projects
        </Button>
        
        {status?.ready_for_batch && batchEnabled && (status?.output_files || 0) > 0 && (
          <Button rightIcon={<CheckCircle />} colorScheme="green" onClick={onComplete}>
            Complete Batch Processing
          </Button>
        )}
      </HStack>
    </Box>
  );
};

export default BatchProcessing;