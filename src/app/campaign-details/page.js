"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, Target, Share2, QrCode, ArrowLeft, Heart,
  Calendar, Users, TrendingUp, Zap, X, Copy, Check,
  Building2, Smartphone, Package, Coins, Link2, ExternalLink,
  CreditCard, ArrowRight, MessageSquare, Send, User, Reply, Trash2, MessageCircle, AlertCircle
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { mockDb } from "@/utils/mockDb";

// ── Copyable field ───────────────────────────────────────────────────────────
function CopyField({ label, value, mono = false }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white/60 border border-slate-100">
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
        <p className={`text-sm font-bold text-slate-800 truncate ${mono ? "font-mono tracking-widest" : ""}`}>{value}</p>
      </div>
      <button
        onClick={copy}
        className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-all ${copied ? "bg-uiu-emerald text-white" : "bg-slate-100 text-slate-400 hover:bg-uiu-emerald/10 hover:text-uiu-emerald"
          }`}
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ── Main Content ─────────────────────────────────────────────────────────────
function CampaignDetailsContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const ref = searchParams.get("ref"); // "share" = opened via shared link → hide back nav
  const [campaign, setCampaign] = useState(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);
  const [targetTime, setTargetTime] = useState(null);

  // Donate modal
  const [showDonate, setShowDonate] = useState(false);
  const [donateTab, setDonateTab] = useState("online"); // online | mobile | bank | qr
  const [donationAmount, setDonationAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Share modal
  const [showShare, setShowShare] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Comment & React System
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [user, setUser] = useState(null);
  const [userReaction, setUserReaction] = useState(null);

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/campaign-details?id=${id || campaign?.id}&ref=share`
    : "";

  // ── Persist endTime per campaign so it never resets across page loads ──────
  const getPersistedEndTime = (campaignId) => {
    try {
      const stored = localStorage.getItem(`ecoKnot_endTime_${campaignId}`);
      return stored ? parseInt(stored) : null;
    } catch { return null; }
  };
  const savePersistedEndTime = (campaignId, endTimeMs) => {
    try { localStorage.setItem(`ecoKnot_endTime_${campaignId}`, String(endTimeMs)); } catch { }
  };

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) setUser(JSON.parse(userStr));
  }, []);

  // ── Increment view count once per session on page load ───────────────────
  useEffect(() => {
    if (!id) return;
    const viewKey = `viewed_CAMPAIGN_${id}`;
    const countKey = `campaign_viewCount_${id}`;
    const stored = parseInt(localStorage.getItem(countKey) || '0');
    if (!sessionStorage.getItem(viewKey)) {
      sessionStorage.setItem(viewKey, 'true');
      const next = stored + 1;
      localStorage.setItem(countKey, String(next));
      setCampaign(prev => prev ? { ...prev, viewCount: next } : prev);
      fetch(`http://localhost:8080/api/resources/view/CAMPAIGN/${id}`, { method: 'PUT' }).catch(() => {});
    } else {
      // Restore stored count on revisit
      if (stored > 0) setCampaign(prev => prev ? { ...prev, viewCount: stored } : prev);
    }
  }, [id]);

  // ── Load user's stored reaction (runs once when id is known) ─────────────
  useEffect(() => {
    if (!id) return;
    const stored = localStorage.getItem(`campaign_reaction_user_${id}`);
    if (stored) setUserReaction(stored);
  }, [id]);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    const currentUser = userStr ? JSON.parse(userStr) : null;

    const transform = (data) => {
      return mockDb.mapCampaign(data);
    };

    const fetchCampaign = async () => {
      const res = await fetch(`http://localhost:8080/api/campaigns/${id}`).catch(() => null);
      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (data) { setCampaign(transform(data)); return; }
      }
      const allRes = await fetch("http://localhost:8080/api/campaigns").catch(() => null);
      if (allRes && allRes.ok) {
        const all = await allRes.json().catch(() => null);
        if (all) {
          const found = all.find(c => c.id?.toString() === id);
          if (found) { setCampaign(transform(found)); return; }
        }
      }
      const mockAll = mockDb.getCampaigns();
      const mockFound = mockAll.find(c => c.id?.toString() === id) || mockAll[0];
      if (mockFound) setCampaign(transform(mockFound));
    };

    const fetchComments = async () => {
      try {
        const res = await fetch(`http://localhost:8080/api/comments/CAMPAIGN/${id}`);
        if (res.ok) setComments(await res.json());
      } catch (err) { console.error("Error fetching comments:", err); }
    };

    if (id) {
      fetchCampaign();
      fetchComments();
    }
  }, [id]);  // ← Only re-fetch when id changes, NOT when user changes

  // Load reactions & views from localStorage (works without login / backend)
  useEffect(() => {
    if (!campaign?.id) return;
    const campaignId = campaign.id.toString();

    // Restore user reaction from localStorage
    const storedUserReaction = localStorage.getItem(`campaign_reaction_user_${campaignId}`);
    if (storedUserReaction) setUserReaction(storedUserReaction);
  }, [campaign?.id]);

  useEffect(() => {
    if (campaign && campaign.sslCommerzEnabled === false && donateTab === "online") {
      setDonateTab("mobile");
    }
  }, [campaign, donateTab]);

  useEffect(() => {
    if (!campaign?.endTime) return;
    setTargetTime(new Date(campaign.endTime).getTime());
  }, [campaign]);

  useEffect(() => {
    if (!targetTime) return;
    const tick = () => {
      const diff = targetTime - Date.now();
      if (diff <= 0) { setIsExpired(true); setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [targetTime]);

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 3000);
  };

  const handleOnlinePayment = async () => {
    if (!donationAmount || parseFloat(donationAmount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    setIsProcessing(true);

    try {
      const response = await fetch(`http://localhost:8080/api/payments/init?campaignId=${id}&amount=${donationAmount}`, {
        method: "POST",
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(`Failed to initialize payment. Server response: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      console.error("Payment Error:", error);
      alert("Something went wrong with the payment gateway.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    try {
      const res = await fetch("http://localhost:8080/api/comments/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceId: id,
          resourceType: "CAMPAIGN",
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

  const handleReact = (reactionType) => {
    // Always use URL `id` as the stable storage key
    const storageKey = `campaign_reactions_${id}`;
    const userKey = `campaign_reaction_user_${id}`;

    const stored = JSON.parse(
      localStorage.getItem(storageKey) ||
      JSON.stringify({ LIKE: campaign?.likeCount || 0, LOVE: campaign?.loveCount || 0, SAD: campaign?.sadCount || 0 })
    );
    const currentUserReaction = localStorage.getItem(userKey);

    if (currentUserReaction === reactionType) {
      // Toggle off
      stored[reactionType] = Math.max(0, (stored[reactionType] || 0) - 1);
      localStorage.removeItem(userKey);
      setUserReaction(null);
    } else {
      // Remove old reaction if switching
      if (currentUserReaction && stored[currentUserReaction] !== undefined) {
        stored[currentUserReaction] = Math.max(0, (stored[currentUserReaction] || 0) - 1);
      }
      stored[reactionType] = (stored[reactionType] || 0) + 1;
      localStorage.setItem(userKey, reactionType);
      setUserReaction(reactionType);
    }

    localStorage.setItem(storageKey, JSON.stringify(stored));
    setCampaign(prev => ({
      ...prev,
      likeCount: stored.LIKE || 0,
      loveCount: stored.LOVE || 0,
      sadCount: stored.SAD || 0,
    }));

    // Non-blocking backend sync
    if (user?.email) {
      fetch(`http://localhost:8080/api/resources/react/CAMPAIGN/${id}/${reactionType}/${user.email}`, {
        method: 'PUT'
      }).catch(() => {});
    }
  };

  let qrUrl = null;
  const paymentQRs = campaign?.paymentQRs || [];

  if (paymentQRs.length > 0) {
    qrUrl = paymentQRs[0].image;
  } else if (campaign && (campaign.qrCode || campaign.qrCodeImage)) {
    const backendQr = campaign.qrCode || campaign.qrCodeImage;
    if (!backendQr.startsWith('http') && !backendQr.startsWith('blob:') && !backendQr.startsWith('data:')) {
      qrUrl = `http://localhost:8080/${backendQr.startsWith('/') ? backendQr.slice(1) : backendQr}`;
    } else {
      qrUrl = backendQr;
    }
  }

  const hasBanks = campaign?.bankAccounts?.length > 0;

  if (!campaign) return (
    <div className="flex h-screen items-center justify-center bg-[#fbfcfb]">
      <div className="w-16 h-16 border-4 border-uiu-emerald border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const isActuallyExpired = isExpired || (campaign && mockDb.isCampaignExpired(campaign));

  // If campaign is expired, block access to details
  if (isActuallyExpired && campaign) {
    return (
      <div className="flex flex-col min-h-screen font-sans bg-gradient-to-b from-[#f2faf6] via-[#fbf8f3] to-[#fff3ec] items-center justify-center p-6">
        <div className="text-center p-10 bg-white/60 backdrop-blur-xl rounded-[2.5rem] shadow-xl border border-white max-w-md w-full">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-6 opacity-80" />
          <h1 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Campaign Ended</h1>
          <p className="text-slate-500 font-medium mb-8 leading-relaxed">This campaign's duration has expired and it is no longer available for public viewing or donations.</p>
          <Link href="/public-campaigns" className="flex items-center justify-center gap-2 w-full py-4 bg-uiu-emerald hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 text-white font-black rounded-2xl transition-all hover:scale-105 active:scale-95">
             <ArrowLeft className="w-5 h-5" /> Back to Campaigns
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen font-sans bg-gradient-to-b from-[#f2faf6] via-[#fbf8f3] to-[#fff3ec] relative overflow-x-hidden">
      {/* BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[45vw] h-[45vw] bg-uiu-emerald/10 blur-[130px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[40vw] h-[40vw] bg-uiu-orange/10 blur-[140px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-white/40 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8 md:py-12">
        {/* BACK NAV */}
        {ref !== "share" && (
          <header className="mb-12">
            <Link href={ref === "home" ? "/" : "/dashboard"} className="group inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/60 backdrop-blur-md border border-white shadow-sm hover:bg-white hover:shadow-xl transition-all">
              <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:-translate-x-1 transition-transform" />
              <span className="font-black text-slate-700">Back to {ref === "home" ? "Home Page" : "Dashboard"}</span>
            </Link>
          </header>
        )}

        <main>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

            {/* LEFT: DETAILS & COMMENTS */}
            <div className="lg:col-span-7 space-y-8">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                className="p-10 md:p-12 rounded-[3.5rem] bg-white/70 backdrop-blur-xl border border-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                  <Target className="w-64 h-64 -mr-20 -mt-20" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <span className={`px-4 py-1.5 text-[10px] font-black tracking-widest uppercase rounded-full border ${isExpired ? "bg-rose-50 text-rose-500 border-rose-200" : "bg-uiu-emerald/10 text-uiu-emerald border-uiu-emerald/20"}`}>
                      {isExpired ? "Ended" : "Live Campaign"}
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                      <Users className="w-3.5 h-3.5" /> {campaign.donors || 0} Supporters
                    </span>
                  </div>

                  {campaign.image && (
                    <div className="w-full h-64 md:h-80 mb-8 rounded-3xl overflow-hidden relative shadow-lg">
                      <img src={campaign.image} alt={campaign.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
                    </div>
                  )}

                  <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] mb-8">{campaign.title}</h1>
                  <p className="text-lg md:text-xl text-slate-500 font-medium leading-relaxed mb-12">
                    {campaign.description || "Join us in making a difference! Your contribution helps provide essential resources to students in need across United International University."}
                  </p>

                  {/* COUNTDOWN + GOAL */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    <div className="p-8 rounded-[2.5rem] bg-slate-900 text-white shadow-xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-uiu-orange/20 blur-3xl -mr-16 -mt-16 group-hover:bg-uiu-orange/40 transition-all" />
                      <div className="flex items-center gap-3 mb-6">
                        <Clock className="w-5 h-5 text-uiu-orange" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {isExpired ? "Campaign Ended" : "Ends in"}
                        </span>
                      </div>
                      <div className="flex gap-4 items-end">
                        {[
                          { val: timeLeft.days, label: "Days" },
                          { val: timeLeft.hours, label: "Hrs" },
                          { val: timeLeft.minutes, label: "Min" },
                          { val: timeLeft.seconds, label: "Sec", orange: true },
                        ].map(({ val, label, orange }) => (
                          <div key={label} className="flex flex-col items-center">
                            <span className={`text-3xl font-black leading-none tabular-nums ${orange ? "text-uiu-orange" : ""}`}>
                              {String(val).padStart(2, "0")}
                            </span>
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 mt-2">{label}</span>
                          </div>
                        ))}
                        <Calendar className="w-8 h-8 text-white/10 ml-auto" />
                      </div>
                    </div>

                    <div className="p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-xl">
                      <div className="flex items-center gap-3 mb-6">
                        <Target className="w-5 h-5 text-uiu-emerald" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Goal</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-slate-900">{campaign.goal || 500}</span>
                        <span className="text-slate-400 font-bold">Items</span>
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-uiu-emerald" />
                        <span className="text-xs font-bold text-uiu-emerald">{campaign.progress || 0}% achieved so far</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-end px-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
                      <span className="text-base font-black text-slate-900">{campaign.progress || 0}%</span>
                    </div>
                    <div className="h-6 w-full bg-slate-100/50 rounded-full overflow-hidden p-1 border border-slate-100 shadow-inner">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${campaign.progress || 0}%` }} transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-uiu-emerald via-emerald-400 to-teal-400 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.3)]" />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* COMMENTS SECTION */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-10 shadow-xl space-y-8"
              >
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                  <MessageSquare className="w-6 h-6 text-uiu-emerald" /> Campaign Discussion ({comments.length})
                </h3>

                <form onSubmit={handlePostComment} className="relative">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share your thoughts or ask a question..."
                    className="w-full p-5 pr-14 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-uiu-emerald/10 focus:border-uiu-emerald transition-all resize-none min-h-[100px]"
                  />
                  <button type="submit" className="absolute bottom-4 right-4 p-3 bg-uiu-emerald text-white rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all">
                    <Send className="w-5 h-5" />
                  </button>
                </form>

                <div className="space-y-6 max-h-[500px] overflow-y-auto no-scrollbar pr-2">
                  {comments.map((comm, i) => (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} key={comm.id} className="flex gap-4 group">
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
                                if (confirm("Delete this comment?")) {
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
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                        <MessageCircle className="w-8 h-8" />
                      </div>
                      <p className="text-sm font-bold text-slate-400">No discussion yet. Start the conversation!</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* RIGHT: ACTION & STATS */}
            <div className="lg:col-span-5 flex flex-col gap-8">

              {/* QUOTE CARD */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="p-10 rounded-[3.5rem] bg-white border border-white shadow-2xl flex flex-col items-center text-center group relative overflow-hidden">

                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-uiu-emerald via-uiu-orange to-uiu-emerald opacity-30" />

                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <Heart className="w-7 h-7 text-uiu-emerald fill-uiu-emerald/20" />
                </div>

                <p className="text-xl md:text-2xl font-black text-slate-800 leading-tight italic tracking-tight mb-8">
                  "Serving humanity earns the Creator's grace. Your kindness can light up someone's life."
                </p>

                <div className="w-full flex flex-col gap-4">
                  <button
                    onClick={() => { setShowDonate(true); setShowSuccess(false); }}
                    className="w-full py-5 rounded-2xl bg-uiu-emerald text-white font-black text-lg shadow-xl shadow-emerald-200 hover:bg-emerald-600 hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                  >
                    Donate Now <Heart className="w-6 h-6 fill-white" />
                  </button>
                  <button
                    onClick={() => setShowShare(true)}
                    className="w-full py-5 rounded-2xl bg-uiu-orange text-white font-black text-lg shadow-xl shadow-orange-200 hover:bg-orange-600 hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                  >
                    Share Campaign <Share2 className="w-6 h-6" />
                  </button>
                  <Link
                    href={`/chat?receiver=${encodeURIComponent("EcoNexus Admin")}&receiverId=ECO_ADMIN&receiverEmail=admin@econexus.com&item=${encodeURIComponent(campaign.title)}`}
                    className="w-full py-5 rounded-2xl bg-slate-100 text-slate-500 font-black text-lg border border-slate-200 hover:bg-slate-200 hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                  >
                    Chat with Organizer <MessageCircle className="w-6 h-6" />
                  </Link>
                </div>
              </motion.div>

              {/* REACTIONS CARD */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 text-center">React to this campaign</p>
                <div className="flex items-center justify-around">
                  {[
                    { type: "LIKE", emoji: "👍", label: "Like", countKey: "likeCount", color: "hover:bg-blue-50 text-blue-500" },
                    { type: "LOVE", emoji: "❤️", label: "Love", countKey: "loveCount", color: "hover:bg-rose-50 text-rose-500" },
                    { type: "SAD", emoji: "😢", label: "Sad", countKey: "sadCount", color: "hover:bg-amber-50 text-amber-500" },
                  ].map((reaction) => {
                    const count = campaign[reaction.countKey] || 0;
                    const isActive = userReaction === reaction.type;

                    return (
                      <button
                        key={reaction.type}
                        onClick={() => handleReact(reaction.type)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all ${reaction.color} ${isActive ? "bg-slate-50 scale-110 ring-2 ring-current shadow-md" : "hover:scale-110"}`}
                      >
                        <span className="text-3xl">{reaction.emoji}</span>
                        <span className="text-[10px] font-black uppercase tracking-tighter">{count} {reaction.label}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>

              {/* STATS CARD */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="bg-white rounded-[1.5rem] p-6 border border-slate-100 shadow-sm flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Campaign Views</p>
                <p className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-orange-500" /> {campaign.viewCount || 0}
                </p>
              </motion.div>

              {/* TRUST BADGE */}
              <div className="flex items-center justify-center gap-6 p-8 bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-uiu-emerald flex items-center justify-center">
                    <Zap className="w-5 h-5 fill-uiu-emerald" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Verified</p>
                    <p className="text-xs font-black text-slate-800 tracking-tight">EcoKnot Impact</p>
                  </div>
                </div>
                <div className="w-px h-8 bg-slate-200" />
                <p className="text-[10px] font-bold text-slate-500 leading-tight">100% Secure & Transparent<br />in every contribution.</p>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* DONATE MODAL */}
      <AnimatePresence>
        {showDonate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowDonate(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-md" />

            <motion.div initial={{ scale: 0.92, y: 24, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 24, opacity: 0 }} transition={{ type: "spring", damping: 26, stiffness: 300 }}
              className="relative w-full max-w-lg bg-white/90 backdrop-blur-2xl rounded-[2.5rem] border border-white/60 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="absolute -top-16 -right-16 w-40 h-40 bg-uiu-emerald/15 blur-3xl rounded-full pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-uiu-orange/15 blur-3xl rounded-full pointer-events-none" />

              <div className="relative z-10 p-8">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Donate Now 💚</h2>
                    <p className="text-xs font-bold text-slate-400 mt-0.5 italic uppercase tracking-widest">{campaign.title}</p>
                  </div>
                  <button onClick={() => setShowDonate(false)}
                    className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-rose-50 hover:text-rose-500 text-slate-400 flex items-center justify-center transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex bg-slate-100/80 rounded-2xl p-1 mb-6 gap-1">
                  {[
                    { id: "online", label: "💳 Online", show: campaign.sslCommerzEnabled !== false },
                    { id: "mobile", label: "📱 Mobile", show: paymentQRs.length > 0 },
                    { id: "bank", label: "🏦 Bank", show: hasBanks },
                    { id: "qr", label: "⬛ QR Code", show: !!qrUrl },
                  ].filter(t => t.show).map(tab => (
                    <button key={tab.id} onClick={() => setDonateTab(tab.id)}
                      className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${donateTab === tab.id ? "bg-white shadow-sm text-slate-800" : "text-slate-400 hover:text-slate-600"
                        }`}>{tab.label}</button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {donateTab === "online" && (
                    <motion.div key="online" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                      className="space-y-6 py-2">
                      <div className="p-6 rounded-[2rem] bg-gradient-to-br from-uiu-emerald/5 to-uiu-orange/5 border border-white shadow-inner">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                            <CreditCard className="w-6 h-6 text-uiu-emerald" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Instant Payment</p>
                            <h3 className="text-lg font-black text-slate-800 tracking-tight">Global Giving Hub</h3>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="relative">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400">৳</span>
                            <input
                              type="number"
                              placeholder="Enter Amount"
                              value={donationAmount}
                              onChange={(e) => setDonationAmount(e.target.value)}
                              className="w-full pl-10 pr-5 py-4 rounded-2xl bg-white border border-slate-100 outline-none font-bold text-slate-800 shadow-sm focus:border-uiu-emerald transition-all"
                            />
                          </div>

                          <button
                            onClick={handleOnlinePayment}
                            disabled={isProcessing}
                            className={`w-full py-5 rounded-2xl font-black text-lg shadow-xl transition-all flex items-center justify-center gap-3 ${isProcessing
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                              : "bg-uiu-emerald text-white shadow-emerald-100 hover:bg-emerald-600 hover:-translate-y-1"
                              }`}
                          >
                            {isProcessing ? (
                              <div className="w-6 h-6 border-3 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                            ) : (
                              <>Donate Via Payment <ArrowRight className="w-5 h-5" /></>
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  {donateTab === "mobile" && (
                    <motion.div key="mobile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                      className="space-y-3">
                      <div className="grid grid-cols-1 gap-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Manual QR Codes:</p>
                        {paymentQRs.map((qr, i) => (
                          <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{qr.provider}</span>
                            </div>
                            <div className="flex flex-col md:flex-row items-center gap-4">
                              <div className="w-40 h-40 rounded-xl bg-white border border-slate-200 overflow-hidden shadow-sm shrink-0">
                                <img src={qr.image} alt={qr.provider} className="w-full h-full object-contain" />
                              </div>
                              {qr.number && (
                                <div className="flex-1 w-full">
                                  <CopyField label="Payment Number" value={qr.number} mono />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {donateTab === "bank" && (
                    <motion.div key="bank" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                      className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Bank transfer details:</p>
                      {(campaign.bankAccounts || []).map((bank, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">🏦 Account {i + 1}</p>
                          {bank.bankName && <CopyField label="Bank Name" value={bank.bankName} />}
                          {bank.branch && <CopyField label="Branch" value={bank.branch} />}
                          {bank.accountName && <CopyField label="Account Holder" value={bank.accountName} />}
                          {bank.accountNumber && <CopyField label="Account Number" value={bank.accountNumber} mono />}
                        </div>
                      ))}
                    </motion.div>
                  )}

                  {donateTab === "qr" && (
                    <motion.div key="qr" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                      className="flex flex-col items-center gap-4 py-2">
                      {paymentQRs.length > 0 ? (
                        <div className="w-full space-y-6">
                          {paymentQRs.map((qr, i) => (
                            <div key={i} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                              <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{qr.provider}</span>
                              <div className="w-56 h-56 rounded-2xl bg-white border border-slate-100 shadow-lg overflow-hidden flex items-center justify-center relative">
                                <img src={qr.image} alt={qr.provider} className="w-full h-full object-contain" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : qrUrl ? (
                        <div className="w-56 h-56 rounded-2xl bg-white border border-slate-100 shadow-lg overflow-hidden flex items-center justify-center relative">
                          <img src={qrUrl} alt="Donation QR" className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="py-10 text-center text-slate-400 font-bold text-sm">No QR codes available.</div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SHARE MODAL */}
      <AnimatePresence>
        {showShare && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowShare(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-md" />

            <motion.div initial={{ scale: 0.92, y: 24, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 24, opacity: 0 }} transition={{ type: "spring", damping: 26, stiffness: 300 }}
              className="relative w-full max-w-md bg-white/90 backdrop-blur-2xl rounded-[2.5rem] border border-white shadow-2xl overflow-hidden"
            >
              <div className="relative z-10 p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black text-slate-900">Share Campaign 🔗</h2>
                  <button onClick={() => setShowShare(false)}
                    className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-rose-50 hover:text-rose-500 text-slate-400 flex items-center justify-center transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="flex-1 text-xs font-bold text-slate-600 truncate">{shareUrl}</p>
                  <button onClick={copyLink}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${linkCopied ? "bg-uiu-emerald text-white" : "bg-white border border-slate-200 text-slate-500 hover:border-uiu-emerald hover:text-uiu-emerald"
                      }`}>
                    {linkCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CampaignDetailsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#fbfcfb]">
        <div className="w-16 h-16 border-4 border-uiu-emerald border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CampaignDetailsContent />
    </Suspense>
  );
}
