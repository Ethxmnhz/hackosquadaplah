import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdmin } from '../../hooks/useAdmin';

interface AdminUser {
  id: string;
  email?: string;
  username?: string;
  created_at: string;
}

const AdminUserManagement = () => {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch all admin users
  const fetchAdminUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select(`
          id,
          created_at,
          profiles (
            email,
            username
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform the data to flatten the structure
      const formattedData = data.map((admin: any) => ({
        id: admin.id,
        email: admin.profiles?.email,
        username: admin.profiles?.username,
        created_at: admin.created_at
      }));
      
      setAdminUsers(formattedData);
    } catch (err: any) {
      console.error('Error fetching admin users:', err);
      setError(err.message || 'Failed to fetch admin users');
    } finally {
      setLoading(false);
    }
  };

  // Add a new admin by email
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;
    
    setAdding(true);
    setError(null);
    setSuccess(null);
    
    try {
      // First, find the user ID by email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newAdminEmail.trim())
        .single();
      
      if (userError) {
        throw new Error(`User not found with email ${newAdminEmail}`);
      }
      
      if (!userData?.id) {
        throw new Error('User ID not found');
      }
      
      // Add the user to admin_users
      const { error: insertError } = await supabase
        .from('admin_users')
        .insert({ id: userData.id })
        .single();
      
      if (insertError) {
        if (insertError.code === '23505') { // Unique constraint violation
          throw new Error('User is already an admin');
        }
        throw insertError;
      }
      
      setSuccess(`Added ${newAdminEmail} as admin`);
      setNewAdminEmail('');
      fetchAdminUsers(); // Refresh the list
    } catch (err: any) {
      console.error('Error adding admin:', err);
      setError(err.message || 'Failed to add admin');
    } finally {
      setAdding(false);
    }
  };

  // Remove an admin
  const handleRemoveAdmin = async (id: string, email?: string) => {
    if (!window.confirm(`Are you sure you want to remove ${email || id} as admin?`)) {
      return;
    }
    
    setError(null);
    setSuccess(null);
    
    try {
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setSuccess(`Removed ${email || id} from admins`);
      setAdminUsers(adminUsers.filter(admin => admin.id !== id));
    } catch (err: any) {
      console.error('Error removing admin:', err);
      setError(err.message || 'Failed to remove admin');
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAdminUsers();
    }
  }, [isAdmin]);

  if (adminLoading) {
    return <div className="animate-pulse text-primary">Loading...</div>;
  }

  if (!isAdmin) {
    return <div className="text-red-500">Access denied. Admin privileges required.</div>;
  }

  return (
    <div className="bg-background-light p-6 rounded-xl border border-primary/20 shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Admin User Management</h2>
      
      {/* Add admin form */}
      <form onSubmit={handleAddAdmin} className="mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="email"
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
            placeholder="user@example.com"
            className="bg-background-dark border border-primary/30 rounded-lg px-4 py-2 flex-grow"
            disabled={adding}
          />
          <button
            type="submit"
            className="btn-primary px-6 py-2"
            disabled={adding || !newAdminEmail.trim()}
          >
            {adding ? 'Adding...' : 'Add Admin'}
          </button>
        </div>
        
        {error && <div className="mt-2 text-red-500">{error}</div>}
        {success && <div className="mt-2 text-green-500">{success}</div>}
      </form>
      
      {/* Admin users list */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Current Admins</h3>
        
        {loading ? (
          <div className="animate-pulse text-primary">Loading admin users...</div>
        ) : adminUsers.length === 0 ? (
          <div className="text-white/60">No admin users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-background-dark border-b border-primary/20">
                  <th className="text-left py-3 px-4">Email</th>
                  <th className="text-left py-3 px-4">Username</th>
                  <th className="text-left py-3 px-4">Added</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.map((admin) => (
                  <tr key={admin.id} className="border-b border-primary/10 hover:bg-background-dark/50">
                    <td className="py-3 px-4">{admin.email || 'N/A'}</td>
                    <td className="py-3 px-4">{admin.username || 'N/A'}</td>
                    <td className="py-3 px-4">
                      {new Date(admin.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleRemoveAdmin(admin.id, admin.email)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUserManagement;
