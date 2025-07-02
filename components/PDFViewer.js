// components/PDFViewer.js - Fixed to Handle Both New and Stored Files
import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Text, 
  Flex, 
  Spinner, 
  Center, 
  Button, 
  IconButton, 
  Tooltip 
} from '@chakra-ui/react';
import { 
  AddIcon, 
  MinusIcon, 
  ViewIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon 
} from '@chakra-ui/icons';

// Custom icons for region selection
const SquareIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
  </svg>
);

const ShrinkIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 15l6 6m-6-6v4.8m0-4.8h4.8"></path>
    <path d="M9 19.8V15m0 0H4.2M9 15l-6 6"></path>
    <path d="M15 4.2V9m0 0h4.8M15 9l6-6"></path>
    <path d="M9 4.2V9m0 0H4.2M9 9L3 3"></path>
  </svg>
);

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const PDFViewer = ({ file, fileId, templateType = 'running', onRegionSelect, onDeleteRegion, externalRegions = null }) => {
  const [scale, setScale] = useState(1.0);
  const [fitToWidth, setFitToWidth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(null);
  const [pdfSource, setPdfSource] = useState(null); // Track PDF source type for debugging
  
  // Region selection state
  const [renderTask, setRenderTask] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [regions, setRegions] = useState([]);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  // Selection variables
  const [drawing, setDrawing] = useState(false);
  const startPositionRef = useRef({ x: 0, y: 0 });
  const loadAttemptedRef = useRef(false);

  // Cancel any existing render task
  const cancelExistingRenderTask = () => {
    if (renderTask && renderTask.cancel) {
      renderTask.cancel();
      setRenderTask(null);
    }
  };

  // Render page function
  const renderPage = async () => {
    console.log("renderPage called");
    if (!pdfDoc || !canvasRef.current) {
      console.log("Cannot render: no pdfDoc or canvas");
      return;
    }
    
    try {
      cancelExistingRenderTask();
      
      const page = await pdfDoc.getPage(currentPage);
      let actualScale = scale;
      
      if (fitToWidth) {
        actualScale = computeFitScale(page);
      }
      
      const viewport = page.getViewport({ scale: actualScale });
      const canvas = canvasRef.current;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const task = page.render({ canvasContext: ctx, viewport });
      setRenderTask(task);
      
      await task.promise;
      console.log("Page rendered, now drawing regions");
      
      if (canvasRef.current) {
        drawSavedRegions();
      }
    } catch (e) {
      if (e.name !== 'RenderingCancelledException') {
        console.error('Error rendering PDF page:', e);
      }
    } finally {
      setRenderTask(null);
    }
  };

  // Make renderPage available to external components
  useEffect(() => {
    console.log("Setting up global redrawPdfRegions function");
    window.redrawPdfRegions = function() {
      console.log("External redraw called");
      setTimeout(() => {
        console.log("Executing delayed render");
        if (canvasRef.current) {
          renderPage();
        }
      }, 50);
    };
    
    return () => {
      if (window.redrawPdfRegions) {
        delete window.redrawPdfRegions;
      }
    };
  }, []);

  // Sync with external regions
  useEffect(() => {
    if (externalRegions !== null) {
      console.log("External regions updated:", externalRegions.length);
      setRegions(externalRegions);
      
      if (pdfDoc && canvasRef.current) {
        console.log("Will redraw due to external regions update");
        setTimeout(() => {
          renderPage();
        }, 50);
      }
    }
  }, [externalRegions]);

  // Log file info on mount
  useEffect(() => {
    console.log("PDFViewer received file:", file);
    loadAttemptedRef.current = false;
    
    if (file && typeof file === 'object') {
      console.log("File has properties:", Object.keys(file));
      if (file.file) console.log("The 'file' property exists:", typeof file.file);
      if (file.name) console.log("File name:", file.name);
      if (file.id) console.log("File ID:", file.id);
      if (file.fileId) console.log("FileId:", file.fileId);
      if (file.previewUrl) console.log("PreviewUrl:", file.previewUrl);
      if (file.projectId) console.log("ProjectId:", file.projectId);
    }
    
    return () => {
      if (pdfDoc) {
        pdfDoc.destroy();
      }
      cancelExistingRenderTask();
    };
  }, [file]);

  // Enhanced PDF loading logic
  useEffect(() => {
    if (!file || loadAttemptedRef.current) {
      if (!file) {
        setLoading(false);
      }
      return;
    }
    
    loadAttemptedRef.current = true;
    
    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        setPdfSource(null);
        
        console.log("Loading PDF...");
        
        // Import PDF.js
        const pdfjs = await import('pdfjs-dist/build/pdf');
        const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.entry');
        pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
        
        let pdfData = null;
        let sourceType = '';
        
        // CRITICAL: Handle direct File objects first - this case works well for newly uploaded files
        if (file instanceof File) {
          console.log("Case 1: Loading from direct File object");
          const arrayBuffer = await file.arrayBuffer();
          pdfData = arrayBuffer;
          sourceType = 'directFile';
        }
        // Handle file.file as File object - this is common for newly uploaded files
        else if (file.file instanceof File) {
          console.log("Case 2: Loading from file.file File object");
          const arrayBuffer = await file.file.arrayBuffer();
          pdfData = arrayBuffer;
          sourceType = 'fileObjectProperty';
        }
        // Try using previewUrl - this is the main path for project files!
        else if (file.previewUrl) {
          console.log("Case 3: Loading from previewUrl:", file.previewUrl);
          try {
            const response = await fetch(file.previewUrl);
            if (response.ok) {
              pdfData = await response.arrayBuffer();
              sourceType = 'previewUrl';
              console.log("Successfully loaded from previewUrl");
            } else {
              console.log("Failed to load from previewUrl, status:", response.status);
            }
          } catch (error) {
            console.error("Error loading from previewUrl:", error);
          }
        }
        
        // If none of the above methods worked, try other approaches
        if (!pdfData) {
          // Try fixed URLs with fileId/id
          const actualFileId = file.fileId || file.id;
          const projectId = file.projectId;
          
          if (actualFileId) {
            console.log("Case 4: Using constructed URLs with fileId:", actualFileId);
            
            // Try these URLs in order
            const urlsToTry = [];
            
            if (projectId) {
              urlsToTry.push(`${API_BASE_URL}/files/${projectId}/configuration/files/${encodeURIComponent(actualFileId)}/preview`);
              urlsToTry.push(`${API_BASE_URL}/files/${projectId}/configuration/files/${encodeURIComponent(actualFileId)}/content`);
              urlsToTry.push(`${API_BASE_URL}/files/${projectId}/configuration/files/${encodeURIComponent(actualFileId)}/download`);
              urlsToTry.push(`${API_BASE_URL}/files/${projectId}/configuration/files/${encodeURIComponent(actualFileId)}/preview`);
              urlsToTry.push(`${API_BASE_URL}/files/${projectId}/configuration/files/${encodeURIComponent(actualFileId)}`);
            }
            
            // Global URLs
            urlsToTry.push(`${API_BASE_URL}/files/${encodeURIComponent(actualFileId)}/content`);
            urlsToTry.push(`${API_BASE_URL}/files/${encodeURIComponent(actualFileId)}/download`);
            urlsToTry.push(`${API_BASE_URL}/files/${encodeURIComponent(actualFileId)}/preview`);
            urlsToTry.push(`${API_BASE_URL}/files/${encodeURIComponent(actualFileId)}`);
            
            // Configuration URLs (legacy)
            urlsToTry.push(`${API_BASE_URL}/configuration/files/${encodeURIComponent(actualFileId)}/preview`);
            urlsToTry.push(`${API_BASE_URL}/configuration/files/${encodeURIComponent(actualFileId)}/download`);
            urlsToTry.push(`${API_BASE_URL}/configuration/files/${encodeURIComponent(actualFileId)}/content`);

            // Try each URL
            for (const url of urlsToTry) {
              if (pdfData) break; // Stop if we already have data
              
              try {
                console.log("Trying URL:", url);
                const response = await fetch(url);
                if (response.ok) {
                  pdfData = await response.arrayBuffer();
                  sourceType = 'constructedUrl';
                  console.log("Successfully loaded from:", url);
                  break;
                }
              } catch (error) {
                console.log("Failed to fetch from", url, error.message);
              }
            }
          }
        }
        
        // Try downloadUrl as a last resort
        if (!pdfData && file.downloadUrl) {
          console.log("Case 5: Trying downloadUrl:", file.downloadUrl);
          try {
            const response = await fetch(file.downloadUrl);
            if (response.ok) {
              pdfData = await response.arrayBuffer();
              sourceType = 'downloadUrl';
              console.log("Successfully loaded from downloadUrl");
            }
          } catch (error) {
            console.error("Error loading from downloadUrl:", error);
          }
        }
        
        // If we still don't have data, try the fileId prop directly
        if (!pdfData && fileId) {
          console.log("Case 6: Using fileId prop directly:", fileId);
          const urls = [
            `${API_BASE_URL}/configuration/files/${fileId}/preview`,
            `${API_BASE_URL}/configuration/files/${fileId}/download`,
            `${API_BASE_URL}/configuration/files/${fileId}/content`
          ];
          
          for (const url of urls) {
            try {
              console.log("Trying URL:", url);
              const response = await fetch(url);
              if (response.ok) {
                pdfData = await response.arrayBuffer();
                sourceType = 'fileIdProp';
                console.log("Successfully loaded from:", url);
                break;
              }
            } catch (error) {
              console.log("Failed to fetch from", url, error.message);
            }
          }
        }
        
        // If we got PDF data, load the document
        if (pdfData) {
          console.log("Successfully got PDF data from:", sourceType);
          setPdfSource(sourceType);
          
          try {
            const pdf = await pdfjs.getDocument({data: pdfData}).promise;
            setPdfDoc(pdf);
            setNumPages(pdf.numPages);
            setLoading(false);
            console.log("PDF loaded with", pdf.numPages, "pages");
          } catch (pdfError) {
            console.error("Error loading PDF document:", pdfError);
            setError(`Error loading PDF document: ${pdfError.message}`);
            setLoading(false);
          }
        } else {
          // No PDF data found
          console.error("Could not load PDF from any source");
          setError("Could not load PDF. Please try re-uploading the file.");
          setLoading(false);
        }
        
      } catch (error) {
        console.error("Error in loadPdf:", error);
        setError(`Failed to load PDF: ${error.message}`);
        setLoading(false);
      }
    };

    loadPdf();
  }, [file, fileId]);

  // Update when PDF or page changes
  useEffect(() => {
    if (pdfDoc && !loading && !error) {
      console.log("Rendering due to PDF/page/scale change");
      renderPage();
    }
  }, [pdfDoc, currentPage, scale, fitToWidth, loading, error]);

  // Setup event listeners for region selection
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    if (isSelecting) {
      console.log("Adding selection event listeners");
      canvas.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      canvas.style.cursor = 'crosshair';
    } else {
      console.log("Removing selection event listeners");
      canvas.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      canvas.style.cursor = 'default';
      setDrawing(false);
    }
    
    return () => {
      if (canvas) {
        canvas.removeEventListener('mousedown', handleMouseDown);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isSelecting, drawing]);

  // Calculate scale to fit width
  const computeFitScale = (page) => {
    if (!containerRef.current) return 1.0;
    const containerWidth = containerRef.current.clientWidth - 40;
    const viewport = page.getViewport({ scale: 1 });
    return containerWidth / viewport.width;
  };

  // Zoom functions
  const zoomIn = () => {
    if (pdfDoc && !loading && !error) {
      const newScale = Math.min(scale * 1.25, 3.0);
      setScale(newScale);
      setFitToWidth(false);
    }
  };

  const zoomOut = () => {
    if (pdfDoc && !loading && !error) {
      const newScale = Math.max(scale * 0.8, 0.25);
      setScale(newScale);
      setFitToWidth(false);
    }
  };

  const toggleFitToWidth = () => {
    if (pdfDoc && !loading && !error) {
      setFitToWidth(!fitToWidth);
    }
  };

  // Navigation functions
  const prevPage = () => {
    if (currentPage <= 1 || !pdfDoc) return;
    setCurrentPage(currentPage - 1);
  };

  const nextPage = () => {
    if (currentPage >= numPages || !pdfDoc) return;
    setCurrentPage(currentPage + 1);
  };

  // Region management functions
  const clearAllRegions = () => {
    console.log("Clearing all regions");
    setRegions([]);
    setTimeout(() => {
      renderPage();
    }, 10);
    
    if (onDeleteRegion) {
      onDeleteRegion(-1);
    }
  };
  
  const deleteRegion = (index) => {
    console.log("Deleting region at index:", index);
    const updatedRegions = [...regions];
    updatedRegions.splice(index, 1);
    setRegions(updatedRegions);
    
    setTimeout(() => {
      renderPage();
    }, 10);
    
    if (onDeleteRegion) {
      const originalRedraw = window.redrawPdfRegions;
      window.redrawPdfRegions = () => {
        console.log("Redraw suppressed during internal deletion");
      };
      onDeleteRegion(index);
      setTimeout(() => {
        window.redrawPdfRegions = originalRedraw;
      }, 100);
    }
  };

  // Draw existing regions
  const drawSavedRegions = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    console.log("Drawing", regions.length, "regions on page", currentPage);
    
    regions.forEach(region => {
      if (region.page === currentPage) {
        console.log("Drawing region:", region);
        ctx.beginPath();
        ctx.rect(region.x, region.y, region.width, region.height);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
        ctx.fillStyle = 'rgba(0, 255, 0, 0.08)';
        ctx.fill();
        ctx.stroke();
      }
    });
  };

  // Mouse event handlers for region selection
  const handleMouseDown = (e) => {
  if (!isSelecting) return;
  
  const canvas = canvasRef.current;
  const rect = canvas.getBoundingClientRect();
  
  // Get canvas coordinates
  const canvasX = (e.clientX - rect.left) * (canvas.width / rect.width);
  const canvasY = (e.clientY - rect.top) * (canvas.height / rect.height);
  
  console.log('Mouse down coordinate debug:', {
    client: { x: e.clientX, y: e.clientY },
    canvas: { x: canvasX, y: canvasY },
    canvasRect: { 
      left: rect.left, 
      top: rect.top, 
      width: rect.width, 
      height: rect.height 
    },
    canvasActual: { width: canvas.width, height: canvas.height },
    currentScale: fitToWidth ? 'fit-to-width' : scale
  });
  
  startPositionRef.current = { 
    x: canvasX, 
    y: canvasY,
    metadata: {
      clientX: e.clientX,
      clientY: e.clientY,
      canvasRect: rect,
      canvasActualWidth: canvas.width,
      canvasActualHeight: canvas.height,
      canvasDisplayWidth: rect.width,
      canvasDisplayHeight: rect.height,
      scale: fitToWidth ? 'fit-to-width' : scale,
      fitToWidth: fitToWidth,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    }
  };
  setDrawing(true);
};

  const handleMouseMove = (e) => {
    if (!isSelecting || !drawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const currentY = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tempCanvas, 0, 0);
    
    drawSavedRegions();
    
    const startX = startPositionRef.current.x;
    const startY = startPositionRef.current.y;
    const width = currentX - startX;
    const height = currentY - startY;
    
    ctx.beginPath();
    ctx.rect(startX, startY, width, height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
    ctx.fillStyle = 'rgba(255, 0, 0, 0.08)';
    ctx.fill();
    ctx.stroke();
  };

  const handleMouseUp = (e) => {
  if (!isSelecting || !drawing) return;
  
  setDrawing(false);
  
  const canvas = canvasRef.current;
  const rect = canvas.getBoundingClientRect();
  const endX = (e.clientX - rect.left) * (canvas.width / rect.width);
  const endY = (e.clientY - rect.top) * (canvas.height / rect.height);
  
  const startX = startPositionRef.current.x;
  const startY = startPositionRef.current.y;
  
  const x = Math.min(startX, endX);
  const y = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);
  
  if (width > 10 && height > 10) {
    // Get PDF page dimensions
    if (pdfDoc) {
      pdfDoc.getPage(currentPage).then(page => {
        const viewport = page.getViewport({ scale: 1 });
        const pdfPageWidth = viewport.width;
        const pdfPageHeight = viewport.height;
        
        console.log('=== COMPLETE FRONTEND COORDINATE DATA ===');
        console.log('PDF Page Dimensions (points):', { width: pdfPageWidth, height: pdfPageHeight });
        console.log('Canvas Actual Dimensions (pixels):', { width: canvas.width, height: canvas.height });
        console.log('Canvas Display Dimensions (CSS):', { width: rect.width, height: rect.height });
        console.log('Selected Region Canvas Coords:', { x1: x, y1: y, x2: x + width, y2: y + height });
        
        // Calculate scale factors for verification
        const scaleX = pdfPageWidth / canvas.width;
        const scaleY = pdfPageHeight / canvas.height;
        
        console.log('Calculated scale factors:', { scaleX, scaleY });
        
        const newRegion = {
          // Basic coordinates
          x,
          y,
          width,
          height,
          page: currentPage,
          x1: x,
          y1: y,
          x2: x + width,
          y2: y + height,
          
          // COMPLETE coordinate metadata for backend conversion
          coordinateMetadata: {
            // Canvas coordinates (what we drew)
            canvasCoords: { 
              x1: x, 
              y1: y, 
              x2: x + width, 
              y2: y + height 
            },
            
            // Canvas dimensions - CRITICAL for conversion
            canvasActualSize: { 
              width: canvas.width,   // Actual canvas rendering pixels
              height: canvas.height  // Actual canvas rendering pixels
            },
            canvasDisplaySize: { 
              width: rect.width,     // CSS display size
              height: rect.height    // CSS display size
            },
            
            // PDF page dimensions in PDF points - CRITICAL for conversion
            pdfPageSize: { 
              width: pdfPageWidth, 
              height: pdfPageHeight 
            },
            
            // Scale information
            scale: fitToWidth ? 'fit-to-width' : scale,
            fitToWidth: fitToWidth,
            
            // Calculated scale factors for verification
            calculatedScaleX: scaleX,
            calculatedScaleY: scaleY,
            
            // Additional debugging info
            coordinateSystem: 'canvas-pixels-to-pdf-points',
            timestamp: new Date().toISOString(),
            browserInfo: {
              userAgent: navigator.userAgent,
              devicePixelRatio: window.devicePixelRatio || 1
            }
          },
          
          // Legacy fields for backward compatibility
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          scaleFactor: fitToWidth ? (rect.width / pdfPageWidth) : scale,
          coordinateSystem: 'frontend-pixels',
          
          // Additional direct fields that backend might expect
          pdfPageWidth: pdfPageWidth,
          pdfPageHeight: pdfPageHeight,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          canvasDisplayWidth: rect.width,
          canvasDisplayHeight: rect.height
        };
        
        console.log('Complete region with all coordinate metadata:', newRegion);
        
        const updatedRegions = [...regions, newRegion];
        setRegions(updatedRegions);
        
        if (onRegionSelect) {
          onRegionSelect(newRegion);
        }
      }).catch(error => {
        console.error('Error getting PDF page dimensions:', error);
        // Fallback without PDF dimensions - still pass canvas data
        const newRegion = {
          x, y, width, height,
          page: currentPage,
          x1: x, y1: y, x2: x + width, y2: y + height,
          coordinateMetadata: {
            canvasCoords: { x1: x, y1: y, x2: x + width, y2: y + height },
            canvasActualSize: { width: canvas.width, height: canvas.height },
            canvasDisplaySize: { width: rect.width, height: rect.height },
            coordinateSystem: 'canvas-pixels-no-pdf-info',
            error: 'Could not get PDF page dimensions',
            timestamp: new Date().toISOString()
          },
          // Legacy fallback
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height
        };
        
        const updatedRegions = [...regions, newRegion];
        setRegions(updatedRegions);
        
        if (onRegionSelect) {
          onRegionSelect(newRegion);
        }
      });
    } else {
      // Fallback if no PDF loaded - still pass canvas data
      console.warn('No PDF document available for coordinate metadata');
      const newRegion = {
        x, y, width, height,
        page: currentPage,
        x1: x, y1: y, x2: x + width, y2: y + height,
        coordinateMetadata: {
          canvasCoords: { x1: x, y1: y, x2: x + width, y2: y + height },
          canvasActualSize: { width: canvas.width, height: canvas.height },
          canvasDisplaySize: { width: rect.width, height: rect.height },
          coordinateSystem: 'canvas-pixels-no-pdf-doc',
          error: 'PDF document not available',
          timestamp: new Date().toISOString()
        },
        // Legacy fallback
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height
      };
      
      const updatedRegions = [...regions, newRegion];
      setRegions(updatedRegions);
      
      if (onRegionSelect) {
        onRegionSelect(newRegion);
      }
    }
  }
  
  setTimeout(() => {
    renderPage();
  }, 10);
};

  const toggleRegionSelection = () => {
    setIsSelecting(!isSelecting);
  };

  // Determine file name
  const fileName = file?.name || file?.originalName || "PDF Document";

  // No file provided
  if (!file) {
    return (
      <Center height="100%" bg="gray.800">
        <Text color="gray.400">No PDF file available</Text>
      </Center>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Center height="100%" bg="gray.800" flexDirection="column">
        <Spinner size="xl" color="blue.400" mb={4} />
        <Text color="gray.300">Loading PDF...</Text>
        <Text color="gray.500" fontSize="sm" mt={2}>
          {fileName}
        </Text>
      </Center>
    );
  }

  // Error state - show placeholder with retry button
  if (error) {
    return (
      <Box 
        width="100%" 
        height="100%" 
        bg="gray.800" 
        display="flex" 
        flexDirection="column"
      >
        
        <Flex 
          bg="gray.700" 
          p={3} 
          borderBottom="1px" 
          borderColor="gray.600"
          justify="space-between"
          align="center"
        >
          <Text color="gray.200" fontWeight="medium" fontSize="sm">
            {fileName}
          </Text>
          <Text color="red.400" fontSize="xs">
            Error Loading PDF
          </Text>
        </Flex>
        
        <Box flex="1" p={4} overflow="auto">
          <Text color="red.400" fontWeight="medium" mb={4} fontSize="sm">
            {error}
          </Text>
          
          <Flex direction="column" mb={4}>
            <Text color="gray.300" fontSize="sm">Debug information:</Text>
            <Text color="gray.400" fontSize="xs" mt={1}>File ID: {file.id || file.fileId || 'not available'}</Text>
            {file.previewUrl && (
              <Text color="gray.400" fontSize="xs" mt={1}>Preview URL: {file.previewUrl}</Text>
            )}
            {pdfSource && (
              <Text color="gray.400" fontSize="xs" mt={1}>Attempted source: {pdfSource}</Text>
            )}
          </Flex>
          
          <Button 
            colorScheme="blue" 
            size="sm" 
            onClick={() => {
              // Reset the load attempt flag to force a retry
              loadAttemptedRef.current = false;
              setError(null);
              setLoading(true);
              
              // Force reload after a short delay
              setTimeout(() => {
                const loadEvent = new CustomEvent('reload-pdf');
                window.dispatchEvent(loadEvent);
              }, 100);
            }}
          >
            Retry Loading
          </Button>
          
          <Box 
            width="100%" 
            bg="white" 
            p={8} 
            borderRadius="md" 
            boxShadow="md"
            mt={4}
          >
            <Text color="gray.700" fontWeight="bold" mb={4} textAlign="center">{fileName}</Text>
            
            <Box width="100%" height="12px" bg="gray.200" mb={4} />
            <Box width="90%" height="12px" bg="gray.200" mb={4} />
            <Box width="95%" height="12px" bg="gray.200" mb={8} />
            
            <Box width="80%" height="12px" bg="gray.200" mb={4} />
            <Box width="85%" height="12px" bg="gray.200" mb={4} />
            <Box width="75%" height="12px" bg="gray.200" mb={8} />
            
            <Box width="90%" height="12px" bg="gray.200" mb={4} />
            <Box width="60%" height="12px" bg="gray.200" mb={4} />
            <Box width="70%" height="12px" bg="gray.200" />
          </Box>
        </Box>
      </Box>
    );
  }

  // Successfully loaded PDF
  return (
    <Box 
      id="pdf-viewer"
      width="100%" 
      height="100%" 
      bg="gray.800" 
      display="flex" 
      flexDirection="column"
      position="relative"
    >
      {/* Top bar with file name, page navigation, and zoom controls */}
      <Flex 
        bg="gray.700" 
        p={3} 
        borderBottom="1px" 
        borderColor="gray.600"
        justify="space-between"
        align="center"
      >
        <Text color="gray.200" fontWeight="medium" fontSize="sm">
          {fileName}
        </Text>
        
        <Flex align="center">
          {/* Region selection controls - Only show for fixed format */}
          {templateType === 'fixed' && (
            <Flex align="center" mr={4}>
              <Tooltip label={isSelecting ? "Stop Selecting" : "Select Regions"}>
                <IconButton
                  icon={<SquareIcon />}
                  onClick={toggleRegionSelection}
                  size="xs"
                  colorScheme="blue"
                  variant={isSelecting ? "solid" : "ghost"}
                  mr={2}
                  aria-label={isSelecting ? "Stop selecting regions" : "Select regions"}
                />
              </Tooltip>
              
              {regions.length > 0 && (
                <Tooltip label="Clear All Regions">
                  <Button
                    size="xs"
                    colorScheme="red"
                    variant="outline"
                    onClick={clearAllRegions}
                  >
                    Clear Regions
                  </Button>
                </Tooltip>
              )}
            </Flex>
          )}
          
          {/* Zoom and Fit to Width Controls */}
          <Tooltip label={fitToWidth ? "Disable Fit to Width" : "Fit to Width"}>
            <IconButton
              icon={fitToWidth ? <ViewIcon /> : <ShrinkIcon />}
              onClick={toggleFitToWidth}
              size="xs"
              colorScheme={fitToWidth ? "green" : "blue"}
              variant="ghost"
              mr={2}
              aria-label={fitToWidth ? "Disable fit to width" : "Fit to width"}
            />
          </Tooltip>

          <Tooltip label="Zoom Out">
            <IconButton
              icon={<MinusIcon />}
              onClick={zoomOut}
              size="xs"
              colorScheme="blue"
              variant="ghost"
              mr={2}
              isDisabled={loading || error}
              aria-label="Zoom out"
            />
          </Tooltip>

          <Tooltip label="Zoom In">
            <IconButton
              icon={<AddIcon />}
              onClick={zoomIn}
              size="xs"
              colorScheme="blue"
              variant="ghost"
              mr={2}
              isDisabled={loading || error}
              aria-label="Zoom in"
            />
          </Tooltip>

          {/* Page Navigation */}
          {numPages && (
            <Flex align="center">
              <Button 
                onClick={prevPage} 
                size="xs"
                colorScheme="blue"
                variant="ghost"
                isDisabled={currentPage <= 1}
                mr={2}
                leftIcon={<ChevronLeftIcon />}
                aria-label="Previous page"
              >
                Prev
              </Button>
              
              <Text color="gray.300" fontSize="sm">
                Page {currentPage} of {numPages}
              </Text>
              
              <Button 
                onClick={nextPage} 
                size="xs"
                colorScheme="blue"
                variant="ghost"
                isDisabled={currentPage >= numPages}
                ml={2}
                rightIcon={<ChevronRightIcon />}
                aria-label="Next page"
              >
                Next
              </Button>
            </Flex>
          )}
        </Flex>
      </Flex>
      
      {/* PDF content */}
      <Flex 
        ref={containerRef}
        flex="1" 
        justify="center" 
        align="flex-start"
        p={4}
        overflowY="auto"
        overflowX="auto"
        position="relative"
      >
        <canvas 
          ref={canvasRef}
          style={{ 
            background: 'white',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}
        />
      </Flex>
    </Box>
  );
};

export default PDFViewer;