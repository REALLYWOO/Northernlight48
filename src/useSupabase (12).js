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

// ✅ ไลก์ / คอมเมนต์ / โหวต — บันทึกจริงผ่านฟังก์ชันใน post_interactions.sql
export const toggleLikeDb = async (postId) => {
  const { data, error } = await supabase.rpc("toggle_post_like", { p_post_id: String(postId) });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { liked: !!row?.liked, count: row?.like_count ?? 0 };
};

export const addCommentDb = async (postId, text, parentId = null) => {
  const { data, error } = await supabase.rpc("add_post_comment", { p_post_id: String(postId), p_text: text, p_parent_id: parentId ? String(parentId) : null });
  if (error) throw error;
  return data; // { id, parentId?, author, authorId, text, createdAt }
};

// ลบคอมเมนต์ (เจ้าของคอมเมนต์ / เจ้าของโพสต์ / แอดมิน) — ลบคำตอบกลับของคอมเมนต์นั้นด้วย
export const deleteCommentDb = async (postId, commentId) => {
  const { data, error } = await supabase.rpc("delete_post_comment", { p_post_id: String(postId), p_comment_id: String(commentId) });
  if (error) throw error;
  return data; // comments ที่เหลือ
};

// รายชื่อคนที่กดไลก์โพสต์ (ล่าสุดก่อน)
export const fetchPostLikersDb = async (postId) => {
  const { data, error } = await supabase.rpc("post_likers", { p_post_id: String(postId) });
  if (error) throw error;
  return (data || []).map((r) => r.user_id);
};

export const votePollDb = async (postId, label) => {
  const { data, error } = await supabase.rpc("vote_poll", { p_post_id: String(postId), p_label: label });
  if (error) throw error;
  return data; // poll ที่อัปเดตแล้ว
};

// ดึงโพสต์เดียวตาม id (เปิดจากแจ้งเตือนที่โพสต์ไม่อยู่ในฟีด 15 โพสต์ล่าสุด)
export const fetchPostById = async (id) => {
  const { data, error } = await supabase
    .from("posts")
    .select("id,author_id,caption,images,type,poll,likes,comments,created_at,updated_at,edited_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    authorId: data.author_id,
    caption: data.caption,
    images: data.images || [],
    type: data.type || "image",
    poll: data.poll,
    likes: data.likes || 0,
    comments: data.comments || [],
    createdAt: new Date(data.created_at).getTime(),
    updatedAt: new Date(data.updated_at).getTime(),
    editedAt: data.edited_at ? new Date(data.edited_at).getTime() : null,
  };
};

// โพสต์ที่มี #แฮชแท็ก (ค้นจากแคปชันและคำถามโพล) — ล่าสุดก่อน
const rowToPost = (data) => ({
  id: data.id,
  authorId: data.author_id,
  caption: data.caption,
  images: data.images || [],
  type: data.type || "image",
  poll: data.poll,
  likes: data.likes || 0,
  comments: data.comments || [],
  createdAt: new Date(data.created_at).getTime(),
  updatedAt: new Date(data.updated_at).getTime(),
  editedAt: data.edited_at ? new Date(data.edited_at).getTime() : null,
});

export const fetchPostsByHashtag = async (tag, limit = 30) => {
  const esc = String(tag || "").replace(/[\\%_,()]/g, (c) => "\\" + c);
  if (!esc) return [];
  const { data, error } = await supabase
    .from("posts")
    .select("id,author_id,caption,images,type,poll,likes,comments,created_at,updated_at,edited_at")
    .or(`caption.ilike.%#${esc}%,poll->>question.ilike.%#${esc}%`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("❌ fetchPostsByHashtag:", error);
    return [];
  }
  return (data || []).map(rowToPost);
};

// ===== แจ้งเตือนการถูกแท็ก (@) =====
export const notifyMentionsDb = async (postId, userIds, snippet, kind = "post") => {
  if (!userIds || userIds.length === 0) return;
  const { error } = await supabase.rpc("notify_mentions", {
    p_post_id: String(postId), p_user_ids: userIds, p_snippet: String(snippet || "").slice(0, 120), p_kind: kind,
  });
  if (error) console.error("❌ notifyMentions:", error);
};

export const fetchNotifications = async (userId) => {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("id, actor_id, type, post_id, snippet, read, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    console.error("❌ fetchNotifications:", error);
    return [];
  }
  return data || [];
};

export const markNotificationsRead = async (userId) => {
  if (!userId) return;
  const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
  if (error) console.error("❌ markNotificationsRead:", error);
};

// Top Fans ของเมมเบอร์: แฟนที่ส่ง Starry ให้มากที่สุด → [{ user_id, total }]
export const fetchTopFansDb = async (targetId, limit = 10) => {
  if (!targetId) return [];
  const { data, error } = await supabase.rpc("top_fans", { p_target: targetId, p_limit: limit });
  if (error) {
    console.error("❌ fetchTopFans:", error);
    return [];
  }
  return data || [];
};

// โพสต์ที่ฉันไลก์ไว้ + โพลที่ฉันโหวตไว้ (โหลดครั้งเดียวตอนเข้าแอป)
export const fetchMyPostActions = async (userId) => {
  if (!userId) return { liked: [], votes: {} };
  const [l, v] = await Promise.all([
    supabase.from("post_likes").select("post_id").eq("user_id", userId),
    supabase.from("poll_votes").select("post_id, label").eq("user_id", userId),
  ]);
  const votes = {};
  (v.data || []).forEach((r) => { votes[r.post_id] = r.label; });
  return { liked: (l.data || []).map((r) => r.post_id), votes };
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
      editedAt: p.edited_at ? new Date(p.edited_at).getTime() : null,
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
    if (updates.editedAt !== undefined) updateData.edited_at = updates.editedAt;

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
      editedAt: p.edited_at ? new Date(p.edited_at).getTime() : null,
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
      .select("id,author_id,caption,images,type,poll,likes,comments,created_at,updated_at,edited_at", { count: 'exact' })
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
      editedAt: p.edited_at ? new Date(p.edited_at).getTime() : null,
    }));

    return { posts, hasMore: posts.length === limit };
  } catch (err) {
    console.error("Fetch posts error:", err);
    return { posts: [], hasMore: false };
  }
};

// ✅ ดึง posts ครั้งแรก (จำนวนน้อย)
export const fetchInitialPosts = async () => {
  try {
    const { data, error: err } = await supabase
      .from("posts")
      .select("id,author_id,caption,images,type,poll,likes,comments,created_at,updated_at,edited_at")
      .order("created_at", { ascending: false })
      .limit(15);  // ✅ ลดจาก 100 เป็น 30

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
      editedAt: p.edited_at ? new Date(p.edited_at).getTime() : null,
    }));
  } catch (err) {
    console.error("Fetch posts error:", err);
    return [];
  }
};

// ✅ Hook ดึง posts ทั้งหมด + Real-time listener (⭐ แก้ไขเพื่อไม่ให้ดึงซ้ำ)
export const useRealtimePosts = (onUpdate) => {
  // ✅ เก็บ callback ไว้ใน ref — เดิม effect ผูกกับ [onUpdate] ซึ่งเป็นฟังก์ชันใหม่ทุกครั้งที่ App render
  // ทำให้ทุก render ดึง posts ใหม่ + subscribe ใหม่ (เป็นสาเหตุหลักของ PostgREST egress บวม)
  const cbRef = useRef(onUpdate);
  cbRef.current = onUpdate;

  useEffect(() => {
    let isMounted = true;
    const emit = (arg) => {
      if (isMounted && typeof cbRef.current === "function") cbRef.current(arg);
    };

    // ดึงข้อมูล posts ครั้งแรก
    fetchInitialPosts().then((initialPosts) => {
      emit(initialPosts);
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
          // ส่ง payload ให้ component จัดการ (ไม่ดึงทั้งหมด)
          emit((prev) => {
            const n = payload.new;
            const mapNew = (old) => ({
              id: n.id,
              authorId: "author_id" in n ? n.author_id : old?.authorId,
              caption: "caption" in n ? n.caption : old?.caption,
              // คอลัมน์ใหญ่ (รูป ฯลฯ) ที่ไม่เปลี่ยนจะไม่ถูกส่งมา → ใช้ค่าเดิม ไม่ให้รูปหาย
              images: "images" in n ? (n.images || []) : (old?.images || []),
              type: "type" in n ? (n.type || "image") : (old?.type || "image"),
              poll: "poll" in n ? n.poll : old?.poll,
              likes: "likes" in n ? (n.likes || 0) : (old?.likes || 0),
              comments: "comments" in n ? (n.comments || []) : (old?.comments || []),
              createdAt: "created_at" in n ? new Date(n.created_at).getTime() : old?.createdAt,
              updatedAt: "updated_at" in n ? new Date(n.updated_at).getTime() : old?.updatedAt,
              editedAt: "edited_at" in n ? (n.edited_at ? new Date(n.edited_at).getTime() : null) : old?.editedAt,
            });

            if (payload.eventType === "INSERT") {
              const exists = prev.find((p) => p.id === n.id);
              return exists ? prev.map((p) => (p.id === n.id ? mapNew(p) : p)) : [mapNew(null), ...prev];
            }
            if (payload.eventType === "DELETE") {
              return prev.filter((p) => p.id !== payload.old.id);
            }
            if (payload.eventType === "UPDATE") {
              return prev.map((p) => (p.id === n.id ? mapNew(p) : p));
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
  }, []);
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
      // avatar -> 512px, cover -> 1280px
      const { blob, ext, type } = await compressImageFile(file, {
        maxSide: fieldType === "avatar" ? 512 : 1280,
        quality: 0.8,
      });
      const fileName = `${fieldType}-${Date.now()}.${ext}`;
      const filePath = `${userId}/${fileName}`;

      // file names are unique -> safe to cache for 1 year
      const { data, error: uploadError } = await supabase.storage
        .from("profile-images")
        .upload(filePath, blob, {
          cacheControl: "31536000",
          contentType: type,
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
    const refreshRef = useRef(null);

    useEffect(() => {
      let isMounted = true;
      let rows = [];
      const emit = () => {
        if (isMounted && typeof cbRef.current === "function") cbRef.current(rows);
      };
      // ใช้ตอน pull-to-refresh: โหลดรายชื่อใหม่ทั้งหมดแล้วส่งให้ App
      refreshRef.current = async () => {
        rows = await fetchAllUsers();
        emit();
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
        refreshRef.current = null;
        supabase.removeChannel(channel);
      };
    }, []);

    return () => (refreshRef.current ? refreshRef.current() : Promise.resolve());
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
  const { blob, ext, type } = await compressImageFile(file, { maxSide: 900, quality: 0.82 });
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from(CARD_BUCKET)
    .upload(path, blob, { cacheControl: "31536000", contentType: type, upsert: false });
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


/* =========================================================
   Redeem Code: แลกโค้ดรับ Star (ผ่านฟังก์ชัน redeem_code ใน redeem_codes.sql)
========================================================= */
const REDEEM_ERRORS = {
  INVALID_CODE: "ไม่พบโค้ดนี้",
  CODE_INACTIVE: "โค้ดนี้ปิดใช้งานแล้ว",
  CODE_EXPIRED: "โค้ดนี้หมดอายุแล้ว",
  CODE_USED_UP: "โค้ดนี้ถูกใช้ครบจำนวนแล้ว",
  ALREADY_REDEEMED: "คุณใช้โค้ดนี้ไปแล้ว",
  NOT_LOGGED_IN: "กรุณาเข้าสู่ระบบก่อน",
};

// คืน { stars: จำนวนที่ได้, balance: ยอด Star คงเหลือ } หรือ throw Error(ข้อความภาษาไทย)
export const redeemCode = async (code) => {
  const { data, error } = await supabase.rpc("redeem_code", { p_code: String(code || "").trim() });
  if (error) {
    const key = Object.keys(REDEEM_ERRORS).find((k) => (error.message || "").includes(k));
    if (key) throw new Error(REDEEM_ERRORS[key]);
    console.error("redeemCode:", error);
    throw new Error(`แลกโค้ดไม่สำเร็จ: ${error.message || error.code || "unknown error"}`);
  }
  const row = Array.isArray(data) ? data[0] : data;
  return { stars: row?.stars_added || 0, balance: row?.new_balance || 0 };
};


/* =========================================================
   สตอรี่ (ตาราง stories + bucket story-images) — ดู stories.sql
   ประหยัด Egress: รูปอยู่ใน Storage (cache 1 ปี) ตารางเก็บแค่ URL, ดึงเฉพาะคอลัมน์ที่ใช้
========================================================= */
const STORY_BUCKET = "story-images";
export const MAX_ACTIVE_STORIES = 10; // ต่อคน

// ดึงสตอรี่ที่ยังไม่หมดอายุ (เก่า → ใหม่) → [{ id, authorId, image, createdAt, expiresAt, path }]
export const fetchActiveStories = async () => {
  const { data, error } = await supabase
    .from("stories")
    .select("id, user_id, image_url, storage_path, created_at, expires_at, like_count")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) {
    console.error("❌ fetchActiveStories:", error);
    return null; // null = ดึงไม่สำเร็จ (ให้คงของเดิมไว้ ไม่ล้างฟีด)
  }
  return (data || []).map((r) => ({
    id: r.id,
    authorId: r.user_id,
    image: r.image_url,
    path: r.storage_path,
    createdAt: new Date(r.created_at).getTime(),
    expiresAt: new Date(r.expires_at).getTime(),
    likeCount: r.like_count || 0,
  }));
};

// อัปโหลดรูป (บีบอัดก่อน 1080px) + บันทึกแถว → คืนสตอรี่ที่สร้าง
export const createStoryDb = async (file, userId) => {
  if (!file || !userId) throw new Error("ไม่พบไฟล์หรือผู้ใช้");
  const { blob, ext, type } = await compressImageFile(file, { maxSide: 1080, quality: 0.8 });
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(STORY_BUCKET)
    .upload(path, blob, { cacheControl: "31536000", contentType: type, upsert: false });
  if (upErr) throw upErr;
  const image_url = supabase.storage.from(STORY_BUCKET).getPublicUrl(path).data.publicUrl;

  const { data, error } = await supabase
    .from("stories")
    .insert([{ user_id: userId, image_url, storage_path: path }])
    .select("id, user_id, image_url, storage_path, created_at, expires_at, like_count")
    .single();
  if (error) {
    // แถวไม่ถูกสร้าง → ลบไฟล์ที่เพิ่งอัปโหลดทิ้ง ไม่ให้ค้างใน Storage
    await supabase.storage.from(STORY_BUCKET).remove([path]);
    throw error;
  }
  return {
    id: data.id,
    authorId: data.user_id,
    image: data.image_url,
    path: data.storage_path,
    createdAt: new Date(data.created_at).getTime(),
    expiresAt: new Date(data.expires_at).getTime(),
    likeCount: data.like_count || 0,
  };
};

// ไลก์/เลิกไลก์สตอรี่ → { liked, count }
export const toggleStoryLikeDb = async (storyId) => {
  const { data, error } = await supabase.rpc("toggle_story_like", { p_story_id: storyId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { liked: !!row?.liked, count: row?.cnt ?? 0 };
};

// id สตอรี่ที่ฉันไลก์ไว้ (RLS ให้เห็นเฉพาะของตัวเอง)
export const fetchMyStoryLikes = async (userId) => {
  if (!userId) return [];
  const { data, error } = await supabase.from("story_likes").select("story_id").eq("user_id", userId).limit(500);
  if (error) { console.error("❌ fetchMyStoryLikes:", error); return []; }
  return (data || []).map((r) => r.story_id);
};

// ลบสตอรี่ (ทั้งแถวและไฟล์รูป)
export const deleteStoryDb = async (story) => {
  const { error } = await supabase.from("stories").delete().eq("id", story.id);
  if (error) throw error;
  if (story.path) {
    const { error: rmErr } = await supabase.storage.from(STORY_BUCKET).remove([story.path]);
    if (rmErr) console.error("❌ remove story file:", rmErr);
  }
};

// ล้างสตอรี่ที่หมดอายุของตัวเอง (ทั้งแถวและไฟล์) — เรียกตอนเข้าแอป ไม่ต้องใช้ cron
export const cleanupMyExpiredStories = async (userId) => {
  if (!userId) return;
  const { data, error } = await supabase
    .from("stories")
    .select("id, storage_path")
    .eq("user_id", userId)
    .lte("expires_at", new Date().toISOString())
    .limit(50);
  if (error || !data || data.length === 0) return;
  const paths = data.map((r) => r.storage_path).filter(Boolean);
  if (paths.length) await supabase.storage.from(STORY_BUCKET).remove(paths);
  await supabase.from("stories").delete().in("id", data.map((r) => r.id));
};


/* =========================================================
   Compress images before uploading to Storage (reduces egress)
   Returns { blob, ext, type } - falls back to the original file for GIF/SVG or on failure
========================================================= */
export const compressImageFile = async (file, { maxSide = 1280, quality = 0.8 } = {}) => {
  const fallback = { blob: file, ext: (file.name?.split(".").pop() || "jpg").toLowerCase(), type: file.type };
  if (!file || !file.type || !file.type.startsWith("image/") || /gif|svg/.test(file.type)) return fallback;
  try {
    const objUrl = URL.createObjectURL(file);
    const img = await new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = objUrl;
    });
    URL.revokeObjectURL(objUrl);
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
    const toBlob = (type) => new Promise((res) => canvas.toBlob(res, type, quality));
    let blob = await toBlob("image/webp"); // keeps transparency, smaller than JPEG
    if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg"); // Safari cannot encode webp
    if (!blob) return fallback;
    if (blob.size >= file.size) return fallback; // already small
    return { blob, ext: blob.type === "image/webp" ? "webp" : "jpg", type: blob.type };
  } catch (e) {
    return fallback;
  }
};
