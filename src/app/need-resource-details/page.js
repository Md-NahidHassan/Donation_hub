"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, useMotionValue, useSpring } from "framer-motion";
import {
    ArrowLeft, User, ShieldCheck, Tag, Clock, Package,
    FileText, AlertCircle, CheckCircle2, MessageCircle,
    Send, MessageSquare, Reply, Trash2, TrendingUp, HandHeart, Info
} from "lucide-react";
import Link from "next/link";
import UserAvatar from "@/components/UserAvatar";

const API = "http://localhost:8080/api/need-resource";
const COMMENTS_API = "http://localhost:8080/api/comments";

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

function NeedResourceDetailsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
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

    useEffect(() => {
        const userStr = localStorage.getItem("user");
        if (userStr) {
            setUser(JSON.parse(userStr));
        }
    }, []);

    useEffect(() => {
        setIsMounted(true);
        if (!itemId) return;

        // Read user once inside effect — NOT in dependency array
        const userStr = localStorage.getItem("user");
        const currentUser = userStr ? JSON.parse(userStr) : null;

        const fetchItem = async () => {
            try {
                const res = await fetch(`${API}/${itemId}`, { cache: "no-store" });
                if (res.ok) {
                    const data = await res.json();
                    setItem(data);

                    // ── View tracking: 1 view per browser SESSION per post ──
                    // Using sessionStorage (not localStorage) so:
                    //   • Same user refreshing → no extra count ✅
                    //   • Different user on same browser, different session → 1 count each ✅
                    //   • Two users in same browser tab-session → only 1 count total ✅
                    const type = "NEED_RESOURCE";
                    const viewSessionKey = `viewed_${type}_${itemId}`; // no email — session-scoped
                    if (!sessionStorage.getItem(viewSessionKey)) {
                        sessionStorage.setItem(viewSessionKey, "true");
                        fetch(`http://localhost:8080/api/resources/view/${type}/${itemId}`, { method: 'PUT' })
                            .then(async (vRes) => {
                                if (vRes.ok) {
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
                const res = await fetch(`${COMMENTS_API}/NEED_RESOURCE/${itemId}`, { cache: "no-store" });
                if (res.ok) {
                    const data = await res.json();
                    setComments(data);
                }
            } catch (err) { console.error("Error fetching comments:", err); }
        }

        // ── Per-user reaction status from backend ──────────────────────────
        async function fetchUserReaction(email) {
            try {
                const res = await fetch(`http://localhost:8080/api/resources/react/status/NEED_RESOURCE/${itemId}/${encodeURIComponent(email)}`, { cache: "no-store" });
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

        fetchComments();
        if (currentUser?.email) fetchUserReaction(currentUser.email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itemId]); // Only re-run when itemId changes — user is read from localStorage inside

    const handlePostComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !user) return;

        try {
            const res = await fetch(`${COMMENTS_API}/add`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    resourceId: itemId,
                    resourceType: "NEED_RESOURCE",
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
        } catch (err) { console.error("Error posting comment:", err); }
    };

    const handleReact = async (reactionType) => {
        if (!user || !itemId) return;

        try {
            const res = await fetch(`http://localhost:8080/api/resources/react/NEED_RESOURCE/${itemId}/${reactionType}/${user.email}`, {
                method: "PUT"
            });

            if (res.ok) {
                const updatedItem = await res.json();
                setItem(updatedItem);
                if (userReaction === reactionType) setUserReaction(null);
                else setUserReaction(reactionType);
            }
        } catch (err) { console.error("Error reacting:", err); }
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
        <div className="flex min-h-screen font-sans bg-gradient-to-b from-[#f0f9ff] via-[#fbf8f3] to-[#fff3ec] relative overflow-hidden">
            {/* BACKGROUND EFFECTS */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                {isMounted && (
                    <motion.div
                        style={{ x: smoothX, y: smoothY }}
                        className="absolute top-[-15vw] left-[-15vw] w-[30vw] h-[30vw] rounded-full bg-blue-400/15 blur-[120px] pointer-events-none z-10"
                    />
                )}
                <motion.div
                    animate={{ x: ['0vw', '30vw', '-20vw', '0vw'], y: ['0vh', '-20vh', '30vh', '0vh'], scale: [1, 1.3, 0.9, 1] }}
                    transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[10%] left-[20%] w-[45vw] h-[45vw] rounded-[100%] bg-indigo-400/15 blur-[130px]"
                />
                <motion.div
                    animate={{ x: ['0vw', '-40vw', '10vw', '0vw'], y: ['0vh', '40vh', '-10vh', '0vh'], scale: [1, 0.8, 1.2, 1] }}
                    transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[30%] right-[10%] w-[50vw] h-[50vw] rounded-[100%] bg-cyan-400/10 blur-[140px]"
                />
                <div className="absolute inset-0 backdrop-blur-[60px] z-[-1]" />
                <motion.div
                    animate={{ backgroundPosition: ['0px 0px', '40px 40px'] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_100%_100%_at_50%_0%,#000_50%,transparent_120%)] opacity-50 z-[0]"
                />
            </div>

            {/* MAIN CONTENT */}
            <main className="max-w-5xl mx-auto w-full px-4 py-4 md:py-5 z-10 flex flex-col relative">
                <header className="mb-4 md:mb-5">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 backdrop-blur-md border border-white/80 shadow-sm text-slate-700 font-bold hover:bg-white/90 hover:text-slate-900 transition-all group w-max text-xs"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Dashboard
                    </Link>
                </header>

                {!item && isMounted && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-20 text-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
                            <AlertCircle className="w-8 h-8 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 mb-1">Request Not Found</h2>
                            <p className="text-slate-400 font-medium text-sm">This request may have been fulfilled or removed.</p>
                        </div>
                        <Link href="/need-resource" className="px-6 py-3 rounded-xl bg-blue-500 text-white font-black shadow-md hover:bg-blue-600 transition-all text-sm">
                            Browse Requests
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
                                className={`bg-white/60 backdrop-blur-xl border border-white/80 rounded-[1.2rem] p-4 shadow-sm space-y-4 ${item.urgencyLevel === "Urgent" ? 'ring-2 ring-red-400/50' : ''}`}
                            >
                                <div className="space-y-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-bold text-[10px] uppercase tracking-wider">
                                            <HandHeart className="w-3 h-3" /> Needed Resource
                                        </span>
                                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-bold text-[10px] uppercase tracking-wider">
                                            {item.category}
                                        </span>
                                        {item.urgencyLevel === "Urgent" && (
                                            <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-rose-500 text-white font-black text-[10px] uppercase tracking-wider shadow-sm animate-pulse shadow-rose-500/20">
                                                <AlertCircle className="w-3 h-3" /> Urgent
                                            </span>
                                        )}
                                        {item.urgencyLevel === "High" && (
                                            <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-orange-500 text-white font-black text-[10px] uppercase tracking-wider shadow-sm shadow-orange-500/20">
                                                <AlertCircle className="w-3 h-3" /> High Priority
                                            </span>
                                        )}
                                    </div>
                                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                                        {item.requestTitle}
                                    </h1>
                                </div>

                                <div className="p-3 bg-white/40 backdrop-blur-md rounded-[0.8rem] border border-white/60">
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                                        <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Detailed Reason / Description</h3>
                                    </div>
                                    <p className="text-slate-600 font-medium leading-relaxed text-[13px] whitespace-pre-wrap">
                                        {item.description}
                                    </p>
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
                                    <MessageSquare className="w-4 h-4 text-blue-500" /> Responses ({comments.length})
                                </h3>

                                <form onSubmit={handlePostComment} className="relative">
                                    <textarea
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Offer help or ask for clarification..."
                                        className="w-full p-3 pr-10 bg-white/40 border border-white/60 rounded-xl font-bold text-slate-700 text-xs outline-none focus:ring-2 focus:ring-blue-400/10 focus:border-blue-400 transition-all resize-none min-h-[60px]"
                                    />
                                    <button type="submit" className="absolute bottom-2 right-2 p-2 bg-blue-500 text-white rounded-lg shadow-md hover:scale-105 active:scale-95 transition-all">
                                        <Send className="w-4 h-4" />
                                    </button>
                                </form>

                                <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar pr-1">
                                    {comments.map((comm, i) => (
                                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} key={comm.id} className="flex gap-3 group">
                                            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0 border border-blue-100 shadow-sm overflow-hidden">
                                                <UserAvatar email={comm.userEmail} name={comm.userName} className="w-full h-full" iconClassName="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-black text-slate-800 text-xs">{comm.userName}</span>
                                                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        {formatDateTime(comm.createdAt)}
                                                    </span>
                                                </div>
                                                <p className="text-slate-600 font-medium text-xs bg-white/40 p-3.5 rounded-xl rounded-tl-none border border-white/60 group-hover:bg-white transition-colors leading-relaxed">{comm.content}</p>
                                                <div className="flex items-center gap-3 pt-0.5">
                                                    <button
                                                        onClick={() => { setNewComment(`@${comm.userName} `); document.querySelector('textarea')?.focus(); }}
                                                        className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-500 transition-colors flex items-center gap-1"
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
                                            <p className="text-xs font-bold text-slate-400">No responses yet. Be the first to help out!</p>
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
                                className="rounded-[1.2rem] bg-gradient-to-br from-indigo-500 to-blue-600 p-4 shadow-xl w-full relative flex items-center justify-center overflow-hidden group min-h-[100px]"
                            >
                                <div className="absolute inset-0 opacity-20">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="absolute rounded-full bg-white"
                                            style={{ width: `${80 + i * 40}px`, height: `${80 + i * 40}px`, top: `${15 + i * 5}%`, left: `${10 + i * 5}%`, opacity: 0.3 }} />
                                    ))}
                                </div>
                                <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.4, ease: "easeOut" }} className="relative z-10 flex flex-col items-center gap-3 text-center">
                                    <div className="p-4 bg-white/20 rounded-[1.2rem] backdrop-blur-md border border-white/30 shadow-md text-white">
                                        <HandHeart className="w-10 h-10" />
                                    </div>
                                    <p className="font-black text-white/90 tracking-[0.15em] text-[10px] uppercase bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm shadow-sm">{item.category} Need</p>
                                </motion.div>
                            </motion.div>

                            {/* Poster Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-[1.2rem] p-4 shadow-sm"
                            >
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3">Requested By</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100 border border-white shadow-inner text-blue-500 shrink-0 overflow-hidden">
                                        <UserAvatar email={item.postedByEmail} name={item.postedBy} className="w-full h-full" iconClassName="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-black text-slate-800 text-sm leading-tight">{item.postedBy}</h3>
                                        <div className="flex items-center gap-1 text-emerald-500 font-bold text-[10px] mt-0.5">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            Active Student
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100/50">
                                    <div className="space-y-0.5">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Posted On</p>
                                        <p className="font-bold text-slate-700 text-xs">{formatDateTime(item.createdAt)}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Urgency</p>
                                        <p className={`font-bold text-xs ${item.urgencyLevel === 'Urgent' ? 'text-red-500' : item.urgencyLevel === 'High' ? 'text-orange-500' : 'text-slate-700'}`}>{item.urgencyLevel}</p>
                                    </div>
                                </div>
                                <div className="space-y-2 mt-4">
                                    {user && user.email === item.postedByEmail ? (
                                        <button
                                            onClick={async () => {
                                                if (confirm("Are you sure you want to withdraw your request?")) {
                                                    try {
                                                        const res = await fetch(`http://localhost:8080/api/need-resource/${item.id}`, { method: 'DELETE' });
                                                        if (res.ok) router.push('/dashboard');
                                                    } catch (err) { console.error('Error deleting:', err); }
                                                }
                                            }}
                                            className="w-full py-2.5 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-100 font-black rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all text-xs group"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> Withdraw Request
                                        </button>
                                    ) : (
                                        <Link href={`/chat?receiver=${encodeURIComponent(item.postedBy)}&receiverId=${item.firebaseUid || ""}&receiverEmail=${item.postedByEmail || ""}&item=${encodeURIComponent("Regarding Request: " + item.requestTitle)}`} className="w-full py-2.5 bg-blue-600 text-white font-black rounded-lg shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 hover:bg-blue-700 transition-all text-xs group">
                                            <MessageCircle className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> Contact & Offer Help
                                        </Link>
                                    )}
                                </div>
                            </motion.div>

                            {/* Reactions */}
                            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-[1.2rem] p-4 shadow-sm">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Give feedback</p>
                                <div className="flex items-center justify-around">
                                    {[
                                        { type: "LIKE", emoji: "👍", label: "Helpful", countKey: "likeCount", color: "hover:bg-blue-50 text-blue-500" },
                                        { type: "LOVE", emoji: "❤️", label: "Supporting", countKey: "loveCount", color: "hover:bg-rose-50 text-rose-500" },
                                        { type: "SAD", emoji: "😢", label: "Prayers", countKey: "sadCount", color: "hover:bg-amber-50 text-amber-500" },
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
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Info className="w-3 h-3" /> Views</p>
                                <p className="text-lg font-black text-slate-900 flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5 text-blue-500" /> {item.viewCount}</p>
                            </motion.div>

                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default function NeedResourceDetailsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#f0f9ff] to-[#fff3ec]">
                <div className="w-8 h-8 rounded-full border-4 border-blue-400 border-t-transparent animate-spin" />
            </div>
        }>
            <NeedResourceDetailsContent />
        </Suspense>
    );
}