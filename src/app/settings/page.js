"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  User,
  Lock,
  Bell,
  Moon,
  Save,
  Camera,
  Shield,
  Smartphone,
  Eye,
  EyeOff
} from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [settings, setSettings] = useState({
    fullName: "",
    studentId: "",
    department: "",
    email: "", // Will be set dynamically
    emailNotifications: true,
    pushNotifications: false,
    publicProfile: true,
    theme: "light"
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [profilePic, setProfilePic] = useState(null);
  const fileInputRef = useRef(null);

  // 1. Fetch settings from backend on mount
  useEffect(() => {
    setIsMounted(true);

    const userStr = localStorage.getItem("user");
    let loggedInEmail = "";
    let loggedInName = "";
    let loggedInImage = null;

    if (userStr) {
      const u = JSON.parse(userStr);
      loggedInEmail = u.email;
      loggedInName = u.fullName;
      loggedInImage = u.profileImageUrl;
    }

    if (!loggedInEmail) {
      loggedInEmail = localStorage.getItem("userEmail") || "";
    }

    updateField('email', loggedInEmail);
    if (loggedInName) updateField('fullName', loggedInName);
    if (loggedInImage) setProfilePic(loggedInImage);

    const fetchSettings = async () => {
      if (!loggedInEmail) return;
      try {
        const res = await fetch(`http://localhost:8080/api/settings/${loggedInEmail}`);
        if (res.ok) {
          const data = await res.json();
          // Sanitize data: Replace any nulls with empty strings
          const sanitized = {
            fullName: loggedInName || data.fullName || "",
            studentId: data.studentId || "",
            department: data.department || "",
            email: loggedInEmail, // Keep the correct email
            emailNotifications: data.emailNotifications ?? true,
            pushNotifications: data.pushNotifications ?? false,
            publicProfile: data.publicProfile ?? true,
            theme: data.theme || "light"
          };
          setSettings(prev => ({ ...prev, ...sanitized }));
        }
      } catch (err) {
        console.error("Could not load settings from backend:", err);
      }
    };
    fetchSettings();
  }, []);

  // Cloudinary Config for Profile Pic
  const CLOUDINARY_CLOUD_NAME = "dkltd8juu";
  const CLOUDINARY_UPLOAD_PRESET = "ml_default";

  const uploadProfilePic = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    
    setIsSaving(true);
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      setProfilePic(data.secure_url);
    } catch (err) {
      alert("Failed to upload image.");
    } finally {
      setIsSaving(false);
    }
  };

  // 2. Save settings to backend
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Save Profile Details (Name, Image)
      const resProfile = await fetch("http://localhost:8080/api/user/update-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentEmail: settings.email,
          fullName: settings.fullName,
          email: settings.email,
          profileImageUrl: profilePic
        })
      });

      // 2. Save Preferences (StudentId, Dept, Notifications)
      const resSettings = await fetch("http://localhost:8080/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });

      if (resProfile.ok && resSettings.ok) {
        const updatedUser = await resProfile.json();
        // Update local storage so the rest of the app gets the new image and name
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        storedUser.fullName = updatedUser.fullName;
        storedUser.profileImageUrl = updatedUser.profileImageUrl;
        localStorage.setItem("user", JSON.stringify(storedUser));
        
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert("Failed to save some settings. Please check your network.");
      }
    } catch (err) {
      console.error("Could not save settings:", err);
      alert("Error saving settings. Is the backend running?");
    } finally {
      setIsSaving(false);
    }
  };
  const updateField = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const [passwords, setPasswords] = useState({ current: "", next: "" });
  const [passUpdateStatus, setPassUpdateStatus] = useState("");

  const handleUpdatePassword = async () => {
    if (!passwords.next || passwords.next.length < 6) {
      alert("New password must be at least 6 characters.");
      return;
    }

    setPassUpdateStatus("updating");
    try {
      const res = await fetch(`http://localhost:8080/api/user/update-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentEmail: settings.email,
          fullName: settings.fullName,
          currentPassword: passwords.current,
          newPassword: passwords.next,
          profileImageUrl: profilePic
        })
      });

      if (res.ok) {
        setPassUpdateStatus("success");
        setPasswords({ current: "", next: "" });
        setTimeout(() => setPassUpdateStatus(""), 3000);
      } else {
        alert("Password update failed. Check your current password.");
        setPassUpdateStatus("");
      }
    } catch (err) {
      alert("System error. Is the backend running?");
      setPassUpdateStatus("");
    }
  };

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

      {/* BACKGROUND EFFECTS (STRICT CONTINUITY) */}
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
      </div>

      <main className="max-w-4xl mx-auto w-full px-6 py-10 z-10 flex flex-col flex-1 pb-40 relative">
        <header className="mb-12">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/50 backdrop-blur-md border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-slate-700 font-bold hover:bg-white/90 hover:text-slate-900 transition-all group w-max"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mt-8">Account Settings</h1>
          <p className="text-slate-500 font-medium text-lg">Manage your profile, security, and preferences.</p>
        </header>

        <div className="flex flex-col gap-8">

          {/* PROFILE SECTION */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] border border-white/80 p-8 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.04)]"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 bg-uiu-emerald/10 text-uiu-emerald rounded-2xl">
                <User className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Profile Information</h2>
            </div>

            <div className="flex flex-col md:flex-row gap-10 items-start md:items-center">
              <div className="relative group mx-auto md:mx-0">
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setProfilePic(URL.createObjectURL(file)); // Local preview
                    uploadProfilePic(file); // Upload to Cloudinary
                  }
                }} />
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                  {profilePic ? <img src={profilePic} alt="Profile" className="w-full h-full object-cover" /> : <User className="w-16 h-16 text-slate-300" />}
                </div>
                <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 p-3 bg-uiu-orange rounded-full text-white shadow-lg border-2 border-white hover:scale-110 transition-all">
                  <Camera className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 flex-1 w-full">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-500 uppercase tracking-widest px-1">Full Name</label>
                  <input
                    type="text"
                    value={settings.fullName || ""}
                    onChange={(e) => updateField('fullName', e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-5 py-4 rounded-2xl bg-white/80 border border-slate-200 focus:border-uiu-emerald outline-none transition-all font-bold text-slate-800 shadow-sm"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-500 uppercase tracking-widest px-1">Student ID</label>
                  <input
                    type="text"
                    value={settings.studentId || ""}
                    onChange={(e) => updateField('studentId', e.target.value)}
                    placeholder="e.g. 011 231 000"
                    className="w-full px-5 py-4 rounded-2xl bg-white/80 border border-slate-200 focus:border-uiu-emerald outline-none transition-all font-bold text-slate-800 shadow-sm"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-500 uppercase tracking-widest px-1">Department</label>
                  <input
                    type="text"
                    value={settings.department || ""}
                    onChange={(e) => updateField('department', e.target.value)}
                    placeholder="e.g. CSE"
                    className="w-full px-5 py-4 rounded-2xl bg-white/80 border border-slate-200 focus:border-uiu-emerald outline-none transition-all font-bold text-slate-800 shadow-sm"
                  />
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <label className="text-sm font-bold text-slate-500 uppercase tracking-widest px-1">Account Email (Permanent)</label>
                  <input type="email" value={settings.email || ""} className="w-full px-5 py-4 rounded-2xl bg-white/50 border border-slate-200 font-bold text-slate-400 shadow-sm cursor-not-allowed" disabled title="Email is tied to your account" />
                </div>
              </div>
            </div>
          </motion.section>

          {/* SECURITY SECTION */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] border border-white/80 p-8 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-2xl"><Shield className="w-6 h-6" /></div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Security</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-500 uppercase tracking-widest px-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? "text" : "password"}
                    value={passwords.current}
                    onChange={(e) => setPasswords(p => ({ ...p, current: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full px-5 py-4 rounded-2xl bg-white/80 border border-slate-200 outline-none transition-all font-bold text-slate-800 shadow-sm pr-14"
                  />
                  <button onClick={() => setShowCurrentPass(!showCurrentPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 p-1">
                    {showCurrentPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-500 uppercase tracking-widest px-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    value={passwords.next}
                    onChange={(e) => setPasswords(p => ({ ...p, next: e.target.value }))}
                    placeholder="Min. 8 characters"
                    className="w-full px-5 py-4 rounded-2xl bg-white/80 border border-slate-200 outline-none transition-all font-bold text-slate-800 shadow-sm pr-14"
                  />
                  <button onClick={() => setShowNewPass(!showNewPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 p-1">
                    {showNewPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={handleUpdatePassword}
                disabled={passUpdateStatus === "updating"}
                className={`px-8 py-3 rounded-xl font-black transition-all shadow-sm ${passUpdateStatus === "success"
                    ? "bg-emerald-500 text-white"
                    : "text-rose-500 bg-rose-50 border border-rose-100 hover:bg-rose-500 hover:text-white"
                  }`}
              >
                {passUpdateStatus === "updating" ? "Updating..." : passUpdateStatus === "success" ? "Updated!" : "Update Password"}
              </button>
            </div>
          </motion.section>

          {/* PREFERENCES SECTION */}
          <div className="flex flex-col md:flex-row gap-8 mb-20">
            <motion.section
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] border border-white/80 p-8 shadow-sm flex-1"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-2xl"><Bell className="w-6 h-6" /></div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Notifications</h2>
              </div>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/40 border border-white hover:bg-white/60 transition-colors cursor-pointer" onClick={() => updateField('emailNotifications', !settings.emailNotifications)}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-xl"><Smartphone className="w-5 h-5 text-slate-500" /></div>
                  <span className="font-bold text-slate-700">Email Notifications</span>
                </div>
                <div className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${settings.emailNotifications ? 'bg-uiu-emerald' : 'bg-slate-300'}`}>
                  <motion.div animate={{ x: settings.emailNotifications ? 24 : 0 }} className="w-4 h-4 bg-white rounded-full shadow-sm" />
                </div>
              </div>
            </motion.section>
          </div>

          {/* SAVE BUTTON */}
          <motion.div
            className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-sm px-6 z-50"
          >
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`group w-full py-5 rounded-2xl font-black text-white text-xl shadow-[0_20px_40px_-10px_rgba(242,101,34,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-3 overflow-hidden relative border border-orange-400 ${isSaving ? 'bg-slate-400 border-slate-500' : 'bg-uiu-orange hover:bg-orange-600'}`}
            >
              <span className="relative z-10 flex items-center gap-3">
                {isSaving ? "Saving..." : saveSuccess ? "Changes Saved!" : "Save All Changes"}
                {saveSuccess ? <Shield className="w-6 h-6 animate-bounce" /> : <Save className="w-6 h-6" />}
              </span>
            </button>
          </motion.div>

        </div>
      </main>
    </div>
  );
}
