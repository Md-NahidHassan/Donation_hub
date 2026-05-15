"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { 
  ArrowLeft, MessageCircle, Send, User, Clock, Tag, 
  ShieldCheck, AlertCircle, Package, Share2, Heart,
  MessageSquare, MoreHorizontal, Reply, CornerDownRight, Trash2, TrendingUp,
  Download, CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { mockDb } from "@/utils/mockDb";

function ResourceDetailsContent() {
  const searchParams = useSearchParams();
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
          const res = await fetch(`http://127.0.0.1:8080/api/public-resources/${id}`);
          if (res.ok) data = await res.json();
        } else {
          const res = await fetch(`http://127.0.0.1:8080/api/resources/${id}`);
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
            fetch(`http://127.0.0.1:8080/api/resources/view/${type}/${id}`, { method: 'PUT' })
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
        const res = await fetch(`http://127.0.0.1:8080/api/comments/${type}/${id}`);
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
            const res = await fetch(`http://127.0.0.1:8080/api/resources/react/status/${type}/${id}/${email}`);
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
      const res = await fetch("http://127.0.0.1:8080/api/comments/add", {
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
      const res = await fetch(`http://127.0.0.1:8080/api/resources/react/${type}/${id}/${reactionType}/${user.email}`, {
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

      <main className="max-w-7xl mx-auto px-6 py-10 relative z-10 flex flex-col">
        
        {/* BACK BUTTON */}
        <header className="mb-8 md:mb-12">
          <Link href="/dashboard" 
            className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/50 backdrop-blur-md border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-slate-700 font-bold hover:bg-white/90 hover:text-slate-900 transition-all w-max text-xs">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* LEFT: IMAGE & DESCRIPTION */}
          <div className="lg:col-span-7 space-y-8">
            <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="aspect-video rounded-[2.5rem] overflow-hidden bg-slate-100 border border-slate-100 shadow-2xl shadow-slate-200/50 relative group">
              {item.image ? (
                <img src={item.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={item.title} />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-slate-300">
                  <Package className="w-20 h-20" />
                  <p className="font-black text-xs uppercase tracking-widest">No Image Available</p>
                </div>
              )}
              <div className="absolute top-6 left-6 flex gap-2">
                 <span className="px-4 py-1.5 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-black text-uiu-emerald uppercase tracking-widest shadow-sm">
                   {item.category || item.subject}
                 </span>
                 <span className="px-4 py-1.5 bg-uiu-emerald text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                   {item.condition}
                 </span>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity:0, y:20 }} 
              animate={{ opacity:1, y:0 }} 
              transition={{ delay: 0.1 }}
              className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-[2.5rem] p-8 shadow-sm space-y-6"
            >
              <h1 className="text-4xl font-black text-slate-900 leading-tight">{item.title}</h1>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-slate-400 font-bold text-sm">
                  <Clock className="w-4 h-4" /> Posted {item.postedDate || "Recently"}
                </div>
                <div className="flex items-center gap-2 text-uiu-emerald font-black text-sm">
                  <ShieldCheck className="w-4 h-4" /> Verified Post
                </div>
              </div>
              <div className="h-px bg-slate-100/50" />
              <div>
                <h3 className="text-lg font-black text-slate-800 mb-4">Description</h3>
                <p className="text-slate-600 font-medium leading-relaxed text-lg">
                  {item.description || "No detailed description provided for this item. Please contact the owner for more information regarding the item's current state and availability."}
                </p>
              </div>

              {/* DOWNLOAD ACTION */}
              <div className="pt-6 border-t border-slate-100/50 space-y-6">
                {(item.fileUrl || item.downloadUrl) ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleDownload}
                    className="group relative w-full py-4 px-8 rounded-2xl font-black text-white text-lg flex items-center justify-center gap-3 overflow-hidden shadow-xl shadow-emerald-500/10"
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
                  <div className="w-full py-4 px-8 rounded-2xl font-black text-slate-400 text-base flex items-center justify-center gap-2 bg-slate-50 border border-slate-100">
                    <Download className="w-5 h-5" />
                    No Download Available
                  </div>
                )}

                {/* Info Note */}
                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                  <p className="text-xs font-medium text-blue-700 leading-relaxed">
                    Downloading this resource earns you <span className="font-black">+10 Eco-Points</span>. Help the community by sharing!
                  </p>
                </div>
              </div>
            </motion.div>

            {/* COMMENTS SECTION */}
            <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm space-y-8">
               <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                 <MessageSquare className="w-6 h-6 text-uiu-emerald" /> Community Comments ({comments.length})
               </h3>
               
               <form onSubmit={handlePostComment} className="relative">
                 <textarea 
                   value={newComment}
                   onChange={(e) => setNewComment(e.target.value)}
                   placeholder="Ask a question or leave a comment..."
                   className="w-full p-5 pr-14 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-uiu-emerald/10 focus:border-uiu-emerald transition-all resize-none min-h-[100px]"
                 />
                 <button type="submit" className="absolute bottom-4 right-4 p-3 bg-uiu-emerald text-white rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all">
                   <Send className="w-5 h-5" />
                 </button>
               </form>

               <div className="space-y-6 max-h-[500px] overflow-y-auto no-scrollbar pr-2">
                 {comments.map((comm, i) => (
                   <motion.div initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay: i * 0.05 }} key={comm.id} className="flex gap-4 group">
                     <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200 shadow-sm">
                       <User className="w-5 h-5" />
                     </div>
                     <div className="flex-1 space-y-1">
                       <div className="flex items-center justify-between">
                         <span className="font-black text-slate-800 text-sm">{comm.userName}</span>
                         <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                         {new Date(comm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </span>
                       </div>
                       
                        <p className="text-slate-600 font-medium text-sm bg-slate-50/50 p-4 rounded-2xl rounded-tl-none border border-slate-100 group-hover:bg-white transition-colors">{comm.content}</p>
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
                                    const res = await fetch(`http://127.0.0.1:8080/api/comments/${comm.id}`, { method: 'DELETE' });
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
                     <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                        <MessageCircle className="w-8 h-8" />
                     </div>
                     <p className="text-sm font-bold text-slate-400">No comments yet. Be the first to ask!</p>
                   </div>
                 )}
               </div>
            </div>
          </div>

          {/* RIGHT: OWNER INFO & ACTION */}
          <div className="lg:col-span-5 space-y-6">
            <div className="sticky top-28 space-y-6">
              
              {/* OWNER CARD */}
              <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-uiu-emerald/5 blur-3xl rounded-full" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                   <User className="w-3 h-3" /> Resource Owner
                </h3>
                <div className="flex items-center gap-5 mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-uiu-emerald to-teal-400 p-0.5 shadow-lg group-hover:rotate-3 transition-transform">
                    <div className="w-full h-full bg-white rounded-[0.9rem] flex items-center justify-center">
                       <User className="w-8 h-8 text-uiu-emerald" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-900 mb-1">{item.postedBy}</h4>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Fast Responder
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Link href={`/chat?receiver=${encodeURIComponent(item.postedBy)}&receiverId=${item.firebaseUid || ""}&receiverEmail=${item.postedByEmail || item.userEmail || ""}&item=${encodeURIComponent(item.title)}`} className="w-full py-4 bg-uiu-emerald text-white font-black rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all">
                    <MessageCircle className="w-5 h-5" /> Chat with {item.postedBy.split(' ')[0]}
                  </Link>
                  <button className="w-full py-4 bg-slate-50 text-slate-500 font-black rounded-2xl border border-slate-100 hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                    <AlertCircle className="w-5 h-5" /> Report Listing
                  </button>
                </div>

                <div className="mt-8 p-5 bg-amber-50 rounded-[1.5rem] border border-amber-100/50 flex gap-4">
                   <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
                   <p className="text-[11px] font-medium text-amber-900/70 leading-relaxed">
                     <span className="font-black">Safety Tip:</span> Always meet in public places (like UIU cafeteria) and verify the item before closing the deal.
                   </p>
                </div>
              </motion.div>

              {/* REACTIONS / IMPACT */}
              <div className="grid grid-cols-1 gap-4">
                 <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-xl shadow-slate-200/40">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 text-center">React to this post</p>
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
                           className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all ${reaction.color} ${isActive ? "bg-slate-50 scale-110 ring-2 ring-current" : "hover:scale-110"}`}
                         >
                           <span className="text-2xl">{reaction.emoji}</span>
                           <span className="text-[10px] font-black uppercase tracking-tighter">{count} {reaction.label}</span>
                         </button>
                       );
                     })}
                   </div>
                 </div>
                 <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex items-center justify-between">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Post Views</p>
                   <p className="text-xl font-black text-slate-900 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-orange-500" /> {item?.viewCount || 0}</p>
                 </div>
              </div>

            </div>
          </div>

        </div>
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
