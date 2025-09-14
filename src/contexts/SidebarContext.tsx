import { createContext, useContext, useState, ReactNode } from 'react';

interface SidebarContextType {
  isMinimized: boolean;
  toggleSidebar: () => void;
  setIsMinimized: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

interface SidebarProviderProps {
  children: ReactNode;
}

export const SidebarProvider = ({ children }: SidebarProviderProps) => {
  const [isMinimized, setIsMinimized] = useState(false);

  const toggleSidebar = () => {
    setIsMinimized(prev => !prev);
  };

  return (
    <SidebarContext.Provider value={{ isMinimized, toggleSidebar, setIsMinimized }}>
      {children}
    </SidebarContext.Provider>
  );
};
