// components/DebugPDFViewer.js
import React, { useState, useEffect } from 'react';
import { Box, Text, Flex, Center, VStack, Code, Button } from '@chakra-ui/react';

// A component that displays detailed information about the file object
// and always provides a usable fallback
const DebugPDFViewer = ({ file }) => {
  const [fileInfo, setFileInfo] = useState(null);
  
  // Extract detailed information about the file object
  useEffect(() => {
    const getFileInfo = () => {
      try {
        const info = {
          value: file,
          type: typeof file,
          constructor: file && typeof file === 'object' ? file.constructor.name : 'N/A',
          properties: file && typeof file === 'object' ? Object.keys(file) : [],
          isFile: file instanceof File,
          toString: file ? file.toString() : 'null or undefined'
        };
        
        // Try to get additional properties if it's an object
        if (file && typeof file === 'object') {
          // Check for common properties
          info.hasName = 'name' in file;
          info.hasType = 'type' in file;
          info.hasUrl = 'url' in file;
          info.hasSize = 'size' in file;
          info.hasLastModified = 'lastModified' in file;
          
          // Get the values of safe properties
          if (info.hasName) info.name = file.name;
          if (info.hasType) info.type = file.type;
          if (info.hasUrl) info.url = file.url;
          if (info.hasSize) info.size = file.size;
          if (info.hasLastModified) info.lastModified = new Date(file.lastModified).toISOString();
          
          // Special handling for File and Blob objects
          if (file instanceof Blob) {
            info.blobSize = file.size;
            info.blobType = file.type;
          }
        }
        
        console.log("File debug info:", info);
        setFileInfo(info);
      } catch (error) {
        console.error("Error analyzing file:", error);
        setFileInfo({ error: error.message });
      }
    };
    
    getFileInfo();
  }, [file]);

  // Determine file name or placeholder
  const fileName = file && typeof file === 'object' && file.name 
    ? file.name 
    : "PDF Document";

  // No file provided
  if (!file) {
    return (
      <Center height="100%" bg="gray.800">
        <Text color="gray.400">No PDF file available</Text>
      </Center>
    );
  }

  return (
    <Box 
      width="100%" 
      height="100%" 
      bg="gray.800" 
      display="flex" 
      flexDirection="column"
      overflow="hidden"
    >
      {/* Top bar with file name */}
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
        <Text color="yellow.300" fontSize="xs">
          PDF Debug Mode
        </Text>
      </Flex>
      
      {/* Content area */}
      <Box 
        flex="1" 
        overflowY="auto" 
        p={4}
      >
        {/* Debug information */}
        <VStack align="stretch" spacing={3} mb={6}>
          <Text color="white" fontWeight="bold">File Object Information:</Text>
          
          <Box bg="gray.700" p={3} borderRadius="md">
            <Text color="gray.300" fontSize="sm" fontWeight="bold" mb={1}>Type:</Text>
            <Code>{fileInfo?.type || 'Loading...'}</Code>
          </Box>
          
          <Box bg="gray.700" p={3} borderRadius="md">
            <Text color="gray.300" fontSize="sm" fontWeight="bold" mb={1}>Constructor:</Text>
            <Code>{fileInfo?.constructor || 'Loading...'}</Code>
          </Box>
          
          <Box bg="gray.700" p={3} borderRadius="md">
            <Text color="gray.300" fontSize="sm" fontWeight="bold" mb={1}>Properties:</Text>
            <Code display="block" p={2} overflowX="auto">
              {fileInfo?.properties?.join(', ') || 'None'}
            </Code>
          </Box>
          
          {fileInfo?.hasName && (
            <Box bg="gray.700" p={3} borderRadius="md">
              <Text color="gray.300" fontSize="sm" fontWeight="bold" mb={1}>Name:</Text>
              <Code>{fileInfo.name}</Code>
            </Box>
          )}
          
          {fileInfo?.hasUrl && (
            <Box bg="gray.700" p={3} borderRadius="md">
              <Text color="gray.300" fontSize="sm" fontWeight="bold" mb={1}>URL:</Text>
              <Code>{fileInfo.url}</Code>
            </Box>
          )}
          
          {fileInfo?.hasType && (
            <Box bg="gray.700" p={3} borderRadius="md">
              <Text color="gray.300" fontSize="sm" fontWeight="bold" mb={1}>MIME Type:</Text>
              <Code>{fileInfo.type}</Code>
            </Box>
          )}
          
          <Box bg="gray.700" p={3} borderRadius="md">
            <Text color="gray.300" fontSize="sm" fontWeight="bold" mb={1}>Is File Object:</Text>
            <Code>{fileInfo?.isFile ? 'Yes' : 'No'}</Code>
          </Box>
          
          <Box bg="blue.800" p={4} borderRadius="md">
            <Text color="white" fontWeight="bold" mb={3}>PDF.js Requirements:</Text>
            <Text color="blue.100" mb={2}>For PDF.js to render your PDF, the file must be one of:</Text>
            <VStack align="start" spacing={1} mb={4} pl={4}>
              <Text color="blue.100">• A File object from a file input</Text>
              <Text color="blue.100">• A URL string pointing to a PDF</Text>
              <Text color="blue.100">• An object with a "url" property</Text>
            </VStack>
            <Text color="blue.100" fontSize="sm">
              Your file object doesn't match any of these criteria. You can modify your code to pass the file in one of these formats.
            </Text>
          </Box>
        </VStack>
        
        {/* Placeholder preview */}
        <Box 
          width="100%" 
          bg="white" 
          p={8} 
          borderRadius="md" 
          boxShadow="md"
          mb={4}
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
};

export default DebugPDFViewer;