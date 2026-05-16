"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Rocket,
  Users,
  Package,
  MessageSquare,
  Settings,
  PlusCircle,
  CheckCircle,
  X,
  Plus,
  Trash2,
  Edit,
  ShieldCheck,
  Zap,
  Eye,
  Mail,
  Lock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  QrCode,
  CreditCard,
  Check,
  FileText,
  Download,
  ExternalLink,
  BarChart3,
  UploadCloud,
  Send,
  Mic,
  Paperclip,
  ImageIcon,
  File,
  DownloadCloud,
  Square
} from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import Link from "next/link";
import { mockDb } from "@/utils/mockDb";
import { db, serverTimestamp } from "@/utils/firebase";
import { collection, query, where, onSnapshot, orderBy, addDoc, setDoc, doc, deleteDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";

// ── Admin Full Messenger ──────────────────────────────────────────────────────
const ADMIN_ID   = 'ECO_ADMIN';
const ADMIN_NAME = 'EcoNexus Admin';
const QUICK_EMOJIS    = ['😊','😂','❤️','👍','🙌','🔥','🙏','😮','😢','🎉','✨','🤝'];
const REACTION_EMOJIS = ['❤️','😂','😮','😢','🔥','👍'];

const CLOUDINARY_CLOUD_NAME = 'dkltd8juu';
const CLOUDINARY_UPLOAD_PRESET = 'ml_default';

function AdminInbox() {
  const [rooms,      setRooms]      = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages,   setMessages]   = useState([]);
  const [newMsg,     setNewMsg]     = useState('');
  const [hoveredMsg, setHoveredMsg] = useState(null);
  const [showEmoji,  setShowEmoji]  = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [recording,  setRecording]  = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const imgInputRef  = useRef(null);

  /* ── rooms listener ─────────────────────────────────────── */
  useEffect(() => {
    const q = query(collection(db,'chatRooms'), where('participants','array-contains',ADMIN_ID));
    const unsub = onSnapshot(q, snap => {
      setRooms(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.updatedAt?.seconds||0)-(a.updatedAt?.seconds||0)));
    });
    return ()=>unsub();
  }, []);

  /* ── messages listener ───────────────────────────────────── */
  useEffect(() => {
    if (!activeRoom?.id) return;
    const q = query(collection(db,'chatRooms',activeRoom.id,'messages'), orderBy('timestamp','asc'));
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d=>({id:d.id,...d.data()})));
      setTimeout(()=>scrollRef.current?.scrollIntoView({behavior:'smooth'}),100);
    });
    // mark read
    if (activeRoom.unreadBy?.includes(ADMIN_ID)) {
      setDoc(doc(db,'chatRooms',activeRoom.id),{unreadBy:(activeRoom.unreadBy||[]).filter(x=>x!==ADMIN_ID)},{merge:true});
    }
    return ()=>unsub();
  }, [activeRoom?.id]);

  /* ── send message ────────────────────────────────────────── */
  const sendMessage = async (payload = null) => {
    if (!activeRoom) return;
    const finalPayload = payload || { type: 'text', text: newMsg.trim() };
    if (finalPayload.type === 'text' && !finalPayload.text) return;

    const user = activeRoom.participantDetails?.find(p=>p.id!==ADMIN_ID);
    if (!payload) { setNewMsg(''); setShowEmoji(false); }

    await addDoc(collection(db,'chatRooms',activeRoom.id,'messages'),{
      ...finalPayload,
      senderId:ADMIN_ID,
      senderName:ADMIN_NAME,
      receiverId:user?.id||'',
      timestamp:serverTimestamp(),
      reactions:{}
    });
    await setDoc(doc(db,'chatRooms',activeRoom.id),{
      lastMessage: finalPayload.type === 'text' ? finalPayload.text : `Sent a ${finalPayload.type}`,
      lastSender:ADMIN_ID,
      updatedAt:serverTimestamp(),
      unreadBy:[user?.id||'']
    },{merge:true});
  };

  /* ── media upload ────────────────────────────────────────── */
  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, { method: 'POST', body: formData });
    if (!res.ok) throw new Error("Upload Failed");
    const data = await res.json();
    return data.secure_url;
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file || !activeRoom) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      await sendMessage({ type, fileUrl: url, fileName: file.name, text: type === 'image' ? "Sent an image" : `Shared a file: ${file.name}` });
    } catch (err) { alert("Upload Failed. Check connection."); }
    finally { setUploading(false); }
  };

  /* ── voice recording ─────────────────────────────────────── */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        if (blob.size > 100) {
          setUploading(true);
          try {
            const url = await uploadToCloudinary(blob);
            await sendMessage({ type: 'audio', fileUrl: url, text: "Sent a voice message" });
          } catch (err) { console.error(err); }
          finally { setUploading(false); }
        }
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch (err) { alert("Microphone access denied or error."); }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
      setMediaRecorder(null);
    }
  };

  /* ── react to message ────────────────────────────────────── */
  const reactToMsg = async (msgId, emoji) => {
    if (!activeRoom?.id) return;
    const msgRef = doc(db,'chatRooms',activeRoom.id,'messages',msgId);
    const msg = messages.find(m=>m.id===msgId);
    const existing = (msg?.reactions||{})[emoji]||[];
    if (existing.includes(ADMIN_ID)) {
      await updateDoc(msgRef,{[`reactions.${emoji}`]:arrayRemove(ADMIN_ID)});
    } else {
      await updateDoc(msgRef,{[`reactions.${emoji}`]:arrayUnion(ADMIN_ID)});
    }
  };

  /* ── delete single message ───────────────────────────────── */
  const deleteMsg = async (msgId) => {
    if (!activeRoom?.id) return;
    await deleteDoc(doc(db,'chatRooms',activeRoom.id,'messages',msgId));
  };

  /* ── delete full conversation ────────────────────────────── */
  const deleteConversation = async () => {
    if (!activeRoom?.id || !confirm('Delete this entire conversation? This cannot be undone.')) return;
    await deleteDoc(doc(db,'chatRooms',activeRoom.id));
    setActiveRoom(null);
    setMessages([]);
  };

  /* ── helpers ─────────────────────────────────────────────── */
  const fmtTime = secs => secs ? new Date(secs*1000).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '';

  const renderMediaMsg = (msg) => {
    if (msg.type==='image') return <img src={msg.fileUrl} alt="img" className="max-w-[220px] rounded-xl mt-1 cursor-pointer shadow-sm border border-slate-100" onClick={()=>window.open(msg.fileUrl,'_blank')} />;
    if (msg.type==='audio') return <audio controls src={msg.fileUrl} className="max-w-[220px] mt-1 h-8" />;
    if (msg.type==='file')  return <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-blue-500 font-bold underline mt-1"><File className="w-3 h-3"/> {msg.fileName||'File'}</a>;
    return null;
  };

  return (
    <div className="flex rounded-3xl overflow-hidden border border-slate-100 shadow-sm bg-white" style={{height:'600px'}}>

      {/* ── LEFT: conversation list ── */}
      <div className="w-[270px] border-r border-slate-100 flex flex-col bg-slate-50/60 shrink-0">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">All Conversations</p>
          {uploading && <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {rooms.length===0 && (
            <div className="p-8 text-center">
              <p className="text-xs font-bold text-slate-400">No messages yet</p>
              <p className="text-[10px] text-slate-300 mt-1">Users who use "Chat with Organizer" appear here</p>
            </div>
          )}
          {rooms.map(room=>{
            const user  = room.participantDetails?.find(p=>p.id!==ADMIN_ID);
            const unread = room.unreadBy?.includes(ADMIN_ID);
            const isAct  = activeRoom?.id===room.id;
            return (
              <button key={room.id} onClick={()=>{setActiveRoom(room);setMessages([]);}} className={`w-full p-4 flex items-center gap-3 text-left border-b border-slate-50/80 transition-all ${isAct?'bg-blue-50 border-r-4 border-r-blue-500':'hover:bg-white'}`}>
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 text-white font-black flex items-center justify-center text-base shrink-0 shadow-sm">
                  {(user?.name||'U')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-black truncate ${unread?'text-slate-900':'text-slate-600'}`}>{user?.name||'Unknown User'}</p>
                    <span className="text-[9px] text-slate-300 font-bold ml-1 shrink-0">{fmtTime(room.updatedAt?.seconds)}</span>
                  </div>
                  <p className={`text-[11px] truncate mt-0.5 ${unread?'font-black text-slate-800':'font-medium text-slate-400'}`}>{room.lastMessage||'...'}</p>
                </div>
                {unread && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shrink-0 animate-pulse" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT: chat area ── */}
      <div className="flex-1 flex flex-col bg-white min-w-0 relative">
        {activeRoom ? (()=>{
          const user = activeRoom.participantDetails?.find(p=>p.id!==ADMIN_ID);
          return (
            <>
              {/* Header */}
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 text-white font-black flex items-center justify-center shrink-0 shadow-sm">
                    {(user?.name||'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-black text-slate-800 text-sm">{user?.name||'User'}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{user?.id}</p>
                  </div>
                </div>
                <button onClick={deleteConversation} title="Delete conversation" className="p-2 rounded-xl hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-all active:scale-90">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar bg-slate-50/30" onClick={()=>setShowEmoji(false)}>
                {messages.map(msg=>{
                  const isAdmin = msg.senderId===ADMIN_ID;
                  const senderName = isAdmin ? ADMIN_NAME : (user?.name||'User');
                  const reactionEntries = Object.entries(msg.reactions||{}).filter(([,users])=>users?.length>0);
                  return (
                    <div key={msg.id} className={`flex gap-2 group animate-in fade-in slide-in-from-bottom-2 duration-300 ${isAdmin?'justify-end':'justify-start'}`}
                      onMouseEnter={()=>setHoveredMsg(msg.id)} onMouseLeave={()=>setHoveredMsg(null)}>
                      {!isAdmin && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white font-black flex items-center justify-center text-xs shrink-0 mt-1 shadow-sm">
                          {(user?.name||'U')[0].toUpperCase()}
                        </div>
                      )}

                      <div className={`flex flex-col max-w-[75%] ${isAdmin?'items-end':'items-start'}`}>
                        <p className="text-[10px] font-bold text-slate-400 mb-1 px-1">{senderName}</p>

                        <div className={`flex items-end gap-1.5 ${isAdmin?'flex-row-reverse':''}`}>
                          <div className={`px-4 py-2.5 rounded-2xl text-sm font-medium leading-relaxed shadow-sm transition-all ${
                            isAdmin ? 'bg-blue-500 text-white rounded-br-sm' : 'bg-white text-slate-800 rounded-bl-sm border border-slate-100'
                          }`}>
                            {msg.type==='text'||!msg.type ? msg.text : renderMediaMsg(msg)}
                            {msg.type!=='text' && msg.type && msg.text && (
                              <p className="text-[10px] opacity-70 mt-1 italic">{msg.text}</p>
                            )}
                          </div>

                          {hoveredMsg===msg.id && (
                            <div className={`flex items-center gap-1 ${isAdmin?'flex-row-reverse':''}`}>
                              <div className="relative">
                                <button className="text-base hover:scale-125 transition-transform p-1 rounded-lg hover:bg-slate-100" title="React"
                                  onClick={e=>{e.stopPropagation();setHoveredMsg(h=>h===msg.id?null:msg.id);}}>
                                  😊
                                </button>
                                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-1 bg-white rounded-full shadow-2xl border border-slate-100 px-3 py-1.5 z-50">
                                  {REACTION_EMOJIS.map(e=>(
                                    <button key={e} onClick={()=>reactToMsg(msg.id,e)}
                                      className="text-lg hover:scale-150 transition-transform">{e}</button>
                                  ))}
                                </div>
                              </div>
                              <button onClick={()=>deleteMsg(msg.id)} title="Delete message"
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-all">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {reactionEntries.length>0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {reactionEntries.map(([emoji,users])=>(
                              <button key={emoji} onClick={()=>reactToMsg(msg.id,emoji)}
                                className="flex items-center gap-1 text-[10px] bg-white border border-slate-100 rounded-full px-2 py-0.5 shadow-sm hover:border-blue-200 transition-all">
                                {emoji} <span className="font-black text-slate-500">{users.length}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        <p className="text-[9px] text-slate-300 mt-1 px-1 font-bold uppercase">{fmtTime(msg.timestamp?.seconds)}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={scrollRef} />
              </div>

              {/* Emoji quick-picker */}
              <AnimatePresence>
                {showEmoji && (
                  <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:10}} className="absolute bottom-24 left-6 flex gap-2 flex-wrap bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-50 max-w-[320px]">
                    {QUICK_EMOJIS.map(e=>(
                      <button key={e} className="text-2xl hover:scale-125 transition-transform"
                        onClick={()=>{setNewMsg(m=>m+e); setShowEmoji(false);}}
                      >{e}</button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input bar */}
              <div className="p-4 border-t border-slate-100 flex gap-2 items-center bg-white">
                <input type="file" ref={imgInputRef} className="hidden" accept="image/*" onChange={e=>handleFileUpload(e,'image')} />
                <input type="file" ref={fileInputRef} className="hidden" onChange={e=>handleFileUpload(e,'file')} />

                <div className="flex gap-1">
                  <button onClick={()=>imgInputRef.current?.click()} className="w-10 h-10 rounded-xl hover:bg-blue-50 text-slate-400 hover:text-blue-500 transition-all flex items-center justify-center shrink-0" title="Image"><ImageIcon className="w-5 h-5"/></button>
                  <button onClick={()=>fileInputRef.current?.click()} className="w-10 h-10 rounded-xl hover:bg-blue-50 text-slate-400 hover:text-blue-500 transition-all flex items-center justify-center shrink-0" title="File"><Paperclip className="w-5 h-5"/></button>
                  <button onClick={e=>{e.stopPropagation();setShowEmoji(s=>!s);}} className="w-10 h-10 rounded-xl hover:bg-amber-50 text-slate-400 hover:text-amber-500 transition-all flex items-center justify-center text-xl shrink-0" title="Emoji">😊</button>
                </div>

                <div className="flex-1 relative">
                   <input type="text" value={newMsg} onChange={e=>setNewMsg(e.target.value)}
                    disabled={recording}
                    onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}}}
                    placeholder={recording ? "Recording..." : `Reply to ${user?.name||'User'}...`}
                    className={`w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-blue-300 focus:bg-white transition-all ${recording ? 'animate-pulse' : ''}`} />
                </div>

                <div className="flex gap-2">
                  {recording ? (
                    <button onClick={stopRecording} className="w-11 h-11 bg-rose-500 text-white rounded-2xl flex items-center justify-center transition-all animate-pulse shadow-lg shadow-rose-100"><Square className="w-5 h-5 fill-current" /></button>
                  ) : (
                    <button onClick={startRecording} className="w-11 h-11 bg-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-500 rounded-2xl flex items-center justify-center transition-all" title="Voice Message"><Mic className="w-5 h-5"/></button>
                  )}
                  <button onClick={()=>sendMessage()}
                    className="w-11 h-11 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl flex items-center justify-center transition-all shadow-xl shadow-blue-100 active:scale-95 shrink-0">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          );
        })() : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center">
              <MessageSquare className="w-10 h-10 text-blue-200" />
            </div>
            <p className="font-black text-slate-400">Select a conversation</p>
            <p className="text-sm text-slate-300 font-medium italic">Your users are waiting for a reply!</p>
          </div>
        )}
      </div>
    </div>
  );
}



export default function AdminControlPanel() {
  const [activeTab, setActiveTab] = useState("campaigns");
  const [campaigns, setCampaigns] = useState([]);
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [publicItems, setPublicItems] = useState([]);
  const [settings, setSettings] = useState({});
  const [newCampaign, setNewCampaign] = useState({ name: "", target: "", duration: "", description: "", category: "Education", image: null, sslCommerzEnabled: true });
  const [isLaunching, setIsLaunching] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState(null);
  const [userRole, setUserRole] = useState("student"); // student or admin
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [showAllLogs, setShowAllLogs] = useState(false);

  const [selectedItemForReview, setSelectedItemForReview] = useState(null);
  const [showCampaignModal, setShowCampaignModal] = useState(false);

  // New states for CSV broadcast
  const [csvFileName, setCsvFileName] = useState(null);
  const [csvRecords, setCsvRecords] = useState([]);
  const [csvFile, setCsvFile] = useState(null);
  const [smsPreview, setSmsPreview] = useState("");
  const [isBroadcastingEmail, setIsBroadcastingEmail] = useState(false);
  const [isBroadcastingSms, setIsBroadcastingSms] = useState(false);
  const [broadcastHistory, setBroadcastHistory] = useState([]);
  const [smsGatewayEndpoint, setSmsGatewayEndpoint] = useState("");

  const coverInputRef = useRef(null);
  const csvInputRef = useRef(null);
  const [coverPreview, setCoverPreview] = useState(null);

  // Dynamic QR / Bank Account lists
  const [paymentQRs, setPaymentQRs] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([{ id: 1, bankName: "", accountName: "", accountNumber: "", branch: "" }]);

  const [adminRooms, setAdminRooms] = useState([]);

  useEffect(() => {
    setIsMounted(true);
    refreshData();
    const onFocus = () => setUsers(mockDb.getUsers());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const refreshData = async () => {
    let backendCampaigns = [];
    try {
      const resp = await fetch("http://localhost:8080/api/campaigns");
      if (resp.ok) {
        backendCampaigns = await resp.json();
      }
    } catch (e) {
      console.warn("Admin backend fetch failed:", e);
    }

    const mockCampaigns = mockDb.getCampaigns();

    const mappedBackend = backendCampaigns.map(c => {
      const extra = mockDb.getCampaignExtras(c.title) || mockDb.getCampaignExtras(c.id?.toString()) || {};
      let imageUrl = extra.image || c.image || c.imagePath;
      if (imageUrl && !imageUrl.startsWith("http") && !imageUrl.startsWith("blob:") && !imageUrl.startsWith("data:")) {
        imageUrl = `http://localhost:8080/${imageUrl.startsWith("/") ? imageUrl.slice(1) : imageUrl}`;
      }
      let progress = c.progress;
      if (progress === undefined || progress === null) {
        const goal = parseFloat(extra.goal || c.goal) || 0;
        const collected = parseFloat(c.collected) || 0;
        progress = goal > 0 ? Math.round((collected / goal) * 100) : 0;
      }
      let paymentQRs = c.paymentQRs;
      if (typeof paymentQRs === 'string') {
        try { paymentQRs = JSON.parse(paymentQRs); } catch (e) { paymentQRs = []; }
      }
      let bankAccounts = c.bankAccounts;
      if (typeof bankAccounts === 'string') {
        try { bankAccounts = JSON.parse(bankAccounts); } catch (e) { bankAccounts = []; }
      }
      return {
        ...c,
        _uniqueId: `backend-${c.id}`,
        image: imageUrl,
        progress: progress,
        goal: extra.goal || c.goal,
        duration: extra.duration || c.duration || 30,
        bkash: extra.bkash || c.bkash,
        rocket: extra.rocket || c.rocket,
        nagad: extra.nagad || c.nagad,
        paymentQRs: (extra.paymentQRs && extra.paymentQRs.length > 0) ? extra.paymentQRs : (paymentQRs || []),
        bankAccounts: (extra.bankAccounts && extra.bankAccounts.length > 0) ? extra.bankAccounts : (bankAccounts || [])
      };
    });

    const backendTitles = new Set(mappedBackend.map(c => c.title.toLowerCase()));
    const backendIds = new Set(mappedBackend.map(c => c.id?.toString()));
    const uniqueMock = mockCampaigns
      .filter(c => !backendIds.has(c.id?.toString()) && !backendTitles.has(c.title?.toLowerCase()))
      .map(c => ({ ...c, _uniqueId: `mock-${c.id}` }));

    setCampaigns([...mappedBackend, ...uniqueMock]);

    try {
      const res = await fetch("http://localhost:8080/api/users");
      if (res.ok) {
        const backendUsers = await res.json();
        const mappedUsers = backendUsers.map(u => ({
          ...u,
          _uniqueId: `backend-user-${u.id}`,
          name: u.fullName,
          dept: u.userType?.toUpperCase() || "USER",
          status: u.status || "Active",
          points: u.points || 0
        }));
        const mockUsers = mockDb.getUsers().map(u => ({ ...u, _uniqueId: `mock-user-${u.id}` }));
        const combinedUsers = [...mappedUsers];
        const backendEmails = new Set(mappedUsers.map(u => u.email?.toLowerCase()));
        mockUsers.forEach(mu => {
          if (!backendEmails.has(mu.email?.toLowerCase())) {
            combinedUsers.push(mu);
          }
        });
        setUsers(combinedUsers);
      } else {
        setUsers(mockDb.getUsers());
      }
    } catch (err) {
      console.warn("Failed to fetch users from backend:", err);
      setUsers(mockDb.getUsers());
    }

    setSettings(mockDb.getSettings());
    try {
      const resAcademic = await fetch("http://localhost:8080/api/resources");
      let academicItems = [];
      if (resAcademic.ok) academicItems = await resAcademic.json();

      const resPublic = await fetch("http://localhost:8080/api/public-resources/all");
      let publicItems = [];
      if (resPublic.ok) publicItems = await resPublic.json();
      setPublicItems(publicItems);

      const mappedAcademic = academicItems.map(it => {
        let downloadUrl = it.fileName ? `/api/resources/download/${it.fileName}` : it.downloadUrl;
        if (downloadUrl && downloadUrl.startsWith("/")) downloadUrl = `http://localhost:8080${downloadUrl}`;
        return {
          ...it,
          _uniqueId: `academic-${it.id}`,
          condition: it.resourceCondition || it.condition,
          downloadUrl: downloadUrl,
          type: "academic",
          _isBackend: true
        };
      });

      const mappedPublic = publicItems.map(it => {
        let downloadUrl = it.fileUrl;
        if (downloadUrl && downloadUrl.startsWith("/")) downloadUrl = `http://localhost:8080${downloadUrl}`;
        return {
          ...it,
          _uniqueId: `public-${it.id}`,
          condition: it.conditionInfo || it.condition,
          subject: it.category,
          downloadUrl: downloadUrl,
          type: "public",
          _isBackend: true
        };
      });

      const combinedItems = [...mappedAcademic, ...mappedPublic];
      const mockItems = mockDb.getItems().map(it => ({ ...it, _uniqueId: `mock-item-${it.id}` }));
      const backendUniqueKeys = new Set(combinedItems.map(i => `${i.type}-${i.title.toLowerCase()}`));
      mockItems.forEach(mi => {
        const key = `${mi.type || 'academic'}-${mi.title.toLowerCase()}`;
        if (!backendUniqueKeys.has(key)) combinedItems.push(mi);
      });
      setItems(combinedItems);
    } catch (err) {
      console.warn("Failed to fetch resources from backend:", err);
      setItems(mockDb.getItems());
    }

    try {
      const resHistory = await fetch("http://localhost:8080/api/admin/broadcast/history");
      if (resHistory.ok) {
        const history = await resHistory.json();
        setBroadcastHistory(history.reverse());
      }
    } catch (err) {
      console.warn("Failed to fetch broadcast history:", err);
    }
  };

  const handleItemAction = async (item, status) => {
    try {
      const id = item.id;
      const isPublic = item?.type === "public" || item?._uniqueId?.startsWith("public-") || !!item.category;
      const endpoint = isPublic
        ? `http://localhost:8080/api/public-resources/${id}/status?status=${status}`
        : `http://localhost:8080/api/resources/${id}/status?status=${status}`;

      const res = await fetch(endpoint, { method: "PUT" });
      if (res.ok) {
        refreshData();
      } else {
        mockDb.updateItemStatus(id, status);
        refreshData();
      }
    } catch (err) {
      console.warn("Status update failed:", err);
      mockDb.updateItemStatus(item.id, status);
      refreshData();
    }
  };

  const handleDeleteCampaign = async (id) => {
    if (confirm("Are you sure you want to delete this campaign?")) {
      try {
        const res = await fetch(`http://localhost:8080/api/campaigns/${id}`, { method: "DELETE" });
        if (res.ok) refreshData();
      } catch (err) {
        console.warn("Delete failed:", err);
      }
      mockDb.deleteCampaign(id);
      refreshData();
    }
  };

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

  const resetForm = () => {
    setNewCampaign({ name: "", target: "", duration: "", description: "", category: "Education", image: null, sslCommerzEnabled: true });
    setCoverPreview(null);
    setPaymentQRs([]);
    setBankAccounts([{ id: 1, bankName: "", accountName: "", accountNumber: "", branch: "" }]);
    setEditingCampaignId(null);
  };

  const addPaymentQR = () => {
    setPaymentQRs([...paymentQRs, { id: Date.now(), provider: "", number: "", file: null, preview: null }]);
  };

  const removePaymentQR = (id) => {
    setPaymentQRs(paymentQRs.filter(qr => qr.id !== id));
  };

  const handleQRImageSelect = (id, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPaymentQRs(prev => prev.map(qr => qr.id === id ? { ...qr, file, preview: url, image: url } : qr));
  };

  const updatePaymentQR = (id, field, value) => {
    setPaymentQRs(prev => prev.map(qr => qr.id === id ? { ...qr, [field]: value } : qr));
  };

  const addBankAccount = () => {
    setBankAccounts([...bankAccounts, { id: Date.now(), bankName: "", accountName: "", accountNumber: "", branch: "" }]);
  };

  const removeBankAccount = (id) => {
    setBankAccounts(bankAccounts.filter(b => b.id !== id));
  };

  const updateBankAccount = (id, field, value) => {
    setBankAccounts(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const handleLaunch = async () => {
    if (!newCampaign.name || !newCampaign.target) return;
    setIsLaunching(true);

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

    let base64Image = coverPreview;
    const file = coverInputRef.current?.files?.[0];
    if (file) {
      base64Image = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    }

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

    const campaignObj = {
      title: newCampaign.name,
      description: newCampaign.description,
      category: newCampaign.category,
      goal: newCampaign.target,
      duration: newCampaign.duration || 30,
      paymentQRs: processedPaymentQRs,
      bankAccounts: bankAccounts.filter(b => b.bankName || b.accountNumber),
      image: base64Image,
      sslCommerzEnabled: newCampaign.sslCommerzEnabled
    };

    try {
      const fd = new FormData();
      const durationDays = parseInt(newCampaign.duration) || 30;
      const cleanGoal = parseFloat(newCampaign.target.toString().replace(/,/g, '')) || 0;

      fd.append("title", newCampaign.name);
      fd.append("description", newCampaign.description);
      fd.append("category", newCampaign.category);
      fd.append("goal", cleanGoal);
      fd.append("duration", durationDays);
      fd.append("sslCommerzEnabled", newCampaign.sslCommerzEnabled);

      const unifiedList = [
        ...paymentQRs.filter(qr => qr.provider),
        ...bankAccounts.filter(b => b.bankName).map(b => ({
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
        const isUrl = typeof qr.image === 'string' && qr.image.startsWith("http");
        fd.append("qrExistingPaths", isUrl ? qr.image : "");
        if (qrFile) {
          const fileName = qr.file ? qr.file.name : `qr_${Date.now()}_${qr.provider}.png`;
          fd.append("qrFiles", qrFile, fileName);
        } else {
          fd.append("qrFiles", new Blob([], { type: "application/octet-stream" }), "null");
        }
      });
      fd.append("bankAccounts", JSON.stringify(bankAccounts.filter(b => b.bankName)));

      if (file) fd.append("image", file);

      const isRealBackendId = editingCampaignId && editingCampaignId < 1000000000;
      const url = (editingCampaignId && isRealBackendId)
        ? `http://localhost:8080/api/campaigns/${editingCampaignId}`
        : "http://localhost:8080/api/campaigns";
      const method = (editingCampaignId && isRealBackendId) ? "PUT" : "POST";

      console.log(`Sending ${method} to ${url}...`);
      const res = await fetch(url, { method: method, body: fd });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Backend error (${res.status}): ${errorText}`);
      }

      const savedData = await res.json();
      console.log("Success:", savedData);

      mockDb.saveCampaignExtras(newCampaign.name, campaignObj);
      refreshData();
      setIsLaunching(false);
      setShowSuccess(true);
      resetForm();
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err) {
      console.error("CRITICAL: Backend sync failed:", err);
      alert("⚠️ Database Sync Failed!\n\nReason: " + err.message + "\n\nThe campaign was saved LOCALLY to your browser as a fallback, but it might not be visible to others. Please check your backend connection.");
      
      if (editingCampaignId) {
        mockDb.updateCampaign(editingCampaignId, campaignObj);
      } else {
        campaignObj.id = Date.now();
        campaignObj.createdAt = new Date().toISOString();
        campaignObj.endTime = new Date(Date.now() + (parseInt(newCampaign.duration) || 30) * 86400000).toISOString();
        mockDb.addCampaign(campaignObj);
      }
      mockDb.saveCampaignExtras(newCampaign.name, campaignObj);
      refreshData();
      setIsLaunching(false);
      setShowSuccess(true);
      resetForm();
      setTimeout(() => setShowSuccess(false), 5000);
    }
  };

  const handleEditCampaign = (c) => {
    setNewCampaign({
      name: c.title || "",
      target: c.goal || "",
      duration: c.duration || c.daysLeft || "",
      description: c.description || "",
      category: c.category || "Education",
      image: c.image || null,
      sslCommerzEnabled: c.sslCommerzEnabled !== false,
    });
    setCoverPreview(c.image || null);
    if (c.paymentQRs && c.paymentQRs.length > 0) {
      setPaymentQRs(c.paymentQRs.map((qr, i) => ({ id: i, provider: qr.provider, number: qr.number, preview: qr.image, image: qr.image })));
    } else {
      setPaymentQRs([]);
    }
    if (c.bankAccounts && c.bankAccounts.length > 0) {
      setBankAccounts(c.bankAccounts);
    } else {
      setBankAccounts([{ id: 1, bankName: "", accountName: "", accountNumber: "", branch: "" }]);
    }
    setEditingCampaignId(c.id);
    setShowCampaignModal(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteItem = async (id) => {
    if (confirm("Delete this academic item?")) {
      try {
        const res = await fetch(`http://localhost:8080/api/resources/${id}`, {
          method: "DELETE"
        });
        if (res.ok) {
          refreshData();
        } else {
          mockDb.deleteItem(id);
          refreshData();
        }
      } catch (err) {
        console.warn("Backend delete failed, falling back to mock DB:", err);
        mockDb.deleteItem(id);
        refreshData();
      }
    }
  };

  const handleDeletePublicResource = async (id) => {
    if (confirm("Permanently delete this public resource?")) {
      try {
        const res = await fetch(`http://localhost:8080/api/public-resources/${id}`, {
          method: "DELETE"
        });
        if (res.ok) {
          refreshData();
        } else {
          alert("Delete failed on backend.");
        }
      } catch (err) {
        console.error("Error deleting public resource:", err);
        alert("Connection error.");
      }
    }
  };

  const handleCoverSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCoverPreview(url);
    setNewCampaign(prev => ({ ...prev, image: url }));
  };

  const handleUserStatus = async (id, status) => {
    try {
      const res = await fetch(`http://localhost:8080/api/users/${id}/status?status=${status}`, {
        method: "PUT"
      });
      if (res.ok) {
        refreshData();
      } else {
        mockDb.updateUserStatus(id, status);
        refreshData();
      }
    } catch (err) {
      console.warn("Backend user status update failed:", err);
      mockDb.updateUserStatus(id, status);
      refreshData();
    }
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) { setCsvRecords([]); return; }
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      const nameIdx = headers.findIndex(h => h.includes("name"));
      const emailIdx = headers.findIndex(h => h.includes("email"));
      const phoneIdx = headers.findIndex(h => h.includes("phone") || h.includes("mobile") || h.includes("number"));
      const parsed = lines.slice(1).map(line => {
        const cols = line.split(",").map(c => c.trim());
        return {
          name: nameIdx >= 0 ? cols[nameIdx] || "—" : "—",
          email: emailIdx >= 0 ? cols[emailIdx] || "—" : cols[0] || "—",
          phone: phoneIdx >= 0 ? cols[phoneIdx] || "—" : cols[1] || "—",
        };
      }).filter(r => r.email !== "—" || r.phone !== "—");
      setCsvRecords(parsed);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleClearCSV = () => {
    setCsvFileName(null);
    setCsvFile(null);
    setCsvRecords([]);
  };

  const handleBroadcastEmail = async () => {
    const file = csvFile;
    if (!file) { alert("Please upload a CSV file first."); return; }
    if (!smsPreview) { alert("Please write a message to broadcast."); return; }
    setIsBroadcastingEmail(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("message", smsPreview);
      const res = await fetch("http://localhost:8080/api/admin/broadcast/email", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Broadcast failed");
      alert("Email broadcast initiated successfully!");
      handleClearCSV();
      setSmsPreview("");
    } catch (error) {
      console.error("Broadcast error:", error);
      alert("Failed to initiate broadcast.");
    } finally {
      setIsBroadcastingEmail(false);
    }
  };

  const handleBroadcastSms = async () => {
    const file = csvFile;
    if (!file) { alert("Please upload a CSV file first."); return; }
    if (!smsPreview) { alert("Please write a message to broadcast."); return; }
    setIsBroadcastingSms(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("message", smsPreview);
      const res = await fetch("http://localhost:8080/api/admin/broadcast/sms", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("SMS Broadcast failed");
      alert("SMS broadcast initiated successfully!");
      handleClearCSV();
      setSmsPreview("");
    } catch (error) {
      console.error("SMS Broadcast error:", error);
      alert("Failed to initiate SMS broadcast.");
    } finally {
      setIsBroadcastingSms(false);
    }
  };

  const handleUpdateSettings = (key, value) => {
    mockDb.updateSettings({ [key]: value });
    refreshData();
  };

  if (!isMounted) return null;

  return (
    <div className="flex flex-col min-h-screen font-sans bg-gradient-to-b from-[#f2faf6] via-[#fbf8f3] to-[#fff3ec] relative overflow-x-hidden">

      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div style={{ x: smoothX, y: smoothY }} className="absolute top-[-15vw] left-[-15vw] w-[30vw] h-[30vw] rounded-full bg-uiu-orange/15 blur-[120px] pointer-events-none z-10" />
        <motion.div animate={{ x: ['0vw', '30vw', '-20vw', '0vw'], y: ['0vh', '-20vh', '30vh', '0vh'], scale: [1, 1.3, 0.9, 1] }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }} className="absolute top-[10%] left-[20%] w-[45vw] h-[45vw] rounded-[100%] bg-uiu-emerald/15 blur-[130px]" />
        <motion.div animate={{ x: ['0vw', '-40vw', '10vw', '0vw'], y: ['0vh', '40vh', '-10vh', '0vh'], scale: [1, 0.8, 1.2, 1] }} transition={{ duration: 22, repeat: Infinity, ease: "linear" }} className="absolute top-[30%] right-[10%] w-[50vw] h-[50vw] rounded-[100%] bg-rose-500/10 blur-[140px]" />
        <div className="absolute inset-0 backdrop-blur-[60px] z-[0]" />
      </div>

      <AnimatePresence mode="wait">
        {userRole === "student" ? (
          <motion.main key="access-denied" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="flex-1 flex flex-col items-center justify-center p-6 z-10 text-center w-full min-h-[80vh]">
            <div className="w-full max-w-md bg-white/60 backdrop-blur-xl border border-white/80 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-uiu-emerald/10 blur-3xl rounded-full" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-uiu-orange/10 blur-3xl rounded-full" />
              <div className="relative z-10 text-center mb-8">
                <div className="w-20 h-20 bg-uiu-emerald shadow-[0_15px_30px_-10px_rgba(16,185,129,0.4)] rounded-3xl flex items-center justify-center mx-auto mb-6 border-b-4 border-emerald-600">
                  <ShieldCheck className="w-10 h-10 text-white drop-shadow-sm" strokeWidth={1.5} />
                </div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Admin Login</h2>
                <p className="text-sm font-bold text-slate-400 mt-2">Authorized personnel only</p>
              </div>

              <div className="space-y-4 relative z-10 text-left">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Gmail Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-uiu-emerald transition-colors" />
                    <input type="email" placeholder="admin@gmail.com" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/80 border border-white focus:border-uiu-emerald focus:ring-4 focus:ring-uiu-emerald/10 outline-none transition-all placeholder:text-slate-300 text-slate-800 font-bold shadow-sm" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-uiu-emerald transition-colors" />
                    <input type="password" placeholder="••••••••" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/80 border border-white focus:border-uiu-emerald focus:ring-4 focus:ring-uiu-emerald/10 outline-none transition-all placeholder:text-slate-300 text-slate-800 font-bold shadow-sm" />
                  </div>
                </div>

                {authError && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-rose-500 text-[10px] font-black uppercase text-center tracking-widest bg-rose-50 py-2 rounded-lg border border-rose-100 mt-2">{authError}</motion.p>
                )}

                <button onClick={async () => {
                  try {
                    const response = await fetch("http://localhost:8080/api/admin/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: authEmail, password: authPassword }) });
                    if (response.ok) { setUserRole("admin"); setAuthError(""); setAuthEmail(""); setAuthPassword(""); } else { setAuthError("Invalid Admin Credentials"); }
                  } catch (err) { setAuthError("Network error. Is backend running?"); }
                }} className="group w-full py-5 rounded-2xl font-black text-white text-lg bg-uiu-emerald hover:bg-emerald-600 shadow-[0_15px_30px_-10px_rgba(16,185,129,0.4)] hover:shadow-[0_20px_40px_-10px_rgba(16,185,129,0.5)] active:scale-[0.98] hover:scale-[1.02] transition-all flex items-center justify-center gap-3 overflow-hidden relative border border-emerald-400 mt-6">
                  <span className="absolute inset-0 bg-gradient-to-r from-uiu-emerald to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative z-10 flex items-center gap-2 drop-shadow-sm font-black">Authorize Access <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>
                </button>

                <div className="text-center pt-6">
                  <Link href="/admin-register" className="text-[10px] font-black text-uiu-orange hover:underline decoration-2 underline-offset-4 uppercase tracking-widest">Request Admin Access</Link>
                </div>
              </div>
            </div>
          </motion.main>
        ) : (
          <motion.main key="admin-view" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-7xl mx-auto w-full px-6 py-10 z-10 flex flex-col gap-10 pb-24">

            {/* ADMIN HEADER */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">System Command Center</h1>
                <p className="text-lg font-medium text-slate-500 mt-2 italic font-mono">Centralized Node: Controlling EcoNexus Infrastructure</p>
              </div>

              <div className="flex bg-white/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/60 shadow-sm overflow-x-auto no-scrollbar">
                {[
                  { id: "campaigns", label: "Campaigns", icon: Rocket },
                  { id: "items", label: "Academic", icon: Package },
                  { id: "public", label: "Public Resources", icon: Users },
                  { id: "users", label: "Users", icon: Users },
                  { id: "messages", label: "Messages", icon: MessageSquare },
                  { id: "settings", label: "System", icon: Settings }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm transition-all whitespace-nowrap ${activeTab === tab.id ? "bg-white text-uiu-emerald shadow-sm" : "text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                    {tab.id === "public" && publicItems.filter(i => i.status?.toLowerCase() === "pending").length > 0 && (
                      <span className="ml-1 w-5 h-5 bg-amber-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                        {publicItems.filter(i => i.status?.toLowerCase() === "pending").length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* QUICK STATS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <button
                onClick={() => setShowCampaignModal(true)}
                className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-[2rem] p-6 shadow-sm text-left hover:bg-white/90 hover:scale-[1.02] hover:shadow-lg transition-all group cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4 text-xs font-black uppercase tracking-widest text-slate-400">
                  Active Campaigns
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-uiu-emerald group-hover:bg-uiu-emerald group-hover:text-white transition-all">
                    <Rocket className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-3xl font-black text-slate-800">{campaigns.length}</h3>
                <p className="text-[9px] font-black uppercase tracking-widest text-uiu-emerald mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Click to manage →</p>
              </button>

              {[
                { label: "Pending Moderation", value: items.filter(it => it.status?.toLowerCase() === "pending").length, icon: Eye, color: "text-amber-500", bg: "bg-amber-500/10" },
                { label: "Verified Students", value: users.length, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
                { label: "Total Points", value: "98k+", icon: Zap, color: "text-purple-500", bg: "bg-purple-500/10" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-[2rem] p-6 shadow-sm">
                  <div className="flex justify-between items-start mb-4 text-xs font-black uppercase tracking-widest text-slate-400">
                    {stat.label}
                    <div className={`p-2 rounded-xl ${stat.bg} ${stat.color}`}><stat.icon className="w-4 h-4" /></div>
                  </div>
                  <h3 className="text-3xl font-black text-slate-800">{stat.value}</h3>
                </div>
              ))}
            </div>

            {/* TABBED CONTENT AREA */}
            <AnimatePresence mode="wait">
              {activeTab === "campaigns" && (
                <motion.div key="tab-campaigns" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-xl">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-3 bg-uiu-emerald rounded-2xl text-white shadow-lg shadow-emerald-500/20">{editingCampaignId ? <Edit className="w-6 h-6" /> : <PlusCircle className="w-6 h-6" />}</div>
                      <h2 className="text-2xl font-black text-slate-800">{editingCampaignId ? "Update Drive" : "Launch New Drive"}</h2>
                    </div>
                    <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
                      <input type="text" placeholder="Campaign Name" value={newCampaign.name} onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })} className="w-full px-5 py-4 rounded-2xl bg-white/80 border border-slate-100 outline-none font-bold text-slate-800 shadow-sm" />
                      <textarea placeholder="Describe the impact..." value={newCampaign.description} onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })} className="w-full px-5 py-4 rounded-2xl bg-white/80 border border-slate-100 outline-none font-bold text-slate-800 shadow-sm h-28" />
                      <div className="grid grid-cols-2 gap-6">
                        <input type="text" placeholder="Target Goal (e.g. 500)" value={newCampaign.target} onChange={(e) => setNewCampaign({ ...newCampaign, target: e.target.value })} className="w-full px-5 py-4 rounded-2xl bg-white/80 border border-slate-100 outline-none font-bold text-slate-800 shadow-sm" />
                        <div className="relative">
                          <input type="number" min="1" placeholder="Duration (days)" value={newCampaign.duration} onChange={(e) => setNewCampaign({ ...newCampaign, duration: e.target.value })} className="w-full px-5 py-4 rounded-2xl bg-white/80 border border-slate-100 outline-none font-bold text-slate-800 shadow-sm" />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-widest pointer-events-none">days</span>
                        </div>
                      </div>

                      <div className="relative">
                        <select value={newCampaign.category} onChange={(e) => setNewCampaign({ ...newCampaign, category: e.target.value })} className="w-full px-5 py-4 rounded-2xl bg-white/80 border border-slate-100 outline-none font-bold text-slate-800 shadow-sm appearance-none cursor-pointer">
                          <option value="Education">Education & Books</option>
                          <option value="Food">Food & Nutrition</option>
                          <option value="Health">Medical & Health</option>
                          <option value="Environment">Eco & Environment</option>
                          <option value="Welfare">Social Welfare</option>
                          <option value="Emergency">Emergency Relief</option>
                          <option value="General">General Contribution</option>
                        </select>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-uiu-emerald font-black text-xs">CATEGORY ▼</div>
                      </div>

                      <div className="flex items-center justify-between p-5 rounded-2xl bg-emerald-50/30 border border-emerald-100/50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-xl shadow-sm"><CreditCard className="w-5 h-5 text-uiu-emerald" /></div>
                          <div><p className="text-sm font-bold text-slate-800 leading-none mb-1">Global Giving Hub</p><p className="text-[10px] font-medium text-slate-400">Allow Global Giving Hub donations</p></div>
                        </div>
                        <button type="button" onClick={() => setNewCampaign({ ...newCampaign, sslCommerzEnabled: !newCampaign.sslCommerzEnabled })} className={`w-12 h-6 rounded-full transition-colors relative ${newCampaign.sslCommerzEnabled ? "bg-uiu-emerald" : "bg-slate-300"}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${newCampaign.sslCommerzEnabled ? "left-7" : "left-1"}`} /></button>
                      </div>

                      <div onClick={() => coverInputRef.current?.click()} className="group relative w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center gap-2 hover:border-uiu-emerald/50 hover:bg-emerald-50/30 transition-all cursor-pointer overflow-hidden" style={{ minHeight: coverPreview ? 'auto' : '8rem' }}>
                        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverSelect} />
                        {coverPreview ? (
                          <div className="relative w-full">
                            <img src={coverPreview} alt="Campaign cover" className="w-full max-h-48 object-cover rounded-2xl" />
                            <button type="button" onClick={(e) => { e.stopPropagation(); setCoverPreview(null); setNewCampaign(p => ({ ...p, image: null })); }} className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-rose-500 text-white rounded-full flex items-center justify-center transition-colors"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <><ImagePlus className="w-8 h-8 text-slate-400 group-hover:text-uiu-emerald transition-colors" /><span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-uiu-emerald">Upload Campaign Cover</span></>
                        )}
                      </div>

                      <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><QrCode className="w-3.5 h-3.5" /> Dynamic Manual QR Upload</p>
                          <button type="button" onClick={addPaymentQR} className="flex items-center gap-1.5 px-3 py-1.5 bg-uiu-emerald/10 hover:bg-uiu-emerald/20 text-uiu-emerald rounded-full text-[10px] font-black uppercase tracking-widest transition-all"><Plus className="w-3 h-3" /> Add QR</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <AnimatePresence>
                            {paymentQRs.map((qr) => (
                              <motion.div key={qr.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95, height: 0 }} className="relative p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col gap-3 group">
                                <button type="button" onClick={() => removePaymentQR(qr.id)} className="absolute top-2 right-2 w-7 h-7 bg-rose-50 text-rose-400 hover:bg-rose-500 hover:text-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20"><Trash2 className="w-3.5 h-3.5" /></button>
                                <div onClick={() => document.getElementById(`qr-input-${qr.id}`).click()} className="relative aspect-square w-full rounded-xl border-2 border-dashed border-slate-100 bg-slate-50/50 flex flex-col items-center justify-center gap-2 hover:border-uiu-emerald/30 hover:bg-emerald-50/20 transition-all cursor-pointer overflow-hidden">
                                  <input id={`qr-input-${qr.id}`} type="file" accept="image/*" className="hidden" onChange={(e) => handleQRImageSelect(qr.id, e)} />
                                  {qr.preview ? <img src={qr.preview} alt="QR Preview" className="w-full h-full object-contain" /> : <><ImagePlus className="w-6 h-6 text-slate-300" /><span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Upload QR</span></>}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <input type="text" placeholder="Provider" value={qr.provider} onChange={(e) => updatePaymentQR(qr.id, "provider", e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-800 text-[10px]" />
                                  <input type="tel" placeholder="Number" value={qr.number} onChange={(e) => updatePaymentQR(qr.id, "number", e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-800 text-[10px]" />
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><CreditCard className="w-3.5 h-3.5" /> Bank Details</p>
                          <button type="button" onClick={addBankAccount} className="flex items-center gap-1.5 px-3 py-1.5 bg-uiu-emerald/10 hover:bg-uiu-emerald/20 text-uiu-emerald rounded-full text-[10px] font-black uppercase tracking-widest transition-all"><Plus className="w-3 h-3" /> Add Bank</button>
                        </div>
                        <AnimatePresence>
                          {bankAccounts.map((bank, idx) => (
                            <motion.div key={bank.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20, height: 0 }} className="relative p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col gap-3">
                              <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">🏦 Account {idx + 1}</span>{bankAccounts.length > 1 && <button type="button" onClick={() => removeBankAccount(bank.id)} className="w-6 h-6 flex items-center justify-center rounded-full bg-rose-50 text-rose-400 hover:bg-rose-500 hover:text-white transition-all"><X className="w-3 h-3" /></button>}</div>
                              <div className="grid grid-cols-2 gap-2"><input type="text" placeholder="Bank Name" value={bank.bankName} onChange={(e) => updateBankAccount(bank.id, "bankName", e.target.value)} className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-700 text-xs" /><input type="text" placeholder="Branch" value={bank.branch} onChange={(e) => updateBankAccount(bank.id, "branch", e.target.value)} className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-700 text-xs" /></div>
                              <input type="text" placeholder="Account Holder" value={bank.accountName} onChange={(e) => updateBankAccount(bank.id, "accountName", e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-700 text-xs" />
                              <input type="text" placeholder="Account Number" value={bank.accountNumber} onChange={(e) => updateBankAccount(bank.id, "accountNumber", e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-white border border-uiu-emerald/20 outline-none font-black text-slate-800 text-sm tracking-widest" />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>

                      <div className="flex gap-4">
                        <button onClick={handleLaunch} disabled={isLaunching} className="flex-1 py-5 bg-uiu-emerald hover:bg-emerald-600 rounded-2xl text-white font-black flex items-center justify-center gap-3 shadow-xl transition-all disabled:opacity-50">
                          {isLaunching ? <div className="flex items-center gap-3"><div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /><span className="animate-pulse">Processing...</span></div> : <><Rocket className="w-6 h-6" /> {editingCampaignId ? "Update Campaign" : "Launch Campaign"}</>}
                        </button>
                        {editingCampaignId && <button onClick={resetForm} disabled={isLaunching} className="px-8 py-5 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-600 font-black flex items-center justify-center transition-all disabled:opacity-50">Cancel</button>}
                      </div>
                    </form>
                  </div>

                  <div className="space-y-6">
                    {/* BROADCAST BOX */}
                    <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-xl">
                      <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-black text-slate-800">Live Marketing Broadcast</h2>{csvFileName && <button onClick={handleClearCSV} className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-100 rounded-full hover:bg-rose-100 transition-colors group"><CheckCircle className="w-3 h-3 text-uiu-emerald" /><span className="text-[10px] font-bold text-slate-600 max-w-[120px] truncate">{csvFileName}</span><X className="w-3 h-3 text-rose-400 group-hover:text-rose-600 transition-colors" /></button>}</div>
                      <input ref={csvInputRef} type="file" className="hidden" accept=".csv" onChange={handleCSVUpload} />
                      {!csvFileName ? (
                        <div onClick={() => csvInputRef.current?.click()} className="group relative w-full h-32 mb-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center gap-2 hover:border-uiu-emerald/50 hover:bg-emerald-50/30 transition-all cursor-pointer overflow-hidden"><UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-uiu-emerald" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Upload Student CSV</p></div>
                      ) : (
                        <div className="mb-6 rounded-2xl overflow-hidden border border-emerald-100/60 bg-white/40 backdrop-blur-md shadow-sm">
                          <div className="px-5 py-3 bg-emerald-50/80 border-b border-emerald-100/50 flex justify-between"><p className="text-[11px] font-black text-emerald-700">Parsed {csvRecords.length} records</p></div>
                          <div className="max-h-40 overflow-y-auto no-scrollbar"><table className="w-full text-left"><thead className="bg-white/70"><tr><th className="px-4 py-2 text-[9px] font-black uppercase text-slate-400">Name</th><th className="px-4 py-2 text-[9px] font-black uppercase text-slate-400">Email</th></tr></thead><tbody>{csvRecords.map((r, i) => (<tr key={i} className="border-t border-slate-50"><td className="px-4 py-2 text-[10px] font-bold text-slate-600">{r.name}</td><td className="px-4 py-2 text-[10px] text-slate-400">{r.email}</td></tr>))}</tbody></table></div>
                        </div>
                      )}
                      <textarea value={smsPreview} onChange={(e) => setSmsPreview(e.target.value)} className="w-full p-4 bg-white/50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-600 h-24 outline-none mb-4" placeholder="Draft your broadcast message..." />
                      <div className="grid grid-cols-2 gap-4">
                        <button onClick={handleBroadcastEmail} disabled={isBroadcastingEmail} className="py-4 bg-uiu-emerald text-white rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">{isBroadcastingEmail ? "Sending..." : "Email Broadcast"}</button>
                        <button onClick={handleBroadcastSms} disabled={isBroadcastingSms} className="py-4 bg-uiu-orange text-white rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">{isBroadcastingSms ? "Sending..." : "SMS Broadcast"}</button>
                      </div>
                    </div>

                    {/* LOGS */}
                    <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-xl">
                      <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-black text-slate-800">Broadcast Logs</h2><button onClick={refreshData} className="text-[10px] font-black text-uiu-emerald">Refresh</button></div>
                      <div className="overflow-hidden rounded-2xl border border-slate-100">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50/50 text-[9px] font-black uppercase text-slate-400"><tr><th className="px-5 py-3">Message</th><th className="px-5 py-3">Stats</th></tr></thead>
                          <tbody className="divide-y divide-slate-50">
                            {broadcastHistory.slice(0, 5).map((h) => (
                              <tr key={h.id} className="hover:bg-slate-50/50 transition-colors"><td className="px-5 py-4"><p className="text-[10px] font-bold text-slate-800 line-clamp-1">{h.message}</p></td><td className="px-5 py-4"><span className="text-[10px] font-black text-uiu-emerald">{h.successfulDeliveries}/{h.totalRecipients}</span></td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* APPROVALS */}
                    <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-xl">
                      <h2 className="text-xl font-black text-slate-800 mb-6">Pending Moderation</h2>
                      <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar">
                        {items.filter(it => it.status?.toLowerCase() === "pending").map((it) => (
                          <div key={it._uniqueId} className="p-4 rounded-2xl bg-white/40 border border-white flex items-center justify-between group shadow-sm">
                            <div className="flex-1 min-w-0 pr-4">
                              <p className="text-sm font-black text-slate-800 truncate">{it.title}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{it.postedBy || it.postedByEmail || "User"}</p>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setSelectedItemForReview(it)}
                                className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleItemAction(it, "Approved")} 
                                className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleItemAction(it, "Rejected")} 
                                className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {items.filter(it => it.status?.toLowerCase() === "pending").length === 0 && (
                          <div className="py-10 text-center text-slate-400 font-bold text-sm">No items waiting for approval.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "items" && (
                <motion.div key="tab-items" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-xl">
                  <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3"><Package className="w-7 h-7 text-amber-500" /> Academic Moderation</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Title</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">User</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Status</th>
                          <th className="pb-4 text-right px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {items.filter(it => it.type === "academic").map((item) => (
                          <tr key={item._uniqueId} className="hover:bg-slate-50/50">
                            <td className="py-5 px-4 font-bold text-slate-800">{item.title}</td>
                            <td className="py-5 px-4 text-sm text-slate-500">{item.postedBy}</td>
                            <td className="py-5 px-4">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${item.status === "Approved" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="py-5 px-4 text-right flex justify-end gap-2">
                              <button onClick={() => setSelectedItemForReview(item)} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Eye className="w-4 h-4" /></button>
                              <button onClick={() => handleItemAction(item, "Approved")} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Check className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteItem(item.id)} className="p-2 bg-rose-50 text-rose-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === "public" && (
                <motion.div key="tab-public" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-xl">
                  <h2 className="text-2xl font-black text-slate-800 mb-8">Public Resource Moderation</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="pb-4 px-4 text-[10px] font-black uppercase text-slate-400">Resource</th>
                          <th className="pb-4 px-4 text-[10px] font-black uppercase text-slate-400">Status</th>
                          <th className="pb-4 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {publicItems.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="py-5 px-4 font-black text-slate-800">{item.title}</td>
                            <td className="py-5 px-4">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${item.status === "Approved" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="py-5 px-4 text-right flex justify-end gap-2">
                              <button onClick={() => setSelectedItemForReview(item)} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Eye className="w-4 h-4" /></button>
                              <button onClick={() => handleItemAction(item, "Approved")} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Check className="w-4 h-4" /></button>
                              <button onClick={() => handleDeletePublicResource(item.id)} className="p-2 bg-rose-50 text-rose-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === "users" && (
                <motion.div key="tab-users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-xl">
                  <h2 className="text-2xl font-black text-slate-800 mb-8">User Directory</h2>
                  <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="border-b border-slate-100"><th className="pb-4 px-4 text-[10px] font-black uppercase text-slate-400">Student</th><th className="pb-4 px-4 text-[10px] font-black uppercase text-slate-400">Status</th><th className="pb-4 px-4 text-right">Access</th></tr></thead><tbody className="divide-y divide-slate-50">{users.map((u) => (<tr key={u.id} className="hover:bg-slate-50/50"><td className="py-5 px-4 font-bold text-slate-800">{u.name}</td><td className="py-5 px-4 font-black text-emerald-600">🪙 {u.points}</td><td className="py-5 px-4 text-right"><button onClick={() => handleUserStatus(u.id, u.status === "Active" ? "Blocked" : "Active")} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${u.status === "Active" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>{u.status === "Active" ? "Block" : "Unblock"}</button></td></tr>))}</tbody></table></div>
                </motion.div>
              )}

              {activeTab === "messages" && (
                <motion.div key="tab-messages" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-xl">
                  <h2 className="text-2xl font-black text-slate-800 mb-2 flex items-center gap-3">
                    <MessageSquare className="w-7 h-7 text-blue-500" /> User Inbox
                  </h2>
                  <p className="text-xs text-slate-400 font-bold mb-8">Messages sent to admin via "Chat with Organizer"</p>

                  <AdminInbox />
                </motion.div>
              )}

              {activeTab === "settings" && (
                <motion.div key="tab-settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-xl">
                    <h2 className="text-xl font-black text-slate-800 mb-6">Platform Security</h2>
                    <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl">
                      <div><p className="font-bold text-slate-800 text-sm">Maintenance Mode</p></div>
                      <button onClick={() => handleUpdateSettings("maintenanceMode", !settings.maintenanceMode)} className={`w-12 h-6 rounded-full relative transition-colors ${settings.maintenanceMode ? "bg-rose-500" : "bg-slate-300"}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.maintenanceMode ? "left-7" : "left-1"}`} /></button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.main>
        )}
      </AnimatePresence>

      {/* CAMPAIGN MODAL */}
      <AnimatePresence>
        {showCampaignModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCampaignModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl bg-white border rounded-[2.5rem] shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center"><h2 className="text-xl font-black text-slate-800">Active Drives</h2><button onClick={() => setShowCampaignModal(false)} className="p-2 text-slate-400 hover:text-rose-500"><X className="w-6 h-6" /></button></div>
              <div className="p-8 flex flex-col gap-4 max-h-[50vh] overflow-y-auto no-scrollbar">
                {campaigns.map((c) => (
                  <div key={c._uniqueId} className="p-5 bg-slate-50 border rounded-2xl flex justify-between items-center">
                    <div><p className="font-black text-slate-800">{c.title}</p><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{c.collected}/{c.goal} Items • {c.daysLeft} days left</p></div>
                    <div className="flex gap-2"><button onClick={() => handleEditCampaign(c)} className="p-2 bg-white text-slate-400 rounded-lg hover:text-emerald-500 transition-colors"><Edit className="w-4 h-4" /></button><button onClick={() => handleDeleteCampaign(c.id)} className="p-2 bg-white text-slate-400 rounded-lg hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button></div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* RESOURCE REVIEW MODAL */}
      <AnimatePresence>
        {selectedItemForReview && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={() => setSelectedItemForReview(null)} 
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }} 
              onClick={(e) => e.stopPropagation()} 
              className="w-full max-w-2xl bg-white border rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-xl font-black text-slate-800">Resource Review</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Inspecting: {selectedItemForReview.title}</p>
                </div>
                <button onClick={() => setSelectedItemForReview(null)} className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-rose-500 rounded-2xl transition-all shadow-sm"><X className="w-6 h-6" /></button>
              </div>

              <div className="p-8 overflow-y-auto no-scrollbar flex flex-col gap-8">
                {/* PREVIEW IMAGE/FILE */}
                {(selectedItemForReview.image || selectedItemForReview.downloadUrl || selectedItemForReview.fileUrl) ? (
                  <div className="w-full aspect-video rounded-3xl bg-slate-100 border border-slate-200 overflow-hidden relative group">
                    {selectedItemForReview.image ? (
                      <img 
                        src={selectedItemForReview.image.startsWith('http') || selectedItemForReview.image.startsWith('data:') 
                          ? selectedItemForReview.image 
                          : `data:image/png;base64,${selectedItemForReview.image}`} 
                        alt="Preview" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                        <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center">
                          <FileText className="w-10 h-10 text-blue-500" />
                        </div>
                        <p className="text-sm font-black text-slate-600">Document/File Resource</p>
                      </div>
                    )}
                    
                    {(selectedItemForReview.downloadUrl || selectedItemForReview.fileUrl) && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <a 
                          href={selectedItemForReview.downloadUrl || selectedItemForReview.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-8 py-3 bg-white text-blue-600 font-black rounded-full flex items-center gap-2 hover:scale-105 transition-all shadow-xl"
                        >
                          <DownloadCloud className="w-5 h-5" /> Download / View File
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-32 rounded-3xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Media Preview Available</p>
                  </div>
                )}

                {/* DETAILS GRID */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Title</p>
                    <p className="text-lg font-black text-slate-800">{selectedItemForReview.title}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Posted By</p>
                    <p className="text-lg font-bold text-slate-700">{selectedItemForReview.postedBy || selectedItemForReview.postedByEmail || "Unknown"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category / Subject</p>
                    <p className="text-sm font-black text-uiu-emerald bg-emerald-50 px-3 py-1 rounded-full w-max">{selectedItemForReview.category || selectedItemForReview.subject || "N/A"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Condition</p>
                    <p className="text-sm font-black text-uiu-orange bg-orange-50 px-3 py-1 rounded-full w-max">{selectedItemForReview.condition || selectedItemForReview.conditionInfo || "N/A"}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</p>
                  <div className="text-sm text-slate-600 leading-relaxed font-medium bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                    {selectedItemForReview.description || "No description provided."}
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 flex gap-4 bg-slate-50/50">
                <button 
                  onClick={() => { handleItemAction(selectedItemForReview, "Approved"); setSelectedItemForReview(null); }}
                  className="flex-1 py-4 bg-uiu-emerald hover:bg-emerald-600 text-white font-black rounded-2xl shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" /> Approve Resource
                </button>
                <button 
                  onClick={() => { handleItemAction(selectedItemForReview, "Rejected"); setSelectedItemForReview(null); }}
                  className="flex-1 py-4 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl shadow-lg shadow-rose-100 transition-all flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5" /> Reject Resource
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
