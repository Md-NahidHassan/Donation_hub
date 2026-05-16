"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, useMotionValue, useSpring } from "framer-motion";
import {
  ArrowLeft,
  User,
  ShieldCheck,
  Tag,
  Download,
  BookOpen,
  Package,
  Calendar,
  GraduationCap,
  FileText,
  AlertCircle,
  CheckCircle2,
  Star,
  Activity,
  MessageCircle,
  Send,
  MessageSquare,
  Reply,
  Trash2,
  TrendingUp,
  Clock
} from "lucide-react";
import Link from "next/link";
import { mockDb } from "@/utils/mockDb";

// Icon mapping
const iconMap = {
  BookOpen: BookOpen,
  Package: Package,
  Star: Star,
  Activity: Activity,
};

function ItemDetailsContent() {
  const searchParams = useSearchParams();
  const itemId = searchParams.get("id");

  const [isMounted, setIsMounted] = useState(false);
  const [item, setItem] = useState(null);
  const [downloaded, setDownloaded] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [user, setUser] = useState(null);
  const [userReaction, setUserReaction] = useState(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { damping: 50, stiffness: 400, mass: 0.5 });
  const smoothY = useSpring(mouseY, { damping: 50, stiffness: 400, mass: 0.5 });

  // Initial User Load
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
        setUser(JSON.parse(userStr));
    }
  }, []);

  // Data Fetching
  useEffect(() => {
    setIsMounted(true);
    if (!itemId) return;

    const userStr = localStorage.getItem("user");
    const currentUser = userStr ? JSON.parse(userStr) : null;

    const fetchItem = async () => {
      // 1. Try mockDb first (legacy)
      const mockItem = mockDb.getItemById(itemId);
      if (mockItem) {
        setItem(mockItem);
        return;
      }

      // 2. Fetch from backend
      try {
        const res = await fetch(`http://localhost:8080/api/resources/${itemId}`);
        if (res.ok) {
          const data = await res.json();

          const safeFileName = data.fileName ? encodeURIComponent(data.fileName) : null;
          let downloadUrl = safeFileName ? `/api/resources/download/${safeFileName}` : data.downloadUrl;

          if (downloadUrl && downloadUrl.startsWith("/")) {
            downloadUrl = `http://localhost:8080${downloadUrl}`;
          }

          setItem({
            ...data,
            condition: data.resourceCondition || data.condition,
            downloadUrl: downloadUrl
          });

          // Increment View Count (User specific)
          const userStr = localStorage.getItem("user");
          const currentUser = userStr ? JSON.parse(userStr) : null;
          const type = "ACADEMIC";
          const viewKey = currentUser 
            ? `viewed_${type}_${itemId}_${currentUser.email}` 
            : `viewed_${type}_${itemId}_guest`;

          if (!localStorage.getItem(viewKey)) {
            fetch(`http://localhost:8080/api/resources/view/${type}/${itemId}`, { method: 'PUT' })
              .then(async (vRes) => {
                if (vRes.ok) {
                    localStorage.setItem(viewKey, "true");
                    const updatedData = await vRes.json();
                    setItem(prev => ({ ...prev, viewCount: updatedData.viewCount }));
                }
              })
              .catch(err => console.error("Error incrementing view:", err));
          }
        } else {
          setItem(null);
        }
      } catch (err) {
        console.error("Error fetching item from backend:", err);
        setItem(null);
      }
    };

    fetchItem();

    async function fetchComments() {
      try {
        const res = await fetch(`http://localhost:8080/api/comments/ACADEMIC/${itemId}`);
        if (res.ok) {
          const data = await res.json();
          setComments(data);
        }
      } catch (err) {
        console.error("Error fetching comments:", err);
      }
    }

    async function fetchUserReaction(email) {
        try {
            const res = await fetch(`http://localhost:8080/api/resources/react/status/ACADEMIC/${itemId}/${email}`);
            if (res.ok) {
                const text = await res.text();
                if (text) {
                    const data = JSON.parse(text);
                    setUserReaction(data?.reactionType || null);
                } else {
                    setUserReaction(null);
                }
            }
        } catch (err) { console.error("Error fetching reaction status:", err); }
    }

    if (itemId) {
      fetchComments();
      if (currentUser) fetchUserReaction(currentUser.email);
    }
  }, [itemId, user]);


  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    try {
      const res = await fetch("http://localhost:8080/api/comments/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceId: itemId,
          resourceType: "ACADEMIC",
          userName: user.fullName || "User",
          userEmail: user.email,
          content: newComment
        })
      });

      if (res.ok) {
        const addedComment = await res.json();
        setComments([addedComment, ...comments]);
        setNewComment("");
      }
    } catch (err) {
      console.error("Error posting comment:", err);
    }
  };


  const handleReact = async (reactionType) => {
    if (!user || !itemId) return;

    const type = "ACADEMIC";

    try {
      const res = await fetch(`http://localhost:8080/api/resources/react/${type}/${itemId}/${reactionType}/${user.email}`, {
        method: "PUT"
      });

      if (res.ok) {
        const updatedItem = await res.json();
        setItem(updatedItem);
        
        // Update local status
        if (userReaction === reactionType) {
            setUserReaction(null);
        } else {
            setUserReaction(reactionType);
        }
      }
    } catch (err) {
      console.error("Error reacting:", err);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  const handleDownload = () => {
    let finalUrl = item.downloadUrl || (item.fileName ? `/api/resources/download/${item.fileName}` : null);

    if (finalUrl && finalUrl.startsWith("/")) {
      finalUrl = `http://localhost:8080${finalUrl}`;
    }

    if (!finalUrl) {
      alert("Error: No download link found for this item.");
      return;
    }

    try {
      const link = document.createElement("a");
      link.href = finalUrl;
      
      let fileName = item.title ? item.title.replace(/\s+/g, '_') : "academic_resource";
      if (item.fileName) fileName = item.fileName;
      
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (err) {
      console.error("Download failed:", err);
      window.location.assign(finalUrl);
    }
  };

  const IconComponent = item?.icon ? iconMap[item.icon] || Package : Package;

  return (
    <div className="flex min-h-screen font-sans bg-gradient-to-b from-[#f2faf6] via-[#fbf8f3] to-[#fff3ec] relative overflow-hidden">

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
        <motion.div
          animate={{ x: ['0vw', '20vw', '-30vw', '0vw'], y: ['0vh', '20vh', '-30vh', '0vh'], scale: [1, 1.2, 0.8, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[10%] left-[40%] w-[55vw] h-[55vw] rounded-[100%] bg-uiu-orange/15 blur-[150px]"
        />
        <div className="absolute inset-0 backdrop-blur-[60px] z-[-1]" />
        <motion.div
          animate={{ backgroundPosition: ['0px 0px', '40px 40px'] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_100%_100%_at_50%_0%,#000_50%,transparent_120%)] opacity-50 z-[0]"
        />
      </div>

      {/* MAIN CONTENT */}
      <main className="max-w-6xl mx-auto w-full px-6 py-8 md:py-12 z-10 flex flex-col relative">

        {/* BACK BUTTON */}
        <header className="mb-8 md:mb-12">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/50 backdrop-blur-md border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-slate-700 font-bold hover:bg-white/90 hover:text-slate-900 transition-all group w-max"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>
        </header>

        {/* ITEM NOT FOUND */}
        {!item && isMounted && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-32 text-center gap-6"
          >
            <div className="w-20 h-20 rounded-3xl bg-rose-50 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-rose-400" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-800 mb-2">Item Not Found</h2>
              <p className="text-slate-400 font-medium">This resource may have been removed or does not exist.</p>
            </div>
            <Link href="/dashboard" className="px-8 py-3.5 rounded-2xl bg-uiu-emerald text-white font-black shadow-lg hover:bg-emerald-600 transition-all">
              Browse All Resources
            </Link>
          </motion.div>
        )}

        {/* ITEM DETAILS GRID */}
        {item && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 pb-20 relative z-10">

            {/* LEFT — Main Info & Comments (7/12) */}
            <div className="lg:col-span-7 flex flex-col gap-8 order-2 lg:order-1">
              
              {/* Main Content Card */}
              <motion.div 
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-[2.5rem] p-8 shadow-sm space-y-8"
              >
                {/* Badges & Title */}
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-uiu-orange/10 border border-uiu-orange/20 text-uiu-orange font-bold text-xs uppercase tracking-wider">
                      <Tag className="w-3.5 h-3.5" />
                      {item.subject}
                    </span>
                    <span className="px-4 py-1.5 rounded-full bg-white/80 border border-white text-slate-500 font-bold text-xs uppercase tracking-wider">
                      {item.condition}
                    </span>
                    <span className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 font-bold text-[10px] uppercase tracking-wider">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                    </span>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.1]">
                    {item.title}
                  </h1>
                </div>

                {/* Description */}
                <div className="p-6 bg-white/40 backdrop-blur-md rounded-[1.5rem] border border-white/60">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Item Description</h3>
                  </div>
                  <p className="text-slate-600 font-medium leading-relaxed text-lg">
                    {item.description || "No description provided for this item. Contact the poster for more details."}
                  </p>
                </div>

                {/* Price & Action */}
                <div className="flex flex-col sm:flex-row items-center gap-6 pt-4">
                  <div className="flex items-center gap-4 p-4 bg-amber-50/60 border border-amber-100 rounded-2xl shrink-0 min-w-[140px]">
                    <div className="p-2.5 bg-amber-100 rounded-xl text-amber-600">
                      <Tag className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Price</p>
                      <p className="font-black text-amber-800 text-lg">{item.price || "Free "}</p>
                    </div>
                  </div>

                  {item.downloadUrl ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleDownload}
                      className="group relative flex-1 py-4 px-8 rounded-2xl font-black text-white text-lg flex items-center justify-center gap-3 overflow-hidden shadow-xl"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-uiu-emerald to-teal-500 group-hover:opacity-90 transition-opacity" />
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {downloaded ? (
                          <>
                            <CheckCircle2 className="w-6 h-6" /> Downloaded!
                          </>
                        ) : (
                          <>
                            <Download className="w-6 h-6 group-hover:animate-bounce" />
                            Download Resource
                          </>
                        )}
                      </span>
                    </motion.button>
                  ) : (
                    <div className="flex-1 py-4 px-8 rounded-2xl font-black text-slate-400 text-base flex items-center justify-center gap-2 bg-slate-50 border border-slate-100">
                      <Download className="w-5 h-5" />
                      No Download Available
                    </div>
                  )}
                </div>

                {/* Info Note */}
                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                  <p className="text-xs font-medium text-blue-700 leading-relaxed">
                    Downloading this resource earns you <span className="font-black">+10 Eco-Points</span>. Help the community by sharing!
                  </p>
                </div>
              </motion.div>

              {/* COMMENTS SECTION */}
              <motion.div 
                initial={{ opacity:0, y:30 }} 
                animate={{ opacity:1, y:0 }} 
                transition={{ delay: 0.3 }} 
                className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-[2.5rem] p-8 shadow-sm space-y-8"
              >
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                  <MessageSquare className="w-6 h-6 text-uiu-emerald" /> Item Q&A ({comments.length})
                </h3>
                
                <form onSubmit={handlePostComment} className="relative">
                  <textarea 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Ask a question about this item..."
                    className="w-full p-5 pr-14 bg-white/40 border border-white/60 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-uiu-emerald/10 focus:border-uiu-emerald transition-all resize-none min-h-[100px]"
                  />
                  <button type="submit" className="absolute bottom-4 right-4 p-3 bg-uiu-emerald text-white rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all">
                    <Send className="w-5 h-5" />
                  </button>
                </form>

                <div className="space-y-6 max-h-[500px] overflow-y-auto no-scrollbar pr-2">
                  {comments.map((comm, i) => (
                    <motion.div initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay: i * 0.05 }} key={comm.id} className="flex gap-4 group">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-400 shrink-0 border border-indigo-100 shadow-sm">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-slate-800 text-sm">{comm.userName}</span>
                          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(comm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-600 font-medium text-sm bg-white/40 p-4 rounded-2xl rounded-tl-none border border-white/60 group-hover:bg-white transition-colors">{comm.content}</p>

                        <div className="flex items-center gap-4 pt-1">
                           <button 
                             onClick={() => {
                               setNewComment(`@${comm.userName} `);
                               document.querySelector('textarea')?.focus();
                             }}
                             className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-uiu-emerald transition-colors flex items-center gap-1"
                           >
                             <Reply className="w-3 h-3" /> Reply
                           </button>
                           {user && user.email === comm.userEmail && (
                             <button 
                               onClick={async () => {
                                 if(confirm("Delete this comment?")) {
                                   try {
                                     const res = await fetch(`http://localhost:8080/api/comments/${comm.id}`, { method: 'DELETE' });
                                     if (res.ok) {
                                       setComments(comments.filter(c => c.id !== comm.id));
                                     }
                                   } catch (err) { console.error(err); }
                                 }
                               }}
                               className="text-[10px] font-black text-rose-400 uppercase tracking-widest hover:text-rose-600 transition-colors flex items-center gap-1"
                             >
                               <Trash2 className="w-3 h-3" /> Delete
                             </button>
                           )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {comments.length === 0 && (
                    <div className="py-10 text-center flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-white/40 rounded-full flex items-center justify-center text-slate-200">
                         <MessageCircle className="w-8 h-8" />
                      </div>
                      <p className="text-sm font-bold text-slate-400">No questions yet. Be the first to ask!</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* RIGHT — Sidebar (5/12) */}
            <div className="lg:col-span-5 flex flex-col gap-8 order-1 lg:order-2">
              
              {/* Visual Card (Icon) */}
              <motion.div
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-[2.5rem] bg-white/40 backdrop-blur-xl border border-white/60 p-8 shadow-sm w-full aspect-square relative flex items-center justify-center overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-uiu-emerald/10 blur-[60px] rounded-full" />
                <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-uiu-orange/10 blur-[60px] rounded-full" />
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="relative z-10 flex flex-col items-center gap-4"
                >
                  <div className="p-8 bg-white/80 rounded-[2.5rem] shadow-xl backdrop-blur-md border border-white">
                    <IconComponent className="w-24 h-24 text-uiu-emerald/80" />
                  </div>
                  <p className="font-black text-slate-400 tracking-[0.2em] text-xs uppercase">Academic Resource</p>
                </motion.div>
              </motion.div>

              {/* Poster Card */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-[2.5rem] p-8 shadow-sm"
              >
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Posted By</p>
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100 border border-white shadow-inner text-indigo-500 shrink-0">
                    <User className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-slate-800 text-xl">{item.postedBy}</h3>
                    <div className="flex items-center gap-1.5 text-uiu-emerald font-bold text-xs mt-1">
                      <ShieldCheck className="w-4 h-4" />
                      Verified EcoKnot Student
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-slate-100/50">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Posted On</p>
                    <p className="font-bold text-slate-700 text-sm">{item.postedDate || "Recent"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Department</p>
                    <p className="font-bold text-slate-700 text-sm">{item.department || "General"}</p>
                  </div>
                </div>

                <div className="space-y-3 mt-8">
                  <Link href={`/chat?receiver=${encodeURIComponent(item.postedBy)}&receiverId=${item.firebaseUid || ""}&receiverEmail=${item.postedByEmail || ""}&item=${encodeURIComponent(item.title)}`} className="w-full py-4 bg-uiu-emerald text-white font-black rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm">
                    <MessageCircle className="w-5 h-5" /> Chat with Owner
                  </Link>
                </div>
              </motion.div>

              {/* Reactions Card */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-[2.5rem] p-8 shadow-sm">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 text-center">React to this item</p>
                 <div className="flex items-center justify-around">
                   {[
                     { type: "LIKE", emoji: "👍", label: "Like", countKey: "likeCount", color: "hover:bg-blue-50 text-blue-500" },
                     { type: "LOVE", emoji: "❤️", label: "Love", countKey: "loveCount", color: "hover:bg-rose-50 text-rose-500" },
                     { type: "SAD",  emoji: "😢", label: "Sad",  countKey: "sadCount", color: "hover:bg-amber-50 text-amber-500" },
                   ].map((reaction) => {
                     const count = item[reaction.countKey] || 0;
                     const isActive = userReaction === reaction.type;
                     
                     return (
                       <button 
                         key={reaction.type}
                         onClick={() => handleReact(reaction.type)}
                         className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all ${reaction.color} ${isActive ? "bg-white scale-110 ring-2 ring-current shadow-md" : "hover:scale-110"}`}
                       >
                         <span className="text-3xl">{reaction.emoji}</span>
                         <span className="text-[10px] font-black uppercase tracking-tighter">{count} {reaction.label}</span>
                       </button>
                     );
                   })}
                 </div>
              </motion.div>

              {/* Stats Card */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-[1.5rem] p-6 shadow-sm flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Views</p>
                <p className="text-xl font-black text-slate-900 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-orange-500" /> {item.viewCount}</p>

              </motion.div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ItemDetailsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#f2faf6] to-[#fff3ec]">
        <div className="w-8 h-8 rounded-full border-4 border-uiu-emerald border-t-transparent animate-spin" />
      </div>
    }>
      <ItemDetailsContent />
    </Suspense>
  );
}
