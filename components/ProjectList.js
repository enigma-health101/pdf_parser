// components/ProjectList.js - Enhanced with Schema Mapping Action
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  IconButton,
  Text,
  Flex,
  HStack,
  VStack,
  useColorModeValue,
  Spinner,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  Progress,
  Tooltip,
  Collapse,
  useDisclosure,
  SimpleGrid,
  TableContainer
} from '@chakra-ui/react';
import { 
  Plus as AddIcon, 
  Play, 
  Edit, 
  Trash2, 
  Calendar, 
  Folder,
  Clock,
  Settings,
  Eye,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock as ClockIcon,
  Upload,
  Settings as SettingsIcon,
  FileText,
  Layers,
  Database,
  Download,
  Activity 
} from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://pdf-api.enigmahealth.io/api';
console.log('API_BASE_URL:', API_BASE_URL);

// Enhanced status helper functions
const getStatusColor = (progressPercentage, stage) => {
  if (stage === 'error') return 'red';
  
  if (progressPercentage === 0) return 'gray';
  else if (progressPercentage < 30) return 'blue';
  else if (progressPercentage < 80) return 'orange';
  else if (progressPercentage < 100) return 'purple';
  else return 'green';
};

const getStatusIcon = (progressPercentage, stage) => {
  if (stage === 'error') return AlertTriangle;
  
  if (progressPercentage === 0) return Upload;
  else if (progressPercentage < 30) return Upload;
  else if (progressPercentage < 80) return SettingsIcon;
  else if (progressPercentage < 100) return ClockIcon;
  else return CheckCircle;
};

const getProgressBarColor = (progressPercentage) => {
  if (progressPercentage === 0) return 'gray';
  else if (progressPercentage < 30) return 'blue';
  else if (progressPercentage < 80) return 'orange';
  else if (progressPercentage < 100) return 'purple';
  else return 'green';
};

// Map progress percentage to simplified status labels
const getStatusLabel = (progressPercentage) => {
  if (progressPercentage <= 10) return 'Draft';
  if (progressPercentage >= 100) return 'Active';
  return 'In Config';
};

// File counts display component
const FileCountsDisplay = ({ fileCounts }) => {
  const counts = [
    { label: 'PDFs', count: fileCounts?.pdf_files || 0, icon: FileText, color: 'blue' },
    { label: 'Sections', count: fileCounts?.section_configs || 0, icon: Layers, color: 'green' },
    { label: 'Params', count: fileCounts?.param_total || 0, icon: Database, color: 'purple' },
    { label: 'Processed', count: fileCounts?.processed_files || 0, icon: Download, color: 'orange' }
  ];

  return (
    <SimpleGrid columns={2} spacing={2} w="120px">
      {counts.map(({ label, count, icon: Icon, color }) => (
        <Tooltip key={label} label={`${count} ${label.toLowerCase()}`} placement="top">
          <Box 
            bg="gray.700" 
            p={1.5} 
            borderRadius="md" 
            textAlign="center"
            border="1px solid"
            borderColor="gray.600"
            minH="40px"
            display="flex"
            flexDirection="column"
            justifyContent="center"
          >
            <HStack spacing={1} justify="center">
              <Icon size={10} color={count > 0 ? `var(--chakra-colors-${color}-400)` : '#9CA3AF'} />
              <Text fontSize="xs" color={count > 0 ? 'white' : 'gray.400'} fontWeight="medium">
                {count}
              </Text>
            </HStack>
            <Text fontSize="2xs" color="gray.500" lineHeight="1">
              {label}
            </Text>
          </Box>
        </Tooltip>
      ))}
    </SimpleGrid>
  );
};

// Progress Status Component
const ProjectProgressStatus = ({ project, onRefresh }) => {
  const [statusDetails, setStatusDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const { isOpen, onToggle } = useDisclosure();

  const loadStatusDetails = async () => {
    if (!project.project_id || loading) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/projects/${project.project_id}/status`);
      setStatusDetails(response.data);
    } catch (error) {
      console.error('Error loading status details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !statusDetails) {
      loadStatusDetails();
    }
  }, [isOpen, project.project_id]);

  const StatusIcon = getStatusIcon(project.progress_percentage || 0, project.stage);
  const progressColor = getProgressBarColor(project.progress_percentage || 0);
  const statusColor = getStatusColor(project.progress_percentage || 0, project.stage);
  const statusLabel = getStatusLabel(project.progress_percentage || 0);

  return (
    <VStack align="start" spacing={2} w="full">
      {/* Main Status Display */}
      <HStack spacing={2} w="full">
        <StatusIcon size={14} />
        <VStack align="start" spacing={1} flex="1" minW="0">
          <HStack spacing={2} w="full" justify="space-between">
            <Badge
              colorScheme={statusColor}
              px={2}
              py={1}
              borderRadius="full"
              fontSize="sm"
            >
              {statusLabel}
            </Badge>
            <Text fontSize="sm" fontWeight="bold" color="white">
              {project.progress_percentage || 0}%
            </Text>
          </HStack>
          <Progress 
            value={project.progress_percentage || 0} 
            size="sm" 
            colorScheme={progressColor}
            w="full"
            borderRadius="md"
            bg="gray.600"
            hasStripe={project.stage === 'processing'}
            isAnimated={project.stage === 'processing'}
          />
        </VStack>
        <IconButton
          icon={isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          size="xs"
          variant="ghost"
          onClick={onToggle}
          color="gray.400"
          _hover={{ color: 'white', bg: 'gray.600' }}
        />
      </HStack>

      {/* Detailed Status Information */}
      <Collapse in={isOpen} animateOpacity>
        <Box 
          bg="gray.700" 
          p={3} 
          borderRadius="md" 
          border="1px solid" 
          borderColor="gray.600"
          w="full"
          mt={2}
        >
          {loading ? (
            <HStack spacing={2}>
              <Spinner size="sm" />
              <Text fontSize="sm" color="gray.400">Loading...</Text>
            </HStack>
          ) : statusDetails ? (
            <VStack align="start" spacing={3}>
              {/* File Summary */}
              <Box w="full">
                <Text fontSize="sm" fontWeight="semibold" color="gray.300" mb={2}>
                  Project Files
                </Text>
                <FileCountsDisplay fileCounts={statusDetails.file_counts} />
              </Box>

              {/* Current Capabilities */}
              {statusDetails.capabilities && statusDetails.capabilities.length > 0 && (
                <Box w="full">
                  <Text fontSize="sm" fontWeight="semibold" color="gray.300" mb={2}>
                    Available Actions
                  </Text>
                  <VStack align="start" spacing={1}>
                    {statusDetails.capabilities.map((capability, index) => (
                      <HStack key={index} spacing={2}>
                        <CheckCircle size={10} color="var(--chakra-colors-green-400)" />
                        <Text fontSize="xs" color="gray.400">
                          {capability}
                        </Text>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              )}

              {/* Last Updated */}
              <Box w="full" pt={2} borderTop="1px solid" borderColor="gray.600">
                <Text fontSize="xs" color="gray.500">
                  Last updated: {new Date(statusDetails.last_modified).toLocaleString()}
                </Text>
              </Box>
            </VStack>
          ) : (
            <Text fontSize="sm" color="gray.400">
              Click to load status details
            </Text>
          )}
        </Box>
      </Collapse>
    </VStack>
  );
};

// Project Form Component (keeping the existing one)
const ProjectForm = ({ project, mode, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    projectId: project?.project_id || '',
    description: project?.description || '',
    scheduleType: project?.scheduleType || 'manual',
    scheduleTime: project?.scheduleTime || ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = mode === 'edit';

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.projectId.trim()) {
      newErrors.projectId = 'Project ID is required';
    } else if (!/^[a-zA-Z0-9-_]+$/.test(formData.projectId)) {
      newErrors.projectId = 'Project ID can only contain letters, numbers, hyphens, and underscores';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.scheduleType !== 'manual' && !formData.scheduleTime) {
      newErrors.scheduleTime = 'Schedule time is required for automated processing';
    }

    if (formData.scheduleTime && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(formData.scheduleTime)) {
      newErrors.scheduleTime = 'Schedule time must be in HH:MM format (24-hour)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate folder paths for display
  const inputFolder = formData.projectId ? `../backend/projects/${formData.projectId}/Input` : '';
  const outputFolder = formData.projectId ? `../backend/projects/${formData.projectId}/Output` : '';

  return (
    <Box 
      bg="gray.50" 
      minH="100vh" 
      p={8}
      bgGradient="linear(to-br, gray.50, blue.50)"
    >
      <Box 
        maxW="4xl" 
        mx="auto" 
        bg="white" 
        borderRadius="xl" 
        boxShadow="xl"
        overflow="hidden"
      >
        {/* Header */}
        <Box 
          bg={isEditMode ? "orange.500" : "blue.500"} 
          color="white" 
          p={6}
        >
          <HStack spacing={3}>
            {isEditMode ? <Edit size={28} /> : <AddIcon size={28} />}
            <VStack align="start" spacing={1}>
              <Text fontSize="2xl" fontWeight="bold">
                {isEditMode ? 'Edit Project' : 'Create New Project'}
              </Text>
              <Text fontSize="md" opacity={0.9}>
                {isEditMode ? 'Update project details and settings' : 'Set up a new PDF extraction project'}
              </Text>
            </VStack>
          </HStack>
        </Box>

        <Box p={8}>
          <form onSubmit={handleSubmit}>
            <VStack spacing={6} align="stretch">
              <FormControl isInvalid={!!errors.projectId}>
                <FormLabel color="gray.700" fontWeight="semibold">
                  Project ID *
                </FormLabel>
                <Input
                  value={formData.projectId}
                  onChange={(e) => handleInputChange('projectId', e.target.value)}
                  placeholder="e.g., medical-reports-2024"
                  isDisabled={isEditMode}
                  bg={isEditMode ? 'gray.100' : 'white'}
                  border="2px solid"
                  borderColor={isEditMode ? 'gray.300' : 'gray.200'}
                  _hover={{ borderColor: isEditMode ? 'gray.300' : 'blue.300' }}
                  _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px rgba(66, 153, 225, 0.6)' }}
                  size="lg"
                  color="gray.800"
                />
                {errors.projectId && (
                  <Text color="red.500" fontSize="sm" mt={2} fontWeight="medium">
                    {errors.projectId}
                  </Text>
                )}
              </FormControl>

              <FormControl isInvalid={!!errors.description}>
                <FormLabel color="gray.700" fontWeight="semibold">
                  Description *
                </FormLabel>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe what this project will process..."
                  rows={4}
                  bg="white"
                  border="2px solid"
                  borderColor="gray.200"
                  _hover={{ borderColor: 'blue.300' }}
                  _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px rgba(66, 153, 225, 0.6)' }}
                  resize="vertical"
                  color="gray.800"
                />
                {errors.description && (
                  <Text color="red.500" fontSize="sm" mt={2} fontWeight="medium">
                    {errors.description}
                  </Text>
                )}
              </FormControl>

              <HStack spacing={4} mt={8} pt={6} borderTop="1px solid" borderColor="gray.200">
                <Button
                  variant="outline"
                  onClick={onCancel}
                  flex="1"
                  size="lg"
                  colorScheme="gray"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  colorScheme={isEditMode ? "orange" : "blue"}
                  isLoading={isSubmitting}
                  loadingText={isEditMode ? "Updating..." : "Creating..."}
                  flex="1"
                  size="lg"
                >
                  {isEditMode ? "Update Project" : "Create Project"}
                </Button>
              </HStack>
            </VStack>
          </form>
        </Box>
      </Box>
    </Box>
  );
};

const ProjectList = ({ masterProjectId, onCreateProject, onSelectProject, onViewResults, onSchemaMapping, onBatchProcessing }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  useEffect(() => {
    loadProjects();
  }, [masterProjectId]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      console.log('Loading projects from:', `${API_BASE_URL}/projects`);
      
      // const response = await axios.get(`${API_BASE_URL}/projects`);
      const response = await axios.get(`${API_BASE_URL}/projects`, {
        params: { masterProjectId }
      });
      console.log('Projects loaded:', response.data);
      
      setProjects(response.data.projects || []);
      setError(null);
    } catch (err) {
      console.error('Error loading projects:', err);
      
      if (err.response) {
        setError(`Server error: ${err.response.data?.error || err.response.status}`);
      } else if (err.request) {
        setError('Unable to connect to server. Please check if the backend is running.');
      } else {
        setError('An unexpected error occurred');
      }
      
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDeleteProject = async (projectId) => {
    if (window.confirm(`Are you sure you want to delete project "${projectId}"?`)) {
      try {
        await axios.delete(`${API_BASE_URL}/projects/${projectId}`);
        await loadProjects();
      } catch (err) {
        console.error('Error deleting project:', err);
        if (err.response?.data?.error) {
          alert(`Failed to delete project: ${err.response.data.error}`);
        } else {
          alert('Failed to delete project');
        }
      }
    }
  };
  const handleBatchProcessing = (project, e) => {
    e.stopPropagation();
    if (onBatchProcessing) {
      onBatchProcessing(project);
    }
  };
  const handleRunProject = async (projectId) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/projects/${projectId}/run`);
      console.log('Project run response:', response.data);
      await loadProjects();
    } catch (err) {
      console.error('Error running project:', err);
      
      if (err.response?.data?.error) {
        alert(`Failed to run project: ${err.response.data.error}`);
      } else {
        alert('Failed to run project');
      }
    }
  };

  const handleEditProject = (project, e) => {
    e.stopPropagation();
    setEditingProject(project);
    setShowEditForm(true);
    setShowCreateForm(false);
  };

  const handleCreateNew = () => {
    setShowCreateForm(true);
    setShowEditForm(false);
    setEditingProject(null);
  };

  const handleCancelForm = () => {
    setShowCreateForm(false);
    setShowEditForm(false);
    setEditingProject(null);
  };

  const handleConfigureProject = (project, e) => {
    e.stopPropagation();
    onSelectProject(project);
  };

  const handleViewResults = (project, e) => {
    e.stopPropagation();
    if (onViewResults) {
      onViewResults(project);
    }
  };

  // NEW: Handle schema mapping
  const handleSchemaMapping = (project, e) => {
    e.stopPropagation();
    if (onSchemaMapping) {
      onSchemaMapping(project);
    }
  };

  const handleCreateProject = async (projectData) => {
    try {
      await axios.post(`${API_BASE_URL}/projects`, {
        projectId: projectData.projectId,
        description: projectData.description,
        scheduleType: projectData.scheduleType,
        scheduleTime: projectData.scheduleTime,
        masterProjectId
      });
      
      await loadProjects();
      setShowCreateForm(false);
      
      if (onCreateProject) {
        onCreateProject(projectData);
      }
    } catch (err) {
      console.error('Error creating project:', err);
      if (err.response?.data?.error) {
        alert(`Failed to create project: ${err.response.data.error}`);
      } else {
        alert('Failed to create project');
      }
    }
  };

  const handleUpdateProject = async (updatedProject) => {
    try {
      await axios.put(`${API_BASE_URL}/projects/${updatedProject.projectId}`, {
        description: updatedProject.description,
        scheduleType: updatedProject.scheduleType,
        scheduleTime: updatedProject.scheduleTime
      });
      
      await loadProjects();
      setShowEditForm(false);
      setEditingProject(null);
    } catch (err) {
      console.error('Error updating project:', err);
      if (err.response?.data?.error) {
        alert(`Failed to update project: ${err.response.data.error}`);
      } else {
        alert('Failed to update project');
      }
    }
  };

  if (loading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="lg" color="blue.500" />
        <Text mt={4} color="gray.300">Loading projects...</Text>
      </Box>
    );
  }

  return (
    <Box>
      {(showCreateForm || showEditForm) ? (
        <ProjectForm 
          project={editingProject}
          mode={showCreateForm ? 'create' : 'edit'}
          onSubmit={showCreateForm ? handleCreateProject : handleUpdateProject}
          onCancel={handleCancelForm}
        />
      ) : (
        <>
          <Flex justify="space-between" align="center" mb={6}>
            <Button
              leftIcon={<AddIcon />}
              colorScheme="blue"
              onClick={handleCreateNew}
            >
              Create New Project
            </Button>
          </Flex>

          {error && (
            <Box bg="red.900/20" border="1px solid" borderColor="red.500" borderRadius="md" p={4} mb={4}>
              <Text color="red.300">{error}</Text>
            </Box>
          )}

          {projects.length === 0 ? (
            <VStack spacing={4} py={12} textAlign="center">
              <Text fontSize="lg" color="gray.400">
                No projects yet
              </Text>
              <Text color="gray.500">
                Create your first project to start extracting data from PDFs
              </Text>
              <Button
                leftIcon={<AddIcon />}
                colorScheme="blue"
                size="lg"
                onClick={handleCreateNew}
              >
                Create Your First Project
              </Button>
            </VStack>
          ) : (
            /* Enhanced Table Container with Frozen Header */
            <Box 
              bg="gray.800" 
              borderRadius="lg" 
              overflow="hidden"
              position="relative"
              maxH="calc(100vh - 250px)" // Adjust based on your layout
            >
              <TableContainer
                overflowY="auto"
                position="relative"
                maxH="inherit"
              >
                <Table variant="simple" size="md">
                  {/* Frozen Header */}
                  <Thead 
                    bg="gray.700" 
                    position="sticky" 
                    top={0} 
                    zIndex={2}
                    boxShadow="0 2px 4px rgba(0,0,0,0.1)"
                  >
                    <Tr>
                      <Th 
                        color="gray.300" 
                        fontSize="sm"
                        fontWeight="bold"
                        w="300px"
                        minW="300px"
                        maxW="300px"
                        py={4}
                      >
                        Project Details
                      </Th>
                      <Th 
                        color="gray.300" 
                        fontSize="sm"
                        fontWeight="bold"
                        w="250px"
                        minW="250px"
                        maxW="250px"
                        py={4}
                      >
                        Status & Progress
                      </Th>
                      <Th 
                        color="gray.300" 
                        fontSize="sm"
                        fontWeight="bold"
                        w="140px"
                        minW="140px"
                        maxW="140px"
                        py={4}
                      >
                        Files
                      </Th>
                      <Th 
                        color="gray.300" 
                        fontSize="sm"
                        fontWeight="bold"
                        w="120px"
                        minW="120px"
                        maxW="120px"
                        py={4}
                      >
                        Schedule
                      </Th>
                      <Th 
                        color="gray.300" 
                        fontSize="sm"
                        fontWeight="bold"
                        w="140px"
                        minW="140px"
                        maxW="140px"
                        py={4}
                      >
                        Last Modified
                      </Th>
                      <Th 
                        color="gray.300" 
                        fontSize="sm"
                        fontWeight="bold"
                        w="260px"
                        minW="260px"
                        maxW="260px"
                        py={4}
                      >
                        Actions
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {projects.map((project) => (
                      <Tr 
                        key={project.project_id}
                        _hover={{ bg: 'gray.700' }}
                        borderBottom="1px solid"
                        borderColor="gray.600"
                      >
                        <Td py={4} w="300px" minW="300px" maxW="300px">
                          <VStack align="start" spacing={2}>
                            <Text fontWeight="medium" color="white" fontSize="sm" noOfLines={1}>
                              {project.project_id}
                            </Text>
                            <Text
                              fontSize="xs"
                              color="gray.400"
                              lineHeight="1.3"
                              wordBreak="break-word"
                              whiteSpace="normal"
                              overflowWrap="anywhere"
                            >
                              {project.description}
                            </Text>
                            <VStack align="start" spacing={1}>
                              <HStack spacing={1}>
                                <Folder size={8} color="#9CA3AF" />
                                <Text fontSize="2xs" color="gray.500" noOfLines={1}>
                                  In: {project.inputFolder || 'Not set'}
                                </Text>
                              </HStack>
                              <HStack spacing={1}>
                                <Folder size={8} color="#9CA3AF" />
                                <Text fontSize="2xs" color="gray.500" noOfLines={1}>
                                  Out: {project.outputFolder || 'Not set'}
                                </Text>
                              </HStack>
                            </VStack>
                          </VStack>
                        </Td>
                        <Td py={4} w="250px" minW="250px" maxW="250px">
                          <ProjectProgressStatus 
                            project={project} 
                            onRefresh={loadProjects}
                          />
                        </Td>
                        <Td py={4} w="140px" minW="140px" maxW="140px">
                          <FileCountsDisplay fileCounts={project.file_counts} />
                        </Td>
                        <Td py={4} w="120px" minW="120px" maxW="120px">
                          <VStack align="start" spacing={1}>
                            <HStack spacing={1}>
                              <Calendar size={10} />
                              <Text fontSize="xs" color="gray.300" noOfLines={1}>
                                {project.scheduleType || 'manual'}
                              </Text>
                            </HStack>
                            {project.scheduleTime && project.scheduleType !== 'manual' && (
                              <HStack spacing={1}>
                                <Clock size={8} />
                                <Text fontSize="2xs" color="gray.400">
                                  {project.scheduleTime}
                                </Text>
                              </HStack>
                            )}
                          </VStack>
                        </Td>
                        <Td py={4} w="140px" minW="140px" maxW="140px">
                          <Text fontSize="xs" color="gray.400" noOfLines={2} lineHeight="1.3">
                            {formatDate(project.last_modified)}
                          </Text>
                        </Td>
                        <Td py={4} w="260px" minW="260px" maxW="260px">
                          <HStack spacing={1} wrap="wrap" justify="start">
                            {/* Configure button - always visible */}
                            <Tooltip label="Configure project" placement="top">
                              <IconButton
                                icon={<Settings size={14} />}
                                size="sm"
                                colorScheme="blue"
                                variant="solid"
                                aria-label="Configure project"
                                _hover={{ bg: 'blue.600' }}
                                onClick={(e) => handleConfigureProject(project, e)}
                              />
                            </Tooltip>

                            {/* View results button */}
                            <Tooltip label="View results" placement="top">
                              <IconButton
                                icon={<Eye size={14} />}
                                size="sm"
                                colorScheme="purple"
                                variant="solid"
                                aria-label="View results"
                                _hover={{ bg: 'purple.600' }}
                                onClick={(e) => handleViewResults(project, e)}
                              />
                            </Tooltip>

                            {/* NEW: Schema mapping button */}
                            <Tooltip label="Database schema mapping" placement="top">
                              <IconButton
                                icon={<Database size={14} />}
                                size="sm"
                                colorScheme="teal"
                                variant="solid"
                                aria-label="Database schema mapping"
                                _hover={{ bg: 'teal.600' }}
                                onClick={(e) => handleSchemaMapping(project, e)}
                              />
                            </Tooltip>

                            {(project.progress_percentage >= 60) && (
                              <Tooltip label="Batch processing" placement="top">
                                <IconButton
                                  icon={<Activity size={14} />}
                                  size="sm"
                                  colorScheme="orange"
                                  variant="solid"
                                  aria-label="Batch processing"
                                  _hover={{ bg: 'orange.600' }}
                                  onClick={(e) => handleBatchProcessing(project, e)}
                                />
                              </Tooltip>
                            )}

                            {/* Run button - show for ready projects */}
                            {(project.progress_percentage >= 60) && (
                              <Tooltip label="Run project now" placement="top">
                                <IconButton
                                  icon={<Play size={14} />}
                                  size="sm"
                                  colorScheme="green"
                                  variant="solid"
                                  aria-label="Run project now"
                                  _hover={{ bg: 'green.600' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRunProject(project.project_id);
                                  }}
                                  isDisabled={!project.file_counts?.input_files || project.file_counts.input_files === 0}
                                  opacity={(!project.file_counts?.input_files || project.file_counts.input_files === 0) ? 0.5 : 1}
                                />
                              </Tooltip>
                            )}

                            {/* Delete button - always visible */}
                            <Tooltip label="Delete project" placement="top">
                              <IconButton
                                icon={<Trash2 size={14} />}
                                size="sm"
                                colorScheme="red"
                                variant="solid"
                                aria-label="Delete project"
                                _hover={{ bg: 'red.600' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProject(project.project_id);
                                }}
                              />
                            </Tooltip>
                          </HStack>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default ProjectList;