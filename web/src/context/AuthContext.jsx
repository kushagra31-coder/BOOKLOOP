import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [privateProfile, setPrivateProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      setPrivateProfile(null);
      setIsAdmin(false);
      return;
    }

    try {
      // 1. Fetch public profile with institution details
      const { data: profData, error: profErr } = await supabase
        .from('profiles')
        .select('*, institution:institutions(*)')
        .eq('id', userId)
        .maybeSingle();

      if (!profErr && profData) {
        setProfile(profData);
      }

      // 2. Fetch private profile (whatsapp_number, account_status)
      const { data: privData, error: privErr } = await supabase
        .from('profile_private')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!privErr && privData) {
        setPrivateProfile(privData);
      }

      // 3. Check admin roles
      const { data: adminData } = await supabase
        .from('admin_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      setIsAdmin(Boolean(adminData && (adminData.role === 'admin' || adminData.role === 'moderator')));
    } catch (err) {
      console.error('[AuthContext] Error fetching user data:', err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchUserData(user.id);
    }
  }, [user?.id, fetchUserData]);

  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          await fetchUserData(initialSession.user.id);
        }
      } catch (err) {
        console.error('[AuthContext] Session init error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;

      setSession(newSession);
      const newUser = newSession?.user ?? null;
      setUser(newUser);

      if (newUser) {
        await fetchUserData(newUser.id);
      } else {
        setProfile(null);
        setPrivateProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchUserData]);

  const signIn = async ({ email, password }) => {
    return supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
  };

  const signUp = async ({ email, password, options }) => {
    return supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options,
    });
  };

  const signOut = async () => {
    setProfile(null);
    setPrivateProfile(null);
    setIsAdmin(false);
    return supabase.auth.signOut();
  };

  const value = {
    session,
    user,
    profile,
    privateProfile,
    isAdmin,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
