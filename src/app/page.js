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
  Rocket,
  Droplets,
  ArrowUpRight,
  MapPin,
  Phone
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
  const [typedText, setTypedText] = useState("");
  const [bloodDonations, setBloodDonations] = useState([]);

  useEffect(() => {
    const fullText = "Sustainable Sharing.";
    let i = 0;
    let isDeleting = false;
    let timeout;

    const type = () => {
      if (!isDeleting && i <= fullText.length) {
        setTypedText(fullText.substring(0, i));
        i++;
        timeout = setTimeout(type, 120);
      } else if (isDeleting && i >= 0) {
        setTypedText(fullText.substring(0, i));
        i--;
        timeout = setTimeout(type, 60);
      } else {
        isDeleting = !isDeleting;
        timeout = setTimeout(type, 1500);
      }
    };
    timeout = setTimeout(type, 500);
    return () => clearTimeout(timeout);
  }, []);

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
          // Provide newest first
          const recentActive = active.reverse().slice(0, 6);
          setActiveCampaigns(recentActive);
        } else {
          throw new Error("API fail");
        }
      } catch (err) {
        // Fallback to mock campaigns
        const allCampaigns = mockDb.getCampaigns().filter(c => !mockDb.isCampaignExpired(c));
        const recentFallback = allCampaigns.reverse().slice(0, 6);
        setActiveCampaigns(recentFallback.map(c => ({
          ...c,
          icon: iconMap[c.icon] || <Zap className="w-10 h-10 text-amber-500" />
        })));
      }

      // 2. Load Recent Approved Items from MockDb
      const approvedItems = mockDb.getItems().filter(it => it.status === "Approved");
      setRecentItems(approvedItems.slice(-3).reverse());

      // 3. Fetch Blood Donations (for new users/non-users to view)
      try {
        const resBlood = await fetch("http://localhost:8080/api/blood-donation", { cache: "no-store" });
        if (resBlood.ok) {
          const bloodData = await resBlood.json();
          setBloodDonations(bloodData.slice(0, 4));
        }
      } catch (err) {
        console.warn("Home page blood donation fetch failed:", err);
      }
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

      {/* BACKGROUND ELEMENTS REMOVED AS REQUESTED */}

      {/* NAVBAR */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="sticky top-0 z-50 w-full border-b border-slate-200/50 bg-[#fbf8f3]/80 backdrop-blur-xl shadow-sm"
      >
        <div className="w-full px-4 md:px-6 h-[72px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 cursor-pointer" style={{ perspective: 1000 }}>
            <motion.div
              animate={{ 
                rotateX: [8, -8, 8], 
                rotateY: [-10, 10, -10]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="px-4 py-1.5 rounded-xl bg-white/40 backdrop-blur-md border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] flex items-center justify-center transform-gpu"
              style={{ transformStyle: "preserve-3d" }}
            >
              <span 
                className="text-2xl font-black bg-gradient-to-r from-slate-900 to-uiu-emerald bg-clip-text text-transparent"
                style={{ transform: "translateZ(15px)" }}
              >
                EcoKnot
              </span>
            </motion.div>
          </Link>

          <nav className="hidden md:flex items-center gap-10 text-sm font-semibold text-slate-600">


            <Link href="#about" className="hover:text-slate-900 transition-colors"></Link>
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
          className="relative min-h-[60vh] flex flex-col items-center justify-center text-center px-6 pt-10 overflow-hidden"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.08)_0%,transparent_50%)] pointer-events-none" />

          <motion.div variants={fadeUp} initial="hidden" animate="show" className="flex items-center gap-3 px-6 py-1.5 rounded-full bg-white/50 backdrop-blur-md border border-slate-200/50 text-slate-600 text-sm font-bold mb-4 shadow-sm">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-uiu-emerald opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-uiu-emerald"></span>
            </span>
            UIU's Premier Resource Share & Campaign Platform
          </motion.div>

          <motion.h1
            variants={fadeUp} initial="hidden" animate="show"
            className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-slate-900 max-w-4xl mb-4 leading-[1.1] min-h-[110px] sm:min-h-[70px]"
          >
            Empowering Students through{" "}
            <motion.span
              animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-uiu-emerald via-teal-400 to-emerald-600 bg-[length:200%_auto]"
            >
              {typedText}
            </motion.span>
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="inline-block w-[3px] h-[0.9em] bg-emerald-500 ml-1 translate-y-2"
            />
          </motion.h1>

          <motion.p
            variants={fadeUp} initial="hidden" animate="show"
            className="text-base md:text-lg text-slate-600 max-w-2xl mb-8 font-medium"
          >
            Join the movement to exchange resources, reduce waste, and support our community through impactful donation drives.
          </motion.p>

          <motion.div
            variants={fadeUp} initial="hidden" animate="show"
            className="flex flex-col sm:flex-row items-center gap-3"
          >
            <Link href="/login" className="h-12 px-6 rounded-full bg-slate-900 text-white font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] transition-all shadow-xl">
              Get Started <Rocket className="w-4 h-4" />
            </Link>
            <Link href="/login" className="h-12 px-6 rounded-full bg-white border-2 border-slate-100 backdrop-blur-md text-slate-900 font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:border-slate-300 transition-all">
              Start Donating <Heart className="w-4 h-4 text-rose-500" />
            </Link>
          </motion.div>
        </motion.section>

        {/* RUNNING CAMPAIGNS SECTION */}
        <section className="py-16 relative overflow-hidden bg-white/30 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-10">
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">Our Active Impact Campaigns</h2>
              <div className="w-24 h-1.5 bg-uiu-orange rounded-full mx-auto" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeCampaigns.map((campaign) => (
                <Link key={campaign.id} href={`/campaign-details?id=${campaign.id}&ref=home`} className="block h-full">
                  <motion.div
                    whileHover={{ y: -6 }}
                    className="group relative h-full bg-white/60 backdrop-blur-xl border border-white rounded-[2rem] shadow-xl overflow-hidden transition-all flex flex-col cursor-pointer"
                  >
                    {campaign.image ? (
                        <div className="relative h-48 w-full bg-slate-100 overflow-hidden shrink-0">
                            <img src={campaign.image} alt={campaign.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute top-4 right-4 px-3 py-1 bg-emerald-500/90 backdrop-blur-md text-white text-[10px] font-black rounded-full shadow-sm uppercase tracking-widest border border-emerald-400">Live Now</div>
                        </div>
                    ) : (
                        <div className="flex justify-between items-start pt-6 px-6 relative z-10">
                          <div className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm">{campaign.icon}</div>
                          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 text-[10px] font-black rounded-full border border-emerald-500/20 uppercase tracking-widest">Live Now</span>
                        </div>
                    )}
                    
                    <div className="p-6 pt-5 flex-1 flex flex-col relative z-10 bg-white/40">
                      <h3 className="text-xl font-black text-slate-900 mb-1.5 line-clamp-2 leading-tight">{campaign.title}</h3>
                      <p className="text-slate-500 font-bold text-[10px] mb-5 uppercase tracking-widest">Goal: {campaign.goal} {campaign.items ? "" : "Units"}</p>
                      
                      <div className="mt-auto">
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-4 border border-slate-200/50">
                            <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${campaign.progress}%` }} />
                          </div>
                          <div className="flex items-center gap-2 text-uiu-orange font-black text-sm">
                            Join Movement <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </div>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* BLOOD DONATION SECTION */}
        <section className="py-16 relative bg-[#fdf5f5] border-t border-rose-100">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-10 flex flex-col items-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="p-2.5 bg-red-100 rounded-xl border border-red-200 shadow-sm">
                  <Droplets className="w-6 h-6 text-red-500" />
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Blood Donation</h2>
              </div>
              <div className="w-24 h-1.5 bg-red-500 rounded-full mx-auto mb-6" />
              <p className="text-slate-500 font-medium text-base md:text-lg max-w-2xl mx-auto">Recent urgent blood requests from the community. Anyone can donate or request blood to save a life today.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {bloodDonations.length > 0 ? bloodDonations.map((item, i) => (
                <motion.div
                  key={`home-blood-${item.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group bg-white rounded-[2rem] border border-slate-100 shadow-md hover:shadow-2xl hover:shadow-red-500/10 transition-all flex flex-col overflow-hidden h-full"
                >
                  <div className={`h-24 shrink-0 relative flex items-center justify-center overflow-hidden ${item.urgent ? "bg-gradient-to-br from-red-500 to-rose-600" : "bg-gradient-to-br from-rose-100 to-red-50"}`}>
                    <span className={`text-4xl font-black tracking-tighter select-none ${item.urgent ? "text-white/80" : "text-red-400/30"}`}>{item.bloodGroup}</span>
                    <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-white text-[10px] font-black shadow-sm ${item.bloodGroup === "O+" || item.bloodGroup === "O-" ? "bg-orange-500" :
                        item.bloodGroup?.startsWith("A") ? "bg-red-500" :
                          item.bloodGroup?.startsWith("B") ? "bg-blue-500" : "bg-purple-500"
                      }`}>{item.bloodGroup}</div>
                    {item.urgent && (
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/25 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest shadow-sm">
                        <Flame className="w-3 h-3" /> Urgent
                      </div>
                    )}
                  </div>
                  <div className="p-5 flex-1 flex flex-col bg-white">
                    <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Blood Request</div>
                    <h4 className="text-base font-black text-slate-900 mb-3 line-clamp-1">{item.hospitalName}</h4>
                    <div className="space-y-2 text-xs font-bold text-slate-500 mb-5 bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                      <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-rose-400" />{item.location}</div>
                      <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-green-500" />{item.num || item.contactNumber}</div>
                    </div>
                    <Link href={`/blood-donation-details?id=${item.id}&ref=home`}
                      className="mt-auto w-full py-3 rounded-xl font-black text-red-600 text-xs bg-red-50 hover:bg-red-500 hover:text-white border border-red-100 transition-all flex items-center justify-center gap-1.5">
                      View Request <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                </motion.div>
              )) : (
                <div className="col-span-full py-24 text-center text-slate-400 font-medium italic bg-white/80 rounded-[3rem] border border-dashed border-red-200">
                  <Droplets className="w-16 h-16 text-red-200 mx-auto mb-4" />
                  <p className="text-lg">No urgent blood requests right now.</p>
                  <p className="text-sm mt-1 mb-4">But you can still make a request if you need blood.</p>
                  <Link href="/blood-donation" className="inline-block mt-2 text-red-500 font-black text-sm uppercase tracking-widest hover:underline">Create a Request →</Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ABOUT US SECTION */}
        <section id="about" className="py-16 relative bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col lg:flex-row items-center gap-12">
              <div className="lg:w-1/2 relative">
                <div className="w-full aspect-square rounded-[3rem] bg-gradient-to-br from-emerald-50 to-orange-50 flex items-center justify-center relative overflow-hidden group border border-slate-100">
                  <Tree className="w-48 h-48 text-uiu-emerald drop-shadow-[0_0_40px_rgba(16,185,129,0.3)]" />
                </div>
              </div>
              <div className="lg:w-1/2">
                <span className="text-uiu-orange font-black text-sm uppercase tracking-widest mb-4 block">Our Story</span>
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 leading-tight">
                  Empowering the <span className="text-uiu-emerald underline decoration-uiu-orange/30 decoration-8 underline-offset-8">UIU Community</span>
                </h2>
                <p className="text-xl text-slate-600 font-medium leading-relaxed mb-8">
                  EcoKnot is a dedicated resource-sharing and sustainability platform built exclusively for United International University. Our mission is to reduce waste and foster a culture of giving by connecting students through donation drives and eco-friendly item exchanges.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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



      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200/50 bg-[#fbf8f3] pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between gap-10 mb-10">
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
