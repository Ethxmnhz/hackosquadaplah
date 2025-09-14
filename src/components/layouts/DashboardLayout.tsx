import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../navigation/Navbar';
import Sidebar from '../navigation/Sidebar';
import { SidebarProvider, useSidebar } from '../../contexts/SidebarContext';

const DashboardContent = () => {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const { isMinimized } = useSidebar();

  return (
    <div className="min-h-screen bg-background-dark flex">
      {/* Desktop Sidebar */}
      <motion.div
        animate={{ width: isMinimized ? '80px' : '280px' }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="hidden lg:block fixed left-0 top-0 h-full z-30"
      >
        <Sidebar />
      </motion.div>

      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMobileSidebar(false)} />
          <div className="relative w-80 max-w-sm">
            <Sidebar mobile onClose={() => setShowMobileSidebar(false)} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <motion.div
        animate={{ marginLeft: isMinimized ? '80px' : '280px' }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex-1 lg:ml-80 flex flex-col min-h-screen"
      >
        {/* Navbar */}
        <Navbar onMenuClick={() => setShowMobileSidebar(true)} />
        
        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </motion.div>
    </div>
  );
};

const DashboardLayout = () => {
  return (
    <SidebarProvider>
      <DashboardContent />
    </SidebarProvider>
  );
};

export default DashboardLayout;