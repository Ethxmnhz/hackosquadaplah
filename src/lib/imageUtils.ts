/**
 * Utility functions for handling Google Drive image URLs
 */

/**
 * Converts a Google Drive sharing link to a direct image URL
 * @param url - The Google Drive sharing URL or any other URL
 * @returns Direct image URL that can be used in <img> src
 */
export function convertGoogleDriveUrl(url: string): string {
  if (!url) return url;
  
  // Enhanced regex to handle various Google Drive URL formats
  const driveRegex = /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)(?:\/[^?]*)?(?:\?.*)?$/;
  const match = url.match(driveRegex);
  
  if (match) {
    const fileId = match[1];
    const directUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
    console.log('Converting Google Drive URL:', url, '→', directUrl);
    return directUrl;
  }
  
  // If it's not a Google Drive link, return as is
  return url;
}

/**
 * Gets all possible Google Drive URL formats for a file ID
 * @param fileId - The Google Drive file ID
 * @returns Array of different URL formats to try
 */
export function getGoogleDriveUrlVariants(fileId: string): string[] {
  return [
    `https://drive.google.com/uc?export=view&id=${fileId}`,
    `https://drive.google.com/uc?id=${fileId}&export=download`,
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`,
    `https://lh3.googleusercontent.com/d/${fileId}=w800`,
  ];
}

/**
 * Checks if a URL is a Google Drive sharing link
 * @param url - The URL to check
 * @returns true if it's a Google Drive sharing link
 */
export function isGoogleDriveUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('drive.google.com/file/d/');
}

/**
 * Enhanced image error handler that tries alternative URL formats
 * @param originalUrl - The original image URL
 * @param onError - Callback function to handle final error
 * @returns Error handler function for img onError prop
 */
export function createImageErrorHandler(
  originalUrl: string,
  onError?: (url: string) => void
) {
  let attemptCount = 0;
  
  return (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = event.currentTarget;
    attemptCount++;
    
    console.log(`Image load attempt ${attemptCount} failed for URL:`, img.src);
    
    // First attempt: Try converting Google Drive URL if it's a sharing link
    if (attemptCount === 1 && isGoogleDriveUrl(originalUrl)) {
      const directUrl = convertGoogleDriveUrl(originalUrl);
      if (directUrl !== originalUrl) {
        console.log('Trying converted Google Drive URL:', directUrl);
        img.src = directUrl;
        return;
      }
    }
    
    // Second attempt: Try alternative Google Drive format
    if (attemptCount === 2 && isGoogleDriveUrl(originalUrl)) {
      const driveMatch = originalUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (driveMatch) {
        const fileId = driveMatch[1];
        const thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
        console.log('Trying Google Drive thumbnail URL:', thumbnailUrl);
        img.src = thumbnailUrl;
        return;
      }
    }
    
    // Third attempt: Try adding cache-busting parameter
    if (attemptCount === 3) {
      const baseUrl = convertGoogleDriveUrl(originalUrl);
      const separator = baseUrl.includes('?') ? '&' : '?';
      const cacheBustUrl = `${baseUrl}${separator}t=${Date.now()}`;
      console.log('Trying cache-busted URL:', cacheBustUrl);
      img.src = cacheBustUrl;
      return;
    }
    
    // Final fallback: Call the error handler or hide the image
    console.error('All image load attempts failed for:', originalUrl);
    if (onError) {
      onError(originalUrl);
    } else {
      img.style.display = 'none';
      // Show fallback content if parent has a fallback element
      const fallback = img.parentElement?.querySelector('.image-fallback') as HTMLElement;
      if (fallback) {
        fallback.style.display = 'flex';
      }
    }
  };
}