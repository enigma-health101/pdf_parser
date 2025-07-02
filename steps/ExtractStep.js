// steps/ExtractStep.js
import React, { useState } from 'react';
import {
  Box,
  Text,
  Heading,
  Button,
  VStack,
  HStack,
  Flex,
  Input,
  FormControl,
  FormLabel,
  Textarea,
  Divider,
  Badge,
  IconButton,
  Alert,
  AlertIcon,
  AlertDescription,
  useColorModeValue,
  Collapse
} from '@chakra-ui/react';
import { AddIcon, ChevronLeftIcon, ChevronRightIcon, DeleteIcon, ChevronDownIcon, ChevronUpIcon, RepeatIcon } from '@chakra-ui/icons';

const ExtractStep = ({
  currentSection,
  sections,
  parameters,
  onAddParameter,
  onUpdateParameter,
  onRemoveParameter,
  onExtract, 
  onNext,
  onPrev,
  isLoading,
  projectDetails,
  templateType = 'running'
}) => {
  
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState(new Set());

  // Color mode values for consistent theming
  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const contentBgColor = useColorModeValue('gray.50', 'gray.800');
  const textColor = useColorModeValue('gray.700', 'gray.300');
  const badgeColorScheme = useColorModeValue('green', 'green');
  const tipBgColor = useColorModeValue('blue.50', 'blue.900/20');
  const tipTextColor = useColorModeValue('blue.600', 'blue.200');
  const labelColor = textColor;
  const codeBgColor = useColorModeValue('gray.700', 'gray.800');
  const headerBg = useColorModeValue('blue.50', 'blue.900/20');
  const headerText = useColorModeValue('blue.600', 'blue.200');
  const scrollbarThumb = useColorModeValue('gray.300', 'gray.600');

  // Check if section has loaded parameters from backend
  const hasLoadedParameters = (sectionId) => {
    const sectionParams = parameters[sectionId] || [];
    return sectionParams.some(param => param.isLoaded || param.isRegularParameter);
  };

  // Organize sections into groups and standalone sections
  const organizedSections = React.useMemo(() => {
    const groups = {};
    const standaloneSections = [];
    const processedSections = new Set();
    
    // First pass: identify parent sections and group their sub-sections
    sections.forEach(section => {
      
      if (processedSections.has(section.id)) return;
      
      // Check if this section has sub-sections
      const subSections = sections.filter(other => 
        other.id !== section.id && 
        (other.parentSectionId === section.id || 
         other.id.startsWith(section.id + '_section_'))
      );
      
      if (subSections.length > 0) {
        // This is a parent section with sub-sections
        groups[section.id] = {
          parentId: section.id,
          parentName: section.title,
          parentSection: section,
          subSections: subSections
        };
        
        // Mark all sub-sections as processed
        subSections.forEach(sub => processedSections.add(sub.id));
        processedSections.add(section.id);
      } else {
        // Check if this is a sub-section of an already processed parent
        const isSubSection = section.parentSectionId && processedSections.has(section.parentSectionId);
        
        if (!isSubSection && !processedSections.has(section.id)) {
          // This is a standalone section
          standaloneSections.push(section);
          processedSections.add(section.id);
        }
      }
    });
    
    return { groups, standaloneSections };
  }, [sections]);

  // Get all extractable sections (group sections + standalone sections) for navigation
  const extractableSections = React.useMemo(() => {
  const allSections = [];
  const processedSectionIds = new Set();
  
  // Process sections in their original order
  sections.forEach(section => {
    if (processedSectionIds.has(section.id)) return;
    
    // Check if this section has sub-sections (is a parent)
    const subSections = sections.filter(other => 
      other.id !== section.id && 
      (other.parentSectionId === section.id || 
       other.id.startsWith(section.id + '_section_'))
    );
    
    if (subSections.length > 0) {
      // This is a parent section with sub-sections - create group section
      const groupSection = {
        id: section.id,
        title: section.title,
        content: subSections.map(sub => `[${sub.title}]\n${sub.content}`).join('\n\n---\n\n'),
        isGroup: true,
        subSections: subSections,
        parentSection: section,
        originalIndex: sections.findIndex(s => s.id === section.id) // Preserve original position
      };
      allSections.push(groupSection);
      
      // Mark all sub-sections as processed
      subSections.forEach(sub => processedSectionIds.add(sub.id));
      processedSectionIds.add(section.id);
      
    } else {
      // Check if this is a sub-section
      const isSubSection = section.parentSectionId || 
                          sections.some(parent => 
                            parent.id !== section.id && 
                            section.id.startsWith(parent.id + '_section_')
                          );
      
      if (!isSubSection && !processedSectionIds.has(section.id)) {
        // This is a standalone section
        allSections.push({
          ...section,
          originalIndex: sections.findIndex(s => s.id === section.id) // Preserve original position
        });
        processedSectionIds.add(section.id);
      }
    }
  });
  
  // Sort by original index to maintain order
  return allSections
    .filter(section => section && section.id)
    .sort((a, b) => (a.originalIndex || 0) - (b.originalIndex || 0));
}, [sections]);

  // Find the current group if the current section is a group
  const currentGroup = currentSection?.isGroup ? 
    Object.values(organizedSections.groups).find(g => g.parentId === currentSection.id) : 
    null;

  // Toggle section expansion
  const toggleSection = (sectionKey) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionKey)) {
      newExpanded.delete(sectionKey);
    } else {
      newExpanded.add(sectionKey);
    }
    setExpandedSections(newExpanded);
  };

  // Helper function to detect if a parameter represents table columns
  const isTableParameter = (param) => {
    return param.name && param.name.includes(',');
  };

  // Helper function to format extracted values for display
  const formatExtractedValue = (param) => {
    if (param.value) return param.value;
    if (param.extractedValue) {
      // Handle array of values
      if (Array.isArray(param.extractedValue)) {
        if (param.extractedValue.length === 0) return 'No matches found';
        if (param.extractedValue.length === 1) return param.extractedValue[0];
        return param.extractedValue.join(', ');
      }
      return param.extractedValue;
    }
    return null;
  };

  // Enhanced function to clear and re-extract with support for loaded parameters
  const handleClearAndReExtract = (sectionId) => {
    // Clear only the extracted data, keep the parameter definitions
    const sectionParams = parameters[sectionId] || [];
    const clearedParams = sectionParams.map(param => {
      // If it's extracted data (table/legacy table/loaded), convert back to input format
      if (param.isTableData || param.isLegacyTableData || param.isRegularParameter || param.isLoaded) {
        // Keep only the original parameter definition
        return {
          name: param.originalColumns || param.name || '',
          description: param.description || '',
          // Remove extracted data fields
          extractedValue: undefined,
          value: undefined,
          isRegularParameter: undefined,
          isLoaded: undefined,
          regex: undefined,
          confidence: undefined,
          extractionMethod: undefined
        };
      }
      // For regular parameters, just clear the extracted values
      return {
        name: param.name || '',
        description: param.description || '',
      };
    });
    
    // Use the prop function to update parameters
    onUpdateParameter(sectionId, -1, 'updateAll', clearedParams);
    
    setError(null);
  };

  // Enhanced function to check if section has extracted data (including loaded)
  const hasExtractedData = (sectionId) => {
    const sectionParams = parameters[sectionId] || [];
    return sectionParams.some(param => 
      param.isTableData || param.isLegacyTableData || param.isRegularParameter || 
      param.value || param.extractedValue || param.isLoaded
    );
  };

  // Function to render loaded parameter information
  const renderLoadedParameterInfo = (param) => {
  if (param.isLoaded || param.isRegularParameter) {
    return (
      <Box mt={2} p={3} bg="green.900/20" borderRadius="md" border="1px solid" borderColor="green.700">
        <HStack justify="space-between" align="start" mb={2}>
          <Text fontSize="sm" fontWeight="bold" color="green.500">
            {param.isGroupResult ? 'Previously Extracted from Group' : 'Previously Extracted Parameter'}
          </Text>
          <HStack spacing={1}>
            <Badge colorScheme="yellow" size="sm">LOADED</Badge>
            {param.isGroupResult && (
              <Badge colorScheme="purple" size="sm">{param.subSectionCount} SUB-SECTIONS</Badge>
            )}
          </HStack>
        </HStack>
        
        <VStack spacing={2} align="stretch">
          {/* Show extracted value */}
          {(param.value || param.extractedValue) && (
            <Box p={2} bg="gray.700" borderRadius="sm">
              <Text fontSize="xs" fontWeight="bold" color="yellow.300">
                {param.isGroupResult ? 'Combined Extracted Values:' : 'Extracted Value:'}
              </Text>
              <Text fontSize="xs" color="gray.200" wordBreak="break-word">
                {param.value || (Array.isArray(param.extractedValue) ? param.extractedValue.join(', ') : param.extractedValue)}
              </Text>
            </Box>
          )}
          
          {/* Show sub-section details for group results */}
          {param.isGroupResult && param.subSectionDetails && param.subSectionDetails.length > 0 && (
            <Box p={2} bg="purple.900/20" borderRadius="sm" border="1px solid" borderColor="purple.700">
              <Text fontSize="xs" fontWeight="bold" color="purple.300" mb={2}>
                Results from {param.subSectionCount} Sub-sections:
              </Text>
              <VStack spacing={1} align="stretch" maxH="150px" overflowY="auto">
                {param.subSectionDetails.map((subSection, index) => (
                  <Box key={index} p={2} bg="gray.700" borderRadius="sm">
                    <Text fontSize="xs" fontWeight="bold" color="purple.200">
                      Sub-section {subSection.index} ({subSection.id}):
                    </Text>
                    <Text fontSize="xs" color="gray.200" mb={1}>
                      {subSection.value || 'No value extracted'}
                    </Text>
                    {subSection.regex && (
                      <Text fontSize="xs" color="green.300" fontFamily="mono">
                        Regex: {subSection.regex}
                      </Text>
                    )}
                    {subSection.confidence && (
                      <Text fontSize="xs" color="yellow.300">
                        Confidence: {subSection.confidence}%
                      </Text>
                    )}
                  </Box>
                ))}
              </VStack>
            </Box>
          )}
          
          {/* Show regex pattern if available */}
          {param.regex && (
            <Box p={2} bg="gray.700" borderRadius="sm">
              <Text fontSize="xs" fontWeight="bold" color="green.300">
                {param.isGroupResult ? 'Combined Regex Patterns:' : 'Regex Pattern:'}
              </Text>
              <Text fontSize="xs" color="gray.200" fontFamily="mono" wordBreak="break-all">
                {param.regex}
              </Text>
            </Box>
          )}
          
          {/* Show extraction method */}
          {param.extractionMethod && (
            <Box p={2} bg="gray.700" borderRadius="sm">
              <Text fontSize="xs" fontWeight="bold" color="blue.300">
                Extraction Method:
              </Text>
              <Text fontSize="xs" color="gray.200">
                {param.extractionMethod}
              </Text>
            </Box>
          )}
          
          {/* Show confidence if available */}
          {param.confidence && (
            <Box p={2} bg="gray.700" borderRadius="sm">
              <Text fontSize="xs" fontWeight="bold" color="purple.300">
                {param.isGroupResult ? 'Average Confidence:' : 'Confidence:'}
              </Text>
              <Text fontSize="xs" color="gray.200">
                {param.confidence}%
              </Text>
            </Box>
          )}
        </VStack>
      </Box>
    );
  }
  return null;
};


  // Render structured table data (handles backend table format)
  const renderStructuredTableData = (param) => {
    // Handle backend table format: response.data.table
    if (param.isTableData && param.tableData && param.tableData.headers && param.tableData.rows) {
      const { headers, rows } = param.tableData;
      
      return (
        <Box mt={2} p={3} bg="blue.900/20" borderRadius="md" border="1px solid" borderColor="blue.700">
          <Text fontSize="sm" fontWeight="bold" color="blue.200" mb={2}>
            Extracted Table Data ({rows.length} rows):
          </Text>
          
          <Box overflowX="auto" maxH="400px" overflowY="auto">
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse', 
              fontSize: '12px',
              backgroundColor: 'rgba(45, 55, 72, 0.8)' 
            }}>
              <thead style={{ backgroundColor: 'rgba(66, 153, 225, 0.2)' }}>
                <tr>
                  {headers.map((header, index) => (
                    <th key={index} style={{ 
                      padding: '8px 6px', 
                      textAlign: 'left', 
                      color: '#90CDF4',
                      fontWeight: 'bold',
                      borderBottom: '1px solid #4A5568'
                    }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex} style={{
                    backgroundColor: rowIndex % 2 === 0 ? 'rgba(74, 85, 104, 0.3)' : 'transparent'
                  }}>
                    {headers.map((header, colIndex) => (
                      <td key={colIndex} style={{ 
                        padding: '6px', 
                        color: '#E2E8F0',
                        borderBottom: '1px solid #4A5568',
                        wordBreak: 'break-word',
                        maxWidth: '150px'
                      }}>
                        {row[header] || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
          <Box h="60px" />
        </Box>
      );
    }
    
    // Handle direct table array format (backend format)
    if (param.isTableData && param.originalResponse && param.originalResponse.table) {
      const tableArray = param.originalResponse.table;
      const headers = tableArray.length > 0 ? Object.keys(tableArray[0]) : [];
      
      return (
        <Box mt={2} p={3} bg="blue.900/20" borderRadius="md" border="1px solid" borderColor="blue.700">
          <Text fontSize="sm" fontWeight="bold" color="blue.200" mb={2}>
            Extracted Table Data ({tableArray.length} rows):
          </Text>
          
          <Box overflowX="auto" maxH="400px" overflowY="auto">
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse', 
              fontSize: '12px',
              backgroundColor: 'rgba(45, 55, 72, 0.8)' 
            }}>
              <thead style={{ backgroundColor: 'rgba(66, 153, 225, 0.2)' }}>
                <tr>
                  {headers.map((header, index) => (
                    <th key={index} style={{ 
                      padding: '8px 6px', 
                      textAlign: 'left', 
                      color: '#90CDF4',
                      fontWeight: 'bold',
                      borderBottom: '1px solid #4A5568'
                    }}>
                      {header.replace(/_/g, ' ').toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableArray.map((row, rowIndex) => (
                  <tr key={rowIndex} style={{
                    backgroundColor: rowIndex % 2 === 0 ? 'rgba(74, 85, 104, 0.3)' : 'transparent'
                  }}>
                    {headers.map((header, colIndex) => (
                      <td key={colIndex} style={{ 
                        padding: '6px', 
                        color: '#E2E8F0',
                        borderBottom: '1px solid #4A5568',
                        wordBreak: 'break-word',
                        maxWidth: '150px'
                      }}>
                        {row[header] || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
          <Box h="60px" />
        </Box>
      );
    }
    
    return null;
  };

  // Render group result table data (combined from multiple sub-sections)
  const renderGroupTableData = (param) => {
    if (param.isGroupResult && param.isTableData && param.tableData) {
      const { headers, rows } = param.tableData;
      
      return (
        <Box mt={2} p={3} bg="purple.900/20" borderRadius="md" border="1px solid" borderColor="purple.700">
          <Text fontSize="sm" fontWeight="bold" color="purple.200" mb={2}>
            Combined Table Data from {param.subSectionCount} Sub-sections ({rows.length} total rows):
          </Text>
          
          <Box overflowX="auto" maxH="400px" overflowY="auto">
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse', 
              fontSize: '12px',
              backgroundColor: 'rgba(45, 55, 72, 0.8)' 
            }}>
              <thead style={{ backgroundColor: 'rgba(139, 92, 246, 0.2)' }}>
                <tr>
                  {headers.map((header, index) => (
                    <th key={index} style={{ 
                      padding: '8px 6px', 
                      textAlign: 'left', 
                      color: '#C4B5FD',
                      fontWeight: 'bold',
                      borderBottom: '1px solid #4A5568'
                    }}>
                      {header.replace(/_/g, ' ').toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex} style={{
                    backgroundColor: rowIndex % 2 === 0 ? 'rgba(74, 85, 104, 0.3)' : 'transparent'
                  }}>
                    {headers.map((header, colIndex) => (
                      <td key={colIndex} style={{ 
                        padding: '6px', 
                        color: '#E2E8F0',
                        borderBottom: '1px solid #4A5568',
                        wordBreak: 'break-word',
                        maxWidth: '150px'
                      }}>
                        {row[header] || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
          <Box h="60px" />
        </Box>
      );
    }
    
    return null;
  };

  // Render group result regular parameters (showing values from each sub-section)
  const renderGroupParameterData = (param) => {
  if (param.isGroupResult && param.isRegularParameter && param.subSectionDetails) {
    return (
      <Box mt={2} p={3} bg="purple.900/20" borderRadius="md" border="1px solid" borderColor="purple.700">
        <Text fontSize="sm" fontWeight="bold" color="purple.200" mb={2}>
          Results from {param.subSectionCount} Sub-sections:
        </Text>
        
        <VStack spacing={2} align="stretch">
          {param.subSectionDetails.map((subSection, index) => (
            <Box key={index} p={2} bg="gray.700" borderRadius="sm">
              <Text fontSize="xs" fontWeight="bold" color="purple.300">
                Sub-section {subSection.index} ({subSection.id}):
              </Text>
              <Text fontSize="xs" color="gray.200" mb={1}>
                {subSection.value}
              </Text>
              
              {/* Show regex info for each sub-section if available */}
              {subSection.regex && (
                <Text fontSize="xs" color="green.300" fontFamily="mono">
                  Regex: {subSection.regex}
                </Text>
              )}
            </Box>
          ))}
        </VStack>
        
        {/* Show common extraction info */}
        {param.regex && (
          <Box mt={2} p={2} bg="gray.700" borderRadius="sm">
            <Text fontSize="xs" fontWeight="bold" color="green.300">
              Common Regex Pattern:
            </Text>
            <Text fontSize="xs" color="gray.200" fontFamily="mono">
              {param.regex}
            </Text>
          </Box>
        )}
      </Box>
    );
  }
  
  return null;
};

const renderFixedFormatParameter = (param, index) => {
    const isLoadedParam = param.isLoaded || param.isRegularParameter;
    
    return (
      <Box 
        key={index} 
        p={4} 
        bg="blue.900/20"
        borderRadius="md"
        borderWidth="2px"
        borderColor="blue.600"
        position="relative"
      >
        {/* Fixed Format Parameter Header */}
        <HStack justify="space-between" align="center" mb={3}>
          <VStack align="start" spacing={1}>
            <Text fontSize="md" fontWeight="bold" color="blue.200">
              {param.name || 'Parameter'}
            </Text>
            <Text fontSize="xs" color="gray.400">
              Extracted via Vision Model
            </Text>
          </VStack>
          
          <VStack align="end" spacing={1}>
            {param.confidence !== undefined && (
              <Badge 
                colorScheme={param.confidence > 80 ? "green" : param.confidence > 50 ? "yellow" : "red"}
                size="sm"
              >
                {param.confidence}% Confidence
              </Badge>
            )}
            <Badge colorScheme="blue" size="sm">
              VISION EXTRACTED
            </Badge>
          </VStack>
        </HStack>

        {/* Region Information */}
        {param.bbox && (
          <Box mb={3} p={2} bg="purple.900/20" borderRadius="sm">
            <Text fontSize="xs" color="purple.200" fontWeight="bold">
              Region: Page {param.page || 1}
            </Text>
            <Text fontSize="xs" color="gray.300">
              ({Math.round(param.bbox.x1 || 0)}, {Math.round(param.bbox.y1 || 0)}) to 
              ({Math.round(param.bbox.x2 || 0)}, {Math.round(param.bbox.y2 || 0)})
            </Text>
          </Box>
        )}

        {/* Extracted Value Display */}
        <Box mb={3} p={3} bg="gray.700" borderRadius="md">
          <Text fontSize="sm" fontWeight="bold" color="green.300" mb={2}>
            Extracted Value:
          </Text>
          <Box p={2} bg="gray.800" borderRadius="sm" border="1px solid" borderColor="green.600">
            <Text fontSize="sm" color="white" fontFamily="mono">
              {param.extractedValue || param.value || 'No value extracted'}
            </Text>
          </Box>
        </Box>

        {/* Raw Text (if different from extracted value) */}
        {param.raw_text && param.raw_text !== param.extractedValue && (
          <Box mb={3} p={3} bg="gray.700" borderRadius="md">
            <Text fontSize="sm" fontWeight="bold" color="yellow.300" mb={2}>
              Raw Text:
            </Text>
            <Box p={2} bg="gray.800" borderRadius="sm">
              <Text fontSize="sm" color="gray.200" fontFamily="mono">
                {param.raw_text}
              </Text>
            </Box>
          </Box>
        )}

        {/* Editable Description */}
        <FormControl mb={3}>
          <FormLabel fontSize="sm" fontWeight="medium" color="blue.200">
            Description:
          </FormLabel>
          <Textarea
            value={param.description || ''}
            onChange={(e) => {
              onUpdateParameter(currentSection.id, index, 'description', e.target.value);
            }}
            placeholder="Add a description for this parameter..."
            size="sm"
            rows={2}
            bg="gray.800"
            color="white"
            borderColor="blue.500"
            _focus={{ borderColor: "blue.400" }}
          />
        </FormControl>

        {/* Extraction Details */}
        <Accordion allowToggle size="sm">
          <AccordionItem border="none">
            <AccordionButton px={0} py={2} _hover={{ bg: "transparent" }}>
              <Text fontSize="xs" color="gray.400" flex="1" textAlign="left">
                View Extraction Details
              </Text>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel px={0} py={2}>
              <VStack spacing={2} align="stretch">
                {param.extraction_method && (
                  <Box p={2} bg="gray.800" borderRadius="sm">
                    <Text fontSize="xs" fontWeight="bold" color="blue.300">
                      Extraction Method:
                    </Text>
                    <Text fontSize="xs" color="gray.200">
                      {param.extraction_method}
                    </Text>
                  </Box>
                )}
                
                {param.processing_timestamp && (
                  <Box p={2} bg="gray.800" borderRadius="sm">
                    <Text fontSize="xs" fontWeight="bold" color="purple.300">
                      Processed At:
                    </Text>
                    <Text fontSize="xs" color="gray.200">
                      {new Date(param.processing_timestamp).toLocaleString()}
                    </Text>
                  </Box>
                )}

                {param.error && (
                  <Box p={2} bg="red.900/20" borderRadius="sm" border="1px solid" borderColor="red.600">
                    <Text fontSize="xs" fontWeight="bold" color="red.300">
                      Error:
                    </Text>
                    <Text fontSize="xs" color="red.200">
                      {param.error}
                    </Text>
                  </Box>
                )}
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>

        {/* Re-extract Button for Low Confidence */}
        {param.confidence < 70 && (
          <Button
            size="xs"
            colorScheme="orange"
            variant="outline"
            mt={2}
            leftIcon={<RepeatIcon />}
            onClick={() => {
              // Trigger re-extraction for this specific parameter
              if (typeof onExtract === 'function') {
                onExtract(currentSection);
              }
            }}
          >
            Re-extract (Low Confidence)
          </Button>
        )}
      </Box>
    );
  };

  // Render legacy table data (column-based format)
  const renderLegacyTableData = (param) => {
    if (param.isLegacyTableData && param.tableData && Array.isArray(param.tableData)) {
      return (
        <Box mt={2} p={3} bg="blue.900/20" borderRadius="md">
          <Text fontSize="sm" fontWeight="bold" color="blue.200" mb={2}>
            Extracted Table Data (Legacy Format):
          </Text>
          <Box maxH="150px" overflowY="auto">
            {param.tableData.map((col, index) => (
              <Box key={index} mb={2} p={2} bg="gray.700" borderRadius="sm">
                <Text fontSize="xs" fontWeight="bold" color="blue.300">
                  {col.column}:
                </Text>
                <Text fontSize="xs" color={textColor}>
                  {col.values && col.values.length > 0 ? col.values.join(', ') : 'No data'}
                </Text>
              </Box>
            ))}
          </Box>
        </Box>
      );
    }
    return null;
  };

  // Wrapper for extraction with error handling
  const handleExtract = async (section) => {
    setError(null);
    try {
      console.log('Starting extraction for section:', section);
      if (!section) {
        throw new Error('No section provided for extraction');
      }
      
      // Check if the section has parameters defined
      const sectionParameters = parameters[section.id] || [];
      console.log('Parameters for extraction:', sectionParameters);
      
      if (sectionParameters.length === 0) {
        throw new Error('Please add at least one parameter to extract');
      }
      
      // Check for empty parameter names or descriptions (only for regular parameters)
      const emptyParams = sectionParameters.filter(
        p => !p.isTableData && !p.isLegacyTableData && (!p.name?.trim() || !p.description?.trim())
      );
      
      if (emptyParams.length > 0) {
        throw new Error('Please fill in all parameter names and descriptions');
      }
      
      // Now call the extraction function
      await onExtract(section);
    } catch (err) {
      setError(err.message || 'Failed to extract parameters. Please try again.');
      console.error('Error in extraction:', err);
    }
  };

  // Render group section content (combined sub-sections)
  const renderGroupSectionContent = (group) => {
    return (
      <VStack spacing={3} align="stretch">
        <Text fontSize="sm" color="purple.200" fontWeight="medium">
          This group contains {group.subSections.length} sub-sections. Parameters will be applied to all sub-sections.
        </Text>
        
        {/* Show combined content preview */}
        <Box bg={codeBgColor} borderRadius="md">
          <Box p={3} maxH="300px" overflowY="auto" 
            css={{
              '&::-webkit-scrollbar': {
                width: '4px',
              },
              '&::-webkit-scrollbar-track': {
                width: '6px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: scrollbarThumb,
                borderRadius: '24px',
              },
            }}
          >
            <Text color="white" fontSize="sm" fontFamily="mono" whiteSpace="pre-wrap">
              {currentSection.content}
            </Text>
            <Box h="120px" />
          </Box>
        </Box>

        {/* Show sub-sections summary */}
        <Box bg="purple.900/20" borderRadius="md" p={3}>
          <Text fontSize="xs" color="purple.300" fontWeight="bold" mb={2}>
            Sub-sections in this group:
          </Text>
          <VStack spacing={1} align="stretch">
            {group.subSections.map((subSection, index) => (
              <Text key={subSection.id} fontSize="xs" color="gray.500">
                {index + 1}. {subSection.title} ({subSection.content?.length || 0} chars)
              </Text>
            ))}
          </VStack>
        </Box>
      </VStack>
    );
  };

  // Safety checks
  if (!sections || sections.length === 0) {
    return (
      <Box textAlign="center" p={4}>
        <Text color={textColor}>No sections available. Please go back and split the document first.</Text>
        <Button onClick={onPrev} mt={4} variant="outline" colorScheme="gray">
          Back to Previous Step
        </Button>
      </Box>
    );
  }

  // Ensure currentSection exists and has valid id
  if (currentSection && !currentSection.id) {
    console.error('Current section missing ID:', currentSection);
  }

  // Check if current section has any table data
  const hasTableData = currentSection && (parameters[currentSection.id] || []).some(p => p.isTableData || p.isLegacyTableData);

  return (
    <Box 
      bg={bgColor} 
      p={6} 
      borderRadius="lg" 
      borderWidth="1px" 
      borderColor={borderColor}
      shadow="sm"
      maxH="800px"
      overflowY="auto"
      css={{
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          width: '10px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: scrollbarThumb,
          borderRadius: '24px',
        },
      }}
    >
      {error && (
        <Alert status="error" mb={4} borderRadius="md" bg="red.900/20">
          <AlertIcon color="red.300" />
          <AlertDescription color="red.300" fontSize="sm">{error}</AlertDescription>
        </Alert>
      )}
      
      <VStack align="stretch" spacing={4}>
        {/* Header */}
        <HStack justify="space-between" align="center">
          <Heading as="h3" size="md" color={textColor}>Extract Parameters from Sections</Heading>
          <Badge colorScheme={badgeColorScheme} variant="subtle" px={3} py={1} borderRadius="full">
            {currentSection ? 
              `SECTION ${extractableSections.findIndex(s => s && s.id && s.id === currentSection?.id) + 1} OF ${extractableSections.length}` :
              `${extractableSections.length} SECTIONS TOTAL`
            }
          </Badge>
        </HStack>

        {/* Show current section interface when currentSection exists */}
        {currentSection && (
          <>
            <Box 
              bg={contentBgColor} 
              p={4} 
              borderRadius="md" 
              borderWidth="1px"
              borderColor={borderColor}
              mb={4}
            >
              <HStack justify="space-between" align="start" mb={2}>
                <Heading as="h4" size="sm" color={textColor}>
                  {currentSection.title}
                  {currentSection.isGroup && (
                    <Badge ml={2} colorScheme="purple" size="sm">Group Section</Badge>
                  )}
                </Heading>
                
                {/* Add re-extract button if data already exists */}
                {hasExtractedData(currentSection.id) && (
                  <Button
                    size="xs"
                    colorScheme="orange"
                    variant="ghost"
                    leftIcon={<RepeatIcon />}
                    onClick={() => handleClearAndReExtract(currentSection.id)}
                  >
                    Re-extract
                  </Button>
                )}
              </HStack>

              <Box 
                maxH="400px" 
                overflowY="auto" 
                css={{
                  '&::-webkit-scrollbar': {
                    width: '4px',
                  },
                  '&::-webkit-scrollbar-track': {
                    width: '6px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: scrollbarThumb,
                    borderRadius: '24px',
                  },
                }}
              >
                {currentGroup ? (
                  renderGroupSectionContent(currentGroup)
                ) : (
                  <Box 
                    p={3} 
                    bg={codeBgColor} 
                    borderRadius="md" 
                    fontSize="sm"
                    fontFamily="mono"
                  >
                    <Text 
                      color="white" 
                      whiteSpace="pre-wrap" 
                      overflowX="auto"
                    >
                      {currentSection.content}
                    </Text>
                    <Box h="240px" />
                  </Box>
                )}
              </Box>
            </Box>
            
            <Divider my={4} borderColor={borderColor} />
            
            <Heading as="h4" size="sm" mb={3} color={textColor}>
              Parameters to Extract
              {currentSection.isGroup && (
                <Text fontSize="xs" color="purple.300" mt={1}>
                  These parameters will be applied to all sub-sections in the group
                </Text>
              )}
            </Heading>
            
            {/* Show tips for new parameters */}
            {!hasTableData && !hasExtractedData(currentSection.id) && !hasLoadedParameters(currentSection.id) && (
              <Box mb={4} p={3} bg={tipBgColor} borderRadius="md">
                <Text fontSize="sm" color={tipTextColor}>
                  <strong>Tip:</strong> Define parameters to extract from this {currentSection.isGroup ? 'group' : 'section'}. 
                  Be specific about what information you need and how to identify it. 
                  For table data, use comma-separated column names (e.g., "patient_name, date_of_birth, medical_record_number").
                  {currentSection.isGroup && ' The extraction will be performed on all sub-sections in this group.'}
                </Text>
              </Box>
            )}

            {/* Show message for loaded parameters */}
            {hasLoadedParameters(currentSection.id) && !hasTableData && (
              <Box mb={4} p={3} bg="green.900/20" borderRadius="md" border="1px solid" borderColor="green.700">
                <Text fontSize="sm" color="green.500">
                  <strong>Previously Extracted Parameters Found:</strong> This section has previously extracted parameters
                  {currentSection.isGroup ? ' from all sub-sections in the group' : ''}. 
                  You can modify the parameter definitions and click "Extract Parameters" to re-extract with updated settings, 
                  or use the "Re-extract" button to clear and start fresh.
                  {currentSection.isGroup && (
                    <Text fontSize="xs" color="purple.300" mt={2}>
                      💡 Group sections consolidate results from multiple sub-sections automatically.
                    </Text>
                  )}
                </Text>
              </Box>
            )}
            
            <Box maxH="500px" overflowY="auto" mb={4}
                css={{
                  '&::-webkit-scrollbar': {
                    width: '6px',
                  },
                  '&::-webkit-scrollbar-track': {
                    width: '8px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: scrollbarThumb,
                    borderRadius: '24px',
                  },
                }}
              >
            
            <VStack spacing={4} align="stretch" mb={4}>
              {(parameters[currentSection.id] || []).map((param, index) => {
                const extractedValue = formatExtractedValue(param);
                const isLoadedParam = param.isLoaded || param.isRegularParameter;
                
                return (
                  <Box 
                    key={index} 
                    p={3} 
                    bg={contentBgColor}
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor={isLoadedParam ? "green.600" : borderColor}
                    position="relative"
                  >
                    {/* Show loaded indicator */}
                    {isLoadedParam && (
                      <Badge 
                        position="absolute" 
                        top={2} 
                        right={2} 
                        colorScheme="green" 
                        size="sm"
                      >
                        LOADED
                      </Badge>
                    )}
                    
                    {/* Regular parameter inputs - show for non-table data */}
                    {!param.isTableData && !param.isLegacyTableData && (
                      <>
                        <FormControl mb={2}>
                          <FormLabel fontSize="sm" fontWeight="medium" color={labelColor}>
                            Parameter Name
                            {isTableParameter(param) && (
                              <Text as="span" fontSize="xs" color="blue.300" ml={2}>
                                (Table Columns)
                              </Text>
                            )}
                          </FormLabel>
                          <Input
                            value={param.name || ''}
                            placeholder={
                              param.name && param.name.includes(',') 
                                ? "e.g., patient_name, date_of_birth, medical_record_number"
                                : "e.g., test_performed, patient_name, blood_type"
                            }
                            size="sm"
                            color={textColor}
                            _placeholder={{ color: 'gray.400' }}
                            // Allow editing loaded parameters (they can be modified before re-extraction)
                            isReadOnly={false}
                            bg={isLoadedParam ? "yellow.900/10" : "transparent"}
                            onChange={(e) => {
                              const raw = e.target.value;

                              // For table columns (comma-separated), allow more flexibility
                              if (raw.includes(',')) {
                                // Allow letters, digits, spaces, underscores, and commas
                                const cleaned = raw.replace(/[^A-Za-z0-9_,\s]/g, '');
                                
                                // Split by comma, trim each part
                                const columns = cleaned.split(',').map(col => col.trim());
                                
                                // Join with comma and space
                                const normalized = columns.join(', ');
                                
                                onUpdateParameter(currentSection.id, index, 'name', normalized);
                              } else {
                                // Single parameter - use existing logic
                                const cleaned = raw.replace(/[^A-Za-z0-9_,\s]/g, '');

                                const segments = cleaned
                                  .split(',')
                                  .map(seg => seg.trim().replace(/\s+/g, '_'));

                                let normalized = segments.join(', ');

                                if (/, *$/.test(cleaned) && !normalized.endsWith(', ')) {
                                  normalized += ' ';
                                }

                                onUpdateParameter(
                                  currentSection.id,
                                  index,
                                  'name',
                                  normalized
                                );
                              }
                            }}
                          />
                          {isTableParameter(param) && (
                            <Text fontSize="xs" color="blue.300" mt={1}>
                              💡 This will extract multiple columns from tabulated data
                            </Text>
                          )}
                        </FormControl>

                        <FormControl>
                          <FormLabel fontSize="sm" fontWeight="medium" color={labelColor}>
                            Description (how to identify this parameter)
                          </FormLabel>
                          <Textarea
                            value={param.description || ''}
                            onChange={(e) => {
                              onUpdateParameter(currentSection.id, index, 'description', e.target.value);
                            }}
                            placeholder={
                              isTableParameter(param)
                                ? "e.g., Extract the table with patient information including name, DOB, and MRN columns"
                                : "e.g., Extract the name of the test panel that appears in the header"
                            }
                            size="sm"
                            rows={2}
                            color={textColor}
                            _placeholder={{ color: 'gray.400' }}
                            bg={isLoadedParam ? "yellow.900/10" : "transparent"}
                          />
                        </FormControl>
                      </>
                    )}
                    
                    {/* Show loaded parameter information */}
                    {isLoadedParam && renderLoadedParameterInfo(param)}
                    
                    {/* Table data display sections */}
                    {param.isTableData && (
                      <Box>
                        <Text fontSize="md" fontWeight="bold" color={param.isGroupResult ? "purple.200" : "blue.200"} mb={2}>
                          {param.name}
                        </Text>
                        <Text fontSize="sm" color={textColor} mb={2}>
                          {param.description}
                        </Text>
                        {param.isGroupResult ? renderGroupTableData(param) : renderStructuredTableData(param)}
                        <Box h="60px" />
                      </Box>
                    )}
                    
                    {/* Legacy table data display */}
                    {param.isLegacyTableData && (
                      <Box>
                        <Text fontSize="md" fontWeight="bold" color="blue.200" mb={2}>
                          {param.name}
                        </Text>
                        <Text fontSize="sm" color={textColor} mb={2}>
                          {param.description}
                        </Text>
                        {renderLegacyTableData(param)}
                      </Box>
                    )}
                    
                    {/* Regular parameter extracted value display - updated for loaded params */}
                    {param.isRegularParameter && extractedValue && !isLoadedParam && (
                      <Box mt={2}>
                        {param.isGroupResult ? (
                          renderGroupParameterData(param)
                        ) : (
                          <Box p={2} bg="blue.900/20" borderRadius="md">
                            <Text fontSize="sm" fontWeight="bold" color="blue.200">
                              Extracted Value:
                            </Text>
                            <Text fontSize="sm" color={textColor} wordBreak="break-word" mb={2}>
                              {extractedValue}
                            </Text>
                            
                            {/* Always show extraction method info */}
                            <VStack spacing={1} align="stretch">
                              {param.regex && (
                                <Box p={2} bg="gray.700" borderRadius="sm">
                                  <Text fontSize="xs" fontWeight="bold" color="green.300">
                                    Regex Pattern:
                                  </Text>
                                  <Text fontSize="xs" color="gray.200" fontFamily="mono" wordBreak="break-all">
                                    {param.regex}
                                  </Text>
                                </Box>
                              )}
                              
                              {param.extractionMethod && (
                                <Box p={2} bg="gray.700" borderRadius="sm">
                                  <Text fontSize="xs" fontWeight="bold" color="blue.300">
                                    Extraction Method:
                                  </Text>
                                  <Text fontSize="xs" color="gray.200">
                                    {param.extractionMethod}
                                  </Text>
                                </Box>
                              )}
                              
                              {param.confidence && (
                                <Box p={2} bg="gray.700" borderRadius="sm">
                                  <Text fontSize="xs" fontWeight="bold" color="yellow.300">
                                    Confidence:
                                  </Text>
                                  <Text fontSize="xs" color="gray.200">
                                    {param.confidence}%
                                  </Text>
                                </Box>
                              )}
                            </VStack>
                          </Box>
                        )}
                      </Box>
                    )}
                    
                    {/* Remove button - show for multiple parameters or non-essential single parameters */}
                    {((parameters[currentSection.id] && parameters[currentSection.id].length > 1) || 
                      (!param.isTableData && !param.isLegacyTableData && index > 0)) && (
                      <Button 
                        size="xs" 
                        colorScheme="red" 
                        variant="ghost" 
                        mt={2}
                        leftIcon={<DeleteIcon />}
                        onClick={() => {
                          if (typeof onRemoveParameter === 'function') {
                            onRemoveParameter(currentSection.id, index);
                          } else {
                            // Fallback if removeParameter not provided
                            const updatedParams = [...(parameters[currentSection.id] || [])];
                            updatedParams.splice(index, 1);
                            onUpdateParameter(currentSection.id, -1, 'updateAll', updatedParams);
                          }
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </Box>
                );
              })}
            </VStack>
            </Box>
            
            {/* Only show Add Parameter button if there are no table data parameters and no loaded parameters */}
            {!hasTableData && !hasExtractedData(currentSection.id) && (
              <Button
                leftIcon={<AddIcon />}
                variant="outline"
                colorScheme="gray"
                onClick={() => onAddParameter(currentSection.id)}
                width="full"
                mb={4}
              >
                Add Parameter
              </Button>
            )}
            
            <HStack spacing={4} mt={4}>
              <Button
                colorScheme={hasLoadedParameters(currentSection.id) ? "orange" : "blue"}
                onClick={() => handleExtract(currentSection)}
                isLoading={isLoading}
                loadingText="Extracting..."
                flex="1"
                isDisabled={
                  (parameters[currentSection.id] || []).length === 0 || 
                  (parameters[currentSection.id] || []).some(p => {
                    if (!p.isTableData && !p.isLegacyTableData) {
                      // For table parameters, just check that we have column names
                      if (isTableParameter(p)) {
                        const columns = p.name.split(',').map(c => c.trim()).filter(Boolean);
                        return columns.length === 0 || !p.description?.trim();
                      }
                      // For regular parameters
                      return !p.name?.trim() || !p.description?.trim();
                    }
                    return false;
                  })
                }
              >
                {hasLoadedParameters(currentSection.id) ? 'Re-extract Parameters' : 'Extract Parameters'} 
                {currentSection.isGroup ? '(All Sub-sections)' : ''}
              </Button>
            </HStack>
          </>
        )}

        {/* Show grouped sections overview when no currentSection */}
        {!currentSection && (
          <VStack spacing={4} align="stretch" maxH="600px" overflowY="auto">
            {/* Show message */}
            <Text color={textColor} textAlign="center">
              Use the Previous/Next buttons to navigate through sections, or expand sections below to see their structure.
            </Text>
            
            {/* Grouped sections display (read-only) */}
            {Object.entries(organizedSections.groups).map(([parentId, group]) => {
              const isExpanded = expandedSections.has(parentId);
              
              return (
                <Box key={parentId} bg="gray.800" borderRadius="md" borderWidth="1px" borderColor="gray.600" overflow="hidden">
                  <Flex
                    p={4}
                    align="center"
                    justify="space-between"
                    bg="purple.900/20"
                    cursor="pointer"
                    onClick={() => toggleSection(parentId)}
                    _hover={{ bg: 'purple.800/30' }}
                  >
                    <Box flex="1">
                      <Heading size="sm" color="purple.200" mb={1}>{group.parentName} (Group)</Heading>
                      <Text fontSize="xs" color="gray.400">
                        Group ID: {parentId} • {group.subSections.length} sub-sections
                      </Text>
                    </Box>
                    
                    <HStack spacing={2}>
                      <Badge colorScheme="purple" size="sm">Group Section</Badge>
                      <IconButton
                        icon={isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                        size="sm"
                        variant="ghost"
                        aria-label={isExpanded ? "Collapse section" : "Expand section"}
                      />
                    </HStack>
                  </Flex>

                  <Collapse in={isExpanded}>
                    <Box p={4} bg="gray.900">
                      <VStack spacing={2} align="stretch">
                        {group.subSections.map((subSection) => (
                          <Box key={subSection.id} p={3} bg="gray.800" borderRadius="md">
                            <Text fontSize="sm" fontWeight="medium" color="white">{subSection.title}</Text>
                            <Text fontSize="xs" color="gray.400" noOfLines={2}>
                              ID: {subSection.id} • {subSection.content?.substring(0, 100)}...
                            </Text>
                          </Box>
                        ))}
                      </VStack>
                    </Box>
                  </Collapse>
                </Box>
              );
            })}

            {/* Standalone sections */}
            {organizedSections.standaloneSections.map((section) => (
              <Box key={section.id} p={4} bg="gray.800" borderRadius="md">
                <Text fontSize="sm" fontWeight="medium" color="white">{section.title}</Text>
                <Text fontSize="xs" color="gray.400">
                  ID: {section.id} • Content Length: {section.content?.length || 0} chars
                </Text>
              </Box>
            ))}
          </VStack>
        )}

        {/* Navigation */}
        <HStack mt={4} spacing={4}>
          <Button leftIcon={<ChevronLeftIcon />} onClick={onPrev} variant="ghost" colorScheme="gray" flex="1">
            Previous
          </Button>
          <Button 
            rightIcon={<ChevronRightIcon />} 
            onClick={onNext} 
            colorScheme="blue" 
            flex="1"
            isDisabled={false}
          >
            Next
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};

export default ExtractStep;