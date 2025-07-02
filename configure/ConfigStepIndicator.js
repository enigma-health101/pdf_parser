// components/configure/ConfigStepIndicator.js
import React from 'react';
import { 
  Box, 
  Flex, 
  Text, 
  Circle,
  useColorModeValue,
  Icon
} from '@chakra-ui/react';
import { CheckIcon } from '@chakra-ui/icons';

const ConfigStepIndicator = ({ configStep }) => {
  if (configStep >= 5) return null;
  
  const steps = [
    { id: 1, name: "Split" },
    { id: 2, name: "Review" },
    { id: 3, name: "Extract" },
    { id: 4, name: "Save" }
  ];

  // Chakra colors
  const activeBorderColor = useColorModeValue('blue.500', 'blue.400');
  const activeBgColor = useColorModeValue('blue.50', 'blue.900');
  const activeTextColor = useColorModeValue('blue.600', 'blue.300');
  const completedBgColor = useColorModeValue('blue.500', 'blue.400');
  const completedTextColor = "white";
  const inactiveBorderColor = useColorModeValue('gray.300', 'gray.600');
  const inactiveTextColor = useColorModeValue('gray.500', 'gray.400');
  const connectorActiveColor = useColorModeValue('blue.500', 'blue.400');
  const connectorInactiveColor = useColorModeValue('gray.200', 'gray.600');
  
  return (
    <Box mb={6} borderBottom="1px" borderColor="gray.200" pb={2}>
      <Flex justify="center">
        {steps.map((step) => (
          <Flex 
            key={step.id}
            direction="column"
            align="center"
            mx={4}
            position="relative"
          >
            {/* Step circle with number or check icon */}
            <Circle 
              size="28px"
              borderWidth={2}
              borderColor={
                configStep > step.id 
                  ? completedBgColor 
                  : configStep === step.id 
                    ? activeBorderColor 
                    : inactiveBorderColor
              }
              bg={
                configStep > step.id 
                  ? completedBgColor 
                  : configStep === step.id 
                    ? activeBgColor 
                    : 'transparent'
              }
              color={
                configStep > step.id 
                  ? completedTextColor 
                  : configStep === step.id 
                    ? activeTextColor 
                    : inactiveTextColor
              }
              fontWeight="bold"
              fontSize="sm"
            >
              {configStep > step.id ? (
                <Icon as={CheckIcon} />
              ) : (
                step.id
              )}
            </Circle>
            
            {/* Step name */}
            <Text 
              mt={1}
              fontSize="xs"
              color={
                configStep >= step.id 
                  ? activeTextColor 
                  : inactiveTextColor
              }
            >
              {step.name}
            </Text>
            
            {/* Connector line to next step */}
            {step.id < steps.length && (
              <Box 
                position="absolute"
                height="2px"
                width="calc(100% - 2rem)"
                top="14px"
                left="calc(50% + 14px)"
                bg={configStep > step.id ? connectorActiveColor : connectorInactiveColor}
              />
            )}
          </Flex>
        ))}
      </Flex>
    </Box>
  );
};

export default ConfigStepIndicator;