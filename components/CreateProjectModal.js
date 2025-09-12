// components/CreateProjectModal.js - Improved Version
import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  VStack,
  HStack,
  Text,
  Box,
  Alert,
  AlertIcon,
  useColorModeValue,
  InputGroup,
  InputLeftAddon,
  Divider,
  Badge,
  Flex,
  Code
} from '@chakra-ui/react';
import { Folder, Calendar, Info, Clock } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://pdf-api.enigmahealth.io/api';

const CreateProjectModal = ({ isOpen, onClose, onCreateProject }) => {
  const [formData, setFormData] = useState({
    projectId: '',
    description: '',
    scheduleType: 'manual',
    scheduleTime: '09:00', // Default to 9 AM
    inputFolder: '',
    outputFolder: ''
  });
  const [errors, setErrors] = useState({});
  const [isCreating, setIsCreating] = useState(false);

  // Color mode values
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.700', 'gray.300');
  const labelColor = useColorModeValue('gray.700', 'gray.300');
  const placeholderColor = useColorModeValue('gray.400', 'gray.500');

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-generate folders when projectId changes
      if (field === 'projectId' && value.trim()) {
        const cleanProjectId = value.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
        newData.inputFolder = `projects/${cleanProjectId}/input`;
        newData.outputFolder = `projects/${cleanProjectId}/output`;
      }
      
      return newData;
    });
    
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
    } else if (formData.projectId.length < 3) {
      newErrors.projectId = 'Project ID must be at least 3 characters long';
    } else if (formData.projectId.length > 50) {
      newErrors.projectId = 'Project ID must be less than 50 characters';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters long';
    }
    
    // Validate schedule time for non-manual schedules
    if (formData.scheduleType !== 'manual' && !formData.scheduleTime) {
      newErrors.scheduleTime = 'Schedule time is required for automated processing';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    
    setIsCreating(true);
    setErrors({});
    
    try {
      console.log('Creating project with data:', formData);
      
      const response = await axios.post(`${API_BASE_URL}/projects`, formData, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
      
      console.log('Backend response:', response.data);
      
      if (response.data.status === 'success') {
        const projectData = {
          ...formData,
          status: 'draft',
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          fileCount: 0,
          templateType: null
        };
        
        onCreateProject(projectData);
        
        // Reset form
        setFormData({
          projectId: '',
          description: '',
          scheduleType: 'manual',
          scheduleTime: '09:00',
          inputFolder: '',
          outputFolder: ''
        });
        setErrors({});
        onClose();
        
      } else {
        setErrors({ general: response.data.error || 'Failed to create project' });
      }
      
    } catch (error) {
      console.error('Error creating project:', error);
      
      if (error.response) {
        const errorMessage = error.response.data?.error || 
                           error.response.data?.message || 
                           `Server error (${error.response.status})`;
        setErrors({ general: errorMessage });
      } else if (error.request) {
        setErrors({ general: 'Unable to connect to server. Please check your connection and try again.' });
      } else {
        setErrors({ general: error.message || 'An unexpected error occurred' });
      }
    } finally {
      setIsCreating(false);
    }
  };

  const generateProjectId = () => {
    if (formData.description) {
      const words = formData.description
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 2)
        .slice(0, 3);
      
      if (words.length > 0) {
        const baseId = words.join('-');
        const timestamp = new Date().getFullYear();
        // Generate UUID-like suffix
        const uuid = Math.random().toString(36).substring(2, 8);
        const suggestedId = `${baseId}-${timestamp}-${uuid}`;
        handleInputChange('projectId', suggestedId);
      }
    }
  };

  const scheduleOptions = [
    { value: 'manual', label: 'Manual', description: 'Run extraction manually when needed', needsTime: false },
    { value: 'daily', label: 'Daily', description: 'Process new files every day at scheduled time', needsTime: true },
    { value: 'weekly', label: 'Weekly', description: 'Process new files weekly at scheduled time', needsTime: true },
    { value: 'monthly', label: 'Monthly', description: 'Process new files monthly at scheduled time', needsTime: true }
  ];

  const currentScheduleOption = scheduleOptions.find(opt => opt.value === formData.scheduleType);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" closeOnOverlayClick={false}>
      <ModalOverlay bg="blackAlpha.600" />
      <ModalContent bg={bgColor} color={textColor} maxW="700px">
        <ModalHeader>
          <Flex align="center">
            <Box mr={3} p={2} bg="blue.500" borderRadius="lg">
              <Folder size={20} color="white" />
            </Box>
            <Box>
              <Text fontSize="lg" fontWeight="bold">Create New Project</Text>
              <Text fontSize="sm" color="gray.500" fontWeight="normal">
                Set up a new PDF data extraction project
              </Text>
            </Box>
          </Flex>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody pb={6}>
          <VStack spacing={6}>
            {/* General Error */}
            {errors.general && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <Box>
                  <Text fontWeight="bold">Error</Text>
                  <Text fontSize="sm">{errors.general}</Text>
                </Box>
              </Alert>
            )}

            {/* Description First */}
            <FormControl isInvalid={!!errors.description} isRequired>
              <FormLabel color={labelColor} fontWeight="medium">
                Project Description
              </FormLabel>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe what this project will process (e.g., Medical report processing for Q1 2024)"
                _placeholder={{ color: placeholderColor }}
                borderColor={borderColor}
                rows={3}
                resize="vertical"
              />
              {errors.description && (
                <Text color="red.500" fontSize="sm" mt={1}>
                  {errors.description}
                </Text>
              )}
              <Text fontSize="xs" color="gray.500" mt={1}>
                {formData.description.length}/500 characters
              </Text>
            </FormControl>

            {/* Project ID with Generate Button Below Description */}
            <FormControl isInvalid={!!errors.projectId} isRequired>
              <FormLabel color={labelColor} fontWeight="medium">
                Project ID
              </FormLabel>
              <VStack spacing={3} align="stretch">
                <Input
                  value={formData.projectId}
                  onChange={(e) => handleInputChange('projectId', e.target.value)}
                  placeholder="e.g., medical-reports-2024-abc123"
                  _placeholder={{ color: placeholderColor }}
                  borderColor={borderColor}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={generateProjectId}
                  isDisabled={!formData.description}
                  leftIcon={<Info size={16} />}
                  width="fit-content"
                >
                  Generate Unique Project ID
                </Button>
              </VStack>
              {errors.projectId && (
                <Text color="red.500" fontSize="sm" mt={1}>
                  {errors.projectId}
                </Text>
              )}
              <Text fontSize="xs" color="gray.500" mt={1}>
                Used to identify and organize your project files
              </Text>
            </FormControl>

            <Divider />

            {/* Processing Schedule with Time */}
            <FormControl>
              <FormLabel color={labelColor} fontWeight="medium">
                <HStack>
                  <Calendar size={16} />
                  <Text>Processing Schedule</Text>
                </HStack>
              </FormLabel>
              <VStack spacing={4} align="stretch">
                <Select
                  value={formData.scheduleType}
                  onChange={(e) => handleInputChange('scheduleType', e.target.value)}
                  borderColor={borderColor}
                >
                  {scheduleOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                
                {/* Time Picker for Scheduled Jobs */}
                {currentScheduleOption?.needsTime && (
                  <FormControl isInvalid={!!errors.scheduleTime}>
                    <FormLabel fontSize="sm" color={labelColor}>
                      <HStack>
                        <Clock size={14} />
                        <Text>Scheduled Time</Text>
                      </HStack>
                    </FormLabel>
                    <HStack>
                      <Input
                        type="time"
                        value={formData.scheduleTime}
                        onChange={(e) => handleInputChange('scheduleTime', e.target.value)}
                        borderColor={borderColor}
                        width="150px"
                      />
                      <Text fontSize="sm" color="gray.500">
                        (24-hour format)
                      </Text>
                    </HStack>
                    {errors.scheduleTime && (
                      <Text color="red.500" fontSize="sm" mt={1}>
                        {errors.scheduleTime}
                      </Text>
                    )}
                  </FormControl>
                )}
                
                <Box p={3} bg="blue.50" borderRadius="md" border="1px solid" borderColor="blue.200">
                  <Text fontSize="sm" color="blue.700">
                    {currentScheduleOption?.description}
                    {currentScheduleOption?.needsTime && formData.scheduleTime && (
                      <Text as="span" fontWeight="bold">
                        {` at ${formData.scheduleTime}`}
                      </Text>
                    )}
                  </Text>
                </Box>
              </VStack>
            </FormControl>

            <Divider />

            {/* Auto-Generated Folder Structure (Read-only Display) */}
            <Box w="full">
              <Text fontWeight="medium" mb={4} color={labelColor}>
                Project Folder Structure
              </Text>
              
              <VStack spacing={4} align="stretch">
                <Box p={4} bg="gray.50" borderRadius="md" border="1px solid" borderColor={borderColor}>
                  <VStack spacing={3} align="stretch">
                    <HStack>
                      <Text fontSize="sm" fontWeight="medium" color="gray.600">
                        📁 Input Folder:
                      </Text>
                      <Code colorScheme="blue" fontSize="sm">
                        {formData.inputFolder || 'projects/[project-id]/input'}
                      </Code>
                    </HStack>
                    
                    <HStack>
                      <Text fontSize="sm" fontWeight="medium" color="gray.600">
                        📤 Output Folder:
                      </Text>
                      <Code colorScheme="green" fontSize="sm">
                        {formData.outputFolder || 'projects/[project-id]/output'}
                      </Code>
                    </HStack>
                  </VStack>
                </Box>
                
                <Alert status="info" borderRadius="md" size="sm">
                  <AlertIcon />
                  <Box>
                    <Text fontSize="sm" color="blue.600">
                      Folders will be automatically created based on your project ID. 
                      Place your PDF files in the input folder for batch processing.
                    </Text>
                  </Box>
                </Alert>
              </VStack>
            </Box>

            {/* Info Alert */}
            <Alert status="info" borderRadius="md" bg="blue.50" borderColor="blue.200">
              <AlertIcon color="blue.500" />
              <Box>
                <Text fontWeight="bold" fontSize="sm" color="blue.700">
                  Next Steps
                </Text>
                <Text fontSize="sm" color="blue.600">
                  After creating the project, you'll configure the PDF template type and extraction parameters.
                </Text>
              </Box>
            </Alert>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button
              variant="outline"
              onClick={onClose}
              isDisabled={isCreating}
              borderColor={borderColor}
            >
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleCreate}
              isLoading={isCreating}
              loadingText="Creating..."
              isDisabled={!formData.projectId || !formData.description}
              px={8}
            >
              Create Project
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CreateProjectModal;