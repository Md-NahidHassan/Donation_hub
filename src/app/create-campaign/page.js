"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import {
  ArrowLeft,
  ImagePlus,
  X,
  Rocket,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Tag,
  FileText,
  Type,
  ChevronDown,
  Smartphone,
  Building2,
  Plus,
  Trash2,
  Target,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { mockDb } from "@/utils/mockDb";

// ─── Campaign categories ────────────────────────────────────────────────────
const CATEGORIES = [
  { value: "clothing",     label: "👕  Clothing Drive"         },
  { value: "food",         label: "🍱  Food & Nutrition"        },
  { value: "education",    label: "📚  Education & Books"       },
  { value: "medical",      label: "🏥  Medical Aid"             },
  { value: "environment",  label: "🌿  Environment"             },
  { value: "emergency",    label: "🚨  Emergency Relief"        },
  { value: "other",        label: "✨  Other"                   },
];

// ─── Floating label input ───────────────────────────────────────────────────
function FloatingInput({ id, label, value, onChange, as: Tag = "input", ...rest }) {
  const active = value && value.length > 0;
  return (
    <div className="relative">
      <Tag
        id={id}
        value={value}
        onChange={onChange}
        {...rest}
        className={`peer w-full px-5 pt-6 pb-3 rounded-2xl bg-white/80 border border-slate-200 outline-none font-bold text-slate-800 shadow-sm
          focus:border-uiu-emerald focus:ring-2 focus:ring-uiu-emerald/10 transition-all resize-none
          ${rest.className || ""}`}
        placeholder=" "
      />
      <label
        htmlFor={id}
        className={`absolute left-5 pointer-events-none font-bold transition-all duration-200
          ${active
            ? "top-2 text-[9px] uppercase tracking-widest text-uiu-emerald"
            : "top-1/2 -translate-y-1/2 text-slate-400 text-sm peer-focus:top-2 peer-focus:-translate-y-0 peer-focus:text-[9px] peer-focus:uppercase peer-focus:tracking-widest peer-focus:text-uiu-emerald"
          }
          ${Tag === "textarea" && !active ? "top-5 translate-y-0" : ""}
        `}
      >
        {label}
      </label>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────
export default function CreateCampaignPage() {
  const router   = useRouter();
  const fileRef  = useRef(null);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  // Mouse-follow glow
  const mouseX  = useMotionValue(0);
  const mouseY  = useMotionValue(0);
  const smoothX = useSpring(mouseX, { damping: 50, stiffness: 400, mass: 0.5 });
  const smoothY = useSpring(mouseY, { damping: 50, stiffness: 400, mass: 0.5 });
  useEffect(() => {
    const m = (e) => { mouseX.set(e.clientX); mouseY.set(e.clientY); };
    window.addEventListener("mousemove", m);
    return () => window.removeEventListener("mousemove", m);
  }, [mouseX, mouseY]);

  // Form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    goal: "",
    duration: "",
  });

  // Payment QRs state — supports multiple entries with images
  const [paymentQRs, setPaymentQRs] = useState([]);

  const addPaymentQR = () =>
    setPaymentQRs(prev => [...prev, { id: Date.now(), provider: "", number: "", file: null, preview: null }]);

  const removePaymentQR = (id) =>
    setPaymentQRs(prev => prev.filter(qr => qr.id !== id));

  const updatePaymentQR = (id, field, value) =>
    setPaymentQRs(prev => prev.map(qr => qr.id === id ? { ...qr, [field]: value } : qr));

  const handleQRImageSelect = (id, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPaymentQRs(prev => prev.map(qr => qr.id === id ? { ...qr, file: file, preview: url } : qr));
  };
  const [bankAccounts, setBankAccounts] = useState([{ bankName: "", branch: "", accountName: "", accountNumber: "" }]);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview]     = useState(null);
  const [catOpen, setCatOpen]     = useState(false);

  // Submission state
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [errMsg, setErrMsg] = useState("");

  // ── handlers ──────────────────────────────────────────────────────────────
  const handleField = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleBankField = (index, key) => (e) => {
    const newBanks = [...bankAccounts];
    newBanks[index][key] = e.target.value;
    setBankAccounts(newBanks);
  };

  const addBank = () => setBankAccounts([...bankAccounts, { bankName: "", branch: "", accountName: "", accountNumber: "" }]);
  const removeBank = (index) => setBankAccounts(bankAccounts.filter((_, i) => i !== index));

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    e.target.value = ""; // allow re-selecting same file
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const clearImage = (e) => {
    e.stopPropagation();
    setImageFile(null);
    setPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.category) return;

    setStatus("loading");
    setErrMsg("");

    // Build multipart/form-data payload
    const fd = new FormData();
    const durationDays = parseInt(form.duration) || 30;
    const endTime = new Date(Date.now() + durationDays * 86400000).toISOString();

    fd.append("title", form.title.trim());
    fd.append("description", form.description.trim());
    fd.append("category", form.category);
    fd.append("goal", form.goal);
    fd.append("duration", durationDays);
    fd.append("endTime", endTime);

    // Convert payment QRs to include base64 for persistence
    const processedPaymentQRs = await Promise.all(paymentQRs.map(async qr => {
      let base64 = qr.preview;
      if (qr.file) {
        base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(qr.file);
        });
      }
      return { provider: qr.provider, number: qr.number, image: base64 };
    }));
    // Helper to convert base64 to Blob so we can send it as a file
    const base64ToBlob = (base64) => {
      if (!base64 || !base64.startsWith("data:")) return null;
      const parts = base64.split(';base64,');
      const contentType = parts[0].split(':')[1];
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) uInt8Array[i] = raw.charCodeAt(i);
      return new Blob([uInt8Array], { type: contentType });
    };

    // Unified QR & Bank logic for the new backend
    const unifiedList = [
      ...paymentQRs.filter(qr => qr.provider),
      ...validBanks.map(b => ({
        provider: "Bank",
        number: `${b.bankName} | ${b.branch || "N/A"} | ${b.accountName} | ${b.accountNumber}`,
        file: null,
        image: null
      }))
    ];

    unifiedList.forEach((qr) => {
      const qrFile = qr.file || base64ToBlob(qr.image);
      fd.append("qrProviders", qr.provider);
      fd.append("qrNumbers", qr.number || "");
      
      // Track existing paths
      const isUrl = typeof qr.image === 'string' && qr.image.startsWith("http");
      fd.append("qrExistingPaths", isUrl ? qr.image : "");

      if (qrFile) {
        // Provide a real filename to avoid the default "blob" name
        const fileName = qr.file ? qr.file.name : `qr_${Date.now()}_${qr.provider}.png`;
        fd.append("qrFiles", qrFile, fileName);
      } else {
        // Maintain indexing with an empty blob
        fd.append("qrFiles", new Blob([], { type: "application/octet-stream" }), "null");
      }
    });
    
    // Filter out empty bank accounts and send as JSON string
    const validBanks = bankAccounts.filter(b => b.bankName || b.accountNumber);
    fd.append("bankAccounts", JSON.stringify(validBanks));

    if (imageFile) {
      fd.append("image", imageFile); // matches backend @RequestParam("image")
    }

    try {
      const res = await fetch("http://127.0.0.1:8080/api/campaigns", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "Unknown error");
        console.error("Backend Error Response:", errorText);
        throw new Error(errorText || `HTTP ${res.status}`);
      }

      // Save extras for overlay since backend might drop fields
      let base64Image = preview;
      if (imageFile) {
        base64Image = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(imageFile);
        });
      }
      mockDb.saveCampaignExtras(form.title.trim(), {
        duration: form.duration,
        goal: form.goal,
        paymentQRs: processedPaymentQRs,
        bankAccounts: validBanks,
        image: base64Image
      });

      setStatus("success");
      setTimeout(() => router.push("/campaigns"), 2500);
    } catch (err) {
      console.warn("Backend fetch failed, using mockDb fallback", err);
      
      // Convert image to base64 for localStorage persistence
      let base64Image = preview;
      if (imageFile) {
        base64Image = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(imageFile);
        });
      }

      const newCampaign = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        goal: form.goal,
        duration: form.duration,
        daysLeft: parseInt(form.duration) || 0,
        paymentQRs: processedPaymentQRs,
        bankAccounts: validBanks,
        image: base64Image,
        createdAt: new Date().toISOString(),
        endTime: new Date(Date.now() + (parseInt(form.duration) || 0) * 86400000).toISOString()
      };
      
      mockDb.addCampaign(newCampaign);
      
      setStatus("success");
      setTimeout(() => router.push("/campaigns"), 2500);
    }
  };

  const isValid = form.title.trim().length > 0 && form.category !== "" && form.goal !== "" && form.duration !== "";

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen font-sans bg-gradient-to-b from-[#f2faf6] via-[#fbf8f3] to-[#fff3ec] relative overflow-x-hidden">

      {/* ── BACKGROUND ── */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {isMounted && (
          <motion.div
            style={{ x: smoothX, y: smoothY }}
            className="absolute top-[-15vw] left-[-15vw] w-[30vw] h-[30vw] rounded-full bg-uiu-orange/15 blur-[120px] pointer-events-none z-10"
          />
        )}
        <motion.div
          animate={{ x: ["0vw","30vw","-20vw","0vw"], y: ["0vh","-20vh","30vh","0vh"], scale: [1,1.3,0.9,1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute top-[10%] left-[20%] w-[45vw] h-[45vw] rounded-full bg-uiu-emerald/15 blur-[130px]"
        />
        <motion.div
          animate={{ x: ["0vw","-40vw","10vw","0vw"], y: ["0vh","40vh","-10vh","0vh"], scale: [1,0.8,1.2,1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          className="absolute top-[30%] right-[10%] w-[50vw] h-[50vw] rounded-full bg-rose-500/10 blur-[140px]"
        />
        <div className="absolute inset-0 backdrop-blur-[60px] z-0" />
        <motion.div
          animate={{ backgroundPosition: ["0px 0px","40px 40px"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-50 z-[1]"
        />
      </div>

      {/* ── CONTENT ── */}
      <main className="relative z-10 max-w-2xl mx-auto w-full px-5 py-10 md:py-16 pb-28">

        {/* Back nav */}
        <header className="mb-10">
          <Link
            href="/campaigns"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/50 backdrop-blur-md border border-white/80 shadow-sm text-slate-700 font-bold hover:bg-white/90 hover:text-slate-900 transition-all group w-max"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back to Campaigns
          </Link>
        </header>

        {/* Page title */}
        <div className="mb-10">
          <motion.h1
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.1] mb-3"
          >
            Launch a New<br />
            <span className="text-uiu-emerald">Campaign 🚀</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-slate-500 font-medium text-lg"
          >
            Fill in the details below and upload a cover photo to inspire donors.
          </motion.p>
        </div>

        {/* ── SUCCESS BANNER ── */}
        <AnimatePresence>
          {status === "success" && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="mb-8 flex items-center gap-4 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-sm"
            >
              <CheckCircle2 className="w-8 h-8 text-uiu-emerald shrink-0" />
              <div>
                <p className="font-black text-emerald-800">Campaign launched successfully! 🎉</p>
                <p className="text-sm font-medium text-emerald-600 mt-0.5">
                  Redirecting you to the campaigns page…
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── ERROR BANNER ── */}
        <AnimatePresence>
          {status === "error" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-8 flex items-center gap-4 p-5 rounded-2xl bg-rose-50 border border-rose-200 shadow-sm"
            >
              <AlertCircle className="w-7 h-7 text-rose-500 shrink-0" />
              <div>
                <p className="font-black text-rose-700">Submission failed</p>
                <p className="text-sm font-medium text-rose-500 mt-0.5">{errMsg}</p>
              </div>
              <button
                onClick={() => setStatus("idle")}
                className="ml-auto w-7 h-7 flex items-center justify-center rounded-full bg-rose-100 hover:bg-rose-200 text-rose-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── FORM CARD ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, type: "spring" }}
          className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-[2.5rem] shadow-2xl shadow-slate-200/40 p-8 md:p-10"
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-7">

            {/* ── TITLE ── */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Type className="w-4 h-4 text-uiu-emerald" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Campaign Title <span className="text-rose-400">*</span>
                </span>
              </div>
              <FloatingInput
                id="title"
                label="e.g. UIU Winter Clothing Drive"
                value={form.title}
                onChange={handleField("title")}
              />
            </div>

            {/* ── GOAL & DURATION ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-uiu-emerald" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Target Goal <span className="text-rose-400">*</span>
                  </span>
                </div>
                <FloatingInput
                  id="goal"
                  label="e.g. 500 (Items/Amount)"
                  value={form.goal}
                  onChange={handleField("goal")}
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-uiu-emerald" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Duration (Days) <span className="text-rose-400">*</span>
                  </span>
                </div>
                <FloatingInput
                  id="duration"
                  label="e.g. 30"
                  type="number"
                  value={form.duration}
                  onChange={handleField("duration")}
                />
              </div>
            </div>

            {/* ── DESCRIPTION ── */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-uiu-emerald" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Description
                </span>
              </div>
              <FloatingInput
                id="description"
                label="Describe the impact of this campaign…"
                value={form.description}
                onChange={handleField("description")}
                as="textarea"
                rows={4}
              />
            </div>

            {/* ── CATEGORY DROPDOWN ── */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-uiu-emerald" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Category <span className="text-rose-400">*</span>
                </span>
              </div>
              <div className="relative">
                <button
                  type="button"
                  id="category"
                  onClick={() => setCatOpen((p) => !p)}
                  className={`w-full px-5 py-4 rounded-2xl bg-white/80 border text-left font-bold shadow-sm flex items-center justify-between transition-all
                    ${catOpen
                      ? "border-uiu-emerald ring-2 ring-uiu-emerald/10"
                      : "border-slate-200 hover:border-slate-300"
                    }
                    ${form.category ? "text-slate-800" : "text-slate-400"}
                  `}
                >
                  <span>
                    {form.category
                      ? CATEGORIES.find((c) => c.value === form.category)?.label
                      : "Select a category…"}
                  </span>
                  <motion.div
                    animate={{ rotate: catOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {catOpen && (
                    <motion.ul
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute z-30 mt-2 w-full bg-white/95 backdrop-blur-xl border border-slate-100 rounded-2xl shadow-2xl shadow-slate-200/60 overflow-hidden"
                    >
                      {CATEGORIES.map((cat) => (
                        <li key={cat.value}>
                          <button
                            type="button"
                            onClick={() => {
                              setForm((p) => ({ ...p, category: cat.value }));
                              setCatOpen(false);
                            }}
                            className={`w-full px-5 py-3.5 text-left font-bold text-sm transition-colors
                              ${form.category === cat.value
                                ? "bg-uiu-emerald/10 text-uiu-emerald"
                                : "text-slate-700 hover:bg-slate-50"
                              }`}
                          >
                            {cat.label}
                          </button>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* ── DYNAMIC MANUAL QR UPLOAD SYSTEM ── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-uiu-emerald" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Manual QR Upload System
                  </span>
                </div>
                <button
                  type="button"
                  onClick={addPaymentQR}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-uiu-emerald/10 text-uiu-emerald text-[9px] font-black uppercase tracking-widest hover:bg-uiu-emerald hover:text-white transition-all shadow-sm"
                >
                  <Plus className="w-3 h-3" /> Add QR Code
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence>
                  {paymentQRs.map((qr) => (
                    <motion.div
                      key={qr.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95, height: 0 }}
                      className="relative p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col gap-3 group"
                    >
                      <button
                        type="button"
                        onClick={() => removePaymentQR(qr.id)}
                        className="absolute top-2 right-2 w-7 h-7 bg-rose-50 text-rose-400 hover:bg-rose-500 hover:text-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* QR IMAGE UPLOAD */}
                      <div
                        onClick={() => document.getElementById(`qr-input-${qr.id}`).click()}
                        className="relative aspect-square w-full rounded-xl border-2 border-dashed border-slate-100 bg-slate-50/50 flex flex-col items-center justify-center gap-2 hover:border-uiu-emerald/30 hover:bg-emerald-50/20 transition-all cursor-pointer overflow-hidden"
                      >
                        <input
                          id={`qr-input-${qr.id}`}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleQRImageSelect(qr.id, e)}
                        />
                        {qr.preview ? (
                          <img src={qr.preview} alt="QR Preview" className="w-full h-full object-contain" />
                        ) : (
                          <>
                            <ImagePlus className="w-6 h-6 text-slate-300" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Upload QR</span>
                          </>
                        )}
                      </div>

                      {/* PROVIDER NAME & NUMBER */}
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Provider (e.g. bKash)"
                          value={qr.provider}
                          onChange={(e) => updatePaymentQR(qr.id, "provider", e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-800 text-[10px] focus:ring-2 focus:ring-uiu-emerald/10 transition-all"
                        />
                        <input
                          type="tel"
                          placeholder="Number (optional)"
                          value={qr.number}
                          onChange={(e) => updatePaymentQR(qr.id, "number", e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-800 text-[10px] focus:ring-2 focus:ring-uiu-emerald/10 transition-all"
                        />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {paymentQRs.length === 0 && (
                <div className="py-8 text-center flex flex-col items-center gap-2 border-2 border-dashed border-slate-100 rounded-2xl">
                  <QrCode className="w-8 h-8 text-slate-100" />
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No QR codes added yet</p>
                </div>
              )}
            </div>

            {/* ── BANK ACCOUNTS ── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-uiu-emerald" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Bank Account Details
                  </span>
                </div>
                <button
                  type="button"
                  onClick={addBank}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-uiu-emerald/10 text-uiu-emerald text-[9px] font-black uppercase tracking-widest hover:bg-uiu-emerald hover:text-white transition-all shadow-sm"
                >
                  <Plus className="w-3 h-3" /> Add Account
                </button>
              </div>
              
              <div className="space-y-4">
                {bankAccounts.map((bank, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-5 rounded-2xl bg-slate-50/50 border border-slate-100 relative group"
                  >
                    {bankAccounts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBank(idx)}
                        className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-1.5">
                      <Building2 className="w-3 h-3" /> Account {idx + 1}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FloatingInput
                        id={`bankName-${idx}`}
                        label="Bank Name"
                        value={bank.bankName}
                        onChange={handleBankField(idx, "bankName")}
                      />
                      <FloatingInput
                        id={`branch-${idx}`}
                        label="Branch (optional)"
                        value={bank.branch}
                        onChange={handleBankField(idx, "branch")}
                      />
                      <FloatingInput
                        id={`accountName-${idx}`}
                        label="Account Holder Name"
                        value={bank.accountName}
                        onChange={handleBankField(idx, "accountName")}
                      />
                      <FloatingInput
                        id={`accountNumber-${idx}`}
                        label="Account Number"
                        value={bank.accountNumber}
                        onChange={handleBankField(idx, "accountNumber")}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* ── IMAGE UPLOAD + LIVE PREVIEW ── */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ImagePlus className="w-4 h-4 text-uiu-emerald" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Campaign Cover Photo
                </span>
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                  (matches backend image param)
                </span>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />

              <AnimatePresence mode="wait">
                {preview ? (
                  /* ── Live Preview ── */
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative rounded-2xl overflow-hidden border-2 border-uiu-emerald/30 shadow-lg"
                  >
                    <img
                      src={preview}
                      alt="Campaign cover preview"
                      className="w-full max-h-72 object-cover"
                    />
                    {/* Overlay bar */}
                    <div className="absolute bottom-0 inset-x-0 px-4 py-3 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-uiu-emerald" />
                        <span className="text-white text-xs font-bold truncate max-w-[180px]">
                          {imageFile?.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          className="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white text-[10px] font-black uppercase tracking-widest backdrop-blur-md transition-all"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={clearImage}
                          className="w-7 h-7 flex items-center justify-center rounded-full bg-rose-500/80 hover:bg-rose-500 text-white transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Scanning line animation */}
                    <motion.div
                      animate={{ top: ["5%", "90%", "5%"] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="absolute left-0 right-0 h-0.5 bg-uiu-emerald/40 shadow-[0_0_10px_rgba(16,185,129,0.4)] z-20 pointer-events-none"
                    />
                  </motion.div>
                ) : (
                  /* ── Drop Zone ── */
                  <motion.div
                    key="dropzone"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => fileRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className="group relative w-full h-44 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60
                      hover:border-uiu-emerald/50 hover:bg-emerald-50/30 transition-all cursor-pointer
                      flex flex-col items-center justify-center gap-3 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-uiu-orange/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <motion.div
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <ImagePlus className="w-10 h-10 text-slate-300 group-hover:text-uiu-emerald transition-colors" />
                    </motion.div>
                    <div className="text-center relative z-10">
                      <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 group-hover:text-uiu-emerald transition-colors">
                        Click to upload or drag &amp; drop
                      </p>
                      <p className="text-[9px] font-bold text-slate-300 mt-1 uppercase tracking-wide">
                        PNG, JPG, WEBP — max 10 MB
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── SUBMIT ── */}
            <motion.button
              type="submit"
              disabled={!isValid || status === "loading" || status === "success"}
              whileTap={{ scale: 0.98 }}
              className={`relative w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 overflow-hidden transition-all
                ${isValid && status !== "loading" && status !== "success"
                  ? "bg-uiu-emerald text-white shadow-xl shadow-emerald-300/40 hover:bg-emerald-600 hover:-translate-y-0.5"
                  : "bg-slate-100 text-slate-300 cursor-not-allowed"
                }`}
            >
              {/* Animated shimmer on hover */}
              {isValid && status === "idle" && (
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700 ease-in-out" />
              )}

              {status === "loading" ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="animate-pulse">Launching Campaign…</span>
                </>
              ) : status === "success" ? (
                <>
                  <CheckCircle2 className="w-6 h-6" />
                  Launched! Redirecting…
                </>
              ) : (
                <>
                  <Rocket className="w-6 h-6" />
                  Launch Campaign
                </>
              )}
            </motion.button>

            {/* Required fields note */}
            <p className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest -mt-3">
              <span className="text-rose-400">*</span> Required fields
            </p>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
