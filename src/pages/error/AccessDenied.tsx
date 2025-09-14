import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, AlertTriangle } from 'lucide-react';

const AccessDenied = () => {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-red-800 p-4 flex items-center justify-center">
          <Shield className="h-16 w-16 text-white" />
        </div>
        
        <div className="p-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          
          <div className="flex items-center justify-center mb-4">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
            <p className="text-yellow-500 font-medium">Admin privileges required</p>
          </div>
          
          <p className="text-gray-300 mb-6">
            You don't have permission to access this area. This section is restricted to administrators only.
          </p>
          
          <Link 
            to="/dashboard"
            className="inline-flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return to Dashboard
          </Link>
        </div>
        
        <div className="bg-gray-900 p-4 text-center">
          <p className="text-gray-400 text-sm">
            If you believe you should have access to this area, please contact the system administrator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
