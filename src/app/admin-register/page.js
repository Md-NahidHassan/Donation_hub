"use client";

import { useState, useEffect } from "react";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Mail,
  Lock,
  Key,
  ArrowLeft,
  User,
  Eye,
  EyeOff,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { mockDb } from "@/utils/mockDb";

export default function AdminRegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    adminKey: "",
    password: ""
  });

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prepare the data to be sent to the Spring Boot backend
    const registrationData = {
      name: formData.name,
      email: formData.email,
      adminKey: formData.adminKey,
      password: formData.password
    };

    try {
      const response = await fetch("http://localhost:8080/api/admin/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registrationData),
      });

      if (response.ok) {
        // Success: Notify user and redirect
        alert("Admin registration successful! Please log in to continue.");
        router.push("/login");
      } else {
        const data = await response.json();
        // Failure: Display the specific error message from the backend
        alert("Registration failed: " + (data.error || "Something went wrong"));
      }
    } catch (error) {
      // Network Error: Backend server is likely down
      console.error("Connection Error:", error);
      alert("Unable to connect to the backend server. Is it running?");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 font-sans bg-[#fbf8f3] relative overflow-hidden">

      {/* 
        ====================================================
               BACKGROUND EFFECTS (CONSISTENT THEME)
        ====================================================
      */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Interactive Live Cursor Orb */}
        {isMounted && (
          <motion.div
            style={{ x: smoothX, y: smoothY }}
            className="absolute top-[-15vw] left-[-15vw] w-[30vw] h-[30vw] rounded-full bg-uiu-orange/20 blur-[120px] pointer-events-none z-10"
          />
        )}

        {/* Dynamic Flowing Bokeh Spheres */}
        <motion.div
          animate={{ x: ['0vw', '30vw', '-20vw', '0vw'], y: ['0vh', '-20vh', '30vh', '0vh'], scale: [1, 1.3, 0.9, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute top-[10%] left-[20%] w-[45vw] h-[45vw] rounded-[100%] bg-uiu-emerald/25 blur-[130px]"
        />
        <motion.div
          animate={{ x: ['0vw', '-40vw', '10vw', '0vw'], y: ['0vh', '40vh', '-10vh', '0vh'], scale: [1, 0.8, 1.2, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          className="absolute top-[30%] right-[10%] w-[50vw] h-[50vw] rounded-[100%] bg-rose-500/15 blur-[140px]"
        />
        <motion.div
          animate={{ x: ['0vw', '20vw', '-30vw', '0vw'], y: ['0vh', '20vh', '-30vh', '0vh'], scale: [1, 1.2, 0.8, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[10%] left-[40%] w-[55vw] h-[55vw] rounded-[100%] bg-uiu-orange/20 blur-[150px]"
        />

        {/* Pure Depth Diffusion Base */}
        <div className="absolute inset-0 backdrop-blur-[60px] z-[-1]" />
      </div>

      {/* 
        ====================================================
               MAIN CONTENT
        ====================================================
      */}

      {/* BACK BUTTON */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="fixed top-8 left-8 z-50 text-slate-400 font-black tracking-widest text-xs uppercase hover:text-uiu-emerald transition-all"
      >
        <Link href="/" className="flex items-center gap-2 group p-2 rounded-full hover:bg-white/40 backdrop-blur-md border border-transparent hover:border-white">
          <div className="bg-white/80 p-1.5 rounded-full shadow-sm">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          </div>
          Back to Home
        </Link>
      </motion.div>

      {/* REGISTRATION CARD */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="w-full max-w-[500px] bg-white/40 backdrop-blur-2xl px-8 py-10 rounded-[2.5rem] border border-white/60 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.06)] relative z-10 flex flex-col items-center"
      >
        {/* Admin Shield Icon Header */}
        <div className="w-20 h-20 bg-uiu-emerald shadow-[0_15px_30px_-10px_rgba(16,185,129,0.4)] rounded-3xl flex items-center justify-center mb-6 border-b-4 border-emerald-600">
          <ShieldCheck className="w-10 h-10 text-white drop-shadow-sm" strokeWidth={1.5} />
        </div>

        <div className="text-center mb-10 w-full">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Admin Registration</h1>
          <p className="text-slate-500 font-bold tracking-wide">Enter your official credentials to proceed.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full">

          {/* Admin Name */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-slate-400 px-1 uppercase tracking-widest">Full Name</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-uiu-emerald transition-colors" />
              <input
                type="text"
                placeholder="e.g. Rifat Hasan"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/80 border border-white focus:border-uiu-emerald focus:ring-4 focus:ring-uiu-emerald/10 outline-none transition-all placeholder:text-slate-300 text-slate-800 font-bold shadow-sm"
                required
              />
            </div>
          </div>

          {/* Gmail Address */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-slate-400 px-1 uppercase tracking-widest">Gmail Address</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-uiu-emerald transition-colors" />
              <input
                type="email"
                placeholder="yourname@gmail.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/80 border border-white focus:border-uiu-emerald focus:ring-4 focus:ring-uiu-emerald/10 outline-none transition-all placeholder:text-slate-300 text-slate-800 font-bold shadow-sm"
                required
              />
            </div>
          </div>

          {/* Secret Admin Key */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-rose-500 px-1 uppercase tracking-widest flex items-center gap-1">
              <Key className="w-3.5 h-3.5" /> Secret Admin Key
            </label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-rose-500 transition-colors" />
              <input
                type="password"
                placeholder="Enter authorized key"
                value={formData.adminKey}
                onChange={(e) => setFormData({ ...formData, adminKey: e.target.value })}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/80 border border-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all placeholder:text-slate-300 text-slate-800 font-bold shadow-sm"
                required
              />
            </div>
          </div>

          {/* Create Password */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-slate-400 px-1 uppercase tracking-widest">Create Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-uiu-emerald transition-colors" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Min. 8 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-12 pr-14 py-4 rounded-2xl bg-white/80 border border-white focus:border-uiu-emerald focus:ring-4 focus:ring-uiu-emerald/10 outline-none transition-all placeholder:text-slate-300 text-slate-800 font-bold shadow-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* REGISTER BUTTON */}
          <button
            type="submit"
            className="group w-full py-5 rounded-2xl font-black text-white text-lg bg-uiu-emerald hover:bg-emerald-600 shadow-[0_15px_30px_-10px_rgba(16,185,129,0.4)] hover:shadow-[0_20px_40px_-10px_rgba(16,185,129,0.5)] active:scale-[0.98] hover:scale-[1.02] transition-all flex items-center justify-center gap-3 overflow-hidden relative border border-emerald-400 mt-4"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-uiu-emerald to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative z-10 flex items-center gap-2 drop-shadow-sm font-black">
              Register as Admin <ShieldCheck className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </span>
          </button>
        </form>

        {/* LOGIN LINK */}
        <div className="mt-10 text-slate-500 font-black text-sm">
          Already an Admin? <Link href="/nahid.admin" className="text-uiu-orange hover:text-orange-600 hover:underline transition-all decoration-2 underline-offset-4 ml-1">Login instead</Link>
        </div>

      </motion.div>
    </div>
  );
}
