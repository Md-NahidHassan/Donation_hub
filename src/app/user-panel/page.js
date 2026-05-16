"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Wallet,
  Package,
  Clock,
  CheckCircle,
  Trash2,
  Edit3,
  UserCircle2,
  XCircle,
  History,
  TrendingUp,
  Plus,
  ShieldCheck,
  Tag,
  AlertCircle,
  X,
  Upload,
  FileText,
  Image,
  Music,
  Video,
  File,
  Paperclip,
  Download,
  ShoppingBag
} from "lucide-react";
import Link from "next/link";
import { mockDb } from "@/utils/mockDb";

// ── File Upload Zone Component ─────────────────────────────────────────────────
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
    pdf: <FileText className={className} />,
    file: <File className={className} />,
  };
  return icons[category] || icons.file;
}

const categoryColors = {
  image: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-600", label: "Image" },
  audio: { bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-600", label: "Audio" },
  video: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-600", label: "Video" },
  pdf: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-600", label: "PDF" },
  file: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-600", label: "File" },
};

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
      className={`w-full mt-1 rounded-xl border-2 border-dashed transition-all cursor-pointer p-6 flex flex-col items-center justify-center gap-3 group ${isDragging
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
      <div className="flex items-center gap-1.5 flex-wrap justify-center mt-1">
        {[
          { label: "PDF", col: "bg-rose-100 text-rose-600" },
          { label: "Image", col: "bg-purple-100 text-purple-600" },
          { label: "Audio", col: "bg-pink-100 text-pink-600" },
          { label: "Video", col: "bg-blue-100 text-blue-600" },
          { label: "DOC", col: "bg-indigo-100 text-indigo-600" },
        ].map(({ label, col }) => (
          <span key={label} className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${col}`}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function UserPanelPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [myPosts, setMyPosts] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [isPosting, setIsPosting] = useState(false);
  const [newItem, setNewItem] = useState({ title: "", subject: "General", condition: "Like New", description: "" });
  const [uploadedFile, setUploadedFile] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);

  // New states for Public Resources
  const [isPostingPublic, setIsPostingPublic] = useState(false);
  const [isSubmittingPublic, setIsSubmittingPublic] = useState(false);
  const [publicPreview, setPublicPreview] = useState(null);
  const [publicFileUrl, setPublicFileUrl] = useState(null);
  const [publicFileName, setPublicFileName] = useState(null);
  const [newPublic, setNewPublic] = useState({
    title: "", name: "", category: "Others", condition: "Like New", description: "", image: null, fileUrl: null
  });

  const loadData = async () => {
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : { fullName: "Md. Nahid Hassan", email: "nhassan231467@bscse.uiu.ac.bd" };
    const currentUserName = user.fullName;

    try {
      // Fetch Academic Resources
      const resAcademic = await fetch(`http://localhost:8080/api/resources/user/${encodeURIComponent(currentUserName)}`);
      let academicItems = [];
      if (resAcademic.ok) {
        academicItems = await resAcademic.json();
      }

      // Fetch Public Resources
      const resPublic = await fetch(`http://localhost:8080/api/public-resources/all`);
      let publicItems = [];
      if (resPublic.ok) {
        const allPublic = await resPublic.json();
        // Filter by current user email
        publicItems = allPublic.filter(it => it.userEmail === user.email);
      }

      // Combine and Separate: Approved → Posts, Pending+Rejected → Requests
      const userItems = [...academicItems, ...publicItems];

      const approvedItems = userItems.filter(it => it.status?.toLowerCase() === "approved").map(it => ({
        ...it,
        statusStyle: "text-uiu-emerald bg-emerald-50 border-emerald-200",
        indicator: "bg-uiu-emerald",
        icon: <CheckCircle className="w-5 h-5 text-uiu-emerald" />
      }));
      setMyPosts(approvedItems);

      const pendingOrRejected = userItems
        .filter(it => it.status?.toLowerCase() === "pending" || it.status?.toLowerCase() === "rejected")
        .map(it => ({
          ...it,
          statusStyle: it.status?.toLowerCase() === "pending"
            ? "text-amber-600 bg-amber-50 border-amber-200"
            : "text-rose-600 bg-rose-50 border-rose-200",
          indicator: it.status?.toLowerCase() === "pending" ? "bg-amber-500" : "bg-rose-500",
          icon: it.status?.toLowerCase() === "pending"
            ? <Clock className="w-5 h-5 text-amber-500" />
            : <XCircle className="w-5 h-5 text-rose-500" />
        }));
      setMyRequests(pendingOrRejected);
    } catch (err) {
      console.warn("Failed to fetch user resources from backend:", err);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    loadData();

    // Simulation: Polling every 5 seconds to catch Admin status updates
    const interval = setInterval(loadData, 5000);

    window.addEventListener('storage', loadData);
    return () => {
      window.removeEventListener('storage', loadData);
      clearInterval(interval);
    };
  }, []);

  const handleFileSelect = useCallback((file) => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(URL.createObjectURL(file));
    setUploadedFile(file);
  }, [blobUrl]);

  const handleFileRemove = () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setUploadedFile(null);
    setBlobUrl(null);
  };

  const handlePostItem = async (e) => {
    e.preventDefault();
    if (!newItem.title) return;

    // Current user definition
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : { fullName: "Md. Nahid Hassan" };

    const resourceData = {
      title: newItem.title,
      subject: newItem.subject,
      resourceCondition: newItem.condition, // Backend uses resourceCondition
      description: newItem.description,
      postedBy: user.fullName,
      postedByEmail: user.email,
      status: "Pending"
    };

    const formData = new FormData();
    formData.append("resource", JSON.stringify(resourceData));
    if (uploadedFile) {
      formData.append("file", uploadedFile);
    }

    try {
      const res = await fetch("http://localhost:8080/api/resources", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setNewItem({ title: "", subject: "General", condition: "Like New", description: "" });
        handleFileRemove();
        setIsPosting(false);
        loadData();
      } else {
        alert("Failed to upload resource. Please check the backend.");
      }
    } catch (err) {
      console.error("Post Error:", err);
      alert("Backend connection failed!");
    }
  };

  const handleCloseModal = () => {
    setIsPosting(false);
    setNewItem({ title: "", subject: "General", condition: "Like New", description: "" });
    handleFileRemove();
  };

  const handlePublicFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setNewPublic(prev => ({ ...prev, fileUrl: reader.result }));
    reader.readAsDataURL(file);
    setPublicFileName(file.name);
  };

  const handlePostPublic = async (e) => {
    e.preventDefault();
    if (!newPublic.title.trim()) return;

    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : { fullName: "Md. Nahid Hassan", email: "nhassan231467@bscse.uiu.ac.bd" };

    const resource = {
      title: newPublic.title,
      category: newPublic.category,
      conditionInfo: newPublic.condition,
      description: newPublic.description,
      image: newPublic.image,
      fileUrl: newPublic.fileUrl,
      postedBy: newPublic.name?.trim() || user.fullName || user.username || "Anonymous",
      userEmail: user.email || user.userEmail || "",
      status: "Pending"
    };

    setIsSubmittingPublic(true);
    try {
      const response = await fetch("http://localhost:8080/api/public-resources/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resource)
      });

      if (response.ok) {
        setIsPostingPublic(false);
        setNewPublic({ title: "", name: "", category: "Others", condition: "Like New", description: "", image: null, fileUrl: null });
        setPublicPreview(null);
        setPublicFileName(null);
        loadData();
      } else {
        const err = await response.text();
        alert("Failed: " + err);
      }
    } catch (err) {
      console.error("Post Error:", err);
      alert("Cannot connect to backend. Is Spring Boot running?");
    } finally {
      setIsSubmittingPublic(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this post?")) {
      try {
        const res = await fetch(`http://localhost:8080/api/resources/${id}`, {
          method: "DELETE"
        });
        if (res.ok) {
          loadData();
        } else {
          mockDb.deleteItem(id);
          loadData();
        }
      } catch (err) {
        console.warn("Backend delete failed:", err);
        mockDb.deleteItem(id);
        loadData();
      }
    }
  };

  // Mouse tracking for live background effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { damping: 50, stiffness: 400, mass: 0.5 });
  const smoothY = useSpring(mouseY, { damping: 50, stiffness: 400, mass: 0.5 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div className="flex flex-col min-h-screen font-sans bg-gradient-to-b from-[#f2faf6] via-[#fbf8f3] to-[#fff3ec] relative overflow-x-hidden">

      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {isMounted && (
          <motion.div
            style={{ x: smoothX, y: smoothY }}
            className="absolute top-[-15vw] left-[-15vw] w-[30vw] h-[30vw] rounded-full bg-uiu-orange/15 blur-[120px] pointer-events-none z-10"
          />
        )}
        <motion.div
          animate={{ x: ['0vw', '30vw', '-20vw', '0vw'], y: ['0vh', '-20vh', '30vh', '0vh'], scale: [1, 1.3, 0.9, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute top-[10%] left-[20%] w-[45vw] h-[45vw] rounded-[100%] bg-uiu-emerald/15 blur-[130px]"
        />
        <motion.div
          animate={{ x: ['0vw', '-40vw', '10vw', '0vw'], y: ['0vh', '40vh', '-10vh', '0vh'], scale: [1, 0.8, 1.2, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          className="absolute top-[30%] right-[10%] w-[50vw] h-[50vw] rounded-[100%] bg-rose-500/10 blur-[140px]"
        />
        <div className="absolute inset-0 backdrop-blur-[60px] z-[0]" />
      </div>

      <main className="max-w-7xl mx-auto w-full px-6 py-6 md:py-10 z-10 flex flex-col flex-1 pb-24">

        {/* TOP NAVIGATION */}
        <header className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/50 backdrop-blur-md border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-slate-700 font-bold hover:bg-white/90 hover:text-slate-900 transition-all group w-max"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>
        </header>

        {/* TOP METRICS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 bg-white/40 backdrop-blur-xl rounded-[2rem] border border-white/60 p-6 md:p-8 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden"
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 border border-white shadow-inner flex items-center justify-center shrink-0">
              <UserCircle2 className="w-14 h-14 text-indigo-400 stroke-[1.5]" />
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-1">Md. Nahid Hassan</h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-4">
                <span className="px-3 py-1 bg-white/80 rounded-full text-xs font-bold text-slate-500 uppercase tracking-widest border border-slate-100 italic">ID: 0112310467</span>
                <span className="px-3 py-1 bg-white/80 rounded-full text-xs font-bold text-slate-500 uppercase tracking-widest border border-slate-100">CSE Department</span>
              </div>
              <p className="text-slate-500 font-medium italic">Contributor Level: <span className="text-uiu-emerald font-black underline decoration-uiu-emerald/30">Green Pioneer 🌿</span></p>
            </div>
          </motion.div>

          {/* Eco-Wallet */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1 bg-gradient-to-br from-amber-50 to-orange-50 backdrop-blur-xl rounded-[2rem] border border-amber-100 p-8 shadow-sm flex flex-col relative overflow-hidden group"
          >
            <div className="flex justify-between items-start mb-4 relative z-10">
              <p className="text-amber-800/80 font-bold uppercase text-xs tracking-widest">Eco-Wallet Balance</p>
              <div className="p-2.5 bg-white shadow-sm rounded-xl text-amber-600"><Wallet className="w-5 h-5" /></div>
            </div>
            <div className="relative z-10 flex-1 flex flex-col justify-center mb-6">
              <div className="text-5xl font-black text-amber-600 tracking-tighter mb-1">🪙 450</div>
              <p className="text-amber-700/60 font-bold text-sm">Equivalent to 4.5kg CO2 offset</p>
            </div>
            <button className="w-full py-3 bg-white/60 hover:bg-white text-sm font-black text-amber-600 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2">
              <History className="w-4 h-4" /> View Transactions
            </button>
          </motion.div>
        </div>

        {/* ── POST FORM MODALS ──────────────────────────────────────── */}
        <AnimatePresence>
          {isPosting && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm"
              onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}
            >
              <motion.form
                initial={{ opacity: 0, scale: 0.92, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 24 }}
                onSubmit={handlePostItem}
                className="relative w-full max-w-lg bg-white/90 backdrop-blur-2xl rounded-[2rem] border border-white shadow-2xl p-8 max-h-[90vh] overflow-y-auto custom-scrollbar"
              >
                {/* Close */}
                <button type="button" onClick={handleCloseModal}
                  className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2.5 bg-emerald-50 rounded-xl">
                    <FileText className="w-5 h-5 text-uiu-emerald" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900">Share Academic Resource</h2>
                </div>
                <p className="text-slate-400 font-medium text-sm mb-7 ml-1">
                  Share notes, books or study materials.
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

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Description</label>
                    <textarea rows={3} placeholder="Brief info about this resource..."
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      className="w-full mt-1 px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-800 resize-none focus:border-uiu-emerald focus:ring-2 focus:ring-uiu-emerald/10 transition-all" />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" /> Upload File (Optional)
                    </label>
                    <FileUploadZone
                      uploadedFile={uploadedFile}
                      onFileSelect={handleFileSelect}
                      onFileRemove={handleFileRemove}
                    />
                  </div>

                  <button type="submit"
                    className="w-full py-4 bg-uiu-emerald text-white font-black rounded-2xl shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2">
                    Submit Academic Resource <ShieldCheck className="w-5 h-5" />
                  </button>
                </div>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PUBLIC RESOURCE MODAL */}
        <AnimatePresence>
          {isPostingPublic && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm"
              onClick={(e) => { if (e.target === e.currentTarget) setIsPostingPublic(false); }}
            >
              <motion.form
                initial={{ opacity: 0, scale: 0.92, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 24 }}
                onSubmit={handlePostPublic}
                className="relative w-full max-w-lg bg-white rounded-[2rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
              >
                {/* Close */}
                <button type="button" onClick={() => setIsPostingPublic(false)}
                  className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>

                <h2 className="text-2xl font-black text-slate-900 mb-1 flex items-center gap-3">
                  <ShoppingBag className="w-6 h-6 text-uiu-emerald" /> Share Public Resource
                </h2>
                <p className="text-slate-400 font-medium text-sm mb-6 ml-1">
                  Share household items, electronics, furniture, etc.
                </p>

                <div className="space-y-5">

                  {/* Title */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Title *</label>
                    <input required type="text" placeholder="What are you sharing?"
                      value={newPublic.title}
                      onChange={(e) => setNewPublic({ ...newPublic, title: e.target.value })}
                      className="w-full mt-1 px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-800 focus:border-uiu-emerald transition-all" />
                  </div>

                  {/* Name */}


                  {/* Category & Condition */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Category</label>
                      <select value={newPublic.category}
                        onChange={(e) => setNewPublic({ ...newPublic, category: e.target.value })}
                        className="w-full mt-1 px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-800 appearance-none focus:border-uiu-emerald transition-all">
                        {["Electronics", "Books", "Furniture", "Stationery", "Clothing", "Sports", "Others"].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Condition</label>
                      <select value={newPublic.condition}
                        onChange={(e) => setNewPublic({ ...newPublic, condition: e.target.value })}
                        className="w-full mt-1 px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-800 appearance-none focus:border-uiu-emerald transition-all">
                        <option>Excellent</option><option>Brand New</option><option>Like New</option><option>Good</option><option>Fair</option>
                      </select>
                    </div>
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Image (Optional)</label>
                    <div onClick={() => document.getElementById('user-public-img-up').click()}
                      className="mt-1 w-full aspect-video rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:border-uiu-emerald transition-all">
                      <input id="user-public-img-up" type="file" accept="image/*" className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setPublicPreview(reader.result);
                              setNewPublic(prev => ({ ...prev, image: reader.result }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      {publicPreview
                        ? <img src={publicPreview} className="w-full h-full object-cover" alt="preview" />
                        : <><Image className="w-8 h-8 text-slate-300 mb-2" /><span className="text-[10px] font-bold text-slate-400">Click to upload photo</span></>
                      }
                    </div>
                  </div>

                  {/* Resource File Upload */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Resource File (Optional)</label>
                    <div className="mt-1 flex items-center gap-3">
                      <button type="button" onClick={() => document.getElementById('user-public-doc-up').click()}
                        className="px-5 py-3 rounded-xl bg-slate-50 border border-slate-100 font-bold text-slate-600 hover:bg-slate-100 transition-all flex items-center gap-2 text-xs">
                        <Download className="w-4 h-4" /> {publicFileName ? `✓ ${publicFileName}` : "Upload File"}
                      </button>
                      <input id="user-public-doc-up" type="file" className="hidden" onChange={handlePublicFileSelect} />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Description</label>
                    <textarea rows={3} placeholder="Share some details about the item..."
                      value={newPublic.description}
                      onChange={(e) => setNewPublic({ ...newPublic, description: e.target.value })}
                      className="w-full mt-1 px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-800 resize-none focus:border-uiu-emerald transition-all" />
                  </div>

                  {/* Submit */}
                  <button type="submit" disabled={isSubmittingPublic}
                    className={`w-full py-4 text-white font-black rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 ${isSubmittingPublic ? "bg-slate-400 cursor-not-allowed" : "bg-uiu-emerald hover:bg-emerald-600"
                      }`}>
                    {isSubmittingPublic ? (
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

        {/* BOTTOM CONTENT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">

          {/* MY POSTS */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col gap-6"
          >
            <div className="flex justify-between items-end">
              <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <Package className="w-6 h-6 text-uiu-emerald" /> My Resource Posts
              </h3>
            </div>

            <div className="flex flex-col gap-4">
              {myPosts.length > 0 ? myPosts.map((post) => (
                <div key={post.id} className="bg-white/60 backdrop-blur-xl border border-white rounded-[1.5rem] p-6 shadow-sm group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      {post.image ? (
                        <img src={post.image} className="w-12 h-12 rounded-xl object-cover border border-slate-100" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100"><Package className="w-6 h-6" /></div>
                      )}
                      <div>
                        <h4 className="text-xl font-black text-slate-800 leading-tight mb-1">{post.title}</h4>
                        <p className="text-[10px] font-black text-uiu-emerald uppercase tracking-widest">{post.category || post.subject} • {post.condition || post.resourceCondition}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="p-2 rounded-lg bg-slate-50 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Published Recently
                    </span>
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm flex items-center gap-2 ${post.statusStyle}`}>
                      <CheckCircle className="w-3 h-3 text-uiu-emerald" />
                      Live in Marketplace
                    </span>
                  </div>
                </div>
              )) : (
                <div className="py-12 text-center text-slate-400 font-medium italic bg-white/30 rounded-[1.5rem] border border-dashed border-slate-200">
                  You haven't posted any resources yet.
                </div>
              )}

              {/* POST NEW ITEM BUTTONS */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setIsPosting(true)}
                  className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-uiu-emerald/20 rounded-[1.5rem] bg-uiu-emerald/5 hover:bg-uiu-emerald/10 text-uiu-emerald transition-all group"
                >
                  <div className="p-3 bg-white rounded-xl shadow-md group-hover:scale-110 transition-transform">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="font-black text-[10px] uppercase tracking-widest">Post Academic</span>
                </button>
                <button
                  onClick={() => setIsPostingPublic(true)}
                  className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-uiu-orange/20 rounded-[1.5rem] bg-uiu-orange/5 hover:bg-uiu-orange/10 text-uiu-orange transition-all group"
                >
                  <div className="p-3 bg-white rounded-xl shadow-md group-hover:scale-110 transition-transform">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="font-black text-[10px] uppercase tracking-widest">Post Public</span>
                </button>
              </div>
            </div>
          </motion.div>

          {/* SENT REQUESTS */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col gap-6"
          >
            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <History className="w-6 h-6 text-uiu-orange" /> My Active Requests
            </h3>
            <div className="flex flex-col gap-4">
              {myRequests.length > 0 ? myRequests.map((req) => (
                <div key={req.id} className="bg-white/40 backdrop-blur-xl border border-white rounded-[1.5rem] p-6 shadow-sm">
                  {req.status?.toLowerCase() === "rejected" ? (
                    <>
                      <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-2 italic">Admin Decision</p>
                      <h4 className="text-xl font-black text-slate-800 mb-4">{req.title}</h4>
                      <div className="p-4 rounded-2xl border bg-rose-50/70 border-rose-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg shadow-sm text-rose-500">
                            <X className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-black text-[10px] uppercase tracking-widest text-rose-600 block">Post Rejected</span>
                            <span className="text-[10px] text-rose-400 font-medium">Your post did not meet the guidelines.</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(req.id)}
                          className="p-2 text-rose-300 hover:text-rose-600 transition-colors"
                          title="Dismiss"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 italic">Awaiting Admin Verification</p>
                      <h4 className="text-xl font-black text-slate-800 mb-6">{req.title}</h4>
                      <div className={`p-4 rounded-2xl border flex items-center justify-between ${req.statusStyle}`}>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg shadow-sm text-amber-500 animate-pulse"><Clock className="w-5 h-5" /></div>
                          <span className="font-black text-[10px] uppercase tracking-widest">Pending Approval</span>
                        </div>
                        <button
                          onClick={() => handleDelete(req.id)}
                          className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )) : (
                <div className="py-12 bg-emerald-50/30 border-2 border-dashed border-emerald-100/50 rounded-[2rem] flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-uiu-emerald shadow-sm shadow-emerald-500/10">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-400 px-10">All your resource requests are approved and live in the Marketplace!</p>
                </div>
              )}
              <div className="p-6 bg-amber-50/50 border border-amber-100 rounded-[1.5rem] flex gap-4">
                <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
                <p className="text-xs font-medium text-amber-800/80 leading-relaxed">
                  Remember to mark a request as "Received" once you collect the item to earn your <span className="font-black">50 Eco-Points</span> bonus!
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
