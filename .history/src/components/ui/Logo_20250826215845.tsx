import React from "react";
import HackoPixelLogo from "./HackoPixelLogo.jsx";

interface LogoProps {
  size?: "small" | "medium" | "large";
}

const sizeToPixel = {
  small: 7,
  medium: 10,
  large: 14,
};


const Logo = ({ size = "medium" }: LogoProps) => {
  // Set a max width/height for the logo container
  const maxDims = {
    small: 48,
    medium: 72,
    large: 96,
  };
  return (
    <div
      className="flex items-center select-none"
      style={{
        lineHeight: 0,
        maxWidth: maxDims[size],
        maxHeight: maxDims[size],
        width: "100%",
        height: "auto",
        overflow: "hidden",
      }}
    >
      <HackoPixelLogo pixelSize={sizeToPixel[size]} />
    </div>
  );
};

export default Logo;