// steps/ReviewStep.js - Updated for fixed template workflow
import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Text, 
  Flex, 
  Heading, 
  VStack,
  HStack,
  Divider,
  Badge,
  Textarea,
  Collapse,
  IconButton,
  Alert,
  AlertIcon,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  useColorModeValue,
  FormControl,
  FormLabel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Code,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText
} from '@chakra-ui/react';
import { ChevronDownIcon, ChevronUpIcon, CheckIcon, EditIcon, InfoIcon } from '@chakra-ui/icons';

const ReviewStep = ({ 
  sections = [], 
  onConfirm, 
  onRedo,
  onSubSplit,
  isLoading,
  projectDetails,
  loadedSubsections = {},
  templateType = 'running' // Add templateType prop
}) => {
  // Color mode values for consistent theming
  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.700', 'gray.300');
  const headerBg = useColorModeValue('blue.50', 'blue.900/20');
  const headerText = useColorModeValue('blue.600', 'blue.200');

  const [expandedSections, setExpandedSections] = useState(new Set());
  const [activeSplitSection, setActiveSplitSection] = useState(null);
  const [subSplitPrompts, setSubSplitPrompts] = useState({});
  const [error, setError] = useState(null);

  // Toggle section expansion
  const toggleSection = (sectionId) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // Expand all sections
  const expandAll = () => {
    setExpandedSections(new Set(sections.map(s => s.id)));
  };

  // Collapse all sections
  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  // Get truncated content for preview
  const getTruncatedContent = (content, maxLength = 200) => {
    if (!content) return 'No content available';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  // Format confidence score
  const formatConfidence = (confidence) => {
    if (!confidence) return 'N/A';
    return `${parseFloat(confidence).toFixed(1)}%`;
  };

  // Get confidence color
  const getConfidenceColor = (confidence) => {
    if (!confidence) return 'gray';
    const score = parseFloat(confidence);
    if (score >= 95) return 'green';
    if (score >= 90) return 'yellow';
    if (score >= 80) return 'orange';
    return 'red';
  };

  // Handle showing split form for a specific section
  const showSplitForm = (section) => {
    setActiveSplitSection(section.id);
    if (!subSplitPrompts[section.id]) {
      setSubSplitPrompts(prev => ({
        ...prev,
        [section.id]: ''
      }));
    }
    setError(null);
  };

  // Handle hiding split form
  const hideSplitForm = () => {
    setActiveSplitSection(null);
    setError(null);
  };

  // Handle prompt change for specific section
  const handlePromptChange = (sectionId, value) => {
    setSubSplitPrompts(prev => ({
      ...prev,
      [sectionId]: value
    }));
  };

  // Handle sub-split execution
  const handleSubSplitSection = async (section) => {
    const prompt = subSplitPrompts[section.id];
    
    if (!prompt || !prompt.trim()) {
      setError('Please provide sub-splitting instructions');
      return;
    }
    
    setError(null);
    try {
      await onSubSplit(section, prompt);
      setSubSplitPrompts(prev => ({
        ...prev,
        [section.id]: ''
      }));
      setActiveSplitSection(null);
    } catch (err) {
      setError(err.message || 'Failed to sub-split section');
    }
  };

  // Check if sections contain extracted parameters
  const hasExtractedParameters = sections.some(section => section.isParameterSection);

  // Organize sections into groups (detect sub-sections) - maintaining original order
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

  // Render parameter section content (for fixed template extracted parameters)
  const renderParameterSection = (section) => {
    return (
      <Box>
        {/* Parameter Information Table */}
        <TableContainer mb={4}>
          <Table size="sm" variant="simple">
            <Thead>
              <Tr>
                <Th color="blue.300">Property</Th>
                <Th color="blue.300">Value</Th>
              </Tr>
            </Thead>
            <Tbody>
              <Tr>
                <Td fontWeight="bold" color="gray.300">Extracted Value</Td>
                <Td>
                  <Code colorScheme="green" fontSize="sm">
                    {section.extractedValue || 'N/A'}
                  </Code>
                </Td>
              </Tr>
              <Tr>
                <Td fontWeight="bold" color="gray.300">Confidence</Td>
                <Td>
                  <Badge 
                    colorScheme={getConfidenceColor(section.confidence)}
                    variant="solid"
                  >
                    {formatConfidence(section.confidence)}
                  </Badge>
                </Td>
              </Tr>
              <Tr>
                <Td fontWeight="bold" color="gray.300">Extraction Method</Td>
                <Td>
                  <Text fontSize="sm" color="gray.400">
                    {section.extractionMethod || 'N/A'}
                  </Text>
                </Td>
              </Tr>
              <Tr>
                <Td fontWeight="bold" color="gray.300">Page</Td>
                <Td>
                  <Badge colorScheme="purple" variant="outline">
                    Page {section.page || 1}
                  </Badge>
                </Td>
              </Tr>
              <Tr>
                <Td fontWeight="bold" color="gray.300">Content Stats</Td>
                <Td>
                  <Text fontSize="sm" color="gray.400">
                    {section.characterCount || 0} chars, {section.wordCount || 0} words
                  </Text>
                </Td>
              </Tr>
              {section.processingTimestamp && (
                <Tr>
                  <Td fontWeight="bold" color="gray.300">Processed At</Td>
                  <Td>
                    <Text fontSize="sm" color="gray.400">
                      {new Date(section.processingTimestamp).toLocaleString()}
                    </Text>
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </TableContainer>

        {/* Coordinate Information */}
        {section.bbox && (
          <Box mb={4} p={3} bg="blue.900/20" borderRadius="md">
            <Text fontSize="sm" color="blue.200" fontWeight="bold" mb={2}>
              Region Coordinates:
            </Text>
            <VStack spacing={1} align="start">
              <Text fontSize="xs" color="blue.100">
                Bounding Box: {JSON.stringify(section.bbox, null, 2)}
              </Text>
              {section.imageBbox && (
                <Text fontSize="xs" color="blue.100">
                  Image Box: {JSON.stringify(section.imageBbox, null, 2)}
                </Text>
              )}
              {section.originalFrontendCoords && (
                <Text fontSize="xs" color="blue.100">
                  Frontend Coords: {JSON.stringify(section.originalFrontendCoords, null, 2)}
                </Text>
              )}
            </VStack>
          </Box>
        )}

        {/* Raw Content */}
        {section.content && (
          <Box mb={4}>
            <Text fontSize="sm" color="gray.300" fontWeight="bold" mb={2}>
              Raw Content:
            </Text>
            <Box 
              bg="gray.800" 
              borderRadius="md" 
              maxH="200px"
              overflowY="auto"
              border="1px solid"
              borderColor="gray.600"
              p={3}
            >
              <Text fontSize="sm" color="gray.300" fontFamily="mono">
                {section.content}
              </Text>
            </Box>
          </Box>
        )}

        {/* Extraction Prompt */}
        {section.extractionPrompt && (
          <Box mb={4} p={3} bg="yellow.900/20" borderRadius="md">
            <Text fontSize="sm" color="yellow.200" fontWeight="bold" mb={2}>
              Extraction Prompt:
            </Text>
            <Text fontSize="sm" color="yellow.100">
              {section.extractionPrompt}
            </Text>
          </Box>
        )}
      </Box>
    );
  };

  // Render section content with proper formatting (original function)
  const renderSectionContent = (section) => {
    // For extracted parameters, use the parameter-specific renderer
    if (section.isParameterSection) {
      return renderParameterSection(section);
    }

    if (!section.content) return <Text color="gray.400" fontStyle="italic">No content available</Text>;
    
    if (typeof section.content === 'object') {
      return (
        <Box>
          <Text fontSize="sm" color="gray.400" mb={2}>Raw object data:</Text>
          <Box 
            as="pre" 
            fontSize="xs" 
            bg="gray.900" 
            p={3} 
            borderRadius="md" 
            overflow="auto"
            maxH="400px"
            color="white"
          >
            {JSON.stringify(section.content, null, 2)}
          </Box>
        </Box>
      );
    }
    
    const lines = section.content.split('\n');
    return (
      <Box>
        {lines.map((line, index) => (
          <Text key={index} fontSize="sm" mb={1} color="white">
            {line || '\u00A0'}
          </Text>
        ))}
        <Box h="240px" />
      </Box>
    );
  };

  if (!sections || sections.length === 0) {
    return (
      <Box
        bg={bgColor}
        p={6}
        borderRadius="lg"
        borderWidth="1px"
        borderColor={borderColor}
      >
        <Alert status="warning" borderRadius="md" mb={4}>
          <AlertIcon />
          No sections found. Please go back and try splitting the document again.
        </Alert>
        
        <Button
          onClick={onRedo}
          colorScheme="blue"
          variant="outline"
          width="full"
        >
          Go Back to Split
        </Button>
      </Box>
    );
  }

  return (
    <Box
      bg={bgColor}
      p={6}
      borderRadius="lg"
      borderWidth="1px"
      borderColor={borderColor}
      shadow="sm"
    >
      {/* Global Error Display */}
      {error && (
        <Alert status="error" mb={4} borderRadius="md" bg="red.900/20">
          <AlertIcon color="red.300" />
          <Text color="red.300" fontSize="sm">{error}</Text>
        </Alert>
      )}

      {/* Header Section */}
      <Box mb={6}>
        <Heading size="md" mb={2} color={textColor}>
          {hasExtractedParameters ? 'Review Extracted Parameters' : 'Review Document Sections'}
        </Heading>
        <Text fontSize="sm" color="gray.500" mb={4}>
          {sections.length} {hasExtractedParameters ? 'parameter' : 'section'}{sections.length !== 1 ? 's' : ''} detected. 
          {hasExtractedParameters 
            ? ' Review each extracted parameter and its confidence score.'
            : ' Review each section and use sub-split if needed.'
          }
        </Text>
        
        <HStack spacing={2} mb={4}>
          <Button size="sm" variant="outline" colorScheme="green" onClick={expandAll}>
            Expand
          </Button>
          <Button size="sm" variant="outline" colorScheme="blue" onClick={collapseAll}>
            Collapse
          </Button>
          <Badge colorScheme="blue" variant="subtle">
            {sections.length} {hasExtractedParameters ? 'Parameters' : 'Sections'}
          </Badge>
          {Object.keys(organizedSections.groups).length > 0 && (
            <Badge colorScheme="purple" variant="subtle">
              {Object.keys(organizedSections.groups).length} Group{Object.keys(organizedSections.groups).length !== 1 ? 's' : ''}
            </Badge>
          )}
          {hasExtractedParameters && (
            <Badge colorScheme="green" variant="subtle">
              Extracted
            </Badge>
          )}
          <Badge colorScheme={templateType === 'fixed' ? 'orange' : 'blue'} variant="subtle">
            {templateType.toUpperCase()} FORMAT
          </Badge>
        </HStack>
      </Box>

      {/* SUCCESS: Sections Successfully Loaded */}
      {sections.length > 0 && (
        <Alert status="success" mb={4} borderRadius="md">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold" fontSize="sm">
              {hasExtractedParameters ? 'Parameters Successfully Extracted' : 'Sections Successfully Loaded'}
            </Text>
            <Text fontSize="xs" color="gray.500" mt={1}>
              {hasExtractedParameters 
                ? 'Parameters have been extracted from the selected regions. Review the confidence scores and extracted values below.'
                : 'These sections were created from your split operation. You can review them below, use sub-split to break them into smaller pieces, or proceed to parameter extraction.'
              }
              {templateType === 'fixed' && hasExtractedParameters && (
                <Text as="span" color="orange.400" fontWeight="bold">
                  {' '}For fixed format PDFs, parameters are extracted automatically during splitting.
                </Text>
              )}
            </Text>
          </Box>
        </Alert>
      )}

      {/* INFO: Pre-loaded Subsections Found */}
      {Object.keys(loadedSubsections).length > 0 && (
        <Alert status="info" mb={4} borderRadius="md">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold" fontSize="sm">Pre-loaded Subsections Found</Text>
            <Text fontSize="xs" color="gray.500" mt={1}>
              Found existing subsections for {Object.keys(loadedSubsections).length} section(s): {' '}
              {Object.keys(loadedSubsections).map(sectionId => {
                const section = sections.find(s => s.id === sectionId);
                return section?.title || sectionId;
              }).join(', ')}
            </Text>
          </Box>
        </Alert>
      )}

      {/* Extraction Summary for Parameter Sections */}
      {hasExtractedParameters && (
        <Box mb={6} p={4} bg="green.900/20" borderRadius="md" border="1px solid" borderColor="green.500/30">
          <Heading size="sm" mb={3} color="green.300">
            Extraction Summary
          </Heading>
          <HStack spacing={2} wrap="wrap">
            <Stat size="sm">
              <StatLabel color="green.500">Total Parameters</StatLabel>
              <StatNumber color="green.300">{sections.length}</StatNumber>
            </Stat>
            <Stat size="sm">
              <StatLabel color="green.500">High Confidence (≥95%)</StatLabel>
              <StatNumber color="green.500">
                {sections.filter(s => s.confidence && parseFloat(s.confidence) >= 95).length}
              </StatNumber>
            </Stat>
            <Stat size="sm">
              <StatLabel color="yellow.500">Medium Confidence (90-94%)</StatLabel>
              <StatNumber color="yellow.400">
                {sections.filter(s => s.confidence && parseFloat(s.confidence) >= 90 && parseFloat(s.confidence) < 95).length}
              </StatNumber>
            </Stat>
            <Stat size="sm">
              <StatLabel color="red.500">Low Confidence (&lt;90%)</StatLabel>
              <StatNumber color="red.300">
                {sections.filter(s => s.confidence && parseFloat(s.confidence) < 90).length}
              </StatNumber>
            </Stat>
          </HStack>
        </Box>
      )}

      {/* Sections List - maintaining original order */}
      <Box maxH="600px" overflowY="auto" mb={6}>
        <VStack spacing={4} align="stretch">
          {/* Render sections in original order */}
          {sections.map((section, index) => {
            const isExpanded = expandedSections.has(section.id);
            const contentPreview = getTruncatedContent(
              section.extractedValue || section.content, 
              hasExtractedParameters ? 100 : 200
            );
            
            // Skip sub-sections - they'll be rendered as part of their parent group
            const isSubSection = section.isSubSection || 
                                section.parentSectionId || 
                                section.id.includes('_section_');
            
            if (isSubSection && !hasExtractedParameters) {
              return null;
            }
            
            // Check if this section has sub-sections (only for running format)
            const hasSubSections = !hasExtractedParameters && templateType === 'running' && sections.some(other => 
              other.id !== section.id && 
              (other.parentSectionId === section.id || 
              other.id.startsWith(section.id + '_section_'))
            );
            
            if (hasSubSections) {
              // This section has sub-sections - render as group
              const subSections = sections.filter(other => 
                other.id !== section.id && 
                (other.parentSectionId === section.id || 
                other.id.startsWith(section.id + '_section_'))
              );
              
              return (
                <Box key={section.id}>
                  <Box
                    bg="gray.800"
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="gray.600"
                    overflow="hidden"
                  >
                    {/* Group Header */}
                    <Flex
                      p={4}
                      align="center"
                      justify="space-between"
                      bg="purple.900/20"
                      cursor="pointer"
                      onClick={() => toggleSection(section.id)}
                      _hover={{ bg: 'purple.800/30' }}
                    >
                      <Box flex="1">
                        <Heading size="sm" color="purple.200" mb={1}>
                          {section.title} (Group)
                        </Heading>
                        <Text fontSize="xs" color="gray.400">
                          Parent ID: {section.id} • {subSections.length} sub-sections
                        </Text>
                      </Box>
                      
                      <HStack spacing={2}>
                        <Badge colorScheme="purple" size="sm">
                          Group Section
                        </Badge>
                        {/* ALWAYS show re-split button for groups */}
                        <Button
                          size="xs"
                          colorScheme="orange"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            showSplitForm(section);
                          }}
                          isDisabled={isLoading}
                        >
                          Re-Split
                        </Button>
                        <IconButton
                          icon={isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                          size="sm"
                          variant="ghost"
                          aria-label={isExpanded ? "Collapse group" : "Expand group"}
                        />
                      </HStack>
                    </Flex>

                    {/* Group Content */}
                    <Collapse in={isExpanded}>
                      <Box p={4} bg="gray.900">
                        {/* Parent Section */}
                        <Box mb={4} p={3} bg="gray.800" borderRadius="md" border="1px solid" borderColor="purple.600">
                          <Text fontSize="sm" color="purple.200" fontWeight="bold" mb={2}>
                            Parent Section:
                          </Text>
                          <Text fontSize="sm" fontWeight="medium" color="white">
                            {section.title}
                          </Text>
                          <Text fontSize="xs" color="gray.400" mb={2}>
                            ID: {section.id} • Content: {section.content?.length || 0} chars
                          </Text>
                          <Box 
                            bg="gray.900" 
                            borderRadius="md" 
                            maxH="200px"
                            overflowY="auto"
                            border="1px solid"
                            borderColor="gray.600"
                            p={3}
                          >
                            <Text fontSize="xs" color="gray.300" fontFamily="mono">
                              {getTruncatedContent(section.content, 300)}
                            </Text>
                          </Box>
                        </Box>
                        
                        <Text fontSize="sm" color="purple.200" mb={3} fontWeight="medium">
                          Sub-sections in this group:
                        </Text>
                        
                        <VStack spacing={3} align="stretch">
                          {subSections.map((subSection, subIndex) => (
                            <Box key={subSection.id} bg="gray.800" borderRadius="md" p={3}>
                              <HStack justify="space-between" align="start" mb={2}>
                                <Box flex="1">
                                  <Text fontSize="sm" fontWeight="medium" color="white">
                                    {subSection.title}
                                  </Text>
                                  <Text fontSize="xs" color="gray.400">
                                    ID: {subSection.id} • Content: {subSection.content?.length || 0} chars
                                  </Text>
                                </Box>
                              </HStack>
                              
                              <Box 
                                bg="gray.900" 
                                borderRadius="md" 
                                maxH="200px"
                                overflowY="auto"
                                border="1px solid"
                                borderColor="gray.600"
                                p={3}
                              >
                                <Text fontSize="xs" color="gray.300" fontFamily="mono">
                                  {getTruncatedContent(subSection.content, 300)}
                                </Text>
                              </Box>
                            </Box>
                          ))}
                        </VStack>
                      </Box>
                    </Collapse>
                  </Box>
                </Box>
              );
            } else {
              // This is a standalone section (no sub-sections) or extracted parameter
              return (
                <Box key={section.id || index}>
                  <Box
                    bg="gray.800"
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="gray.600"
                    overflow="hidden"
                  >
                    {/* Section Header */}
                    <Flex
                      p={4}
                      align="center"
                      justify="space-between"
                      bg={section.isParameterSection ? "green.900/20" : headerBg}
                      cursor="pointer"
                      onClick={() => toggleSection(section.id)}
                      _hover={{ bg: section.isParameterSection ? "green.800/30" : 'gray.600' }}
                    >
                      <Box flex="1">
                        <Heading size="sm" color={section.isParameterSection ? "green.200" : headerText} mb={1}>
                          {section.title || `${hasExtractedParameters ? 'Parameter' : 'Section'} ${index + 1}`}
                        </Heading>
                        <HStack spacing={2}>
                          <Text fontSize="xs" color="gray.400">
                            ID: {section.id}
                          </Text>
                          {section.isParameterSection && section.confidence && (
                            <Badge 
                              colorScheme={getConfidenceColor(section.confidence)}
                              size="sm"
                            >
                              {formatConfidence(section.confidence)}
                            </Badge>
                          )}
                          {section.page && (
                            <Badge colorScheme="purple" size="sm">
                              Page {section.page}
                            </Badge>
                          )}
                          {!section.isParameterSection && (
                            <Text fontSize="xs" color="gray.400">
                              Content Length: {section.content?.length || 0} chars
                            </Text>
                          )}
                        </HStack>
                      </Box>
                      
                      <HStack spacing={2}>
                        {section.isParameterSection && (
                          <Badge colorScheme="green" size="sm">
                            Vision Extracted
                          </Badge>
                        )}
                        {section.region && (
                          <Badge colorScheme="blue" size="sm">
                            Region Based
                          </Badge>
                        )}
                        {/* Only show sub-split button for running format standalone sections */}
                        {!hasExtractedParameters && templateType === 'running' && (
                          <Button
                            size="xs"
                            colorScheme="orange"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              showSplitForm(section);
                            }}
                            isDisabled={isLoading}
                          >
                            Sub-Split
                          </Button>
                        )}
                        <IconButton
                          icon={isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                          size="sm"
                          variant="ghost"
                          aria-label={isExpanded ? "Collapse section" : "Expand section"}
                        />
                      </HStack>
                    </Flex>

                    {/* Section Content */}
                    <Collapse in={isExpanded}>
                      <Box p={4} bg="gray.900">
                        {/* Region Info (if applicable) */}
                        {section.region && (
                          <Box mb={3} p={2} bg="blue.900/20" borderRadius="md">
                            <Text fontSize="xs" color="blue.200">
                              <strong>Region:</strong> ({Math.round(section.region.x1)}, {Math.round(section.region.y1)}) 
                              to ({Math.round(section.region.x2)}, {Math.round(section.region.y2)})
                              {section.region.page && ` - Page ${section.region.page}`}
                            </Text>
                          </Box>
                        )}
                        
                        {/* Content Display */}
                        <Box 
                          bg="gray.800" 
                          borderRadius="md" 
                          maxH="400px"
                          overflowY="auto"
                          border="1px solid"
                          borderColor="gray.600"
                        >
                          <Box p={4}>
                            {renderSectionContent(section)}
                          </Box>
                        </Box>
                      </Box>
                    </Collapse>

                    {/* Content Preview (when collapsed) */}
                    {!isExpanded && (
                      <Box p={3} bg="gray.900" borderTop="1px solid" borderColor="gray.600">
                        <Text fontSize="xs" color="gray.100" fontStyle="italic">
                          {section.isParameterSection ? 
                            `Extracted: ${section.extractedValue || 'N/A'}` : 
                            contentPreview
                          }
                        </Text>
                      </Box>
                    )}
                  </Box>
                </Box>
              );
            }
          })}
        </VStack>
      </Box>

      {/* Sub-Split Form - Only show for running format (not for fixed format) */}
      {activeSplitSection && !hasExtractedParameters && templateType === 'running' && (
        <Box mb={6}>
          <Box 
            bg="orange.900/10"
            border="2px solid"
            borderColor="orange.500"
            borderRadius="lg"
            p={6}
            shadow="lg"
          >
            {/* Header */}
            <Flex justify="space-between" align="center" mb={4}>
              <Box>
                <Text fontSize="lg" fontWeight="bold" color="orange.300">
                  {loadedSubsections[activeSplitSection] ? 'Re-Split Section' : 'Sub-Split Section'}
                </Text>
                <Text fontSize="md" color="gray.300" mt={1}>
                  {sections.find(s => s.id === activeSplitSection)?.title || 'Section'}
                  {loadedSubsections[activeSplitSection] && (
                    <Badge ml={2} colorScheme="yellow" size="sm">
                      Has {loadedSubsections[activeSplitSection].subsections.length} existing subsections
                    </Badge>
                  )}
                </Text>
              </Box>
              <Button
                size="sm"
                variant="ghost"
                onClick={hideSplitForm}
                color="gray.300"
                fontSize="xl"
                _hover={{ bg: "gray.600" }}
                w="40px"
                h="40px"
              >
                ×
              </Button>
            </Flex>
            
            {/* Instructions */}
            <Text fontSize="sm" color="gray.500" mb={4} lineHeight="1.6">
              {loadedSubsections[activeSplitSection] 
                ? `This section already has ${loadedSubsections[activeSplitSection].subsections.length} subsections. Enter new instructions to re-split this section, which will replace the existing subsections.`
                : 'Enter detailed instructions to split this section into smaller sub-sections. Be specific about how to identify where one sub-section ends and another begins.'
              }
            </Text>
            
            {/* Form */}
            <Box mb={4}>
              <Text fontSize="sm" fontWeight="medium" color="orange.400" mb={3}>
                Sub-splitting Instructions:
              </Text>
              
              <Textarea
                value={subSplitPrompts[activeSplitSection] || ''}
                onChange={(e) => handlePromptChange(activeSplitSection, e.target.value)}
                placeholder='Example: "Split into sub-sections where each section starts with a number followed by a period (like 1., 2., 3.) and ends before the next numbered item."'
                rows={10}
                bg="gray.800"
                color="white"
                borderColor="orange.400"
                borderWidth="2px"
                _focus={{ 
                  borderColor: "orange.300",
                  boxShadow: "0 0 0 2px rgba(251, 146, 60, 0.3)"
                }}
                _placeholder={{ 
                  color: "gray.400"
                }}
                resize="vertical"
                fontSize="sm"
                p={4}
                minH="200px"
                w="100%"
                isDisabled={isLoading}
              />
            </Box>
            
            {/* Error message */}
            {error && (
              <Box mb={4} p={3} bg="red.900/30" borderRadius="md" border="1px solid red.500">
                <Text color="red.300" fontSize="sm">{error}</Text>
              </Box>
            )}
            
            {/* Action buttons */}
            <Flex gap={4}>
              <Button
                size="lg"
                bg="orange.500"
                color="white"
                onClick={() => {
                  const section = sections.find(s => s.id === activeSplitSection);
                  if (section) handleSubSplitSection(section);
                }}
                isLoading={isLoading}
                loadingText={loadedSubsections[activeSplitSection] ? "Re-splitting..." : "Splitting..."}
                isDisabled={!subSplitPrompts[activeSplitSection]?.trim()}
                flex="1"
                fontWeight="medium"
                _hover={{ bg: "orange.600" }}
                _disabled={{ bg: "gray.600", color: "gray.400" }}
                h="50px"
                fontSize="md"
              >
                {loadedSubsections[activeSplitSection] ? 'Apply Re-Split' : 'Apply Sub-Split'}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={hideSplitForm}
                flex="1"
                fontWeight="medium"
                borderColor="gray.400"
                borderWidth="2px"
                color="gray.300"
                _hover={{ bg: "gray.600" }}
                _disabled={{ bg: "gray.600", color: "gray.400" }}
                h="50px"
                fontSize="md"
                isDisabled={isLoading}
              >
                Cancel
              </Button>
            </Flex>
          </Box>
        </Box>
      )}

      {/* Summary Box */}
      <Box 
        p={4} 
        bg={headerBg} 
        borderRadius="md" 
        mb={6}
        borderWidth="1px"
        borderColor={borderColor}
      >
        <Heading size="sm" mb={2} color={headerText}>
          Summary
        </Heading>
        <VStack align="start" spacing={1}>
          <Text fontSize="sm" color={textColor}>
            • Template Type: {templateType.toUpperCase()}
          </Text>
          <Text fontSize="sm" color={textColor}>
            • Total {hasExtractedParameters ? 'parameters' : 'sections'}: {sections.length}
          </Text>
          {!hasExtractedParameters && (
            <>
              <Text fontSize="sm" color={textColor}>
                • Group sections: {Object.keys(organizedSections.groups).length}
              </Text>
              <Text fontSize="sm" color={textColor}>
                • Standalone sections: {organizedSections.standaloneSections.length}
              </Text>
              <Text fontSize="sm" color={textColor}>
                • Sections with content: {sections.filter(s => s.content && s.content.trim()).length}
              </Text>
              <Text fontSize="sm" color={textColor}>
                • Region-based sections: {sections.filter(s => s.region).length}
              </Text>
            </>
          )}
          {hasExtractedParameters && (
            <>
              <Text fontSize="sm" color={textColor}>
                • High confidence (≥95%): {sections.filter(s => s.confidence && parseFloat(s.confidence) >= 95).length}
              </Text>
              <Text fontSize="sm" color={textColor}>
                • Medium confidence (90-94%): {sections.filter(s => s.confidence && parseFloat(s.confidence) >= 90 && parseFloat(s.confidence) < 95).length}
              </Text>
              <Text fontSize="sm" color={textColor}>
                • Low confidence (&lt;90%): {sections.filter(s => s.confidence && parseFloat(s.confidence) < 90).length}
              </Text>
              <Text fontSize="sm" color={textColor}>
                • Parameters with regions: {sections.filter(s => s.bbox).length}
              </Text>
            </>
          )}
        </VStack>
      </Box>

      {/* Action Buttons */}
      <Flex justify="space-between" align="center">
        <Button
          onClick={onRedo}
          variant="outline"
          colorScheme="gray"
          leftIcon={<EditIcon />}
          isDisabled={isLoading}
        >
          {hasExtractedParameters ? 'Re-Process' : 'Redo Split'}
        </Button>
        
        <Button
          onClick={onConfirm}
          colorScheme="blue"
          leftIcon={<CheckIcon />}
          size="md"
          isDisabled={isLoading}
        >
          {templateType === 'fixed' 
            ? (hasExtractedParameters ? 'View Results' : 'Confirm & View Results')
            : (hasExtractedParameters ? 'Accept & Continue' : 'Confirm & Continue')
          }
        </Button>
      </Flex>

      {/* Help Text */}
      <Box mt={4} p={3} bg="blue.900/10" borderRadius="md" borderWidth="1px" borderColor="blue.500/20">
        <Text fontSize="xs" color="blue.200">
          <strong>Next Step:</strong> {templateType === 'fixed' 
            ? (hasExtractedParameters 
                ? 'Parameters have been extracted from your regions. You can proceed directly to view results.'
                : 'After confirming, you\'ll proceed directly to view the extraction results for your fixed format PDF.'
              )
            : (hasExtractedParameters 
                ? 'Parameters have been extracted from your regions. You can proceed to view results or configure additional extraction settings.'
                : 'After confirming, you\'ll define extraction parameters. Group sections will be treated as single units with shared parameters applied to all sub-sections. Use the Sub-Split button next to any section to break it into smaller, more manageable pieces.'
              )
          }
        </Text>
      </Box>
    </Box>
  );
};

export default ReviewStep;