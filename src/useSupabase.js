import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://cknldqbyybbcmmqqtohm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrbmxkcWJ5eWJiY21tcXF0b2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMTM0OTMsImV4cCI6MjA5ODU4OTQ5M30.qu60yuQEVJ03_Xo00SulxXFFYzxN1ITbLVQIeBGsWbs";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
        avatar_url: null,
        cover_url: null,
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

  // ✅ อัพโหลดรูปไปเก็บใน Supabase Storage + ดึง public URL กลับมา
  const uploadProfileImage = async (file, userId, fieldType) => {
    try {
      if (!file || !userId) throw new Error("ไฟล์หรือ userId ไม่ครบ");

      // สร้างชื่อไฟล์: profile-images/[userId]/avatar หรือ cover
      const fileExt = file.name.split(".").pop();
      const fileName = `${fieldType}-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // 1️⃣ อัพโหลดไปเก็บ storage
      const { data, error: uploadError } = await supabase.storage
        .from("profile-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 2️⃣ ดึง public URL กลับมา
      const { data: publicUrl } = supabase.storage
        .from("profile-images")
        .getPublicUrl(filePath);

      return publicUrl.publicUrl;
    } catch (err) {
      console.error(`Error uploading ${fieldType}:`, err);
      throw err;
    }
  };

  // ✅ ดึงข้อมูลผู้ใช้ทั้งหมด
  const fetchAllUsers = async () => {
    try {
      const { data, error: err } = await supabase
        .from("users")
        .select("*")
        .order("createdAt", { ascending: false });

      if (err) {
        console.error("Error fetching users:", err);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error("Fetch users error:", err);
      return [];
    }
  };

  // ✅ Hook สำหรับ Real-time listener ของทั้งตาราง users
  const useRealtimeUsers = (onUpdate) => {
    useEffect(() => {
      // ดึงข้อมูลครั้งแรก
      fetchAllUsers().then((initialUsers) => {
        onUpdate(initialUsers);
      });

      // ตั้ง Real-time listener
      const channel = supabase
        .channel("user-table-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "users",
          },
          async (payload) => {
            console.log("🔄 Users table updated:", payload);
            // เมื่อมีการเปลี่ยนแปลง ให้ดึงข้อมูลทั้งหมดใหม่
            const updatedUsers = await fetchAllUsers();
            onUpdate(updatedUsers);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, [onUpdate]);
  };

  // ✅ Hook ดึง user profile จาก users table + Real-time listener
  const useUserProfile = (uid) => {
    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);

    useEffect(() => {
      if (!uid) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      // โหลด profile ครั้งแรก
      const loadProfile = async () => {
        try {
          const { data, error: err } = await supabase
            .from("users")
            .select("*")
            .eq("uid", uid)
            .single();

          if (err) {
            console.error("Error loading profile:", err);
            setProfile(null);
          } else {
            setProfile(data);
          }
        } catch (err) {
          console.error("Profile load error:", err);
          setProfile(null);
        } finally {
          setProfileLoading(false);
        }
      };

      loadProfile();

      // ✅ Real-time listener ฟังการเปลี่ยนแปลง
      const channel = supabase
        .channel(`user-profile-${uid}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "users",
            filter: `uid=eq.${uid}`,
          },
          (payload) => {
            console.log("🔄 Profile updated:", payload);

            if (payload.eventType === "DELETE") {
              setProfile(null);
              return;
            }

            // ✅ Merge แทนการทับทั้งก้อน
            setProfile((prev) => ({ ...(prev || {}), ...payload.new }));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, [uid]);

    return { profile, profileLoading };
  };

  return { 
    currentUser, 
    loading, 
    error, 
    register, 
    login, 
    logout, 
    uploadProfileImage, 
    useUserProfile,
    fetchAllUsers,
    useRealtimeUsers,
  };
};
