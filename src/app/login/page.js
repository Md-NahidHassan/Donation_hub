"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [userType, setUserType] = useState('student');

  // Input states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot Password State
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

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

  // -- User Login Handler --
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const credentials = { email, password };
    try {
      const response = await fetch("http://localhost:8080/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("user", JSON.stringify(data));
        window.location.href = "/dashboard";
      } else {
        setError(data.error || "Invalid login credentials!");
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      setError("Backend server connection failed! Make sure Spring Boot is running on port 8080.");
    } finally {
      setIsLoading(false);
    }
  };

  // -- User Register Handler --
  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch("http://localhost:8080/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          password,
          userType,
          role: "ROLE_USER"
        }),
      });
      const data = await response.json();
      if (response.ok) {
        alert("Account created successfully! Please sign in.");
        setIsLogin(true);
        setFullName('');
        setEmail('');
        setPassword('');
      } else {
        setError(data.error || "Registration failed. Please try again.");
      }
    } catch (err) {
      console.error("Register Error:", err);
      setError("Backend server connection failed! Make sure Spring Boot is running on port 8080.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center font-sans overflow-hidden bg-gradient-to-b from-[#f2faf6] via-[#fbf8f3] to-[#fff3ec] relative p-6">
      {/* 
        ====================================================
               BACKGROUND EFFECTS MIGRATED FROM HOME
        ====================================================
      */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        {/* Interactive Live Cursor Orb */}
        {isMounted && (
          <motion.div
            style={{ x: smoothX, y: smoothY }}
            className="absolute top-[-15vw] left-[-15vw] w-[30vw] h-[30vw] rounded-full bg-uiu-orange/15 blur-[120px] pointer-events-none z-10"
          />
        )}

        {/* Dynamic Flowing Bokeh Spheres */}
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

        {/* Live Sweeping Ribbons */}
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

        {/* Pure Depth Diffusion Base */}
        <div className="absolute inset-0 backdrop-blur-[60px] z-[-1]" />

        {/* Subtle Live Grid Texture */}
        <motion.div
          animate={{ backgroundPosition: ['0px 0px', '40px 40px'] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_100%_100%_at_50%_0%,#000_50%,transparent_120%)] opacity-50 z-0"
        />
      </div>

      {/* BACK NAVIGATION */}
      <Link
        href="/"
        className="absolute top-6 left-6 md:top-10 md:left-10 z-50 flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/50 backdrop-blur-md border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-slate-700 font-bold hover:bg-white/80 hover:text-slate-900 transition-all group"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="hidden sm:inline">Back to Home</span>
      </Link>

      {/* 
        ====================================================
                       AUTHENTICATION CARD
        ====================================================
      */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", duration: 0.8 }}
        className="w-full max-w-[440px] bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_40px_100px_-20px_rgba(242,101,34,0.15)] rounded-[2.5rem] p-8 md:p-10 z-10 relative overflow-hidden"
      >
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black bg-gradient-to-r from-uiu-orange via-rose-500 to-uiu-emerald bg-clip-text text-transparent tracking-tight pb-1">EcoKnot</h1>
          <p className="text-sm font-semibold text-slate-500 mt-2 tracking-wide uppercase">United International University</p>
        </div>

        {/* Toggle Switch - Only show if NOT in forgot password mode */}
        {!isForgotPassword && (
          <div className="w-full bg-slate-100/80 p-1.5 rounded-full flex relative mb-10 shadow-inner">
            {/* Animated Background Pill */}
            <motion.div
              layout
              className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-full shadow-sm border border-slate-200/50"
              initial={false}
              animate={{ left: isLogin ? "6px" : "calc(50% + 3px)" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
            <button
              onClick={() => setIsLogin(true)}
              className={`w-1/2 rounded-full py-3 text-sm font-bold z-10 transition-colors ${isLogin ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`w-1/2 rounded-full py-3 text-sm font-bold z-10 transition-colors ${!isLogin ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Create Account
            </button>
          </div>
        )}

        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait">
            {isForgotPassword ? (
              <motion.div
                key="forgot-password"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <div className="text-center mb-6">
                  <h2 className="text-xl font-black text-slate-800">Reset Password</h2>
                  <p className="text-xs font-bold text-slate-400 mt-1">
                    {resetStep === 1 && "Enter your email to receive a verification code."}
                    {resetStep === 2 && "Enter the 6-digit code sent to your email."}
                    {resetStep === 3 && "Create a new strong password."}
                  </p>
                </div>

                <form
                  className="flex flex-col gap-5"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (resetStep === 1) {
                      // Step 1: Send email and request OTP
                      try {
                        setIsLoading(true);
                        const res = await fetch("http://localhost:8080/api/auth/forgot-password", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email: resetEmail }),
                        });
                        const data = await res.json();
                        if (res.ok) {
                          setResetStep(2);
                          alert(data.message || "OTP sent to your email!");
                        } else {
                          alert(data.error || "Failed to send OTP.");
                        }
                      } catch {
                        alert("Cannot connect to server. Make sure the backend is running.");
                      } finally {
                        setIsLoading(false);
                      }
                    } else if (resetStep === 2) {
                      // Step 2: Proceed to new password input if OTP is typed (Verification happens on final submit)
                      if (resetCode.length === 6) {
                        setResetStep(3);
                      } else {
                        alert("Please enter a valid 6-digit code.");
                      }
                    } else if (resetStep === 3) {
                      // Step 3: call real backend reset-password endpoint with OTP
                      try {
                        setIsLoading(true);
                        const res = await fetch("http://localhost:8080/api/auth/reset-password", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email: resetEmail, otp: resetCode, newPassword }),
                        });
                        if (res.ok) {
                          setIsForgotPassword(false);
                          setResetStep(1);
                          setResetCode('');
                          setNewPassword('');
                          alert("Password successfully reset! Please sign in.");
                        } else {
                          const data = await res.json();
                          alert(data.error || "Failed to reset password.");
                        }
                      } catch {
                        alert("Cannot connect to server. Make sure the backend is running.");
                      } finally {
                        setIsLoading(false);
                      }
                    }
                  }}
                >
                  {resetStep === 1 && (
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-uiu-orange transition-colors" />
                      <input
                        type="email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="Registered Email Account"
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/70 border border-slate-200 focus:border-uiu-orange focus:ring-4 focus:ring-uiu-orange/10 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                      />
                    </div>
                  )}

                  {resetStep === 2 && (
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-uiu-orange transition-colors" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        placeholder="6-Digit Verification Code"
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/70 border border-slate-200 focus:border-uiu-orange focus:ring-4 focus:ring-uiu-orange/10 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-black tracking-widest text-center"
                      />
                    </div>
                  )}

                  {resetStep === 3 && (
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-slate-800 transition-colors" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New Password"
                        className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white/70 border border-slate-200 focus:border-slate-800 focus:ring-4 focus:ring-slate-900/5 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 mt-2">
                    <button
                      type="submit"
                      className="group relative w-full py-4 rounded-2xl font-black text-white text-lg flex items-center justify-center gap-2 overflow-hidden hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/5"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-uiu-orange to-rose-600 group-hover:opacity-90 transition-opacity duration-300" />
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {isLoading ? "Please wait..." : resetStep === 1 ? "Send Code" : resetStep === 2 ? "Verify Code" : "Update Password"}
                        {!isLoading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(false);
                        setResetStep(1);
                      }}
                      className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors w-full py-2"
                    >
                      Cancel & Return to Login
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key={isLogin ? "login" : "register"}
                initial={{ x: isLogin ? -20 : 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: isLogin ? 20 : -20, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <form
                  className="flex flex-col gap-5"
                  onSubmit={(e) => {
                    if (isLogin) {
                      handleLogin(e);
                    } else {
                      handleRegister(e);
                    }
                  }}
                >
                  {error && (
                    <div className="bg-rose-50 text-rose-500 text-sm font-semibold p-3 rounded-xl border border-rose-100 text-center">
                      {error}
                    </div>
                  )}
                  {!isLogin && (
                    <>
                      <div className="flex bg-slate-100/80 p-1.5 rounded-2xl relative shadow-inner mb-2">
                        <motion.div
                          layout
                          className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-sm border border-slate-200/50"
                          initial={false}
                          animate={{ left: userType === 'student' ? "6px" : "calc(50% + 1px)" }}
                          transition={{ type: "spring", stiffness: 450, damping: 30 }}
                        />
                        <button
                          type="button"
                          onClick={() => setUserType('student')}
                          className={`w-1/2 py-2 text-xs font-bold rounded-xl z-10 transition-colors ${userType === 'student' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          UIU Student
                        </button>
                        <button
                          type="button"
                          onClick={() => setUserType('donor')}
                          className={`w-1/2 py-2 text-xs font-bold rounded-xl z-10 transition-colors ${userType === 'donor' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          General Donor
                        </button>
                      </div>

                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-uiu-emerald transition-colors" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Full Name"
                          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/70 border border-slate-200 focus:border-uiu-emerald focus:ring-4 focus:ring-uiu-emerald/10 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                        />
                      </div>
                    </>
                  )}

                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-uiu-orange transition-colors" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={isLogin ? "Email" : (userType === 'student' ? "University ID / Email" : "Email Address")}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/70 border border-slate-200 focus:border-uiu-orange focus:ring-4 focus:ring-uiu-orange/10 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                      required
                    />
                  </div>

                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-slate-800 transition-colors" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white/70 border border-slate-200 focus:border-slate-800 focus:ring-4 focus:ring-slate-900/5 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {isLogin && (
                    <div className="flex justify-end w-full mb-2">
                      <button
                        type="button"
                        onClick={() => setIsForgotPassword(true)}
                        className="text-sm font-bold text-uiu-orange hover:text-orange-600 transition-colors"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-2 group relative w-full py-4 rounded-2xl font-black text-white text-lg flex items-center justify-center gap-2 overflow-hidden hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/5 disabled:opacity-70 disabled:hover:scale-100"
                  >
                    <span className={`absolute inset-0 transition-opacity duration-300 ${isLogin ? 'bg-gradient-to-r from-uiu-orange to-rose-600 group-hover:opacity-90'
                        : 'bg-gradient-to-r from-uiu-emerald to-teal-500 group-hover:opacity-90'
                      }`} />
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isLoading ? (
                        "Loading..."
                      ) : isLogin ? (
                        <>Sign In <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                      ) : (
                        "Create Account"
                      )}
                    </span>
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Decorative Footer info inside card */}
        <div className="mt-10 pt-6 border-t border-slate-200/50 text-center">
          <p className="text-sm text-slate-500 font-medium">
            Secure Resource Sharing for UIU Students & Donation Camping
          </p>
        </div>
      </motion.div>
    </div>
  );
}
