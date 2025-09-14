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
  return (
    <div className="flex items-center select-none" style={{ lineHeight: 0 }}>
      <HackoPixelLogo pixelSize={sizeToPixel[size]} />
    </div>
  );
};

export default Logo;