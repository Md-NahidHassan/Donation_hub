"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, useMotionValue, useSpring } from "framer-motion";
import {
  ArrowLeft,
  User,
  ShieldCheck,
  Tag,
  Clock,
  MapPin,
  Flame,
  Phone,
  Droplets,
  Package,
  FileText,
  AlertCircle,
  CheckCircle2,
  MessageCircle,
  Send,
  MessageSquare,
  Reply,
  Trash2,
  TrendingUp,
  Calendar
} from "lucide-react";
import Link from "next/link";

const API = "http://localhost:8080/api/blood-donation";
const COMMENTS_API = "http://localhost:8080/api/comments";

const bloodBadge = (bg) => {
  const map = {
    "A+": "from-red-500 to-red-600", "A-": "from-red-700 to-red-800",
    "B+": "from-blue-500 to-blue-600", "B-": "from-blue-700 to-blue-800",
    "AB+": "from-purple-500 to-purple-600", "AB-": "from-purple-700 to-purple-800",
    "O+": "from-orange-500 to-orange-600", "O-": "from-orange-700 to-orange-800",
  };
  return map[bg] || "from-slate-500 to-slate-600";
};

function formatDateTime(dt) {
  if (!dt) return "—";
  try {
    let dateStr = dt;
    if (Array.isArray(dt)) {
      dateStr = `${dt[0]}-${String(dt[1]).padStart(2,'0')}-${String(dt[2]).padStart(2,'0')}T${String(dt[3]||0).padStart(2,'0')}:${String(dt[4]||0).padStart(2,'0')}`;
    } else {
      dateStr = String(dt).replace(" ", "T");
    }
    const d = new Date(dateStr);
    return d.toLocaleString("en-BD", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return dt; }
}

function BloodDonationDetailsContent() {
  const searchParams = useSearchParams();
  const itemId = searchParams.get("id");

  const [isMounted, setIsMounted] = useState(false);
  const [item, setItem] = useState(null);
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
      try {
        const res = await fetch(`${API}/${itemId}`);
        if (res.ok) {
          const data = await res.json();
          setItem(data);

          // Increment View Count (User specific)
          const type = "BLOOD_DONATION";
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
        const res = await fetch(`${COMMENTS_API}/BLOOD_DONATION/${itemId}`);
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
            const res = await fetch(`http://localhost:8080/api/resources/react/status/BLOOD_DONATION/${itemId}/${email}`);
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
      const res = await fetch(`${COMMENTS_API}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceId: itemId,
          resourceType: "BLOOD_DONATION",
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

    try {
      const res = await fetch(`http://localhost:8080/api/resources/react/BLOOD_DONATION/${itemId}/${reactionType}/${user.email}`, {
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

  return (
    <div className="flex min-h-screen font-sans bg-gradient-to-b from-[#fff5f5] via-[#fbf8f3] to-[#fff3ec] relative overflow-hidden">
      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {isMounted && (
          <motion.div
            style={{ x: smoothX, y: smoothY }}
            className="absolute top-[-15vw] left-[-15vw] w-[30vw] h-[30vw] rounded-full bg-red-400/15 blur-[120px] pointer-events-none z-10"
          />
        )}
        <motion.div
          animate={{ x: ['0vw', '30vw', '-20vw', '0vw'], y: ['0vh', '-20vh', '30vh', '0vh'], scale: [1, 1.3, 0.9, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute top-[10%] left-[20%] w-[45vw] h-[45vw] rounded-[100%] bg-rose-400/15 blur-[130px]"
        />
        <motion.div
          animate={{ x: ['0vw', '-40vw', '10vw', '0vw'], y: ['0vh', '40vh', '-10vh', '0vh'], scale: [1, 0.8, 1.2, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          className="absolute top-[30%] right-[10%] w-[50vw] h-[50vw] rounded-[100%] bg-orange-400/10 blur-[140px]"
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
              <h2 className="text-3xl font-black text-slate-800 mb-2">Request Not Found</h2>
              <p className="text-slate-400 font-medium">This request may have been fulfilled or removed.</p>
            </div>
            <Link href="/blood-donation" className="px-8 py-3.5 rounded-2xl bg-red-500 text-white font-black shadow-lg hover:bg-red-600 transition-all">
              Browse Blood Requests
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
                className={`bg-white/60 backdrop-blur-xl border border-white/80 rounded-[2.5rem] p-8 shadow-sm space-y-8 ${item.urgent ? 'ring-2 ring-red-400/50' : ''}`}
              >
                {/* Badges & Title */}
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-red-50 text-red-600 border border-red-100 font-bold text-xs uppercase tracking-wider">
                      <Droplets className="w-3.5 h-3.5" />
                      Blood Request
                    </span>
                    {item.urgent && (
                      <span className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-sm animate-pulse shadow-rose-500/20">
                        <Flame className="w-3.5 h-3.5" /> Urgent Needed
                      </span>
                    )}
                  </div>
                  <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.1]">
                    {item.hospitalName}
                  </h1>
                  {item.patientName && (
                    <p className="text-xl font-bold text-slate-500">Patient: {item.patientName}</p>
                  )}
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                  <div className="p-4 bg-rose-50/50 rounded-[1rem] border border-rose-100">
                    <MapPin className="w-4 h-4 text-rose-500 mb-2" />
                    <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Location</p>
                    <p className="font-bold text-slate-700 text-sm leading-tight">{item.location}</p>
                  </div>
                  <div className="p-4 bg-orange-50/50 rounded-[1rem] border border-orange-100">
                    <Clock className="w-4 h-4 text-orange-500 mb-2" />
                    <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Needed By</p>
                    <p className="font-bold text-slate-700 text-sm leading-tight">{formatDateTime(item.requiredTime)}</p>
                  </div>
                  <div className="p-4 bg-purple-50/50 rounded-[1rem] border border-purple-100">
                    <Package className="w-4 h-4 text-purple-500 mb-2" />
                    <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Bags</p>
                    <p className="font-bold text-slate-700 text-sm leading-tight">{item.requiredBags} bag(s)</p>
                  </div>
                  <div className="p-4 bg-green-50/50 rounded-[1rem] border border-green-100">
                    <Phone className="w-4 h-4 text-green-500 mb-2" />
                    <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Contact</p>
                    <a href={`tel:${item.contactNumber}`} className="font-black text-green-600 text-sm hover:underline">{item.contactNumber}</a>
                  </div>
                </div>

                {/* Reason / Details */}
                {item.reason && (
                  <div className="p-6 bg-white/40 backdrop-blur-md rounded-[1.5rem] border border-white/60">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Reason / Details</h3>
                    </div>
                    <p className="text-slate-600 font-medium leading-relaxed text-lg">
                      {item.reason}
                    </p>
                  </div>
                )}
              </motion.div>

              {/* COMMENTS SECTION */}
              <motion.div 
                initial={{ opacity:0, y:30 }} 
                animate={{ opacity:1, y:0 }} 
                transition={{ delay: 0.3 }} 
                className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-[2.5rem] p-8 shadow-sm space-y-8"
              >
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                  <MessageSquare className="w-6 h-6 text-red-400" /> Support & Q&A ({comments.length})
                </h3>
                
                <form onSubmit={handlePostComment} className="relative">
                  <textarea 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Ask a question or show support..."
                    className="w-full p-5 pr-14 bg-white/40 border border-white/60 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-red-400/10 focus:border-red-400 transition-all resize-none min-h-[100px]"
                  />
                  <button type="submit" className="absolute bottom-4 right-4 p-3 bg-red-400 text-white rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all">
                    <Send className="w-5 h-5" />
                  </button>
                </form>

                <div className="space-y-6 max-h-[500px] overflow-y-auto no-scrollbar pr-2">
                  {comments.map((comm, i) => (
                    <motion.div initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay: i * 0.05 }} key={comm.id} className="flex gap-4 group">
                      <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 shrink-0 border border-red-100 shadow-sm">
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
                             className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-red-400 transition-colors flex items-center gap-1"
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
                      <p className="text-sm font-bold text-slate-400">No comments yet. Be the first to respond!</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* RIGHT — Sidebar (5/12) */}
            <div className="lg:col-span-5 flex flex-col gap-8 order-1 lg:order-2">
              
              {/* Visual Card (Blood Group Badge) */}
              <motion.div
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                className={`rounded-[2.5rem] p-8 shadow-2xl w-full aspect-square relative flex items-center justify-center overflow-hidden group bg-gradient-to-br ${bloodBadge(item.bloodGroup)}`}
              >
                <div className="absolute inset-0 opacity-20">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="absolute rounded-full bg-white"
                      style={{ width: `${80 + i * 40}px`, height: `${80 + i * 40}px`, top: `${15 + i * 10}%`, left: `${10 + i * 10}%`, opacity: 0.3 }} />
                  ))}
                </div>
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="relative z-10 flex flex-col items-center gap-4"
                >
                  <span className="text-7xl md:text-9xl font-black text-white tracking-tighter drop-shadow-lg">{item.bloodGroup}</span>
                  <p className="font-black text-white/80 tracking-[0.2em] text-xs uppercase bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-sm">Blood Type Required</p>
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
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-red-100 to-rose-100 border border-white shadow-inner text-red-500 shrink-0">
                    <User className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-slate-800 text-xl">{item.postedBy}</h3>
                    <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-xs mt-1">
                      <ShieldCheck className="w-4 h-4" />
                      Verified Request
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-slate-100/50">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Posted On</p>
                    <p className="font-bold text-slate-700 text-sm">{formatDateTime(item.createdAt)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Type</p>
                    <p className="font-bold text-slate-700 text-sm">Blood Donation</p>
                  </div>
                </div>

                <div className="space-y-3 mt-8">
                  <Link href={`/chat?receiver=${encodeURIComponent(item.postedBy)}&receiverEmail=${item.postedByEmail || ""}&item=${encodeURIComponent(item.bloodGroup + " Blood for " + item.hospitalName)}`} className="w-full py-4 bg-red-500 text-white font-black rounded-2xl shadow-lg shadow-red-500/20 flex items-center justify-center gap-3 hover:bg-red-600 transition-all text-sm">
                    <MessageCircle className="w-5 h-5" /> Coordinate Privately
                  </Link>
                </div>
              </motion.div>

              {/* Reactions Card */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-[2.5rem] p-8 shadow-sm">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 text-center">React to this request</p>
                 <div className="flex items-center justify-around">
                   {[
                     { type: "LIKE", emoji: "👍", label: "Helpful", countKey: "likeCount", color: "hover:bg-blue-50 text-blue-500" },
                     { type: "LOVE", emoji: "❤️", label: "Supporting", countKey: "loveCount", color: "hover:bg-rose-50 text-rose-500" },
                     { type: "SAD",  emoji: "😢", label: "Prayers",  countKey: "sadCount", color: "hover:bg-amber-50 text-amber-500" },
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

export default function BloodDonationDetailsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#fff5f5] to-[#fff3ec]">
        <div className="w-8 h-8 rounded-full border-4 border-red-400 border-t-transparent animate-spin" />
      </div>
    }>
      <BloodDonationDetailsContent />
    </Suspense>
  );
}
