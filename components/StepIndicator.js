// components/StepIndicator.js - Updated to 5 steps (removed Process Files)
import React from 'react';
import { Box, Flex, Text, Circle } from '@chakra-ui/react';
import { CheckIcon } from '@chakra-ui/icons';

const StepIndicator = ({ currentStep = 1 }) => {
  const steps = [
    { number: 1, title: 'Select Template Type', description: 'Choose PDF format' },
    { number: 2, title: 'Upload PDF Files', description: 'Add your documents' },
    { number: 3, title: 'Configure Extraction', description: 'Set parameters' },
    { number: 4, title: 'View Results', description: 'Review extraction' },
    { number: 5, title: 'Schema Mapping', description: 'Map to database' },
    { number: 6, title: 'Batch Processing', description: 'Automate extraction' }
  ];

  const getStepStatus = (stepNumber) => {
    if (stepNumber < currentStep) return 'completed';
    if (stepNumber === currentStep) return 'current';
    return 'upcoming';
  };

  const getStepColor = (status) => {
    switch (status) {
      case 'completed': return 'green.500';
      case 'current': return 'blue.500';
      case 'upcoming': return 'gray.300';
      default: return 'gray.300';
    }
  };

  const getStepBg = (status) => {
    switch (status) {
      case 'completed': return 'green.500';
      case 'current': return 'blue.500';
      case 'upcoming': return 'gray.700';
      default: return 'gray.700';
    }
  };

  const getTextColor = (status) => {
    switch (status) {
      case 'completed': return 'green.300';
      case 'current': return 'blue.300';
      case 'upcoming': return 'gray.500';
      default: return 'gray.500';
    }
  };

  return (
    <Box w="100%" maxW="6xl" mx="auto" px={4} py={6} overflowX="auto">
      <Flex 
        align="center" 
        justify="space-between" 
        position="relative"
        minW="1000px" // Ensure minimum width to prevent cramping
      >
        {/* Progress line */}
        <Box
          position="absolute"
          top="25px"
          left="25px"
          right="25px"
          height="2px"
          bg="gray.700"
          zIndex={0}
        />
        
        {/* Progress fill */}
        <Box
          position="absolute"
          top="25px"
          left="25px"
          width={`${((currentStep - 1) / (steps.length - 1)) * 100}%`}
          height="2px"
          bg="blue.500"
          zIndex={1}
          transition="width 0.3s ease"
        />

        {steps.map((step, index) => {
          const status = getStepStatus(step.number);
          
          return (
            <Flex
              key={step.number}
              direction="column"
              align="center"
              position="relative"
              zIndex={2}
              flex="1"
              maxW="140px"
            >
              {/* Step circle */}
              <Circle
                size="50px"
                bg={getStepBg(status)}
                color="white"
                border="3px solid"
                borderColor={getStepColor(status)}
                mb={3}
                transition="all 0.3s ease"
              >
                {status === 'completed' ? (
                  <CheckIcon boxSize="20px" />
                ) : (
                  <Text fontSize="lg" fontWeight="bold">
                    {step.number}
                  </Text>
                )}
              </Circle>

              {/* Step title */}
              <Text
                fontSize="sm"
                fontWeight="semibold"
                color={getTextColor(status)}
                textAlign="center"
                mb={1}
                noOfLines={1}
              >
                {step.title}
              </Text>

              {/* Step description */}
              <Text
                fontSize="xs"
                color="gray.500"
                textAlign="center"
                noOfLines={1}
              >
                {step.description}
              </Text>
            </Flex>
          );
        })}
      </Flex>
    </Box>
  );
};

export default StepIndicator;