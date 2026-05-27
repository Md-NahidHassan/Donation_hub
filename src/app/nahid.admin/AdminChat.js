"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, User, Search, MessageSquare,
  Smile, Paperclip, Mic, X, Square, Download, Trash2, Heart, Image as ImageIcon, File as FileIcon, ChevronLeft, ExternalLink
} from "lucide-react";
import { db, serverTimestamp } from "@/utils/firebase";
import {
  collection, addDoc, query, orderBy,
  onSnapshot, doc, where, setDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove
} from "firebase/firestore";

export default function AdminChat({ currentUser }) {
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const [hoveredMessage, setHoveredMessage] = useState(null);

  const commonEmojis = ["😊", "😂", "❤️", "👍", "🙌", "🔥", "🙏", "😮", "😢", "🎉", "✨", "🤝"];
  const reactionOptions = ["❤️", "😂", "😮", "😢", "🔥", "👍"];

  // Cloudinary Config
  const CLOUDINARY_CLOUD_NAME = "dkltd8juu";
  const CLOUDINARY_UPLOAD_PRESET = "ml_default";

  // 1. Load Rooms involving ECO_ADMIN
  useEffect(() => {
    const q = query(
      collection(db, "chatRooms"),
      where("participants", "array-contains", "ECO_ADMIN")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      convs.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
      setConversations(convs);
    });
    return () => unsubscribe();
  }, []);

  // 2. Load Messages for active chat
  useEffect(() => {
    if (!activeChat?.id) return;
    const q = query(collection(db, "chatRooms", activeChat.id, "messages"), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => unsubscribe();
  }, [activeChat?.id]);

  // 3. Mark as Read
  useEffect(() => {
    if (!activeChat?.id) return;
    const roomRef = doc(db, "chatRooms", activeChat.id);
    const room = conversations.find(c => c.id === activeChat.id);
    if (room?.unreadBy?.includes("ECO_ADMIN")) {
      updateDoc(roomRef, { unreadBy: arrayRemove("ECO_ADMIN") });
    }
  }, [activeChat?.id, conversations]);

  const handleSendMessage = async (payload) => {
    if (!activeChat) return;
    const myId = "ECO_ADMIN";
    const myName = "EcoNexus Admin";
    const roomId = activeChat.id;
    try {
      await addDoc(collection(db, "chatRooms", roomId, "messages"), {
        ...payload,
        senderId: myId,
        receiverId: activeChat.receiverId,
        timestamp: serverTimestamp(),
        reactions: {}
      });
      const roomRef = doc(db, "chatRooms", roomId);
      await updateDoc(roomRef, {
        lastMessage: payload.type === 'text' ? payload.text : `Sent a ${payload.type}`,
        lastSender: myId,
        updatedAt: serverTimestamp(),
        unreadBy: [activeChat.receiverId]
      });
    } catch (err) { console.error(err); }
  };

  const deleteMessage = async (msgId) => {
    if (!activeChat?.id || !confirm("Delete this message?")) return;
    try {
      await deleteDoc(doc(db, "chatRooms", activeChat.id, "messages", msgId));
    } catch (err) { console.error(err); }
  };

  const reactToMessage = async (msgId, reaction) => {
    if (!activeChat?.id) return;
    const myId = "ECO_ADMIN";
    const msgRef = doc(db, "chatRooms", activeChat.id, "messages", msgId);
    const msg = messages.find(m => m.id === msgId);
    const users = msg.reactions?.[reaction] || [];

    if (users.includes(myId)) {
      await updateDoc(msgRef, { [`reactions.${reaction}`]: arrayRemove(myId) });
    } else {
      await updateDoc(msgRef, { [`reactions.${reaction}`]: arrayUnion(myId) });
    }
  };

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
    if (!file || !activeChat) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      await handleSendMessage({ type, fileUrl: url, fileName: file.name, text: type === 'image' ? "Sent an image" : `Shared a file: ${file.name}` });
    } catch (err) { alert("Upload Failed. Check 'ml_default' preset."); }
    finally { setUploading(false); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        if (audioBlob.size > 100) {
          setUploading(true);
          try {
            const url = await uploadToCloudinary(audioBlob);
            await handleSendMessage({ type: 'audio', fileUrl: url, text: "Sent a voice message" });
          } catch (err) { console.error(err); }
          finally { setUploading(false); }
        }
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) { alert("Mic error: " + err.message); }
  };

  return (
    <div className="flex h-[750px] bg-white rounded-[2.5rem] shadow-2xl border border-white overflow-hidden relative">
      {/* SIDEBAR */}
      <div className={`w-full md:w-[350px] border-r border-slate-100 flex flex-col ${activeChat ? "hidden md:flex" : "flex"}`}>
        <div className="p-6 border-b border-slate-50 bg-slate-50/30">
          <h3 className="font-black text-slate-800 flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-uiu-emerald" /> Admin Support Hub
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input type="text" placeholder="Search user chats..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {conversations.map(conv => {
            const otherUser = conv.participantDetails?.find(p => p.id !== "ECO_ADMIN");
            const isUnread = conv.unreadBy?.includes("ECO_ADMIN");
            return (
              <button
                key={conv.id}
                onClick={() => setActiveChat({ id: conv.id, receiverId: otherUser?.id, receiverName: otherUser?.name })}
                className={`w-full p-5 flex items-center gap-4 border-b border-slate-50 transition-all ${activeChat?.id === conv.id ? "bg-emerald-50/50" : "hover:bg-slate-50"}`}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-uiu-emerald border border-slate-100 shadow-sm"><User className="w-6 h-6" /></div>
                  {isUnread && <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white animate-pulse" />}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <h4 className="font-black text-slate-800 text-sm truncate">{otherUser?.name || "User"}</h4>
                  <p className={`text-[10px] truncate ${isUnread ? "font-black text-slate-900" : "text-slate-400"}`}>{conv.lastMessage || "No messages"}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CHAT AREA */}
      <div className={`flex-1 flex flex-col bg-[#fafafa] ${!activeChat ? "hidden md:flex" : "flex"}`}>
        {activeChat ? (
          <>
            <header className="p-5 border-b border-slate-100 bg-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveChat(null)} className="md:hidden p-2 text-slate-400"><ChevronLeft className="w-5 h-5" /></button>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-uiu-emerald"><User className="w-5 h-5" /></div>
                <div>
                  <h4 className="font-black text-slate-800">{activeChat.receiverName}</h4>
                  <p className="text-[10px] font-black text-uiu-emerald uppercase tracking-widest">ECO SUPPORT ACTIVE</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {uploading && <div className="w-4 h-4 border-2 border-uiu-emerald border-t-transparent rounded-full animate-spin" />}
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar bg-[#fafbfb]">
              {messages.map((msg, i) => {
                const isMine = msg.senderId === "ECO_ADMIN";
                const reactions = msg.reactions || {};
                const hasReactions = Object.values(reactions).some(u => u.length > 0);

                return (
                  <div
                    key={msg.id || i}
                    className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}
                    onMouseEnter={() => setHoveredMessage(msg.id)}
                    onMouseLeave={() => setHoveredMessage(null)}
                  >
                    <div className="relative group max-w-[80%]">
                      {/* ADMIN REACTION/DELETE OVERLAY */}
                      <AnimatePresence>
                        {hoveredMessage === msg.id && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`absolute bottom-full mb-2 flex items-center gap-1 p-1 bg-white rounded-full shadow-lg border border-slate-100 z-10 ${isMine ? "right-0" : "left-0"}`}>
                            {reactionOptions.map(r => <button key={r} onClick={() => reactToMessage(msg.id, r)} className="w-7 h-7 hover:scale-125 transition-all text-sm">{r}</button>)}
                            {isMine && <button onClick={() => deleteMessage(msg.id)} className="w-7 h-7 text-rose-500 hover:bg-rose-50 rounded-full transition-all ml-1"><Trash2 className="w-3.5 h-3.5" /></button>}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div onDoubleClick={() => reactToMessage(msg.id, "❤️")} className={`p-4 rounded-2xl text-sm relative transition-all ${isMine ? "bg-uiu-emerald text-white rounded-tr-none shadow-emerald-100" : "bg-white text-slate-700 rounded-tl-none border border-slate-100"}`}>
                        {msg.type === 'text' && msg.text}
                        {msg.type === 'image' && <img src={msg.fileUrl} className="max-w-full rounded-xl cursor-pointer" onClick={() => window.open(msg.fileUrl)} />}
                        {msg.type === 'file' && (
                          <a href={msg.fileUrl} target="_blank" className="flex items-center gap-3 bg-black/5 p-3 rounded-2xl">
                            <FileIcon className="w-5 h-5 text-uiu-emerald" />
                            <p className="text-xs font-black truncate max-w-[100px]">{msg.fileName || "File"}</p>
                            <Download className="w-3 h-3" />
                          </a>
                        )}
                        {msg.type === 'audio' && <audio src={msg.fileUrl} controls className="h-8 max-w-[200px]" />}

                        {/* REACTION DISPLAY */}
                        {hasReactions && (
                          <div className={`absolute -bottom-3 flex items-center gap-0.5 bg-white border border-slate-100 rounded-full px-2 py-0.5 shadow-sm ${isMine ? "left-0" : "right-0"}`}>
                            {Object.entries(reactions).map(([r, users]) => users.length > 0 && <span key={r} className="text-[9px] flex items-center gap-1"><span>{r}</span>{users.length > 1 && <span>{users.length}</span>}</span>)}
                          </div>
                        )}
                      </div>
                      <p className={`text-[8px] font-black uppercase text-slate-300 mt-2 px-1 ${isMine ? "text-right" : "text-left"}`}>{msg.timestamp?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || "Just now"}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            <footer className="p-5 bg-white border-t border-slate-100 relative">
              {isRecording && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-between px-8">
                  <div className="flex items-center gap-3 text-rose-500 font-black animate-pulse"><div className="w-2 h-2 bg-rose-500 rounded-full" /> ADMIN RECORDING...</div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsRecording(false)} className="p-3 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 transition-all"><X className="w-4 h-4" /></button>
                    <button onClick={() => { if (mediaRecorder) mediaRecorder.stop(); setIsRecording(false); }} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"><Square className="w-4 h-4" /></button>
                  </div>
                </div>
              )}

              {showEmojis && (
                <div className="absolute bottom-full left-4 mb-4 p-4 bg-white rounded-3xl shadow-2xl border border-slate-100 grid grid-cols-6 gap-2 z-50">
                  {commonEmojis.map(e => <button key={e} type="button" onClick={() => { setNewMessage(prev => prev + e); setShowEmojis(false); }} className="text-2xl p-2 hover:scale-125 transition-all">{e}</button>)}
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); if (newMessage.trim()) { handleSendMessage({ type: 'text', text: newMessage }); setNewMessage(""); } }} className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <label className="p-3 text-slate-400 cursor-pointer hover:bg-slate-50 rounded-xl transition-all"><input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} /><ImageIcon className="w-5 h-5" /></label>
                  <label className="p-3 text-slate-400 cursor-pointer hover:bg-slate-50 rounded-xl transition-all"><input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'file')} /><Paperclip className="w-5 h-5" /></label>
                </div>
                <div className="flex-1 relative">
                  <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Send a reply as EcoNexus Admin..." className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-uiu-emerald transition-all" />
                  <button type="button" onClick={() => setShowEmojis(!showEmojis)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400"><Smile className="w-5 h-5" /></button>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={startRecording} className="p-3 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 transition-all"><Mic className="w-5 h-5" /></button>
                  <button type="submit" disabled={!newMessage.trim() || uploading} className="p-3 bg-uiu-emerald text-white rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-95"><Send className="w-5 h-5" /></button>
                </div>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 space-y-4">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200"><MessageSquare className="w-12 h-12" /></div>
            <h3 className="text-xl font-black text-slate-300 uppercase tracking-tighter">Support Command Center</h3>
            <p className="text-xs font-bold text-slate-400 max-w-xs">Select a user conversation from the inbox to provide real-time assistance.</p>
          </div>
        )}
      </div>
    </div>
  );
}
