"use client";

import { useState, useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Heart,
  Users,
  Clock,
  Target,
  TrendingUp,
  Flame,
  ShieldCheck,
  BookOpen,
  Zap,
  Loader2,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { mockDb } from "@/utils/mockDb";

export default function PublicCampaignsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsMounted(true);

    const fetchCampaigns = async () => {
      let backendCampaigns = [];
      try {
        setIsLoading(true);
        const response = await fetch("http://localhost:8080/api/campaigns");
        if (response.ok) {
          backendCampaigns = await response.json();
        }
      } catch (err) {
        console.warn("Fetch error, using cached data:", err);
        setError(err.message);
      } finally {
        const mockCampaigns = mockDb.getCampaigns();

        // Transform the data to ensure UI compatibility using central mapCampaign
        const mappedBackend = backendCampaigns.map(c => {
          const mapped = mockDb.mapCampaign(c);
          return {
            ...mapped,
            gradient: c.gradient || "from-emerald-500/10 to-teal-500/5",
            icon: typeof c.icon === 'string' ? <Zap className="w-10 h-10 text-amber-500" /> : c.icon
          };
        });

        const backendTitles = new Set(mappedBackend.map(c => c.title.toLowerCase()));
        const uniqueMock = mockCampaigns
          .filter(c => !backendTitles.has(c.title.toLowerCase()))
          .map(c => {
            const mapped = mockDb.mapCampaign(c);
            return {
              ...mapped,
              gradient: c.gradient || "from-emerald-500/10 to-teal-500/5",
              icon: typeof c.icon === 'string' ? <Zap className="w-10 h-10 text-amber-500" /> : c.icon
            };
          });

        const combined = [...mappedBackend, ...uniqueMock];

        // ── FILTER out expired campaigns ──────────────────────────────────────
        const activeCampaigns = combined.filter(c => {
          // If daysLeft is missing or NaN, assume it's new/active if we have no endTime
          if (isNaN(c.daysLeft)) return true;
          return c.daysLeft > 0;
        });

        console.log("Active campaigns found:", activeCampaigns.length);

        const sorted = activeCampaigns.sort((a, b) => (a.daysLeft || 0) - (b.daysLeft || 0));
        setCampaigns(sorted);
        setIsLoading(false);
      }
    };

    fetchCampaigns();

    // Listen for storage changes (triggered when admin saves extras or backend data)
    const handleStorage = (e) => {
      if (e.key === "ecoKnot_campaign_extras" || e.key === "ecoKnot_campaigns") {
        fetchCampaigns();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

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
        <motion.div
          style={{ x: smoothX, y: smoothY }}
          className="absolute top-[-15vw] left-[-15vw] w-[30vw] h-[30vw] rounded-full bg-uiu-orange/15 blur-[120px] pointer-events-none z-10"
        />
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

      {/* TOP NAVIGATION */}
      <header className="max-w-7xl mx-auto w-full px-4 pt-4 z-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/50 backdrop-blur-md border border-white/80 shadow text-slate-700 font-bold hover:bg-white/90 hover:text-slate-900 transition-all group w-max text-xs"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </Link>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto w-full px-4 py-6 z-10 flex flex-col flex-1 pb-20">

        {/* HEADER BLOCK */}
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.1] mb-3"
          >
            Ongoing <span className="text-transparent bg-clip-text bg-gradient-to-r from-uiu-emerald to-teal-500">Impact Drives</span> at UIU
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="w-16 h-1.5 bg-gradient-to-r from-uiu-orange to-rose-500 rounded-full mx-auto mb-4 shadow-sm"
          />
          <p className="text-sm font-medium text-slate-500">
            Discover active social campaigns and contribute towards a sustainable future for our community.
          </p>
        </div>

        {/* CAMPAIGN GRID */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white/30 backdrop-blur-md rounded-2xl border border-white">
            <Loader2 className="w-10 h-10 text-uiu-emerald animate-spin" />
            <p className="text-slate-500 font-black text-base tracking-tight">Fetching live system data...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-10 px-6 rounded-2xl bg-rose-50 border border-rose-200 gap-4">
            <AlertCircle className="w-8 h-8 text-rose-500" />
            <div className="text-center">
              <h3 className="text-xl font-black text-rose-800 tracking-tight">Connection Timeout</h3>
              <p className="text-rose-500 font-medium text-xs mt-1">The system api at :8080 is unreachable. Displaying cached local data.</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-white border border-rose-200 rounded-full text-xs text-rose-600 font-black hover:bg-rose-100 transition-all shadow-xl shadow-rose-100"
            >
              Reconnect Now
            </button>
          </div>
        ) : campaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {campaigns.map((campaign, i) => (
              <motion.div
                key={campaign._uniqueId || campaign.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.6, type: "spring" }}
                whileHover={{ y: -6 }}
                className="group flex flex-col h-full bg-white/60 backdrop-blur-2xl rounded-2xl border border-white shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer"
              >
                {/* Card Illustration/Icon Area — shows uploaded image if present */}
                {campaign.image ? (
                  <div className="relative overflow-hidden border-b border-white" style={{ height: "140px" }}>
                    <img
                      src={campaign.image}
                      alt={campaign.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* Gradient overlay for readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    {/* Badge */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                      <span className="px-3 py-1 bg-white/75 backdrop-blur-md text-uiu-emerald text-[9px] font-black tracking-widest uppercase rounded-full border border-white shadow-sm whitespace-nowrap">
                        Live Community Project
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={`p-6 bg-gradient-to-br ${campaign.gradient} relative overflow-hidden flex flex-col items-center justify-center border-b border-white`}>
                    <div className="p-3 bg-white rounded-xl shadow-xl relative z-10 group-hover:scale-110 transition-transform duration-500">
                      {campaign.icon}
                    </div>
                    <div className="mt-4 flex items-center gap-1.5 relative z-10">
                      <span className="px-3 py-1 bg-uiu-emerald/20 text-uiu-emerald text-[9px] font-black tracking-widest uppercase rounded-full border border-uiu-emerald/30 shadow-sm">
                        Live Community Project
                      </span>
                    </div>
                  </div>
                )}

                {/* Card Meta Content */}
                <div className="p-5 flex flex-col flex-1 bg-white/80 border-t border-white">
                  <h3 className="text-xl font-black text-slate-800 mb-2 leading-tight group-hover:text-uiu-orange transition-colors line-clamp-2">
                    {campaign.title}
                  </h3>
                  <p className="text-slate-500 font-medium text-[10px] leading-relaxed mb-4 line-clamp-3">
                    {campaign.description || "Help support our university community initiative through sustainable resource sharing and donations."}
                  </p>

                  {/* Tracking Progress Section */}
                  <div className="mt-auto space-y-3">
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Goal Status</span>
                        <span className="text-lg font-black text-uiu-emerald">{campaign.progress}%</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Goal</span>
                        <div className="flex items-center gap-1 text-slate-900 font-bold text-xs">
                          <Target className="w-3 h-3 text-rose-500" /> {campaign.goal || campaign.items}
                        </div>
                      </div>
                    </div>

                    {/* Sleek Progress Bar */}
                    <div className="h-2.5 w-full bg-slate-100 rounded-full shadow-inner overflow-hidden border border-slate-100">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${campaign.progress}%` }}
                        transition={{ duration: 1.5, delay: 0.5 }}
                        className="h-full bg-gradient-to-r from-uiu-emerald to-teal-400 rounded-full"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100/50">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-300" />
                          <span className="text-[10px] font-black text-slate-400 tracking-tight">{campaign.donors || 0} Donors</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-uiu-orange/60" />
                          <span className="text-[10px] font-black text-uiu-orange tracking-tight">{campaign.daysLeft} Days Left</span>
                        </div>
                      </div>
                      <Link
                        href={`/campaign-details?id=${campaign.id}`}
                        className="group/btn flex items-center gap-1 text-uiu-orange font-black text-sm transition-opacity"
                      >
                        Join <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </Link>
                    </div>

                    {/* Reaction mini-bar */}
                    {(() => {
                      if (typeof window === 'undefined') return null;
                      const r = JSON.parse(localStorage.getItem(`campaign_reactions_${campaign.id}`) || '{"LIKE":0,"LOVE":0,"SAD":0}');
                      const total = (r.LIKE || 0) + (r.LOVE || 0) + (r.SAD || 0);
                      if (total === 0) return null;
                      return (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100/30">
                          {r.LIKE > 0 && <span className="text-[9px] font-black text-slate-400">👍 {r.LIKE}</span>}
                          {r.LOVE > 0 && <span className="text-[9px] font-black text-slate-400">❤️ {r.LOVE}</span>}
                          {r.SAD > 0 && <span className="text-[9px] font-black text-slate-400">😢 {r.SAD}</span>}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="col-span-full py-10 text-center text-[11px] text-slate-400 font-medium italic bg-white/40 rounded-2xl border border-dashed border-slate-200">
            No active impact campaigns found. Check back soon!
          </div>
        )}
      </main>

      {/* Decorative Blob */}
      <div className="fixed -bottom-[20vw] -left-[20vw] w-[60vw] h-[60vw] bg-uiu-emerald/10 blur-[150px] -z-10 rounded-full" />
    </div>
  );
}
