import PDFViewer from './PDFViewer';
import { logFileDebug } from '../utils/fileDebug';
import { useEffect } from 'react';
import React, { useState } from 'react';
import axios from 'axios';
import { 
  Textarea, 
  VStack, 
  HStack,
  Box, 
  Heading, 
  FormControl, 
  FormLabel, 
  Modal, 
  ModalOverlay, 
  ModalContent, 
  ModalHeader, 
  ModalFooter, 
  ModalBody, 
  ModalCloseButton,
  Button,
  useDisclosure,
  Input,
  Text,
  Badge,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import ConfigStepIndicator from '../configure/ConfigStepIndicator';
import SplitStep from '../steps/SplitStep';
import ReviewStep from '../steps/ReviewStep';
import ExtractStep from '../steps/ExtractStep';
import ViewResultsComponent from './ViewResultsComponent';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const ConfigurationEditor = ({
  templateType,
  files,
  configStep,
  setConfigStep,
  sections,
  setSections,
  parameters,
  setParameters,
  projectDetails,
  onSave,
  onBack,
  onComplete
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentSection, setCurrentSection] = useState(null);
  const [splitPrompt, setSplitPrompt] = useState('');
  const [error, setError] = useState(null);
  const [hasSplitData, setHasSplitData] = useState(false);
  const [loadedSubsections, setLoadedSubsections] = useState({});
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [hasManuallyCleared, setHasManuallyCleared] = useState(false);

  // Handle region selection for fixed format PDFs
  const handleRegionSelect = (region) => {
    if (templateType === 'fixed') {
      console.log('Raw region from PDFViewer:', region);
      
      // Extract coordinate metadata from the region or build it
      let coordinateMetadata = region.coordinateMetadata || {};
      
      // If coordinateMetadata is missing key data, try to extract from region properties
      if (!coordinateMetadata.canvasActualSize || !coordinateMetadata.pdfPageSize) {
        // Try to get canvas and PDF dimensions from the region
        coordinateMetadata = {
          // Canvas coordinates (what we drew)
          canvasCoords: {
            x1: region.x1 || region.x,
            y1: region.y1 || region.y,
            x2: region.x2 || (region.x + region.width),
            y2: region.y2 || (region.y + region.height)
          },
          
          // Canvas actual dimensions - try multiple sources
          canvasActualSize: {
            width: region.canvasActualSize?.width || 
                   region.coordinateMetadata?.canvasActualSize?.width ||
                   region.canvasWidth || 
                   region.pdfCanvasWidth ||
                   800, // fallback
            height: region.canvasActualSize?.height || 
                    region.coordinateMetadata?.canvasActualSize?.height ||
                    region.canvasHeight || 
                    region.pdfCanvasHeight ||
                    600 // fallback
          },
          
          // Canvas display dimensions
          canvasDisplaySize: {
            width: region.canvasDisplaySize?.width || 
                   region.coordinateMetadata?.canvasDisplaySize?.width ||
                   region.displayWidth ||
                   region.canvasActualSize?.width || 
                   800, // fallback
            height: region.canvasDisplaySize?.height || 
                    region.coordinateMetadata?.canvasDisplaySize?.height ||
                    region.displayHeight ||
                    region.canvasActualSize?.height || 
                    600 // fallback
          },
          
          // PDF page dimensions - CRITICAL for coordinate conversion
          pdfPageSize: {
            width: region.pdfPageSize?.width || 
                   region.coordinateMetadata?.pdfPageSize?.width ||
                   region.pdfPageWidth || 
                   612, // fallback (US Letter width in points)
            height: region.pdfPageSize?.height || 
                    region.coordinateMetadata?.pdfPageSize?.height ||
                    region.pdfPageHeight || 
                    792 // fallback (US Letter height in points)
          },
          
          // Scale information
          scale: region.scale || region.coordinateMetadata?.scale || 'unknown',
          fitToWidth: region.fitToWidth || region.coordinateMetadata?.fitToWidth || false,
          
          // Calculated scale factors if available
          calculatedScaleX: region.calculatedScaleX || region.coordinateMetadata?.calculatedScaleX,
          calculatedScaleY: region.calculatedScaleY || region.coordinateMetadata?.calculatedScaleY,
          
          // Additional debugging info
          coordinateSystem: 'canvas-pixels-to-pdf-points',
          timestamp: new Date().toISOString(),
          browserInfo: {
            userAgent: navigator.userAgent,
            devicePixelRatio: window.devicePixelRatio || 1
          }
        };
      }
      
      // Log the coordinate metadata to debug
      console.log('Coordinate metadata being sent:', coordinateMetadata);
      
      const enhancedRegion = {
        // Basic coordinates
        x: region.x || region.x1,
        y: region.y || region.y1,
        width: region.width || Math.abs((region.x2 || 0) - (region.x1 || 0)),
        height: region.height || Math.abs((region.y2 || 0) - (region.y1 || 0)),
        x1: region.x1,
        y1: region.y1,
        x2: region.x2,
        y2: region.y2,
        page: region.page || 1,
        
        // Parameter information (will be filled by user)
        parameterName: '',
        parameter_name: '',
        extractionPrompt: '', // Will be auto-generated when user enters parameter name
        
        // Enhanced coordinate metadata
        coordinateMetadata: coordinateMetadata,
        
        // Legacy viewport fields for backward compatibility
        viewportWidth: region.viewportWidth || window.innerWidth,
        viewportHeight: region.viewportHeight || window.innerHeight,
        scaleFactor: region.scaleFactor || 1,
        coordinateSystem: 'frontend-pixels',
        timestamp: new Date().toISOString()
      };
      
      console.log('Enhanced region being added:', enhancedRegion);
      
      // Add region directly to the list
      const newRegions = [...selectedRegions, enhancedRegion];
      setSelectedRegions(newRegions);
      
      console.log('Region added directly, total regions:', newRegions.length);
    }
  };

  const handleDeleteRegion = (index) => {
    // Special case: -1 means "clear all regions"
    if (index === -1) {
      setSelectedRegions([]);
      // Force immediate redraw
      if (window.redrawPdfRegions) window.redrawPdfRegions();
      return;
    }
    const updatedRegions = [...selectedRegions];
    updatedRegions.splice(index, 1);
    setSelectedRegions(updatedRegions);
    // Force immediate redraw
    if (window.redrawPdfRegions) {
      window.redrawPdfRegions();
    }
  };

  // Enhanced function to process and validate backend response
  const processBackendSections = (responseData) => {
    console.log('Raw backend response:', responseData);
    
    try {
      let sectionsData = [];
      let pdfViewerRegions = [];
      
      // Handle different response formats
      if (responseData.rawSecs) {
        sectionsData = responseData.rawSecs;
        // Extract PDF viewer regions from response
        pdfViewerRegions = responseData.pdf_viewer_regions || [];
        console.log('Found rawSecs array:', sectionsData);
        console.log('Found PDF viewer regions:', pdfViewerRegions.length);
      } else if (responseData.sections) {
        sectionsData = responseData.sections;
      } else if (Array.isArray(responseData)) {
        sectionsData = responseData;
      } else if (responseData.data && responseData.data.sections) {
        sectionsData = responseData.data.sections;
      } else if (responseData.data && responseData.data.rawSecs) {
        sectionsData = responseData.data.rawSecs;
        pdfViewerRegions = responseData.data.pdf_viewer_regions || [];
      } else {
        console.error('Available keys in response:', Object.keys(responseData));
        throw new Error('Invalid response format: no sections found');
      }

      if (!Array.isArray(sectionsData)) {
        throw new Error('Sections data is not an array');
      }

      // Process each section
      const validSections = sectionsData.map((section, index) => {
        console.log(`Processing section ${index}:`, section);
        
        let processedSection = {
          id: null,
          title: `Section ${index + 1}`,
          content: '',
          extractedParameters: []
        };

        // Check if this is an extracted parameter object (fixed format)
        if (section.section_id && section.parameter_name && section.extracted_value !== undefined) {
          processedSection = {
            id: section.section_id,
            title: section.parameter_name || `Parameter ${index + 1}`,
            content: section.content || section.extracted_value || '',
            extractedValue: section.extracted_value,
            confidence: section.confidence,
            extractionMethod: section.extraction_method,
            characterCount: section.char_count,
            wordCount: section.word_count,
            type: section.type,
            processingTimestamp: section.processing_timestamp,
            imageCropPath: section.image_crop_path,
            
            // Region/coordinate information
            bbox: section.bbox,
            imageBbox: section.image_bbox,
            originalFrontendCoords: section.original_frontend_coords,
            coordinateMetadata: section.coordinate_metadata,
            canvasInfoUsed: section.canvas_info_used,
            
            // Additional metadata
            description: section.description,
            extractionPrompt: section.extraction_prompt,
            page: section.page || 1,
            
            // Mark as parameter section
            isParameterSection: true,
            isExtracted: true
          };
        }
        // Handle other section formats (existing logic for running format)
        else if (typeof section === 'string') {
          processedSection.content = section;
          processedSection.title = `Section ${index + 1}`;
          processedSection.id = `section-${index + 1}`;
        }
        else if (typeof section === 'object' && section !== null) {
          if (section.content !== undefined) {
            processedSection.content = String(section.content);
            processedSection.title = section.title || `Section ${index + 1}`;
            
            if (section.title) {
              processedSection.id = section.title || section.name;
            } else if (section.id) {
              processedSection.id = section.id;
            } else {
              processedSection.id = `section-${index + 1}`;
            }
            
            // Preserve region info if available
            if (section.region) {
              processedSection.region = section.region;
            }
            if (section.parentSectionId) {
              processedSection.parentSectionId = section.parentSectionId;
            }
            if (section.parentSectionTitle) {
              processedSection.parentSectionTitle = section.parentSectionTitle;
            }
            if (section.isSubSection) {
              processedSection.isSubSection = section.isSubSection;
            }
          } else {
            // Try to extract content from various possible fields
            const possibleContentFields = ['text', 'data', 'body', 'value', 'description', 'extracted_value'];
            let foundContent = '';
            
            for (const field of possibleContentFields) {
              if (section[field] && typeof section[field] === 'string') {
                foundContent = section[field];
                break;
              }
            }
            
            processedSection.content = foundContent || JSON.stringify(section, null, 2);
            processedSection.title = section.title || section.name || section.parameter_name || `Section ${index + 1}`;
            
            if (section.section_id) {
              processedSection.id = section.section_id;
            } else if (section.title) {
              processedSection.id = section.title || section.name;
            } else if (section.id) {
              processedSection.id = section.id; 
            } else {
              processedSection.id = `section-${index + 1}`;
            }
          }
        } else {
          processedSection.content = String(section);
          processedSection.title = `Section ${index + 1}`;
          processedSection.id = `section-${index + 1}`;
        }

        // Ensure content is not empty
        if (!processedSection.content || processedSection.content.trim() === '') {
          processedSection.content = processedSection.extractedValue || 'No content extracted for this section';
        }

        // Handle very short content that might be incomplete
        if (processedSection.content && processedSection.content.length < 10 && processedSection.content !== 'UNCERTAIN') {
          console.warn(`Section ${index + 1} has very short content:`, processedSection.content);
        }

        // Truncate very long content for display
        if (processedSection.content && processedSection.content.length > 5000) {
          processedSection.content = processedSection.content.substring(0, 5000) + '... [content truncated]';
        }

        console.log(`Processed section ${index + 1}:`, {
          id: processedSection.id,
          title: processedSection.title,
          contentLength: processedSection.content?.length || 0,
          contentPreview: processedSection.content?.substring(0, 50) + '...',
          isParameterSection: processedSection.isParameterSection,
          extractedValue: processedSection.extractedValue,
          confidence: processedSection.confidence
        });

        return processedSection;
      });

      console.log('Processed sections:', validSections);
      
      // Return both sections and PDF viewer regions
      return { 
        sections: validSections, 
        pdfViewerRegions: pdfViewerRegions 
      };

    } catch (error) {
      console.error('Error processing backend sections:', error);
      throw new Error(`Failed to process sections: ${error.message}`);
    }
  };

  // Updated loadSubsectionsForSection to also check for parameter sections
  const loadSubsectionsForSection = async (sectionId) => {
    try {
      // Skip loading subsections for parameter sections
      if (sectionId?.startsWith('param_')) {
        console.log(`Skipping subsection loading for parameter section: ${sectionId}`);
        return null;
      }
      
      const response = await axios.get(`${API_BASE_URL}/config/projects/${projectDetails.projectId}/sections/${sectionId}/subsections`);
      if (response.data && response.data.subsections && response.data.subsections.length > 0) {
        console.log(`Found ${response.data.subsections.length} subsections for section ${sectionId}`);
        
        // Convert subsections to the format expected by our sections array
        const convertedSubsections = response.data.subsections.map((subsection, index) => ({
          id: `${sectionId}_section_${index + 1}`,
          title: subsection.subsection_id || `${sectionId} - Subsection ${index + 1}`,
          content: subsection.content || '',
          parentSectionId: sectionId,
          parentSectionTitle: sections.find(s => s.id === sectionId)?.title || sectionId,
          isSubSection: true,
          splitRules: subsection.split_rules || []
        }));
        
        return {
          subsections: convertedSubsections,
          splitPrompt: response.data.split_prompt
        };
      }
    } catch (error) {
      console.log(`No subsections found for section ${sectionId}:`, error.message);
    }
    return null;
  };

  // Organize sections into groups and standalone sections for navigation
  const organizedSections = React.useMemo(() => {
    const groups = {};
    const standaloneSections = [];
    
    sections.forEach(section => {
      // Detect if this is a sub-section
      const isSubSection = section.id.includes('_section_') || 
                          section.isSubSection ||
                          section.parentSectionId;
      
      if (isSubSection) {
        // Find parent section info
        let parentName = 'Unknown Parent';
        let parentId = 'unknown';
        
        if (section.parentSectionTitle && section.parentSectionId) {
          parentName = section.parentSectionTitle;
          parentId = section.parentSectionId;
        } else if (section.id.includes('_section_')) {
          parentId = section.id.split('_section_')[0];
          const parentSection = sections.find(s => s.id === parentId);
          parentName = parentSection?.title || parentId;
        }
        
        if (!groups[parentId]) {
          groups[parentId] = {
            parentId: parentId,
            parentName: parentName,
            subSections: [],
            // Create a virtual group section for navigation
            groupSection: {
              id: parentId,
              title: parentName,
              content: '',
              isGroup: true
            }
          };
        }
        groups[parentId].subSections.push(section);
        
        // Combine content from all sub-sections for the group
        if (section.content) {
          groups[parentId].groupSection.content += (groups[parentId].groupSection.content ? '\n\n---\n\n' : '') + 
            `[${section.title}]\n${section.content}`;
        }
      } else {
        // Check if this section has sub-sections
        const hasSubSections = sections.some(other => 
          other.id !== section.id && 
          (other.parentSectionId === section.id || 
           other.id.startsWith(section.id + '_section_'))
        );
        
        if (!hasSubSections) {
          standaloneSections.push(section);
        }
      }
    });
    
    return { groups, standaloneSections };
  }, [sections]);

  // Get all extractable sections (group sections + standalone sections) for navigation
  const extractableSections = React.useMemo(() => {
    const ordered = [];

    sections.forEach(section => {
      const isSub =
        section.id.includes('_section_') ||
        section.isSubSection ||
        section.parentSectionId;

      if (isSub) return;

      if (organizedSections.groups[section.id]) {
        const groupSection = organizedSections.groups[section.id].groupSection;
        if (groupSection && groupSection.id) {
          ordered.push(groupSection);
        }
      } else {
        ordered.push(section);
      }
    });

    return ordered.filter(s => s && s.id);
  }, [sections, organizedSections]);

  // Handle splitting PDF into sections using the API
  const handleSplitPDF = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!files || files.length === 0) {
        throw new Error('No file selected');
      }

      const fileId = files[0].fileId || files[0].id;
      
      if (!fileId) {
        console.error('File object:', files[0]);
        throw new Error('Invalid file: missing ID');
      }
      
      console.log('Using file ID for split operation:', fileId);
      
      const requestData = {
        fileId,
        templateType,
        projectId: projectDetails.projectId,
        redo_split: hasManuallyCleared 
      };
      
      // Add template-specific data
      if (templateType === 'running') {
        if (!splitPrompt || splitPrompt.trim() === '') {
          throw new Error('Please provide splitting instructions');
        }
        requestData.splitPrompt = splitPrompt;
      } else {
        // Fixed format - send regions
        if (!selectedRegions || selectedRegions.length === 0) {
          throw new Error('Please select at least one region on the document');
        }
        requestData.selectedRegions = selectedRegions;
      }
      
      console.log('Calling split API with:', requestData);
      
      // Call the split API
      const response = await axios.post(`${API_BASE_URL}/pdf/split`, requestData, {
        timeout: 10 * 60 * 1000, // 10 minutes
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.lengthComputable) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`Upload progress: ${percentCompleted}%`);
          }
        },
        responseTimeout: 10 * 60 * 1000, // 10 minutes
        validateStatus: function (status) {
          return status < 600;
        }
      });
      
      console.log('Split API response:', response.data);
      
      // Process the backend response
      const result = processBackendSections(response.data);
      const processedSections = result.sections || result;
      const pdfViewerRegions = result.pdfViewerRegions || [];
      
      if (processedSections.length === 0) {
        throw new Error('No sections were detected in the document. Please try a different split method or check your document.');
      }
      
      setSections(processedSections);
      
      // Update selectedRegions with returned PDF viewer regions to show bounding boxes
      if (pdfViewerRegions.length > 0 && templateType === 'fixed') {
        console.log('Updating selected regions with PDF viewer regions from backend');
        setSelectedRegions(pdfViewerRegions);
      }
      
      // Store the split result in state to track that split has been performed
      setHasSplitData(true);
      setHasManuallyCleared(false);
      
      // Auto-advance to next step after a short delay
      setTimeout(() => {
        setConfigStep(2);
      }, 1500);
      
    } catch (error) {
      console.error('Error splitting document:', error);
      
      let errorMessage = 'Failed to split document';
      if (error.response) {
        errorMessage = error.response.data?.error || error.response.data?.message || `Server error (${error.response.status})`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setHasSplitData(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle redoing section split
  const handleRedoSplit = () => {
    // Confirm with the user before clearing all sections
    if (window.confirm("This will clear all sections. Continue?")) {
      setSections([]); 
      setSelectedRegions([]); 
      setParameters({});
      setHasSplitData(false);
      setHasManuallyCleared(true);
      setPreviousSplitConfig(null);
      setLoadedSubsections({});
      setCurrentSection(null);
      setError(null);
      setConfigStep(1);
      console.log('Ready for fresh split - backend will clear previous config automatically');
    }
  };

  // Handle adding parameter to extract
  const handleAddParameter = (sectionId) => {
    setParameters(prev => ({
      ...prev,
      [sectionId]: [...(prev[sectionId] || []), { name: '', description: '' }]
    }));
  };

  // Handle removing parameter
  const handleRemoveParameter = (sectionId, index) => {
    setParameters(prev => {
      const updatedParams = [...(prev[sectionId] || [])];
      updatedParams.splice(index, 1);
      return { ...prev, [sectionId]: updatedParams };
    });
  };

  // Handle updating parameter
  const handleUpdateParameter = (sectionId, index, field, value) => {
    setParameters(prev => {
      // If index is -1 and field is 'updateAll', replace entire array
      if (index === -1 && field === 'updateAll') {
        return { ...prev, [sectionId]: value };
      }
      
      const updatedParams = [...(prev[sectionId] || [])];
      updatedParams[index] = {
        ...updatedParams[index],
        [field]: value
      };
      return { ...prev, [sectionId]: updatedParams };
    });
  };

  // Handle extracting parameters
  const handleExtractParameters = async (section) => {
    if (!section || !parameters[section.id] || parameters[section.id].length === 0) {
      setError("No parameters defined for this section");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Make sure fileId is available
      if (!files || files.length === 0) {
        throw new Error('No file selected');
      }
      
      // Get fileId from files array
      const fileId = files[0].id || files[0].fileId;
      
      if (!fileId) {
        throw new Error('Invalid file ID');
      }
      
      // Get sectionId from the section parameter
      const sectionId = section.id;
      
      if (!sectionId) {
        throw new Error('Invalid section ID');
      }
      
      // Log for debugging
      console.log('Extraction request for:', {
        projectId: projectDetails.projectId,
        fileId: fileId,
        sectionId: sectionId,
        templateType: templateType,
        isGroupSection: section.isGroup  
      });
      
      // Process parameters - handle comma-separated table columns AND fixed template naming
      const processedParameters = [];
      let extractionPrompt = null;
      
      for (const param of parameters[sectionId]) {
        // For fixed template type: handle parameter naming from extraction prompt
        let parameterName = param.name;
        let parameterDescription = param.description;
        
        // Continue with existing logic for table parameters
        if (parameterName && parameterName.includes(',')) {
          // This is a table parameter with multiple columns
          const columns = parameterName.split(',').map(col => col.trim()).filter(Boolean);
          
          // For fixed template, clean column names too
          if (templateType === 'fixed') {
            const cleanedColumns = columns.map(col => 
              col.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()
            );
            parameterName = cleanedColumns.join(',');
          }
          
          // Create a special extraction prompt for table data
          if (!extractionPrompt) {
            extractionPrompt = `Extract tabulated data with the following columns: {${columns.join(', ')}}. `;
            if (parameterDescription) {
              extractionPrompt += parameterDescription;
            }
            extractionPrompt += '\n\nNote: Each row in the table may end with double spaces or be separated by empty lines.';
          }
          
          // Add the parameter with cleaned name
          processedParameters.push({
            name: parameterName,
            description: parameterDescription || `Extract table columns: ${columns.join(', ')}`,
            // Always include extraction prompt for fixed template
            ...(templateType === 'fixed' && { extractionPrompt: parameterDescription || `Extract table columns: ${columns.join(', ')}` })
          });
        } else {
          // Regular parameter - let backend handle parameter name assignment for fixed templates
          processedParameters.push({
            name: parameterName ? parameterName.trim() : '', // Can be blank for fixed templates
            description: parameterDescription ? parameterDescription.trim() : '',
            // Always pass extraction prompt for fixed template
            ...(templateType === 'fixed' && { extractionPrompt: parameterDescription ? parameterDescription.trim() : '' })
          });
        }
      }
      
      // For fixed templates, allow parameters even if name is blank (backend will handle naming)
      const validParameters = templateType === 'fixed' 
        ? processedParameters.filter(param => param.description && param.description.trim() !== '')
        : processedParameters.filter(param => param.name && param.name.trim() !== '' && param.description && param.description.trim() !== '');
      
      if (validParameters.length === 0) {
        const errorMsg = templateType === 'fixed' 
          ? 'Please provide valid extraction prompts/descriptions for the parameters'
          : 'Please provide valid parameter names and descriptions';
        throw new Error(errorMsg);
      }
      
      // Log processed parameters for debugging
      console.log('Processed parameters for extraction:', processedParameters);
      
      // Prepare the request payload with fileId and sectionId
      const requestPayload = {
        projectId: projectDetails.projectId || 'UNKNOWN', // Ensure projectId is always provided
        fileId: fileId,
        sectionId: sectionId,
        templateType: templateType,
        parameters: validParameters // Use validParameters instead of processedParameters
      };
      
      // Add extraction prompt if we have table data
      if (extractionPrompt) {
        requestPayload.extractionPrompt = extractionPrompt;
      }
      
      // Log the exact payload being sent
      console.log('Extract Parameters Request Payload:', JSON.stringify(requestPayload, null, 2));
      
      // Make the API call
      const response = await axios.post(`${API_BASE_URL}/pdf/extract-parameters`, requestPayload, {
        timeout: 300000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity 
      });
        
        // Log the response
        console.log('Extract Parameters Response:', response.data);
        
        if (response.data) {
          let mappedParameters;
          
          // Handle group section response (check for processed_units array first)
          if (response.data.processed_units && Array.isArray(response.data.processed_units) && response.data.processed_units.length > 0) {
            console.log('Processing group section response with processed_units');
            
            const processedUnits = response.data.processed_units;
            
            // Combine results from all sub-sections
            const allParameters = [];
            const allTableData = [];
            
            processedUnits.forEach((unit, index) => {
              console.log(`Processing unit ${index + 1}:`, unit);
              
              // Handle table data from unit (if any)
              if (unit.table && Array.isArray(unit.table)) {
                allTableData.push(...unit.table);
              }
              
              // Handle regular parameters from unit
              if (unit.parameters && Array.isArray(unit.parameters)) {
                // Add unit identifier to parameters
                const unitParams = unit.parameters.map(param => ({
                  ...param,
                  unitIndex: index + 1,
                  unitId: unit.sectionId || `unit-${index + 1}`,
                  fromUnit: true
                }));
                allParameters.push(...unitParams);
              }
            });
            
            // Check if we have combined table data
            if (allTableData.length > 0) {
              const headers = allTableData.length > 0 ? Object.keys(allTableData[0]) : [];
              
              const structuredTableData = {
                headers: headers,
                rows: allTableData,
                totalRows: allTableData.length
              };
              
              mappedParameters = [{
                name: 'Combined_Group_Table_Data',
                description: `Combined table data from ${processedUnits.length} sub-sections with ${allTableData.length} total rows`,
                extractedValue: `Combined table with ${allTableData.length} rows from ${processedUnits.length} sub-sections: ${headers.join(', ')}`,
                value: `Combined table with ${allTableData.length} rows from ${processedUnits.length} sub-sections: ${headers.join(', ')}`,
                tableData: structuredTableData,
                isTableData: true,
                isGroupResult: true,
                subSectionCount: processedUnits.length,
                originalResponse: { table: allTableData }
              }];
              
            } else if (allParameters.length > 0) {
              // Group regular parameters by name and combine values
              const groupedParams = {};
              
              allParameters.forEach(param => {
                const key = param.name;
                if (!groupedParams[key]) {
                  groupedParams[key] = {
                    name: param.name,
                    description: param.description,
                    extractedValues: [],
                    subSections: [],
                    isRegularParameter: true,
                    isGroupResult: true
                  };
                }
                
                const value = param.extractedValue || param.value || 'No value';
                groupedParams[key].extractedValues.push(value);
                groupedParams[key].subSections.push({
                  index: param.unitIndex,
                  id: param.unitId,
                  value: value
                });
              });
              
              mappedParameters = Object.values(groupedParams).map(grouped => ({
                ...grouped,
                extractedValue: grouped.extractedValues.join(' | '),
                value: grouped.extractedValues.join(' | '),
                subSectionCount: grouped.subSections.length,
                subSectionDetails: grouped.subSections
              }));
              
            } else {
              // No table or parameter data, create a summary result
              mappedParameters = [{
                name: 'Group_Processing_Summary',
                description: `Processed ${processedUnits.length} sub-sections in group`,
                extractedValue: `Group processing completed for ${processedUnits.length} sub-sections`,
                value: `Group processing completed for ${processedUnits.length} sub-sections`,
                isGroupResult: true,
                isRegularParameter: true,
                subSectionCount: processedUnits.length
              }];
            }
            
          }
          // Handle standalone section response (parameters array directly)
          else if (response.data.parameters && Array.isArray(response.data.parameters)) {
            console.log('Processing standalone section parameters response');
            
            // Check if it's legacy table format first
            if (response.data.parameters.length > 0 && response.data.parameters[0].column !== undefined) {
              // Legacy table format - convert to parameter format
              console.log('Processing legacy table format response');
              mappedParameters = [{
                name: 'Table_Data_Legacy',
                description: 'Extracted table data from the section (legacy format)',
                extractedValue: response.data.parameters.map(param => 
                  `${param.column}: [${param.values.join(', ')}]`
                ).join('\n'),
                value: response.data.parameters.map(param => 
                  `${param.column}: [${param.values.join(', ')}]`
                ).join('\n'),
                tableData: response.data.parameters,
                isLegacyTableData: true
              }];
              
            } else {
              // Regular parameter format response (like your standalone section)
              console.log('Processing regular parameter format response');
              mappedParameters = response.data.parameters.map(param => ({
                ...param,
                value: Array.isArray(param.extractedValue) 
                  ? param.extractedValue.join(', ') 
                  : param.extractedValue || param.value,
                extractedValue: param.extractedValue,
                isRegularParameter: true
              }));
            }
          }
          // Check if response has table data (single section format)
          else if (response.data.table && Array.isArray(response.data.table)) {
            console.log('Processing table response format');
            const tableData = response.data.table;
            
            // Extract headers from first row
            const headers = tableData.length > 0 ? Object.keys(tableData[0]) : [];
            
            // Create structured table data format
            const structuredTableData = {
              headers: headers,
              rows: tableData,
              totalRows: tableData.length
            };
            
            // Create a single parameter entry for the table
            mappedParameters = [{
              name: 'Table_Data',
              description: `Extracted table data with ${tableData.length} rows and ${headers.length} columns`,
              extractedValue: `Table with ${tableData.length} rows: ${headers.join(', ')}`,
              value: `Table with ${tableData.length} rows: ${headers.join(', ')}`,
              tableData: structuredTableData,
              isTableData: true,
              originalResponse: response.data // Store original for reference
            }];
            
            // If the original parameter was comma-separated, preserve that info
            const originalParam = parameters[sectionId].find(p => p.name && p.name.includes(','));
            if (originalParam) {
              mappedParameters[0].originalColumns = originalParam.name;
              mappedParameters[0].name = `Table: ${originalParam.name}`;
            }
            
          } else if (response.data.responseType === 'table' && response.data.tableData) {
            // Legacy structured table format
            console.log('Processing legacy structured table response');
            const tableData = response.data.tableData;
            
            mappedParameters = [{
              name: 'Table_Data',
              description: `Extracted table data with ${tableData.totalRows} rows`,
              extractedValue: `Table with ${tableData.totalRows} rows and ${tableData.headers.length} columns`,
              value: `Table with ${tableData.totalRows} rows and ${tableData.headers.length} columns`,
              tableData: tableData,
              isTableData: true
            }];
            
            const originalParam = parameters[sectionId].find(p => p.name && p.name.includes(','));
            if (originalParam) {
              mappedParameters[0].originalColumns = originalParam.name;
            }
            
          } 
          // Handle direct array response (fallback for different backend response format)
          else if (Array.isArray(response.data) && response.data.length > 0) {
            console.log('Processing direct array group response');
            
            // Combine results from all sub-sections
            const allParameters = [];
            const allTableData = [];
            
            response.data.forEach((subSectionResult, index) => {
              console.log(`Processing sub-section ${index + 1} result:`, subSectionResult);
              
              // Handle table data from sub-section
              if (subSectionResult.table && Array.isArray(subSectionResult.table)) {
                allTableData.push(...subSectionResult.table);
              }
              
              // Handle regular parameters from sub-section
              if (subSectionResult.parameters && Array.isArray(subSectionResult.parameters)) {
                // Add sub-section identifier to parameters
                const subSectionParams = subSectionResult.parameters.map(param => ({
                  ...param,
                  subSectionIndex: index + 1,
                  subSectionId: subSectionResult.sectionId || `sub-section-${index + 1}`
                }));
                allParameters.push(...subSectionParams);
              }
            });
            
            // Check if we have combined table data
            if (allTableData.length > 0) {
              const headers = allTableData.length > 0 ? Object.keys(allTableData[0]) : [];
              
              const structuredTableData = {
                headers: headers,
                rows: allTableData,
                totalRows: allTableData.length
              };
              
              mappedParameters = [{
                name: 'Combined_Table_Data',
                description: `Combined table data from ${response.data.length} sub-sections with ${allTableData.length} total rows`,
                extractedValue: `Combined table with ${allTableData.length} rows from ${response.data.length} sub-sections: ${headers.join(', ')}`,
                value: `Combined table with ${allTableData.length} rows from ${response.data.length} sub-sections: ${headers.join(', ')}`,
                tableData: structuredTableData,
                isTableData: true,
                isGroupResult: true,
                subSectionCount: response.data.length,
                originalResponse: { table: allTableData }
              }];
              
            } else if (allParameters.length > 0) {
              // Group regular parameters by name and combine values
              const groupedParams = {};
              
              allParameters.forEach(param => {
                const key = param.name;
                if (!groupedParams[key]) {
                  groupedParams[key] = {
                    name: param.name,
                    description: param.description,
                    extractedValues: [],
                    subSections: [],
                    isRegularParameter: true,
                    isGroupResult: true
                  };
                }
                
                const value = param.extractedValue || param.value || 'No value';
                groupedParams[key].extractedValues.push(value);
                groupedParams[key].subSections.push({
                  index: param.subSectionIndex,
                  id: param.subSectionId,
                  value: value
                });
              });
              
              mappedParameters = Object.values(groupedParams).map(grouped => ({
                ...grouped,
                extractedValue: grouped.extractedValues.join(' | '),
                value: grouped.extractedValues.join(' | '),
                subSectionCount: grouped.subSections.length,
                subSectionDetails: grouped.subSections
              }));
              
            } else {
              throw new Error('No valid data found in group section response');
            }
            
          } else {
            console.error('Unknown response format. Available keys:', Object.keys(response.data));
            console.error('Full response.data:', response.data);
            throw new Error('Invalid response format: no table, parameters, processed_units, or recognizable data found');
          }
            
          console.log('Mapped parameters:', mappedParameters);
          
          setParameters(prev => ({
            ...prev,
            [sectionId]: mappedParameters
          }));
          
        } else {
          throw new Error('Invalid response from server');
        }
        
      } catch (error) {
      console.error('Error extracting parameters:', error);
      
      if (error.response) {
        console.error('Error response:', error.response);
        console.error('Error response data:', error.response.data);
        
        const errorMsg = error.response.data?.error || 
                       error.response.data?.message || 
                       `Server error (${error.response.status})`;
        
        setError(errorMsg);
      } else if (error.request) {
        setError('No response received from server');
      } else {
        setError(error.message || 'An unknown error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle configuration completion
  const handleConfigurationComplete = async () => {
    try {
      console.log('Completing configuration...');
      console.log('Sections:', sections.length);
      console.log('Parameters:', Object.keys(parameters).length);
      
      // For fixed template, check if we have extracted parameters from regions
      const hasExtractedData = templateType === 'fixed' 
        ? sections.some(section => section.isParameterSection) // Fixed format: check for parameter sections
        : Object.values(parameters).some(sectionParams => 
            sectionParams && sectionParams.length > 0 && 
            sectionParams.some(param => param.value || param.extractedValue)
          ); // Running format: check for extracted parameters
      
      if (!hasExtractedData) {
        const errorMsg = templateType === 'fixed' 
          ? 'No parameters have been extracted from the selected regions yet. Please process the regions first.'
          : 'No parameters have been extracted yet. Please extract parameters from at least one section.';
        setError(errorMsg);
        return;
      }
      
      // Save the configuration to the backend
      const configurationData = {
        projectId: projectDetails.projectId,
        templateType,
        sections,
        parameters,
        extractableSections
      };

      // Call onSave if provided
      if (onSave) {
        onSave(configurationData);
      }
      setConfigStep(4);
    } catch (error) {
      console.error('Error completing configuration:', error);
      setError('Failed to save configuration');
    }
  };

  // Navigate between sections - REVERTED to working version
  const handleNextSection = async () => {
    const currentIndex = extractableSections.findIndex(s => s.id === currentSection?.id);
    if (currentIndex < extractableSections.length - 1) {
      const nextSection = extractableSections[currentIndex + 1];
      setCurrentSection(nextSection);
      
      // Load existing parameters for the next section
      if (nextSection && nextSection.id) {
        await loadExistingParameters(nextSection.id);
      }
    } else {
      // All sections configured - trigger completion
      console.log('All sections completed, calling handleConfigurationComplete');
      handleConfigurationComplete();
    }
  };

  const handlePrevSection = async () => {
    const currentIndex = extractableSections.findIndex(s => s.id === currentSection?.id);
    const isLastSection = currentIndex === extractableSections.length - 1;
    if (currentIndex > 0) {
      const prevSection = extractableSections[currentIndex - 1];
      setCurrentSection(prevSection);
      
      // Load existing parameters for the previous section
      if (prevSection && prevSection.id) {
        await loadExistingParameters(prevSection.id);
      }
    } else {
      setConfigStep(2); // Go back to review sections step
    }
    if (isLastSection) {
      console.log('This was the last section - extraction complete!');
      // Optionally auto-complete after a delay
      setTimeout(() => {
        handleConfigurationComplete();
      }, 2000);
    }
  };

  // Modified for fixed template workflow
  const handleConfirmSections = async () => {
    if (templateType === 'fixed') {
      // For fixed template, sections are already extracted parameters
      // Skip the parameter extraction step and go directly to results
      console.log('Fixed template: Skipping parameter extraction, going to results');
      setConfigStep(4); // Jump directly to step 4 (View Results)
    } else {
      // For running template, proceed to parameter extraction
      if (extractableSections.length > 0) {
        setCurrentSection(extractableSections[0]);
        
        // Load existing parameters for the first section
        if (extractableSections[0] && extractableSections[0].id) {
          await loadExistingParameters(extractableSections[0].id);
        }
        
        setConfigStep(3);
      }
    }
  };

  // Handle sub-splitting a section
  const handleSubSplit = async (section, splitPrompt) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!files || files.length === 0) {
        throw new Error('No file selected');
      }
      
      const fileId = files[0].fileId || files[0].id;
      
      if (!fileId) {
        throw new Error('Invalid file: missing ID');
      }
      
      const requestData = {
        projectId: projectDetails.projectId || "UNKNOWN",
        fileId,
        templateType: "running",
        sectionId: section.id,
        splitPrompt: splitPrompt
      };
      
      console.log('Calling sub-split API with:', requestData);
      
      // Call the sub-split API (same endpoint, different parameters)
      const response = await axios.post(`${API_BASE_URL}/pdf/split`, requestData, {
        timeout: 30000000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      
      console.log('Sub-split API response:', response.data);
      
      // Process the sub-sections
      const processedSubSections = processBackendSections(response.data);
      
      if (processedSubSections.length === 0) {
        throw new Error('No sub-sections were detected. Please try a different split method.');
      }
      
      // Mark sub-sections with parent relationship
      const markedSubSections = processedSubSections.map((subSection) => ({
        ...subSection,
        parentSectionId: section.id,
        parentSectionTitle: section.title,
        isSubSection: true
      }));
      
      // Replace the original section with the sub-sections
      const updatedSections = [...sections];
      const sectionIndex = updatedSections.findIndex(s => s.id === section.id);
      
      // Remove the original section and insert sub-sections
      updatedSections.splice(sectionIndex + 1, 0, ...markedSubSections);
      updatedSections[sectionIndex] = {
        ...updatedSections[sectionIndex],
        hasSubSections: true
      };
      
      setSections(updatedSections);

      // Store subsection info for future reference
      setLoadedSubsections(prev => ({
        ...prev,
        [section.id]: {
          subsections: markedSubSections,
          splitPrompt: splitPrompt
        }
      }));
      
      // Update parameters to remove the old section and add placeholders for new ones
      const updatedParameters = { ...parameters };
      delete updatedParameters[section.id]; // Remove old section parameters
      
      // Add empty parameter arrays for new sub-sections
      markedSubSections.forEach(subSection => {
        if (!updatedParameters[subSection.id]) {
          updatedParameters[subSection.id] = [];
        }
      });
      
      setParameters(updatedParameters);
      
      // Set current section to first sub-section - REVERTED
      if (markedSubSections.length > 0) {
        setCurrentSection(markedSubSections[0]);
      }
      
    } catch (error) {
      console.error('Error sub-splitting section:', error);
      
      let errorMessage = 'Failed to sub-split section';
      if (error.response) {
        errorMessage = error.response.data?.error || error.response.data?.message || `Server error (${error.response.status})`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const [previousSplitConfig, setPreviousSplitConfig] = useState(null);
  const [isLoadingPreviousConfig, setIsLoadingPreviousConfig] = useState(false);
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
  
  // Fixed ConfigurationEditor.js - Updated useEffect to skip subsection loading for parameter sections
  useEffect(() => {
    const loadPreviousSplitConfig = async () => {
      if (!projectDetails?.projectId) return;
      
      setIsLoadingPreviousConfig(true);
      try {
        // Load split configuration
        const configResponse = await axios.get(`${API_BASE_URL}/config/projects/${projectDetails.projectId}/split-config`);
        if (configResponse.data) {
          setPreviousSplitConfig(configResponse.data);
          
          // Auto-populate split prompt if it exists and current prompt is empty
          if (configResponse.data.splitPrompt && !splitPrompt) {
            setSplitPrompt(configResponse.data.splitPrompt);
          }
        }
        
        // Load template content (sections) if available
        try {
          const contentResponse = await axios.get(`${API_BASE_URL}/config/projects/${projectDetails.projectId}/template-content`);
          if (contentResponse.data && contentResponse.data.rawSecs && contentResponse.data.rawSecs.length > 0) {
            console.log('Found existing sections, processing...');
            
            // Process the sections using the same logic as split response
            const result = processBackendSections(contentResponse.data);
            const processedSections = result.sections || result;
            const pdfViewerRegions = result.pdfViewerRegions || [];
            
            if (processedSections.length > 0) {
              // Check if these are parameter sections (extracted from regions) or regular sections
              const hasParameterSections = processedSections.some(section => 
                section.isParameterSection || 
                section.id?.startsWith('param_') ||
                section.extractedValue !== undefined
              );
              
              if (hasParameterSections) {
                // These are extracted parameters - don't try to load subsections
                console.log('Found extracted parameter sections - skipping subsection loading');
                setSections(processedSections);
                setHasSplitData(true);
                
                // Set the PDF viewer regions to show bounding boxes
                if (pdfViewerRegions.length > 0 && templateType === 'fixed') {
                  console.log(`Setting ${pdfViewerRegions.length} PDF viewer regions from backend`);
                  setSelectedRegions(pdfViewerRegions);
                }
                
                // Auto-advance to review step since we have existing parameter data
                console.log(`Auto-advancing to review step with ${processedSections.length} parameter sections`);
                setIsAutoAdvancing(true);
                setTimeout(() => {
                  setConfigStep(2);
                  setIsAutoAdvancing(false);
                }, 1000);
              } else {
                // These are regular sections - check each section for subsections
                const allSections = [...processedSections];
                const subsectionPromises = [];
                
                for (const section of processedSections) {
                  // Only try to load subsections for regular sections, not parameter sections
                  if (!section.isParameterSection && !section.id?.startsWith('param_')) {
                    subsectionPromises.push(
                      loadSubsectionsForSection(section.id).then(subsectionData => ({
                        sectionId: section.id,
                        subsectionData
                      }))
                    );
                  }
                }
                
                // Wait for all subsection checks to complete
                const subsectionResults = await Promise.all(subsectionPromises);
                
                // Process subsection results
                for (const result of subsectionResults) {
                  if (result.subsectionData && result.subsectionData.subsections.length > 0) {
                    console.log(`Adding ${result.subsectionData.subsections.length} subsections for ${result.sectionId}`);
                    
                    // Find the parent section and mark it as having subsections
                    const parentIndex = allSections.findIndex(s => s.id === result.sectionId);
                    if (parentIndex !== -1) {
                      allSections[parentIndex] = {
                        ...allSections[parentIndex],
                        hasSubSections: true
                      };
                      
                      // Insert subsections after the parent section
                      allSections.splice(parentIndex + 1, 0, ...result.subsectionData.subsections);
                    }
                    
                    // Store subsection info for reference
                    setLoadedSubsections(prev => ({
                      ...prev,
                      [result.sectionId]: {
                        subsections: result.subsectionData.subsections,
                        splitPrompt: result.subsectionData.splitPrompt
                      }
                    }));
                  }
                }
                
                setSections(allSections);
                setHasSplitData(true);

                // Load parameters for any existing subsections
                for (const sec of allSections) {
                  if (sec.isSubSection) {
                    // eslint-disable-next-line no-await-in-loop
                    await loadExistingParameters(sec.id);
                  }
                }
                
                // Auto-advance to review step since we have existing sections
                console.log(`Auto-advancing to review step with ${allSections.length} sections (including subsections)`);
                setIsAutoAdvancing(true);
                setTimeout(() => {
                  setConfigStep(2);
                  setIsAutoAdvancing(false);
                }, 1000);
              }
            }
          }
        } catch (contentError) {
          console.log('No previous template content found:', contentError.message);
          // This is expected for new projects, don't show error
        }
        
      } catch (error) {
        console.log('No previous split configuration found:', error.message);
        // Don't show error to user as this is expected for new projects
      } finally {
        setIsLoadingPreviousConfig(false);
      }
    };

    // Only load if we're on step 1 and don't already have sections
    if (configStep === 1 && !hasManuallyCleared) {
      loadPreviousSplitConfig();
    }
  }, [projectDetails?.projectId, API_BASE_URL, configStep, hasManuallyCleared, templateType]);

  // Get the PDF file from the uploaded files
  const pdfFile = files && files.length > 0 ? files[0] : null;
  useEffect(() => {
    if (pdfFile) {
      logFileDebug(pdfFile, 'PDF File in ConfigurationEditor');
    }
  }, [pdfFile]);

  // Force PDF viewer to redraw when regions change
  useEffect(() => {
    if (window.redrawPdfRegions) {
      setTimeout(() => window.redrawPdfRegions(), 50);
    }
  }, [selectedRegions]);

  // Updated loadExistingParameters function for ConfigurationEditor.js
  const loadExistingParameters = async (sectionId) => {
    if (!projectDetails?.projectId || !sectionId) return;
    
    try {
      console.log(`Loading existing parameters for section: ${sectionId}`);
      const response = await axios.get(`${API_BASE_URL}/config/projects/${projectDetails.projectId}/parameters/${sectionId}`);
      
      if (response.data) {
        console.log('Parameter loading response:', response.data);
        
        let transformedParameters = [];
        
        // Handle consolidated group section response
        if (response.data.section_type === 'group' && response.data.consolidated_parameters) {
          console.log('Processing consolidated group parameters');
          
          transformedParameters = response.data.parameters.map(param => ({
            name: param.name || '',
            description: param.description || '',
            regex: param.regex || '',
            extractedValue: param.extracted_values || [],
            value: Array.isArray(param.extracted_values) && param.extracted_values.length > 0 
              ? param.extracted_values.join(', ') 
              : (param.extracted_values || ''),
            isRegularParameter: true,
            isLoaded: true,
            confidence: param.confidence || '',
            extractionMethod: param.extraction_method || 'Previously extracted'
          }));
        }
        
        if (transformedParameters.length > 0) {
          // Update parameters state with loaded data
          setParameters(prev => ({
            ...prev,
            [sectionId]: transformedParameters
          }));
          
          console.log(`Loaded ${transformedParameters.length} existing parameters for section ${sectionId}`);
          
          // Log details for group sections and table data
          if (response.data.section_type === 'group') {
            console.log(`Group section with ${response.data.subsection_count} sub-sections processed`);
          }
          if (response.data.has_table_data) {
            console.log('Section contains table data');
          }
          
          return true; // Indicate parameters were loaded
        }
      }
    } catch (error) {
      console.log(`No existing parameters found for section ${sectionId}:`, error.message);
      // Don't show error to user as this is expected for new sections
    }
    return false; // No parameters were loaded
  };

  // Add this useEffect to load parameters when currentSection changes
  useEffect(() => {
    const loadParametersForCurrentSection = async () => {
      if (configStep === 3 && currentSection && currentSection.id) {
        // Only load if we don't already have parameters for this section
        const existingParams = parameters[currentSection.id];
        if (!existingParams || existingParams.length === 0) {
          await loadExistingParameters(currentSection.id);
        }
      }
    };

    loadParametersForCurrentSection();
  }, [currentSection, configStep, projectDetails?.projectId, API_BASE_URL]);

  // Modify the handleGoToSection function to load parameters
  const handleGoToSection = async (section) => {
    setCurrentSection(section);
    setConfigStep(3);
    
    // Load existing parameters for this section if any
    if (section && section.id) {
      await loadExistingParameters(section.id);
    }
  };

  const handleUpdateRegion = (index, updatedRegion) => {
    const updatedRegions = [...selectedRegions];
    updatedRegions[index] = updatedRegion;
    setSelectedRegions(updatedRegions);
    
    // Force PDF viewer to redraw regions if needed
    if (window.redrawPdfRegions) {
      window.redrawPdfRegions();
    }
  };

  return (
  <div>
    <ConfigStepIndicator configStep={configStep} />
    
    <div className="mb-4">
      <div className="flex items-center mb-2">
        <span className="text-lg font-bold">Configure Extraction</span>
        <span className="ml-auto px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
          {templateType.toUpperCase()} FORMAT
        </span>
      </div>
      
      <div className="bg-gray-600/30 rounded-lg p-4 mb-6 flex items-center">
        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-300" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-gray-300">
          {templateType === 'running' 
            ? 'Running format PDFs have flowing content. You can extract data by describing the content structure and patterns.'
            : 'Fixed format PDFs have structured content. You can select regions to extract data based on position.'}
        </p>
      </div>
    </div>
    
    {/* Enhanced Error message display */}
    {error && (
      <Alert status="error" mb={4} borderRadius="md">
        <AlertIcon />
        <Box>
          <Text fontWeight="bold">Error:</Text>
          <Text fontSize="sm">{error}</Text>
        </Box>
      </Alert>
    )}
    
    {/* Debug info for development */}
    {process.env.NODE_ENV === 'development' && sections.length > 0 && (
      <Alert status="info" mb={4} borderRadius="md">
        <AlertIcon />
        <Text fontSize="sm">
          Debug: {sections.length} sections loaded successfully, {extractableSections.length} extractable sections
        </Text>
      </Alert>
    )}
    
    {configStep <= 3 && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left side: PDF Viewer */}
        <div className="bg-gray-800 rounded-lg overflow-hidden" style={{ height: '650px' }}>
          <PDFViewer 
            file={pdfFile} 
            fileId={pdfFile?.id || pdfFile?.fileId}
            templateType={templateType} 
            onRegionSelect={handleRegionSelect} 
            onDeleteRegion={handleDeleteRegion}
            externalRegions={selectedRegions}
          />
        </div>
        
        {/* Right side: Step-specific UI */}
        <div className="bg-gray-800 p-4 rounded-lg max-h-[650px] overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">
            {configStep === 1 ? "Step 1: Split Document" : 
             configStep === 2 ? "Step 2: Review Sections" : 
             "Step 3: Extract Parameters"}
          </h2>
          
          {configStep === 1 && (
            <SplitStep 
              splitPrompt={splitPrompt} 
              setSplitPrompt={setSplitPrompt} 
              onSplit={handleSplitPDF} 
              isLoading={isLoading}
              templateType={templateType}
              selectedRegions={selectedRegions}
              onDeleteRegion={handleDeleteRegion}
              onUpdateRegion={handleUpdateRegion} 
              splitError={error}
              hasSplitData={hasSplitData}
              previousSplitConfig={previousSplitConfig}  
              isLoadingPreviousConfig={isLoadingPreviousConfig}
              isAutoAdvancing={isAutoAdvancing}  
            />
          )}
          
          {configStep === 2 && (
            <ReviewStep 
              sections={sections} 
              onConfirm={handleConfirmSections} 
              onRedo={handleRedoSplit} 
              onSubSplit={handleSubSplit}     
              isLoading={isLoading}           
              projectDetails={projectDetails}
              loadedSubsections={loadedSubsections}
              templateType={templateType} // Pass templateType to ReviewStep
            />
          )}
          
          {/* Only show ExtractStep for running template type */}
          {configStep === 3 && templateType === 'running' && (
            <ExtractStep 
              currentSection={currentSection}
              sections={sections}
              parameters={parameters}
              onAddParameter={handleAddParameter}
              onUpdateParameter={handleUpdateParameter}
              onRemoveParameter={handleRemoveParameter}
              onExtract={handleExtractParameters}
              onNext={handleNextSection}
              onPrev={handlePrevSection}
              isLoading={isLoading}
              projectDetails={projectDetails}
            />
          )}

          {/* Show completion buttons for running template on step 3 */}
          {configStep === 3 && templateType === 'running' && extractableSections.length > 0 && (
            <div className="mt-6 flex justify-between">
              <button
                className="px-4 py-2 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                onClick={onBack}
                disabled={isLoading}
              >
                Back
              </button>
              
              {/* Show completion button */}
              <button
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors"
                onClick={handleConfigurationComplete}
                disabled={isLoading}
              >
                Complete Configuration
              </button>
            </div>
          )}

          {/* Show navigation buttons for steps 1 and 2 */}
          {(configStep === 1 || configStep === 2) && (
            <div className="mt-6 flex justify-between">
              <Button colorScheme="black" variant="outline" onClick={onBack} disabled={isLoading}>
                Back to File Upload
              </Button>

              {/* Show any step-specific buttons here if needed */}
              <div></div>
            </div>
          )}
          
        </div>
      </div>
    )}
    
    {/* View Results step (step 4) with API integration */}
    {configStep === 4 && (
      <ViewResultsComponent 
        configurationData={{
          sections,
          parameters,
          extractableSections,
          templateType,
          projectDetails
        }}
        onEdit={() => setConfigStep(templateType === 'fixed' ? 2 : 3)} // Fixed: go back to review, Running: go to extract
        onComplete={() => {
          if (onComplete) {
            onComplete();
          }
        }}
        onBack={() => setConfigStep(templateType === 'fixed' ? 2 : 3)} // Fixed: go back to review, Running: go to extract
      />
    )}

   </div>
  );
};

export default ConfigurationEditor;