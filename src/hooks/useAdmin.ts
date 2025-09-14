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
        // Check if user is in admin_users table
        const { data, error } = await supabase
          .from('admin_users')
          .select('id')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error checking admin status:', error);
          // Don't grant admin access on error
          setIsAdmin(false);
        } else {
          setIsAdmin(!!data);
        }
      } catch (error) {
        console.error('Exception checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  return { isAdmin, loading };
};