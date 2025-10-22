// Test component for Google Drive URL conversion
// Add this temporarily to any page to test your specific URL

import React, { useState } from 'react';
import { convertGoogleDriveUrl, getGoogleDriveUrlVariants, createImageErrorHandler } from '../../lib/imageUtils';

const GoogleDriveTest = () => {
  const [testUrl, setTestUrl] = useState('https://drive.google.com/file/d/1WMEVh_u-ODWCHic0W6zxhMNOLLGw0_sv/view');
  const [loadResults, setLoadResults] = useState<{[key: string]: string}>({});
  
  const convertedUrl = convertGoogleDriveUrl(testUrl);
  
  // Extract file ID for testing multiple formats
  const fileIdMatch = testUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  const fileId = fileIdMatch ? fileIdMatch[1] : '';
  const urlVariants = fileId ? getGoogleDriveUrlVariants(fileId) : [convertedUrl];
  
  const handleImageLoad = (url: string, success: boolean, error?: string) => {
    setLoadResults(prev => ({
      ...prev,
      [url]: success ? 'SUCCESS' : `FAILED: ${error || 'Unknown error'}`
    }));
  };
  
  return (
    <div className="p-6 border border-gray-500 rounded bg-gray-900 text-white max-w-4xl">
      <h3 className="text-white mb-4 text-lg font-bold">Google Drive URL Debug Tool</h3>
      
      <div className="mb-4">
        <label className="block text-sm mb-2">Test URL:</label>
        <input 
          type="text" 
          value={testUrl} 
          onChange={(e) => setTestUrl(e.target.value)}
          className="w-full p-2 bg-gray-800 text-white border border-gray-600 rounded"
        />
      </div>
      
      <div className="mb-4">
        <p className="text-sm text-gray-300 mb-1">File ID: <code className="bg-gray-800 px-1">{fileId}</code></p>
        <p className="text-sm text-gray-300 mb-1">Primary Converted: <code className="bg-gray-800 px-1 text-xs">{convertedUrl}</code></p>
      </div>
      
      <div className="space-y-4">
        <h4 className="font-semibold">Testing Different URL Formats:</h4>
        {urlVariants.map((url, index) => (
          <div key={index} className="border border-gray-700 p-3 rounded">
            <p className="text-xs text-gray-400 mb-2">Format {index + 1}: <code className="bg-gray-800 px-1 break-all">{url}</code></p>
            <div className="flex items-center gap-4">
              <img 
                src={url} 
                alt={`Test ${index + 1}`} 
                className="w-24 h-24 object-cover border border-gray-600"
                onLoad={() => {
                  console.log(`✓ Image loaded: Format ${index + 1}`, url);
                  handleImageLoad(url, true);
                }}
                onError={(e) => {
                  console.error(`✗ Image failed: Format ${index + 1}`, url);
                  handleImageLoad(url, false, 'Load failed');
                  e.currentTarget.style.border = '2px solid red';
                }}
              />
              <div className="flex-1">
                <p className="text-sm">Status: <span className={`font-mono ${loadResults[url]?.startsWith('SUCCESS') ? 'text-green-400' : 'text-red-400'}`}>
                  {loadResults[url] || 'Testing...'}
                </span></p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 p-3 bg-gray-800 rounded">
        <h4 className="font-semibold mb-2">Troubleshooting:</h4>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• Make sure the Google Drive file is shared as "Anyone with the link can view"</li>
          <li>• Check if the file is an image format (jpg, png, gif, etc.)</li>
          <li>• Large files might take time to load or may not work as direct images</li>
          <li>• If all formats fail, try uploading to a different image hosting service</li>
        </ul>
      </div>
    </div>
  );
};

export default GoogleDriveTest;