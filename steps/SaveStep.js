// components/configure/SaveStep.js
import React from 'react';
import {
  Box,
  Text,
  Heading,
  Input,
  Button,
  VStack,
  FormControl,
  FormLabel,
  useColorModeValue,
  InputGroup,
  InputLeftAddon
} from '@chakra-ui/react';

const SaveStep = ({ projectDetails, onUpdateProject, onSave, isLoading }) => {
  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const requiredColor = useColorModeValue('red.500', 'red.300');
  
  return (
    <Box 
      bg={bgColor} 
      p={6} 
      borderRadius="lg" 
      borderWidth="1px" 
      borderColor={borderColor}
      shadow="sm"
    >
      <VStack align="stretch" spacing={5}>
        <Heading as="h3" size="md">Project Details</Heading>
        <Text color="gray.500">
          Provide information about where to store and process these files.
        </Text>
        
        <FormControl isRequired>
          <FormLabel fontWeight="medium">
            Project ID <Text as="span" color={requiredColor}>*</Text>
          </FormLabel>
          <Input 
            value={projectDetails.projectId} 
            onChange={(e) => onUpdateProject('projectId', e.target.value)}
            placeholder="Enter a unique identifier for this project"
          />
        </FormControl>
        
        <FormControl>
          <FormLabel fontWeight="medium">Input Folder</FormLabel>
          <InputGroup>
            <InputLeftAddon children="/" />
            <Input 
              value={projectDetails.inputFolder} 
              onChange={(e) => onUpdateProject('inputFolder', e.target.value)}
              placeholder="Path to input folder (optional)"
            />
          </InputGroup>
        </FormControl>
        
        <FormControl>
          <FormLabel fontWeight="medium">Output Folder</FormLabel>
          <InputGroup>
            <InputLeftAddon children="/" />
            <Input 
              value={projectDetails.outputFolder} 
              onChange={(e) => onUpdateProject('outputFolder', e.target.value)}
              placeholder="Path to output folder (optional)"
            />
          </InputGroup>
        </FormControl>
        
        <Button
          colorScheme="blue"
          onClick={onSave}
          isLoading={isLoading}
          loadingText="Saving..."
          mt={4}
          isDisabled={!projectDetails.projectId}
        >
          Save & Continue
        </Button>
      </VStack>
    </Box>
  );
};

export default SaveStep;