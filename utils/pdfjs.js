// Simplified PDF.js utility with a more reliable approach

// Use a stable version of PDF.js
const PDFJS_VERSION = '2.16.105';
const PDFJS_BASE_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

let pdfJsPromise = null;
let initialized = false;

/**
 * Simple script loader with timeout
 */
function loadScript(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Script load timeout: ${url}`));
    }, timeout);
    
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => {
      clearTimeout(timeoutId);
      resolve();
    };
    script.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to load script: ${url}`));
    };
    document.head.appendChild(script);
  });
}

/**
 * Initialize PDF.js library
 */
export function initPdfJs() {
  if (initialized) return Promise.resolve();
  if (pdfJsPromise) return pdfJsPromise;
  
  // Create initialization promise
  pdfJsPromise = new Promise(async (resolve, reject) => {
    try {
      console.log('Initializing PDF.js...');
      // Load PDF.js main script
      await loadScript(`${PDFJS_BASE_URL}/pdf.min.js`);
      
      // Configure PDF.js
      if (typeof window.pdfjsLib !== 'undefined') {
        // Set worker source
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE_URL}/pdf.worker.min.js`;
        console.log('PDF.js initialized successfully');
        initialized = true;
        resolve();
      } else {
        reject(new Error('PDF.js failed to initialize correctly'));
      }
    } catch (error) {
      console.error('PDF.js initialization failed:', error);
      reject(error);
    }
  });
  
  return pdfJsPromise;
}

/**
 * Load a PDF document
 */
export async function getDocument(source) {
  try {
    // Initialize PDF.js first
    await initPdfJs();
    
    if (!window.pdfjsLib) {
      throw new Error('PDF.js is not available');
    }
    
    console.log('Loading PDF document:', source);
    
    // Handle different source types
    let documentSource = source;
    
    // Handle blob data
    if (source && typeof source === 'object' && source.data) {
      documentSource = source;
    }
    // Handle URL that needs to be absolute
    else if (typeof source === 'string') {
      if (source.startsWith('/')) {
        documentSource = window.location.origin + source;
      }
    }
    
    // Create a loading task
    const loadingTask = window.pdfjsLib.getDocument(documentSource);
    
    // Return the document promise
    return loadingTask.promise;
  } catch (error) {
    console.error('Error in getDocument:', error);
    throw new Error(`PDF loading failed: ${error.message}`);
  }
}
