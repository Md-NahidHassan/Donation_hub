"use client";

import {
  BookOpen,
  Heart,
  Leaf,
  Package,
  Search,
  ChevronRight,
  ArrowRight,
  Globe,
  Mail,
  MessageSquare,
  Flame,
  ShieldCheck,
  Zap,
  Trees as Tree,
  Rocket
} from "lucide-react";
import { motion, useScroll, useTransform, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { mockDb } from "@/utils/mockDb";

export default function Home() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, -100]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  const [isMounted, setIsMounted] = useState(false);
  const [activeCampaigns, setActiveCampaigns] = useState([]);
  const [recentItems, setRecentItems] = useState([]);

  useEffect(() => {
    setIsMounted(true);

    const iconMap = {
      Flame: <Flame className="w-10 h-10 text-orange-500" />,
      BookOpen: <BookOpen className="w-10 h-10 text-blue-500" />,
      ShieldCheck: <ShieldCheck className="w-10 h-10 text-emerald-500" />,
      Rocket: <Rocket className="w-10 h-10 text-uiu-emerald" />
    };

    const loadData = async () => {
      // 1. Fetch Campaigns from Backend
      try {
        const response = await fetch("http://localhost:8080/api/campaigns");
        if (response.ok) {
          const data = await response.json();
          const mapped = data.map(c => {
            let imageUrl = c.image || c.imagePath;
            if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('blob:') && !imageUrl.startsWith('data:')) {
              imageUrl = `http://localhost:8080/${imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl}`;
            }

            let progress = c.progress;
            if (progress === undefined || progress === null) {
              const goal = parseFloat(c.goal) || 0;
              const collected = parseFloat(c.collected) || 0;
              progress = goal > 0 ? Math.round((collected / goal) * 100) : 0;
            }

            return {
              ...c,
              image: imageUrl,
              progress: progress,
              icon: iconMap[c.icon] || <Zap className="w-10 h-10 text-amber-500" />
            };
          });
          const active = mapped.filter(c => !mockDb.isCampaignExpired(c));
          setActiveCampaigns(active.slice(0, 6));
        } else {
          throw new Error("API fail");
        }
      } catch (err) {
        // Fallback to mock campaigns
        const allCampaigns = mockDb.getCampaigns().filter(c => !mockDb.isCampaignExpired(c));
        setActiveCampaigns(allCampaigns.slice(0, 6).map(c => ({
          ...c,
          icon: iconMap[c.icon] || <Zap className="w-10 h-10 text-amber-500" />
        })));
      }

      // 2. Load Recent Approved Items from MockDb
      const approvedItems = mockDb.getItems().filter(it => it.status === "Approved");
      setRecentItems(approvedItems.slice(-3).reverse());
    };

    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

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

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 60, damping: 15 } }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans overflow-hidden bg-gradient-to-b from-[#f2faf6] via-[#fbf8f3] text-slate-900 to-[#fff3ec]" ref={containerRef}>

      {/* BACKGROUND ELEMENTS */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          style={{ x: smoothX, y: smoothY }}
          className="absolute top-[-15vw] left-[-15vw] w-[30vw] h-[30vw] rounded-full bg-uiu-orange/15 blur-[120px] pointer-events-none z-10"
        />
        <motion.div
          animate={{ x: ['0vw', '30vw', '-20vw', '0vw'], y: ['0vh', '-20vh', '30vh', '0vh'], scale: [1, 1.3, 0.9, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute top-[10%] left-[20%] w-[45vw] h-[45vw] rounded-[100%] bg-uiu-emerald/15 blur-[130px]"
        />
        <div className="absolute inset-0 backdrop-blur-[60px] z-[-1]" />
      </div>

      {/* NAVBAR */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="sticky top-0 z-50 w-full border-b border-slate-200/50 bg-[#fbf8f3]/80 backdrop-blur-xl shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group cursor-pointer">
            <span className="text-2xl font-black bg-gradient-to-r from-uiu-orange via-rose-500 to-uiu-emerald bg-clip-text text-transparent group-hover:opacity-80 transition-opacity">
              EcoKnot
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-10 text-sm font-semibold text-slate-600">
            <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>

            <Link href="#about" className="hover:text-slate-900 transition-colors">About</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login" className="group relative px-6 py-2.5 text-sm font-bold text-white rounded-full overflow-hidden shadow-lg transition-all flex items-center justify-center">
              <span className="absolute inset-0 bg-gradient-to-r from-uiu-orange to-rose-600" />
              <span className="relative flex items-center gap-2">Login or Register <ArrowRight className="w-4 h-4" /></span>
            </Link>
          </div>
        </div>
      </motion.header>

      <main className="relative z-10">
        {/* HERO SECTION */}
        <motion.section
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative min-h-[95vh] flex flex-col items-center justify-center text-center px-6 pt-24 overflow-hidden"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.08)_0%,transparent_50%)] pointer-events-none" />

          <motion.div variants={fadeUp} initial="hidden" animate="show" className="flex items-center gap-3 px-6 py-2 rounded-full bg-white/50 backdrop-blur-md border border-slate-200/50 text-slate-600 text-sm font-bold mb-10 shadow-sm">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-uiu-emerald opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-uiu-emerald"></span>
            </span>
            UIU's Premier Resource Exchange Platform
          </motion.div>

          <motion.h1
            variants={fadeUp} initial="hidden" animate="show"
            className="text-6xl md:text-8xl font-black tracking-tighter text-slate-900 max-w-5xl mb-8 leading-[1.1]"
          >
            Empowering Students through <span className="text-transparent bg-clip-text bg-gradient-to-r from-uiu-emerald via-teal-400 to-emerald-600">Sustainable</span> Sharing.
          </motion.h1>

          <motion.p
            variants={fadeUp} initial="hidden" animate="show"
            className="text-xl md:text-2xl text-slate-600 max-w-3xl mb-14 font-medium"
          >
            Join the movement to exchange resources, reduce waste, and support our community through impactful donation drives.
          </motion.p>

          <motion.div
            variants={fadeUp} initial="hidden" animate="show"
            className="flex flex-col sm:flex-row items-center gap-6"
          >
            <Link href="/login" className="h-16 px-10 rounded-full bg-slate-900 text-white font-bold text-lg flex items-center justify-center gap-3 hover:scale-[1.02] transition-all shadow-xl">
              Get Started <Rocket className="w-5 h-5" />
            </Link>
            <Link href="/login" className="h-16 px-10 rounded-full bg-white border-2 border-white backdrop-blur-md text-slate-900 font-bold text-lg flex items-center justify-center gap-3 shadow-sm">
              Start Donating <Heart className="w-5 h-5 text-rose-500" />
            </Link>
          </motion.div>
        </motion.section>

        {/* RUNNING CAMPAIGNS SECTION */}
        <section className="py-24 relative overflow-hidden bg-white/30 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">Our Active Impact Campaigns</h2>
              <div className="w-24 h-1.5 bg-uiu-orange rounded-full mx-auto" />
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {activeCampaigns.map((campaign) => (
                <Link key={campaign.id} href={`/campaign-details?id=${campaign.id}&ref=home`}>
                  <motion.div
                    whileHover={{ y: -10 }}
                    className="group relative h-full bg-white/60 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-xl overflow-hidden cursor-pointer"
                  >
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-8">
                        <div className="p-4 bg-white rounded-3xl shadow-sm">{campaign.icon}</div>
                        <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-600 text-xs font-black rounded-full border border-emerald-500/20">Live Now</span>
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 mb-2">{campaign.title}</h3>
                      <p className="text-slate-500 font-bold text-sm mb-6 uppercase">Goal: {campaign.goal} {campaign.items ? "" : "Units"}</p>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-8">
                        <div className="h-full bg-uiu-emerald rounded-full" style={{ width: `${campaign.progress}%` }} />
                      </div>
                      <div className="flex items-center gap-2 text-uiu-orange font-black">
                        Join Movement <ArrowRight className="w-4 h-4 group-hover:translate-x- motion-safe:1" />
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ABOUT US SECTION */}
        <section id="about" className="py-32 relative bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col lg:flex-row items-center gap-20">
              <div className="lg:w-1/2 relative">
                <div className="w-full aspect-square rounded-[3rem] bg-gradient-to-br from-emerald-50 to-orange-50 flex items-center justify-center relative overflow-hidden group border border-slate-100">
                  <Tree className="w-48 h-48 text-uiu-emerald drop-shadow-[0_0_40px_rgba(16,185,129,0.3)]" />
                </div>
              </div>
              <div className="lg:w-1/2">
                <span className="text-uiu-orange font-black text-sm uppercase tracking-widest mb-4 block">Our Story</span>
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-8 leading-tight">
                  Empowering the <span className="text-uiu-emerald underline decoration-uiu-orange/30 decoration-8 underline-offset-8">UIU Community</span>
                </h2>
                <p className="text-xl text-slate-600 font-medium leading-relaxed mb-12">
                  EcoKnot is a dedicated resource-sharing and sustainability platform built exclusively for United International University. Our mission is to reduce waste and foster a culture of giving by connecting students through donation drives and eco-friendly item exchanges.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="p-6 bg-[#fbf8f3] rounded-3xl border border-slate-100">
                    <Zap className="w-8 h-8 text-uiu-orange mb-4" />
                    <h4 className="font-black text-slate-900 mb-2">Eco-Points</h4>
                    <p className="text-sm text-slate-500 font-medium">Earn rewards for every item you share.</p>
                  </div>
                  <div className="p-6 bg-[#fbf8f3] rounded-3xl border border-slate-100">
                    <Leaf className="w-8 h-8 text-uiu-emerald mb-4" />
                    <h4 className="font-black text-slate-900 mb-2">Sustainability</h4>
                    <p className="text-sm text-slate-500 font-medium">Reduce campus footprint together.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MARKETPLACE PREVIEW */}
        <section className="py-32">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex justify-between items-end mb-16">
              <div>
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">Recent Listings</h2>
                <p className="text-xl text-slate-600 font-medium">Discover what your peers are sharing right now.</p>
              </div>
              <Link href="/login" className="hidden sm:flex items-center gap-2 text-uiu-orange font-bold text-lg group">
                View all items <ChevronRight className="w-5 h-5 group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {recentItems.length > 0 ? (
                recentItems.map((item) => (
                  <motion.div key={item.id} whileHover={{ y: -8 }} className="group rounded-[2rem] border border-white bg-white/70 backdrop-blur-lg overflow-hidden shadow-sm hover:shadow-xl transition-all">
                    <div className="h-64 relative bg-slate-50 flex items-center justify-center">
                      <Package className="w-20 h-20 text-slate-200" />
                      <div className="absolute top-5 left-5 px-4 py-2 text-xs font-black rounded-full bg-white/80 text-slate-700 shadow-sm uppercase">{item.condition}</div>
                    </div>
                    <div className="p-8 bg-white/80 border-t border-white">
                      <h3 className="text-2xl font-black text-slate-900 mb-3">{item.title}</h3>
                      <p className="text-base text-slate-500 mb-8 font-medium">By {item.postedBy} • {item.subject}</p>
                      <Link href="/login" className="w-full py-4 rounded-2xl bg-slate-100 text-slate-900 font-bold hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-2">
                        I'm Interested <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center text-slate-400 font-medium italic border-2 border-dashed border-slate-200 rounded-[2rem]">
                  No public listings approved yet. Check back soon!
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200/50 bg-[#fbf8f3] pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between gap-12 mb-16">
            <div className="max-w-sm">
              <div className="flex items-center gap-3 mb-6">
                <Leaf className="w-10 h-10 text-uiu-emerald" />
                <span className="text-3xl font-black text-slate-900">EcoKnot</span>
              </div>
              <p className="text-slate-500 text-lg font-medium">Empowering the UIU community through sustainable resource sharing and collective impact.</p>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm"><Globe className="w-6 h-6 text-slate-400" /></div>
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm"><Mail className="w-6 h-6 text-slate-400" /></div>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-200/50 text-center md:text-left text-slate-400 font-bold text-sm">
            © {new Date().getFullYear()} EcoKnot Platform. Built for UIU.
          </div>
        </div>
      </footer>
    </div>
  );
}
