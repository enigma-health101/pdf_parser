// components/SelectTemplateType.js
import { useState, useEffect } from 'react';
import {
  Box,
  Text,
  Heading,
  VStack,
  HStack,
  Button,
  Flex,
  Link,
  Radio,
  useColorModeValue,
  Center,
  Grid,
  GridItem,
  Progress,
  Spinner,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

const SelectTemplateType = ({ onSelect, onContinue, templateType, setTemplateType, hideTitle, onBack, projectId}) => {
  const [localTemplateType, setLocalTemplateType] = useState(templateType || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Fetch template type from backend when component mounts
  useEffect(() => {
    const fetchTemplateType = async () => {
      if (!projectId) {
        console.log('No projectId provided - starting fresh configuration');
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        console.log(`Fetching template type for project: ${projectId}`);
        const response = await fetch(`/api/config/projects/${projectId}/template-type`);
        
        if (!response.ok) {
          // Don't treat 404 or other errors as fatal for new projects
          if (response.status === 404) {
            console.log('Project configuration not found - starting fresh configuration');
            setIsLoading(false);
            return;
          }
          console.warn(`Could not fetch template type (${response.status}) - allowing manual selection`);
          setIsLoading(false);
          return;
        }
        
        const data = await response.json();
        console.log('Template info received:', data);
        
        // Handle both templateType and template_type from API - prioritize template_type (backend format)
        const apiTemplateType = data.template_type || data.templateType;
        
        if (apiTemplateType && apiTemplateType !== 'unknown' && apiTemplateType !== null) {
          console.log('Setting template type to:', apiTemplateType);
          setLocalTemplateType(apiTemplateType);
          if (setTemplateType) {
            setTemplateType(apiTemplateType);
          }
        } else {
          console.log('No valid template type configured yet - user can select manually');
        }
      } catch (err) {
        // Log but don't show error to user for new projects
        console.warn('Could not fetch template type:', err.message, '- allowing manual selection');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplateType();
  }, [projectId, setTemplateType]);
  
  const handleSelect = (value) => {
    setLocalTemplateType(value);
    if (setTemplateType) {
      setTemplateType(value);
    }
  };
  
  const handleContinue = () => {
    if (localTemplateType) {
      if (onSelect) {
        onSelect(localTemplateType);
      }
      if (onContinue) {
        onContinue();
      }
    }
  };
  
  // Color tokens
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const selectedBorderColor = useColorModeValue('blue.500', 'blue.400');
  const selectedBgColor = useColorModeValue('blue.50', 'blue.900');
  const hoverBorderColor = useColorModeValue('gray.300', 'gray.600');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const accentColor = useColorModeValue('blue.500', 'blue.300');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');
  
  const OptionVariants = {
    unselected: {
      y: 0,
      boxShadow: '0px 0px 0px rgba(0, 0, 0, 0)'
    },
    selected: {
      y: -4,
      boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.1)'
    },
    hover: {
      y: -2,
      boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.05)'
    }
  };

  // Compact loading state - only show for brief moment
  if (isLoading) {
    return (
      <VStack spacing={8} w="full">
        <Center>
          <VStack spacing={2}>
            <Spinner size="md" color="blue.500" />
            <Text color={mutedColor} fontSize="sm">Checking configuration...</Text>
          </VStack>
        </Center>
      </VStack>
    );
  }

  // Remove error state display - handle gracefully in background
  
  return (
    <VStack spacing={8} w="full">
      {/* Only show title and description if not hidden */}
      {!hideTitle && (
        <Box textAlign="center" maxW="3xl" mx="auto">
          <Heading as="h2" size="lg" mb={3}>Select Template Type</Heading>
          <Text color={mutedColor}>
            Choose the type of PDF template you want to process
          </Text>
        </Box>
      )}
      
      {/* Template Options */}
      <Grid
        templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
        gap={6}
        w="full"
        maxW="4xl"
        mx="auto"
      >
        {/* Fixed Format Option */}
        <GridItem>
          <MotionBox
            bg={cardBgColor}
            borderWidth="1px"
            borderColor={localTemplateType === 'fixed' ? selectedBorderColor : borderColor}
            borderRadius="xl"
            p={6}
            cursor="pointer"
            onClick={() => handleSelect('fixed')}
            height="full"
            position="relative"
            overflow="hidden"
            boxShadow="sm"
            initial="unselected"
            animate={localTemplateType === 'fixed' ? 'selected' : 'unselected'}
            whileHover="hover"
            variants={OptionVariants}
            transition={{ duration: 0.2 }}
          >
            {localTemplateType === 'fixed' && (
              <Box 
                position="absolute" 
                top={0} 
                right={0}
                w={0}
                h={0}
                borderStyle="solid"
                borderWidth="0 50px 50px 0"
                borderColor={`transparent ${selectedBorderColor} transparent transparent`}
              />
            )}
            
            <HStack align="flex-start" spacing={4}>
              <Radio 
                isChecked={localTemplateType === 'fixed'} 
                onChange={() => handleSelect('fixed')}
                colorScheme="blue"
                size="lg"
                mt={1}
              />
              
              <VStack align="stretch" spacing={4} flex="1">
                <HStack>
                  <Center 
                    bg={selectedBgColor} 
                    w={12} 
                    h={12} 
                    borderRadius="lg"
                    color={accentColor}
                  >
                    <Box fontSize="xl">📄</Box>
                  </Center>
                  <Heading as="h3" size="md">Fixed Format</Heading>
                </HStack>
                
                <Text>
                  For documents with a consistent, predictable layout where data appears in the same position on each page.
                </Text>
                
                <Box 
                  p={4} 
                  borderRadius="md" 
                  bg={localTemplateType === 'fixed' ? selectedBgColor : 'gray.50'}
                  borderWidth="1px"
                  borderColor={borderColor}
                >
                  <Text fontWeight="medium" mb={1}>Examples:</Text>
                  <Text fontSize="sm" color={mutedColor}>• Invoices</Text>
                  <Text fontSize="sm" color={mutedColor}>• Standard forms</Text>
                  <Text fontSize="sm" color={mutedColor}>• Structured reports</Text>
                </Box>
              </VStack>
            </HStack>
          </MotionBox>
        </GridItem>

        {/* Running Format Option */}
        <GridItem>
          <MotionBox
            bg={cardBgColor}
            borderWidth="1px"
            borderColor={localTemplateType === 'running' ? selectedBorderColor : borderColor}
            borderRadius="xl"
            p={6}
            cursor="pointer"
            onClick={() => handleSelect('running')}
            height="full"
            position="relative"
            overflow="hidden"
            boxShadow="sm"
            initial="unselected"
            animate={localTemplateType === 'running' ? 'selected' : 'unselected'}
            whileHover="hover"
            variants={OptionVariants}
            transition={{ duration: 0.2 }}
          >
            {localTemplateType === 'running' && (
              <Box 
                position="absolute" 
                top={0} 
                right={0}
                w={0}
                h={0}
                borderStyle="solid"
                borderWidth="0 50px 50px 0"
                borderColor={`transparent ${selectedBorderColor} transparent transparent`}
              />
            )}
            
            <HStack align="flex-start" spacing={4}>
              <Radio 
                isChecked={localTemplateType === 'running'} 
                onChange={() => handleSelect('running')} 
                colorScheme="blue"
                size="lg"
                mt={1}
              />
              
              <VStack align="stretch" spacing={4} flex="1">
                <HStack>
                  <Center 
                    bg={selectedBgColor} 
                    w={12} 
                    h={12} 
                    borderRadius="lg"
                    color={accentColor}
                  >
                    <Box fontSize="xl">📝</Box>
                  </Center>
                  <Heading as="h3" size="md">Running Format</Heading>
                </HStack>
                
                <Text>
                  For documents where content flows across pages and may have varying layouts but consistent patterns.
                </Text>
                
                <Box 
                  p={4} 
                  borderRadius="md" 
                  bg={localTemplateType === 'running' ? selectedBgColor : 'gray.50'}
                  borderWidth="1px"
                  borderColor={borderColor}
                >
                  <Text fontWeight="medium" mb={1}>Examples:</Text>
                  <Text fontSize="sm" color={mutedColor}>• Multi-page reports</Text>
                  <Text fontSize="sm" color={mutedColor}>• Research papers</Text>
                  <Text fontSize="sm" color={mutedColor}>• Academic articles</Text>
                </Box>
              </VStack>
            </HStack>
          </MotionBox>
        </GridItem>
      </Grid>
      
      {/* Help Text */}
      <Flex
        justify="center"
        align="center"
        color={mutedColor}
        bg={cardBgColor}
        p={4}
        borderRadius="lg"
        boxShadow="sm"
        borderWidth="1px"
        borderColor={borderColor}
        maxW="lg"
        mx="auto"
      >
        <Box mr={2}>❓</Box>
        <Text fontSize="sm">
          Not sure which to choose? <Link color={accentColor} href="#" fontWeight="medium">View our guide</Link>
        </Text>
      </Flex>
      
      {/* Continue Button */}
      <Flex justify="center" pt={4}>
        {onBack && (
          <Button 
            variant="outline"
            size="lg"
            colorScheme="black"
            _hover={{
            transform: 'translateY(-2px)',
            boxShadow: 'lg'
          }}
            px={10}
            onClick={onBack}
            mr={4}
          >
            Back to Projects
          </Button>
        )}
        <Button 
          colorScheme="blue" 
          size="lg" 
          onClick={handleContinue}
          isDisabled={!localTemplateType}
          px={10}
          rightIcon={<Box as="span">→</Box>}
          _hover={{
            transform: 'translateY(-2px)',
            boxShadow: 'lg'
          }}
          _active={{
            transform: 'translateY(0)',
            boxShadow: 'md'
          }}
          transition="all 0.2s"
        >
          Continue with {localTemplateType ? 
          (localTemplateType === 'fixed' ? 'Fixed Format' : 'Running Format') : 
          'Selection'}
        </Button>
      </Flex>
    </VStack>
  );
};

export default SelectTemplateType;