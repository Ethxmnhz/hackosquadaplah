import React from "react";
import HackoPixelLogo from "./HackoPixelLogo.jsx";

interface LogoProps {
  size?: "small" | "medium" | "large";
}


const sizeToPixel = {
  small: 8,
  medium: 12,
  large: 16,
};



const Logo = ({ size = "medium" }: LogoProps) => {
  // Set a fixed width/height for the logo container
  const dims = {
    small: { width: 220, height: 40 },
    medium: { width: 320, height: 60 },
    large: { width: 420, height: 80 },
  };
  return (
    <div
      className="flex items-center select-none"
      style={{
        lineHeight: 0,
        width: dims[size].width,
        height: dims[size].height,
        overflow: "hidden",
      }}
    >
      <HackoPixelLogo pixelSize={sizeToPixel[size]} />
    </div>
  );
};

export default Logo;