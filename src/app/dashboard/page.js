"use client";

import { useState, useEffect } from "react";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import {
  Home,
  Search,
  LogOut,
  Package,
  BookOpen,
  Settings,
  Activity,
  Coins,
  Bell,
  HeartHandshake,
  Tag,
  Star,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  ChevronRight,
  Clock,
  Target,
  GraduationCap,
  Users2,
  MessageCircle,
  CheckCircle,
  AlertCircle,
  X
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { mockDb } from "@/utils/mockDb";
import { db } from "@/utils/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#fbfcfb]">
        <div className="w-16 h-16 border-4 border-uiu-emerald border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [marketplaceItems, setMarketplaceItems] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
  const [campaignsError, setCampaignsError] = useState(null);
  const [userPoints, setUserPoints] = useState(0);
  const [userBadge, setUserBadge] = useState({ name: "Eco Seedling", icon: "🌱", color: "from-emerald-400 to-teal-500" });
  const [publicResources, setPublicResources] = useState([]);

  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentStatus = searchParams.get("payment");
  const [showStatus, setShowStatus] = useState(!!paymentStatus);

  useEffect(() => {
    const fetchUserStats = async () => {
      const email = localStorage.getItem("userEmail") || "nhassan231467@bscse.uiu.ac.bd";
      try {
        const res = await fetch(`http://localhost:8080/api/settings/${email}`);
        if (res.ok) {
          const data = await res.json();
          const pts = data.ecoPoints || 0;
          setUserPoints(pts);

          // Badge Logic
          if (pts >= 1000) setUserBadge({ name: "Eco Legend", icon: "👑", color: "from-amber-400 to-orange-600" });
          else if (pts >= 500) setUserBadge({ name: "Sustainability Hero", icon: "🌳", color: "from-green-500 to-emerald-700" });
          else if (pts >= 100) setUserBadge({ name: "Green Supporter", icon: "🌿", color: "from-lime-400 to-green-600" });
          else setUserBadge({ name: "Eco Seedling", icon: "🌱", color: "from-emerald-400 to-teal-500" });
        }
      } catch (err) {
        console.warn("Points fetch failed");
      }
    };
    fetchUserStats();
  }, []);

  useEffect(() => {
    setIsMounted(true);

    const loadItems = async () => {
      let backendItems = [];
      let publicBackendItems = [];
      try {
        // Fetch Academic Resources
        const res = await fetch("http://localhost:8080/api/resources");
        if (res.ok) {
          backendItems = await res.json();
        }

        // Fetch Public Resources
        const resPublic = await fetch("http://localhost:8080/api/public-resources/all");
        if (resPublic.ok) {
          publicBackendItems = await resPublic.json();
        }
      } catch (err) {
        console.warn("Dashboard resources fetch failed:", err);
      }

      // 1. Process Academic Backend Items
      const mappedAcademic = backendItems
        .filter(it => it.status === "Approved")
        .map(it => ({
          ...it,
          _uniqueId: `academic-${it.id}`,
          condition: it.resourceCondition || it.condition,
          type: "academic",
          _isBackend: true
        }));

      // 2. Process Public Backend Items
      const mappedPublic = publicBackendItems
        .filter(it => it.status === "Approved")
        .map(it => ({
          ...it,
          _uniqueId: `public-${it.id}`,
          condition: it.conditionInfo || it.condition,
          type: "public",
          _isBackend: true
        }));

      // 3. (Removed Mock Items as Backend is now fully functional)

      // 4. Combine and deduplicate (Only backend items)
      const allApproved = [...mappedAcademic, ...mappedPublic];

      const iconMap = {
        BookOpen: <BookOpen className="w-12 h-12 text-blue-500" />,
        Package: <Package className="w-12 h-12 text-uiu-orange" />,
        Star: <Star className="w-12 h-12 text-emerald-500" />,
        Activity: <Activity className="w-12 h-12 text-purple-500" />
      };

      // 4. Split into Academic and Public with robust fallback
      const academicOnly = allApproved.filter(it => 
        it.type === "academic" || 
        it.subject || 
        (!it.type && !it.category && it.resourceCondition)
      );
      
      const publicOnly = allApproved.filter(it => 
        it.type === "public" || 
        it.category || 
        (!it.type && it.image && !it.subject)
      );

      // Update Marketplace (Academic)
      const sortedAcademic = [...academicOnly].sort((a, b) => Number(b.id || 0) - Number(a.id || 0)).slice(0, 8);
      setMarketplaceItems(sortedAcademic.map(it => ({
        ...it,
        icon: iconMap[it.icon] || <Package className="w-12 h-12 text-slate-400" />
      })));

      // Update Public Resources
      const sortedPublic = [...publicOnly].sort((a, b) => Number(b.id || 0) - Number(a.id || 0)).slice(0, 4);
      setPublicResources(sortedPublic);
    };

    const fetchCampaigns = async () => {
      let backendCampaigns = [];
      try {
        setIsLoadingCampaigns(true);
        const response = await fetch("http://localhost:8080/api/campaigns");
        if (response.ok) {
          backendCampaigns = await response.json();
        }
      } catch (err) {
        console.warn("Dashboard fetch failed:", err);
        setCampaignsError(err.message);
      } finally {
        const mockCampaigns = mockDb.getCampaigns();

        // Map backend with hybrid overlay
        const mappedBackend = backendCampaigns.map(c => {
          const extra = mockDb.getCampaignExtras(c.title) || mockDb.getCampaignExtras(c.id?.toString()) || {};
          let imageUrl = extra.image || c.image || c.imagePath;
          if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('blob:') && !imageUrl.startsWith('data:')) {
            imageUrl = `http://localhost:8080/${imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl}`;
          }
          let progress = c.progress;
          if (progress === undefined || progress === null) {
            const goal = parseFloat(extra.goal || c.goal) || 0;
            const collected = parseFloat(c.collected) || 0;
            progress = goal > 0 ? Math.round((collected / goal) * 100) : 0;
          }
          return {
            ...c,
            _uniqueId: `backend-${c.id}`,
            image: imageUrl,
            progress: progress,
            goal: extra.goal || c.goal
          };
        });

        const backendTitles = new Set(mappedBackend.map(c => c.title.toLowerCase()));
        const uniqueMock = mockCampaigns
          .filter(c => !backendTitles.has(c.title.toLowerCase()))
          .map(c => ({ ...c, _uniqueId: `mock-${c.id}` }));

        const combined = [...mappedBackend, ...uniqueMock]
          .filter(c => {
            // Check if expired using mockDb helper
            const expired = mockDb.isCampaignExpired(c);
            return !expired;
          })
          .reverse()
          .slice(0, 4);
        
        console.log("Dashboard active campaigns:", combined.length);
        setCampaigns(combined);
        setIsLoadingCampaigns(false);
      }
    };


    loadItems();
    fetchCampaigns();

    // Re-load on storage events (for mockDb sync)
    const onStorage = () => {
      loadItems();
      fetchCampaigns();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
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

  // Messages Unread State
  const [hasUnread, setHasUnread] = useState(false);
  
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) return;
    const u = JSON.parse(userStr);
    const myId = u.firebaseUid || u.email;

    const q = query(
        collection(db, "chatRooms"),
        where("participants", "array-contains", myId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const unread = snapshot.docs.some(doc => doc.data().unreadBy?.includes(myId));
        setHasUnread(unread);
    });

    return () => unsubscribe();
  }, []);

  // Sidebar Links Configuration
  const navLinks = [
    { name: "Browse Items", icon: Package, active: true, href: "/dashboard" },
    { name: "Messages", icon: MessageCircle, active: false, href: "/chat", badge: hasUnread },
    { name: "My Requests", icon: Activity, active: false, href: "/user-panel" },
    { name: "Academic Resources", icon: GraduationCap, active: false, href: "/academic-resources" },
    { name: "Public Resources", icon: Users2, active: false, href: "/public-resources" },
    { name: "Campaigns", icon: HeartHandshake, active: false, href: "/public-campaigns" },
    { name: "Settings", icon: Settings, active: false, href: "/settings" },
  ];

  return (
    <div className="flex min-h-screen font-sans bg-gradient-to-b from-[#f2faf6] via-[#fbf8f3] to-[#fff3ec] relative overflow-hidden">

      {/* PAYMENT STATUS NOTIFICATION */}
      <AnimatePresence>
        {showStatus && paymentStatus && (
          <motion.div
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-6"
          >
            <div className={`p-5 rounded-[2rem] backdrop-blur-2xl border shadow-2xl flex items-center justify-between gap-4 ${paymentStatus === "success"
                ? "bg-emerald-50/90 border-emerald-100 text-emerald-900"
                : "bg-rose-50/90 border-rose-100 text-rose-900"
              }`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${paymentStatus === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                  }`}>
                  {paymentStatus === "success" ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="font-black text-lg leading-tight">
                    {paymentStatus === "success" ? "Payment Successful! 🎉" : "Payment Failed ❌"}
                  </h4>
                  <p className="text-xs font-bold opacity-70">
                    {paymentStatus === "success"
                      ? "Thank you for your generous contribution to the community."
                      : "Something went wrong. Please try again later."}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowStatus(false); router.replace('/dashboard'); }}
                className="p-2 hover:bg-black/5 rounded-full transition-colors"
              >
                <X className="w-5 h-5 opacity-40" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* SIDEBAR (DESKTOP) */}
      <aside className="hidden md:flex flex-col w-72 h-screen sticky top-0 bg-white/40 backdrop-blur-2xl border-r border-white/60 p-6 z-20 shadow-[10px_0_40px_-15px_rgba(0,0,0,0.05)]">
        <div className="mb-12 mt-2 px-4">
          <h1 className="text-3xl font-black bg-gradient-to-r from-uiu-orange via-rose-500 to-uiu-emerald bg-clip-text text-transparent tracking-tight">EcoKnot</h1>
          <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Dashboard Hub</p>
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                href={link.href || "#"}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all group ${link.active
                  ? "bg-white text-slate-900 shadow-[0_10px_20px_-10px_rgba(0,0,0,0.08)] border border-slate-100"
                  : "text-slate-500 hover:bg-white/50 hover:text-slate-800"
                  }`}
              >
                <div className={`p-2 rounded-xl transition-colors relative ${link.active ? 'bg-emerald-50 text-uiu-emerald' : 'bg-transparent text-slate-400 group-hover:bg-white'}`}>
                  <Icon className="w-5 h-5" />
                  {link.badge && (
                    <div className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
                  )}
                </div>
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          <Link href="/" className="flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-500 font-bold hover:bg-white hover:text-rose-600 transition-all hover:shadow-[0_10px_20px_-10px_rgba(225,29,72,0.1)] group">
            <div className="p-2 rounded-xl bg-transparent text-slate-400 group-hover:bg-rose-50 transition-colors">
              <LogOut className="w-5 h-5 group-hover:text-rose-500 transition-colors" />
            </div>
            Log Out
          </Link>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 w-full flex flex-col h-screen overflow-y-auto z-10 custom-scrollbar">
        <div className="max-w-6xl mx-auto w-full p-6 md:p-10 pb-32 md:pb-10 h-full">

          {/* HEADER */}
          <header className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center mb-12">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Welcome to the Hub! 🌿</h2>
              <p className="text-slate-500 font-medium mt-1 text-lg">Browse resources and join active campaigns.</p>
            </div>

            <div className="flex items-center gap-4 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-80 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-uiu-emerald transition-colors" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search resources..."
                  className="w-full pl-12 pr-4 py-3.5 rounded-full bg-white/60 backdrop-blur-md border border-white focus:border-uiu-emerald focus:ring-4 focus:ring-uiu-emerald/10 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-bold shadow-sm"
                />
              </div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-full bg-white/70 backdrop-blur-xl border border-white shadow-sm"
              >
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${userBadge.color} flex items-center justify-center text-sm shadow-sm`}>
                  {userBadge.icon}
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase leading-none">Rank</span>
                  <span className="font-black text-slate-800 text-xs leading-tight">{userBadge.name}</span>
                </div>
                <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                <div className="flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-black text-amber-600 text-sm">{userPoints}</span>
                </div>
              </motion.div>
            </div>
          </header>

          {/* STATS SECTION */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              { label: "Items Donated", value: "12", icon: Package, color: "text-uiu-emerald", bg: "bg-emerald-500/10" },
              { label: "Active Requests", value: "3", icon: Activity, color: "text-uiu-orange", bg: "bg-orange-500/10" },
              { label: "Eco-Points", value: userPoints, icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/50 backdrop-blur-xl border border-white/80 rounded-[2rem] p-6 shadow-sm"
              >
                <div className="flex justify-between items-start mb-4">
                  <p className="text-slate-500 font-bold">{stat.label}</p>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${stat.bg} ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-4xl font-black text-slate-900 tracking-tight">{stat.value}</h3>
              </motion.div>
            ))}
          </div>

          {/* MARKETPLACE FEED */}
          <div>
            <div className="flex justify-between items-end mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Academic Resources</h3>
                <p className="text-slate-500 font-medium mt-1">Discover what your peers are sharing right now.</p>
              </div>
              <Link href="/academic-resources" className="text-uiu-orange font-black text-xs hover:underline flex items-center gap-1 mb-1">
                View All <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {marketplaceItems.length > 0 ? marketplaceItems.map((item, i) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 + 0.3 }}
                  key={item._uniqueId || item.id}
                >
                  <motion.div
                    whileHover={{ y: -8 }}
                    className="group bg-white/60 backdrop-blur-xl rounded-[2rem] border border-white/80 shadow-sm overflow-hidden hover:shadow-xl transition-all flex flex-col h-full"
                  >
                    <div className={`h-48 relative overflow-hidden flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100`}>
                      <div className="relative z-10">{item.icon}</div>
                      <div className="absolute top-4 left-4 z-20">
                        <span className="px-3 py-1 text-[11px] font-black rounded-full bg-white/80 backdrop-blur-md text-slate-700 shadow-sm uppercase tracking-wider">
                          {item.condition}
                        </span>
                      </div>
                    </div>
                    <div className="p-6 flex-1 flex flex-col bg-white/80 border-t border-white">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-uiu-orange mb-2">
                        <Tag className="w-3.5 h-3.5" />
                        {item.subject}
                      </div>
                      <h4 className="text-xl font-black text-slate-900 mb-6 leading-tight line-clamp-2">{item.title}</h4>
                      <Link href={`/item-details?id=${item.id}`} className="mt-auto w-full py-3.5 rounded-xl font-black text-white text-sm bg-uiu-emerald hover:bg-emerald-600 shadow-md transition-all flex items-center justify-center gap-2">
                        View Item <ArrowUpRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </motion.div>
                </motion.div>
              )) : (
                <div className="col-span-full py-20 text-center text-slate-400 font-medium italic bg-white/30 rounded-[2rem] border border-dashed border-slate-200">
                  No approved items in the feed yet. Check back later!
                </div>
              )}
            </div>
          </div>

          {/* PUBLIC RESOURCES FEED SECTION */}
          <div className="mt-16">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Public Resources</h3>
                <p className="text-slate-500 font-medium mt-1">Community shared items for free or exchange.</p>
              </div>
              <Link href="/public-resources" className="text-uiu-emerald font-black text-xs hover:underline flex items-center gap-1 mb-1">
                View All <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {publicResources.length > 0 ? publicResources.map((item, i) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 + 0.3 }}
                  key={`public-${item.id}`}
                >
                  <motion.div
                    whileHover={{ y: -8 }}
                    className="group bg-white/60 backdrop-blur-xl rounded-[2rem] border border-white/80 shadow-sm overflow-hidden hover:shadow-xl transition-all flex flex-col h-full"
                  >
                    <div className="h-40 relative overflow-hidden bg-slate-100 flex items-center justify-center">
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-10 h-10 text-slate-300" />
                      )}
                      <div className="absolute top-3 right-3">
                        <button className="p-2 rounded-full bg-white/80 backdrop-blur-md text-uiu-orange shadow-sm hover:bg-uiu-orange hover:text-white transition-all">
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col bg-white/80">
                      <div className="text-[10px] font-black text-uiu-emerald uppercase tracking-widest mb-1">{item.category || "Community"}</div>
                      <h4 className="text-lg font-black text-slate-800 mb-4 line-clamp-1">{item.title}</h4>
                      <Link 
                        href={`/resource-details?id=${item.id}&type=public`} 
                        className="mt-auto w-full py-3 rounded-xl font-black text-white text-xs bg-uiu-emerald hover:bg-emerald-600 shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        View Item <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </motion.div>
                </motion.div>
              )) : (
                <div className="col-span-full py-20 text-center text-slate-400 font-medium italic bg-white/30 rounded-[2rem] border border-dashed border-slate-200">
                  No public resources available yet.
                </div>
              )}
            </div>
          </div>

          {/* ACTIVE CAMPAIGNS SECTION */}
          <div className="mt-16">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Active Campaigns</h3>
                <p className="text-slate-500 font-medium mt-1">Join a movement and help the community.</p>
              </div>
              <Link href="/public-campaigns" className="text-uiu-orange font-black text-xs hover:underline flex items-center gap-1 mb-1">
                View All <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {isLoadingCampaigns ? (
                <div className="col-span-full py-16 flex flex-col items-center justify-center gap-4 bg-white/20 backdrop-blur-md rounded-[2.5rem] border border-white/40">
                  <div className="w-10 h-10 border-4 border-uiu-emerald border-t-transparent rounded-full animate-spin" />
                  <p className="text-slate-500 font-bold">Connecting to system API...</p>
                </div>
              ) : campaignsError ? (
                <div className="col-span-full py-10 px-8 rounded-[2.5rem] bg-rose-50/50 border border-rose-100 flex flex-col items-center gap-2">
                  <p className="text-rose-600 font-black text-sm uppercase tracking-widest">System Offline</p>
                  <p className="text-rose-500 font-medium text-xs">Showing cached results. Check your connection to :8080.</p>
                </div>
              ) : campaigns.length > 0 ? (
                campaigns.map((camp, i) => (
                  <motion.div
                    key={camp._uniqueId || camp.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: -5 }}
                    transition={{ delay: i * 0.1 + 0.3 }}
                    className="group bg-white/60 backdrop-blur-xl rounded-[2.5rem] border border-white/80 shadow-sm overflow-hidden hover:shadow-xl transition-all flex flex-col h-full"
                  >
                    {/* Campaign Image Header */}
                    <div className="h-44 relative overflow-hidden">
                      <img
                        src={camp.image || `https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&q=80&w=800`}
                        alt={camp.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-60" />
                      <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 rounded-full bg-uiu-emerald/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
                          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          Live Community Project
                        </span>
                      </div>
                    </div>

                    <div className="p-8 flex flex-col flex-1">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className="text-2xl font-black text-slate-800 tracking-tight group-hover:text-uiu-emerald transition-colors leading-tight">{camp.title}</h3>
                          <p className="text-slate-400 font-bold text-sm lowercase">{camp.category || "General Drive"}</p>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1.5 text-slate-400 font-bold text-xs bg-slate-50 px-3 py-1.5 rounded-full">
                            <Clock className="w-3.5 h-3.5" />
                            {camp.daysLeft || "14"} Days Left
                          </div>
                        </div>
                      </div>

                      <p className="text-slate-500 font-medium text-sm mb-8 line-clamp-2 leading-relaxed">
                        {camp.description}
                      </p>

                      <div className="space-y-4 mb-8">
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Campaign Goal</span>
                          <span className="text-sm font-black text-slate-900">{camp.progress || 0}% Achieved</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-100/50">
                          <div className="h-full bg-gradient-to-r from-uiu-emerald to-teal-400 rounded-full transition-all duration-1000" style={{ width: `${camp.progress || 0}%` }} />
                        </div>
                      </div>

                      <Link
                        href={`/campaign-details?id=${camp.id}`}
                        className="w-full py-4 rounded-2xl font-black text-white text-sm bg-slate-900 hover:bg-uiu-emerald shadow-lg shadow-slate-900/10 transition-all flex items-center justify-center gap-2 mt-auto"
                      >
                        Make a Contribution <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center text-slate-400 font-medium italic bg-white/30 rounded-[2rem] border border-dashed border-slate-200">
                  No active campaigns found. Check back later!
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* MOBILE NAV */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white/70 backdrop-blur-2xl border-t border-white py-4 px-6 flex justify-between items-center z-50">
        {navLinks.slice(0, 4).map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.name} href={link.href || "#"} className={`flex flex-col items-center gap-1 ${link.active ? 'text-uiu-orange' : 'text-slate-400'}`}>
              <Icon className="w-6 h-6" />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
