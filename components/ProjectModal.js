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
  AlertIcon
} from '@chakra-ui/react';
import { Folder } from 'lucide-react';

const CreateProjectModal = ({ isOpen, onClose, onCreateProject }) => {
  const [formData, setFormData] = useState({
    projectId: '',
    description: '',
    scheduleType: 'manual',
    inputFolder: '',
    outputFolder: ''
  });
  const [errors, setErrors] = useState({});
  const [isCreating, setIsCreating] = useState(false);

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
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    
    setIsCreating(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onCreateProject({
        ...formData,
        status: 'draft',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      });
      
      // Reset form
      setFormData({
        projectId: '',
        description: '',
        scheduleType: 'manual',
        inputFolder: '',
        outputFolder: ''
      });
      setErrors({});
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleFolderSelect = async (field) => {
    try {
      // In a real app, this would open a folder picker
      // For now, we'll simulate it
      const selectedFolder = prompt(`Enter ${field} folder path:`);
      if (selectedFolder) {
        handleInputChange(field, selectedFolder);
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent bg="gray.800" color="white">
        <ModalHeader>Create New Project</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl isInvalid={!!errors.projectId}>
              <FormLabel>Project ID *</FormLabel>
              <Input
                value={formData.projectId}
                onChange={(e) => handleInputChange('projectId', e.target.value)}
                placeholder="e.g., medical-reports-2024"
              />
              {errors.projectId && (
                <Text color="red.300" fontSize="sm" mt={1}>
                  {errors.projectId}
                </Text>
              )}
            </FormControl>

            <FormControl isInvalid={!!errors.description}>
              <FormLabel>Description *</FormLabel>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe what this project will process..."
                rows={3}
              />
              {errors.description && (
                <Text color="red.300" fontSize="sm" mt={1}>
                  {errors.description}
                </Text>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>Processing Schedule</FormLabel>
              <Select
                value={formData.scheduleType}
                onChange={(e) => handleInputChange('scheduleType', e.target.value)}
              >
                <option value="manual">Manual</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Input Folder</FormLabel>
              <HStack>
                <Input
                  value={formData.inputFolder}
                  onChange={(e) => handleInputChange('inputFolder', e.target.value)}
                  placeholder="/path/to/input/folder"
                />
                <Button
                  leftIcon={<Folder size={16} />}
                  variant="outline"
                  onClick={() => handleFolderSelect('inputFolder')}
                >
                  Browse
                </Button>
              </HStack>
            </FormControl>

            <FormControl>
              <FormLabel>Output Folder</FormLabel>
              <HStack>
                <Input
                  value={formData.outputFolder}
                  onChange={(e) => handleInputChange('outputFolder', e.target.value)}
                  placeholder="/path/to/output/folder"
                />
                <Button
                  leftIcon={<Folder size={16} />}
                  variant="outline"
                  onClick={() => handleFolderSelect('outputFolder')}
                >
                  Browse
                </Button>
              </HStack>
            </FormControl>

            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <Text fontSize="sm">
                After creating the project, you'll configure the PDF template type and extraction parameters.
              </Text>
            </Alert>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleCreate}
            isLoading={isCreating}
            loadingText="Creating..."
          >
            Create Project
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
