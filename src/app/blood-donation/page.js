"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, User, Droplets, MapPin, X, ArrowLeft, ArrowUpRight, CheckCircle2, AlertCircle, Trash2, Edit2, Phone, Heart, Activity } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/utils/userUtils";

const API = "http://localhost:8080/api/blood-donation";

function formatRelativeTime(dt) {
  if (!dt) return "Recently";
  let dateStr = dt;
  if (Array.isArray(dt)) {
    dateStr = `${dt[0]}-${String(dt[1]).padStart(2,'0')}-${String(dt[2]).padStart(2,'0')}T${String(dt[3]||0).padStart(2,'0')}:${String(dt[4]||0).padStart(2,'0')}`;
  } else {
    dateStr = String(dt).replace(' ', 'T');
  }
  const date = new Date(dateStr);
  const diff = (new Date() - date) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function BloodDonationPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [newRequest, setNewRequest] = useState({
    patientName: "",
    bloodGroup: "O+",
    contactPhone: "",
    hospitalName: "",
    details: "",
    urgent: false
  });
  
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(API);
      if (res.ok) {
        let data = await res.json();
        // sort by newest
        if (Array.isArray(data)) {
            data.sort((a,b) => b.id - a.id);
        }
        setItems(data);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newRequest.patientName || !newRequest.bloodGroup || !newRequest.contactPhone || !newRequest.hospitalName) {
      alert("Name, Blood Group, Phone, and Hospital are required!");
      return;
    }
    setSaving(true);

    const payload = {
      ...newRequest,
      location: newRequest.hospitalName,
      requestedBy: currentUser?.fullName || currentUser?.name || "Anonymous",
      postedByEmail: currentUser?.email || localStorage.getItem("userEmail") || ""
    };

    try {
      const url = editingId ? `${API}/${editingId}` : API;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowModal(false);
        setEditingId(null);
        setNewRequest({ patientName: "", bloodGroup: "O+", contactPhone: "", hospitalName: "", details: "", urgent: false });
        loadData();
      } else {
        alert("Failed to save request.");
      }
    } catch {
      alert("Network error.");
    }
    setSaving(false);
  };

  const handleEditClick = (item) => {
    setNewRequest({
      patientName: item.patientName || item.requestedBy || "",
      bloodGroup: item.bloodGroup || "O+",
      contactPhone: item.contactPhone || "",
      hospitalName: item.location || item.hospitalName || "",
      details: item.details || "",
      urgent: item.urgent || false
    });
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this blood request?")) {
      try {
        const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setItems(items.filter(item => item.id !== id));
        } else {
          alert("Failed to delete request.");
        }
      } catch (err) {
        console.error(err);
        alert("Network error.");
      }
    }
  };

  const filteredItems = items.filter(item => {
    const mt = item.patientName?.toLowerCase().includes(search.toLowerCase()) || item.location?.toLowerCase().includes(search.toLowerCase());
    const mg = filterGroup === "All" || item.bloodGroup === filterGroup;
    return mt && mg;
  });

  const bloodGroups = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

  return (
    <div className="min-h-screen font-sans bg-gradient-to-b from-[#fff0f2] via-[#fbf8f3] to-[#fff3ec] relative overflow-hidden">
      
      {/* BACKGROUND BLOBS */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div animate={{ x: ['0vw', '30vw', '-20vw', '0vw'], y: ['0vh', '-20vh', '30vh', '0vh'] }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute top-[10%] left-[20%] w-[45vw] h-[45vw] rounded-[100%] bg-red-400/15 blur-[130px]" />
        <motion.div animate={{ x: ['0vw', '-40vw', '10vw', '0vw'], y: ['0vh', '40vh', '-10vh', '0vh'] }} transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          className="absolute top-[30%] right-[10%] w-[50vw] h-[50vw] rounded-[100%] bg-rose-400/10 blur-[140px]" />
        <div className="absolute inset-0 backdrop-blur-[80px] z-[-1]" />
        <motion.div animate={{ backgroundPosition: ['0px 0px', '40px 40px'] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_100%_100%_at_50%_0%,#000_50%,transparent_120%)] opacity-50 z-[0]" />
      </div>

      <main className="max-w-7xl mx-auto px-6 py-12 relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <Link href="/dashboard" className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-white/50 backdrop-blur-md border border-white/80 shadow-sm text-slate-600 font-bold hover:bg-white transition-all text-sm w-max group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
            </Link>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight flex items-center gap-4">
              <span className="p-3 bg-red-500 rounded-2xl text-white shadow-lg shadow-red-500/20"><Droplets className="w-8 h-8" /></span>
              Blood Donation
            </h1>
            <p className="text-slate-500 text-lg mt-3 font-medium max-w-xl leading-relaxed">
              Find donors or request blood for medical emergencies. Save a life today.
            </p>
          </div>
          <button onClick={() => { setEditingId(null); setNewRequest({ patientName: "", bloodGroup: "O+", contactPhone: "", hospitalName: "", details: "", urgent: false }); setShowModal(true); }} className="px-8 py-4 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-2xl font-black shadow-xl shadow-red-500/30 flex items-center gap-3 transition-all hover:scale-105 active:scale-95 shrink-0">
            <Plus className="w-5 h-5 bg-white/20 rounded-full p-1" /> Request Blood
          </button>
        </header>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-red-500 transition-colors" />
            <input type="text" placeholder="Search by hospital or patient name..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-14 pr-6 py-4 rounded-2xl bg-white/60 backdrop-blur-xl border border-white outline-none font-bold text-slate-700 shadow-sm focus:ring-4 focus:ring-red-500/10 focus:border-red-400 transition-all placeholder:text-slate-300" />
          </div>
          <div className="flex gap-2 p-2 bg-white/60 backdrop-blur-xl rounded-2xl border border-white shadow-sm overflow-x-auto no-scrollbar">
            <button onClick={() => setFilterGroup("All")} className={`px-5 py-2.5 rounded-xl font-black text-sm whitespace-nowrap transition-all ${filterGroup === "All" ? "bg-slate-800 text-white shadow-md" : "text-slate-500 hover:bg-white hover:text-slate-700"}`}>All</button>
            {bloodGroups.map(bg => (
              <button key={bg} onClick={() => setFilterGroup(bg)} className={`px-5 py-2.5 rounded-xl font-black text-sm whitespace-nowrap transition-all ${filterGroup === bg ? "bg-red-500 text-white shadow-md" : "text-slate-500 hover:bg-white hover:text-slate-700"}`}>
                {bg}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-red-500 animate-spin" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
            <Droplets className="w-20 h-20 text-slate-300 mb-4" />
            <p className="text-xl font-black text-slate-400">No blood requests right now</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredItems.map(item => {
                 let bgBadgeColor = "bg-purple-500";
                 if (item.bloodGroup === "O+" || item.bloodGroup === "O-") bgBadgeColor = "bg-orange-500";
                 if (item.bloodGroup?.startsWith("A")) bgBadgeColor = "bg-red-500";
                 if (item.bloodGroup?.startsWith("B")) bgBadgeColor = "bg-blue-500";

                 return (
                <motion.div key={item.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="group bg-white/70 backdrop-blur-xl border border-white shadow-sm rounded-[2rem] overflow-hidden flex flex-col hover:shadow-xl hover:shadow-red-500/5 transition-all">
                  
                  <div className={`p-6 border-b flex justify-between items-start ${item.urgent ? "bg-rose-50/50 border-rose-100" : "bg-white border-slate-100/50"}`}>
                    <div className="flex flex-col gap-2">
                       <span className={`w-max px-3 py-1 rounded-full text-white text-[10px] font-black uppercase tracking-widest ${bgBadgeColor}`}>
                         {item.bloodGroup} Blood Needed
                       </span>
                       <h3 className="text-xl font-black text-slate-900 leading-tight line-clamp-2">Patient: {item.patientName || item.requestedBy}</h3>
                    </div>
                    {item.urgent && (
                       <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shrink-0 shadow-sm bg-rose-500 text-white animate-pulse">
                          <AlertCircle className="w-3 h-3" /> Urgent
                       </div>
                    )}
                  </div>

                  <div className="p-6 flex-1 flex flex-col">
                    <div className="space-y-3 mb-6 bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                        <div className="flex items-start gap-2">
                           <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                           <p className="text-slate-600 font-bold text-sm">{item.location || item.hospitalName || "Hospital Not Mentioned"}</p>
                        </div>
                        <div className="flex items-start gap-2">
                           <Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                           <p className="text-slate-600 font-bold text-sm">{item.contactPhone || "Not Provided"}</p>
                        </div>
                    </div>
                    
                    <div className="mt-auto pt-6 border-t border-slate-100/50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-800 line-clamp-1">Req. By: {item.requestedBy || item.patientName}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">{formatRelativeTime(item.createdAt || item.postedDate)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex bg-slate-50 relative z-10 border-t border-slate-100/50">
                    <Link href={`/blood-donation-details?id=${item.id}`} className="flex-1 p-4 font-black text-xs text-red-500 text-center flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-colors">
                      View Details & Help <ArrowUpRight className="w-4 h-4" />
                    </Link>
                    {currentUser && currentUser.email === item.postedByEmail && (
                      <>
                        <button onClick={() => handleEditClick(item)} className="p-4 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 border-l border-slate-100/80 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-4 text-slate-400 hover:text-rose-500 hover:bg-rose-50 border-l border-slate-100/80 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>

                </motion.div>
              )})}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* POST MODAL */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 pointer-events-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-full">
              
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h2 className="text-2xl font-black text-slate-800">{editingId ? "Edit Blood Request" : "Request Blood Needed"}</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{editingId ? "Update your request details" : "Post an urgent requirement"}</p>
                </div>
                <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full bg-white border shadow-sm flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto no-scrollbar flex flex-col gap-6 bg-white shrink-1">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Patient Name</label>
                    <input type="text" value={newRequest.patientName} onChange={e => setNewRequest({ ...newRequest, patientName: e.target.value })}
                      placeholder="Required"
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-800 focus:bg-white focus:border-red-400 focus:ring-4 focus:ring-red-400/10 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Blood Group</label>
                    <select value={newRequest.bloodGroup} onChange={e => setNewRequest({ ...newRequest, bloodGroup: e.target.value })}
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none font-black text-red-500 focus:bg-white focus:border-red-400 focus:ring-4 focus:ring-red-400/10 transition-all appearance-none cursor-pointer">
                      {bloodGroups.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Hospital / Location</label>
                    <input type="text" value={newRequest.hospitalName} onChange={e => setNewRequest({ ...newRequest, hospitalName: e.target.value })}
                      placeholder="Required"
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-800 focus:bg-white focus:border-red-400 focus:ring-4 focus:ring-red-400/10 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Contact Phone</label>
                    <input type="text" value={newRequest.contactPhone} onChange={e => setNewRequest({ ...newRequest, contactPhone: e.target.value })}
                      placeholder="Required"
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-800 focus:bg-white focus:border-red-400 focus:ring-4 focus:ring-red-400/10 transition-all" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Additional Details (Optional)</label>
                  <textarea value={newRequest.details} onChange={e => setNewRequest({ ...newRequest, details: e.target.value })}
                    placeholder="Any specific instructions for donors..."
                    className="w-full h-24 px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-800 focus:bg-white focus:border-red-400 focus:ring-4 focus:ring-red-400/10 transition-all resize-none" />
                </div>
                
                <div className="flex items-center gap-3 mt-2">
                    <button type="button" onClick={() => setNewRequest({...newRequest, urgent: !newRequest.urgent})}
                        className={`w-14 h-8 rounded-full relative transition-colors ${newRequest.urgent ? 'bg-rose-500' : 'bg-slate-200'}`}>
                        <div className={`w-6 h-6 rounded-full bg-white absolute top-1 transition-all ${newRequest.urgent ? 'left-7' : 'left-1'}`} />
                    </button>
                    <span className="font-bold text-slate-700">Mark as Urgent</span>
                </div>

                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-3 mt-2">
                   <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5"><CheckCircle2 className="w-4 h-4" /></div>
                   <p className="text-xs text-emerald-700 font-medium leading-relaxed">Instantly goes live. Will send a push notification to users matching the blood group if they have enabled notifications.</p>
                </div>
              </div>

              <div className="p-6 bg-slate-50/80 border-t border-slate-100 flex gap-4 shrink-0">
                <button onClick={() => setShowModal(false)} className="px-8 py-4 rounded-2xl font-black text-slate-500 hover:bg-slate-200 transition-colors">Cancel</button>
                <button onClick={handleSubmit} disabled={saving} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-500/20 hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Droplets className="w-5 h-5" /> {editingId ? "Update Request" : "Post Blood Request"}</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
