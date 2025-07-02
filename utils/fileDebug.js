// utils/fileDebug.js
/**
 * Utility to safely inspect file objects and convert them to a string representation
 * @param {any} fileObj - The file object to inspect
 * @return {string} - String representation of the file object
 */
export const getFileDebugInfo = (fileObj) => {
    try {
      // Basic file type information
      const info = {
        type: typeof fileObj,
        isNull: fileObj === null,
        isUndefined: fileObj === undefined,
      };
      
      // Check if it's an object and not null
      if (fileObj && typeof fileObj === 'object') {
        // Check if it's a File object
        info.isFile = fileObj instanceof File;
        
        // Get all enumerable properties
        const properties = Object.keys(fileObj);
        info.propertyCount = properties.length;
        info.properties = properties;
        
        // Check for common file properties
        info.hasName = 'name' in fileObj;
        info.hasUrl = 'url' in fileObj;
        info.hasPath = 'path' in fileObj;
        info.hasSrc = 'src' in fileObj;
        info.hasType = 'type' in fileObj;
        info.hasSize = 'size' in fileObj;
        
        // Get actual values for some safe properties
        if (info.hasName) info.name = fileObj.name;
        if (info.hasType) info.type = fileObj.type;
        if (info.hasSize) info.size = fileObj.size;
      }
      
      // Convert to formatted string
      return JSON.stringify(info, null, 2);
    } catch (err) {
      return `Error inspecting file: ${err.message}`;
    }
  };
  
  /**
   * Log file debug info to console
   * @param {any} fileObj - The file object to debug
   * @param {string} label - Optional label for the log
   */
  export const logFileDebug = (fileObj, label = 'File Debug') => {
    console.log(`----- ${label} -----`);
    console.log(fileObj);
    console.log(getFileDebugInfo(fileObj));
    console.log('-----------------------');
  };