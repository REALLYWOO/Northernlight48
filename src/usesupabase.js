import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://cknldqbyybbcmmqqtohm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrbmxkcWJ5eWJiY21tcXF0b2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMTM0OTMsImV4cCI6MjA5ODU4OTQ5M30.qu60yuQEVJ03_Xo00SulxXFFYzxN1ITbLVQIeBGsWbs";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const useSupabaseAuth = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ฟังก์ชัน helper: ดึง full user data จาก users table
  const fetchFullUserData = async (authUser) => {
    if (!authUser) return null;
    try {
      const { data, error: fetchError } = await supabase
        .from("users")
        .select("uid, email, memberId, memberName, displayName, role, unit, gen, avatar, cover")
        .eq("uid", authUser.id)
        .single();
      
      if (fetchError) {
        console.warn("ไม่พบ user data ใน users table:", fetchError);
        return authUser;
      }
      
      return { ...data, id: authUser.id, email: authUser.email };
    } catch (err) {
      console.error("Error fetching user data:", err);
      return authUser;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const fullUserData = await fetchFullUserData(session.user);
        setCurrentUser(fullUserData);
      }
      setLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const fullUserData = await fetchFullUserData(session.user);
        setCurrentUser(fullUserData);
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  const register = async (email, password, memberId, memberName) => {
    try {
      setError(null);
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      // เก็บข้อมูล user ใน users table
      // ใช้ service role เพื่อ bypass RLS
      const { data: userData, error: insertError } = await supabase.from("users").insert([
        {
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
        },
      ]);

      if (insertError) {
        // ถ้า insert fail ให้ลบ auth user
        await supabase.auth.admin.deleteUser(data.user.id);
        throw insertError;
      }

      // return full user data
      const fullUserData = { 
        id: data.user.id, 
        uid: data.user.id,
        email: data.user.email,
        displayName: memberName.trim() || memberId.trim(),
        memberId: memberId.trim(),
        role: "fan",
        unit: "",
        gen: "",
        avatar: null,
        cover: null,
      };
      setCurrentUser(fullUserData);
      return fullUserData;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;
      
      // ดึง full user data จาก users table
      const fullUserData = await fetchFullUserData(data.user);
      setCurrentUser(fullUserData);
      return fullUserData;
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
