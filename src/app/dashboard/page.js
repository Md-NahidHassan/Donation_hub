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
  X,
  Droplets,
  Flame,
  Phone,
  MapPin,
  PackageSearch
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { mockDb } from "@/utils/mockDb";
import { db } from "@/utils/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

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
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null); // null = all
  const [marketplaceItems, setMarketplaceItems] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);

  // Notifications logic
  const [notifications, setNotifications] = useState([]);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [campaignsError, setCampaignsError] = useState(null);
  const [userPoints, setUserPoints] = useState(0);
  const [userBadge, setUserBadge] = useState({ name: "Eco Seedling", icon: "🌱", color: "from-emerald-400 to-teal-500" });
  const [publicResources, setPublicResources] = useState([]);
  const [bloodDonations, setBloodDonations] = useState([]);
  const [needResources, setNeedResources] = useState([]);

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

        // Fetch Blood Donations (backend returns newest first)
        try {
          const resBlood = await fetch("http://localhost:8080/api/blood-donation", { cache: "no-store" });
          if (resBlood.ok) {
            const bloodData = await resBlood.json();
            setBloodDonations(bloodData.slice(0, 4));
          }
        } catch { }

        // Fetch Need Resources (backend returns newest first)
        try {
          const resNeed = await fetch("http://localhost:8080/api/need-resource", { cache: "no-store" });
          if (resNeed.ok) {
            const needData = await resNeed.json();
            setNeedResources(needData.slice(0, 4));
          }
        } catch { }
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
        const mappedBackend = backendCampaigns.map(c => mockDb.mapCampaign(c));

        const backendTitles = new Set(mappedBackend.map(c => c.title.toLowerCase()));
        const uniqueMock = mockCampaigns
          .filter(c => !backendTitles.has(c.title.toLowerCase()))
          .map(c => mockDb.mapCampaign(c));

        const combined = [...mappedBackend, ...uniqueMock]
          .filter(c => !c.isExpired)
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

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const unread = snapshot.docs.some(doc => doc.data().unreadBy?.includes(myId));
        setHasUnread(unread);
      },
      (error) => {
        console.warn("Firestore snapshot error:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Notifications fetch & sub
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) return;
    const user = JSON.parse(userStr);
    
    // Fetch initial notifications
    fetch(`http://localhost:8080/api/notifications/${encodeURIComponent(user.email)}`)
      .then(res => { if (!res.ok) throw new Error('Network error'); return res.json(); })
      .then(data => {
        if (Array.isArray(data)) {
          setNotifications(data);
          setUnreadNotificationCount(data.filter(n => !n.isRead).length);
        }
      })
      .catch(err => console.warn('Notifications fetch failed:', err));

    const stompClient = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      onConnect: () => {
        stompClient.subscribe(`/topic/notifications/${user.email}`, (message) => {
          const newNotif = JSON.parse(message.body);
          setNotifications(prev => [newNotif, ...prev]);
          setUnreadNotificationCount(prev => prev + 1);
        });
      }
    });
    stompClient.activate();

    return () => stompClient.deactivate();
  }, []);

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await fetch(`http://localhost:8080/api/notifications/mark-read/${notif.id}`, { method: 'PUT' });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
        setUnreadNotificationCount(prev => Math.max(0, prev - 1));
      } catch (err) { console.error(err); }
    }
    setShowNotificationDropdown(false);
  };

  // Sidebar Links Configuration
  const navLinks = [
    { name: "Notification", icon: Bell, active: false, action: () => setShowNotificationDropdown(!showNotificationDropdown), dropdown: true, badge: unreadNotificationCount > 0 },
    { name: "Browse Items", icon: Package, active: true, href: "/dashboard" },
    { name: "Messages", icon: MessageCircle, active: false, href: "/chat", badge: hasUnread },
    { name: "My Requests", icon: Activity, active: false, href: "/user-panel" },
    { name: "Blood Donation", icon: Droplets, active: false, href: "/blood-donation" },
    { name: "Need Resource", icon: PackageSearch, active: false, href: "/need-resource" },
    { name: "Academic Resources", icon: GraduationCap, active: false, href: "/academic-resources" },
    { name: "Public Resources", icon: Users2, active: false, href: "/public-resources" },
    { name: "Campaigns", icon: HeartHandshake, active: false, href: "/public-campaigns" },
    { name: "Settings", icon: Settings, active: false, href: "/settings" },
  ];

  // ── SEARCH LOGIC ────────────────────────────────────────────────────────────
  const q = searchQuery.trim().toLowerCase();
  const isSearching = q.length > 0 || selectedCategory !== null;

  const CATEGORIES = [
    { id: "blood",    label: "Blood Donation",    icon: Droplets,      color: "text-red-500",     bg: "bg-red-50",      border: "border-red-200",      activeBg: "bg-red-500",      tag: "Blood Request",   tagColor: "text-red-500 bg-red-50"   },
    { id: "need",     label: "Need Resource",      icon: PackageSearch, color: "text-blue-500",    bg: "bg-blue-50",     border: "border-blue-200",     activeBg: "bg-blue-500",     tag: "Need Resource",   tagColor: "text-blue-500 bg-blue-50"  },
    { id: "academic", label: "Academic Resource",  icon: GraduationCap, color: "text-orange-500",  bg: "bg-orange-50",   border: "border-orange-200",   activeBg: "bg-orange-500",   tag: "Academic",        tagColor: "text-orange-500 bg-orange-50" },
    { id: "public",   label: "Public Resource",    icon: Package,       color: "text-emerald-600", bg: "bg-emerald-50",  border: "border-emerald-200", activeBg: "bg-emerald-600", tag: "Public Resource", tagColor: "text-emerald-600 bg-emerald-50" },
    { id: "campaign", label: "Active Campaign",    icon: HeartHandshake,color: "text-teal-600",   bg: "bg-teal-50",     border: "border-teal-200",     activeBg: "bg-teal-600",     tag: "Campaign",        tagColor: "text-teal-600 bg-teal-50"  },
  ];

  const allItems = [
    ...bloodDonations.map(i => ({ ...i, _searchType: "blood",    _href: `/blood-donation-details?id=${i.id}`,    _label: i.hospitalName,   _sub: `${i.bloodGroup} · ${i.location}`, _tag: "Blood Request",   _tagColor: "text-red-500 bg-red-50",         _searchText: `${i.bloodGroup} ${i.hospitalName} ${i.location} ${i.contactNumber || i.num || ""}` })),
    ...needResources.map(i =>  ({ ...i, _searchType: "need",     _href: `/need-resource-details?id=${i.id}`,    _label: i.requestTitle,   _sub: i.category,                       _tag: "Need Resource",  _tagColor: "text-blue-500 bg-blue-50",        _searchText: `${i.requestTitle} ${i.description} ${i.category}` })),
    ...marketplaceItems.map(i =>({ ...i, _searchType: "academic", _href: `/item-details?id=${i.id}`,             _label: i.title,          _sub: i.subject,                        _tag: "Academic",       _tagColor: "text-orange-500 bg-orange-50",    _searchText: `${i.title} ${i.subject} ${i.resourceCondition || i.condition || ""}` })),
    ...publicResources.map(i => ({ ...i, _searchType: "public",   _href: `/resource-details?id=${i.id}&type=public`, _label: i.title,     _sub: i.category,                       _tag: "Public Resource",_tagColor: "text-emerald-600 bg-emerald-50",  _searchText: `${i.title} ${i.category} ${i.description || ""}` })),
    ...campaigns.map(c =>       ({ ...c, _searchType: "campaign", _href: `/campaign-details?id=${c.id}`,         _label: c.title,          _sub: c.category,                       _tag: "Campaign",       _tagColor: "text-teal-600 bg-teal-50",        _searchText: `${c.title} ${c.description || ""} ${c.category || ""}` })),
  ];

  const searchResults = isSearching
    ? allItems.filter(item => {
        const matchesCategory = selectedCategory === null || item._searchType === selectedCategory;
        const matchesQuery    = q === "" || item._searchText?.toLowerCase().includes(q);
        return matchesCategory && matchesQuery;
      })
    : [];

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
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-white/40 backdrop-blur-2xl border-r border-white/60 p-5 z-20 shadow-[10px_0_40px_-15px_rgba(0,0,0,0.05)]">
        <div className="mb-8 mt-2 px-4">
          <h1 className="text-2xl font-black bg-gradient-to-r from-uiu-orange via-rose-500 to-uiu-emerald bg-clip-text text-transparent tracking-tight">EcoKnot</h1>
          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Dashboard Hub</p>
        </div>

        <nav className="flex-1 flex flex-col gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            
            if (link.action) {
              return (
                <div key={link.name} className="relative">
                  <button
                    onClick={link.action}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all group ${link.active
                      ? "bg-white text-slate-900 shadow-[0_10px_20px_-10px_rgba(0,0,0,0.08)] border border-slate-100"
                      : "text-slate-500 hover:bg-white/50 hover:text-slate-800"
                      }`}
                  >
                    <div className={`p-1.5 rounded-lg transition-colors relative ${link.active ? 'bg-emerald-50 text-uiu-emerald' : 'bg-transparent text-slate-400 group-hover:bg-white'}`}>
                      <Icon className="w-4 h-4" />
                      {link.badge && (
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center text-[7px] text-white">
                          {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                        </div>
                      )}
                    </div>
                    <span className="text-sm">{link.name}</span>
                  </button>

                  {link.dropdown && showNotificationDropdown && (
                    <div className="absolute top-14 left-0 w-80 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-100 p-2 z-[100]">
                      <div className="flex justify-between items-center px-3 py-2 mb-2 border-b border-slate-50">
                        <h3 className="font-black tracking-tight text-slate-800">Notifications</h3>
                        <span className="text-[10px] font-black uppercase text-slate-400">{unreadNotificationCount} Unread</span>
                      </div>
                      <div className="max-h-80 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                        {notifications.slice(0, 10).map((notif) => (
                          <Link
                            key={notif.id}
                            href={
                              notif.postType === "BLOOD_DONATION" ? `/blood-donation-details?id=${notif.postId}`
                              : notif.postType === "ACADEMIC" ? `/item-details?id=${notif.postId}`
                              : notif.postType === "PUBLIC" ? `/resource-details?id=${notif.postId}&type=public`
                              : notif.postType === "NEED_RESOURCE" ? `/need-resource-details?id=${notif.postId}`
                              : notif.postType === "CAMPAIGN" ? `/campaign-details?id=${notif.postId}`
                              : "#"
                            }
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-3 rounded-xl transition-all ${
                              notif.isRead ? "opacity-70 hover:bg-slate-50" : "bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100/50"
                            }`}
                          >
                            <p className="text-[12px] font-bold text-slate-700 leading-tight">
                              {notif.message}
                            </p>
                            <p className="text-[10px] font-semibold text-slate-400 mt-1 uppercase">
                              {notif.postType?.replace('_', ' ')}
                            </p>
                          </Link>
                        ))}
                        {notifications.length === 0 && (
                          <div className="py-8 text-center">
                            <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-slate-400 font-bold text-xs uppercase">All caught up!</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={link.name}
                href={link.href || "#"}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all group ${link.active
                  ? "bg-white text-slate-900 shadow-[0_10px_20px_-10px_rgba(0,0,0,0.08)] border border-slate-100"
                  : "text-slate-500 hover:bg-white/50 hover:text-slate-800"
                  }`}
              >
                <div className={`p-1.5 rounded-lg transition-colors relative ${link.active ? 'bg-emerald-50 text-uiu-emerald' : 'bg-transparent text-slate-400 group-hover:bg-white'}`}>
                  <Icon className="w-4 h-4" />
                  {link.badge && (
                    <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
                  )}
                </div>
                <span className="text-sm">{link.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          <Link href="/" className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-500 font-bold hover:bg-white hover:text-rose-600 transition-all hover:shadow-[0_10px_20px_-10px_rgba(225,29,72,0.1)] group">
            <div className="p-1.5 rounded-lg bg-transparent text-slate-400 group-hover:bg-rose-50 transition-colors">
              <LogOut className="w-4 h-4 group-hover:text-rose-500 transition-colors" />
            </div>
            <span className="text-sm">Log Out</span>
          </Link>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 w-full flex flex-col h-screen overflow-y-auto z-10 custom-scrollbar">
        <div className="max-w-6xl mx-auto w-full p-6 md:p-8 pb-32 md:pb-8 h-full">

          {/* HEADER */}
          <header className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center mb-8">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Welcome to the Hub! 🌿</h2>
              <p className="text-slate-500 font-medium mt-1 text-base">Browse resources and join active campaigns.</p>
            </div>

            <div className="flex items-center gap-4 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-72 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-uiu-emerald transition-colors pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 150)}
                  placeholder="Search resources, blood type, campaigns..."
                  className="w-full pl-11 pr-9 py-2.5 rounded-full bg-white/60 backdrop-blur-md border border-white focus:border-uiu-emerald focus:ring-4 focus:ring-uiu-emerald/10 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-bold shadow-sm text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors"
                  >
                    <X className="w-3 h-3 text-slate-500" />
                  </button>
                )}
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

          {/* ── CATEGORY FILTER CHIPS ───────────────────────────────────────── */}
          <div className="flex flex-wrap gap-2 mb-6">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(isActive ? null : cat.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black border transition-all ${
                    isActive
                      ? `${cat.activeBg} text-white border-transparent shadow-md scale-105`
                      : `${cat.bg} ${cat.color} ${cat.border} hover:scale-105 hover:shadow-sm`
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {cat.label}
                </button>
              );
            })}
            {(selectedCategory || searchQuery) && (
              <button
                onClick={() => { setSelectedCategory(null); setSearchQuery(""); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-black bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200 transition-all"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          {/* STATS SECTION
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
          </div> */}

          {/* ── SEARCH RESULTS ─────────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {isSearching && (
              <motion.div
                key="search-results"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="mb-6"
              >
                {/* Results header — shows active category chip or generic search label */}
                <div className="flex items-center gap-3 mb-4">
                  {(() => {
                    const activeCat = CATEGORIES.find(c => c.id === selectedCategory);
                    const Icon = activeCat?.icon || Search;
                    return (
                      <div className={`p-2 rounded-xl border ${activeCat ? `${activeCat.bg} ${activeCat.border}` : 'bg-uiu-emerald/10 border-emerald-100'}`}>
                        <Icon className={`w-4 h-4 ${activeCat ? activeCat.color : 'text-uiu-emerald'}`} />
                      </div>
                    );
                  })()}
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      {selectedCategory
                        ? CATEGORIES.find(c => c.id === selectedCategory)?.label
                        : "Search Results"}
                    </h3>
                    <p className="text-slate-400 font-medium text-xs">
                      {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
                      {searchQuery && <> for &quot;<span className="text-uiu-emerald font-black">{searchQuery}</span>&quot;</>}
                      {!searchQuery && selectedCategory && <> in this category</>}
                    </p>
                  </div>
                  <button
                    onClick={() => { setSearchQuery(""); setSelectedCategory(null); }}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-black transition-colors"
                  >
                    <X className="w-3 h-3" /> Clear All
                  </button>
                </div>

                {searchResults.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {searchResults.map((item, i) => (
                      <motion.div
                        key={`sr-${item._searchType}-${item.id}-${i}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <Link
                          href={item._href}
                          className="flex items-start gap-4 p-4 bg-white/70 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm hover:shadow-lg hover:bg-white/90 hover:-translate-y-1 transition-all group"
                        >
                          {/* Type icon */}
                          <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                            item._searchType === "blood"    ? "bg-red-100"    :
                            item._searchType === "need"     ? "bg-blue-100"   :
                            item._searchType === "academic" ? "bg-orange-100" :
                            item._searchType === "campaign" ? "bg-teal-100"   :
                                                              "bg-emerald-100"
                          }`}>
                            {item._searchType === "blood"    && <Droplets className="w-5 h-5 text-red-500" />}
                            {item._searchType === "need"     && <PackageSearch className="w-5 h-5 text-blue-500" />}
                            {item._searchType === "academic" && <GraduationCap className="w-5 h-5 text-orange-500" />}
                            {item._searchType === "public"   && <Package className="w-5 h-5 text-emerald-600" />}
                            {item._searchType === "campaign" && <HeartHandshake className="w-5 h-5 text-teal-600" />}
                          </div>

                          {/* Text */}
                          <div className="flex-1 min-w-0">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest mb-1 ${item._tagColor}`}>
                              {item._tag}
                            </span>
                            <h4 className="text-sm font-black text-slate-900 line-clamp-1 group-hover:text-uiu-emerald transition-colors">
                              {item._label || "Untitled"}
                            </h4>
                            {item._sub && (
                              <p className="text-[11px] font-semibold text-slate-400 line-clamp-1 mt-0.5">
                                {item._sub}
                              </p>
                            )}
                          </div>

                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-uiu-emerald shrink-0 mt-1 transition-colors" />
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center bg-white/30 rounded-[2rem] border border-dashed border-slate-200">
                    <Search className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-black text-sm">No results found</p>
                    <p className="text-slate-300 font-semibold text-xs mt-1">
                      Try a different keyword — blood type, resource title, or campaign name.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── NORMAL SECTIONS (hidden while searching) ───────────────────── */}
          {!isSearching && (<>

          {/* ── BLOOD DONATION SECTION ──────────────────────────────────────── */}
          <div className="mb-6">
            <div className="flex justify-between items-end mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 bg-red-50 rounded-lg border border-red-100">
                    <Droplets className="w-3.5 h-3.5 text-red-500" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Blood Donation</h3>
                </div>
                <p className="text-slate-500 font-medium text-sm">Recent urgent blood requests from the community.</p>
              </div>
              <Link href="/blood-donation" className="text-red-500 font-black text-[10px] hover:underline flex items-center gap-1 mb-1 uppercase tracking-wider">
                View All <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5" style={{gridAutoRows: '220px'}}>
              {bloodDonations.length > 0 ? bloodDonations.map((item, i) => (
                <motion.div
                  key={`blood-${item.id}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <motion.div whileHover={{ y: -6 }}
                    className="group bg-white/60 backdrop-blur-xl rounded-[1.5rem] border border-white/80 shadow-sm overflow-hidden hover:shadow-xl transition-all flex flex-col h-full">
                    <div className={`h-20 shrink-0 relative flex items-center justify-center overflow-hidden ${item.urgent ? "bg-gradient-to-br from-red-500 to-rose-600" : "bg-gradient-to-br from-rose-100 to-red-50"
                      }`}>
                      <span className={`text-4xl font-black tracking-tighter select-none ${item.urgent ? "text-white/80" : "text-red-400/30"
                        }`}>{item.bloodGroup}</span>
                      <div className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-white text-[10px] font-black shadow-sm ${item.bloodGroup === "O+" || item.bloodGroup === "O-" ? "bg-orange-500" :
                          item.bloodGroup?.startsWith("A") ? "bg-red-500" :
                            item.bloodGroup?.startsWith("B") ? "bg-blue-500" : "bg-purple-500"
                        }`}>{item.bloodGroup}</div>
                      {item.urgent && (
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white text-[8px] font-black">
                          <Flame className="w-2 h-2" /> Urgent
                        </div>
                      )}
                    </div>
                    <div className="p-3.5 flex-1 flex flex-col bg-white/80 overflow-hidden">
                      <div className="text-[8px] font-black text-red-500 uppercase tracking-widest mb-1">Blood Request</div>
                      <h4 className="text-sm font-black text-slate-900 mb-1 line-clamp-1">{item.hospitalName}</h4>
                      <div className="space-y-0.5 text-[10px] font-bold text-slate-500 mb-2">
                        <div className="flex items-center gap-1"><MapPin className="w-2.5 h-2.5 text-rose-400" />{item.location}</div>
                        <div className="flex items-center gap-1"><Phone className="w-2.5 h-2.5 text-green-500" />{item.num || item.contactNumber}</div>
                      </div>
                      <Link href={`/blood-donation-details?id=${item.id}`}
                        className="mt-auto w-full py-2 rounded-lg font-black text-white text-[10px] bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 shadow-md transition-all flex items-center justify-center gap-1.5">
                        View Request <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </motion.div>
                </motion.div>
              )) : (
                <div className="col-span-full py-16 text-center text-slate-400 font-medium italic bg-white/30 rounded-[2rem] border border-dashed border-red-100">
                  <Droplets className="w-10 h-10 text-red-200 mx-auto mb-3" />
                  No blood donation requests yet.
                  <Link href="/blood-donation" className="block mt-2 text-red-500 font-black text-sm hover:underline">Post the first request →</Link>
                </div>
              )}
            </div>
          </div>

          {/* ── NEED RESOURCE SECTION ──────────────────────────────────────── */}
          <div className="mb-6">
            <div className="flex justify-between items-end mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 bg-blue-50 rounded-lg border border-blue-100">
                    <PackageSearch className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Need Resource</h3>
                </div>
                <p className="text-slate-500 font-medium text-sm">Community requests for academic or public items.</p>
              </div>
              <Link href="/need-resource" className="text-blue-500 font-black text-[10px] hover:underline flex items-center gap-1 mb-1 uppercase tracking-wider">
                View All <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5" style={{gridAutoRows: '220px'}}>
              {needResources.length > 0 ? needResources.map((item, i) => (
                <motion.div key={`need-${item.id}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}>
                  <motion.div whileHover={{ y: -6 }} className="group bg-white/60 backdrop-blur-xl rounded-[1.5rem] border border-white/80 shadow-sm overflow-hidden flex flex-col h-full hover:shadow-xl transition-all">
                    <div className="p-4 border-b border-slate-100/50 flex flex-col gap-1.5 h-20 shrink-0 justify-center">
                       <span className={`w-max px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${item.category === "Academic" ? "bg-indigo-100 text-indigo-700" : "bg-teal-100 text-teal-700"}`}>
                         {item.category}
                       </span>
                       <h4 className="text-sm font-black text-slate-900 line-clamp-2 leading-tight">{item.requestTitle}</h4>
                    </div>
                    <div className="p-4 flex-1 flex flex-col bg-white/80 overflow-hidden">
                      <p className="text-slate-500 font-medium text-[11px] line-clamp-3 mb-3 italic">"{item.description}"</p>
                      <Link href={`/need-resource-details?id=${item.id}`} className="mt-auto w-full py-2 rounded-lg font-black text-white text-[10px] bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-md transition-all flex items-center justify-center gap-1.5 focus:ring-2 focus:ring-blue-500/20">
                         View Details <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </motion.div>
                </motion.div>
              )) : (
                <div className="col-span-full py-12 text-center text-slate-400 font-medium italic bg-white/30 rounded-[2rem] border border-dashed border-blue-100">
                  <PackageSearch className="w-8 h-8 text-blue-200 mx-auto mb-3" /> No pending requests.
                </div>
              )}
            </div>
          </div>

          {/* MARKETPLACE FEED */}
          <div>
            <div className="flex justify-between items-end mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Academic Resources</h3>
                <p className="text-slate-500 font-medium mt-1 text-sm">Discover what your peers are sharing right now.</p>
              </div>
              <Link href="/academic-resources" className="text-uiu-orange font-black text-[10px] hover:underline flex items-center gap-1 mb-1 uppercase tracking-wider">
                View All <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5" style={{gridAutoRows: '220px'}}>
              {marketplaceItems.length > 0 ? marketplaceItems.map((item, i) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 + 0.3 }}
                  key={item._uniqueId || item.id}
                >
                  <motion.div
                    whileHover={{ y: -8 }}
                    className="group bg-white/60 backdrop-blur-xl rounded-[1.5rem] border border-white/80 shadow-sm overflow-hidden hover:shadow-xl transition-all flex flex-col h-full"
                  >
                    <div className={`h-20 shrink-0 relative overflow-hidden flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100`}>
                      <div className="relative z-10 scale-90">{item.icon}</div>
                      <div className="absolute top-3 left-3 z-20">
                        <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-white/80 backdrop-blur-md text-slate-700 shadow-sm uppercase tracking-wider">
                          {item.resourceCondition || item.condition}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col bg-white/80 border-t border-white overflow-hidden">
                      <div className="flex items-center gap-1 text-[8px] font-black text-uiu-orange mb-1 uppercase tracking-widest">
                        <Tag className="w-2.5 h-2.5" />
                        {item.subject}
                      </div>
                      <h4 className="text-sm font-black text-slate-900 mb-2 leading-tight line-clamp-2">{item.title}</h4>
                      <Link href={`/item-details?id=${item.id}`} className="mt-auto w-full py-2 rounded-lg font-black text-white text-[10px] bg-uiu-emerald hover:bg-emerald-600 shadow-md transition-all flex items-center justify-center gap-1.5">
                        View Item <ArrowUpRight className="w-3 h-3" />
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
          <div className="mt-6">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Public Resources</h3>
                <p className="text-slate-500 font-medium mt-1 text-sm">Community shared items for free or exchange.</p>
              </div>
              <Link href="/public-resources" className="text-uiu-emerald font-black text-[10px] hover:underline flex items-center gap-1 mb-1 uppercase tracking-wider">
                View All <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5" style={{gridAutoRows: '220px'}}>
              {publicResources.length > 0 ? publicResources.map((item, i) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 + 0.3 }}
                  key={`public-${item.id}`}
                >
                  <motion.div
                    whileHover={{ y: -8 }}
                    className="group bg-white/60 backdrop-blur-xl rounded-[1.5rem] border border-white/80 shadow-sm overflow-hidden hover:shadow-xl transition-all flex flex-col h-full"
                  >
                    <div className="h-20 shrink-0 relative overflow-hidden bg-slate-100 flex items-center justify-center">
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-8 h-8 text-slate-300" />
                      )}
                      <div className="absolute top-2.5 right-2.5">
                        <button className="p-1.5 rounded-full bg-white/80 backdrop-blur-md text-uiu-orange shadow-sm hover:bg-uiu-orange hover:text-white transition-all">
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col bg-white/80 overflow-hidden">
                      <div className="text-[8px] font-black text-uiu-emerald uppercase tracking-widest mb-1">{item.category || "Community"}</div>
                      <h4 className="text-sm font-black text-slate-800 mb-2 line-clamp-1">{item.title}</h4>
                      <Link
                        href={`/resource-details?id=${item.id}&type=public`}
                        className="mt-auto w-full py-2 rounded-lg font-black text-white text-[10px] bg-uiu-emerald hover:bg-emerald-600 shadow-md transition-all flex items-center justify-center gap-1.5"
                      >
                        View Item <ArrowUpRight className="w-3 h-3" />
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
          <div className="mt-6 mb-6">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Active Campaigns</h3>
                <p className="text-slate-500 font-medium mt-1 text-sm">Join a movement and help the community.</p>
              </div>
              <Link href="/public-campaigns" className="text-uiu-orange font-black text-[10px] hover:underline flex items-center gap-1 mb-1 uppercase tracking-wider">
                View All <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5" style={{gridAutoRows: '260px'}}>
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
                    className="group bg-white/60 backdrop-blur-xl rounded-[1.5rem] border border-white/80 shadow-sm overflow-hidden hover:shadow-xl transition-all flex flex-col h-full"
                  >
                    {/* Campaign Image Header */}
                    <div className="h-[90px] shrink-0 relative overflow-hidden">
                      <img
                        src={camp.image || `https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&q=80&w=800`}
                        alt={camp.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-50" />
                      <div className="absolute top-2.5 left-2.5">
                        <span className="px-2 py-0.5 rounded-full bg-uiu-emerald/90 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg">
                          <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
                          Live Project
                        </span>
                      </div>
                      <div className="absolute top-2.5 right-2.5">
                        <span className="px-2 py-0.5 rounded-full bg-slate-900/70 backdrop-blur-md text-white text-[8px] font-black flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />{camp.daysLeft || "14"}d Left
                        </span>
                      </div>
                    </div>

                    <div className="p-3 flex flex-col flex-1 overflow-hidden">
                      <div className="mb-1.5">
                        <h3 className="text-sm font-black text-slate-800 tracking-tight group-hover:text-uiu-emerald transition-colors leading-tight line-clamp-1">{camp.title}</h3>
                        <p className="text-slate-400 font-bold text-[9px] lowercase mt-0.5">{camp.category || "General Drive"}</p>
                      </div>

                      <p className="text-slate-500 font-medium text-[10px] line-clamp-2 leading-relaxed mb-2">
                        {camp.description}
                      </p>

                      <div className="space-y-1 mb-2.5">
                        <div className="flex justify-between items-end">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Goal</span>
                          <span className="text-[10px] font-black text-slate-900">{camp.progress || 0}% Achieved</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-100/50">
                          <div className="h-full bg-gradient-to-r from-uiu-emerald to-teal-400 rounded-full transition-all duration-1000" style={{ width: `${camp.progress || 0}%` }} />
                        </div>
                      </div>

                      {/* TWO ACTION BUTTONS */}
                      <div className="flex gap-1.5 mt-auto">
                        <Link
                          href={`/campaign-details?id=${camp.id}`}
                          className="flex-1 py-2 rounded-xl font-black text-slate-600 text-[10px] bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center gap-1 border border-slate-200 hover:border-slate-300"
                        >
                          View Details
                        </Link>
                        <Link
                          href={`/campaign-details?id=${camp.id}`}
                          className="flex-1 py-2 rounded-xl font-black text-white text-[10px] bg-gradient-to-r from-uiu-emerald to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-md shadow-emerald-200/50 transition-all flex items-center justify-center gap-1"
                        >
                          Join 🤝
                        </Link>
                      </div>
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

          {/* end !isSearching */}
          </>)}

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
