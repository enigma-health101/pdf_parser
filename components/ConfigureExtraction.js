// components/ConfigureExtraction.js
import { useState } from 'react';
import {
  Box,
  Text,
  Heading,
  VStack,
  HStack,
  Button,
  Flex,
  Input,
  FormControl,
  FormLabel,
  FormHelperText,
  Select,
  Switch,
  Divider,
  Grid,
  GridItem,
  useColorModeValue,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Card,
  CardHeader,
  CardBody,
  Tag,
  TagLabel,
  TagCloseButton,
  Progress,
  Badge,
  Tooltip
} from '@chakra-ui/react';

const ConfigureExtraction = ({ templateType = 'fixed', onBack, onContinue }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [fields, setFields] = useState([
    { id: 1, name: 'Invoice Number', type: 'text', required: true },
    { id: 2, name: 'Date', type: 'date', required: true },
    { id: 3, name: 'Total Amount', type: 'currency', required: true },
    { id: 4, name: 'Vendor', type: 'text', required: false }
  ]);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  
  // Color tokens
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const accentColor = useColorModeValue('blue.500', 'blue.300');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');
  const tagBg = useColorModeValue('blue.50', 'blue.900');
  const iconBg = useColorModeValue('gray.100', 'gray.700');
  
  const handleAddField = () => {
    if (newFieldName.trim() === '') return;
    
    const newField = {
      id: fields.length + 1,
      name: newFieldName,
      type: newFieldType,
      required: false
    };
    
    setFields([...fields, newField]);
    setNewFieldName('');
    setNewFieldType('text');
  };
  
  const handleRemoveField = (id) => {
    setFields(fields.filter(field => field.id !== id));
  };
  
  const handleToggleRequired = (id) => {
    setFields(fields.map(field => 
      field.id === id ? { ...field, required: !field.required } : field
    ));
  };
  
  return (
    <VStack spacing={8} w="full">
      <Box textAlign="center" maxW="3xl" mx="auto">
        <Heading as="h2" size="lg" mb={3}>Configure Extraction</Heading>
        <Text color={mutedColor}>
          Define the data fields you want to extract and configure processing options
        </Text>
      </Box>
      
      {/* Progress Indicator */}
      <Box w="full" maxW="4xl" mx="auto" px={4}>
        <Progress value={60} size="sm" colorScheme="blue" borderRadius="full" mb={3} />
        <HStack justify="space-between" w="full" fontSize="sm" color={mutedColor}>
          <Flex align="center">
            <Box w={6} h={6} borderRadius="full" bg={accentColor} color="white" fontSize="xs" mr={2}
              display="flex" alignItems="center" justifyContent="center">
              ✓
            </Box>
            <Text fontWeight="medium">Select Template</Text>
          </Flex>
          <Flex align="center">
            <Box w={6} h={6} borderRadius="full" bg={accentColor} color="white" fontSize="xs" mr={2}
              display="flex" alignItems="center" justifyContent="center">
              ✓
            </Box>
            <Text fontWeight="medium">Upload Files</Text>
          </Flex>
          <Flex align="center">
            <Box w={6} h={6} borderRadius="full" bg={accentColor} color="white" fontSize="xs" mr={2}
              display="flex" alignItems="center" justifyContent="center">
              3
            </Box>
            <Text fontWeight="medium">Configure</Text>
          </Flex>
          <Flex align="center">
            <Box w={6} h={6} borderRadius="full" bg="gray.200" color="gray.500" fontSize="xs" mr={2}
              display="flex" alignItems="center" justifyContent="center">
              4
            </Box>
            <Text>Process</Text>
          </Flex>
          <Flex align="center">
            <Box w={6} h={6} borderRadius="full" bg="gray.200" color="gray.500" fontSize="xs" mr={2}
              display="flex" alignItems="center" justifyContent="center">
              5
            </Box>
            <Text>Results</Text>
          </Flex>
        </HStack>
      </Box>
      
      {/* Configuration Interface */}
      <Box w="full" maxW="5xl" mx="auto">
        <Tabs colorScheme="blue" variant="enclosed" onChange={setActiveTab} index={activeTab}>
          <TabList>
            <Tab fontWeight="medium">
              <Box as="span" mr={2}>📊</Box>
              Fields
            </Tab>
            <Tab fontWeight="medium">
              <Box as="span" mr={2}>📝</Box>
              Template
            </Tab>
            <Tab fontWeight="medium">
              <Box as="span" mr={2}>⚙️</Box>
              Options
            </Tab>
            <Tab fontWeight="medium">
              <Box as="span" mr={2}>✓</Box>
              Validation
            </Tab>
          </TabList>

          <TabPanels>
            {/* Fields Tab */}
            <TabPanel>
              <Grid templateColumns={{ base: "1fr", md: "3fr 2fr" }} gap={6}>
                {/* Fields List */}
                <GridItem>
                  <Card bg={cardBg} borderRadius="lg" boxShadow="sm" borderWidth="1px" borderColor={borderColor}>
                    <CardHeader pb={0}>
                      <HStack justify="space-between">
                        <Heading size="md">Data Fields</Heading>
                        <Flex align="center">
                          <Text fontSize="sm" color={mutedColor} mr={2}>
                            {fields.length} fields defined
                          </Text>
                          <Tooltip label="Define the fields you want to extract from your PDF documents">
                            <Box as="span">ℹ️</Box>
                          </Tooltip>
                        </Flex>
                      </HStack>
                    </CardHeader>
                    <CardBody>
                      <VStack spacing={4} align="stretch">
                        {fields.map((field) => (
                          <HStack 
                            key={field.id} 
                            p={4} 
                            bg={bgColor} 
                            borderRadius="md" 
                            borderWidth="1px"
                            borderColor={borderColor}
                            _hover={{ borderColor: accentColor, boxShadow: "sm" }}
                            transition="all 0.2s"
                          >
                            <Box flex="1">
                              <HStack>
                                <Text fontWeight="medium">{field.name}</Text>
                                {field.required && (
                                  <Badge colorScheme="red" variant="solid" fontSize="xs">
                                    Required
                                  </Badge>
                                )}
                              </HStack>
                              <Text fontSize="sm" color={mutedColor} mt={1}>
                                Type: {field.type.charAt(0).toUpperCase() + field.type.slice(1)}
                              </Text>
                            </Box>
                            <HStack spacing={4}>
                              <Tooltip label={field.required ? "Make optional" : "Make required"}>
                                <Switch 
                                  colorScheme="blue"
                                  isChecked={field.required}
                                  onChange={() => handleToggleRequired(field.id)}
                                />
                              </Tooltip>
                              <Tooltip label="View field in template">
                                <Button size="sm" variant="ghost" colorScheme="blue">
                                  👁️
                                </Button>
                              </Tooltip>
                              <Tooltip label="Remove field">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  colorScheme="red"
                                  onClick={() => handleRemoveField(field.id)}
                                >
                                  ❌
                                </Button>
                              </Tooltip>
                            </HStack>
                          </HStack>
                        ))}
                        
                        {fields.length === 0 && (
                          <Box p={6} textAlign="center">
                            <Text color={mutedColor}>No fields defined yet. Add your first field.</Text>
                          </Box>
                        )}
                      </VStack>
                    </CardBody>
                  </Card>
                </GridItem>
                
                {/* Add New Field */}
                <GridItem>
                  <Card bg={cardBg} borderRadius="lg" boxShadow="sm" borderWidth="1px" borderColor={borderColor}>
                    <CardHeader pb={0}>
                      <Heading size="md">Add New Field</Heading>
                    </CardHeader>
                    <CardBody>
                      <VStack spacing={4} align="stretch">
                        <FormControl>
                          <FormLabel>Field Name</FormLabel>
                          <Input 
                            placeholder="e.g. Invoice Number, Date, Total Amount" 
                            value={newFieldName}
                            onChange={(e) => setNewFieldName(e.target.value)}
                          />
                        </FormControl>
                        
                        <FormControl>
                          <FormLabel>Field Type</FormLabel>
                          <Select 
                            value={newFieldType}
                            onChange={(e) => setNewFieldType(e.target.value)}
                          >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                            <option value="currency">Currency</option>
                            <option value="percentage">Percentage</option>
                            <option value="email">Email</option>
                            <option value="phone">Phone Number</option>
                          </Select>
                          <FormHelperText>Select the type of data you expect in this field</FormHelperText>
                        </FormControl>
                        
                        <FormControl display="flex" alignItems="center" mt={2}>
                          <FormLabel htmlFor="is-required" mb="0">
                            Required Field
                          </FormLabel>
                          <Switch id="is-required" colorScheme="blue" />
                        </FormControl>
                        
                        <Button 
                          colorScheme="blue" 
                          onClick={handleAddField}
                          isDisabled={!newFieldName.trim()}
                          mt={2}
                          leftIcon={<Box as="span">➕</Box>}
                        >
                          Add Field
                        </Button>
                      </VStack>
                    </CardBody>
                  </Card>
                  
                  <Card mt={6} bg={cardBg} borderRadius="lg" boxShadow="sm" borderWidth="1px" borderColor={borderColor}>
                    <CardHeader pb={0}>
                      <Heading size="md">Field Templates</Heading>
                    </CardHeader>
                    <CardBody>
                      <Text fontSize="sm" color={mutedColor} mb={4}>
                        Quickly add common field sets for standard document types
                      </Text>
                      <VStack spacing={3} align="stretch">
                        <Button variant="outline" justifyContent="flex-start" leftIcon={<Box as="span">📃</Box>}>
                          Invoice Template
                        </Button>
                        <Button variant="outline" justifyContent="flex-start" leftIcon={<Box as="span">📑</Box>}>
                          Receipt Template
                        </Button>
                        <Button variant="outline" justifyContent="flex-start" leftIcon={<Box as="span">📋</Box>}>
                          Form Template
                        </Button>
                      </VStack>
                    </CardBody>
                  </Card>
                </GridItem>
              </Grid>
            </TabPanel>
            
            {/* Template Tab */}
            <TabPanel>
              <Box p={6} bg={cardBg} borderRadius="lg" boxShadow="sm" textAlign="center">
                <Box fontSize="5xl" mb={4}>📄</Box>
                <Heading size="md" mb={2}>Template Configuration</Heading>
                <Text color={mutedColor}>
                  Upload a sample PDF to configure the template
                </Text>
                <Button colorScheme="blue" mt={6} leftIcon={<Box as="span">⬆️</Box>}>
                  Upload Sample PDF
                </Button>
              </Box>
            </TabPanel>
            
            {/* Options Tab */}
            <TabPanel>
              <Card bg={cardBg} borderRadius="lg" boxShadow="sm">
                <CardHeader>
                  <Heading size="md">Processing Options</Heading>
                </CardHeader>
                <CardBody>
                  <VStack spacing={6} align="stretch">
                    <FormControl display="flex" alignItems="center">
                      <Switch id="ocr" colorScheme="blue" defaultChecked mr={3} />
                      <FormLabel htmlFor="ocr" mb="0">
                        Enable OCR (Optical Character Recognition)
                      </FormLabel>
                    </FormControl>
                    
                    <FormControl display="flex" alignItems="center">
                      <Switch id="multi-page" colorScheme="blue" defaultChecked mr={3} />
                      <FormLabel htmlFor="multi-page" mb="0">
                        Process all pages
                      </FormLabel>
                    </FormControl>
                    
                    <FormControl>
                      <FormLabel>OCR Language</FormLabel>
                      <Select defaultValue="en">
                        <option value="en">English</option>
                        <option value="fr">French</option>
                        <option value="es">Spanish</option>
                        <option value="de">German</option>
                        <option value="it">Italian</option>
                      </Select>
                    </FormControl>
                    
                    <FormControl>
                      <FormLabel>Data Output Format</FormLabel>
                      <Select defaultValue="json">
                        <option value="json">JSON</option>
                        <option value="csv">CSV</option>
                        <option value="xlsx">Excel</option>
                      </Select>
                    </FormControl>
                  </VStack>
                </CardBody>
              </Card>
            </TabPanel>
            
            {/* Validation Tab */}
            <TabPanel>
              <Card bg={cardBg} borderRadius="lg" boxShadow="sm">
                <CardHeader>
                  <Heading size="md">Validation Rules</Heading>
                </CardHeader>
                <CardBody>
                  <Text color={mutedColor} mb={6}>
                    Set up rules to validate the extracted data and ensure accuracy
                  </Text>
                  
                  <VStack spacing={4} align="stretch">
                    <FormControl display="flex" alignItems="center">
                      <Switch id="validate-format" colorScheme="blue" defaultChecked mr={3} />
                      <FormLabel htmlFor="validate-format" mb="0">
                        Validate field formats (dates, numbers, etc.)
                      </FormLabel>
                    </FormControl>
                    
                    <FormControl display="flex" alignItems="center">
                      <Switch id="flag-low-confidence" colorScheme="blue" defaultChecked mr={3} />
                      <FormLabel htmlFor="flag-low-confidence" mb="0">
                        Flag low-confidence extractions for review
                      </FormLabel>
                    </FormControl>
                    
                    <FormControl display="flex" alignItems="center">
                      <Switch id="auto-correct" colorScheme="blue" mr={3} />
                      <FormLabel htmlFor="auto-correct" mb="0">
                        Apply AI-powered auto-correction
                      </FormLabel>
                    </FormControl>
                  </VStack>
                </CardBody>
              </Card>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
      
      {/* Navigation Buttons */}
      <Flex w="full" maxW="5xl" mx="auto" justify="space-between" mt={6} pb={8}>
        <Button 
          variant="outline" 
          onClick={onBack}
          leftIcon={<Box as="span">←</Box>}
        >
          Back
        </Button>
        <Button 
          colorScheme="blue" 
          onClick={onContinue}
          rightIcon={<Box as="span">→</Box>}
        >
          Continue
        </Button>
      </Flex>
    </VStack>
  );
};

export default ConfigureExtraction;