import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';

export const useAdmin = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Special override for specific admin email
      if (user.email === 'shaikhminhaz1975@gmail.com') {
        setIsAdmin(true);
        setLoading(false);
        return;
      }

      try {
        // New: Check admin_roles instead of non-existent admin_users
        const { data, error } = await supabase
          .from('admin_roles')
          .select('user_id')
          .eq('user_id', user.id)
          .limit(1);

        if (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(!!data && data.length > 0);
        }
      } catch (err) {
        console.error('Exception checking admin status:', err);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  return { isAdmin, loading };
};