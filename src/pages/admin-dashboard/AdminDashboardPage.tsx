import AdminUserManagement from '../../components/admin/AdminUserManagement';

const AdminDashboardPage = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-gray-400 mt-2">Manage system users and permissions</p>
      </div>
      
      <div className="bg-background-light p-6 rounded-xl border border-primary/20 shadow-lg mb-8">
        <h2 className="text-2xl font-bold mb-6">Admin User Management</h2>
        <AdminUserManagement />
      </div>
    </div>
  );
};

export default AdminDashboardPage;
