"use client";

import { useState, useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import {
  ArrowLeft,
  Heart,
  Users,
  Clock,
  Target,
  TrendingUp,
  ImageOff,
  Loader2,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { mockDb } from "@/utils/mockDb";

export default function CampaignsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsMounted(true);

    const fetchCampaigns = async () => {
      try {
        let resultData = [];
        try {
          setIsLoading(true);
          const response = await fetch("http://localhost:8080/api/campaigns");
          if (!response.ok) {
            throw new Error("Failed to fetch campaigns");
          }
          resultData = await response.json();
        } catch (err) {
          console.error("Error fetching campaigns:", err);
          setError(err.message);
          // Fallback to mock data if API fails so the UI doesn't look completely broken during dev
          resultData = mockDb.getCampaigns();
        }

        // Transform the data to ensure UI compatibility
        const mapped = resultData.map(c => {
          const extra = mockDb.getCampaignExtras(c.title) || {};

          // FORCE use extra.image if it exists because backend image is broken (404)
          let imageUrl = extra.image || c.image || c.imagePath;
          if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('blob:') && !imageUrl.startsWith('data:')) {
            imageUrl = `http://localhost:8080/${imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl}`;
          }

          // Handle Progress: Calculate if missing but goal/collected exist
          let goal = extra.goal || c.goal || 0;
          let progress = c.progress;
          if (progress === undefined || progress === null) {
            const parsedGoal = parseFloat(goal) || 0;
            const collected = parseFloat(c.collected) || 0;
            progress = parsedGoal > 0 ? Math.round((collected / parsedGoal) * 100) : 0;
          }

          // Use shared helper for expiry (synced with countdown timer localStorage key)
          const isExpired = mockDb.isCampaignExpired({ ...c, goal });

          // Calculate daysLeft for display
          let calcDaysLeft = c.daysLeft || 0;
          const storedEnd = (typeof window !== 'undefined') ? localStorage.getItem(`ecoKnot_endTime_${c.id?.toString() || c.title}`) : null;
          if (storedEnd) {
            calcDaysLeft = Math.max(0, Math.ceil((parseInt(storedEnd) - Date.now()) / 86400000));
          } else if (c.endTime) {
            calcDaysLeft = Math.max(0, Math.ceil((new Date(c.endTime).getTime() - Date.now()) / 86400000));
          }


          return {
            ...c,
            image: imageUrl,
            goal: goal,
            progress: progress,
            daysLeft: calcDaysLeft,
            isExpired: isExpired
          };
        });

        // ── Auto-hide expired campaigns from user view ──────────────────────
        const active = mapped.filter(c => !c.isExpired);
        setCampaigns(active);

        setIsLoading(false);
      } catch (err) {
        console.error("Critical error in fetchCampaigns:", err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    fetchCampaigns();

    // Live-sync if another tab updates campaigns (keeping for local storage sync if still used)
    const onStorage = () => fetchCampaigns();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
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

      {/* 
        ====================================================
               BACKGROUND EFFECTS (STRICT CONTINUITY)
        ====================================================
      */}
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
        <motion.div
          animate={{ rotate: [0, 15, -5, 0], scale: [1, 1.1, 0.95, 1], opacity: [0.2, 0.4, 0.2, 0.2] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-[15%] -left-[20%] w-[160vw] h-[20vw] -rotate-[15deg] bg-gradient-to-r from-transparent via-uiu-emerald/15 to-transparent blur-[100px] origin-center"
        />
        <motion.div
          animate={{ rotate: [0, -10, 15, 0], scale: [1, 0.9, 1.1, 1], opacity: [0.2, 0.4, 0.1, 0.2] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[15%] -right-[20%] w-[150vw] h-[25vw] rotate-[20deg] bg-gradient-to-r from-transparent via-uiu-orange/15 to-transparent blur-[120px] origin-center"
        />
        <div className="absolute inset-0 backdrop-blur-[60px] z-[0]" />
        <motion.div
          animate={{ backgroundPosition: ['0px 0px', '40px 40px'] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_100%_100%_at_50%_0%,#000_50%,transparent_120%)] opacity-50 z-[1]"
        />
      </div>

      {/* 
        ====================================================
               MAIN CONTENT (CAMPAIGNS)
        ====================================================
      */}
      <main className="max-w-7xl mx-auto w-full px-6 py-8 md:py-12 z-10 flex flex-col flex-1 pb-24">

        {/* TOP NAVIGATION */}
        <header className="mb-10 lg:mb-16">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/50 backdrop-blur-md border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-slate-700 font-bold hover:bg-white/90 hover:text-slate-900 transition-all group w-max"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>
        </header>

        {/* HEADER BLOCK */}
        <div className="mb-12 text-center max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.1] mb-4">
            Active Donation Campaigns
          </h1>
          <p className="text-lg md:text-xl font-medium text-slate-500">
            Every small contribution creates a big impact at UIU.
          </p>
        </div>

        {/* CAMPAIGN CARDS GRID */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-12 h-12 text-uiu-emerald animate-spin" />
            <p className="text-slate-400 font-bold text-lg">Fetching active campaigns...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 rounded-[2rem] bg-rose-50 border border-rose-100 gap-4 mb-12">
            <AlertCircle className="w-10 h-10 text-rose-500" />
            <div className="text-center">
              <p className="text-rose-700 font-bold text-lg">Failed to connect to system API</p>
              <p className="text-rose-500/80 text-sm font-medium mt-1">Showing offline / cached results instead.</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-6 py-2.5 bg-white border border-rose-200 rounded-full text-rose-600 font-bold text-sm hover:bg-rose-100 transition-all shadow-sm"
            >
              Retry Connection
            </button>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center">
              <Heart className="w-10 h-10 text-slate-300" />
            </div>
            <p className="text-slate-400 font-bold text-lg">No active campaigns yet.</p>
            <p className="text-slate-300 text-sm font-medium">Check back soon — campaigns will appear here once launched.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {campaigns.map((campaign, i) => (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15, duration: 0.6, type: "spring" }}
                key={campaign.id}
              >
                <Link
                  href={`/campaign-details?id=${campaign.id}`}
                  className="flex flex-col bg-white/60 backdrop-blur-xl rounded-[2rem] border border-white/80 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.04)] hover:shadow-[0_40px_80px_-20px_rgba(242,101,34,0.15)] transition-all duration-300 overflow-hidden h-full cursor-pointer"
                >
                  {/* Graphical Top Half */}
                  <div className={`relative overflow-hidden border-b border-white/40`}>

                    {/* Campaign Image (if uploaded) */}




                    {campaign.image ? (
                      <div className="relative w-full h-44 overflow-hidden">
                        <img
                          src={campaign.image}
                          alt={campaign.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {/* Gradient overlay for text readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                        {/* Badge over image */}
                        <div className={`absolute top-4 right-4 px-3 py-1 bg-white/70 backdrop-blur-md rounded-full border text-xs font-black tracking-widest uppercase ${campaign.isExpired ? "border-rose-200 text-rose-500" : "border-white text-slate-500"}`}>
                          {campaign.isExpired ? "Campaign Ended" : "Live Community Project"}
                        </div>
                        {/* Heart icon over image */}
                        <div className="absolute top-4 left-4 p-2.5 rounded-2xl bg-white/80 backdrop-blur-md shadow-sm border border-white/60 text-uiu-orange">
                          <Heart className="w-5 h-5 fill-current opacity-70" />
                        </div>
                      </div>
                    ) : (
                      /* No image — use gradient fallback */
                      <div className={`p-6 pb-8 bg-gradient-to-b ${campaign.gradient || campaign.bgGradient || "from-emerald-500/10 to-teal-500/5"} flex flex-col gap-4`}>
                        <div className="absolute top-0 right-0 p-8 border-t-[80px] border-r-[80px] border-transparent border-t-white/30 border-r-white/30 z-0 blur-3xl opacity-50" />

                        {/* Header context */}
                        <div className="flex justify-between items-start relative z-10 w-full mb-2">
                          <div className="p-3 rounded-2xl bg-white shadow-sm border border-slate-100 text-uiu-orange">
                            <Heart className="w-6 h-6 fill-current opacity-20 relative top-0 left-0 hover:opacity-100 hover:scale-110 transition-all cursor-pointer" />
                          </div>
                          <div className={`px-3 py-1 bg-white/70 backdrop-blur-md rounded-full border text-xs font-black tracking-widest uppercase ${campaign.isExpired ? "border-rose-200 text-rose-500" : "border-white text-slate-500"}`}>
                            {campaign.isExpired ? "Campaign Ended" : "Live Community Project"}
                          </div>
                        </div>

                        <h2 className="text-2xl font-black text-slate-900 leading-tight relative z-10 mt-2">
                          {campaign.title}
                        </h2>
                        <p className="text-slate-500 font-medium text-sm leading-relaxed relative z-10">
                          {campaign.description}
                        </p>
                      </div>
                    )}

                    {/* Title & description shown below image when image exists */}
                    {campaign.image && (
                      <div className="px-6 pt-5 pb-3">
                        <h2 className="text-xl font-black text-slate-900 leading-tight mb-1">
                          {campaign.title}
                        </h2>
                        <p className="text-slate-500 font-medium text-sm leading-relaxed line-clamp-2">
                          {campaign.description}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Data & Actions Bottom Half */}
                  <div className="p-6 flex flex-col flex-1 bg-white/40">

                    {/* Progress Bar Module */}
                    <div className="mb-5">
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Goal Status</p>
                          <span className="text-lg font-black text-slate-700">{campaign.progress || 0}%</span>
                        </div>
                        <span className="text-xs font-black text-uiu-orange flex items-center gap-1">
                          <Target className="w-3.5 h-3.5" /> {campaign.goal} Items
                        </span>
                      </div>

                      {/* The Bar */}
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner relative">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${campaign.progress || 0}%` }}
                          transition={{ duration: 1.5, delay: 0.5 + (i * 0.1), ease: "easeOut" }}
                          className="absolute top-0 left-0 h-full bg-gradient-to-r from-uiu-emerald to-teal-400 rounded-full"
                        />
                      </div>
                    </div>

                    {/* Micro Stats */}
                    <div className="flex justify-between items-center mb-5">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-bold">{campaign.donors || 0} Donors Joined</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-uiu-orange" />
                        <span className="text-xs font-bold text-slate-500">{campaign.daysLeft || 0} Days Left</span>
                      </div>
                    </div>

                    {/* Call to Action */}
                    <div className="group mt-auto w-full py-3.5 rounded-xl font-black text-uiu-orange text-sm border border-uiu-orange/30 hover:bg-uiu-orange hover:text-white active:scale-[0.98] hover:scale-[1.02] transition-all flex items-center justify-center gap-2 relative overflow-hidden">
                      <span className="relative z-10 flex items-center gap-2">
                        Join <span className="text-lg">→</span>
                      </span>
                    </div>

                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
