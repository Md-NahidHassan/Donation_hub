"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, User, ArrowLeft, Search, MoreVertical, 
  Smile, Paperclip, Phone, Video, Info, Circle,
  ChevronLeft, MessageCircle, ShieldCheck, Image as ImageIcon,
  File as FileIcon, Mic, X, Play, Square, Download, Trash2, Heart
} from "lucide-react";
import Link from "next/link";
import { db, serverTimestamp } from "@/utils/firebase";
import { 
  collection, addDoc, query, orderBy, 
  onSnapshot, doc, getDocs, limit, where, setDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove 
} from "firebase/firestore";

function ChatContent() {
  const searchParams = useSearchParams();
  const initialReceiver = searchParams.get("receiver");
  const initialReceiverId = searchParams.get("receiverId");
  const initialReceiverEmail = searchParams.get("receiverEmail");
  const initialItem = searchParams.get("item");
  const refSource = searchParams.get("ref"); // "admin" = came from admin panel

  const [currentUser, setCurrentUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef(null);
  
  // UI Customization States
  const [sidebarWidth, setSidebarWidth] = useState(320); // Default width
  const [chatScale, setChatScale] = useState(1.0); // 1.0 to 1.5
  const isResizing = useRef(false);

  // Cloudinary Config
  const CLOUDINARY_CLOUD_NAME = "dkltd8juu";
  const CLOUDINARY_UPLOAD_PRESET = "ml_default";

  // Media & Interaction States
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const commonEmojis = ["😊", "😂", "❤️", "👍", "🙌", "🔥", "🙏", "😮", "😢", "🎉", "✨", "🤝"];
  const reactionOptions = ["❤️", "😂", "😮", "😢", "🔥", "👍"];

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
        const u = JSON.parse(userStr);
        setCurrentUser(u);
    }
  }, []);

  const getRoomId = (uid1, uid2) => {
    return [uid1, uid2].sort().join("_");
  };

  useEffect(() => {
    if (!currentUser) return;
    const receiverId = initialReceiverId || initialReceiverEmail;
    const myId = currentUser.firebaseUid || currentUser.email;
    if (!receiverId) return;
    const roomId = getRoomId(myId, receiverId);
    setActiveChat({
        id: roomId,
        receiverName: initialReceiver,
        receiverId: receiverId,
        item: initialItem
    });
    
    if (initialItem) {
      setNewMessage(`[Reference Post: ${initialItem}]\nHello, I am interested in this item!`);
    }
  }, [currentUser, initialReceiverId, initialReceiverEmail, initialReceiver, initialItem]);

  useEffect(() => {
    if (!activeChat?.id) return;
    const q = query(
      collection(db, "chatRooms", activeChat.id, "messages"),
      orderBy("timestamp", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });
    return () => unsubscribe();
  }, [activeChat?.id]);

  useEffect(() => {
    if (!currentUser) return;
    const myId = currentUser.firebaseUid || currentUser.email;
    const isAdmin = currentUser.userType === 'ADMIN' || currentUser.role === 'admin';
    
    // If admin, see rooms where I'm a participant OR rooms directed to ECO_ADMIN
    const q = isAdmin 
      ? query(collection(db, "chatRooms"), where("participants", "array-contains-any", [myId, "ECO_ADMIN"]))
      : query(collection(db, "chatRooms"), where("participants", "array-contains", myId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      convs.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
      setConversations(convs);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const startResizing = (e) => {
    isResizing.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", stopResizing);
  };

  const handleMouseMove = (e) => {
    if (!isResizing.current) return;
    const newWidth = Math.max(260, Math.min(600, e.clientX));
    setSidebarWidth(newWidth);
  };

  const stopResizing = () => {
    isResizing.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", stopResizing);
  };

  useEffect(() => {
    if (!activeChat?.id || !currentUser) return;
    const myId = currentUser.firebaseUid || currentUser.email;
    const roomRef = doc(db, "chatRooms", activeChat.id);
    const room = conversations.find(c => c.id === activeChat.id);
    if (room?.unreadBy?.includes(myId)) {
        setDoc(roomRef, { unreadBy: room.unreadBy.filter(id => id !== myId) }, { merge: true });
    }
  }, [activeChat?.id, currentUser, conversations]);

  const handleSendMessage = async (payload) => {
    if (!currentUser || !activeChat) return;
    const myId = currentUser.firebaseUid || currentUser.email;
    const myName = currentUser.fullName || currentUser.name || "User";
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
        await setDoc(roomRef, {
            participants: [myId, activeChat.receiverId],
            lastMessage: payload.type === 'text' ? payload.text : `Sent a ${payload.type}`,
            lastSender: myId,
            updatedAt: serverTimestamp(),
            unreadBy: [activeChat.receiverId],
            participantDetails: [
                { id: myId, name: myName },
                { id: activeChat.receiverId, name: activeChat.receiverName || "User" }
            ]
        }, { merge: true });

        // ── Notify admin via backend when message is sent to ECO_ADMIN ────────────
        const isToAdmin = activeChat.receiverId === 'ECO_ADMIN' ||
          activeChat.receiverEmail?.toLowerCase().includes('admin');
        if (isToAdmin && payload.type === 'text') {
          const msgPreview = payload.text.substring(0, 120);
          const notifBody = `New message from ${myName} (${currentUser.email || myId}):\n"${msgPreview}"\n\nReply at: localhost:3000/chat`;
          // Try backend SMS notification (non-blocking)
          fetch('http://localhost:8080/api/admin/broadcast/sms-single', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: notifBody, phone: 'ADMIN' })
          }).catch(() => {});
          // Also try email notification
          fetch('http://localhost:8080/api/admin/notify-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              senderName: myName,
              senderEmail: currentUser.email || myId,
              message: msgPreview,
              campaignRef: activeChat.item || ''
            })
          }).catch(() => {});
        }
    } catch (err) { console.error(err); }
  };

  const deleteMessage = async (msgId) => {
    if (!activeChat?.id || !confirm("Delete this message for everyone?")) return;
    try {
        await deleteDoc(doc(db, "chatRooms", activeChat.id, "messages", msgId));
    } catch (err) { alert("Delete failed: " + err.message); }
  };

  const deleteChat = async () => {
    if (!activeChat?.id || !confirm("Delete this entire conversation?")) return;
    try {
        await deleteDoc(doc(db, "chatRooms", activeChat.id));
        setActiveChat(null);
    } catch (err) { alert("Delete failed: " + err.message); }
  };

  const reactToMessage = async (msgId, reaction) => {
    if (!activeChat?.id || !currentUser) return;
    const myId = currentUser.firebaseUid || currentUser.email;
    const msgRef = doc(db, "chatRooms", activeChat.id, "messages", msgId);
    
    // Find if I already reacted with this
    const msg = messages.find(m => m.id === msgId);
    const existingReactions = msg.reactions || {};
    const users = existingReactions[reaction] || [];
    
    if (users.includes(myId)) {
        // Remove reaction
        await updateDoc(msgRef, {
            [`reactions.${reaction}`]: arrayRemove(myId)
        });
    } else {
        // Add reaction
        await updateDoc(msgRef, {
            [`reactions.${reaction}`]: arrayUnion(myId)
        });
    }
  };

  const sendTextMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || uploading) return;
    handleSendMessage({ type: 'text', text: newMessage });
    setNewMessage("");
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

  if (!currentUser) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="flex h-screen bg-[#fafbfb] overflow-hidden select-none" style={{ fontSize: `${16 * chatScale}px` }}>
      <aside 
        style={{ width: `${sidebarWidth}px` }}
        className={`bg-white border-r border-slate-200 flex-col transition-colors relative ${activeChat ? "hidden md:flex" : "flex w-full md:w-auto"}`}
      >
        <div 
          onMouseDown={startResizing}
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-uiu-emerald/30 transition-colors z-20 hidden md:block" 
        />

        <div className="p-6 border-b border-slate-50">
          <div className="flex items-center justify-between mb-6">
            <Link href={refSource === 'admin' ? '/nahid.admin' : '/dashboard'} className="flex items-center gap-2 text-uiu-emerald font-black text-xl">
              <ArrowLeft className="w-5 h-5" /> {refSource === 'admin' ? 'Admin Panel' : 'Chat'}
            </Link>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 overflow-hidden shadow-sm">
               {currentUser.image ? <img src={currentUser.image} className="w-full h-full object-cover" /> : <User className="w-6 h-6" />}
            </div>
          </div>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-uiu-emerald transition-colors" />
            <input type="text" placeholder="Search conversations..." className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {conversations.map((conv) => {
            const myId = currentUser.firebaseUid || currentUser.email;
            const receiverId = conv.participants?.find(id => id !== myId);
            const receiverName = conv.participantDetails?.find(n => n.id !== myId)?.name || "User";
            const isUnread = conv.unreadBy?.includes(myId);
            return (
              <button 
                key={conv.id} 
                onClick={() => setActiveChat({ id: conv.id, receiverName: receiverName, receiverId: receiverId, item: conv.item })} 
                className={`w-full p-6 flex items-center gap-4 transition-all border-b border-slate-50 ${activeChat?.id === conv.id ? "bg-emerald-50/50 border-r-4 border-r-uiu-emerald" : "hover:bg-slate-50"}`}
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-uiu-emerald border border-uiu-emerald/20 shadow-sm transition-transform active:scale-95">
                    <User className="w-7 h-7" />
                  </div>
                  {isUnread && <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse shadow-md" />}
                </div>
                <div className="flex-1 text-left min-w-0">
                   <div className="flex justify-between items-center mb-1">
                     <h4 className="font-black text-slate-800 truncate" style={{ fontSize: `${chatScale * 0.9}rem` }}>{receiverName}</h4>
                     {conv.updatedAt && <span className="text-[10px] font-black text-slate-300">{new Date(conv.updatedAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                   </div>
                   <p className={`truncate leading-tight ${isUnread ? "font-black text-slate-900" : "font-bold text-slate-400"}`} style={{ fontSize: `${chatScale * 0.75}rem` }}>{conv.lastMessage || "Start chat..."}</p>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <main className={`flex-1 flex flex-col bg-white transition-all ${!activeChat ? "hidden md:flex" : "flex"}`}>
        {activeChat ? (
          <>
            <header className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-white/90 backdrop-blur-md sticky top-0 z-10 shadow-sm">
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveChat(null)} className="md:hidden p-2 text-slate-400 hover:text-uiu-emerald transition-colors"><ChevronLeft className="w-7 h-7" /></button>
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-[1.5rem] bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 shadow-sm transition-transform active:scale-95"><User className="w-6 h-6 md:w-8 md:h-8" /></div>
                <div>
                  <h3 className="font-black text-slate-800 tracking-tight" style={{ fontSize: `${1.2 * chatScale}rem` }}>{activeChat.receiverName}</h3>
                  <div className="flex items-center gap-2 mt-0.5"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /><span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Active Now</span></div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {/* SCALING CONTROLS */}
                <div className="hidden lg:flex items-center gap-3 bg-slate-100 px-4 py-2.5 rounded-2xl border border-slate-200 shadow-inner">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Display Size</span>
                  <input 
                    type="range" min="1.0" max="1.5" step="0.05" 
                    value={chatScale} 
                    onChange={(e) => setChatScale(parseFloat(e.target.value))}
                    className="w-24 accent-uiu-emerald cursor-pointer"
                  />
                  <span className="text-[10px] font-black text-uiu-emerald">{Math.round(chatScale * 100)}%</span>
                </div>

                <div className="flex items-center gap-2">
                  {uploading && <div className="w-6 h-6 border-3 border-uiu-emerald border-t-transparent rounded-full animate-spin mr-2" />}
                  <button className="p-3.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-2xl transition-all shadow-sm"><Phone className="w-6 h-6" /></button>
                  <button className="p-3.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-2xl transition-all shadow-sm"><Video className="w-6 h-6" /></button>
                  <button onClick={deleteChat} className="p-3.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 rounded-2xl transition-all shadow-sm" title="Delete Conversation"><Trash2 className="w-6 h-6" /></button>
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 no-scrollbar bg-[#fafbfb]">
              {messages.map((msg, i) => {
                const myId = currentUser.firebaseUid || currentUser.email;
                const isMine = msg.senderId === myId;
                const reactions = msg.reactions || {};
                const hasReactions = Object.values(reactions).some(u => u.length > 0);

                return (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    key={msg.id || i} 
                    className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}
                    onMouseEnter={() => setHoveredMessage(msg.id)}
                    onMouseLeave={() => setHoveredMessage(null)}
                  >
                    <div className="relative group max-w-[80%] md:max-w-[70%]">
                       {/* REACTION PICKER (Hover) */}
                       <AnimatePresence>
                         {hoveredMessage === msg.id && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className={`absolute bottom-full mb-2 flex items-center gap-1 p-1.5 bg-white rounded-full shadow-xl border border-slate-100 z-20 ${isMine ? "right-0" : "left-0"}`}
                            >
                                {reactionOptions.map(r => (
                                    <button key={r} onClick={() => reactToMessage(msg.id, r)} className="w-8 h-8 flex items-center justify-center hover:scale-125 transition-all text-lg">{r}</button>
                                ))}
                                {isMine && (
                                    <button onClick={() => deleteMessage(msg.id)} className="w-8 h-8 flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-full transition-all ml-1"><Trash2 className="w-4 h-4" /></button>
                                )}
                            </motion.div>
                         )}
                       </AnimatePresence>

                       <div 
                         onDoubleClick={() => reactToMessage(msg.id, "❤️")}
                         style={{ padding: `${chatScale * 1}rem ${chatScale * 1.2}rem` }}
                         className={`rounded-[2rem] shadow-sm relative group-hover:shadow-md transition-all font-bold ${isMine ? "bg-uiu-emerald text-white rounded-tr-none" : "bg-white text-slate-700 rounded-tl-none border border-slate-100"}`}
                       >
                         {msg.type === 'text' && <span style={{ fontSize: `${chatScale * 1}rem` }}>{msg.text}</span>}
                         {msg.type === 'image' && <img src={msg.fileUrl} className="max-w-full rounded-2xl cursor-pointer" onClick={() => window.open(msg.fileUrl)} />}
                         {msg.type === 'file' && (
                            <a href={msg.fileUrl} target="_blank" className="flex items-center gap-3 bg-black/5 p-4 rounded-2xl">
                                <FileIcon className="w-6 h-6 text-uiu-emerald" />
                                <div className="flex-1 min-w-0"><p className="text-xs font-black truncate">{msg.fileName || "File"}</p></div>
                                <Download className="w-4 h-4" />
                            </a>
                         )}
                         {msg.type === 'audio' && <div className="flex items-center gap-2 py-1 min-w-[200px]"><Mic className="w-5 h-5" /><audio src={msg.fileUrl} controls className="h-8 w-full" /></div>}
                         
                         {/* REACTIONS DISPLAY */}
                         {hasReactions && (
                            <div className={`absolute -bottom-3 flex items-center gap-0.5 bg-white border border-slate-100 rounded-full px-2 py-0.5 shadow-sm ${isMine ? "left-0" : "right-0"}`}>
                                {Object.entries(reactions).map(([r, users]) => users.length > 0 && (
                                    <span key={r} className="text-[10px] flex items-center gap-1 font-bold text-slate-400">
                                        <span>{r}</span>
                                        {users.length > 1 && <span>{users.length}</span>}
                                    </span>
                                ))}
                            </div>
                         )}
                       </div>
                       <p className={`text-[9px] font-black uppercase text-slate-300 mt-2 px-2 ${isMine ? "text-right" : "text-left"}`}>{msg.timestamp?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || "Just now"}</p>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            <footer className="p-4 md:p-8 bg-white border-t border-slate-100 relative">
               {isRecording && (
                 <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-between px-8 md:px-12">
                    <div className="flex items-center gap-4 text-rose-500 font-black animate-pulse"><div className="w-3 h-3 bg-rose-500 rounded-full" /> Recording...</div>
                    <div className="flex items-center gap-4"><button onClick={() => setIsRecording(false)} className="p-4 bg-slate-100 text-slate-400 rounded-2xl"><X className="w-5 h-5" /></button><button onClick={() => { if(mediaRecorder) mediaRecorder.stop(); setIsRecording(false); }} className="p-4 bg-rose-50 text-rose-500 rounded-2xl"><Square className="w-5 h-5" /></button></div>
                 </div>
               )}
               {showEmojis && (
                 <div className="absolute bottom-full left-4 mb-4 p-4 bg-white rounded-3xl shadow-2xl border border-slate-100 grid grid-cols-6 gap-2 z-50">
                    {commonEmojis.map(e => <button key={e} type="button" onClick={() => { setNewMessage(prev => prev + e); setShowEmojis(false); }} className="text-2xl p-2 hover:scale-125 transition-all">{e}</button>)}
                 </div>
               )}
               <form onSubmit={sendTextMessage} className="max-w-4xl mx-auto flex items-center gap-2 md:gap-4">
                 <div className="flex items-center gap-2">
                    <label className="p-3 text-slate-400 cursor-pointer hover:bg-slate-50 rounded-xl transition-all"><input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} /><ImageIcon className="w-5 h-5" /></label>
                    <label className="p-3 text-slate-400 cursor-pointer hover:bg-slate-50 rounded-xl transition-all hidden sm:block"><input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'file')} /><Paperclip className="w-5 h-5" /></label>
                 </div>
                 <div className="flex-1 relative">
                   <input 
                     type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} 
                     placeholder="Type a message..." 
                     style={{ padding: `${chatScale * 1}rem` }}
                     className="w-full pl-6 pr-12 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:border-uiu-emerald transition-all" 
                   />
                   <button type="button" onClick={() => setShowEmojis(!showEmojis)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400"><Smile className="w-5 h-5" /></button>
                 </div>
                 <div className="flex items-center gap-2">
                    <button type="button" onClick={startRecording} className="p-3 md:p-4 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200 transition-all"><Mic className="w-5 h-5" /></button>
                    <button type="submit" disabled={!newMessage.trim() || uploading} className="p-3 md:p-4 bg-uiu-emerald text-white rounded-2xl shadow-lg shadow-emerald-200 disabled:opacity-50 hover:scale-105 active:scale-95 transition-all"><Send className="w-5 h-5" /></button>
                 </div>
               </form>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 space-y-6">
             <div className="w-32 h-32 bg-emerald-50 rounded-[3rem] flex items-center justify-center text-uiu-emerald"><MessageCircle className="w-14 h-14" /></div>
             <h2 className="text-3xl font-black text-slate-900">Select a Chat to Start Discussing</h2>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-slate-50">Loading...</div>}>
      <ChatContent />
    </Suspense>
  );
}
