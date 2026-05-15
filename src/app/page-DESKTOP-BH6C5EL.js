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
  MessageSquare 
} from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export default function Home() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, -100]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  
  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 60, damping: 15 } }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans overflow-hidden bg-[#0a192f]" ref={containerRef}>
      {/* BACKGROUND ELEMENTS */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* Animated Gradient Orbs */}
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-uiu-emerald/20 blur-[150px] mix-blend-screen" 
        />
        <motion.div 
          animate={{ scale: [1, 1.3, 1], x: [0, 50, 0], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-[-10%] top-[10%] w-[40vw] h-[40vw] rounded-full bg-uiu-orange/15 blur-[150px] mix-blend-screen" 
        />
        <motion.div 
          animate={{ x: [0, -50, 0], y: [0, -50, 0], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-20%] right-[20%] w-[50vw] h-[50vw] rounded-full bg-rose-500/10 blur-[150px] mix-blend-screen" 
        />
        
        {/* Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_70%,transparent_110%)] z-0" />
      </div>

      {/* NAVBAR */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0a192f]/70 backdrop-blur-xl"
      >
        <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer">
            <span className="text-2xl font-black bg-gradient-to-r from-uiu-orange via-rose-500 to-uiu-emerald bg-clip-text text-transparent group-hover:opacity-80 transition-opacity">
              EcoNexus
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-10 text-sm font-semibold text-gray-300">
            <a href="#" className="relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-uiu-orange after:transition-all hover:after:w-full hover:text-white transition-colors">Home</a>
            <a href="#" className="relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-uiu-orange after:transition-all hover:after:w-full hover:text-white transition-colors">Browse Items</a>
            <a href="#" className="relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-uiu-orange after:transition-all hover:after:w-full hover:text-white transition-colors">Campaigns</a>
            <a href="#" className="relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-uiu-orange after:transition-all hover:after:w-full hover:text-white transition-colors">About</a>
          </nav>

          <div className="flex items-center gap-4">
            <button className="hidden sm:block px-6 py-2.5 text-sm font-semibold text-gray-200 border-2 border-transparent hover:border-white/10 rounded-full hover:bg-white/5 transition-all">
              Login
            </button>
            <button className="group relative px-6 py-2.5 text-sm font-bold text-white rounded-full overflow-hidden shadow-[0_0_40px_-10px_rgba(242,101,34,0.6)] hover:shadow-[0_0_60px_-15px_rgba(242,101,34,0.8)] transition-shadow">
              <span className="absolute inset-0 bg-gradient-to-r from-uiu-orange to-rose-600 transition-transform group-hover:scale-105 duration-300" />
              <span className="relative flex items-center gap-2">Join Now <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
            </button>
          </div>
        </div>
      </motion.header>

      <main className="flex-grow z-10">
        {/* HERO SECTION */}
        <motion.section 
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative pt-32 pb-40 px-6 max-w-7xl mx-auto text-center flex flex-col items-center justify-center min-h-[90vh]"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5, type: "spring" }}
            className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-uiu-emerald/20 text-uiu-emerald text-sm font-bold mb-10 border border-uiu-emerald/20 shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)] backdrop-blur-md"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-uiu-emerald opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-uiu-emerald"></span>
            </span>
            UIU's Premier Resource Exchange Platform
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="text-6xl md:text-8xl font-black tracking-tighter text-white max-w-5xl mb-8 leading-[1.1]"
          >
            Empowering Students through <span className="text-transparent bg-clip-text bg-gradient-to-r from-uiu-emerald via-teal-400 to-emerald-600 drop-shadow-sm">Sustainable</span> Sharing.
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="text-xl md:text-2xl text-gray-300 max-w-3xl mb-14 font-medium"
          >
            Join the movement to exchange resources, reduce waste, and support our community through impactful donation drives.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="flex flex-col sm:flex-row items-center gap-6"
          >
            <button className="group relative h-16 px-10 rounded-full bg-white text-zinc-900 font-bold text-lg flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_20px_50px_-12px_rgba(255,255,255,0.2)] w-full sm:w-auto">
              Explore Marketplace <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="group h-16 px-10 rounded-full bg-white/5 border-2 border-white/10 backdrop-blur-md text-white font-bold text-lg flex items-center justify-center gap-3 hover:bg-white/10 hover:border-white/20 transition-all w-full sm:w-auto">
              Start Donating <Heart className="w-5 h-5 text-rose-500 group-hover:scale-110 transition-transform" />
            </button>
          </motion.div>
        </motion.section>

        {/* FEATURES GRID */}
        <section className="py-32 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-900/30 to-transparent -z-10" />
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="max-w-7xl mx-auto px-6"
          >
            <div className="text-center mb-24">
              <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-black text-white mb-6">Built for the UIU Ecosystem</motion.h2>
              <motion.p variants={fadeUp} className="text-xl text-gray-400 font-medium">Everything you need to thrive academically while being eco-conscious.</motion.p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 relative">
              {/* Card 1 */}
              <motion.div variants={fadeUp} whileHover={{ y: -10 }} className="group relative rounded-[2.5rem] p-10 bg-zinc-900/40 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 via-transparent to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-orange-400 to-uiu-orange flex items-center justify-center mb-8 shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform duration-500">
                  <Package className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Easy Exchange</h3>
                <p className="text-gray-400 leading-relaxed text-lg">
                  Share books, lab tools, and academic resources effortlessly with your peers. Reduce cost and waste.
                </p>
              </motion.div>
              
              {/* Card 2 */}
              <motion.div variants={fadeUp} whileHover={{ y: -10 }} className="group relative rounded-[2.5rem] p-10 bg-zinc-900/40 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/0 via-transparent to-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center mb-8 shadow-lg shadow-rose-500/30 group-hover:scale-110 transition-transform duration-500">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Live Campaigns</h3>
                <p className="text-gray-400 leading-relaxed text-lg">
                  Participate in ongoing university charity drives. Donate clothes, books, and essentials to those in need.
                </p>
              </motion.div>

              {/* Card 3 */}
              <motion.div variants={fadeUp} whileHover={{ y: -10 }} className="group relative rounded-[2.5rem] p-10 bg-zinc-900/40 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 via-transparent to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-teal-400 to-uiu-emerald flex items-center justify-center mb-8 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-500">
                  <Leaf className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Eco-Points</h3>
                <p className="text-gray-400 leading-relaxed text-lg">
                  Earn rewarding Eco-Points for every successful donation and platform exchange. Redeem for campus perks.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* MARKETPLACE PREVIEW */}
        <section className="py-32">
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="max-w-7xl mx-auto px-6"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mb-16">
              <div>
                <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-black text-white mb-4">Recent Listings</motion.h2>
                <motion.p variants={fadeUp} className="text-xl text-gray-400 font-medium">Discover what your peers are sharing right now.</motion.p>
              </div>
              <motion.button variants={fadeUp} className="hidden sm:flex items-center gap-2 text-uiu-orange font-bold text-lg hover:text-orange-600 transition-colors group">
                View all items 
                <span className="w-8 h-8 rounded-full bg-uiu-orange/10 flex items-center justify-center group-hover:bg-uiu-orange/20 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </span>
              </motion.button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Item 1 */}
              <motion.div variants={fadeUp} whileHover={{ y: -8 }} className="group rounded-[2rem] border border-white/10 bg-zinc-900/60 backdrop-blur-lg overflow-hidden hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] transition-all duration-300">
                <div className="h-64 relative overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 to-purple-900/40 z-0 group-hover:scale-110 transition-transform duration-700"></div>
                  <BookOpen className="w-20 h-20 text-indigo-400/50 relative z-10 group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute top-5 left-5 z-20">
                    <span className="px-4 py-2 text-xs font-black rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 backdrop-blur-xl">
                      Good Condition
                    </span>
                  </div>
                </div>
                <div className="p-8 relative bg-slate-950/60 backdrop-blur-md z-20 border-t border-white/5">
                  <h3 className="text-2xl font-black text-white mb-3 line-clamp-1">Microbiology Textbook</h3>
                  <p className="text-base text-gray-400 mb-8 font-medium">Posted 2 hours ago • By Sarah M.</p>
                  <button className="w-full py-4 rounded-2xl bg-zinc-800 text-white font-bold hover:bg-gradient-to-r hover:from-uiu-orange hover:to-rose-500 hover:text-white transition-all shadow-sm border border-white/5 hover:border-transparent">
                    I'm Interested
                  </button>
                </div>
              </motion.div>

              {/* Item 2 */}
              <motion.div variants={fadeUp} whileHover={{ y: -8 }} className="group rounded-[2rem] border border-white/10 bg-zinc-900/60 backdrop-blur-lg overflow-hidden hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] transition-all duration-300">
                <div className="h-64 relative overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-900/40 to-rose-900/40 z-0 group-hover:scale-110 transition-transform duration-700"></div>
                  <Package className="w-20 h-20 text-orange-400/50 relative z-10 group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute top-5 left-5 z-20">
                    <span className="px-4 py-2 text-xs font-black rounded-full bg-blue-400/20 text-blue-300 border border-blue-400/30 backdrop-blur-xl">
                      Like New
                    </span>
                  </div>
                </div>
                <div className="p-8 relative bg-slate-950/60 backdrop-blur-md z-20 border-t border-white/5">
                  <h3 className="text-2xl font-black text-white mb-3 line-clamp-1">Physics Lab Coat</h3>
                  <p className="text-base text-gray-400 mb-8 font-medium">Posted 5 hours ago • By Ahmed R.</p>
                  <button className="w-full py-4 rounded-2xl bg-zinc-800 text-white font-bold hover:bg-gradient-to-r hover:from-uiu-orange hover:to-rose-500 hover:text-white transition-all shadow-sm border border-white/5 hover:border-transparent">
                    I'm Interested
                  </button>
                </div>
              </motion.div>

              {/* Item 3 */}
              <motion.div variants={fadeUp} whileHover={{ y: -8 }} className="group rounded-[2rem] border border-white/10 bg-zinc-900/60 backdrop-blur-lg overflow-hidden hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] transition-all duration-300">
                <div className="h-64 relative overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/40 to-teal-900/40 z-0 group-hover:scale-110 transition-transform duration-700"></div>
                  <Search className="w-20 h-20 text-emerald-400/50 relative z-10 group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute top-5 left-5 z-20">
                    <span className="px-4 py-2 text-xs font-black rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 backdrop-blur-xl">
                      Fair Condition
                    </span>
                  </div>
                </div>
                <div className="p-8 relative bg-slate-950/60 backdrop-blur-md z-20 border-t border-white/5">
                  <h3 className="text-2xl font-black text-white mb-3 line-clamp-1">Casio fx-991EX</h3>
                  <p className="text-base text-gray-400 mb-8 font-medium">Posted 1 day ago • By Tanvir H.</p>
                  <button className="w-full py-4 rounded-2xl bg-zinc-800 text-white font-bold hover:bg-gradient-to-r hover:from-uiu-orange hover:to-rose-500 hover:text-white transition-all shadow-sm border border-white/5 hover:border-transparent">
                    I'm Interested
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* FEATURED CAMPAIGN */}
        <section className="py-32 relative">
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(242,101,34,0.05),rgba(225,29,72,0.05),transparent)] -z-10" />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, type: "spring" }}
            className="max-w-6xl mx-auto px-6"
          >
            <div className="bg-zinc-900/80 rounded-[3rem] p-8 md:p-16 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] relative overflow-hidden border border-white/10 backdrop-blur-2xl">
              {/* Decorative blobs inside card */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-gradient-to-b from-uiu-orange/30 to-transparent rounded-full blur-3xl mix-blend-screen"
              />
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                className="absolute bottom-[-20%] left-[-10%] w-80 h-80 bg-gradient-to-t from-rose-500/20 to-transparent rounded-full blur-3xl mix-blend-screen"
              />
              
              <div className="relative z-10 flex flex-col lg:flex-row items-center gap-16">
                <div className="flex-1 text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-rose-500/10 text-rose-400 text-sm font-black mb-8 border border-rose-500/20 backdrop-blur-md">
                    <Heart className="w-5 h-5 fill-current animate-pulse" />
                    Featured Campaign
                  </div>
                  
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-8 leading-[1.1] tracking-tight">
                    UIU Winter Clothing Drive
                  </h2>
                  <p className="text-xl text-gray-400 mb-10 max-w-2xl font-medium leading-relaxed">
                    Help us keep local communities warm. We are collecting gently used jackets, sweaters, and blankets to distribute this winter.
                  </p>

                  <button className="group px-10 py-5 bg-gradient-to-r from-white to-gray-200 text-black font-black rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] mx-auto lg:mx-0 w-full lg:w-auto text-lg">
                    Donate Now <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

                <div className="w-full lg:w-[450px] shrink-0 bg-slate-950/50 rounded-[2.5rem] p-10 border border-white/10 shadow-2xl backdrop-blur-xl relative z-20">
                  <div className="flex flex-col gap-1 mb-8">
                    <span className="text-7xl font-black bg-gradient-to-br from-uiu-orange to-rose-600 bg-clip-text text-transparent tracking-tighter">75%</span>
                    <span className="text-gray-400 font-bold text-lg uppercase tracking-widest">Goal Reached</span>
                  </div>
                  
                  <div className="h-8 w-full bg-zinc-800/50 rounded-full overflow-hidden mb-6 shadow-inner p-1">
                    <motion.div 
                      initial={{ width: 0 }}
                      whileInView={{ width: "75%" }}
                      transition={{ duration: 1.5, type: "spring", bounce: 0.2 }}
                      className="h-full bg-gradient-to-r from-uiu-orange to-rose-500 rounded-full relative"
                    >
                      <div className="absolute inset-0 bg-white/20 w-full animate-pulse"></div>
                    </motion.div>
                  </div>
                  
                  <div className="flex items-center justify-between font-black text-white">
                    <span className="text-gray-500">0</span>
                    <span className="bg-white text-black px-5 py-2 rounded-xl text-lg shadow-sm border border-white/20">375 / 500 Items</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/10 bg-[#020c1b] pt-24 pb-12 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-16">
            <div className="flex flex-col items-center md:items-start gap-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-uiu-emerald to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Leaf className="w-6 h-6 text-white" />
                </div>
                <span className="text-3xl font-black text-white tracking-tight">EcoNexus</span>
              </div>
              <p className="text-gray-400 text-lg text-center md:text-left max-w-sm font-medium">
                Empowering the United International University community through sustainable resource sharing.
              </p>
            </div>
            
            <div className="flex flex-col items-center md:items-end gap-8">
              <div className="flex items-center gap-4">
                <a href="#" className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center text-gray-400 hover:bg-uiu-orange hover:text-white transition-all hover:-translate-y-1 shadow-lg shadow-white/5 border border-white/5 group">
                  <Globe className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </a>
                <a href="#" className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center text-gray-400 hover:bg-rose-500 hover:text-white transition-all hover:-translate-y-1 shadow-lg shadow-white/5 border border-white/5 group">
                  <Mail className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </a>
                <a href="#" className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center text-gray-400 hover:bg-uiu-emerald hover:text-white transition-all hover:-translate-y-1 shadow-lg shadow-white/5 border border-white/5 group">
                  <MessageSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </a>
              </div>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 font-semibold">
              © {new Date().getFullYear()} EcoNexus - UIU Student Initiative.
            </p>
            <div className="flex gap-6 text-sm font-bold text-gray-500">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
