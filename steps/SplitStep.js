import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Textarea, 
  Text, 
  Flex, 
  Divider, 
  Heading, 
  List, 
  ListItem, 
  ListIcon,
  Badge,
  IconButton,
  useColorModeValue,
  Alert,
  AlertIcon,
  Spinner,
  Input,
  HStack
} from '@chakra-ui/react';
import { CheckCircleIcon, DeleteIcon } from '@chakra-ui/icons';

const SplitStep = ({ 
  splitPrompt, 
  setSplitPrompt, 
  onSplit, 
  isLoading,
  templateType, 
  selectedRegions = [],
  onDeleteRegion,
  onUpdateRegion, // New prop to update region parameter names
  splitError = null,
  hasSplitData = false,
  previousSplitConfig = null,
  isLoadingPreviousConfig = false,
  isAutoAdvancing = false
}) => {
  // Color mode theming
  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.700', 'gray.300');
  const tipBgColor = useColorModeValue('blue.50', 'blue.900/20');
  const tipTextColor = useColorModeValue('blue.600', 'blue.200');

  // Tip shown in placeholder or tip box
  const tip = "Be specific about what patterns or headings should define sections. For example: 'Split based on numbered headings' or 'Create sections for each patient record.'";

  // Auto-format parameter name (replace spaces with underscores, lowercase, etc.)
  const formatParameterName = (input) => {
    return input
      .toLowerCase()
      .replace(/\s+/g, '_')        // Replace spaces with underscores
      .replace(/[^a-z0-9_]/g, '_') // Replace non-alphanumeric (except underscore) with underscore
      .replace(/_+/g, '_')         // Replace multiple underscores with single
      .replace(/^_|_$/g, '');      // Remove leading/trailing underscores
  };

  // Handle parameter name change for a specific region
  const handleParameterNameChange = (index, value) => {
    // Allow user to type naturally, but store both raw and formatted versions
    const formattedValue = formatParameterName(value);
    if (onUpdateRegion) {
      const updatedRegion = {
        ...selectedRegions[index],
        parameterName: formattedValue,
        parameter_name: formattedValue,
        displayName: value, // Store the user's original input for display
        extractionPrompt: `Extract ${formattedValue.replace(/_/g, ' ')}` // Auto-generate basic prompt
      };
      onUpdateRegion(index, updatedRegion);
    }
  };

  // Check if splitting is allowed
  const canSplit = () => {
    if (templateType === 'running') {
      return splitPrompt && splitPrompt.trim() !== '';
    } else {
      // For fixed format, ensure all regions have parameter names
      return selectedRegions.length > 0 && selectedRegions.every(region => 
        region.parameterName || region.parameter_name
      );
    }
  };
  
  return (
    <Box
      bg={bgColor} 
      p={6} 
      borderRadius="lg" 
      borderWidth="1px" 
      borderColor={borderColor}
      shadow="sm"
    >
      {/* Status messages */}
      {isLoading && (
        <Alert status="info" mb={4} borderRadius="md">
          <AlertIcon />
          <Flex align="center">
            <Text>Processing document...</Text>
            <Spinner size="sm" ml={2} />
          </Flex>
        </Alert>
      )}

      {hasSplitData && !isLoading && (
        <Alert status="success" mb={4} borderRadius="md">
          <AlertIcon />
          Document successfully processed! Please proceed to review the extracted parameters.
        </Alert>
      )}

      {splitError && (
        <Alert status="error" mb={4} borderRadius="md">
          <AlertIcon />
          <Text>{splitError}</Text>
        </Alert>
      )}

      {previousSplitConfig && (
        <Alert status="info" mb={4} borderRadius="md">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold" fontSize="sm">Previous Configuration Found</Text>
            {previousSplitConfig.sections && (
              <Text fontSize="xs" color="gray.300" mt={1}>
                <strong>Sections found:</strong> {previousSplitConfig.sections.length}
              </Text>
            )}
          </Box>
        </Alert>
      )}

      {isLoadingPreviousConfig && (
        <Alert status="info" mb={4} borderRadius="md">
          <AlertIcon />
          <Flex align="center">
            <Text>Loading previous configuration...</Text>
            <Spinner size="sm" ml={2} />
          </Flex>
        </Alert>
      )}

      {isAutoAdvancing && (
        <Alert status="success" mb={4} borderRadius="md">
          <AlertIcon />
          <Flex align="center">
            <Text>Found existing extracted parameters! Advancing to review step...</Text>
            <Spinner size="sm" ml={2} />
          </Flex>
        </Alert>
      )}

      {templateType === 'running' ? (
        <>  
          <Text mb={4} color={textColor}>
            Provide instructions for how you want the document to be split into logical sections.
          </Text>
          
          <Textarea
            value={splitPrompt}
            onChange={(e) => setSplitPrompt(e.target.value)}
            placeholder={
              (!splitPrompt || !splitPrompt.trim()) 
                ? tip 
                : 'Enter your split instructions here'
            }
            size="md"
            rows={5}
            mb={4}
            width="100%"
            resize="vertical"
            bg="gray.800"
            color="white"
            borderColor="gray.600"
            _focus={{ borderColor: "blue.400" }}
          />
          
          <Box mb={4} p={3} bg={tipBgColor} borderRadius="md">
            <Text fontSize="sm" color={tipTextColor}>
              <strong>Tip:</strong> {tip}
            </Text>
          </Box>
          
          <Button
            onClick={onSplit}
            colorScheme="blue"
            isLoading={isLoading}
            loadingText="Splitting..."
            width="full"
            size="md"
            isDisabled={!canSplit()}
          >
            {hasSplitData ? "Re-Split Document" : "Split Document"}
          </Button>
        </>
      ) : (
        <>  
          <Text mb={4} color="gray.300">
            Select regions on the PDF and name each parameter to extract data from those areas.
          </Text>
          
          <Box mb={4} p={3} bg="blue.900/20" borderRadius="md">
            <Text fontSize="sm" color="blue.200">
              <strong>Instructions:</strong> Click the square icon in the PDF viewer to start selecting regions.
              Click and drag to draw a box around each area, then provide a parameter name below.
              Parameter names will be automatically formatted (lowercase, underscores instead of spaces).
            </Text>
          </Box>
          
          <Box my={4}>
            <Heading size="sm" mb={3} color="white">
              Selected Regions: {selectedRegions.length}
              {selectedRegions.length > 0 && (
                <Badge ml={2} colorScheme={canSplit() ? "green" : "orange"}>
                  {selectedRegions.filter(r => r.parameterName || r.parameter_name).length}/{selectedRegions.length} Named
                </Badge>
              )}
            </Heading>
            
            {selectedRegions.length > 0 ? (
              <>
                <List spacing={3} mb={4}>
                  {selectedRegions.map((region, index) => (
                    <ListItem key={index} p={3} bg="gray.700" borderRadius="md">
                      <HStack justify="space-between" align="center" mb={2}>
                        <HStack align="center">
                          <ListIcon 
                            as={CheckCircleIcon} 
                            color={(region.parameterName || region.parameter_name) ? "green.500" : "orange.500"} 
                          />
                          <Text fontSize="sm" color="gray.300">
                            Region {index + 1}: ({Math.round(region.x1 || 0)}, {Math.round(region.y1 || 0)}) to 
                            ({Math.round(region.x2 || 0)}, {Math.round(region.y2 || 0)})
                          </Text>
                          {region.page && <Badge colorScheme="blue">Page {region.page}</Badge>}
                        </HStack>
                        
                        {onDeleteRegion && (
                          <IconButton
                            icon={<DeleteIcon />}
                            size="xs"
                            colorScheme="red"
                            variant="ghost"
                            aria-label="Delete region"
                            onClick={() => onDeleteRegion(index)}
                          />
                        )}
                      </HStack>
                      
                      {/* Parameter Name Input */}
                      <Box ml={6}>
                        <Text fontSize="xs" color="gray.400" mb={1}>
                          Parameter Name:
                        </Text>
                        <Input
                          value={region.parameterName || region.parameter_name || ''}
                          onChange={(e) => handleParameterNameChange(index, e.target.value)}
                          placeholder="e.g., patient_name, diagnosis, procedure_date"
                          size="sm"
                          bg="gray.800"
                          borderColor="gray.600"
                          color="white"
                          _focus={{ borderColor: "blue.400" }}
                          _placeholder={{ color: "gray.500" }}
                        />
                        <Text fontSize="xs" color="gray.500" mt={1}>
                          Auto-formatted: spaces → underscores, lowercase only
                        </Text>
                      </Box>
                    </ListItem>
                  ))}
                </List>
                
                {selectedRegions.length > 0 && (
                  <Button 
                    size="sm" 
                    leftIcon={<DeleteIcon />}                    
                    colorScheme="red" 
                    variant="outline"
                    onClick={() => onDeleteRegion(-1)}
                    mb={4}
                  >
                    Clear All Regions
                  </Button>
                )}
                
                {/* Validation message */}
                {selectedRegions.length > 0 && !canSplit() && (
                  <Alert status="warning" mb={4} borderRadius="md">
                    <AlertIcon />
                    <Text fontSize="sm">
                      Please provide parameter names for all selected regions.
                    </Text>
                  </Alert>
                )}
              </>
            ) : (
              <Text fontSize="sm" color="gray.400" fontStyle="italic">
                No regions selected yet. Use the selection tool in the PDF viewer to draw boxes around areas you want to extract data from.
              </Text>
            )}
          </Box>
          
          <Divider my={4} borderColor="gray.600" />
          
          <Button
            onClick={onSplit}
            colorScheme="blue"
            isLoading={isLoading}
            loadingText="Processing..."
            width="full"
            size="md"
            isDisabled={!canSplit()}
          >
            {hasSplitData ? "Re-Process Regions" : "Process Regions"}
          </Button>
        </>
      )}
    </Box>
  );
};

export default SplitStep;