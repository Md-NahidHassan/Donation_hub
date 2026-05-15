"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import {
  BookOpen, Package, ArrowUpRight, Tag, Plus, ArrowLeft,
  Search, Star, Activity, Trash2, ShieldCheck, Clock,
  CheckCircle2, XCircle, AlertCircle, GraduationCap,
  X, FileText, Download, Upload, Image, Music, Video,
  File, FilePdf, Paperclip
} from "lucide-react";
import Link from "next/link";
import { mockDb } from "@/utils/mockDb";

// ── helpers ────────────────────────────────────────────────────────────────────
const iconMap = { BookOpen, Package, Star, Activity };

const conditionColor = {
  "Excellent": { badge: "bg-emerald-500 text-white",  dot: "bg-emerald-400" },
  "Brand New": { badge: "bg-indigo-500 text-white",   dot: "bg-indigo-400"  },
  "Like New":  { badge: "bg-sky-500 text-white",      dot: "bg-sky-400"     },
  "Good":      { badge: "bg-amber-500 text-white",    dot: "bg-amber-400"   },
  "Fair":      { badge: "bg-rose-500 text-white",     dot: "bg-rose-400"    },
};

const statusStyle = {
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Pending:  "bg-amber-50  text-amber-700  border-amber-200",
  Rejected: "bg-rose-50   text-rose-700   border-rose-200",
};

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileCategory(type) {
  if (!type) return "file";
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("audio/")) return "audio";
  if (type.startsWith("video/")) return "video";
  if (type === "application/pdf") return "pdf";
  return "file";
}

function FileIcon({ category, className = "w-6 h-6" }) {
  const icons = {
    image: <Image className={className} />,
    audio: <Music className={className} />,
    video: <Video className={className} />,
    pdf:   <FileText className={className} />,
    file:  <File className={className} />,
  };
  return icons[category] || icons.file;
}

const categoryColors = {
  image: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-600", label: "Image" },
  audio: { bg: "bg-pink-50",   border: "border-pink-200",   text: "text-pink-600",   label: "Audio" },
  video: { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-600",   label: "Video" },
  pdf:   { bg: "bg-rose-50",   border: "border-rose-200",   text: "text-rose-600",   label: "PDF"   },
  file:  { bg: "bg-slate-50",  border: "border-slate-200",  text: "text-slate-600",  label: "File"  },
};

// ── File Upload Zone Component ─────────────────────────────────────────────────
function FileUploadZone({ uploadedFile, onFileSelect, onFileRemove }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelect(file);
  }, [onFileSelect]);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleChange = (e) => { const file = e.target.files?.[0]; if (file) onFileSelect(file); };

  if (uploadedFile) {
    const cat = getFileCategory(uploadedFile.type);
    const col = categoryColors[cat];
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`w-full mt-1 rounded-xl border-2 ${col.border} ${col.bg} p-4 flex items-center gap-4`}
      >
        <div className={`p-3 rounded-xl bg-white shadow-sm ${col.text}`}>
          <FileIcon category={cat} className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-black text-sm ${col.text} truncate`}>{uploadedFile.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/80 ${col.text}`}>
              {col.label}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">{formatBytes(uploadedFile.size)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onFileRemove}
          className="p-2 rounded-full hover:bg-white text-slate-400 hover:text-rose-500 transition-all shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => inputRef.current?.click()}
      className={`w-full mt-1 rounded-xl border-2 border-dashed transition-all cursor-pointer p-6 flex flex-col items-center justify-center gap-3 group ${
        isDragging
          ? "border-uiu-emerald bg-emerald-50/80 scale-[1.01]"
          : "border-slate-200 bg-slate-50/60 hover:border-uiu-emerald/60 hover:bg-emerald-50/30"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="*/*"
        className="hidden"
        onChange={handleChange}
      />
      <div className={`p-4 rounded-2xl transition-all ${isDragging ? "bg-uiu-emerald/10" : "bg-white shadow-sm group-hover:bg-emerald-50"}`}>
        <Upload className={`w-7 h-7 transition-colors ${isDragging ? "text-uiu-emerald" : "text-slate-400 group-hover:text-uiu-emerald"}`} />
      </div>
      <div className="text-center">
        <p className="font-black text-slate-700 text-sm">
          {isDragging ? "Drop it here!" : "Drop file or click to browse"}
        </p>
        <p className="text-[11px] text-slate-400 font-medium mt-1">
          PDF, Images, Audio, Video — any file type supported
        </p>
      </div>
      {/* File type badges */}
      <div className="flex items-center gap-1.5 flex-wrap justify-center mt-1">
        {[
          { label: "PDF",   col: "bg-rose-100 text-rose-600"   },
          { label: "Image", col: "bg-purple-100 text-purple-600" },
          { label: "Audio", col: "bg-pink-100 text-pink-600"   },
          { label: "Video", col: "bg-blue-100 text-blue-600"   },
          { label: "DOC",   col: "bg-indigo-100 text-indigo-600" },
        ].map(({ label, col }) => (
          <span key={label} className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${col}`}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AcademicResourcesPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [allItems,  setAllItems]  = useState([]);
  const [search,    setSearch]    = useState("");
  const [filter,    setFilter]    = useState("All");
  const [isPosting, setIsPosting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);   // File object
  const [blobUrl, setBlobUrl] = useState(null);              // Object URL
  const [newItem, setNewItem] = useState({
    title: "", subject: "General", condition: "Like New", description: "",
  });
  const isLoadingData = useRef(false);

  const API_BASE_URL = "http://127.0.0.1:8080/api/resources";

  // ── load data ──────────────────────────────────────────────────────
  const loadData = async () => {
    if (isLoadingData.current) return;
    isLoadingData.current = true;
    // Get current user for ownership checks
    const userStr = localStorage.getItem("user");
    const currentUser = userStr ? JSON.parse(userStr) : { fullName: "Md. Nahid Hassan" };

    try {
      const res = await fetch(API_BASE_URL); // Fetch ALL resources
      if (res.ok) {
        const data = await res.json();
        
        // Filter: Show all Approved, but only show Pending/Rejected if they belong to the current user
        const visibleItems = data.filter(it => {
          if (it.status === "Approved") return true;
          return it.postedBy === currentUser.fullName;
        });

        setAllItems(visibleItems);
      } else {
        setAllItems(mockDb.getItems());
      }
    } catch (err) {
      console.error("Failed to fetch from backend:", err);
      setAllItems(mockDb.getItems());
    } finally {
      isLoadingData.current = false;
    }
  };

  useEffect(() => {
    setIsMounted(true);
    loadData();
    const interval = setInterval(loadData, 10000);
    window.addEventListener("storage", loadData);
    return () => { clearInterval(interval); window.removeEventListener("storage", loadData); };
  }, []);

  // Revoke blob URL on unmount to free memory
  useEffect(() => () => { if (blobUrl) URL.revokeObjectURL(blobUrl); }, [blobUrl]);

  // ── mouse parallax ─────────────────────────────────────────────────
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { damping: 50, stiffness: 400, mass: 0.5 });
  const smoothY = useSpring(mouseY, { damping: 50, stiffness: 400, mass: 0.5 });
  useEffect(() => {
    const h = (e) => { mouseX.set(e.clientX); mouseY.set(e.clientY); };
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, [mouseX, mouseY]);

  // ── file handling ──────────────────────────────────────────────────
  const handleFileSelect = (file) => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    const url = URL.createObjectURL(file);
    setUploadedFile(file);
    setBlobUrl(url);
  };

  const handleFileRemove = () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setUploadedFile(null);
    setBlobUrl(null);
  };

  // ── post submit ────────────────────────────────────────────────────
  const handlePost = async (e) => {
    e.preventDefault();
    if (!newItem.title.trim()) return;

    try {
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : { 
        fullName: "Md. Nahid Hassan", 
        email: localStorage.getItem("userEmail") || "nhassan231467@bscse.uiu.ac.bd" 
      };
      
      const resourceData = {
        title: newItem.title,
        subject: newItem.subject,
        resourceCondition: newItem.condition,
        description: newItem.description,
        postedBy: user.fullName,
        postedByEmail: user.email,
        icon: "BookOpen",
        color: "from-uiu-emerald/20 to-teal-500/20"
      };

      const formData = new FormData();
      formData.append("resource", JSON.stringify(resourceData));
      if (uploadedFile) {
        formData.append("file", uploadedFile);
      }

      const res = await fetch(API_BASE_URL, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setNewItem({ title: "", subject: "General", condition: "Like New", description: "" });
        handleFileRemove();
        setIsPosting(false);
        loadData();
      } else {
        alert("Failed to save to database. Check if backend is running.");
      }
    } catch (err) {
      console.error("Error posting resource:", err);
      alert("Error connecting to backend.");
    }
  };

  const handleCloseModal = () => {
    setIsPosting(false);
    setNewItem({ title: "", subject: "General", condition: "Like New", description: "" });
    handleFileRemove();
  };

  // ── actions ────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (confirm("Delete this post?")) {
      try {
        const res = await fetch(`${API_BASE_URL}/${id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          loadData();
        } else {
          // If it's a mock item (not in DB), delete from mockDb
          mockDb.deleteItem(id);
          loadData();
        }
      } catch (err) {
        console.error("Error deleting resource:", err);
        mockDb.deleteItem(id);
        loadData();
      }
    }
  };

  // ── filtered items ─────────────────────────────────────────────────
  const displayed = allItems.filter((it) => {
    const matchSearch = it.title.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || it.status === filter;
    return matchSearch && matchFilter;
  });

  const counts = {
    All:      allItems.length,
    Approved: allItems.filter(i => i.status === "Approved").length,
    Pending:  allItems.filter(i => i.status === "Pending").length,
    Rejected: allItems.filter(i => i.status === "Rejected").length,
  };

  // ── render ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen font-sans bg-gradient-to-b from-[#f2faf6] via-[#fbf8f3] to-[#fff3ec] relative overflow-x-hidden">

      {/* BACKGROUND */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {isMounted && (
          <motion.div style={{ x: smoothX, y: smoothY }}
            className="absolute top-[-15vw] left-[-15vw] w-[30vw] h-[30vw] rounded-full bg-uiu-orange/15 blur-[120px] z-10" />
        )}
        <motion.div animate={{ x:["0vw","30vw","-20vw","0vw"],y:["0vh","-20vh","30vh","0vh"],scale:[1,1.3,0.9,1] }}
          transition={{ duration:18,repeat:Infinity,ease:"linear" }}
          className="absolute top-[10%] left-[20%] w-[45vw] h-[45vw] rounded-[100%] bg-uiu-emerald/15 blur-[130px]" />
        <motion.div animate={{ x:["0vw","-40vw","10vw","0vw"],y:["0vh","40vh","-10vh","0vh"],scale:[1,0.8,1.2,1] }}
          transition={{ duration:22,repeat:Infinity,ease:"linear" }}
          className="absolute top-[30%] right-[10%] w-[50vw] h-[50vw] rounded-[100%] bg-rose-500/10 blur-[140px]" />
        <motion.div animate={{ x:["0vw","20vw","-30vw","0vw"],y:["0vh","20vh","-30vh","0vh"],scale:[1,1.2,0.8,1] }}
          transition={{ duration:25,repeat:Infinity,ease:"linear" }}
          className="absolute bottom-[10%] left-[40%] w-[55vw] h-[55vw] rounded-[100%] bg-uiu-orange/15 blur-[150px]" />
        <div className="absolute inset-0 backdrop-blur-[60px] z-[-1]" />
        <motion.div animate={{ backgroundPosition:["0px 0px","40px 40px"] }}
          transition={{ duration:4,repeat:Infinity,ease:"linear" }}
          className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_100%_100%_at_50%_0%,#000_50%,transparent_120%)] opacity-50 z-[0]" />
      </div>

      {/* MAIN */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8 md:py-12 pb-28">

        {/* Back */}
        <header className="mb-10">
          <Link href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/50 backdrop-blur-md border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-slate-700 font-bold hover:bg-white/90 hover:text-slate-900 transition-all group w-max">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>
        </header>

        {/* PAGE HERO */}
        <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }}
          className="mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-white/60 backdrop-blur-md rounded-2xl border border-white shadow-sm">
                <GraduationCap className="w-6 h-6 text-uiu-emerald" />
              </div>
              <span className="text-xs font-black text-uiu-emerald uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                Academic Hub
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Your Shared<br className="hidden sm:block" /> Resources
            </h1>
            <p className="text-slate-500 font-medium mt-3 text-lg max-w-lg">
              Manage the academic items you have contributed to the UIU community.
            </p>
          </div>
          <motion.button whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}
            onClick={() => setIsPosting(true)}
            className="shrink-0 flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-white bg-uiu-emerald hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all">
            <Plus className="w-5 h-5" /> Share New Resource
          </motion.button>
        </motion.div>

        {/* ── POST FORM MODAL ──────────────────────────────────────── */}
        <AnimatePresence>
          {isPosting && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm"
              onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}
            >
              <motion.form
                initial={{ opacity:0, scale:0.92, y:24 }}
                animate={{ opacity:1, scale:1, y:0 }}
                exit={{ opacity:0, scale:0.92, y:24 }}
                onSubmit={handlePost}
                className="relative w-full max-w-lg bg-white/90 backdrop-blur-2xl rounded-[2rem] border border-white shadow-2xl p-8 max-h-[90vh] overflow-y-auto custom-scrollbar"
              >
                {/* Close */}
                <button type="button" onClick={handleCloseModal}
                  className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2.5 bg-emerald-50 rounded-xl">
                    <Paperclip className="w-5 h-5 text-uiu-emerald" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900">Share a Resource</h2>
                </div>
                <p className="text-slate-400 font-medium text-sm mb-7 ml-1">
                  Your post will be reviewed by an admin before going live.
                </p>

                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Item Title *</label>
                    <input autoFocus required type="text" placeholder="e.g. Calculus Textbook"
                      value={newItem.title}
                      onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                      className="w-full mt-1 px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-800 focus:border-uiu-emerald focus:ring-2 focus:ring-uiu-emerald/10 transition-all" />
                  </div>

                  {/* Subject + Condition */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Subject</label>
                      <select value={newItem.subject}
                        onChange={(e) => setNewItem({ ...newItem, subject: e.target.value })}
                        className="w-full mt-1 px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-800 appearance-none focus:border-uiu-emerald transition-all">
                        <option>CSE</option><option>EEE</option><option>Pharmacy</option>
                        <option>Physics</option><option>Mathematics</option>
                        <option>Chemistry</option><option>Civil</option>
                        <option>BBA</option><option>General</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Condition</label>
                      <select value={newItem.condition}
                        onChange={(e) => setNewItem({ ...newItem, condition: e.target.value })}
                        className="w-full mt-1 px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-800 appearance-none focus:border-uiu-emerald transition-all">
                        <option>Brand New</option><option>Excellent</option>
                        <option>Like New</option><option>Good</option><option>Fair</option>
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Description</label>
                    <textarea rows={3} placeholder="Brief info about this resource..."
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      className="w-full mt-1 px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-800 resize-none focus:border-uiu-emerald focus:ring-2 focus:ring-uiu-emerald/10 transition-all" />
                  </div>

                  {/* ── FILE UPLOAD ─────────────────────────────────── */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" /> Upload File (Optional)
                    </label>
                    <FileUploadZone
                      uploadedFile={uploadedFile}
                      onFileSelect={handleFileSelect}
                      onFileRemove={handleFileRemove}
                    />
                    {/* Supported formats note */}
                    {!uploadedFile && (
                      <p className="text-[10px] text-slate-400 font-medium mt-2 ml-1">
                        Supported: PDF, DOC, DOCX, PPT, images (JPG/PNG), audio (MP3/WAV), video (MP4/MOV), and more.
                      </p>
                    )}
                  </div>

                  {/* Submit */}
                  <button type="submit"
                    className="w-full py-4 bg-uiu-emerald text-white font-black rounded-2xl shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2">
                    Submit for Approval <ShieldCheck className="w-5 h-5" />
                  </button>
                </div>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* STATS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Total Posts", value: counts.All,      color: "text-slate-700",   bg: "bg-white/60"     },
            { label: "Live",        value: counts.Approved, color: "text-uiu-emerald", bg: "bg-emerald-50/60" },
            { label: "Pending",     value: counts.Pending,  color: "text-amber-600",   bg: "bg-amber-50/60"   },
            { label: "Rejected",    value: counts.Rejected, color: "text-rose-600",    bg: "bg-rose-50/60"    },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * 0.07 }}
              className={`${s.bg} backdrop-blur-xl border border-white/80 rounded-[1.5rem] p-5 shadow-sm`}>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            </motion.div>
          ))}
        </div>

        {/* FILTERS + SEARCH */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-uiu-emerald transition-colors" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your resources..."
              className="w-full pl-12 pr-4 py-3.5 rounded-full bg-white/60 backdrop-blur-md border border-white focus:border-uiu-emerald focus:ring-4 focus:ring-uiu-emerald/10 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-bold shadow-sm" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {["All","Approved","Pending","Rejected"].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all ${
                  filter === f ? "bg-uiu-emerald text-white shadow-md shadow-emerald-500/20" : "bg-white/60 text-slate-500 border border-white hover:bg-white"
                }`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* RESOURCE GRID */}
        {displayed.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {displayed.map((item, i) => {
                const Icon = iconMap[item.icon] || Package;
                const cond = conditionColor[item.condition] || { badge: "bg-slate-500 text-white", dot: "bg-slate-400" };
                const sSt = statusStyle[item.status] || statusStyle.Pending;
                const fileCat = item.fileType ? getFileCategory(item.fileType) : null;
                const fileCols = fileCat ? categoryColors[fileCat] : null;
                let downloadUrl = item.fileName ? `/api/resources/download/${item.fileName}` : item.downloadUrl;
                if (downloadUrl && downloadUrl.startsWith("/")) {
                  downloadUrl = `http://localhost:8080${downloadUrl}`;
                }

                return (
                  <motion.div key={item.id}
                    initial={{ opacity:0, scale:0.94 }} animate={{ opacity:1, scale:1 }}
                    exit={{ opacity:0, scale:0.9 }} transition={{ delay: i * 0.06 }} layout>
                    <motion.div whileHover={{ y: -8 }}
                      className="group bg-white/60 backdrop-blur-xl rounded-[2rem] border border-white/80 shadow-sm hover:shadow-xl transition-all flex flex-col h-full overflow-hidden">

                      {/* Icon area */}
                      <div className="h-48 relative flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-uiu-emerald/10 blur-3xl rounded-full" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-uiu-orange/10 blur-3xl rounded-full" />

                        <motion.div whileHover={{ scale:1.1, rotate:3 }} transition={{ type:"spring", stiffness:300 }}
                          className="relative z-10 p-5 bg-white/70 rounded-2xl shadow-md backdrop-blur-sm">
                          <Icon className="w-10 h-10 text-uiu-emerald" />
                        </motion.div>

                        {/* Condition badge */}
                        <div className="absolute top-4 left-4 z-20">
                          <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-wider shadow-sm ${cond.badge}`}>
                            {item.condition}
                          </span>
                        </div>

                        {/* File type badge – top right */}
                        {fileCat && fileCols && (
                          <div className="absolute top-4 right-4 z-20">
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${fileCols.bg} border ${fileCols.border} shadow-sm`}>
                              <FileIcon category={fileCat} className={`w-3 h-3 ${fileCols.text}`} />
                              <span className={`text-[9px] font-black uppercase tracking-wider ${fileCols.text}`}>{fileCols.label}</span>
                            </div>
                          </div>
                        )}
                        {/* Download icon if has file but no fileType */}
                        {(item.downloadUrl || item.fileName) && !fileCat && (
                          <div className="absolute top-4 right-4 z-20">
                            <a 
                              href={item.downloadUrl || `http://localhost:8080/api/resources/download/${item.fileName}`}
                              download={item.fileName || "resource"}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm text-uiu-emerald hover:bg-white hover:scale-110 transition-all block"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Card body */}
                      <div className="p-5 flex-1 flex flex-col bg-white/80 border-t border-white">
                        <div className="flex items-center gap-1.5 text-xs font-black text-uiu-orange mb-2">
                          <Tag className="w-3.5 h-3.5" />
                          {item.subject}
                        </div>
                        <h3 className="text-lg font-black text-slate-900 leading-snug mb-1 line-clamp-2">{item.title}</h3>

                        {item.description && (
                          <p className="text-xs text-slate-400 font-medium line-clamp-2 mb-3 leading-relaxed">{item.description}</p>
                        )}

                        {/* File name if uploaded */}
                        {item.fileName && (
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border w-full mb-3 ${fileCols?.bg || "bg-slate-50"} ${fileCols?.border || "border-slate-100"}`}>
                            <Paperclip className={`w-3 h-3 shrink-0 ${fileCols?.text || "text-slate-400"}`} />
                            <span className={`text-[10px] font-black truncate ${fileCols?.text || "text-slate-500"}`}>{item.fileName}</span>
                          </div>
                        )}

                        {/* Status pill */}
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border w-max mb-4 ${sSt}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cond.dot}`} />
                          {item.status === "Approved" ? "Live in Marketplace" : item.status}
                        </div>

                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                          <Clock className="w-3 h-3" /> Posted: {item.postedDate || "Recent"}
                        </p>

                        {/* Actions */}
                        <div className="mt-auto flex gap-2">
                          {item.status === "Approved" ? (
                            <Link href={`/item-details?id=${item.id}`}
                              className="flex-1 py-3 rounded-xl font-black text-white text-sm bg-uiu-emerald hover:bg-emerald-600 shadow-md transition-all flex items-center justify-center gap-1.5">
                              View Item <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                          ) : (
                            <button disabled
                              className="flex-1 py-3 rounded-xl font-black text-slate-400 text-sm bg-slate-50 border border-slate-100 cursor-not-allowed flex items-center justify-center gap-1.5">
                              {item.status === "Pending"
                                ? <><Clock className="w-3.5 h-3.5 animate-pulse" /> Pending</>
                                : <><XCircle className="w-3.5 h-3.5 text-rose-400" /> Rejected</>}
                            </button>
                          )}
                          
                          {/* Only show delete if the item belongs to the current user */}
                          {(item.postedBy === (localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")).fullName : "Md. Nahid Hassan")) && (
                            <button onClick={() => handleDelete(item.id)}
                              className="p-3 rounded-xl bg-slate-50 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all border border-slate-100 opacity-0 group-hover:opacity-100"
                              title="Delete post">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
            className="flex flex-col items-center justify-center py-32 text-center gap-6">
            <div className="w-24 h-24 rounded-3xl bg-emerald-50 flex items-center justify-center shadow-sm">
              <FileText className="w-12 h-12 text-uiu-emerald/50" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">
                {search || filter !== "All" ? "No matching resources found" : "No Resources Shared Yet"}
              </h2>
              <p className="text-slate-400 font-medium max-w-sm">
                {search || filter !== "All"
                  ? "Try a different search or filter."
                  : "Start contributing to the UIU community by sharing your first academic resource!"}
              </p>
            </div>
            {!search && filter === "All" && (
              <button onClick={() => setIsPosting(true)}
                className="px-8 py-3.5 rounded-2xl bg-uiu-emerald text-white font-black shadow-lg hover:bg-emerald-600 transition-all flex items-center gap-2">
                <Plus className="w-5 h-5" /> Share Your First Resource
              </button>
            )}
          </motion.div>
        )}

        {/* TIP BANNER */}
        {allItems.length > 0 && (
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.5 }}
            className="mt-12 p-5 rounded-[1.5rem] bg-amber-50/70 border border-amber-100 flex items-start gap-4">
            <div className="p-2.5 bg-amber-100 rounded-xl text-amber-600 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-amber-800/80 leading-relaxed">
              <span className="font-black">Tip:</span> Each approved resource earns you{" "}
              <span className="font-black">+50 Eco-Points</span>. Every download earns an extra{" "}
              <span className="font-black">+10 Eco-Points</span>!
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}
