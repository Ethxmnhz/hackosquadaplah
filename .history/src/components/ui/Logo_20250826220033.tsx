import React from "react";
import HackoPixelLogo from "./HackoPixelLogo.jsx";

interface LogoProps {
  size?: "small" | "medium" | "large";
}


const sizeToPixel = {
  small: 4,
  medium: 8,
  large: 12,
};



const Logo = ({ size = "medium" }: LogoProps) => {
  // Set a fixed width/height for the logo container
  const dims = {
    small: { width: 80, height: 20 },
    medium: { width: 180, height: 40 },
    large: { width: 320, height: 60 },
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