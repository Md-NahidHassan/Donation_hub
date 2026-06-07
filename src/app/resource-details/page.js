"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import {
  ArrowLeft, MessageCircle, Send, User, Clock, Tag,
  ShieldCheck, AlertCircle, Package, Share2, Heart,
  MessageSquare, MoreHorizontal, Reply, CornerDownRight, Trash2, TrendingUp,
  Download, CheckCircle2, FileText, Info
} from "lucide-react";
import Link from "next/link";
import { mockDb } from "@/utils/mockDb";
import UserAvatar from "@/components/UserAvatar";

function formatDateTime(dt) {
  if (!dt) return "—";
  try {
    let dateStr = dt;
    if (Array.isArray(dt)) {
      dateStr = `${dt[0]}-${String(dt[1]).padStart(2, '0')}-${String(dt[2]).padStart(2, '0')}T${String(dt[3] || 0).padStart(2, '0')}:${String(dt[4] || 0).padStart(2, '0')}`;
    } else {
      dateStr = String(dt).replace(" ", "T");
    }
    const d = new Date(dateStr);
    return d.toLocaleString("en-BD", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return dt; }
}

function ResourceDetailsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");
  const [item, setItem] = useState(null);
  const [downloaded, setDownloaded] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [user, setUser] = useState(null);
  const [userReaction, setUserReaction] = useState(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { damping: 50, stiffness: 400, mass: 0.5 });
  const smoothY = useSpring(mouseY, { damping: 50, stiffness: 400, mass: 0.5 });

  // Initial User Load - Only runs once on mount
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  // Data Fetching - Runs when ID or User changes
  useEffect(() => {
    // We don't call setUser here anymore to avoid infinite loops
    const userStr = localStorage.getItem("user");
    const currentUser = userStr ? JSON.parse(userStr) : null;

    async function fetchItem() {
      if (!id) return;

      const type = searchParams.get("type");
      setIsLoading(true);

      try {
        let data = null;
        if (type === "public") {
          const res = await fetch(`http://localhost:8080/api/public-resources/${id}`);
          if (res.ok) data = await res.json();
        } else {
          const res = await fetch(`http://localhost:8080/api/resources/${id}`);
          if (res.ok) data = await res.json();
        }

        if (data) {
          setItem({
            ...data,
            type: type || (data.resourceCondition ? "academic" : "public"),
            condition: data.conditionInfo || data.resourceCondition || data.condition
          });

          // Increment View Count (User specific)
          const userStr = localStorage.getItem("user");
          const currentUser = userStr ? JSON.parse(userStr) : null;
          const viewKey = currentUser
            ? `viewed_${type}_${id}_${currentUser.email}`
            : `viewed_${type}_${id}_guest`;

          if (!localStorage.getItem(viewKey)) {
            fetch(`http://localhost:8080/api/resources/view/${type}/${id}`, { method: 'PUT' })
              .then(async (vRes) => {
                if (vRes.ok) {
                  localStorage.setItem(viewKey, "true");
                  const updatedData = await vRes.json();
                  setItem(prev => ({ ...prev, viewCount: updatedData.viewCount }));
                }
              })
              .catch(err => console.error("Error incrementing view:", err));
          }
        }
      } catch (err) {
        console.error("Error fetching resource details:", err);
      } finally {
        setIsLoading(false);
      }
    }

    async function fetchComments() {
      const type = searchParams.get("type");
      try {
        const res = await fetch(`http://localhost:8080/api/comments/${type}/${id}`);
        if (res.ok) {
          const data = await res.json();
          setComments(data);
        }
      } catch (err) {
        console.error("Error fetching comments:", err);
      }
    }

    async function fetchUserReaction(email) {
      const type = searchParams.get("type");
      try {
        const res = await fetch(`http://localhost:8080/api/resources/react/status/${type}/${id}/${email}`);
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

    if (id) {
      fetchItem();
      fetchComments();
      if (currentUser) fetchUserReaction(currentUser.email);
    }
  }, [id, searchParams, user]);


  useEffect(() => {
    setIsMounted(true);
    const handleMouseMove = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    const type = searchParams.get("type")?.toUpperCase();

    try {
      const res = await fetch("http://localhost:8080/api/comments/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceId: id,
          resourceType: type,
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


  const handleDownload = () => {
    const url = item?.fileUrl || item?.downloadUrl;
    if (!url) {
      alert("No download link available for this resource.");
      return;
    }

    try {
      const link = document.createElement("a");
      link.href = url;

      let fileName = item.title ? item.title.replace(/\s+/g, '_') : "resource";
      if (url.startsWith("data:")) {
        const mimeMatch = url.match(/data:([^;]+);/);
        if (mimeMatch) {
          const mime = mimeMatch[1];
          const ext = mime.split('/')[1] || "file";
          fileName += `.${ext}`;
        }
      } else if (url.includes("/")) {
        const parts = url.split("/");
        const last = parts[parts.length - 1];
        if (last.includes(".")) fileName = last;
      }

      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (err) {
      console.error("Download failed:", err);
      window.open(url, "_blank");
    }
  };

  const handleReact = async (reactionType) => {
    if (!user || !id) return;

    const type = searchParams.get("type")?.toUpperCase();

    try {
      const res = await fetch(`http://localhost:8080/api/resources/react/${type}/${id}/${reactionType}/${user.email}`, {
        method: "PUT"
      });

      if (res.ok) {
        const updatedItem = await res.json();
        setItem({
          ...updatedItem,
          type: type.toLowerCase(),
          condition: updatedItem.conditionInfo || updatedItem.resourceCondition || updatedItem.condition
        });

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

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-uiu-emerald/30 border-t-uiu-emerald rounded-full animate-spin" />
        <p className="font-bold text-slate-400">Loading details...</p>
      </div>
    </div>
  );

  if (!item) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-6 text-center">
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
      </div>
    </div>
  );

  return (
    <div className="min-h-screen font-sans bg-gradient-to-b from-[#f2faf6] via-[#fbf8f3] to-[#fff3ec] relative overflow-hidden">

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

      <main className="max-w-5xl mx-auto w-full px-4 py-4 md:py-5 z-10 flex flex-col relative font-sans">
        <header className="mb-4 md:mb-5">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 backdrop-blur-md border border-white/80 shadow-sm text-slate-700 font-bold hover:bg-white/90 hover:text-slate-900 transition-all group w-max text-xs"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to dashboard
          </Link>
        </header>

        {!item && isMounted && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 mb-1">Resource Not Found</h2>
              <p className="text-slate-400 font-medium text-sm">This resource may have been claimed or removed.</p>
            </div>
            <Link href="/resource" className="px-6 py-3 rounded-xl bg-emerald-500 text-white font-black shadow-md hover:bg-emerald-600 transition-all text-sm">
              Browse Resources
            </Link>
          </motion.div>
        )}

        {item && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 pb-6 relative z-10">
            {/* LEFT (7/12) */}
            <div className="lg:col-span-7 flex flex-col gap-4 order-2 lg:order-1">

              {/* Main Content Card */}
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-[1.2rem] p-4 shadow-sm space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold text-[10px] uppercase tracking-wider">
                      <Package className="w-3 h-3" /> Marketplace
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-bold text-[10px] uppercase tracking-wider">
                      {item.category || item.subject}
                    </span>
                    <span className={`flex items-center gap-1 px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-wider shadow-sm ${item.status === 'Available' ? 'bg-emerald-500 text-white' : 'bg-slate-400 text-white'}`}>
                      {item.status || item.condition}
                    </span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                    {item.resourceName || item.title}
                  </h1>
                </div>

                <div className="p-3 bg-white/40 backdrop-blur-md rounded-[0.8rem] border border-white/60">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <FileText className="w-3 h-3 text-slate-400" />
                    <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Detailed Information</h3>
                  </div>
                  <p className="text-slate-600 font-medium leading-snug text-[13px] whitespace-pre-wrap">
                    {item.description}
                  </p>
                </div>

                {/* Actions Container */}
                <div className="space-y-4">
                  {/* Action Buttons */}
                  {(item.fileUrl || item.downloadUrl) ? (
                    <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100/50 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><Download className="w-5 h-5" /></div>
                        <div>
                          <p className="text-[8px] font-black text-emerald-600/60 uppercase tracking-widest">Digital Resource</p>
                          <p className="text-xs font-black text-emerald-700">Digital Copy Available</p>
                        </div>
                      </div>
                      <button
                        onClick={handleDownload}
                        className="px-4 py-2 bg-emerald-500 text-white font-black rounded-lg text-xs shadow-sm hover:bg-emerald-600 transition-all flex items-center gap-2"
                      >
                        {downloaded ? <><CheckCircle2 className="w-3 h-3" /> Get it Again</> : <><Download className="w-3 h-3" /> Download Now</>}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
                        <p className="text-[8px] font-black text-emerald-600/60 uppercase tracking-widest mb-1">Exchange Type</p>
                        <p className="text-sm font-black text-emerald-700">{item.exchangeType || "Standard"}</p>
                      </div>
                      <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100/50">
                        <p className="text-[8px] font-black text-blue-600/60 uppercase tracking-widest mb-1">Condition</p>
                        <p className="text-sm font-black text-blue-700">{item.conditionType || "Good"}</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* COMMENTS SECTION */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-[1.2rem] p-4 shadow-sm space-y-4"
              >
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-500" /> Inquiries ({comments.length})
                </h3>

                <form onSubmit={handlePostComment} className="relative">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Ask about availability or details..."
                    className="w-full p-3 pr-10 bg-white/40 border border-white/60 rounded-xl font-bold text-slate-700 text-xs outline-none focus:ring-2 focus:ring-emerald-400/10 focus:border-emerald-400 transition-all resize-none min-h-[60px]"
                  />
                  <button type="submit" className="absolute bottom-2 right-2 p-2 bg-emerald-500 text-white rounded-lg shadow-md hover:scale-105 active:scale-95 transition-all">
                    <Send className="w-4 h-4" />
                  </button>
                </form>

                <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar pr-1">
                  {comments.map((comm, i) => (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} key={comm.id} className="flex gap-3 group">
                      <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0 border border-emerald-100 shadow-sm overflow-hidden">
                        <UserAvatar email={comm.userEmail} name={comm.userName} className="w-full h-full" iconClassName="w-4 h-4" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-slate-800 text-xs">{comm.userName}</span>
                          <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(comm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-600 font-medium text-xs bg-white/40 p-3.5 rounded-xl rounded-tl-none border border-white/60 group-hover:bg-white transition-colors leading-relaxed">{comm.content}</p>
                        <div className="flex items-center gap-3 pt-0.5">
                          <button
                            onClick={() => { setNewComment(`@${comm.userName} `); document.querySelector('textarea')?.focus(); }}
                            className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-emerald-500 transition-colors flex items-center gap-1"
                          ><Reply className="w-2.5 h-2.5" /> Reply</button>
                          {user && user.email === comm.userEmail && (
                            <button
                              onClick={async () => {
                                if (confirm("Delete this comment?")) {
                                  try {
                                    const res = await fetch(`http://localhost:8080/api/comments/${comm.id}`, { method: 'DELETE' });
                                    if (res.ok) setComments(comments.filter(c => c.id !== comm.id));
                                  } catch (err) { console.error(err); }
                                }
                              }}
                              className="text-[9px] font-black text-rose-400 uppercase tracking-widest hover:text-rose-600 transition-colors flex items-center gap-1"
                            ><Trash2 className="w-2.5 h-2.5" /> Delete</button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {comments.length === 0 && (
                    <div className="py-8 text-center flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-white/40 rounded-full flex items-center justify-center text-slate-200">
                        <MessageCircle className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-400">No questions yet. Ask the owner something!</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* RIGHT — Sidebar (5/12) */}
            <div className="lg:col-span-5 flex flex-col gap-4 order-1 lg:order-2">

              <motion.div
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-[1.2rem] bg-gradient-to-br from-emerald-500 to-teal-600 p-4 shadow-xl w-full relative flex items-center justify-center overflow-hidden group min-h-[100px]"
              >
                <div className="absolute inset-0 opacity-20">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="absolute rounded-full bg-white"
                      style={{ width: `${80 + i * 40}px`, height: `${80 + i * 40}px`, top: `${15 + i * 5}%`, left: `${10 + i * 5}%`, opacity: 0.3 }} />
                  ))}
                </div>
                <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.4, ease: "easeOut" }} className="relative z-10 flex flex-col items-center gap-3 text-center">
                  <div className="p-4 bg-white/20 rounded-[1.2rem] backdrop-blur-md border border-white/30 shadow-md text-white">
                    <Package className="w-10 h-10" />
                  </div>
                  <p className="font-black text-white/90 tracking-[0.15em] text-[10px] uppercase bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm shadow-sm">{item.category}</p>
                </motion.div>
              </motion.div>

              {/* Poster Card */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-[1.2rem] p-4 shadow-sm"
              >
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3">Posted By</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100 border border-white shadow-inner text-emerald-600 shrink-0 overflow-hidden">
                    <UserAvatar email={item.postedByEmail || item.userEmail} name={item.postedBy} className="w-full h-full" iconClassName="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-slate-800 text-sm leading-tight">{item.postedBy}</h3>
                    <div className="flex items-center gap-1 text-emerald-500 font-bold text-[10px] mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified Eco-Member
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100/50">
                  <div className="space-y-0.5">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Posted On</p>
                    <p className="font-bold text-slate-700 text-xs">{formatDateTime(item.createdAt || item.postedDate)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Type</p>
                    <p className="font-bold text-emerald-500 text-xs">{item.exchangeType || "Item Exchange"}</p>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  {user && user.email === (item.postedByEmail || item.userEmail) ? (
                    <button
                      onClick={async () => {
                        if (confirm("Are you sure you want to delete this resource?")) {
                          try {
                            const res = await fetch(`http://localhost:8080/api/resources/${item.id}`, { method: 'DELETE' });
                            if (res.ok) router.push('/resource');
                          } catch (err) { console.error('Error deleting:', err); }
                        }
                      }}
                      className="w-full py-2.5 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-100 font-black rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all text-xs group"
                    >
                      <Trash2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> Remove Resource
                    </button>
                  ) : (
                    <Link href={`/chat?receiver=${encodeURIComponent(item.postedBy)}&receiverId=${item.firebaseUid || ""}&receiverEmail=${item.postedByEmail || item.userEmail || ""}&item=${encodeURIComponent(item.resourceName || item.title)}`} className="w-full py-2.5 bg-emerald-600 text-white font-black rounded-lg shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all text-xs group">
                      <MessageCircle className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> Message Owner
                    </Link>
                  )}
                </div>
              </motion.div>

              {/* Reactions */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-[1.2rem] p-4 shadow-sm">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">React to this item</p>
                <div className="flex items-center justify-around">
                  {[
                    { type: "LIKE", emoji: "👍", label: "Interested", countKey: "likeCount", color: "hover:bg-blue-50 text-blue-500" },
                    { type: "LOVE", emoji: "❤️", label: "Want it", countKey: "loveCount", color: "hover:bg-rose-50 text-rose-500" },
                    { type: "SAD", emoji: "😮", label: "Nifty", countKey: "sadCount", color: "hover:bg-amber-50 text-amber-500" },
                  ].map((reaction) => {
                    const count = item[reaction.countKey] || 0;
                    const isActive = userReaction === reaction.type;

                    return (
                      <button
                        key={reaction.type}
                        onClick={() => handleReact(reaction.type)}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${reaction.color} ${isActive ? "bg-white scale-105 ring-2 ring-current shadow-sm" : "hover:scale-105"}`}
                      >
                        <span className="text-xl">{reaction.emoji}</span>
                        <span className="text-[8px] font-black uppercase tracking-tighter">{count} {reaction.label}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-[1.2rem] p-4 shadow-sm flex items-center justify-between">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Info className="w-3 h-3" /> Potential Leads</p>
                <p className="text-lg font-black text-slate-900 flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> {item.viewCount || 0}</p>
              </motion.div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ResourceDetailsPage() {
  return (
    <Suspense fallback={<div>Loading page...</div>}>
      <ResourceDetailsContent />
    </Suspense>
  );
}
