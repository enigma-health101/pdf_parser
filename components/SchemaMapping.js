import React, { useState, useEffect } from 'react';
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
  Alert,
  AlertIcon,
  Input,
  Select,
  Checkbox,
  Spinner,
  useColorModeValue,
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
  Divider,
  Code,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon
} from '@chakra-ui/react';
import { Database, Plus, Trash2, Settings, Check, AlertTriangle, Info, Eye, ArrowLeft, RefreshCw, ChevronRight } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const SchemaMapping = ({
  project,
  sections,
  parameters,
  extractedData,
  onBack,
  onComplete,
  onBackToProjects
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const steps = [
    { id: 1, title: 'Review Parameters', description: 'Review extracted project parameters' },
    { id: 2, title: 'Choose Table', description: 'Create new or use existing table' },
    { id: 3, title: 'Configure Schema', description: 'Map parameters to columns' },
    { id: 4, title: 'Finalize', description: 'Create/update table and save configuration' }
  ];

  const [projectParameters, setProjectParameters] = useState([]);
  const [selectedSchema, setSelectedSchema] = useState('public');
  const [tableChoice, setTableChoice] = useState('new');
  const [tableName, setTableName] = useState('');
  const [selectedExistingTable, setSelectedExistingTable] = useState('');
  const [columnMappings, setColumnMappings] = useState([]);
  const [schemas, setSchemas] = useState([]);
  const [existingTables, setExistingTables] = useState([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isLoadingExistingSchema, setIsLoadingExistingSchema] = useState(false);
  
  const [validation, setValidation] = useState(null);
  const [previewSql, setPreviewSql] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [logs, setLogs] = useState([]);
  const [existingSchemaMapping, setExistingSchemaMapping] = useState(null);
  const [hasExistingSchema, setHasExistingSchema] = useState(false);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Helper function to add logs
  const addLog = (message, level = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const newLog = { timestamp, message, level, id: Date.now() };
    setLogs(prev => [...prev, newLog]);
  };

  // Check for existing schema mapping on component mount
  const checkExistingSchemaMapping = async () => {
    setIsLoadingExistingSchema(true);
    try {
      const response = await fetch(`${API_BASE_URL}/config/projects/${project.projectId}/schema/mapping`);
      
      if (response.ok) {
        const mappingData = await response.json();
        setExistingSchemaMapping(mappingData);
        setHasExistingSchema(true);
        
        // Auto-populate fields from existing mapping
        setSelectedSchema(mappingData.schema_name || 'public');
        setTableChoice('existing');
        setSelectedExistingTable(mappingData.table_name || '');
        setTableName(mappingData.table_name || '');
        
        addLog(`✓ Found existing schema mapping for table "${mappingData.table_name}"`, 'success');
        addLog(`Schema: ${mappingData.schema_name}, Created: ${new Date(mappingData.created_at).toLocaleDateString()}`, 'info');
        
        return mappingData;
      } else {
        setHasExistingSchema(false);
        addLog('No existing schema mapping found - will create new schema', 'info');
        return null;
      }
    } catch (err) {
      addLog(`Error checking existing schema: ${err.message}`, 'error');
      setHasExistingSchema(false);
      return null;
    } finally {
      setIsLoadingExistingSchema(false);
    }
  };

  // Load existing schema mapping into column mappings
  const loadExistingSchemaMapping = () => {
    if (!existingSchemaMapping) return;

    try {
      const mappings = existingSchemaMapping.column_mappings || [];
      const loadedMappings = mappings.map((mapping, index) => ({
        id: `existing_mapping_${index}`,
        name: mapping.name,
        dataType: mapping.data_type,
        originalDataType: mapping.data_type,
        isPrimaryKey: mapping.is_primary_key || false,
        isNullable: mapping.is_nullable !== false,
        sourceParameter: mapping.source_parameter || null,
        parameterType: mapping.parameter_type || 'existing',
        description: mapping.description || `Column: ${mapping.name}`,
        isSystemColumn: mapping.parameter_type === 'system',
        isExistingColumn: true,
        willBeAdded: false,
        defaultValue: mapping.default_value || undefined
      }));

      // Add any new parameters not in existing mapping
      const existingParameterNames = new Set(
        loadedMappings
          .filter(m => m.sourceParameter)
          .map(m => m.sourceParameter)
      );

      const newParameters = projectParameters.filter(paramName => 
        !existingParameterNames.has(paramName.trim())
      );

      newParameters.forEach((paramName, index) => {
        const cleanParamName = paramName.trim();
        const columnName = cleanParamName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const isSystemParam = ['projectId', 'fileId'].includes(cleanParamName);
        
        loadedMappings.push({
          id: `new_param_${index}`,
          name: columnName,
          dataType: inferDataTypeFromName(cleanParamName),
          isPrimaryKey: false,
          isNullable: !isSystemParam,
          sourceParameter: cleanParamName,
          parameterType: isSystemParam ? 'system' : 'regular',
          description: `New column for ${cleanParamName} parameter`,
          isSystemColumn: isSystemParam,
          isExistingColumn: false,
          willBeAdded: true
        });
      });

      setColumnMappings(loadedMappings);
      addLog(`✓ Loaded ${loadedMappings.length} column mappings from existing schema`, 'success');
      
    } catch (err) {
      addLog(`✗ Error loading existing schema mapping: ${err.message}`, 'error');
    }
  };

  useEffect(() => {
    if (!tableName && tableChoice === 'new') {
      setTableName(`${project.projectId.replace(/-/g, '_')}_data`);
    }
    loadSchemas();
    loadProjectParameters();
    
    // Check for existing schema mapping
    checkExistingSchemaMapping();
  }, [project]);

  useEffect(() => {
    if (selectedSchema) {
      loadTables(selectedSchema);
    }
  }, [selectedSchema]);

  // Load existing schema mapping when we have both project parameters and existing mapping
  useEffect(() => {
    if (projectParameters.length > 0 && existingSchemaMapping && currentStep === 3) {
      loadExistingSchemaMapping();
    }
  }, [projectParameters, existingSchemaMapping, currentStep]);

  const loadProjectParameters = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/config/projects/${project.projectId}/list_parameters`);
      
      if (response.ok) {
        const data = await response.json();
        setProjectParameters(data.parameterNames || []);
      } else {
        setProjectParameters([]);
      }
    } catch (err) {
      setError('Failed to load project parameters: ' + err.message);
      setProjectParameters([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSchemas = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/schema/schemas`);
      if (response.ok) {
        const data = await response.json();
        setSchemas(data.schemas || ['public']);
      } else {
        setSchemas(['public']);
      }
    } catch (err) {
      setSchemas(['public']);
    }
  };

  const loadTables = async (schemaName) => {
    try {
      const response = await fetch(`${API_BASE_URL}/schema/schemas/${schemaName}/tables`);
      if (response.ok) {
        const data = await response.json();
        setExistingTables(data.tables || []);
      } else {
        setExistingTables([]);
      }
    } catch (err) {
      setExistingTables([]);
    }
  };

  const loadExistingTableColumns = async (tableName) => {
    try {
      addLog(`Loading columns for table: ${tableName}`, 'info');
      
      // Check if we should load from existing schema mapping first
      if (hasExistingSchema && existingSchemaMapping && existingSchemaMapping.table_name === tableName) {
        loadExistingSchemaMapping();
        return;
      }

      // Include project_id to get enhanced column information with mappings
      const response = await fetch(`${API_BASE_URL}/schema/schemas/${selectedSchema}/tables/${tableName}/columns?project_id=${project.projectId}`);
      if (response.ok) {
        const data = await response.json();
        const existingColumns = data.columns || [];
        
        addLog(`✓ Loaded ${existingColumns.length} existing columns`, 'success');
        
        // Create mappings with existing columns
        const mappings = [];
        
        // Add existing columns first with their current properties
        existingColumns.forEach((column, index) => {
          const dataType = column.data_type?.toUpperCase() || 'VARCHAR(255)';
          const isPrimaryKey = column.is_primary_key || false;
          const isNullable = column.is_nullable !== false;
          
          mappings.push({
            id: `existing_${index}`,
            name: column.column_name,
            dataType: dataType,
            originalDataType: column.data_type, // Keep original case for display
            isPrimaryKey: isPrimaryKey,
            isNullable: isNullable,
            sourceParameter: column.source_parameter || null,
            parameterType: column.source_parameter ? 'mapped' : (isPrimaryKey ? 'system' : 'existing'),
            description: column.source_parameter 
              ? `Mapped to ${column.source_parameter} parameter`
              : (column.column_comment || `Existing column`),
            isSystemColumn: isPrimaryKey,
            isExistingColumn: true,
            willBeAdded: false,
            defaultValue: column.column_default || undefined
          });
        });

        // Add new columns for unmapped project parameters
        const unmappedParameters = projectParameters.filter(paramName => {
          // Check if this parameter is already mapped to an existing column
          return !mappings.some(mapping => mapping.sourceParameter === paramName.trim());
        });

        unmappedParameters.forEach((paramName, index) => {
          const cleanParamName = paramName.trim();
          const columnName = cleanParamName.toLowerCase().replace(/[^a-z0-9]/g, '_');
          const isSystemParam = ['projectId', 'fileId'].includes(cleanParamName);
          
          mappings.push({
            id: `new_param_${index}`,
            name: columnName,
            dataType: inferDataTypeFromName(cleanParamName),
            isPrimaryKey: false,
            isNullable: !isSystemParam,
            sourceParameter: cleanParamName,
            parameterType: isSystemParam ? 'system' : 'regular',
            description: `New column for ${cleanParamName} parameter`,
            isSystemColumn: isSystemParam,
            isExistingColumn: false,
            willBeAdded: true
          });
        });

        // Add processed_at timestamp if it doesn't exist
        const hasProcessedAt = existingColumns.find(col => 
          col.column_name.toLowerCase().includes('processed') && 
          col.column_name.toLowerCase().includes('at')
        );
        
        if (!hasProcessedAt) {
          mappings.push({
            id: 'processed_at_new',
            name: 'processed_at',
            dataType: 'TIMESTAMP',
            isPrimaryKey: false,
            isNullable: false,
            defaultValue: 'CURRENT_TIMESTAMP',
            sourceParameter: null,
            parameterType: 'system',
            description: 'When the document was processed',
            isSystemColumn: true,
            isExistingColumn: false,
            willBeAdded: true
          });
        }

        setColumnMappings(mappings);
      } else {
        addLog('✗ Failed to load existing columns', 'error');
      }
    } catch (err) {
      addLog(`✗ Error loading existing columns: ${err.message}`, 'error');
    }
  };

  const saveColumnMappings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/config/projects/${project.projectId}/schema/mapping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schema_name: selectedSchema,
          table_name: tableChoice === 'new' ? tableName : selectedExistingTable,
          column_mappings: columnMappings.map(col => ({
            name: col.name,
            data_type: col.dataType,
            source_parameter: col.sourceParameter,
            parameter_type: col.parameterType,
            is_nullable: col.isNullable,
            is_primary_key: col.isPrimaryKey,
            default_value: col.defaultValue,
            description: col.description,
            is_existing_column: col.isExistingColumn,
            will_be_added: col.willBeAdded
          }))
        })
      });
      
      if (response.ok) {
        addLog('✓ Column mappings saved successfully', 'success');
        return true;
      } else {
        addLog('✗ Failed to save column mappings', 'error');
        return false;
      }
    } catch (err) {
      addLog(`✗ Error saving column mappings: ${err.message}`, 'error');
      return false;
    }
  };

  const inferDataTypeFromName = (paramName) => {
    const name = paramName.toLowerCase();
    if (name.includes('id')) return 'VARCHAR(100)';
    if (name.includes('count') || name.includes('number') || name.includes('score') || name.includes('age')) return 'INTEGER';
    if (name.includes('is_') || name.includes('has_') || name.includes('enable') || name.includes('active') || name.includes('flag')) return 'BOOLEAN';
    if (name.includes('date') || name.includes('time') || name.includes('created') || name.includes('modified') || name.includes('timestamp')) return 'TIMESTAMP';
    if (name.includes('description') || name.includes('comment') || name.includes('note') || name.includes('detail')) return 'TEXT';
    if (name.includes('amount') || name.includes('price') || name.includes('cost') || name.includes('value')) return 'DECIMAL(10,2)';
    return 'VARCHAR(255)';
  };

  const generateColumnMappingsForNewTable = () => {
    const mappings = [];
    
    mappings.push({
      id: 'pk',
      name: 'id',
      dataType: 'SERIAL',
      isPrimaryKey: true,
      isNullable: false,
      sourceParameter: null,
      parameterType: 'system',
      description: 'Auto-generated primary key',
      isSystemColumn: true
    });

    projectParameters.forEach((paramName, index) => {
      const cleanParamName = paramName.trim();
      const columnName = cleanParamName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const isSystemParam = ['projectId', 'fileId'].includes(cleanParamName);
      
      mappings.push({
        id: `param_${index}`,
        name: columnName,
        dataType: inferDataTypeFromName(cleanParamName),
        isPrimaryKey: false,
        isNullable: !isSystemParam,
        sourceParameter: cleanParamName,
        parameterType: isSystemParam ? 'system' : 'regular',
        description: `Data from ${cleanParamName} parameter`,
        isSystemColumn: isSystemParam
      });
    });

    mappings.push({
      id: 'processed_at',
      name: 'processed_at',
      dataType: 'TIMESTAMP',
      isPrimaryKey: false,
      isNullable: false,
      defaultValue: 'CURRENT_TIMESTAMP',
      sourceParameter: null,
      parameterType: 'system',
      description: 'When the document was processed',
      isSystemColumn: true
    });

    setColumnMappings(mappings);
  };

  const updateProjectConfiguration = async (schemaName, tableName) => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${project.projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          databaseSchema: schemaName,
          databaseTable: tableName,
          lastModified: new Date().toISOString()
        })
      });
      
      if (!response.ok) throw new Error('Failed to update project configuration');
      return await response.json();
    } catch (err) {
      throw err;
    }
  };

  const validateSchema = async () => {
    setIsValidating(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/schema/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: tableChoice === 'new' ? tableName : selectedExistingTable,
          schemaName: selectedSchema,
          columns: columnMappings.map(col => ({
            name: col.name,
            dataType: col.dataType,
            isNullable: col.isNullable,
            isPrimaryKey: col.isPrimaryKey,
            defaultValue: col.defaultValue
          }))
        })
      });
      
      const data = await response.json();
      setValidation(data);
    } catch (err) {
      setError('Failed to validate schema: ' + err.message);
    } finally {
      setIsValidating(false);
    }
  };

  const generateCreateTableSQL = () => {
    if (tableChoice === 'existing') {
      // Generate ALTER TABLE statement for existing table
      const newColumns = columnMappings.filter(mapping => mapping.willBeAdded && !mapping.isExistingColumn);
      
      if (newColumns.length === 0) {
        return `-- No new columns to add to table "${selectedSchema}"."${selectedExistingTable}"`;
      }
      
      const alterStatements = newColumns.map(mapping => {
        let sql = `ALTER TABLE "${selectedSchema}"."${selectedExistingTable}" ADD COLUMN "${mapping.name}" ${mapping.dataType}`;
        if (!mapping.isNullable && !mapping.dataType.includes('PRIMARY KEY')) {
          sql += ' NOT NULL';
        }
        if (mapping.defaultValue && !mapping.isPrimaryKey) {
          if (mapping.defaultValue === 'CURRENT_TIMESTAMP') {
            sql += ' DEFAULT CURRENT_TIMESTAMP';
          } else {
            sql += ` DEFAULT '${mapping.defaultValue}'`;
          }
        }
        return sql + ';';
      });
      
      return alterStatements.join('\n');
    } else {
      // Generate CREATE TABLE statement for new table
      const columns = columnMappings.map(mapping => {
        let sql = `    "${mapping.name}" ${mapping.dataType}`;
        if (mapping.isPrimaryKey) sql += ' PRIMARY KEY';
        if (!mapping.isNullable && !mapping.dataType.includes('PRIMARY KEY')) sql += ' NOT NULL';
        if (mapping.defaultValue && !mapping.isPrimaryKey) {
          if (mapping.defaultValue === 'CURRENT_TIMESTAMP') {
            sql += ' DEFAULT CURRENT_TIMESTAMP';
          } else {
            sql += ` DEFAULT '${mapping.defaultValue}'`;
          }
        }
        return sql;
      });

      return `CREATE TABLE "${selectedSchema}"."${tableName}" (\n${columns.join(',\n')}\n);`;
    }
  };

  const previewSQL = () => {
    try {
      const sql = generateCreateTableSQL();
      setPreviewSql(sql);
      onOpen();
    } catch (err) {
      setError('Error generating SQL: ' + err.message);
    }
  };

  const createOrUpdateTable = async () => {
    setIsCreating(true);
    setError(null);
    
    try {
      // First save the column mappings
      const mappingsSaved = await saveColumnMappings();
      if (!mappingsSaved) {
        throw new Error('Failed to save column mappings');
      }

      const endpoint = tableChoice === 'new' 
        ? `${API_BASE_URL}/schema/schemas/${selectedSchema}/tables`
        : `${API_BASE_URL}/schema/schemas/${selectedSchema}/tables/${selectedExistingTable}/columns`;
      
      const payload = tableChoice === 'new' 
        ? {
            tableName,
            projectId: project.projectId,
            columns: columnMappings.map(col => ({
              name: col.name,
              dataType: col.dataType,
              isNullable: col.isNullable,
              isPrimaryKey: col.isPrimaryKey,
              defaultValue: col.defaultValue,
              description: col.description,
              sourceParameter: col.sourceParameter,
              parameterType: col.parameterType
            }))
          }
        : {
            // For existing tables, send both new columns to add AND existing columns with mapping updates
            newColumns: columnMappings
              .filter(col => !col.isExistingColumn || col.willBeAdded)
              .map(col => ({
                name: col.name,
                dataType: col.dataType,
                isNullable: col.isNullable,
                isPrimaryKey: col.isPrimaryKey,
                defaultValue: col.defaultValue,
                description: col.description,
                sourceParameter: col.sourceParameter,
                parameterType: col.parameterType,
                action: 'add'
              })),
            updatedColumns: columnMappings
              .filter(col => col.isExistingColumn && !col.willBeAdded)
              .map(col => ({
                name: col.name,
                dataType: col.dataType,
                isNullable: col.isNullable,
                isPrimaryKey: col.isPrimaryKey,
                defaultValue: col.defaultValue,
                description: col.description,
                sourceParameter: col.sourceParameter,
                parameterType: col.parameterType,
                action: 'update_mapping'
              })),
            // Also send all columns for complete mapping save
            allColumns: columnMappings.map(col => ({
              name: col.name,
              dataType: col.dataType,
              isNullable: col.isNullable,
              isPrimaryKey: col.isPrimaryKey,
              defaultValue: col.defaultValue,
              description: col.description,
              sourceParameter: col.sourceParameter,
              parameterType: col.parameterType,
              isExistingColumn: col.isExistingColumn,
              willBeAdded: col.willBeAdded
            }))
          };
      
      const response = await fetch(endpoint, {
        method: tableChoice === 'new' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (data.success) {
        await updateProjectConfiguration(
          selectedSchema, 
          tableChoice === 'new' ? tableName : selectedExistingTable
        );
        
        const newColumnsCount = tableChoice === 'existing' ? 
          columnMappings.filter(col => col.willBeAdded && !col.isExistingColumn).length : 
          columnMappings.length;
        
        const updatedMappingsCount = tableChoice === 'existing' ? 
          columnMappings.filter(col => col.isExistingColumn && col.sourceParameter).length : 
          0;
        
        let successMessage = '';
        if (tableChoice === 'new') {
          successMessage = `✓ Table ${tableName} created successfully with ${columnMappings.length} columns!`;
        } else {
          const changes = [];
          if (newColumnsCount > 0) changes.push(`${newColumnsCount} new column(s) added`);
          if (updatedMappingsCount > 0) changes.push(`${updatedMappingsCount} column mapping(s) updated`);
          
          successMessage = `✓ Table ${selectedExistingTable} updated successfully` + 
            (changes.length > 0 ? ` (${changes.join(', ')})` : '') + '!';
        }
        
        setSuccess(successMessage + ' Proceeding to batch processing...');
        
        setTimeout(() => {
          setSuccess(null);
          onComplete(data);
        }, 2000);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setError(`Failed to ${tableChoice === 'new' ? 'create' : 'update'} table: ` + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const addCustomColumn = () => {
    const newColumn = {
      id: `custom_${Date.now()}`,
      name: '',
      dataType: 'TEXT',
      isNullable: true,
      isPrimaryKey: false,
      defaultValue: '',
      description: '',
      sourceParameter: null,
      parameterType: 'custom',
      isSystemColumn: false
    };
    setColumnMappings([...columnMappings, newColumn]);
  };

  const updateColumnMapping = (id, field, value) => {
    setColumnMappings(mappings =>
      mappings.map(mapping => {
        if (mapping.id === id) {
          const updatedMapping = { ...mapping, [field]: value };
          
          // If this is an existing column and we're updating the sourceParameter,
          // mark it as being mapped to a parameter
          if (mapping.isExistingColumn && field === 'sourceParameter' && value) {
            updatedMapping.parameterType = 'mapped';
            updatedMapping.description = `Mapped to ${value} parameter`;
            
            // Also save the individual column mapping to backend
            saveIndividualColumnMapping(mapping.name, value);
          }
          
          // If we're clearing the sourceParameter for an existing column,
          // reset it back to existing status
          if (mapping.isExistingColumn && field === 'sourceParameter' && !value) {
            updatedMapping.parameterType = 'existing';
            updatedMapping.description = `Existing column`;
            
            // Save the cleared mapping
            saveIndividualColumnMapping(mapping.name, null);
          }
          
          return updatedMapping;
        }
        return mapping;
      })
    );
  };

  const saveIndividualColumnMapping = async (columnName, parameterName) => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${project.projectId}/schema/mapping/columns/${columnName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parameter_name: parameterName
        })
      });
      
      if (response.ok) {
        addLog(`✓ Updated mapping for column ${columnName}`, 'success');
      }
    } catch (err) {
      addLog(`✗ Failed to update mapping for column ${columnName}`, 'error');
    }
  };

  const removeColumnMapping = (id) => {
    setColumnMappings(mappings =>
      mappings.filter(mapping => mapping.id !== id)
    );
  };

  const getTypeColor = (parameterType) => {
    switch (parameterType) {
      case 'system': return 'gray';
      case 'regular': return 'green';
      case 'custom': return 'orange';
      case 'existing': return 'blue';
      case 'mapped': return 'purple';
      default: return 'gray';
    }
  };

  const dataTypeOptions = [
    'TEXT', 'VARCHAR(255)', 'VARCHAR(100)', 'VARCHAR(50)', 'INTEGER', 
    'SERIAL', 'DECIMAL(10,2)', 'BOOLEAN', 'DATE', 'TIMESTAMP', 'JSONB'
  ];

  const filteredParameters = projectParameters.filter(param =>
    param.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const nextStep = () => {
    if (currentStep === 2) {
      if (tableChoice === 'new') {
        generateColumnMappingsForNewTable();
      } else if (tableChoice === 'existing' && selectedExistingTable) {
        loadExistingTableColumns(selectedExistingTable);
      }
    }
    setCurrentStep(Math.min(currentStep + 1, steps.length));
  };

  const prevStep = () => {
    setCurrentStep(Math.max(currentStep - 1, 1));
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1: return projectParameters.length > 0;
      case 2: return (tableChoice === 'new' && tableName) || (tableChoice === 'existing' && selectedExistingTable);
      case 3: return columnMappings.length > 0;
      default: return true;
    }
  };

  return (
    <Box bg="gray.800" color="white" minH="100vh">
      {/* Header */}
      <Box bg="gray.700" borderBottom="1px" borderColor="gray.600">
        <Box maxW="7xl" mx="auto" px={8} py={6}>
          <VStack spacing={3}>
            <Text fontSize="sm" color="gray.400">PDF Parser</Text>
            <Heading as="h1" size="xl" color="white" textAlign="center">
              Database Schema Mapping
            </Heading>
            <Text color="gray.300" textAlign="center">
              Configure database schema for extracted parameters
            </Text>
            <HStack spacing={4}>
              <Badge colorScheme="blue" variant="solid" px={3} py={1} borderRadius="full">
                Project: {project.projectId}
              </Badge>
              <Badge colorScheme="green" variant="outline" px={3} py={1} borderRadius="full">
                Step 5 of 6
              </Badge>
              {hasExistingSchema && (
                <Badge colorScheme="purple" variant="solid" px={3} py={1} borderRadius="full">
                  Existing Schema Found
                </Badge>
              )}
            </HStack>
          </VStack>
        </Box>
      </Box>

      {/* Progress indicator */}
      <Box bg="gray.700" borderBottom="1px" borderColor="gray.600">
        <Box maxW="7xl" mx="auto" px={8} py={4}>
          <Flex justify="center" align="center">
            {steps.map((step, index) => (
              <Flex key={step.id} align="center">
                <Box 
                  w={10} 
                  h={10} 
                  borderRadius="full" 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="center" 
                  fontSize="sm" 
                  fontWeight="bold"
                  bg={currentStep > step.id ? 'green.500' : currentStep === step.id ? 'blue.500' : 'gray.500'}
                  color="white"
                >
                  {currentStep > step.id ? <Check size={20} /> : step.id}
                </Box>
                {index < steps.length - 1 && (
                  <Box 
                    w={16} 
                    h="2px" 
                    mx={4} 
                    bg={currentStep > step.id ? 'green.500' : 'gray.500'} 
                  />
                )}
              </Flex>
            ))}
          </Flex>
        </Box>
      </Box>

      {/* Main content */}
      <Box maxW="7xl" mx="auto" px={8} py={8}>
        {/* Loading indicator for existing schema check */}
        {isLoadingExistingSchema && (
          <Alert status="info" mb={6} borderRadius="md">
            <Spinner size="sm" mr={3} />
            <Text>Checking for existing schema mapping...</Text>
          </Alert>
        )}

        {/* Existing schema found notification */}
        {hasExistingSchema && existingSchemaMapping && (
          <Alert status="success" mb={6} borderRadius="md">
            <AlertIcon />
            <Box>
              <Text fontWeight="bold" color="green.800">Existing Schema Found</Text>
              <Text color="green.700" fontSize="sm">
                Found existing schema mapping for table "{existingSchemaMapping.table_name}" in schema "{existingSchemaMapping.schema_name}". 
                You can review and update the configuration or create a new table.
              </Text>
              <Text color="green.600" fontSize="xs" mt={1}>
                Last modified: {new Date(existingSchemaMapping.last_modified).toLocaleString()}
              </Text>
            </Box>
          </Alert>
        )}

        {/* Error/Success Messages */}
        {error && (
          <Alert status="error" mb={6} borderRadius="md">
            <AlertIcon />
            <Text>{error}</Text>
          </Alert>
        )}

        {success && (
          <Alert status="success" mb={6} borderRadius="md">
            <AlertIcon />
            <Text>{success}</Text>
          </Alert>
        )}

        {/* Step Content */}
        <Box bg="gray.700" borderRadius="lg" border="1px" borderColor="gray.600">
          {/* Step 1: Review Parameters */}
          {currentStep === 1 && (
            <>
              <Box px={8} py={6} borderBottom="1px" borderColor="gray.600">
                <Heading as="h2" size="lg" color="white" mb={2}>
                  Review Project Parameters
                </Heading>
                <Text color="gray.300">
                  Review the parameters extracted from your project configuration
                </Text>
              </Box>
              
              <Box p={8}>
                {isLoading ? (
                  <Flex justify="center" align="center" py={12}>
                    <Spinner size="lg" color="blue.300" mr={4} />
                    <Text color="gray.300">Loading parameters...</Text>
                  </Flex>
                ) : (
                  <VStack spacing={6} align="stretch">
                    <HStack spacing={4}>
                      <Input
                        placeholder="Search parameters..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        bg="gray.600"
                        border="1px"
                        borderColor="gray.500"
                        color="white"
                        _placeholder={{ color: 'gray.400' }}
                        _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                      />
                      <Button
                        onClick={loadProjectParameters}
                        colorScheme="blue"
                        variant="solid"
                        leftIcon={<RefreshCw size={16} />}
                      >
                        Refresh
                      </Button>
                    </HStack>

                    <Box>
                      <Wrap spacing={4}>
                        {filteredParameters.map((param, index) => (
                          <WrapItem key={index}>
                            <Box bg="gray.600" p={4} borderRadius="md" border="1px" borderColor="gray.500">
                              <Text fontWeight="bold" color="white" mb={1}>
                                {param}
                              </Text>
                              <Text fontSize="sm" color="gray.300">
                                Suggested type: <Code colorScheme="blue" fontSize="sm">{inferDataTypeFromName(param)}</Code>
                              </Text>
                            </Box>
                          </WrapItem>
                        ))}
                      </Wrap>
                    </Box>

                    {projectParameters.length === 0 && (
                      <Flex justify="center" align="center" py={12} direction="column">
                        <Text fontSize="lg" fontWeight="bold" color="gray.400" mb={2}>
                          No parameters found
                        </Text>
                        <Text fontSize="sm" color="gray.500">
                          Make sure your project has configured parameters
                        </Text>
                      </Flex>
                    )}

                    <Alert status="info" borderRadius="md">
                      <AlertIcon />
                      <Box>
                        <Text fontWeight="bold" color="blue.800">Summary</Text>
                        <Text color="blue.700">
                          Found <strong>{projectParameters.length}</strong> parameters that will be mapped to database columns.
                        </Text>
                      </Box>
                    </Alert>
                  </VStack>
                )}
              </Box>
            </>
          )}

          {/* Step 2: Choose Table */}
          {currentStep === 2 && (
            <>
              <Box px={8} py={6} borderBottom="1px" borderColor="gray.600">
                <Heading as="h2" size="lg" color="white" mb={2}>
                  Choose Table Option
                </Heading>
                <Text color="gray.300">
                  Decide whether to create a new table or use an existing one
                </Text>
                {hasExistingSchema && (
                  <Text color="purple.300" fontSize="sm" mt={2}>
                    💡 Existing schema detected - "Update existing table" is recommended
                  </Text>
                )}
              </Box>
              
              <Box p={8}>
                <VStack spacing={8} align="stretch">
                  <Box>
                    <Text fontWeight="bold" color="gray.300" mb={2}>Database Schema</Text>
                    <Select
                      value={selectedSchema}
                      onChange={(e) => setSelectedSchema(e.target.value)}
                      bg="gray.600"
                      border="1px"
                      borderColor="gray.500"
                      color="white"
                      _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                    >
                      {schemas.map(schema => (
                        <option key={schema} value={schema} style={{ backgroundColor: '#4A5568', color: 'white' }}>
                          {schema}
                        </option>
                      ))}
                    </Select>
                  </Box>

                  <Flex direction={{ base: 'column', md: 'row' }} gap={6}>
                    <Box
                      flex="1"
                      p={6}
                      bg={tableChoice === 'new' ? 'blue.600' : 'gray.600'}
                      borderRadius="md"
                      border="2px"
                      borderColor={tableChoice === 'new' ? 'blue.400' : 'gray.500'}
                      cursor="pointer"
                      onClick={() => setTableChoice('new')}
                      transition="all 0.2s"
                      _hover={{ borderColor: 'blue.400' }}
                      opacity={hasExistingSchema ? 0.7 : 1}
                    >
                      <HStack mb={3}>
                        <Plus size={20} color={tableChoice === 'new' ? 'white' : '#A0AEC0'} />
                        <Text fontSize="lg" fontWeight="bold" color="white">
                          Create New Table
                        </Text>
                        {hasExistingSchema && (
                          <Badge colorScheme="orange" size="sm">Not Recommended</Badge>
                        )}
                      </HStack>
                      <Text color="gray.200">
                        Create a fresh table with all project parameters mapped to columns
                      </Text>
                      {hasExistingSchema && (
                        <Text color="orange.200" fontSize="sm" mt={2}>
                          ⚠️ This will ignore existing schema configuration
                        </Text>
                      )}
                    </Box>

                    <Box
                      flex="1"
                      p={6}
                      bg={tableChoice === 'existing' ? 'green.600' : 'gray.600'}
                      borderRadius="md"
                      border="2px"
                      borderColor={tableChoice === 'existing' ? 'green.400' : 'gray.500'}
                      cursor="pointer"
                      onClick={() => setTableChoice('existing')}
                      transition="all 0.2s"
                      _hover={{ borderColor: 'green.400' }}
                    >
                      <HStack mb={3}>
                        <Database size={20} color={tableChoice === 'existing' ? 'white' : '#A0AEC0'} />
                        <Text fontSize="lg" fontWeight="bold" color="white">
                          Use Existing Table
                        </Text>
                        {hasExistingSchema && (
                          <Badge colorScheme="green" size="sm">Recommended</Badge>
                        )}
                      </HStack>
                      <Text color="gray.200">
                        Map parameters to existing table columns or add new columns
                      </Text>
                      {hasExistingSchema && (
                        <Text color="green.200" fontSize="sm" mt={2}>
                          ✓ Will load existing schema configuration
                        </Text>
                      )}
                    </Box>
                  </Flex>

                  {tableChoice === 'new' && (
                    <Box>
                      <Text fontWeight="bold" color="gray.300" mb={2}>New Table Name</Text>
                      <Input
                        value={tableName}
                        onChange={(e) => setTableName(e.target.value)}
                        placeholder="Enter table name"
                        bg="gray.600"
                        border="1px"
                        borderColor="gray.500"
                        color="white"
                        _placeholder={{ color: 'gray.400' }}
                        _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                      />
                      {hasExistingSchema && (
                        <Text color="orange.300" fontSize="sm" mt={2}>
                          Note: Creating a new table will not use the existing schema mapping for "{existingSchemaMapping?.table_name}"
                        </Text>
                      )}
                    </Box>
                  )}

                  {tableChoice === 'existing' && (
                    <Box>
                      <Text fontWeight="bold" color="gray.300" mb={2}>Select Existing Table</Text>
                      <Select
                        value={selectedExistingTable}
                        onChange={(e) => setSelectedExistingTable(e.target.value)}
                        placeholder="Select a table"
                        bg="gray.600"
                        border="1px"
                        borderColor="gray.500"
                        color="white"
                        _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                      >
                        {existingTables.map(table => {
                          const isRecommended = hasExistingSchema && table.table_name === existingSchemaMapping?.table_name;
                          return (
                            <option 
                              key={table.table_name} 
                              value={table.table_name}
                              style={{ 
                                backgroundColor: isRecommended ? '#22543D' : '#4A5568', 
                                color: 'white' 
                              }}
                            >
                              {table.table_name} ({table.column_count} columns) {isRecommended ? '★ Existing Schema' : ''}
                            </option>
                          );
                        })}
                      </Select>
                      {hasExistingSchema && selectedExistingTable === existingSchemaMapping?.table_name && (
                        <Text color="green.300" fontSize="sm" mt={2}>
                          ✓ This table has existing schema configuration that will be loaded
                        </Text>
                      )}
                    </Box>
                  )}
                </VStack>
              </Box>
            </>
          )}

          {/* Step 3: Configure Schema */}
          {currentStep === 3 && (
            <>
              <Box px={8} py={6} borderBottom="1px" borderColor="gray.600">
                <Flex justify="space-between" align="center">
                  <Box>
                    <Heading as="h2" size="lg" color="white" mb={2}>
                      Configure Schema Mapping
                    </Heading>
                    <Text color="gray.300">
                      Configure how parameters map to database columns
                    </Text>
                    {tableChoice === 'existing' && selectedExistingTable && (
                      <Text color="blue.300" fontSize="sm" mt={1}>
                        Working with existing table: {selectedExistingTable}
                      </Text>
                    )}
                    {hasExistingSchema && existingSchemaMapping && (
                      <Text color="purple.300" fontSize="sm" mt={1}>
                        Loaded existing schema configuration with {existingSchemaMapping.column_mappings?.length || 0} columns
                      </Text>
                    )}
                  </Box>
                  <HStack spacing={3}>
                    <Button
                      onClick={addCustomColumn}
                      colorScheme="blue"
                      variant="solid"
                      leftIcon={<Plus size={16} />}
                      size="sm"
                    >
                      Add Column
                    </Button>
                    <Button
                      onClick={validateSchema}
                      isLoading={isValidating}
                      colorScheme="purple"
                      variant="solid"
                      leftIcon={<Settings size={16} />}
                      size="sm"
                    >
                      Validate
                    </Button>
                    <Button
                      onClick={previewSQL}
                      colorScheme="gray"
                      variant="solid"
                      leftIcon={<Eye size={16} />}
                      size="sm"
                    >
                      Preview SQL
                    </Button>
                  </HStack>
                </Flex>
              </Box>

              {/* Activity Logs and Parameter Summary for existing table operations */}
              {tableChoice === 'existing' && (
                <Box px={8} py={4} bg="gray.750" borderBottom="1px" borderColor="gray.600">
                  <HStack spacing={8} align="start">
                    {/* Activity Logs */}
                    {logs.length > 0 && (
                      <VStack spacing={2} align="start" flex="1">
                        <Text fontSize="sm" fontWeight="bold" color="gray.300">Activity Log:</Text>
                        <VStack spacing={1} align="start" maxH="100px" overflowY="auto">
                          {logs.slice(-5).map((log) => (
                            <Text key={log.id} fontSize="xs" color={
                              log.level === 'success' ? 'green.300' : 
                              log.level === 'error' ? 'red.300' : 'gray.400'
                            }>
                              [{log.timestamp}] {log.message}
                            </Text>
                          ))}
                        </VStack>
                      </VStack>
                    )}
                    
                    {/* Available Parameters Summary */}
                    <VStack spacing={2} align="start" flex="1">
                      <Text fontSize="sm" fontWeight="bold" color="gray.300">Available Parameters:</Text>
                      <Box maxH="100px" overflowY="auto">
                        <Wrap spacing={1}>
                          {projectParameters.filter(param => {
                            // Show parameters that are not yet mapped to existing columns
                            return !columnMappings.some(mapping => 
                              mapping.isExistingColumn && mapping.sourceParameter === param
                            );
                          }).map((param) => (
                            <WrapItem key={param}>
                              <Badge colorScheme="yellow" size="sm" variant="outline">
                                {param}
                              </Badge>
                            </WrapItem>
                          ))}
                        </Wrap>
                      </Box>
                      <Text fontSize="xs" color="gray.400">
                        Unmapped parameters will create new columns
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
              )}
              
              <Box overflowX="auto">
                <Table variant="simple" size="sm">
                  <Thead bg="gray.600">
                    <Tr>
                      <Th color="gray.200" borderColor="gray.500">Column Name</Th>
                      <Th color="gray.200" borderColor="gray.500">Data Type</Th>
                      <Th color="gray.200" borderColor="gray.500">Source Parameter</Th>
                      <Th color="gray.200" borderColor="gray.500">Type</Th>
                      <Th color="gray.200" borderColor="gray.500">Options</Th>
                      <Th color="gray.200" borderColor="gray.500">Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {columnMappings.map((mapping, index) => (
                      <Tr key={mapping.id} bg={index % 2 === 0 ? 'gray.700' : 'gray.650'}>
                        <Td borderColor="gray.600">
                          <Input
                            value={mapping.name}
                            onChange={(e) => updateColumnMapping(mapping.id, 'name', e.target.value)}
                            isDisabled={mapping.isSystemColumn || mapping.isExistingColumn}
                            size="sm"
                            bg={mapping.isExistingColumn ? "gray.500" : "gray.600"}
                            border="1px"
                            borderColor="gray.500"
                            color="white"
                            _disabled={{ bg: 'gray.500', color: 'gray.300' }}
                          />
                          {mapping.isExistingColumn && (
                            <Text fontSize="xs" color="blue.300" mt={1}>
                              Existing column
                            </Text>
                          )}
                        </Td>
                        <Td borderColor="gray.600">
                          {mapping.isExistingColumn ? (
                            <Text
                              fontSize="sm"
                              color="white"
                              bg="gray.500"
                              p={2}
                              borderRadius="md"
                              border="1px"
                              borderColor="gray.500"
                            >
                              {mapping.dataType}
                            </Text>
                          ) : (
                            <Select
                              value={mapping.dataType}
                              onChange={(e) => updateColumnMapping(mapping.id, 'dataType', e.target.value)}
                              isDisabled={mapping.isSystemColumn}
                              size="sm"
                              bg="gray.600"
                              border="1px"
                              borderColor="gray.500"
                              color="white"
                              _disabled={{ bg: 'gray.500', color: 'gray.300' }}
                            >
                              {dataTypeOptions.map(type => (
                                <option 
                                  key={type} 
                                  value={type}
                                  style={{ backgroundColor: '#4A5568', color: 'white' }}
                                >
                                  {type}
                                </option>
                              ))}
                            </Select>
                          )}
                          {mapping.isExistingColumn && (
                            <Text fontSize="xs" color="blue.300" mt={1} fontStyle="italic">
                              Cannot modify existing column type
                            </Text>
                          )}
                        </Td>
                        <Td borderColor="gray.600">
                          {mapping.isExistingColumn ? (
                            <Select
                              value={mapping.sourceParameter || ''}
                              onChange={(e) => updateColumnMapping(mapping.id, 'sourceParameter', e.target.value)}
                              placeholder="Select parameter to map"
                              size="sm"
                              bg="gray.600"
                              border="1px"
                              borderColor="gray.500"
                              color="white"
                            >
                              <option value="" style={{ backgroundColor: '#4A5568', color: 'white' }}>
                                -- No mapping --
                              </option>
                              {projectParameters.map(param => (
                                <option 
                                  key={param} 
                                  value={param}
                                  style={{ backgroundColor: '#4A5568', color: 'white' }}
                                >
                                  {param}
                                </option>
                              ))}
                            </Select>
                          ) : (
                            <Text
                              fontSize="sm"
                              color="white"
                              bg="gray.600"
                              p={2}
                              borderRadius="md"
                              border="1px"
                              borderColor="gray.500"
                            >
                              {mapping.sourceParameter || (
                                <Text as="span" color="gray.400" fontStyle="italic">
                                  {mapping.description}
                                </Text>
                              )}
                            </Text>
                          )}
                        </Td>
                        <Td borderColor="gray.600">
                          <Badge colorScheme={getTypeColor(mapping.parameterType)} size="sm">
                            {mapping.parameterType}
                          </Badge>
                        </Td>
                        <Td borderColor="gray.600">
                          <VStack spacing={1} align="start">
                            <Checkbox
                              isChecked={!mapping.isNullable}
                              onChange={(e) => updateColumnMapping(mapping.id, 'isNullable', !e.target.checked)}
                              isDisabled={mapping.isSystemColumn || (mapping.isExistingColumn && mapping.isPrimaryKey)}
                              colorScheme="blue"
                              size="sm"
                            >
                              <Text fontSize="sm" color="gray.200">Required</Text>
                            </Checkbox>
                            {mapping.isPrimaryKey && (
                              <Text fontSize="xs" color="blue.300">
                                Primary Key
                              </Text>
                            )}
                            {mapping.defaultValue && (
                              <Text fontSize="xs" color="green.300">
                                Default: {mapping.defaultValue}
                              </Text>
                            )}
                          </VStack>
                        </Td>
                        <Td borderColor="gray.600">
                          {!mapping.isSystemColumn && !mapping.isExistingColumn && (
                            <Button
                              onClick={() => removeColumnMapping(mapping.id)}
                              colorScheme="red"
                              variant="ghost"
                              size="sm"
                              p={2}
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                          {mapping.isExistingColumn && (
                            <Text fontSize="xs" color="blue.300">
                              Existing
                            </Text>
                          )}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>

              {validation && (
                <Box p={6} borderTop="1px" borderColor="gray.600">
                  <Heading as="h4" size="md" color="white" mb={4}>
                    <HStack>
                      {validation.isValid ? (
                        <Check size={20} color="#48BB78" />
                      ) : (
                        <AlertTriangle size={20} color="#F56565" />
                      )}
                      <Text>Schema Validation</Text>
                    </HStack>
                  </Heading>
                  
                  {validation.errors?.length > 0 && (
                    <Alert status="error" mb={4} borderRadius="md">
                      <AlertIcon />
                      <Box>
                        <Text fontWeight="bold" color="red.800">Errors:</Text>
                        <VStack align="start" spacing={1} mt={2}>
                          {validation.errors.map((error, index) => (
                            <Text key={index} fontSize="sm" color="red.700">
                              • {error}
                            </Text>
                          ))}
                        </VStack>
                      </Box>
                    </Alert>
                  )}
                  
                  {validation.warnings?.length > 0 && (
                    <Alert status="warning" mb={4} borderRadius="md">
                      <AlertIcon />
                      <Box>
                        <Text fontWeight="bold" color="yellow.800">Warnings:</Text>
                        <VStack align="start" spacing={1} mt={2}>
                          {validation.warnings.map((warning, index) => (
                            <Text key={index} fontSize="sm" color="yellow.700">
                              • {warning}
                            </Text>
                          ))}
                        </VStack>
                      </Box>
                    </Alert>
                  )}

                  {validation.isValid && (!validation.errors || validation.errors.length === 0) && (
                    <Alert status="success" borderRadius="md">
                      <AlertIcon />
                      <Box>
                        <Text fontWeight="bold" color="green.800">Schema is Valid</Text>
                        <Text color="green.700" fontSize="sm">
                          Your schema configuration is ready for creation.
                        </Text>
                      </Box>
                    </Alert>
                  )}
                </Box>
              )}
            </>
          )}

          {/* Step 4: Finalize */}
          {currentStep === 4 && (
            <>
              <Box px={8} py={6} borderBottom="1px" borderColor="gray.600">
                <Heading as="h2" size="lg" color="white" mb={2}>
                  Finalize Schema Configuration
                </Heading>
                <Text color="gray.300">
                  Review and confirm your database schema configuration
                </Text>
              </Box>
              
              <Box p={8}>
                <VStack spacing={6} align="stretch">
                  {/* Configuration Summary */}
                  <Box bg="blue.600" p={6} borderRadius="md" border="1px" borderColor="blue.500">
                    <HStack mb={4}>
                      <Info size={20} color="white" />
                      <Text fontSize="lg" fontWeight="bold" color="white">
                        Configuration Summary
                      </Text>
                    </HStack>
                    <Flex direction={{ base: 'column', md: 'row' }} gap={4}>
                      <VStack spacing={2} align="start" flex="1">
                        <HStack justify="space-between" w="full">
                          <Text color="blue.100">Action:</Text>
                          <Text fontWeight="bold" color="white">
                            {tableChoice === 'new' ? 'Create new table' : 'Update existing table'}
                          </Text>
                        </HStack>
                        <HStack justify="space-between" w="full">
                          <Text color="blue.100">Schema:</Text>
                          <Text fontWeight="bold" color="white">{selectedSchema}</Text>
                        </HStack>
                      </VStack>
                      <VStack spacing={2} align="start" flex="1">
                        <HStack justify="space-between" w="full">
                          <Text color="blue.100">Table:</Text>
                          <Text fontWeight="bold" color="white">
                            {tableChoice === 'new' ? tableName : selectedExistingTable}
                          </Text>
                        </HStack>
                        <HStack justify="space-between" w="full">
                          <Text color="blue.100">Total Columns:</Text>
                          <Text fontWeight="bold" color="white">{columnMappings.length}</Text>
                        </HStack>
                      </VStack>
                    </Flex>
                    
                    <Wrap spacing={2} mt={4}>
                      <WrapItem>
                        <Badge colorScheme="gray" size="sm">
                          {columnMappings.filter(col => col.isSystemColumn || col.parameterType === 'system').length} System
                        </Badge>
                      </WrapItem>
                      <WrapItem>
                        <Badge colorScheme="green" size="sm">
                          {columnMappings.filter(col => col.parameterType === 'regular').length} Data
                        </Badge>
                      </WrapItem>
                      <WrapItem>
                        <Badge colorScheme="orange" size="sm">
                          {columnMappings.filter(col => col.parameterType === 'custom').length} Custom
                        </Badge>
                      </WrapItem>
                      <WrapItem>
                        <Badge colorScheme="blue" size="sm">
                          {columnMappings.filter(col => col.parameterType === 'existing').length} Existing
                        </Badge>
                      </WrapItem>
                      <WrapItem>
                        <Badge colorScheme="purple" size="sm">
                          {columnMappings.filter(col => col.parameterType === 'mapped').length} Mapped
                        </Badge>
                      </WrapItem>
                      {tableChoice === 'existing' && (
                        <WrapItem>
                          <Badge colorScheme="yellow" size="sm">
                            {columnMappings.filter(col => col.willBeAdded).length} To Add
                          </Badge>
                        </WrapItem>
                      )}
                    </Wrap>

                    {hasExistingSchema && (
                      <Box mt={4} p={3} bg="purple.700" borderRadius="md">
                        <Text fontSize="sm" color="white" fontWeight="bold">
                          📋 Using Existing Schema Configuration
                        </Text>
                        <Text fontSize="xs" color="purple.100" mt={1}>
                          Schema originally created: {new Date(existingSchemaMapping.created_at).toLocaleDateString()}
                        </Text>
                      </Box>
                    )}
                  </Box>

                  {/* Column Details */}
                  <Box bg="gray.600" p={6} borderRadius="md" border="1px" borderColor="gray.500">
                    <Heading as="h4" size="md" color="white" mb={4}>
                      Column Details
                    </Heading>
                    <Wrap spacing={4}>
                      {columnMappings.map(mapping => (
                        <WrapItem key={mapping.id}>
                          <Box bg="gray.700" p={4} borderRadius="md" border="1px" borderColor="gray.600" minW="250px">
                            <HStack justify="space-between" mb={2}>
                              <Text fontWeight="bold" color="white">{mapping.name}</Text>
                              <Badge colorScheme={getTypeColor(mapping.parameterType)} size="sm">
                                {mapping.parameterType}
                              </Badge>
                            </HStack>
                            <VStack align="start" spacing={1}>
                              <HStack>
                                <Code colorScheme="gray" fontSize="xs">{mapping.dataType}</Code>
                                {mapping.isPrimaryKey && (
                                  <Badge colorScheme="blue" size="xs">Primary Key</Badge>
                                )}
                                {!mapping.isNullable && (
                                  <Badge colorScheme="orange" size="xs">Required</Badge>
                                )}
                              </HStack>
                              {mapping.sourceParameter && (
                                <Text fontSize="xs" color="gray.300">
                                  Maps to: {mapping.sourceParameter}
                                </Text>
                              )}
                              {mapping.isExistingColumn && !mapping.sourceParameter && (
                                <Text fontSize="xs" color="blue.300">
                                  Existing column (unmapped)
                                </Text>
                              )}
                              {mapping.willBeAdded && (
                                <Text fontSize="xs" color="green.300">
                                  Will be added to table
                                </Text>
                              )}
                            </VStack>
                          </Box>
                        </WrapItem>
                      ))}
                    </Wrap>
                  </Box>
                </VStack>
              </Box>
            </>
          )}
        </Box>

        {/* Navigation buttons */}
        <Divider my={6} borderColor="gray.600" />
        <Flex justify="space-between" align="center">
          <HStack spacing={4}>
            {onBackToProjects && currentStep === 1 && (
              <Button
                onClick={onBackToProjects}
                colorScheme="yellow"
                variant="solid"
                leftIcon={<ArrowLeft size={16} />}
              >
                Back to Projects
              </Button>
            )}

            {currentStep > 1 && (
              <Button
                onClick={prevStep}
                colorScheme="gray"
                variant="solid"
                leftIcon={<ArrowLeft size={16} />}
              >
                Previous
              </Button>
            )}
            
          </HStack>

          <HStack spacing={4}>
            {currentStep < steps.length && (
              <Button
                onClick={nextStep}
                isDisabled={!canProceedToNextStep()}
                colorScheme="blue"
                variant="solid"
                rightIcon={<ChevronRight size={16} />}
              >
                Next
              </Button>
            )}

            {currentStep === steps.length && (
              <Button
                onClick={createOrUpdateTable}
                isLoading={isCreating}
                isDisabled={validation && !validation.isValid && validation.errors?.length > 0}
                colorScheme="green"
                variant="solid"
                leftIcon={<Database size={16} />}
                rightIcon={<ChevronRight size={16} />}
              >
                {isCreating 
                  ? (tableChoice === 'new' ? 'Creating Schema...' : 'Updating Schema...') 
                  : (tableChoice === 'new' ? 'Create Schema & Continue' : 'Update Schema & Continue')
                }
              </Button>
            )}
          </HStack>
        </Flex>
      </Box>

      {/* SQL Preview Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent bg="gray.800" color="white" maxW="800px">
          <ModalHeader>
            Database Schema Preview
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody maxH="600px" overflowY="auto">
            <VStack spacing={4} align="stretch">
              <Text color="gray.300">
                This SQL will be executed to {tableChoice === 'new' ? 'create your database table' : 'modify your existing table'}:
              </Text>
              <Box bg="gray.900" p={6} borderRadius="md" overflowX="auto">
                <Text 
                  fontFamily="mono" 
                  fontSize="sm" 
                  color="green.300" 
                  whiteSpace="pre-wrap" 
                  lineHeight="1.6"
                >
                  {previewSql}
                </Text>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose} colorScheme="gray" variant="solid">
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default SchemaMapping;