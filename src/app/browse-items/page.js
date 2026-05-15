"use client";

import { useState, useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  BookOpen, 
  Laptop, 
  PenTool, 
  ChevronRight,
  Package,
  MapPin,
  Clock,
  ArrowRight
} from "lucide-react";
import Link from "next/link";

const ITEM_CATEGORIES = ["All", "Books", "Electronics", "Stationery", "Lab Tools"];

const DEMO_ITEMS = [
  {
    id: 1,
    name: "Advanced Microbiology Textbook",
    category: "Books",
    condition: "Like New",
    postedBy: "Sarah M.",
    location: "UIU Library Cafe",
    time: "2h ago",
    icon: <BookOpen className="w-8 h-8 text-indigo-500" />,
    gradient: "from-indigo-500/10 to-blue-500/5",
  },
  {
    id: 2,
    name: "Scientific Calculator (Casio)",
    category: "Electronics",
    condition: "Good",
    postedBy: "Rahat H.",
    location: "UIU Ground Floor",
    time: "5h ago",
    icon: <Laptop className="w-8 h-8 text-orange-500" />,
    gradient: "from-orange-500/10 to-rose-500/5",
  },
  {
    id: 3,
    name: "Organic Chemistry Lab Coat",
    category: "Stationery",
    condition: "Fair",
    postedBy: "Nadia A.",
    location: "Lab Building Entrance",
    time: "1d ago",
    icon: <PenTool className="w-8 h-8 text-emerald-500" />,
    gradient: "from-emerald-500/10 to-teal-500/5",
  },
  {
    id: 4,
    name: "Engineering Drawing Set",
    category: "Stationery",
    condition: "Brand New",
    postedBy: "Abid Z.",
    location: "Dhanmondi Campus",
    time: "3h ago",
    icon: <Package className="w-8 h-8 text-blue-500" />,
    gradient: "from-blue-500/10 to-cyan-500/5",
  },
  {
    id: 5,
    name: "Data Structures & Algorithms",
    category: "Books",
    condition: "Used",
    postedBy: "Tanvir R.",
    location: "UIU Canteen",
    time: "8h ago",
    icon: <BookOpen className="w-8 h-8 text-violet-500" />,
    gradient: "from-violet-500/10 to-purple-500/5",
  },
  {
    id: 6,
    name: "Mechanical Keyboard",
    category: "Electronics",
    condition: "Excellent",
    postedBy: "Fahim K.",
    location: "CSE Department",
    time: "10m ago",
    icon: <Laptop className="w-8 h-8 text-rose-500" />,
    gradient: "from-rose-500/10 to-orange-500/5",
  }
];

export default function BrowseItemsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => setIsMounted(true), []);

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

  const filteredItems = DEMO_ITEMS.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (!isMounted) return null;

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
      <header className="max-w-7xl mx-auto w-full px-6 pt-12 z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/50 backdrop-blur-md border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-slate-700 font-bold hover:bg-white/90 hover:text-slate-900 transition-all group w-max"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </Link>

        {/* Global Stats or Breadcrumb could go here */}
        <div className="flex items-center gap-4 text-xs font-black text-slate-400 uppercase tracking-widest px-4 py-2 bg-white/30 backdrop-blur-sm rounded-full border border-white/40">
           <span className="text-uiu-emerald">{filteredItems.length}</span> Items Available in UIU
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto w-full px-6 py-12 z-10 flex flex-col flex-1 pb-32">
        
        {/* HEADER & FILTERS */}
        <div className="mb-16">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight mb-8"
          >
            Find Student <span className="text-uiu-orange">Resources</span>
          </motion.h1>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Search Bar */}
            <div className="relative flex-grow">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search for books, electronics, lab tools..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-16 pr-8 py-6 rounded-[2rem] bg-white/70 backdrop-blur-xl border border-white shadow-xl shadow-slate-200/50 focus:ring-4 focus:ring-uiu-emerald/10 outline-none transition-all font-bold text-slate-800 text-lg"
              />
            </div>

            {/* Category Filter */}
            <div className="flex overflow-x-auto pb-4 lg:pb-0 gap-3 scrollbar-hide no-scrollbar">
               {ITEM_CATEGORIES.map((cat) => (
                 <button
                   key={cat}
                   onClick={() => setSelectedCategory(cat)}
                   className={`px-8 py-6 rounded-[2rem] font-bold text-sm whitespace-nowrap transition-all border ${
                     selectedCategory === cat 
                       ? "bg-slate-900 text-white border-slate-900 shadow-xl" 
                       : "bg-white/60 text-slate-500 border-white hover:bg-white hover:text-slate-900 shadow-sm"
                   }`}
                 >
                   {cat}
                 </button>
               ))}
            </div>
          </div>
        </div>

        {/* ITEM GRID */}
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredItems.map((item, i) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.6, type: "spring" }}
                whileHover={{ y: -8 }}
                className="group flex flex-col h-full bg-white/70 backdrop-blur-2xl rounded-[2.5rem] border border-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.04)] hover:shadow-[0_40px_80px_-20px_rgba(242,101,34,0.12)] transition-all duration-500 overflow-hidden"
              >
                {/* Visual Header */}
                <div className={`p-8 bg-gradient-to-br ${item.gradient} relative overflow-hidden flex flex-col items-center justify-center border-b border-white`}>
                  <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="p-6 bg-white rounded-3xl shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-500">
                    {item.icon}
                  </div>
                  <div className="absolute top-5 right-5">
                    <span className="px-4 py-1.5 bg-white/80 backdrop-blur-md rounded-full border border-white text-[10px] font-black tracking-widest uppercase text-slate-500 shadow-sm">
                      {item.category}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-8 flex flex-col flex-1">
                  <div className="mb-6">
                    <h3 className="text-2xl font-black text-slate-800 mb-2 truncate group-hover:text-uiu-emerald transition-colors">
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-2">
                       <span className="px-3 py-1 rounded-full bg-uiu-emerald/10 text-uiu-emerald text-[10px] font-black uppercase tracking-tighter">
                          {item.condition}
                       </span>
                       <span className="text-xs font-bold text-slate-400">• By {item.postedBy}</span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-8">
                    <div className="flex items-center gap-3 text-slate-500 transition-colors group-hover:text-slate-700">
                      <MapPin className="w-4 h-4 text-uiu-orange" />
                      <span className="text-xs font-bold">{item.location}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500">
                      <Clock className="w-4 h-4 text-slate-300" />
                      <span className="text-xs font-bold">{item.time}</span>
                    </div>
                  </div>

                  <div className="mt-auto flex items-center gap-3">
                    <Link href="/" className="flex-grow py-4 rounded-2xl bg-slate-100 text-slate-900 font-black text-sm hover:bg-slate-900 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2 group/btn">
                       View Details <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                    <button className="p-4 rounded-2xl bg-white border border-slate-100 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                       <ArrowRight className="w-5 h-5 -rotate-45" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-32 flex flex-col items-center justify-center text-center">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <Search className="w-10 h-10 text-slate-200" />
             </div>
             <h2 className="text-2xl font-black text-slate-900 mb-2">No items found</h2>
             <p className="text-slate-500 font-medium max-w-sm">
               We couldn't find anything matching your search. Try different keywords or browse all categories.
             </p>
             <button 
               onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}
               className="mt-8 text-uiu-emerald font-black hover:underline"
             >
               Clear all filters
             </button>
          </div>
        )}
      </main>

      {/* Decorative Blobs */}
      <div className="fixed top-[10%] -right-[10vw] w-[40vw] h-[40vw] bg-uiu-orange/5 blur-[120px] -z-10 rounded-full" />
      <div className="fixed bottom-[10%] -left-[10vw] w-[50vw] h-[50vw] bg-uiu-emerald/5 blur-[140px] -z-10 rounded-full" />
    </div>
  );
}
