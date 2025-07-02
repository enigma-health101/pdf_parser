import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Box, 
  VStack, 
  HStack, 
  Text, 
  Heading, 
  Badge, 
  Button, 
  Tabs, 
  TabList, 
  TabPanels, 
  Tab, 
  TabPanel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Alert,
  AlertIcon,
  Code,
  Divider,
  Flex,
  Wrap,
  WrapItem,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Spinner,
  useColorModeValue,
  Image
} from '@chakra-ui/react';
import { Download, ArrowRight, ArrowLeft, BarChart3, Eye } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const ViewResultsComponent = ({ 
  configurationData, 
  onEdit, 
  onComplete, 
  onBack 
}) => {
  const [selectedSection, setSelectedSection] = useState(null);
  const [apiData, setApiData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Fetch project structure from backend API
  useEffect(() => {
    const fetchProjectStructure = async () => {
      if (!configurationData?.projectDetails?.projectId) {
        setError('No project ID provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        const response = await axios.get(
          `${API_BASE_URL}/config/projects/${configurationData.projectDetails.projectId}/structure`
        );
        
        if (response.data) {
          setApiData(response.data);
          console.log('Project structure loaded:', response.data);
        } else {
          throw new Error('No data received from API');
        }
      } catch (err) {
        console.error('Error fetching project structure:', err);
        setError(err.response?.data?.error || err.message || 'Failed to load project structure');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectStructure();
  }, [configurationData?.projectDetails?.projectId]);

  if (isLoading) {
    return (
      <Box 
        bg="gray.800" 
        p={6} 
        borderRadius="lg" 
        color="white"
        display="flex" 
        alignItems="center" 
        justifyContent="center"
        minHeight="400px"
      >
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.300" />
          <Text color="gray.300">Loading project structure...</Text>
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box bg="gray.800" p={6} borderRadius="lg" color="white">
        <Alert status="error" borderRadius="md" mb={4}>
          <AlertIcon />
          <Box>
            <Text fontWeight="bold">Error Loading Project Structure</Text>
            <Text fontSize="sm">{error}</Text>
          </Box>
        </Alert>
        <Button onClick={onBack} colorScheme="gray" variant="outline">
          Go Back
        </Button>
      </Box>
    );
  }

  if (!apiData) {
    return (
      <Box bg="gray.800" p={6} borderRadius="lg" color="white" textAlign="center">
        <Text color="gray.400">No project data available</Text>
        <Button onClick={onBack} colorScheme="gray" variant="outline" mt={4}>
          Go Back
        </Button>
      </Box>
    );
  }

  // Determine template type from API data or configuration
  const templateType = apiData.template_type || configurationData?.templateType || 'running';
  const isFixedTemplate = templateType === 'fixed';

  // Extract parameters from the correct location based on template type
  let extractedParameters = [];
  let totalSections, sectionsWithSubsections, totalParameters, totalTableData, extractedParametersCount;

  if (isFixedTemplate) {
    // For fixed template, parameters are in raw_template_content.rawSecs
    extractedParameters = apiData.raw_template_content?.rawSecs || [];
    
    totalSections = extractedParameters.length;
    sectionsWithSubsections = 0; // Fixed format doesn't have subsections
    totalParameters = extractedParameters.length;
    extractedParametersCount = extractedParameters.filter(p => p.extracted_value && p.extracted_value !== 'No Known').length;
    totalTableData = 0; // Fixed format doesn't use table data in the same way
  } else {
    // For running template, use existing logic
    totalSections = Object.keys(apiData.sections || {}).length;
    sectionsWithSubsections = Object.values(apiData.sections || {}).filter(s => s.has_subsections).length;
    totalParameters = Object.values(apiData.parameter_configs || {}).reduce((total, config) => 
      total + (config.parameters?.length || 0), 0
    );
    totalTableData = Object.values(apiData.parameter_configs || {}).reduce((total, config) => 
      total + (config.tableConfig?.rowCount || 0), 0
    );
    extractedParametersCount = totalParameters;
  }

  const handleSectionDetail = (sectionId) => {
    setSelectedSection(sectionId);
    onOpen();
  };

  const downloadResults = () => {
    // Create a downloadable file with complete project structure
    const resultsData = {
      projectId: configurationData?.projectDetails?.projectId,
      templateType: templateType,
      processedAt: new Date().toISOString(),
      projectStructure: apiData,
      extractionSummary: {
        totalSections,
        sectionsWithSubsections,
        totalParameters,
        extractedParametersCount,
        totalTableData,
        templateType
      }
    };

    const blob = new Blob([JSON.stringify(resultsData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${configurationData?.projectDetails?.projectId || 'project'}-results.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Helper function to get confidence color
  const getConfidenceColor = (confidence) => {
    if (!confidence) return 'gray';
    const score = parseFloat(confidence);
    if (score >= 95) return 'green';
    if (score >= 80) return 'yellow';
    return 'red';
  };

  // Helper function to format confidence
  const formatConfidence = (confidence) => {
    if (!confidence) return 'N/A';
    return `${parseFloat(confidence).toFixed(1)}%`;
  };

  const convertPathToImageUrl = (imagePath, projectId) => {
  if (!imagePath) return null;
  
  // If it's already a web URL, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('/backend-projects/')) {
    return imagePath;
  }
  
  // Extract filename from the full path
  let filename = '';
  
  if (imagePath.includes('/images/')) {
    // Extract everything after /images/
    filename = imagePath.split('/images/')[1];
  } else {
    // Fallback: just get the filename
    filename = imagePath.split('/').pop();
  }
  
  // Use symbolic link path through Next.js public directory
  return `/backend-projects/${projectId}/images/${filename}`;
};

  // Render fixed template parameters from rawSecs
  const renderFixedTemplateParameters = () => {
    if (!extractedParameters || extractedParameters.length === 0) {
      return (
        <Box bg="gray.700" p={4} borderRadius="md" textAlign="center">
          <Text color="gray.400">No extracted parameters found</Text>
        </Box>
      );
    }

    return (
      <VStack spacing={4} align="stretch">
        {extractedParameters.map((param, index) => (
          <Box key={param.section_id || index} bg="gray.700" p={4} borderRadius="md" border="1px solid" borderColor="gray.600">
            <HStack justify="space-between" mb={3}>
              <VStack align="start" spacing={1}>
                <Text fontWeight="bold" color="white" fontSize="md">
                  {param.parameter_name || `Parameter ${index + 1}`}
                </Text>
                <Text fontSize="xs" color="gray.400">
                  ID: {param.section_id} • Page: {param.page || 1}
                </Text>
              </VStack>
              
              <VStack align="end" spacing={1}>
                {param.confidence && (
                  <Badge 
                    colorScheme={getConfidenceColor(param.confidence)}
                    size="sm"
                  >
                    {formatConfidence(param.confidence)}
                  </Badge>
                )}
                <Badge colorScheme="blue" size="sm">
                  {param.extraction_method?.toUpperCase() || 'VISION EXTRACTED'}
                </Badge>
              </VStack>
            </HStack>

            {/* Extracted Value */}
            <Box mb={3} p={3} bg="gray.800" borderRadius="md">
              <Text fontSize="sm" fontWeight="bold" color="green.300" mb={2}>
                Extracted Value:
              </Text>
              <Box p={2} bg="gray.900" borderRadius="sm" border="1px solid" borderColor="green.600">
                <Text fontSize="sm" color="white" fontFamily="mono">
                  {param.extracted_value || 'No value extracted'}
                </Text>
              </Box>
            </Box>

            {/* Show cropped image if available */}
            {param.image_crop_path && (
            <Box mb={3} p={3} bg="blue.900/20" borderRadius="md">
              <Text fontSize="sm" fontWeight="bold" color="blue.300" mb={2}>
                Extracted Region Image:
              </Text>
              <Box maxW="200px" maxH="100px" overflow="hidden" borderRadius="md">
                <Image 
                  src={convertPathToImageUrl(param.image_crop_path, configurationData?.projectDetails?.projectId)} 
                  alt={`Cropped region for ${param.parameter_name}`}
                  maxW="100%"
                  maxH="100%"
                  objectFit="contain"
                  onError={(e) => {
                    console.error('Image failed to load:', e.target.src);
                    // You could set a fallback image here
                  }}
                  fallback={
                    <Box bg="gray.600" p={2} borderRadius="md">
                      <Text fontSize="xs" color="gray.400">Image not available</Text>
                    </Box>
                  }
                />
              </Box>
            </Box>
          )}

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

                    {/* Original Frontend Coordinates */}
                    {param.original_frontend_coords && (
                      <Box p={2} bg="gray.800" borderRadius="sm">
                        <Text fontSize="xs" fontWeight="bold" color="yellow.300">
                          Frontend Coordinates:
                        </Text>
                        <Text fontSize="xs" color="gray.200" fontFamily="mono">
                          x1: {param.original_frontend_coords.x1}, y1: {param.original_frontend_coords.y1}, 
                          x2: {param.original_frontend_coords.x2}, y2: {param.original_frontend_coords.y2}
                        </Text>
                      </Box>
                    )}

                    {/* PDF Bounding Box */}
                    {param.bbox && (
                      <Box p={2} bg="gray.800" borderRadius="sm">
                        <Text fontSize="xs" fontWeight="bold" color="orange.300">
                          PDF Bounding Box:
                        </Text>
                        <Text fontSize="xs" color="gray.200" fontFamily="mono">
                          x1: {param.bbox.x1?.toFixed(2)}, y1: {param.bbox.y1?.toFixed(2)}, 
                          x2: {param.bbox.x2?.toFixed(2)}, y2: {param.bbox.y2?.toFixed(2)}
                        </Text>
                      </Box>
                    )}

                    {/* Image Bounding Box */}
                    {param.image_bbox && (
                      <Box p={2} bg="gray.800" borderRadius="sm">
                        <Text fontSize="xs" fontWeight="bold" color="purple.300">
                          Image Bounding Box:
                        </Text>
                        <Text fontSize="xs" color="gray.200" fontFamily="mono">
                          x1: {param.image_bbox.x1}, y1: {param.image_bbox.y1}, 
                          x2: {param.image_bbox.x2}, y2: {param.image_bbox.y2}
                        </Text>
                      </Box>
                    )}

                    {param.extraction_prompt && (
                      <Box p={2} bg="gray.800" borderRadius="sm">
                        <Text fontSize="xs" fontWeight="bold" color="green.300">
                          Extraction Prompt:
                        </Text>
                        <Text fontSize="xs" color="gray.200">
                          {param.extraction_prompt}
                        </Text>
                      </Box>
                    )}

                    {param.content && param.content !== param.extracted_value && (
                      <Box p={2} bg="gray.800" borderRadius="sm">
                        <Text fontSize="xs" fontWeight="bold" color="gray.300">
                          Raw Content:
                        </Text>
                        <Text fontSize="xs" color="gray.200" fontFamily="mono">
                          {param.content}
                        </Text>
                      </Box>
                    )}

                    {/* Canvas Info Used */}
                    {param.canvas_info_used && (
                      <Box p={2} bg="gray.800" borderRadius="sm">
                        <Text fontSize="xs" fontWeight="bold" color="cyan.300">
                          Canvas Scale Info:
                        </Text>
                        <Text fontSize="xs" color="gray.200" fontFamily="mono">
                          Scale X: {param.canvas_info_used.calculatedScaleX?.toFixed(6)}, 
                          Scale Y: {param.canvas_info_used.calculatedScaleY?.toFixed(6)}
                        </Text>
                      </Box>
                    )}

                    {/* Scale Factors */}
                    {param.scale_factors && (
                      <Box p={2} bg="gray.800" borderRadius="sm">
                        <Text fontSize="xs" fontWeight="bold" color="pink.300">
                          Scale Factors:
                        </Text>
                        <Text fontSize="xs" color="gray.200" fontFamily="mono">
                          X: {param.scale_factors.x?.toFixed(6)}, Y: {param.scale_factors.y?.toFixed(6)}
                        </Text>
                      </Box>
                    )}

                    {/* Character and Word Count */}
                    <Box p={2} bg="gray.800" borderRadius="sm">
                      <Text fontSize="xs" fontWeight="bold" color="teal.300">
                        Content Stats:
                      </Text>
                      <Text fontSize="xs" color="gray.200">
                        Characters: {param.char_count || 0}, Words: {param.word_count || 0}
                      </Text>
                    </Box>
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </Box>
        ))}
      </VStack>
    );
  };

  const renderParameterTable = (parameters) => (
    <Table size="sm" variant="simple">
      <Thead>
        <Tr>
          <Th color="blue.300">Parameter</Th>
          <Th color="blue.300">Description</Th>
          <Th color="blue.300">Value</Th>
          <Th color="blue.300">Confidence</Th>
        </Tr>
      </Thead>
      <Tbody>
        {parameters.map((param, index) => (
          <Tr key={index}>
            <Td>
              <Code fontSize="sm" colorScheme="blue">{param.name}</Code>
            </Td>
            <Td fontSize="sm" color="gray.300" maxW="200px">
              <Text noOfLines={2} title={param.description}>
                {param.description}
              </Text>
            </Td>
            <Td fontSize="sm" maxW="200px">
              <Text noOfLines={2} title={Array.isArray(param.extractedValue) 
                ? param.extractedValue.join(', ') 
                : param.extractedValue || 'No value'}>
                {Array.isArray(param.extractedValue) 
                  ? param.extractedValue.join(', ') 
                  : param.extractedValue || 'No value'}
              </Text>
            </Td>
            <Td>
              <Badge colorScheme={param.confidence === '100' ? 'green' : 'yellow'} size="sm">
                {param.confidence}%
              </Badge>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );

  const renderTableData = (tableConfig) => (
    <Box>
      <Text fontSize="sm" color="gray.400" mb={2}>
        Table with {tableConfig.rowCount} rows and {tableConfig.columns?.length || 0} columns
      </Text>
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            {tableConfig.columns?.map((col, index) => (
              <Th key={index} color="purple.300">{col}</Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {tableConfig.extractedTableData?.slice(0, 5).map((row, index) => (
            <Tr key={index}>
              {tableConfig.columns?.map((col, colIndex) => (
                <Td key={colIndex} fontSize="sm">{row[col] || '-'}</Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>
      {tableConfig.extractedTableData?.length > 5 && (
        <Text fontSize="xs" color="gray.500" mt={2} textAlign="center">
          ... and {tableConfig.extractedTableData.length - 5} more rows
        </Text>
      )}
    </Box>
  );

  return (
    <Box bg="gray.800" p={6} borderRadius="lg" color="white" maxH="800px" overflowY="auto">
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6}>
        <VStack align="start" spacing={1}>
          <Heading as="h2" size="lg" color="white">
            Configuration Complete - View Results
          </Heading>
          <Text fontSize="sm" color="gray.400">
            Project: {configurationData?.projectDetails?.projectId} | File: {apiData.file_id}
          </Text>
          <HStack spacing={2}>
            <Badge colorScheme={isFixedTemplate ? "orange" : "blue"} variant="solid">
              {templateType.toUpperCase()} FORMAT
            </Badge>
            {isFixedTemplate && (
              <Badge colorScheme="green" variant="outline">
                VISION EXTRACTED
              </Badge>
            )}
          </HStack>
        </VStack>
        <Badge colorScheme="green" variant="solid" px={3} py={1} borderRadius="full">
          READY FOR USE
        </Badge>
      </Flex>

      {/* Statistics Overview */}
      <Box bg="gray.700" p={4} borderRadius="md" mb={6}>
        <Heading as="h3" size="md" mb={4} color="blue.300">
          Extraction Summary
        </Heading>
        <Wrap spacing={4}>
          <WrapItem>
            <Box textAlign="center" p={3} bg="gray.600" borderRadius="md">
              <Text fontSize="2xl" fontWeight="bold" color="blue.300">{totalSections}</Text>
              <Text fontSize="sm" color="gray.400">
                {isFixedTemplate ? 'Total Regions' : 'Total Sections'}
              </Text>
            </Box>
          </WrapItem>
          {!isFixedTemplate && (
            <WrapItem>
              <Box textAlign="center" p={3} bg="gray.600" borderRadius="md">
                <Text fontSize="2xl" fontWeight="bold" color="orange.300">{sectionsWithSubsections}</Text>
                <Text fontSize="sm" color="gray.400">With Subsections</Text>
              </Box>
            </WrapItem>
          )}
          <WrapItem>
            <Box textAlign="center" p={3} bg="gray.600" borderRadius="md">
              <Text fontSize="2xl" fontWeight="bold" color="purple.300">{totalParameters}</Text>
              <Text fontSize="sm" color="gray.400">
                {isFixedTemplate ? 'Extracted Parameters' : 'Parameters'}
              </Text>
            </Box>
          </WrapItem>
          {isFixedTemplate ? (
            <WrapItem>
              <Box textAlign="center" p={3} bg="gray.600" borderRadius="md">
                <Text fontSize="2xl" fontWeight="bold" color="green.300">{extractedParametersCount}</Text>
                <Text fontSize="sm" color="gray.400">Successful Extractions</Text>
              </Box>
            </WrapItem>
          ) : (
            <WrapItem>
              <Box textAlign="center" p={3} bg="gray.600" borderRadius="md">
                <Text fontSize="2xl" fontWeight="bold" color="green.300">{totalTableData}</Text>
                <Text fontSize="sm" color="gray.400">Table Rows</Text>
              </Box>
            </WrapItem>
          )}
        </Wrap>
      </Box>

      {/* Main Content Tabs */}
      <Tabs variant="enclosed" colorScheme="blue">
        <TabList>
          <Tab>Template Content</Tab>
          <Tab>Configuration Details</Tab>
          {isFixedTemplate && <Tab>Region Analysis</Tab>}
        </TabList>

        <TabPanels>
          {/* Template Content Tab */}
          <TabPanel px={0}>
            <VStack spacing={6} align="stretch">
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm" color="gray.600">
                  {isFixedTemplate 
                    ? 'Template content shows the extracted parameters from selected regions using vision analysis.'
                    : 'Template content shows the extracted tabulated data and parameters ready for use.'
                  }
                </Text>
              </Alert>

              {isFixedTemplate ? (
                /* Fixed Template Parameters */
                <Box>
                  <Heading as="h3" size="md" mb={4} color="green.300">
                    Extracted Parameters from Regions
                  </Heading>
                  {renderFixedTemplateParameters()}
                </Box>
              ) : (
                /* Running Template Content */
                <>
                  {/* Tabulated Data Section */}
                  <Box>
                    <Heading as="h3" size="md" mb={4} color="purple.300">
                      Extracted Table Data
                    </Heading>
                    {Object.entries(apiData.parameter_configs || {}).filter(([_, config]) => 
                      config.tableConfig?.extractedTableData?.length > 0
                    ).length > 0 ? (
                      Object.entries(apiData.parameter_configs || {}).map(([sectionId, config]) => {
                        if (!config.tableConfig?.extractedTableData?.length) return null;
                        
                        return (
                          <Box key={sectionId} bg="gray.700" p={4} borderRadius="md" mb={4}>
                            <HStack justify="space-between" mb={3}>
                              <Text fontWeight="bold" color="white">
                                {sectionId.replace(/_/g, ' ')}
                              </Text>
                              <Badge colorScheme="purple" size="sm">
                                {config.tableConfig.rowCount} rows
                              </Badge>
                            </HStack>
                            {renderTableData(config.tableConfig)}
                          </Box>
                        );
                      })
                    ) : (
                      <Box bg="gray.700" p={4} borderRadius="md" textAlign="center">
                        <Text color="gray.400">No table data extracted</Text>
                      </Box>
                    )}
                  </Box>

                  {/* Parameters Section */}
                  <Box>
                    <Heading as="h3" size="md" mb={4} color="blue.300">
                      Extracted Parameters
                    </Heading>
                    {Object.entries(apiData.parameter_configs || {}).filter(([_, config]) => 
                      config.parameters?.length > 0
                    ).length > 0 ? (
                      Object.entries(apiData.parameter_configs || {}).map(([sectionId, config]) => {
                        if (!config.parameters?.length) return null;
                        
                        return (
                          <Box key={sectionId} bg="gray.700" p={4} borderRadius="md" mb={4}>
                            <HStack justify="space-between" mb={3}>
                              <Text fontWeight="bold" color="white">
                                {sectionId.replace(/_/g, ' ')}
                              </Text>
                              <Badge colorScheme="blue" size="sm">
                                {config.parameters.length} parameters
                              </Badge>
                            </HStack>
                            {renderParameterTable(config.parameters)}
                          </Box>
                        );
                      })
                    ) : (
                      <Box bg="gray.700" p={4} borderRadius="md" textAlign="center">
                        <Text color="gray.400">No parameters extracted</Text>
                      </Box>
                    )}
                  </Box>
                </>
              )}
            </VStack>
          </TabPanel>

          {/* Configuration Details Tab */}
          <TabPanel px={0}>
            <VStack spacing={6} align="stretch">
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm" color="gray.600">
                  {isFixedTemplate 
                    ? 'Configuration details show the complete structure including regions, coordinate mappings, and extraction methods.'
                    : 'Configuration details show the complete structure including sections, subsections, and extraction methods.'
                  }
                </Text>
              </Alert>

              {/* Project Metadata */}
              <Box bg="gray.700" p={4} borderRadius="md">
                <Heading as="h4" size="sm" mb={3} color="yellow.300">
                  Project Metadata
                </Heading>
                <VStack spacing={2} align="stretch">
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="gray.300">Project ID:</Text>
                    <Code fontSize="sm">{apiData.project_id || configurationData?.projectDetails?.projectId}</Code>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="gray.300">File ID:</Text>
                    <Code fontSize="xs">{apiData.file_id}</Code>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="gray.300">Template Type:</Text>
                    <Badge colorScheme={isFixedTemplate ? "orange" : "green"}>
                      {templateType.toUpperCase()} Format
                    </Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="gray.300">
                      {isFixedTemplate ? 'Total Regions:' : 'Total Configurations:'}
                    </Text>
                    <Badge colorScheme="blue">
                      {isFixedTemplate 
                        ? extractedParameters.length
                        : Object.keys(apiData.parameter_configs || {}).length
                      }
                    </Badge>
                  </HStack>
                  {isFixedTemplate && apiData.raw_split_config && (
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="gray.300">Extraction Method:</Text>
                      <Badge colorScheme="green">
                        {apiData.raw_split_config.extractionMethod || apiData.raw_template_content?.extractionMethod || 'Vision Model'}
                      </Badge>
                    </HStack>
                  )}
                </VStack>
                {!isFixedTemplate && apiData.split_prompt && (
                  <Box mt={3} pt={3} borderTop="1px" borderColor="gray.600">
                    <Text fontSize="sm" color="gray.300" mb={1}>Split Prompt:</Text>
                    <Box bg="gray.600" p={2} borderRadius="md">
                      <Text fontSize="xs" color="gray.200">{apiData.split_prompt}</Text>
                    </Box>
                  </Box>
                )}
              </Box>

              {/* Canvas and PDF Information for Fixed Template */}
              {isFixedTemplate && apiData.raw_split_config?.canvasInfo && (
                <Box bg="gray.700" p={4} borderRadius="md">
                  <Heading as="h4" size="sm" mb={3} color="cyan.300">
                    Canvas & PDF Information
                  </Heading>
                  <VStack spacing={2} align="stretch">
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="gray.300">Canvas Scale X:</Text>
                      <Code fontSize="xs">{apiData.raw_split_config.canvasInfo.calculatedScaleX?.toFixed(6)}</Code>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="gray.300">Canvas Scale Y:</Text>
                      <Code fontSize="xs">{apiData.raw_split_config.canvasInfo.calculatedScaleY?.toFixed(6)}</Code>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="gray.300">Canvas Size:</Text>
                      <Text fontSize="xs" color="gray.200">
                        {apiData.raw_split_config.canvasInfo.canvasActualSize?.width} × {apiData.raw_split_config.canvasInfo.canvasActualSize?.height}
                      </Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="gray.300">PDF Page Size:</Text>
                      <Text fontSize="xs" color="gray.200">
                        {apiData.raw_split_config.canvasInfo.pdfPageSize?.width} × {apiData.raw_split_config.canvasInfo.pdfPageSize?.height}
                      </Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="gray.300">Coordinate System:</Text>
                      <Badge colorScheme="purple" size="sm">
                        {apiData.raw_split_config.canvasInfo.coordinateSystem || 'canvas-pixels-to-pdf-points'}
                      </Badge>
                    </HStack>
                  </VStack>
                </Box>
              )}

              {/* Sections/Regions Overview */}
              <Box>
                <Heading as="h3" size="md" mb={4} color="green.300">
                  {isFixedTemplate ? 'Extracted Parameters Structure' : 'Document Structure'}
                </Heading>
                
                {isFixedTemplate ? (
                  /* Fixed Template - Show extracted parameters */
                  <VStack spacing={3} align="stretch">
                    {extractedParameters.map((param, index) => (
                      <Box key={param.section_id || index} bg="gray.700" p={4} borderRadius="md" border="1px solid" borderColor="gray.600">
                        <HStack justify="space-between" mb={3}>
                          <Text fontWeight="bold" color="white">
                            {param.parameter_name || `Parameter ${index + 1}`}
                          </Text>
                          <HStack spacing={2}>
                            <Badge colorScheme="green" size="sm">
                              Page {param.page || 1}
                            </Badge>
                            {param.confidence && (
                              <Badge 
                                colorScheme={getConfidenceColor(param.confidence)}
                                size="sm"
                              >
                                {formatConfidence(param.confidence)}
                              </Badge>
                            )}
                            <Badge colorScheme="blue" size="sm">
                              {param.type || 'parameter_section'}
                            </Badge>
                          </HStack>
                        </HStack>
                        
                        <VStack spacing={2} align="stretch">
                          <Box>
                            <Text fontSize="sm" fontWeight="bold" color="gray.300" mb={1}>
                              Extracted Content:
                            </Text>
                            <Box bg="gray.600" p={3} borderRadius="md">
                              <Text fontSize="sm" color="gray.200">
                                {param.extracted_value || 'No value extracted'}
                              </Text>
                            </Box>
                          </Box>

                          {param.extraction_prompt && (
                            <Box>
                              <Text fontSize="sm" fontWeight="bold" color="blue.300" mb={1}>
                                Extraction Prompt:
                              </Text>
                              <Box bg="gray.600" p={2} borderRadius="md">
                                <Text fontSize="xs" color="gray.200">
                                  {param.extraction_prompt}
                                </Text>
                              </Box>
                            </Box>
                          )}

                          <Button 
                            size="sm" 
                            variant="outline" 
                            colorScheme="blue"
                            alignSelf="start"
                            onClick={() => handleSectionDetail(param.section_id)}
                          >
                            View Full Details
                          </Button>
                        </VStack>
                      </Box>
                    ))}
                  </VStack>
                ) : (
                  /* Running Template - Show document structure */
                  <Accordion allowMultiple>
                    {Object.entries(apiData.sections || {}).map(([sectionId, section]) => (
                      <AccordionItem key={sectionId} border="1px" borderColor="gray.600">
                        <AccordionButton bg="gray.700" _hover={{ bg: "gray.600" }}>
                          <Box flex="1" textAlign="left">
                            <HStack>
                              <Text fontWeight="bold" color="white">
                                {sectionId.replace(/_/g, ' ')}
                              </Text>
                              {section.has_subsections && (
                                <Badge colorScheme="orange" size="sm">
                                  {section.subsection_count} subsections
                                </Badge>
                              )}
                              <Badge 
                                colorScheme={apiData.parameter_configs[sectionId]?.parameters?.length ? "green" : "gray"} 
                                size="sm"
                              >
                                {apiData.parameter_configs[sectionId]?.parameters?.length || 0} params
                              </Badge>
                            </HStack>
                          </Box>
                          <AccordionIcon />
                        </AccordionButton>
                        <AccordionPanel pb={4} bg="gray.750">
                          <VStack spacing={3} align="stretch">
                            <Box>
                              <Text fontSize="sm" fontWeight="bold" color="gray.300" mb={2}>
                                Content Preview:
                              </Text>
                              <Box bg="gray.600" p={3} borderRadius="md">
                                <Text fontSize="sm" color="gray.200" noOfLines={3}>
                                  {section.content ? section.content.substring(0, 200) + '...' : 'No content available'}
                                </Text>
                              </Box>
                            </Box>

                            {apiData.parameter_configs[sectionId] && (
                              <Box>
                                <Text fontSize="sm" fontWeight="bold" color="blue.300" mb={2}>
                                  Configuration Details:
                                </Text>
                                <Box bg="gray.600" p={3} borderRadius="md">
                                  <VStack spacing={1} align="stretch">
                                    <HStack justify="space-between">
                                      <Text fontSize="xs" color="gray.400">Section ID:</Text>
                                      <Code fontSize="xs">{apiData.parameter_configs[sectionId]?.sectionId}</Code>
                                    </HStack>
                                    {apiData.parameter_configs[sectionId]?.parentSectionId && (
                                      <HStack justify="space-between">
                                        <Text fontSize="xs" color="gray.400">Parent Section:</Text>
                                        <Code fontSize="xs">{apiData.parameter_configs[sectionId].parentSectionId}</Code>
                                      </HStack>
                                    )}
                                    <HStack justify="space-between">
                                      <Text fontSize="xs" color="gray.400">File ID:</Text>
                                      <Code fontSize="xs">{apiData.parameter_configs[sectionId]?.fileId}</Code>
                                    </HStack>
                                  </VStack>
                                </Box>
                              </Box>
                            )}

                            <Button 
                              size="sm" 
                              variant="outline" 
                              colorScheme="blue"
                              alignSelf="start"
                              onClick={() => handleSectionDetail(sectionId)}
                            >
                              View Full Details
                            </Button>
                          </VStack>
                        </AccordionPanel>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </Box>

              {/* Raw JSON Preview */}
              <Box bg="gray.700" p={4} borderRadius="md">
                <Heading as="h4" size="sm" mb={3} color="red.300">
                  Raw API Response Preview
                </Heading>
                <Box bg="gray.900" p={3} borderRadius="md" overflowX="auto">
                  <Code fontSize="xs" color="green.300" whiteSpace="pre-wrap">
                    {JSON.stringify(apiData, null, 2).substring(0, 1000)}...
                  </Code>
                </Box>
                <Button
                  size="sm"
                  variant="outline"
                  colorScheme="blue"
                  mt={2}
                  onClick={downloadResults}
                >
                  Download Full Response
                </Button>
              </Box>
            </VStack>
          </TabPanel>

          {/* Region Analysis Tab - Only for Fixed Template */}
          {isFixedTemplate && (
            <TabPanel px={0}>
              <VStack spacing={6} align="stretch">
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <Text fontSize="sm" color="gray.600">
                    Region analysis shows coordinate mappings, confidence scores, and extraction details for fixed format regions.
                  </Text>
                </Alert>

                {/* Region Statistics */}
                <Box bg="gray.700" p={4} borderRadius="md">
                  <Heading as="h4" size="sm" mb={3} color="purple.300">
                    Region Analysis Summary
                  </Heading>
                  <Wrap spacing={4}>
                    <WrapItem>
                      <Box textAlign="center" p={3} bg="gray.600" borderRadius="md">
                        <Text fontSize="lg" fontWeight="bold" color="green.300">
                          {extractedParameters.filter(p => p.extracted_value && p.extracted_value !== 'No Known').length}
                        </Text>
                        <Text fontSize="xs" color="gray.400">Successful Extractions</Text>
                      </Box>
                    </WrapItem>
                    <WrapItem>
                      <Box textAlign="center" p={3} bg="gray.600" borderRadius="md">
                        <Text fontSize="lg" fontWeight="bold" color="yellow.300">
                          {extractedParameters.filter(p => 
                            p.confidence && parseFloat(p.confidence) >= 90
                          ).length}
                        </Text>
                        <Text fontSize="xs" color="gray.400">High Confidence (≥90%)</Text>
                      </Box>
                    </WrapItem>
                    <WrapItem>
                      <Box textAlign="center" p={3} bg="gray.600" borderRadius="md">
                        <Text fontSize="lg" fontWeight="bold" color="blue.300">
                          {[...new Set(extractedParameters.map(p => p.page || 1))].length}
                        </Text>
                        <Text fontSize="xs" color="gray.400">Pages Processed</Text>
                      </Box>
                    </WrapItem>
                    <WrapItem>
                      <Box textAlign="center" p={3} bg="gray.600" borderRadius="md">
                        <Text fontSize="lg" fontWeight="bold" color="orange.300">
                          {extractedParameters.filter(p => p.image_crop_path).length}
                        </Text>
                        <Text fontSize="xs" color="gray.400">With Crop Images</Text>
                      </Box>
                    </WrapItem>
                  </Wrap>
                </Box>

                {/* Region Details */}
                <Box>
                  <Heading as="h4" size="sm" mb={3} color="orange.300">
                    Region Coordinate Mappings
                  </Heading>
                  <VStack spacing={3} align="stretch">
                    {extractedParameters.map((param, index) => (
                      <Box key={param.section_id || index} bg="gray.700" p={4} borderRadius="md" border="1px solid" borderColor="gray.600">
                        <HStack justify="space-between" mb={3}>
                          <Text fontWeight="bold" color="white">
                            {param.parameter_name || `Parameter ${index + 1}`}
                          </Text>
                          <HStack spacing={2}>
                            <Badge colorScheme="purple" size="sm">
                              Page {param.page || 1}
                            </Badge>
                            {param.confidence && (
                              <Badge 
                                colorScheme={getConfidenceColor(param.confidence)}
                                size="sm"
                              >
                                {formatConfidence(param.confidence)}
                              </Badge>
                            )}
                          </HStack>
                        </HStack>
                        
                        {/* Coordinate Information */}
                        <VStack spacing={2} align="stretch">
                          {param.original_frontend_coords && (
                            <Box p={2} bg="gray.800" borderRadius="sm">
                              <Text fontSize="xs" fontWeight="bold" color="yellow.300" mb={1}>
                                Frontend Coordinates:
                              </Text>
                              <Text fontSize="xs" color="gray.200" fontFamily="mono">
                                x1: {param.original_frontend_coords.x1}, y1: {param.original_frontend_coords.y1}, 
                                x2: {param.original_frontend_coords.x2}, y2: {param.original_frontend_coords.y2}
                              </Text>
                            </Box>
                          )}

                          {param.bbox && (
                            <Box p={2} bg="gray.800" borderRadius="sm">
                              <Text fontSize="xs" fontWeight="bold" color="orange.300" mb={1}>
                                PDF Coordinates:
                              </Text>
                              <Text fontSize="xs" color="gray.200" fontFamily="mono">
                                x1: {param.bbox.x1?.toFixed(2)}, y1: {param.bbox.y1?.toFixed(2)}, 
                                x2: {param.bbox.x2?.toFixed(2)}, y2: {param.bbox.y2?.toFixed(2)}
                              </Text>
                            </Box>
                          )}

                          {param.scale_factors && (
                            <Box p={2} bg="gray.800" borderRadius="sm">
                              <Text fontSize="xs" fontWeight="bold" color="pink.300" mb={1}>
                                Scale Factors:
                              </Text>
                              <Text fontSize="xs" color="gray.200" fontFamily="mono">
                                X: {param.scale_factors.x?.toFixed(6)}, Y: {param.scale_factors.y?.toFixed(6)}
                              </Text>
                            </Box>
                          )}
                        </VStack>
                        
                        <Box mt={3} p={2} bg="gray.800" borderRadius="sm">
                          <Text fontSize="xs" fontWeight="bold" color="green.300" mb={1}>
                            Extracted Value:
                          </Text>
                          <Text fontSize="xs" color="gray.200">
                            {param.extracted_value || 'No value extracted'}
                          </Text>
                        </Box>
                      </Box>
                    ))}
                  </VStack>
                </Box>
              </VStack>
            </TabPanel>
          )}
        </TabPanels>
      </Tabs>

      {/* Action Buttons */}
      <Divider my={6} />
      <HStack spacing={4} justify="center">
        <Button
          leftIcon={<ArrowLeft />}
          colorScheme="yellow"
          onClick={onBack}
        >
          Back to {isFixedTemplate ? 'Projects' : 'Projects'}
        </Button>
        <Button
          colorScheme="blue"
          onClick={() => onEdit && onEdit()}
        >
          Edit Configuration
        </Button>
        <Button
          rightIcon={<ArrowRight />}
          colorScheme="green"
          onClick={() => onComplete && onComplete()}
        >
          Schema Mapping
        </Button>
      </HStack>

      {/* Section Detail Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent bg="gray.800" color="white" maxW="800px">
          <ModalHeader>
            {isFixedTemplate ? 'Parameter' : 'Section'} Details: {selectedSection?.replace(/_/g, ' ')}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody maxH="600px" overflowY="auto">
            {selectedSection && (
              <VStack spacing={4} align="stretch">
                {isFixedTemplate ? (
                  /* Fixed Template Parameter Details */
                  (() => {
                    const param = extractedParameters.find(p => p.section_id === selectedSection);
                    if (!param) return <Text color="gray.400">Parameter not found</Text>;
                    
                    return (
                      <Box>
                        <Text fontWeight="bold" mb={2}>Parameter Configuration:</Text>
                        <Box bg="gray.700" p={3} borderRadius="md">
                          <VStack spacing={2} align="stretch">
                            <HStack justify="space-between">
                              <Text fontSize="sm" color="gray.300">Parameter Name:</Text>
                              <Code fontSize="sm">{param.parameter_name}</Code>
                            </HStack>
                            <HStack justify="space-between">
                              <Text fontSize="sm" color="gray.300">Section ID:</Text>
                              <Code fontSize="sm">{param.section_id}</Code>
                            </HStack>
                            <HStack justify="space-between">
                              <Text fontSize="sm" color="gray.300">Page:</Text>
                              <Text fontSize="sm" color="gray.200">{param.page || 1}</Text>
                            </HStack>
                            <HStack justify="space-between">
                              <Text fontSize="sm" color="gray.300">Confidence:</Text>
                              <Badge colorScheme={getConfidenceColor(param.confidence)}>
                                {formatConfidence(param.confidence)}
                              </Badge>
                            </HStack>
                            <HStack justify="space-between">
                              <Text fontSize="sm" color="gray.300">Extracted Value:</Text>
                              <Text fontSize="sm" color="gray.200" maxW="300px" noOfLines={3}>
                                {param.extracted_value || 'No value'}
                              </Text>
                            </HStack>
                            <HStack justify="space-between">
                              <Text fontSize="sm" color="gray.300">Extraction Method:</Text>
                              <Badge colorScheme="blue" size="sm">
                                {param.extraction_method || 'vision_model'}
                              </Badge>
                            </HStack>
                            {param.char_count && (
                              <HStack justify="space-between">
                                <Text fontSize="sm" color="gray.300">Content Stats:</Text>
                                <Text fontSize="sm" color="gray.200">
                                  {param.char_count} chars, {param.word_count || 0} words
                                </Text>
                              </HStack>
                            )}
                          </VStack>
                        </Box>

                        {/* Show cropped image if available */}
                        {param.image_crop_path && (
                          <Box mt={4}>
                            <Text fontWeight="bold" mb={2}>Extracted Region Image:</Text>
                            <Box maxW="400px" maxH="200px" overflow="hidden" borderRadius="md" border="1px solid" borderColor="gray.600">
                              <Image 
                                src={convertPathToImageUrl(param.image_crop_path, configurationData?.projectDetails?.projectId)} 
                                alt={`Cropped region for ${param.parameter_name}`}
                                maxW="100%"
                                maxH="100%"
                                objectFit="contain"
                                onError={(e) => {
                                  console.error('Image failed to load:', e.target.src);
                                }}
                                fallback={
                                  <Box bg="gray.600" p={4} borderRadius="md" textAlign="center">
                                    <Text fontSize="sm" color="gray.400">Image not available</Text>
                                  </Box>
                                }
                              />
                            </Box>
                          </Box>
                        )}

                        {/* Coordinate Details */}
                        {(param.original_frontend_coords || param.bbox || param.scale_factors) && (
                          <Box mt={4}>
                            <Text fontWeight="bold" mb={2}>Coordinate Details:</Text>
                            <VStack spacing={2} align="stretch">
                              {param.original_frontend_coords && (
                                <Box p={2} bg="gray.700" borderRadius="sm">
                                  <Text fontSize="xs" fontWeight="bold" color="yellow.300">Frontend Coordinates:</Text>
                                  <Text fontSize="xs" color="gray.200" fontFamily="mono">
                                    x1: {param.original_frontend_coords.x1}, y1: {param.original_frontend_coords.y1}, 
                                    x2: {param.original_frontend_coords.x2}, y2: {param.original_frontend_coords.y2}
                                  </Text>
                                </Box>
                              )}
                              {param.bbox && (
                                <Box p={2} bg="gray.700" borderRadius="sm">
                                  <Text fontSize="xs" fontWeight="bold" color="orange.300">PDF Coordinates:</Text>
                                  <Text fontSize="xs" color="gray.200" fontFamily="mono">
                                    x1: {param.bbox.x1?.toFixed(2)}, y1: {param.bbox.y1?.toFixed(2)}, 
                                    x2: {param.bbox.x2?.toFixed(2)}, y2: {param.bbox.y2?.toFixed(2)}
                                  </Text>
                                </Box>
                              )}
                              {param.scale_factors && (
                                <Box p={2} bg="gray.700" borderRadius="sm">
                                  <Text fontSize="xs" fontWeight="bold" color="pink.300">Scale Factors:</Text>
                                  <Text fontSize="xs" color="gray.200" fontFamily="mono">
                                    X: {param.scale_factors.x?.toFixed(6)}, Y: {param.scale_factors.y?.toFixed(6)}
                                  </Text>
                                </Box>
                              )}
                            </VStack>
                          </Box>
                        )}
                      </Box>
                    );
                  })()
                ) : (
                  /* Running Template Section Details */
                  apiData.parameter_configs[selectedSection] && (
                    <Box>
                      <Text fontWeight="bold" mb={2}>Configuration:</Text>
                      <Box bg="gray.700" p={3} borderRadius="md">
                        <VStack spacing={2} align="stretch">
                          <HStack justify="space-between">
                            <Text fontSize="sm" color="gray.300">Section ID:</Text>
                            <Code fontSize="sm">{apiData.parameter_configs[selectedSection].sectionId}</Code>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="sm" color="gray.300">File ID:</Text>
                            <Code fontSize="xs">{apiData.parameter_configs[selectedSection].fileId}</Code>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="sm" color="gray.300">Parent Section:</Text>
                            <Text fontSize="sm" color="gray.200">
                              {apiData.parameter_configs[selectedSection].parentSectionId || 'None'}
                            </Text>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="sm" color="gray.300">Project ID:</Text>
                            <Code fontSize="sm">{apiData.parameter_configs[selectedSection].projectId}</Code>
                          </HStack>
                        </VStack>
                      </Box>

                      {apiData.parameter_configs[selectedSection].parameters?.length > 0 && (
                        <Box>
                          <Text fontWeight="bold" mb={2}>
                            Parameters ({apiData.parameter_configs[selectedSection].parameters.length}):
                          </Text>
                          {renderParameterTable(apiData.parameter_configs[selectedSection].parameters)}
                        </Box>
                      )}

                      {apiData.parameter_configs[selectedSection].tableConfig?.extractedTableData && (
                        <Box>
                          <Text fontWeight="bold" mb={2}>Table Data:</Text>
                          {renderTableData(apiData.parameter_configs[selectedSection].tableConfig)}
                        </Box>
                      )}
                    </Box>
                  )
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ViewResultsComponent;