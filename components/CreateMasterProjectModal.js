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
  VStack,
  Alert,
  AlertIcon,
  useColorModeValue,
  FormErrorMessage
} from '@chakra-ui/react';
import { FolderPlus } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://pdf-api.enigmahealth.io/api';

const CreateMasterProjectModal = ({ isOpen, onClose, onCreated }) => {
  const [formData, setFormData] = useState({ masterId: '', description: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.masterId.trim()) newErrors.masterId = 'Master project ID is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await axios.post(`${API_BASE_URL}/master-projects`, {
        masterId: formData.masterId.trim(),
        description: formData.description.trim()
      });
      onCreated?.();
      setFormData({ masterId: '', description: '' });
      setErrors({});
      onClose();
    } catch (err) {
      console.error('Error creating master project:', err);
      setErrors({ general: 'Failed to create master project' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" closeOnOverlayClick={!isSubmitting}>
      <ModalOverlay />
      <ModalContent bg={bgColor} borderWidth="1px" borderColor={borderColor}>
        <ModalHeader>Create Master Project</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            {errors.general && (
              <Alert status="error">
                <AlertIcon />
                {errors.general}
              </Alert>
            )}
            <FormControl isInvalid={!!errors.masterId}>
              <FormLabel>Master Project ID</FormLabel>
              <Input value={formData.masterId} onChange={e => handleChange('masterId', e.target.value)} />
              {errors.masterId && <FormErrorMessage>{errors.masterId}</FormErrorMessage>}
            </FormControl>
            <FormControl isInvalid={!!errors.description}>
              <FormLabel>Description</FormLabel>
              <Textarea value={formData.description} onChange={e => handleChange('description', e.target.value)} />
              {errors.description && <FormErrorMessage>{errors.description}</FormErrorMessage>}
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose} isDisabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            leftIcon={<FolderPlus size={16} />}
            onClick={handleCreate}
            isLoading={isSubmitting}
          >
            Create
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CreateMasterProjectModal;