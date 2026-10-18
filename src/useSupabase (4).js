import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ✅ ใช้ค่า hardcoded โดยตรง (browser environment ไม่มี process object)
const SUPABASE_URL = "https://cknldqbyybbcmmqqtohm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrbmxkcWJ5eWJiY21tcXF0b2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMTM0OTMsImV4cCI6MjA5ODU4OTQ5M30.qu60yuQEVJ03_Xo00SulxXFFYzxN1ITbLVQIeBGsWbs";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ✅ ความสัมพันธ์ Oshi / Kami-Oshi / Star (ตาราง user_relations)
// type: "oshi" | "kami_oshi" | "star"
export const fetchRelations = async () => {
  const { data, error } = await supabase
    .from("user_relations")
    .select("user_id, target_id, type, created_at");
  if (error) {
    console.error("❌ fetchRelations:", error);
    return [];
  }
  return data || [];
};

export const addRelation = async (userId, targetId, type) => {
  const { error } = await supabase
    .from("user_relations")
    .insert([{ user_id: userId, target_id: targetId, type }]);
  if (error) throw error;
};

export const removeRelation = async (userId, targetId, type) => {
  const { error } = await supabase
    .from("user_relations")
    .delete()
    .eq("user_id", userId)
    .eq("target_id", targetId)
    .eq("type", type);
  if (error) throw error;
};

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

// ✅ ดึงข้อมูล posts ด้วย pagination (⭐ แก้ไขแล้ว)
const fetchPostsWithPagination = async (limit = 20, offset = 0) => {
  try {
    const { data, error: err } = await supabase
      .from("posts")
      .select("id,author_id,caption,images,type,poll,likes,comments,created_at,updated_at", { count: 'exact' })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);  // ✅ ใช้ range แทน limit

    if (err) {
      console.error("Error fetching posts:", err);
      return { posts: [], hasMore: false };
    }

    // แปลง snake_case กลับไปเป็น camelCase
    const posts = (data || []).map(p => ({
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

    return { posts, hasMore: posts.length === limit };
  } catch (err) {
    console.error("Fetch posts error:", err);
    return { posts: [], hasMore: false };
  }
};

// ✅ ดึง posts ครั้งแรก (จำนวนน้อย)
const fetchInitialPosts = async () => {
  try {
    const { data, error: err } = await supabase
      .from("posts")
      .select("id,author_id,caption,images,type,poll,likes,comments,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(30);  // ✅ ลดจาก 100 เป็น 30

    if (err) {
      console.error("Error fetching posts:", err);
      return [];
    }

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

// ✅ Hook ดึง posts ทั้งหมด + Real-time listener (⭐ แก้ไขเพื่อไม่ให้ดึงซ้ำ)
export const useRealtimePosts = (onUpdate) => {
  useEffect(() => {
    // ✅ Safety check: ถ้า onUpdate ไม่ได้ส่งเข้ามา ให้ return
    if (!onUpdate || typeof onUpdate !== "function") {
      console.warn("useRealtimePosts: onUpdate is not a function");
      return;
    }

    let isMounted = true;

    // ดึงข้อมูล posts ครั้งแรก
    fetchInitialPosts().then((initialPosts) => {
      if (isMounted) {
        onUpdate(initialPosts);
      }
    });

    // ✅ ตั้ง Real-time listener สำหรับ posts table
    // เมื่อมีการเปลี่ยนแปลง ให้อัปเดตเฉพาะ post ที่เปลี่ยนแปลง (ไม่ดึงทั้งหมดใหม่)
    const channel = supabase
      .channel("posts-table-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
        },
        (payload) => {
          if (!isMounted) return;
          
          console.log("🔄 Post updated:", payload);
          
          // ส่ง payload ให้ component จัดการ (ไม่ดึงทั้งหมด)
          onUpdate((prev) => {
            if (payload.eventType === "INSERT") {
              const newPost = {
                id: payload.new.id,
                authorId: payload.new.author_id,
                caption: payload.new.caption,
                images: payload.new.images || [],
                type: payload.new.type || "image",
                poll: payload.new.poll,
                likes: payload.new.likes || 0,
                comments: payload.new.comments || [],
                createdAt: new Date(payload.new.created_at).getTime(),
                updatedAt: new Date(payload.new.updated_at).getTime(),
              };
              return [newPost, ...prev];
            }
            
            if (payload.eventType === "DELETE") {
              return prev.filter(p => p.id !== payload.old.id);
            }
            
            if (payload.eventType === "UPDATE") {
              return prev.map(p => 
                p.id === payload.new.id 
                  ? {
                      id: payload.new.id,
                      authorId: payload.new.author_id,
                      caption: payload.new.caption,
                      images: payload.new.images || [],
                      type: payload.new.type || "image",
                      poll: payload.new.poll,
                      likes: payload.new.likes || 0,
                      comments: payload.new.comments || [],
                      createdAt: new Date(payload.new.created_at).getTime(),
                      updatedAt: new Date(payload.new.updated_at).getTime(),
                    }
                  : p
              );
            }
            
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [onUpdate]);
};

export const useSupabaseAuth = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // ✅ true เมื่อผู้ใช้เปิดลิงก์ "รีเซ็ตรหัสผ่าน" จากอีเมล (ต้องให้ตั้งรหัสใหม่ก่อนเข้าแอป)
  const [isRecovery, setIsRecovery] = useState(() => {
    if (typeof window === "undefined") return false;
    return /type=recovery/.test(window.location.hash) || /type=recovery/.test(window.location.search);
  });

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        setCurrentUser(session?.user || null);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (isMounted) {
        if (event === "PASSWORD_RECOVERY") setIsRecovery(true);
        setCurrentUser(session?.user || null);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
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

  // ✅ ส่งอีเมลลิงก์รีเซ็ตรหัสผ่าน
  const requestPasswordReset = async (email) => {
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    if (resetError) throw resetError;
  };

  // ✅ ตั้งรหัสผ่านใหม่ (ใช้ได้หลังเปิดลิงก์จากอีเมล)
  const updatePassword = async (newPassword) => {
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) throw updateError;
  };

  const clearRecovery = () => {
    setIsRecovery(false);
    // ล้าง token ออกจาก URL
    try { window.history.replaceState(null, "", window.location.pathname); } catch {}
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

  // ✅ ดึงข้อมูลผู้ใช้ทั้งหมด (⭐ ลดจำนวนเฉพาะคอลัมน์ที่ต้องการ)
  const fetchAllUsers = async () => {
    try {
      let { data, error: err } = await supabase
        .from("users")
        .select("*")
        .order("createdAt", { ascending: false })
        .limit(1000);

      if (err) {
        console.error("❌ fetchAllUsers (with order) failed:", err.message, err);
        // ลองใหม่โดยไม่เรียงลำดับ เผื่อปัญหามาจากชื่อคอลัมน์
        const retry = await supabase.from("users").select("*").limit(1000);
        data = retry.data;
        if (retry.error) {
          console.error("❌ fetchAllUsers (retry) failed:", retry.error.message, retry.error);
          return [];
        }
      }

      console.log("✅ fetchAllUsers loaded rows:", (data || []).length);
      return data || [];
    } catch (err) {
      console.error("Fetch users error:", err);
      return [];
    }
  };

  // ✅ Hook สำหรับ Real-time listener ของทั้งตาราง users (⭐ แก้ไข)
  const useRealtimeUsers = (onUpdate) => {
    // ✅ เก็บ callback ไว้ใน ref เพื่อไม่ให้ effect รันใหม่ทุกครั้งที่ App render
    // (เดิม effect ผูกกับ onUpdate ซึ่งเปลี่ยนทุก render → ดึงข้อมูล + subscribe ซ้ำไม่หยุด)
    const cbRef = useRef(onUpdate);
    cbRef.current = onUpdate;

    useEffect(() => {
      let isMounted = true;
      let rows = [];
      const emit = () => {
        if (isMounted && typeof cbRef.current === "function") cbRef.current(rows);
      };

      fetchAllUsers().then((initialUsers) => {
        rows = initialUsers;
        emit();
      });

      const channel = supabase
        .channel("user-table-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "users" },
          (payload) => {
            if (payload.eventType === "INSERT") {
              rows = [payload.new, ...rows.filter((u) => u.uid !== payload.new.uid)];
            } else if (payload.eventType === "DELETE") {
              rows = rows.filter((u) => u.uid !== payload.old.uid);
            } else if (payload.eventType === "UPDATE") {
              rows = rows.map((u) => (u.uid === payload.new.uid ? payload.new : u));
            }
            emit();
          }
        )
        .subscribe();

      return () => {
        isMounted = false;
        supabase.removeChannel(channel);
      };
    }, []);
  };

  // ✅ Hook ดึง user profile จาก users table + Real-time listener
  const useUserProfile = (uid) => {
    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);

    useEffect(() => {
      let isMounted = true;

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

          if (isMounted) {
            if (err) {
              console.error("Error loading profile:", err);
              setProfile(null);
            } else {
              setProfile(data);
            }
            setProfileLoading(false);
          }
        } catch (err) {
          if (isMounted) {
            console.error("Profile load error:", err);
            setProfile(null);
            setProfileLoading(false);
          }
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
            if (!isMounted) return;

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
        isMounted = false;
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
    isRecovery,
    clearRecovery,
    requestPasswordReset,
    updatePassword,
    uploadProfileImage, 
    useUserProfile,
    fetchAllUsers,
    useRealtimeUsers,
    fetchPostsWithPagination,  // ✅ export สำหรับ pagination
  };
};

/* =========================================================
   ระบบการ์ด (คอลเลกชัน + การ์ด) — จัดการได้เฉพาะ role = 'admin'
   ตาราง: card_collections, cards   |   Storage bucket: card-images
   (ดูไฟล์ card_system.sql สำหรับสร้างตาราง/สิทธิ์)
========================================================= */
const CARD_BUCKET = "card-images";

// อัปโหลดรูปการ์ด/รูปหน้าซอง แล้วคืน public URL
export const uploadCardImage = async (file, folder) => {
  if (!file) throw new Error("ไม่พบไฟล์รูปภาพ");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from(CARD_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  return supabase.storage.from(CARD_BUCKET).getPublicUrl(path).data.publicUrl;
};

// ดึงทุกคอลเลกชันพร้อมการ์ดข้างใน
export const fetchCollections = async () => {
  const { data, error } = await supabase
    .from("card_collections")
    .select("*, cards(*)")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("❌ fetchCollections:", error);
    return [];
  }
  return (data || []).map((c) => ({
    ...c,
    cards: (c.cards || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
  }));
};

export const createCollection = async ({ name, description = "" }) => {
  const { data, error } = await supabase
    .from("card_collections")
    .insert([{ name, description }])
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateCollection = async (id, patch) => {
  const { error } = await supabase.from("card_collections").update(patch).eq("id", id);
  if (error) throw error;
};

// ลบคอลเลกชัน (การ์ดข้างในถูกลบตามอัตโนมัติ)
export const deleteCollection = async (id) => {
  const { error } = await supabase.from("card_collections").delete().eq("id", id);
  if (error) throw error;
};

// เพิ่มการ์ดหลายใบพร้อมกัน: rows = [{ collection_id, name, image_url, rarity }]
export const addCards = async (rows) => {
  const { error } = await supabase.from("cards").insert(rows);
  if (error) throw error;
};

export const updateCard = async (id, patch) => {
  const { error } = await supabase.from("cards").update(patch).eq("id", id);
  if (error) throw error;
};

export const deleteCard = async (id) => {
  const { error } = await supabase.from("cards").delete().eq("id", id);
  if (error) throw error;
};

/* =========================================================
   การ์ดที่ผู้ใช้ครอบครอง (ตาราง user_cards) — ดู user_cards.sql
========================================================= */

// ดึงการ์ดที่ผู้ใช้ได้มาแล้ว → [{ card_id, count, created_at }]
export const fetchMyCards = async (userId) => {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("user_cards")
    .select("card_id, count, created_at")
    .eq("user_id", userId);
  if (error) {
    console.error("❌ fetchMyCards:", error);
    return [];
  }
  return data || [];
};

// บันทึกการ์ดที่สุ่มได้ (ถ้ามีอยู่แล้วเพิ่ม count +1)
export const addOwnedCard = async (userId, cardId) => {
  const { data: existing, error: selErr } = await supabase
    .from("user_cards")
    .select("count")
    .eq("user_id", userId)
    .eq("card_id", cardId)
    .maybeSingle();
  if (selErr) throw selErr;

  if (existing) {
    const { error } = await supabase
      .from("user_cards")
      .update({ count: (existing.count || 1) + 1 })
      .eq("user_id", userId)
      .eq("card_id", cardId);
    if (error) throw error;
    return { isNew: false, count: (existing.count || 1) + 1 };
  }
  const { error } = await supabase
    .from("user_cards")
    .insert([{ user_id: userId, card_id: cardId, count: 1 }]);
  if (error) throw error;
  return { isNew: true, count: 1 };
};


/* =========================================================
   Star: ใช้ซื้อซองการ์ด (หักจาก users.stars)
========================================================= */
const changeStars = async (userId, delta) => {
  const { data, error } = await supabase.from("users").select("stars").eq("uid", userId).single();
  if (error) throw error;
  const cur = data?.stars || 0;
  const next = cur + delta;
  if (next < 0) {
    const e = new Error("Star ไม่พอ");
    e.code = "INSUFFICIENT_STARS";
    throw e;
  }
  // กันกดซ้ำพร้อมกัน: อัปเดตเฉพาะเมื่อ stars ยังเท่าที่อ่านมา
  const { data: upd, error: upErr } = await supabase
    .from("users")
    .update({ stars: next })
    .eq("uid", userId)
    .eq("stars", cur)
    .select("stars");
  if (upErr) throw upErr;
  if (!upd || upd.length === 0) throw new Error("ยอด Star เปลี่ยนระหว่างทำรายการ ลองใหม่อีกครั้ง");
  return next;
};

// หัก Star → คืนยอดคงเหลือ (throw code INSUFFICIENT_STARS ถ้าไม่พอ)
export const spendStars = (userId, amount) => changeStars(userId, -Math.abs(amount));
// คืน Star (กรณีซื้อแล้วสุ่มไม่สำเร็จ)
export const refundStars = (userId, amount) => changeStars(userId, Math.abs(amount));
