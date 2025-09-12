// File: components/FileUploader.js - Project-Aware File Storage
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_BASE_URL = '/api/files';

const FileUploader = ({ templateType, onUpload, onBack, hideTitle, projectId }) => {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false); // Start with false to avoid unnecessary loading
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const hasLoadedRef = useRef(false); // Use ref to track if we've already loaded files

  // Load project-specific files from server on component mount
  useEffect(() => {
    const loadProjectFiles = async () => {
      // Skip if we've already loaded files or no projectId
      if (hasLoadedRef.current || !projectId) {
        if (!projectId) {
          console.log('No projectId provided, skipping file loading');
        }
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log(`Loading files for project: ${projectId}`);
        
        // Call the correct backend endpoint for project configuration files
        const response = await axios.get(`${API_BASE_URL}/${projectId}/configuration/files`);
        
        if (response.data && response.data.files) {
          const projectFiles = response.data.files.map(file => ({
            id: file.file_id || file.fileId,
            fileId: file.file_id || file.fileId,
            name: extractFilename(file.filename),
            originalName: file.filename,
            size: file.size || 0,
            pageCount: file.page_count || file.pageCount,
            previewUrl: `${API_BASE_URL}/${projectId}/configuration/files/${file.file_id || file.fileId}/preview`,
            downloadUrl: `${API_BASE_URL}/${projectId}/configuration/files/${file.file_id || file.fileId}/download`,
            file: file, // Store the original file object for PDF viewer
            status: 'uploaded',
            uploadedAt: file.uploaded_at || file.uploadedAt,
            projectId: projectId
          }));
          setFiles(projectFiles);
          console.log(`Loaded ${projectFiles.length} files for project ${projectId}`);
        } else {
          // No files found - set empty array and log it
          setFiles([]);
          console.log(`No files found for project ${projectId}`);
        }
        // Mark that we've loaded files
        hasLoadedRef.current = true;
      } catch (error) {
        console.error('Error loading project files:', error);
        // Important: Set files to empty array on error
        setFiles([]);
        setError('Failed to load project files');
      } finally {
        // Always set loading to false
        setLoading(false);
      }
    };

    // Only call if we have a projectId and haven't loaded yet
    if (projectId && !hasLoadedRef.current) {
      loadProjectFiles();
    } else {
      setLoading(false);
    }
  }, [projectId]); // React StrictMode in dev will call this twice, but our ref prevents double loading

  // Extract a clean filename from the backend filename
  const extractFilename = (filename) => {
    if (!filename) return 'Unknown file';
    
    // If filename looks like 'uuid_originalname.pdf', extract the original name
    const parts = filename.split('_');
    if (parts.length > 1) {
      return parts.slice(1).join('_');
    }
    
    // If filename is just a UUID with .pdf, return a cleaner version
    if (filename.match(/^[0-9a-f-]{36}\.pdf$/i)) {
      return `Document-${filename.slice(0, 8)}.pdf`;
    }
    
    return filename;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf'
    );
    
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files).filter(
      file => file.type === 'application/pdf'
    );
    
    if (selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
    
    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  const processFiles = async (newFiles) => {
    setIsUploading(true);
    setError(null);
    
    const filesWithIds = newFiles.map(file => ({
      tempId: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
      file: file, // Store the original File object
      status: 'uploading',
      uploadProgress: 0
    }));
    
    // Add the new files to the list immediately to show upload progress
    setFiles(prev => [...prev, ...filesWithIds]);
    
    // Upload files sequentially to avoid overwhelming the server
    for (const fileObj of filesWithIds) {
      await uploadFileToBackend(fileObj);
    }
    
    setIsUploading(false);
  };

  const uploadFileToBackend = async (fileObj) => {
    try {
      const formData = new FormData();
      formData.append('file', fileObj.file);
      
      // Add project ID to the form data if available
      if (projectId) {
        formData.append('projectId', projectId);
      }
      
      console.log(`Uploading file for project: ${projectId || 'global'}`);
      
      // Fixed upload progress simulation
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        if (currentProgress < 95) {
          currentProgress += Math.random() * 10;
          if (currentProgress > 95) currentProgress = 95;
          
          setFiles(prev => prev.map(f => 
            f.tempId === fileObj.tempId ? { ...f, uploadProgress: currentProgress } : f
          ));
        }
      }, 300);
      
      // Use the correct backend endpoint - configuration/upload for project files
      const uploadUrl = projectId 
        ? `${API_BASE_URL}/${projectId}/configuration/upload`
        : `${API_BASE_URL}/files/upload`;
      
      const response = await axios.post(uploadUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 300000,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            // Only update if the API gives us a reasonable progress
            if (percentCompleted > 0) {
              setFiles(prev => prev.map(f => 
                f.tempId === fileObj.tempId ? { ...f, uploadProgress: percentCompleted } : f
              ));
            }
          }
        }
      });
      
      // Clear the progress interval
      clearInterval(progressInterval);
      
      if (response.data && (response.data.fileId || response.data.file_id)) {
        const fileId = response.data.fileId || response.data.file_id;
        const previewUrl = projectId 
          ? `${API_BASE_URL}/${projectId}/configuration/files/${fileId}/preview`
          : `${API_BASE_URL}/files/${fileId}/preview`;
        
        // Update the file with the server response
        setFiles(prev => prev.map(f => 
          f.tempId === fileObj.tempId ? { 
            ...f, 
            id: fileId,
            fileId: fileId,
            name: extractFilename(response.data.filename),
            originalName: response.data.filename,
            previewUrl: previewUrl,
            downloadUrl: projectId ? `${API_BASE_URL}/${projectId}/configuration/files/${fileId}/download` : undefined,
            pageCount: response.data.pageCount || response.data.page_count || 1,
            file: response.data,
            status: 'uploaded',
            uploadedAt: response.data.uploadedAt || response.data.uploaded_at || new Date().toISOString(),
            projectId: projectId,
            uploadProgress: 100
          } : f
        ));
        
        console.log(`File uploaded successfully to project ${projectId}: ${fileId}`);
      } else {
        throw new Error('Invalid server response - no fileId received');
      }
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Upload failed';
      
      // Update the file with error status
      setFiles(prev => prev.map(f => 
        f.tempId === fileObj.tempId ? { 
          ...f, 
          status: 'error', 
          error: errorMessage,
          uploadProgress: 0
        } : f
      ));
      
      setError(`Upload failed: ${errorMessage}`);
    }
  };

  const removeFile = async (fileId) => {
    try {
      if (!fileId.startsWith('temp-')) {
        
        const deleteUrl = projectId 
          ? `${API_BASE_URL}/${projectId}/configuration/files/${fileId}`
          : `${API_BASE_URL}/files/${fileId}`;

        await axios.delete(deleteUrl);
        console.log(`File deleted from project ${projectId}: ${fileId}`);
      }
      
      setFiles(prev => prev.filter(f => f.tempId !== fileId && f.id !== fileId));
    } catch (error) {
      console.error('Error removing file:', error);
      setError('Failed to remove file');
    }
  };

  const handleContinue = () => {
    const uploadedFiles = files.filter(f => f.status === 'uploaded');
    if (uploadedFiles.length > 0) {
      console.log(`Continuing with ${uploadedFiles.length} files for project ${projectId}`);
      // Ensure we pass all necessary file properties to the onUpload handler
      const enrichedFiles = uploadedFiles.map(file => ({
        ...file,
        // Ensure these fields are always present 
        fileId: file.fileId || file.id,
        id: file.id || file.fileId,
        projectId: projectId
      }));
      onUpload(enrichedFiles);
    }
  };

  const getTemplateTypeLabel = () => {
    return templateType === 'fixed' ? 'Fixed Format' : 'Running Format';
  };

  const getFileStatusDisplay = (file) => {
    if (file.status === 'uploading') {
      return (
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
            <span className="text-xs text-blue-400 mt-1">
              {file.uploadProgress ? `${Math.round(file.uploadProgress)}%` : 'Uploading...'}
            </span>
          </div>
        </div>
      );
    } else if (file.status === 'uploaded') {
      return (
        <span className="text-green-400 text-xs font-medium">
          ✓ Uploaded
        </span>
      );
    } else if (file.status === 'error') {
      return (
        <div className="flex flex-col">
          <span className="text-red-400 text-xs font-medium">✗ Failed</span>
          {file.error && (
            <span className="text-red-300 text-xs truncate max-w-20" title={file.error}>
              {file.error}
            </span>
          )}
        </div>
      );
    }
    return (
      <span className="text-gray-400 text-xs">
        Ready
      </span>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-22rem)]">
      {!hideTitle && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Upload PDF Files</h2>
          <div className="flex items-center gap-3">
            {projectId && (
              <div className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm">
                Project: {projectId}
              </div>
            )}
            <div className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm">
              {getTemplateTypeLabel()}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 text-red-300 px-3 py-2 rounded-lg mb-3 text-sm">
          {error}
          <button 
            className="ml-2 text-red-400 hover:text-red-300"
            onClick={() => setError(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Global Upload Progress */}
      {isUploading && (
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="animate-spin h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm text-blue-300 font-medium">Uploading files...</span>
          </div>
          <div className="text-xs text-blue-200">
            Files are being saved to project: {projectId || 'global storage'}
          </div>
        </div>
      )}

      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center
          transition-colors duration-200 ease-in-out mb-4
          ${isDragging ? 'border-blue-400 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500'}
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          multiple
          accept=".pdf"
          disabled={isUploading}
        />

        <div>
          <div className="text-3xl mb-2">📄</div>
          <h3 className="text-lg font-medium mb-1">
            {isDragging ? 'Drop PDFs here' : 'Drag & Drop PDF files here'}
          </h3>
          <p className="text-gray-400 mb-3 text-sm">or</p>
          <button
            className={`
              px-4 py-1.5 rounded-md font-medium transition-colors text-sm
              ${isUploading 
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
            `}
            onClick={() => fileInputRef.current.click()}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : 'Browse Files'}
          </button>
          <p className="mt-3 text-xs text-gray-400">
            {projectId ? `Files will be saved to project: ${projectId}` : 'Upload PDF files for processing'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-400 text-sm">Loading project files...</p>
        </div>
      ) : files.length > 0 ? (
        <>
          <div className="bg-gray-700/50 rounded-lg overflow-hidden mb-4 flex-1">
            <div className="p-3 border-b border-gray-600 flex justify-between items-center">
              <h3 className="font-medium text-sm flex items-center">
                {projectId ? `Project Files (${files.length})` : `Files (${files.length})`}
              </h3>
              <div className="text-xs text-gray-400">
                {files.filter(f => f.status === 'uploaded').length} uploaded, {files.filter(f => f.status === 'uploading').length} uploading
              </div>
            </div>
            <div className="overflow-y-auto max-h-[calc(100vh-42rem)]">
              <table className="w-full">
                <thead className="bg-gray-800/50 sticky top-0">
                  <tr className="text-left text-xs text-gray-400">
                    <th className="p-2">File Name</th>
                    <th className="p-2">Size</th>
                    <th className="p-2">Pages</th>
                    <th className="p-2">Uploaded</th>
                    <th className="p-2 w-24">Status</th>
                    <th className="p-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-600">
                  <AnimatePresence>
                    {files.map(file => (
                      <motion.tr
                        key={file.tempId || file.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="hover:bg-gray-700/30 transition-colors"
                      >
                        <td className="p-2">
                          <div className="flex items-center">
                            <span className="text-lg mr-2">📄</span>
                            <div>
                              <span className="text-sm font-medium truncate max-w-xs block" title={file.name}>
                                {file.name}
                              </span>
                              {file.projectId && (
                                <span className="text-xs text-purple-400">Project file</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-2 text-xs text-gray-400">
                          {formatFileSize(file.size)}
                        </td>
                        <td className="p-2 text-xs text-gray-400">
                          {file.pageCount || '-'}
                        </td>
                        <td className="p-2 text-xs text-gray-400">
                          {file.uploadedAt ? formatDate(file.uploadedAt) : '-'}
                        </td>
                        <td className="p-2">
                          {getFileStatusDisplay(file)}
                        </td>
                        <td className="p-2">
                          <button
                            className="text-gray-400 hover:text-red-400 p-1 rounded hover:bg-gray-700 disabled:opacity-50"
                            onClick={() => removeFile(file.tempId || file.id)}
                            disabled={file.status === 'uploading'}
                            title="Remove file"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6Z"/>
                              <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1ZM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118ZM2.5 3h11V2h-11v1Z"/>
                            </svg>
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="flex justify-between pt-2 mt-auto">
            <button
              className="px-4 py-1.5 text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-md transition-colors text-sm"
              onClick={onBack}
              disabled={isUploading}
            >
              Back
            </button>
            
            <button
              className={`
                px-6 py-1.5 rounded-md font-medium transition-all text-sm
                ${files.filter(f => f.status === 'uploaded').length > 0 && !isUploading
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'}
              `}
              onClick={handleContinue}
              disabled={files.filter(f => f.status === 'uploaded').length === 0 || isUploading}
            >
              Continue with {files.filter(f => f.status === 'uploaded').length || 'no'} file{files.filter(f => f.status === 'uploaded').length !== 1 ? 's' : ''}
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-6 bg-gray-700/30 rounded-lg">
          <p className="text-sm text-gray-500 mt-1">
            {projectId ? `No files uploaded to project ${projectId} yet` : 'No files uploaded yet'}
          </p>
        </div>
      )}

      {files.length === 0 && !loading && (
        <div className="flex justify-between pt-2 mt-auto">
          <button
            className="px-4 py-1.5 text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-md transition-colors text-sm"
            onClick={onBack}
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUploader;