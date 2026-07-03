import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://cknldqbyybbcmmqqtohm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrbmxkcWJ5eWJiY21tcXF0b2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMTM0OTMsImV4cCI6MjA5ODU4OTQ5M30.qu60yuQEVJ03_Xo00SulxXFFYzxN1ITbLVQIeBGsWbs";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const useSupabaseAuth = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user || null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUser(session?.user || null);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const register = async (email, password, memberId, memberName) => {
    try {
      setError(null);
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) throw signUpError;

      await supabase.from("users").insert([{
        uid: data.user.id,
        email,
        memberId: memberId.trim(),
        memberName: memberName.trim() || memberId.trim(),
        displayName: memberName.trim() || memberId.trim(),
        role: "fan",
        unit: "",
        gen: "",
        avatar: null,
        cover: null,
        memberIdUpdatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }]);

      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await supabase.auth.signOut();
      setCurrentUser(null);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return { currentUser, loading, error, register, login, logout };
};