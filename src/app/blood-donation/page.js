"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import {
  Droplets, Plus, Search, ArrowLeft, Trash2, Edit2, X, Phone,
  MapPin, Clock, Package, Heart, Eye, MessageCircle, AlertTriangle,
  CheckCircle2, User, Calendar, ChevronRight, Filter, Flame
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API = "http://localhost:8080/api/blood-donation";
const COMMENTS_API = "http://localhost:8080/api/comments";

const BLOOD_GROUPS = ["All", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const bloodBadge = (bg) => {
  const map = {
    "A+":  "bg-red-500",  "A-":  "bg-red-700",
    "B+":  "bg-blue-500", "B-":  "bg-blue-700",
    "AB+": "bg-purple-500","AB-":"bg-purple-700",
    "O+":  "bg-orange-500","O-": "bg-orange-700",
  };
  return map[bg] || "bg-slate-500";
};

function formatDate(dt) {
  if (!dt) return "—";
  const d = new Date(dt);
  return d.toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" });
}
function formatTime(dt) {
  if (!dt) return "—";
  const d = dt.includes("T") ? new Date(dt) : new Date(dt.replace(" ", "T"));
  return d.toLocaleString("en-BD", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const EMPTY_FORM = {
  bloodGroup: "A+", patientName: "", hospitalName: "", location: "",
  requiredTime: "", requiredBags: 1, contactNumber: "", reason: "", urgent: false,
};

export default function BloodDonationPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [posts, setPosts]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [bgFilter, setBgFilter]   = useState("All");
  const [urgentOnly, setUrgentOnly] = useState(false);

  // modals
  const [showPost, setShowPost]   = useState(false);
  const [editPost, setEditPost]   = useState(null); // hold post being edited
  const [form, setForm]           = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  // current user
  const [currentUser, setCurrentUser] = useState({ fullName: "", email: "" });

  // comment counts per post
  const [commentCounts, setCommentCounts] = useState({});

  // mouse parallax
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { damping: 50, stiffness: 400, mass: 0.5 });
  const smoothY = useSpring(mouseY, { damping: 50, stiffness: 400, mass: 0.5 });

  useEffect(() => {
    setIsMounted(true);
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try { setCurrentUser(JSON.parse(userStr)); } catch {}
    }
    loadPosts();
    const h = (e) => { mouseX.set(e.clientX); mouseY.set(e.clientY); };
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, []);

  async function loadPosts() {
    setLoading(true);
    try {
      const res = await fetch(API);
      if (res.ok) setPosts(await res.json());
    } catch {}
    setLoading(false);
  }

  // Fetch comment counts for visible posts
  useEffect(() => {
    if (!posts.length) return;
    posts.forEach(async (p) => {
      try {
        const res = await fetch(`${COMMENTS_API}/BLOOD_DONATION/${p.id}`);
        if (res.ok) {
          const data = await res.json();
          setCommentCounts(prev => ({ ...prev, [p.id]: data.length }));
        }
      } catch {}
    });
  }, [posts]);

  function openPostModal() {
    setForm(EMPTY_FORM);
    setEditPost(null);
    setShowPost(true);
  }
  function openEditModal(post) {
    setForm({
      bloodGroup: post.bloodGroup || "A+",
      patientName: post.patientName || "",
      hospitalName: post.hospitalName || "",
      location: post.location || "",
      requiredTime: post.requiredTime || "",
      requiredBags: post.requiredBags || 1,
      contactNumber: post.contactNumber || "",
      reason: post.reason || "",
      urgent: post.urgent || false,
    });
    setEditPost(post);
    setShowPost(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.hospitalName || !form.location || !form.contactNumber) return;
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        postedBy: currentUser.fullName || currentUser.name || "Anonymous",
        postedByEmail: currentUser.email || "",
        firebaseUid: currentUser.firebaseUid || "",
      };
      const url    = editPost ? `${API}/${editPost.id}` : API;
      const method = editPost ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowPost(false);
        setEditPost(null);
        setForm(EMPTY_FORM);
        loadPosts();
      }
    } catch {}
    setSubmitting(false);
  }

  async function handleDelete(id) {
    if (!confirm("Delete this blood donation request?")) return;
    try {
      await fetch(`${API}/${id}`, { method: "DELETE" });
      loadPosts();
    } catch {}
  }

  async function handleReact(id, type, posts, setPosts) {
    try {
      const res = await fetch(`${API}/${id}/react?type=${type}&delta=1`, { method: "POST" });
      if (res.ok) {
        const updated = await res.json();
        setPosts(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
      }
    } catch {}
  }

  const displayed = posts.filter(p => {
    const matchSearch = (p.hospitalName + p.location + p.reason + p.patientName)
      .toLowerCase().includes(search.toLowerCase());
    const matchBg = bgFilter === "All" || p.bloodGroup === bgFilter;
    const matchUrgent = !urgentOnly || p.urgent;
    return matchSearch && matchBg && matchUrgent;
  });

  const urgentCount = posts.filter(p => p.urgent).length;
  const isOwner = (post) => {
    const email = currentUser.email || localStorage.getItem("userEmail") || "";
    return email && post.postedByEmail === email;
  };

  return (
    <div className="min-h-screen font-sans bg-gradient-to-b from-[#fff5f5] via-[#fff8f5] to-[#fff3ec] relative overflow-x-hidden">

      {/* Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {isMounted && (
          <motion.div style={{ x: smoothX, y: smoothY }}
            className="absolute top-[-15vw] left-[-15vw] w-[30vw] h-[30vw] rounded-full bg-red-400/15 blur-[120px] z-10" />
        )}
        <motion.div animate={{ x: ["0vw","30vw","-20vw","0vw"], y: ["0vh","-20vh","30vh","0vh"], scale: [1,1.3,0.9,1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute top-[10%] left-[20%] w-[45vw] h-[45vw] rounded-[100%] bg-rose-400/15 blur-[130px]" />
        <motion.div animate={{ x: ["0vw","-40vw","10vw","0vw"], y: ["0vh","40vh","-10vh","0vh"], scale: [1,0.8,1.2,1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          className="absolute top-[30%] right-[10%] w-[50vw] h-[50vw] rounded-[100%] bg-red-300/10 blur-[140px]" />
        <div className="absolute inset-0 backdrop-blur-[60px] z-[-1]" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12 pb-28">

        {/* Back */}
        <header className="mb-8">
          <Link href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/50 backdrop-blur-md border border-white/80 shadow-sm text-slate-700 font-bold hover:bg-white/90 transition-all group w-max">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>
        </header>

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-red-50 rounded-2xl border border-red-100 shadow-sm">
                <Droplets className="w-6 h-6 text-red-500" />
              </div>
              <span className="text-xs font-black text-red-600 uppercase tracking-widest px-3 py-1 rounded-full bg-red-50 border border-red-200">
                Blood Donation Hub
              </span>
              {urgentCount > 0 && (
                <span className="flex items-center gap-1 text-xs font-black text-white bg-red-500 px-3 py-1 rounded-full animate-pulse shadow-md">
                  <Flame className="w-3.5 h-3.5" /> {urgentCount} Urgent
                </span>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Blood Donation<br className="hidden sm:block" /> Requests
            </h1>
            <p className="text-slate-500 font-medium mt-3 text-lg max-w-lg">
              Every drop of blood is a gift of life. Post a request or respond to urgent calls.
            </p>
          </div>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={openPostModal}
            className="shrink-0 flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-white bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 shadow-lg shadow-red-500/25 transition-all">
            <Plus className="w-5 h-5" /> Post Blood Request
          </motion.button>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Requests", value: posts.length, color: "text-slate-700", bg: "bg-white/60" },
            { label: "Urgent",         value: urgentCount,  color: "text-red-600",   bg: "bg-red-50/70" },
            { label: "A+ / O+",
              value: posts.filter(p => p.bloodGroup === "A+" || p.bloodGroup === "O+").length,
              color: "text-rose-600", bg: "bg-rose-50/70" },
            { label: "Posted Today",
              value: posts.filter(p => new Date(p.createdAt).toDateString() === new Date().toDateString()).length,
              color: "text-orange-600", bg: "bg-orange-50/70" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className={`${s.bg} backdrop-blur-xl border border-white/80 rounded-[1.5rem] p-5 shadow-sm`}>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-red-500 transition-colors" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search hospital, location, reason..."
              className="w-full pl-12 pr-4 py-3.5 rounded-full bg-white/60 backdrop-blur-md border border-white focus:border-red-400 focus:ring-4 focus:ring-red-400/10 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-bold shadow-sm" />
          </div>
          <button onClick={() => setUrgentOnly(u => !u)}
            className={`flex items-center gap-2 px-5 py-3.5 rounded-full text-sm font-black transition-all whitespace-nowrap ${urgentOnly ? "bg-red-500 text-white shadow-md shadow-red-400/30" : "bg-white/60 text-slate-500 border border-white hover:bg-white"}`}>
            <Flame className="w-4 h-4" /> Urgent Only
          </button>
        </div>

        {/* Blood Group Filter Chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          {BLOOD_GROUPS.map(bg => (
            <button key={bg} onClick={() => setBgFilter(bg)}
              className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all ${bgFilter === bg
                ? bg === "All"
                  ? "bg-red-500 text-white shadow-md shadow-red-400/30"
                  : `${bloodBadge(bg)} text-white shadow-md`
                : "bg-white/60 text-slate-600 border border-white/80 hover:bg-white"}`}>
              {bg === "All" ? "All Groups" : `${bg}`}
            </button>
          ))}
        </div>

        {/* Cards Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-12 h-12 border-4 border-red-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayed.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-32 gap-6">
            <div className="w-24 h-24 rounded-3xl bg-red-50 flex items-center justify-center shadow-sm">
              <Droplets className="w-12 h-12 text-red-300" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-black text-slate-800 mb-2">
                {search || bgFilter !== "All" || urgentOnly ? "No matching requests" : "No Requests Yet"}
              </h2>
              <p className="text-slate-400 font-medium max-w-sm">
                {search || bgFilter !== "All" ? "Try a different filter." : "Be the first to post a blood donation request."}
              </p>
            </div>
            {!search && bgFilter === "All" && !urgentOnly && (
              <button onClick={openPostModal}
                className="px-8 py-3.5 rounded-2xl bg-red-500 text-white font-black shadow-lg hover:bg-red-600 transition-all flex items-center gap-2">
                <Plus className="w-5 h-5" /> Post First Request
              </button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {displayed.map((post, i) => (
                <motion.div key={post.id}
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05 }} layout>
                  <motion.div whileHover={{ y: -8 }}
                    className="group bg-white/60 backdrop-blur-xl rounded-[2rem] border border-white/80 shadow-sm hover:shadow-xl transition-all flex flex-col h-full overflow-hidden">

                    {/* Card Top Banner */}
                    <div className={`relative h-32 flex items-center justify-center overflow-hidden ${post.urgent ? "bg-gradient-to-br from-red-500 to-rose-600" : "bg-gradient-to-br from-rose-100 to-red-50"}`}>
                      {/* Blood type big display */}
                      <span className={`text-6xl font-black tracking-tighter select-none ${post.urgent ? "text-white/90" : "text-red-500/30"}`}>
                        {post.bloodGroup}
                      </span>
                      {/* Blood group badge */}
                      <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-full text-white text-sm font-black shadow-lg ${bloodBadge(post.bloodGroup)}`}>
                        {post.bloodGroup}
                      </div>
                      {post.urgent && (
                        <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-wider">
                          <Flame className="w-3 h-3" /> Urgent
                        </div>
                      )}
                    </div>

                    {/* Card Body */}
                    <div className="p-5 flex-1 flex flex-col bg-white/80 border-t border-white">
                      {post.patientName && (
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                          <User className="w-3 h-3" /> {post.patientName}
                        </p>
                      )}
                      <h3 className="text-lg font-black text-slate-900 leading-snug mb-3 line-clamp-1">
                        {post.hospitalName}
                      </h3>

                      <div className="space-y-1.5 mb-4 text-xs font-bold text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span className="line-clamp-1">{post.location}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                          <span>{formatTime(post.requiredTime)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span>{post.requiredBags} bag{post.requiredBags !== 1 ? "s" : ""} needed</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-green-500 shrink-0" />
                          <a href={`tel:${post.contactNumber}`} className="text-green-600 font-black hover:underline">
                            {post.contactNumber}
                          </a>
                        </div>
                      </div>

                      {post.reason && (
                        <p className="text-[11px] text-slate-400 font-medium line-clamp-2 mb-4 leading-relaxed">
                          {post.reason}
                        </p>
                      )}

                      {/* Reactions + stats */}
                      <div className="flex items-center gap-2 mb-4">
                        {[
                          { type: "LIKE", icon: "👍", count: post.likeCount },
                          { type: "LOVE", icon: "❤️", count: post.loveCount },
                          { type: "SAD",  icon: "😢", count: post.sadCount  },
                        ].map(r => (
                          <button key={r.type}
                            onClick={() => handleReact(post.id, r.type, posts, setPosts)}
                            className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-50 hover:bg-slate-100 text-xs font-black text-slate-600 border border-slate-100 transition-all hover:scale-110">
                            <span>{r.icon}</span> {r.count}
                          </button>
                        ))}
                        <div className="flex items-center gap-1 text-xs text-slate-400 font-bold ml-auto">
                          <Eye className="w-3.5 h-3.5" /> {post.viewCount}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-400 font-bold">
                          <MessageCircle className="w-3.5 h-3.5" /> {commentCounts[post.id] || 0}
                        </div>
                      </div>

                      {/* Posted by + date */}
                      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" /> {post.postedBy} · {formatDate(post.createdAt)}
                      </p>

                      {/* Actions */}
                      <div className="mt-auto flex gap-2">
                        <Link href={`/blood-donation-details?id=${post.id}`}
                          className="flex-1 py-3 rounded-xl font-black text-white text-sm bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 shadow-md transition-all flex items-center justify-center gap-1.5">
                          View Details <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                        {isOwner(post) && (
                          <>
                            <button onClick={() => openEditModal(post)}
                              className="p-3 rounded-xl bg-slate-50 text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all border border-slate-100 opacity-0 group-hover:opacity-100"
                              title="Edit">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(post.id)}
                              className="p-3 rounded-xl bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all border border-slate-100 opacity-0 group-hover:opacity-100"
                              title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* POST / EDIT MODAL */}
      <AnimatePresence>
        {showPost && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) { setShowPost(false); setEditPost(null); } }}>
            <motion.form
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              onSubmit={handleSubmit}
              className="relative w-full max-w-lg bg-white/95 backdrop-blur-2xl rounded-[2rem] border border-white shadow-2xl p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">

              <button type="button" onClick={() => { setShowPost(false); setEditPost(null); }}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-1">
                <div className="p-2.5 bg-red-50 rounded-xl">
                  <Droplets className="w-5 h-5 text-red-500" />
                </div>
                <h2 className="text-2xl font-black text-slate-900">
                  {editPost ? "Edit Request" : "Post Blood Request"}
                </h2>
              </div>
              <p className="text-slate-400 font-medium text-sm mb-7 ml-1">
                Fill in the details. This will be visible immediately — no admin approval needed.
              </p>

              <div className="space-y-4">
                {/* Blood Group + Urgent */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Blood Group *</label>
                    <select value={form.bloodGroup} onChange={e => setForm({ ...form, bloodGroup: e.target.value })}
                      className="w-full mt-1 px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-100 outline-none font-black text-slate-800 text-lg appearance-none focus:border-red-400 focus:ring-2 focus:ring-red-400/10 transition-all">
                      {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(bg => (
                        <option key={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Urgency</label>
                    <button type="button" onClick={() => setForm({ ...form, urgent: !form.urgent })}
                      className={`mt-1 flex-1 flex items-center justify-center gap-2 rounded-xl font-black text-sm transition-all border ${form.urgent
                        ? "bg-red-500 text-white border-red-400 shadow-md shadow-red-400/30"
                        : "bg-slate-50 text-slate-500 border-slate-100 hover:border-red-200"}`}>
                      <Flame className="w-4 h-4" />
                      {form.urgent ? "URGENT!" : "Mark Urgent"}
                    </button>
                  </div>
                </div>

                {/* Patient Name */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Patient Name</label>
                  <input type="text" placeholder="e.g. John Doe"
                    value={form.patientName} onChange={e => setForm({ ...form, patientName: e.target.value })}
                    className="w-full mt-1 px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-800 focus:border-red-400 focus:ring-2 focus:ring-red-400/10 transition-all" />
                </div>

                {/* Hospital + Location */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Hospital Name *</label>
                  <input required type="text" placeholder="e.g. Dhaka Medical College Hospital"
                    value={form.hospitalName} onChange={e => setForm({ ...form, hospitalName: e.target.value })}
                    className="w-full mt-1 px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-800 focus:border-red-400 focus:ring-2 focus:ring-red-400/10 transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Location *</label>
                  <input required type="text" placeholder="e.g. Mirpur, Dhaka"
                    value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                    className="w-full mt-1 px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-800 focus:border-red-400 focus:ring-2 focus:ring-red-400/10 transition-all" />
                </div>

                {/* Time + Bags */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Required Time</label>
                    <input type="datetime-local" value={form.requiredTime}
                      onChange={e => setForm({ ...form, requiredTime: e.target.value })}
                      className="w-full mt-1 px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-800 focus:border-red-400 transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Bags Required</label>
                    <input type="number" min={1} max={20} value={form.requiredBags}
                      onChange={e => setForm({ ...form, requiredBags: parseInt(e.target.value) || 1 })}
                      className="w-full mt-1 px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-800 focus:border-red-400 transition-all" />
                  </div>
                </div>

                {/* Contact */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Contact Number *</label>
                  <input required type="tel" placeholder="e.g. +8801XXXXXXXXX"
                    value={form.contactNumber} onChange={e => setForm({ ...form, contactNumber: e.target.value })}
                    className="w-full mt-1 px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-800 focus:border-red-400 focus:ring-2 focus:ring-red-400/10 transition-all" />
                </div>

                {/* Reason */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Reason / Details</label>
                  <textarea rows={3} placeholder="Brief explanation of why blood is needed..."
                    value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                    className="w-full mt-1 px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-800 resize-none focus:border-red-400 focus:ring-2 focus:ring-red-400/10 transition-all" />
                </div>

                <button type="submit" disabled={submitting}
                  className="w-full py-4 bg-gradient-to-r from-red-500 to-rose-500 text-white font-black rounded-2xl shadow-lg shadow-red-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-70">
                  {submitting
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                    : <><CheckCircle2 className="w-5 h-5" /> {editPost ? "Update Request" : "Post Request"}</>}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
