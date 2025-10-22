import React from 'react';
import { convertGoogleDriveUrl, createImageErrorHandler } from '../../lib/imageUtils';

interface GoogleDriveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: React.ReactNode;
  fallbackClassName?: string;
}

/**
 * Enhanced image component that automatically handles Google Drive URLs
 * and provides graceful fallback for failed loads
 */
const GoogleDriveImage: React.FC<GoogleDriveImageProps> = ({ 
  src, 
  alt, 
  fallback, 
  fallbackClassName = "w-full h-full flex items-center justify-center bg-slate-800",
  className,
  ...props 
}) => {
  const convertedSrc = convertGoogleDriveUrl(src);
  
  return (
    <div className="relative w-full h-full">
      <img
        {...props}
        src={convertedSrc}
        alt={alt}
        className={className}
        onError={createImageErrorHandler(src)}
      />
      {fallback && (
        <div className={`image-fallback hidden ${fallbackClassName}`}>
          {fallback}
        </div>
      )}
    </div>
  );
};

export default GoogleDriveImage;