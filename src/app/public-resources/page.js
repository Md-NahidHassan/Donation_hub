"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import {
  Users2, Package, ArrowUpRight, Tag, Plus, ArrowLeft,
  Search, Star, Trash2, ShieldCheck, Clock,
  AlertCircle, X, Download, Image,
  Heart, ShoppingBag, CheckCircle, XCircle
} from "lucide-react";
import Link from "next/link";

const conditionColor = {
  "Excellent": { badge: "bg-emerald-500 text-white", dot: "bg-emerald-400" },
  "Brand New": { badge: "bg-indigo-500 text-white", dot: "bg-indigo-400" },
  "Like New":  { badge: "bg-sky-500 text-white",    dot: "bg-sky-400"     },
  "Good":      { badge: "bg-amber-500 text-white",  dot: "bg-amber-400"   },
  "Fair":      { badge: "bg-rose-500 text-white",   dot: "bg-rose-400"    },
};

const statusStyle = {
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Pending:  "bg-amber-50  text-amber-700  border-amber-200",
  Rejected: "bg-rose-50   text-rose-700   border-rose-200",
};

const publicCategories = [
  "Electronics", "Books", "Furniture", "Stationery", "Clothing", "Sports", "Others"
];

const API = "http://localhost:8080/api/public-resources";

export default function PublicResourcesPage() {
  const [isMounted,    setIsMounted]    = useState(false);
  const [allItems,     setAllItems]     = useState([]);
  const [search,       setSearch]       = useState("");
  const [filter,       setFilter]       = useState("All");
  const [isPosting,    setIsPosting]    = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [newItem, setNewItem] = useState({
    title: "", category: "Others", condition: "Like New", description: "", image: null, fileUrl: null
  });
  const [counts, setCounts] = useState({ All: 0, Approved: 0, Pending: 0, Rejected: 0 });
  const [currentUser, setCurrentUser] = useState(null);
  const isLoadingData = useRef(false);

  // ── Mouse parallax ──
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { damping: 50, stiffness: 400 });
  const smoothY = useSpring(mouseY, { damping: 50, stiffness: 400 });

  useEffect(() => {
    const h = (e) => { mouseX.set(e.clientX); mouseY.set(e.clientY); };
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, [mouseX, mouseY]);

  // ── Load current user from localStorage ──
  useEffect(() => {
    setIsMounted(true);
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try { setCurrentUser(JSON.parse(userStr)); } catch (_) {}
    }
    loadData();
    const interval = setInterval(loadData, 10000); // Poll every 10s to reduce congestion
    return () => clearInterval(interval);
  }, []);

  // ── Load all public resources from backend ──
  const loadData = async () => {
    if (isLoadingData.current) return;
    isLoadingData.current = true;
    try {
      const res = await fetch(`${API}/all`);
      if (!res.ok) return;
      const data = await res.json();

      // Get current user info fresh each time
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      const email = user?.email || user?.userEmail || "";
      const name  = user?.fullName || user?.username || "";

      // Count only THIS user's posts
      const mine = data.filter(it =>
        (email && it.userEmail === email) ||
        (name  && it.postedBy  === name)
      );
      setCounts({
        All:      mine.length,
        Approved: mine.filter(it => it.status === "Approved").length,
        Pending:  mine.filter(it => it.status === "Pending").length,
        Rejected: mine.filter(it => it.status === "Rejected").length,
      });

      // Show: ALL approved posts + THIS user's pending/rejected
      const visible = data.filter(it => {
        if (it.status === "Approved") return true;
        return (email && it.userEmail === email) || (name && it.postedBy === name);
      });
      setAllItems([...visible].reverse());
    } catch (err) {
      console.error("loadData error:", err);
    } finally {
      isLoadingData.current = false;
    }
  };

  // ── Handlers ──
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result);
      setNewItem(prev => ({ ...prev, image: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setNewItem(prev => ({ ...prev, fileUrl: reader.result }));
    reader.readAsDataURL(file);
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!newItem.title.trim()) return;

    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : { fullName: "Anonymous", email: "" };

    const resource = {
      title:         newItem.title,
      category:      newItem.category,
      conditionInfo: newItem.condition,
      description:   newItem.description,
      image:         newItem.image,
      fileUrl:       newItem.fileUrl,
      postedBy:      user.fullName || user.username || "Anonymous",
      userEmail:     user.email || user.userEmail || "",
      status:        "Pending",
    };

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API}/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resource),
      });

      if (res.ok) {
        setIsPosting(false);
        setNewItem({ title: "", category: "Others", condition: "Like New", description: "", image: null, fileUrl: null });
        setPreviewImage(null);
        await loadData();
      } else {
        const err = await res.text();
        alert("Failed: " + err);
      }
    } catch (err) {
      alert("Cannot connect to backend (port 8080). Is Spring Boot running?");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this resource?")) return;
    try {
      await fetch(`${API}/${id}`, { method: "DELETE" });
      await loadData();
    } catch (_) {}
  };

  // ── Filtered list ──
  const displayed = allItems.filter(it => {
    const matchSearch = it.title?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || it.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen font-sans bg-gradient-to-b from-[#f2faf6] via-[#fbf8f3] to-[#fff3ec] relative overflow-x-hidden">

      {/* Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {isMounted && (
          <motion.div style={{ x: smoothX, y: smoothY }}
            className="absolute top-[-15vw] left-[-15vw] w-[30vw] h-[30vw] rounded-full bg-uiu-emerald/15 blur-[120px] z-10" />
        )}
        <motion.div
          animate={{ x: ["0vw","30vw","-20vw","0vw"], y: ["0vh","-20vh","30vh","0vh"], scale: [1,1.3,0.9,1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute top-[10%] left-[20%] w-[45vw] h-[45vw] rounded-[100%] bg-uiu-orange/15 blur-[130px]" />
        <div className="absolute inset-0 backdrop-blur-[60px] z-[-1]" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8 md:py-12 pb-28">

        {/* Back */}
        <header className="mb-10">
          <Link href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/50 backdrop-blur-md border border-white/80 shadow-sm text-slate-700 font-bold hover:bg-white/90 hover:text-slate-900 transition-all group w-max">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>
        </header>

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          className="mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-white/60 backdrop-blur-md rounded-2xl border border-white shadow-sm">
                <Users2 className="w-6 h-6 text-uiu-emerald" />
              </div>
              <span className="text-xs font-black text-uiu-emerald uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                Community Hub
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Public Shared<br className="hidden sm:block" /> Resources
            </h1>
            <p className="text-slate-500 font-medium mt-3 text-lg max-w-lg">
              Manage items you've contributed for community reuse and exchange.
            </p>
          </div>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => setIsPosting(true)}
            className="shrink-0 flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-white bg-uiu-emerald hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all">
            <Plus className="w-5 h-5" /> Donate Public Resource
          </motion.button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Total Posts", value: counts.All,      color: "text-slate-700",  bg: "bg-white/60"        },
            { label: "Live",        value: counts.Approved, color: "text-uiu-emerald", bg: "bg-emerald-50/60"  },
            { label: "Pending",     value: counts.Pending,  color: "text-amber-600",  bg: "bg-amber-50/60"    },
            { label: "Rejected",    value: counts.Rejected, color: "text-rose-600",   bg: "bg-rose-50/60"     },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className={`${s.bg} backdrop-blur-xl border border-white/80 rounded-[1.5rem] p-5 shadow-sm`}>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-uiu-emerald transition-colors" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your shared items..."
              className="w-full pl-12 pr-4 py-3.5 rounded-full bg-white/60 backdrop-blur-md border border-white focus:border-uiu-emerald outline-none transition-all placeholder:text-slate-400 text-slate-800 font-bold shadow-sm" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {["All", "Approved", "Pending", "Rejected"].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all ${
                  filter === f ? "bg-uiu-emerald text-white shadow-md" : "bg-white/60 text-slate-500 border border-white hover:bg-white"
                }`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Item Grid */}
        {displayed.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {displayed.map((item, i) => {
                const cond = conditionColor[item.conditionInfo || item.condition] || { badge: "bg-slate-500 text-white", dot: "bg-slate-400" };
                const sSt  = statusStyle[item.status] || statusStyle.Pending;
                const StatusIcon = item.status === "Approved" ? CheckCircle : item.status === "Rejected" ? XCircle : Clock;

                return (
                  <motion.div key={item.id} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: i * 0.06 }} layout>
                    <motion.div whileHover={{ y: -8 }} className="group bg-white/60 backdrop-blur-xl rounded-[2rem] border border-white/80 shadow-sm hover:shadow-xl transition-all flex flex-col h-full overflow-hidden">
                      <div className="h-44 relative bg-slate-100 flex items-center justify-center overflow-hidden">
                        {item.image
                          ? <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                          : <Package className="w-12 h-12 text-slate-300" />
                        }
                        <div className="absolute top-4 left-4">
                          <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-wider shadow-sm ${cond.badge}`}>
                            {item.conditionInfo || item.condition || "—"}
                          </span>
                        </div>
                        <div className="absolute top-4 right-4">
                          <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-wider border ${sSt} flex items-center gap-1`}>
                            <StatusIcon className="w-3 h-3" />
                            {item.status}
                          </span>
                        </div>
                      </div>
                      <div className="p-5 flex-1 flex flex-col bg-white/80 border-t border-white">
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-uiu-emerald uppercase tracking-widest mb-1">
                          <Tag className="w-3 h-3" /> {item.category || "General"}
                        </div>
                        <h3 className="text-lg font-black text-slate-900 leading-snug mb-1 line-clamp-2">{item.title}</h3>
                        <p className="text-xs text-slate-400 font-medium mb-3 line-clamp-2">{item.description}</p>

                        {item.status === "Pending" && (
                          <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-700 flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5" /> Waiting for admin approval
                          </div>
                        )}

                        <div className="mt-auto flex gap-2">
                          <Link href={`/resource-details?id=${item.id}&type=public`}
                            className="flex-1 py-3 rounded-xl font-black text-white text-xs bg-uiu-emerald hover:bg-emerald-600 shadow-md transition-all flex items-center justify-center gap-1.5">
                            View Item <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                          <button onClick={() => handleDelete(item.id)}
                            className="p-3 rounded-xl bg-slate-50 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all border border-slate-100">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="py-32 text-center flex flex-col items-center gap-4">
            <div className="p-6 bg-white/50 rounded-3xl"><Package className="w-12 h-12 text-slate-300" /></div>
            <p className="text-slate-400 font-bold">No public resources found. Share something with the community!</p>
          </div>
        )}

        {/* Modal */}
        <AnimatePresence>
          {isPosting && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm"
              onClick={(e) => e.target === e.currentTarget && setIsPosting(false)}>
              <motion.form initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                onSubmit={handlePost}
                className="w-full max-w-lg bg-white rounded-[2rem] p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button type="button" onClick={() => setIsPosting(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-50 rounded-full">
                  <X className="w-5 h-5" />
                </button>
                <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                  <ShoppingBag className="w-6 h-6 text-uiu-emerald" /> Share Resource
                </h2>

                <div className="space-y-5">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Title *</label>
                    <input required type="text" placeholder="What are you sharing?"
                      value={newItem.title} onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                      className="w-full mt-1 px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-100 font-bold text-slate-800 outline-none focus:border-uiu-emerald transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Category</label>
                      <select value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                        className="w-full mt-1 px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-100 font-bold text-slate-800 outline-none focus:border-uiu-emerald transition-all">
                        {publicCategories.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Condition</label>
                      <select value={newItem.condition} onChange={(e) => setNewItem({ ...newItem, condition: e.target.value })}
                        className="w-full mt-1 px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-100 font-bold text-slate-800 outline-none focus:border-uiu-emerald transition-all">
                        <option>Excellent</option><option>Brand New</option><option>Like New</option><option>Good</option><option>Fair</option>
                      </select>
                    </div>
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Image (Optional)</label>
                    <div onClick={() => document.getElementById("pub-img-up").click()}
                      className="mt-1 w-full aspect-video rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:border-uiu-emerald transition-all">
                      <input id="pub-img-up" type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                      {previewImage
                        ? <img src={previewImage} className="w-full h-full object-cover" />
                        : <><Image className="w-8 h-8 text-slate-300 mb-2" /><span className="text-[10px] font-bold text-slate-400">Click to upload photo</span></>
                      }
                    </div>
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Resource File (Optional)</label>
                    <div className="mt-1 flex items-center gap-3">
                      <button type="button" onClick={() => document.getElementById("pub-doc-up").click()}
                        className="px-5 py-3 rounded-xl bg-slate-50 border border-slate-100 font-bold text-slate-600 hover:bg-slate-100 transition-all flex items-center gap-2 text-xs">
                        <Download className="w-4 h-4" /> {newItem.fileUrl ? "✓ File Selected" : "Upload File"}
                      </button>
                      <input id="pub-doc-up" type="file" className="hidden" onChange={handleFileSelect} />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Description</label>
                    <textarea rows={3} placeholder="Share some details about the item..."
                      value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      className="w-full mt-1 px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-100 font-bold text-slate-800 outline-none focus:border-uiu-emerald transition-all" />
                  </div>

                  <button type="submit" disabled={isSubmitting}
                    className={`w-full py-4 text-white font-black rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                      isSubmitting ? "bg-slate-400 cursor-not-allowed" : "bg-uiu-emerald hover:bg-emerald-600"
                    }`}>
                    {isSubmitting ? (
                      <><div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Submitting...</>
                    ) : (
                      <><ShieldCheck className="w-5 h-5" /> Submit Public Resource</>
                    )}
                  </button>
                </div>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tip */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="mt-12 p-5 rounded-[1.5rem] bg-emerald-50/70 border border-emerald-100 flex items-start gap-4">
          <div className="p-2.5 bg-white rounded-xl text-uiu-emerald shrink-0"><AlertCircle className="w-5 h-5" /></div>
          <p className="text-sm font-medium text-emerald-800/80 leading-relaxed">
            <span className="font-black">Community Tip:</span> Each approved public resource contributes to your <span className="font-black">Impact Score</span> and helps reduce waste. Thank you for sharing!
          </p>
        </motion.div>
      </main>
    </div>
  );
}
