// components/ProjectSummary.js
import React, { useState } from 'react';
import {
  Box,
  Text,
  Heading,
  VStack,
  HStack,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Divider,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  useColorModeValue,
  Alert,
  AlertIcon,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Code
} from '@chakra-ui/react';
import { Database, ArrowRight, Download, Settings } from 'lucide-react';

const ProjectSummary = ({ 
  project, 
  sections, 
  parameters, 
  extractedData,
  onSchemaMapping, 
  onBack 
}) => {
  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Calculate summary statistics
  const totalSections = sections.length;
  const totalParameters = Object.values(parameters).flat().length;
  const sectionsWithParameters = Object.keys(parameters).filter(
    sectionId => parameters[sectionId] && parameters[sectionId].length > 0
  ).length;

  // Organize parameters by type
  const parametersByType = {
    table: [],
    regular: [],
    group: []
  };

  Object.entries(parameters).forEach(([sectionId, sectionParams]) => {
    const section = sections.find(s => s.id === sectionId);
    sectionParams.forEach(param => {
      const paramWithSection = {
        ...param,
        sectionId,
        sectionTitle: section?.title || sectionId
      };
      
      if (param.isTableData) {
        parametersByType.table.push(paramWithSection);
      } else if (param.isGroupResult) {
        parametersByType.group.push(paramWithSection);
      } else {
        parametersByType.regular.push(paramWithSection);
      }
    });
  });

  const renderParameterValue = (param) => {
    if (param.isTableData && param.tableData) {
      return (
        <Box>
          <Text fontSize="sm" color="blue.300">
            Table with {param.tableData.totalRows || param.tableData.rows?.length || 0} rows
          </Text>
          {param.tableData.headers && (
            <Text fontSize="xs" color="gray.400">
              Columns: {param.tableData.headers.join(', ')}
            </Text>
          )}
        </Box>
      );
    }
    
    if (param.value) {
      return (
        <Text fontSize="sm" color="gray.300" noOfLines={2}>
          {param.value}
        </Text>
      );
    }
    
    return (
      <Text fontSize="sm" color="gray.500" fontStyle="italic">
        No value extracted
      </Text>
    );
  };

  return (
    <Box
      bg={bgColor}
      p={6}
      borderRadius="lg"
      borderWidth="1px"
      borderColor={borderColor}
      maxH="800px"
      overflowY="auto"
    >
      <VStack align="stretch" spacing={6}>
        {/* Header */}
        <Box>
          <Heading size="lg" mb={2} color="white">
            Project Summary
          </Heading>
          <Text color="gray.400">
            Review all extracted parameters for project: {project.projectId}
          </Text>
        </Box>

        {/* Project Info */}
        <Box bg="gray.800" p={4} borderRadius="md">
          <Heading size="md" mb={3} color="white">Project Details</Heading>
          <VStack align="stretch" spacing={2}>
            <HStack justify="space-between">
              <Text color="gray.300">Project ID:</Text>
              <Code colorScheme="blue">{project.projectId}</Code>
            </HStack>
            <HStack justify="space-between">
              <Text color="gray.300">Description:</Text>
              <Text color="white">{project.description}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text color="gray.300">Schedule:</Text>
              <Badge colorScheme="purple">{project.scheduleType}</Badge>
            </HStack>
            <HStack justify="space-between">
              <Text color="gray.300">Input Folder:</Text>
              <Text color="gray.400" fontFamily="mono">{project.inputFolder || 'Not specified'}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text color="gray.300">Output Folder:</Text>
              <Text color="gray.400" fontFamily="mono">{project.outputFolder || 'Not specified'}</Text>
            </HStack>
          </VStack>
        </Box>

        {/* Statistics */}
        <StatGroup bg="gray.800" p={4} borderRadius="md">
          <Stat>
            <StatLabel color="gray.400">Total Sections</StatLabel>
            <StatNumber color="white">{totalSections}</StatNumber>
          </Stat>
          <Stat>
            <StatLabel color="gray.400">Configured Sections</StatLabel>
            <StatNumber color="white">{sectionsWithParameters}</StatNumber>
          </Stat>
          <Stat>
            <StatLabel color="gray.400">Total Parameters</StatLabel>
            <StatNumber color="white">{totalParameters}</StatNumber>
          </Stat>
          <Stat>
            <StatLabel color="gray.400">Table Parameters</StatLabel>
            <StatNumber color="white">{parametersByType.table.length}</StatNumber>
          </Stat>
        </StatGroup>

        {/* Parameters Overview */}
        <Box>
          <Heading size="md" mb={4} color="white">Extraction Parameters</Heading>
          
          <Accordion allowMultiple defaultIndex={[0]}>
            {/* Table Parameters */}
            {parametersByType.table.length > 0 && (
              <AccordionItem bg="gray.800" borderRadius="md" mb={3}>
                <AccordionButton>
                  <Box flex="1" textAlign="left">
                    <HStack>
                      <Badge colorScheme="blue">Table Data</Badge>
                      <Text color="white">Table Parameters ({parametersByType.table.length})</Text>
                    </HStack>
                  </Box>
                  <AccordionIcon color="white" />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <VStack align="stretch" spacing={3}>
                    {parametersByType.table.map((param, index) => (
                      <Box key={index} p={3} bg="gray.700" borderRadius="md">
                        <HStack justify="space-between" mb={2}>
                          <Text fontWeight="bold" color="blue.300">{param.name}</Text>
                          <Badge size="sm" colorScheme="gray">{param.sectionTitle}</Badge>
                        </HStack>
                        <Text fontSize="sm" color="gray.300" mb={2}>{param.description}</Text>
                        {renderParameterValue(param)}
                      </Box>
                    ))}
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
            )}

            {/* Group Parameters */}
            {parametersByType.group.length > 0 && (
              <AccordionItem bg="gray.800" borderRadius="md" mb={3}>
                <AccordionButton>
                  <Box flex="1" textAlign="left">
                    <HStack>
                      <Badge colorScheme="purple">Group Data</Badge>
                      <Text color="white">Group Parameters ({parametersByType.group.length})</Text>
                    </HStack>
                  </Box>
                  <AccordionIcon color="white" />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <VStack align="stretch" spacing={3}>
                    {parametersByType.group.map((param, index) => (
                      <Box key={index} p={3} bg="gray.700" borderRadius="md">
                        <HStack justify="space-between" mb={2}>
                          <Text fontWeight="bold" color="purple.300">{param.name}</Text>
                          <Badge size="sm" colorScheme="gray">{param.sectionTitle}</Badge>
                        </HStack>
                        <Text fontSize="sm" color="gray.300" mb={2}>{param.description}</Text>
                        {param.subSectionCount && (
                          <Text fontSize="xs" color="purple.200" mb={1}>
                            Combined from {param.subSectionCount} sub-sections
                          </Text>
                        )}
                        {renderParameterValue(param)}
                      </Box>
                    ))}
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
            )}

            {/* Regular Parameters */}
            {parametersByType.regular.length > 0 && (
              <AccordionItem bg="gray.800" borderRadius="md" mb={3}>
                <AccordionButton>
                  <Box flex="1" textAlign="left">
                    <HStack>
                      <Badge colorScheme="green">Regular Data</Badge>
                      <Text color="white">Regular Parameters ({parametersByType.regular.length})</Text>
                    </HStack>
                  </Box>
                  <AccordionIcon color="white" />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <VStack align="stretch" spacing={3}>
                    {parametersByType.regular.map((param, index) => (
                      <Box key={index} p={3} bg="gray.700" borderRadius="md">
                        <HStack justify="space-between" mb={2}>
                          <Text fontWeight="bold" color="green.300">{param.name}</Text>
                          <Badge size="sm" colorScheme="gray">{param.sectionTitle}</Badge>
                        </HStack>
                        <Text fontSize="sm" color="gray.300" mb={2}>{param.description}</Text>
                        {renderParameterValue(param)}
                      </Box>
                    ))}
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
            )}
          </Accordion>
        </Box>

        {/* Next Steps */}
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold">Ready for Schema Mapping</Text>
            <Text fontSize="sm">
              Configure how these extracted parameters map to your database schema for batch processing.
            </Text>
          </Box>
        </Alert>

        {/* Action Buttons */}
        <HStack spacing={4}>
          <Button
            variant="outline"
            colorScheme="gray"
            onClick={onBack}
            flex="1"
          >
            Back to Projects
          </Button>
          <Button
            colorScheme="blue"
            leftIcon={<Database size={16} />}
            rightIcon={<ArrowRight size={16} />}
            onClick={onSchemaMapping}
            flex="1"
          >
            Configure Database Schema
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};

export default ProjectSummary;