import { Shield, Terminal } from 'lucide-react';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
}

const Logo = ({ size = 'medium' }: LogoProps) => {
  const sizeClasses = {
    small: 'text-lg',
    medium: 'text-xl',
    large: 'text-2xl',
  };

  return (
    <div className="flex items-center">
      <div className="relative mr-2">
        <Shield className="text-primary h-6 w-6" />
        <Terminal className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-3 w-3 text-white" />
      </div>
      <span className={`font-bold text-white ${sizeClasses[size]}`}>
        <span className="text-primary">Hacko</span>Squad
      </span>
    </div>
  );
};

export default Logo;