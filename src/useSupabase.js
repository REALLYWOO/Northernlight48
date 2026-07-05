import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://cknldqbyybbcmmqqtohm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrbmxkcWJ5eWJiY21tcXF0b2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMTM0OTMsImV4cCI6MjA5ODU4OTQ5M30.qu60yuQEVJ03_Xo00SulxXFFYzxN1ITbLVQIeBGsWbs";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ✅ บันทึก post ลงฐานข้อมูล
export const savePost = async (post) => {
  try {
    // แปลง camelCase ไปเป็น snake_case สำหรับ Supabase
    const postData = {
      author_id: post.authorId,
      caption: post.caption,
      images: post.images || [],
      type: post.type || "image",
      poll: post.poll || null,
      likes: post.likes || 0,
      comments: post.comments || [],
    };

    const { data, error: saveError } = await supabase
      .from("posts")
      .insert([postData])
      .select();

    if (saveError) throw saveError;
    
    // แปลง snake_case กลับไปเป็น camelCase สำหรับ frontend
    return data?.map(p => ({
      id: p.id,
      authorId: p.author_id,
      caption: p.caption,
      images: p.images,
      type: p.type,
      poll: p.poll,
      likes: p.likes,
      comments: p.comments,
      createdAt: new Date(p.created_at).getTime(),
      updatedAt: new Date(p.updated_at).getTime(),
    }))?.[0];
  } catch (err) {
    console.error("Error saving post:", err);
    throw err;
  }
};

// ✅ ลบ post จากฐานข้อมูล
export const deletePostFromDb = async (postId) => {
  try {
    const { error: deleteError } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId);

    if (deleteError) throw deleteError;
  } catch (err) {
    console.error("Error deleting post:", err);
    throw err;
  }
};

// ✅ อัปเดต post ในฐานข้อมูล
export const updatePost = async (postId, updates) => {
  try {
    // แปลง camelCase ไปเป็น snake_case
    const updateData = {};
    if (updates.authorId !== undefined) updateData.author_id = updates.authorId;
    if (updates.caption !== undefined) updateData.caption = updates.caption;
    if (updates.images !== undefined) updateData.images = updates.images;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.poll !== undefined) updateData.poll = updates.poll;
    if (updates.likes !== undefined) updateData.likes = updates.likes;
    if (updates.comments !== undefined) updateData.comments = updates.comments;

    const { data, error: updateError } = await supabase
      .from("posts")
      .update(updateData)
      .eq("id", postId)
      .select();

    if (updateError) throw updateError;
    
    // แปลง snake_case กลับไปเป็น camelCase
    return data?.map(p => ({
      id: p.id,
      authorId: p.author_id,
      caption: p.caption,
      images: p.images,
      type: p.type,
      poll: p.poll,
      likes: p.likes,
      comments: p.comments,
      createdAt: new Date(p.created_at).getTime(),
      updatedAt: new Date(p.updated_at).getTime(),
    }));
  } catch (err) {
    console.error("Error updating post:", err);
    throw err;
  }
};

// ✅ ดึงข้อมูล posts ทั้งหมด
const fetchAllPosts = async () => {
  try {
    const { data, error: err } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (err) {
      console.error("Error fetching posts:", err);
      return [];
    }

    // แปลง snake_case กลับไปเป็น camelCase
    return (data || []).map(p => ({
      id: p.id,
      authorId: p.author_id,
      caption: p.caption,
      images: p.images || [],
      type: p.type || "image",
      poll: p.poll,
      likes: p.likes || 0,
      comments: p.comments || [],
      createdAt: new Date(p.created_at).getTime(),
      updatedAt: new Date(p.updated_at).getTime(),
    }));
  } catch (err) {
    console.error("Fetch posts error:", err);
    return [];
  }
};

// ✅ Hook ดึง posts ทั้งหมด + Real-time listener
export const useRealtimePosts = (onUpdate) => {
  useEffect(() => {
    // ดึงข้อมูล posts ครั้งแรก
    fetchAllPosts().then((initialPosts) => {
      onUpdate(initialPosts);
    });

    // ตั้ง Real-time listener สำหรับ posts table
    const channel = supabase
      .channel("posts-table-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
        },
        async (payload) => {
          console.log("🔄 Posts table updated:", payload);
          // เมื่อมีการเปลี่ยนแปลง ให้ดึงข้อมูลทั้งหมดใหม่
          const updatedPosts = await fetchAllPosts();
          onUpdate(updatedPosts);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate]);
};

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
