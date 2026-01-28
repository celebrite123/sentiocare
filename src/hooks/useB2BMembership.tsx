import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const useB2BMembership = () => {
  const { user } = useAuth();
  const [isB2BStaff, setIsB2BStaff] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkB2BMembership = async () => {
      if (!user) {
        setIsB2BStaff(false);
        setLoading(false);
        return;
      }

      try {
        // Check if user has an organization membership (B2B staff)
        const { data, error } = await supabase
          .from('organization_members')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking B2B membership:', error);
          setIsB2BStaff(false);
        } else {
          setIsB2BStaff(!!data);
        }
      } catch (err) {
        console.error('Error checking B2B membership:', err);
        setIsB2BStaff(false);
      } finally {
        setLoading(false);
      }
    };

    checkB2BMembership();
  }, [user]);

  return { isB2BStaff, loading };
};
