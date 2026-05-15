"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import {
  Package,
  ArrowLeft,
  PlusCircle,
  Mail,
  MessageSquare,
  UploadCloud,
  BarChart3,
  ShieldAlert,
  Users,
  User,
  Target,
  Calendar,
  Zap,
  ArrowRight,
  ImagePlus,
  FileText,
  Rocket,
  Sparkles,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  Settings,
  Eye,
  Check,
  X,
  CreditCard,
  QrCode,
  CheckCircle,
  Lock,
  ExternalLink,
  Plus,
  Edit,
  Download,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import Link from "next/link";
import { mockDb } from "@/utils/mockDb";
import { db } from "@/utils/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { MessageCircle as ChatIcon } from "lucide-react";
import AdminChat from "./AdminChat";

export default function AdminPanelPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [userRole, setUserRole] = useState("student");
  const [activeTab, setActiveTab] = useState("campaigns"); // campaigns, items, users, settings

  // System State from mockDb
  const [campaigns, setCampaigns] = useState([]);
  const [items, setItems] = useState([]);
  const [publicItems, setPublicItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState({});
  const [adminRooms, setAdminRooms] = useState([]);
  const [broadcastHistory, setBroadcastHistory] = useState([]);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [smsGatewayEndpoint, setSmsGatewayEndpoint] = useState("http://192.168.0.216:8082");

  useEffect(() => {
    fetch("http://127.0.0.1:8080/api/admin/broadcast/config")
      .then(res => res.json())
      .then(data => setSmsGatewayEndpoint(data.endpoint))
      .catch(err => console.error("Failed to load SMS config:", err));
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "chatRooms"),
      where("participants", "array-contains", "ECO_ADMIN")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAdminRooms(rooms);
    });
    return () => unsubscribe();
  }, []);

  const [smsPreview, setSmsPreview] = useState("New Winter Drive is live at UIU! Scan QR to contribute.");
  const [csvFileName, setCsvFileName] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [csvRecords, setCsvRecords] = useState([]);  // [{ name, email, phone }]
  const csvInputRef = useRef(null);

  // Campaign Form State
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    target: "",
    duration: "",   // in days
    description: "",
    category: "Education",
    image: null,
    sslCommerzEnabled: true,
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
  const [coverPreview, setCoverPreview] = useState(null);
  const coverInputRef = useRef(null);
  const [editingCampaignId, setEditingCampaignId] = useState(null);

  // Bank accounts state — supports multiple entries
  const [bankAccounts, setBankAccounts] = useState([
    { id: 1, bankName: "", accountName: "", accountNumber: "", branch: "" }
  ]);

  const addBankAccount = () =>
    setBankAccounts(prev => [...prev, { id: Date.now(), bankName: "", accountName: "", accountNumber: "", branch: "" }]);

  const removeBankAccount = (id) =>
    setBankAccounts(prev => prev.filter(b => b.id !== id));

  const updateBankAccount = (id, field, value) =>
    setBankAccounts(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));

  const [isLaunching, setIsLaunching] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [selectedItemForReview, setSelectedItemForReview] = useState(null);
  const [isBroadcastingEmail, setIsBroadcastingEmail] = useState(false);
  const [isBroadcastingSms, setIsBroadcastingSms] = useState(false);

  // Admin Auth State
  const [showAdminAuth, setShowAdminAuth] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    setIsMounted(true);
    refreshData();
    // Re-read users whenever the tab regains focus (picks up registrations from other pages)
    const onFocus = () => setUsers(mockDb.getUsers());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const refreshData = async () => {
    let backendCampaigns = [];
    try {
      const resp = await fetch("http://127.0.0.1:8080/api/campaigns");
      if (resp.ok) {
        backendCampaigns = await resp.json();
      }
    } catch (e) {
      console.warn("Admin backend fetch failed:", e);
    }

    const mockCampaigns = mockDb.getCampaigns();

    // ── HYBRID MERGE STRATEGY ────────────────────────────────────────────────
    // We want to show EVERYTHING from the "database" (mockDb) and everything from the backend.

    // 1. Map backend campaigns with the Hybrid Overlay (merging extras)
    const mappedBackend = backendCampaigns.map(c => {
      // Try to find extras by title OR id
      const extra = mockDb.getCampaignExtras(c.title) || mockDb.getCampaignExtras(c.id?.toString()) || {};

      let imageUrl = extra.image || c.image || c.imagePath;
      if (imageUrl && !imageUrl.startsWith("http") && !imageUrl.startsWith("blob:") && !imageUrl.startsWith("data:")) {
        imageUrl = `http://127.0.0.1:8080/${imageUrl.startsWith("/") ? imageUrl.slice(1) : imageUrl}`;
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

    // 2. Identify mock campaigns that don't exist in the backend
    // We use title as a heuristic for "sameness" if IDs differ (backend vs mock)
    const backendTitles = new Set(mappedBackend.map(c => c.title.toLowerCase()));
    const backendIds = new Set(mappedBackend.map(c => c.id?.toString()));

    const uniqueMock = mockCampaigns
      .filter(c => !backendIds.has(c.id?.toString()) && !backendTitles.has(c.title?.toLowerCase()))
      .map(c => ({ ...c, _uniqueId: `mock-${c.id}` }));

    // 3. Combine them
    setCampaigns([...mappedBackend, ...uniqueMock]);

    // ── Fetch Users from Backend ──
    try {
      const res = await fetch("http://127.0.0.1:8080/api/users");
      if (res.ok) {
        const backendUsers = await res.json();
        // Map backend fields (fullName -> name, userType -> dept/role)
        const mappedUsers = backendUsers.map(u => ({
          ...u,
          _uniqueId: `backend-user-${u.id}`,
          name: u.fullName,
          dept: u.userType?.toUpperCase() || "USER",
          status: u.status || "Active",
          points: u.points || 0
        }));

        // Combine with mock users if needed
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
    // ── Fetch Academic Resources from Backend ──
    try {
      const resAcademic = await fetch("http://127.0.0.1:8080/api/resources");
      let academicItems = [];
      if (resAcademic.ok) {
        academicItems = await resAcademic.json();
      }

      // ── Fetch Public Resources from Backend ──
      const resPublic = await fetch("http://127.0.0.1:8080/api/public-resources/all");
      let publicItems = [];
      if (resPublic.ok) {
        publicItems = await resPublic.json();
      }
      setPublicItems(publicItems);
      console.log("Admin: public resources fetched:", publicItems.length);

      // Map academic items
      const mappedAcademic = academicItems.map(it => {
        let downloadUrl = it.fileName ? `/api/resources/download/${it.fileName}` : it.downloadUrl;
        if (downloadUrl && downloadUrl.startsWith("/")) {
          downloadUrl = `http://127.0.0.1:8080${downloadUrl}`;
        }
        return {
          ...it,
          _uniqueId: `academic-${it.id}`,
          condition: it.resourceCondition || it.condition,
          downloadUrl: downloadUrl,
          type: "academic",
          _isBackend: true
        };
      });

      // Map public items
      const mappedPublic = publicItems.map(it => ({
        ...it,
        _uniqueId: `public-${it.id}`,
        condition: it.conditionInfo || it.condition,
        subject: it.category, // Map category to subject for UI consistency
        type: "public",
        _isBackend: true
      }));

      // Combine with mock items
      const mockItems = mockDb.getItems().map(it => ({
        ...it,
        _uniqueId: `mock-item-${it.id}`
      }));

      const combinedItems = [...mappedAcademic, ...mappedPublic];
      console.log("Admin Data Sync:", { academic: mappedAcademic.length, public: mappedPublic.length, total: combinedItems.length });

      const backendUniqueKeys = new Set(combinedItems.map(i => `${i.type}-${i.title.toLowerCase()}`));

      mockItems.forEach(mi => {
        const key = `${mi.type || 'academic'}-${mi.title.toLowerCase()}`;
        if (!backendUniqueKeys.has(key)) {
          combinedItems.push(mi);
        }
      });

      setItems(combinedItems);
    } catch (err) {
      console.warn("Failed to fetch resources from backend:", err);
      setItems(mockDb.getItems());
    }

    // ── Fetch Broadcast History ──
    try {
      const resHistory = await fetch("http://127.0.0.1:8080/api/admin/broadcast/history");
      if (resHistory.ok) {
        const history = await resHistory.json();
        setBroadcastHistory(history.reverse()); // Show latest first
      }
    } catch (err) {
      console.warn("Failed to fetch broadcast history:", err);
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

  const handleLaunch = async () => {
    if (!newCampaign.name || !newCampaign.target) return;
    setIsLaunching(true);

    // Prepare common data
    const validBanks = bankAccounts.filter(b => b.bankName || b.accountNumber);
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

    let base64Image = coverPreview;
    const file = coverInputRef.current?.files?.[0];
    if (file) {
      base64Image = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    }

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

    const campaignObj = {
      title: newCampaign.name,
      description: newCampaign.description,
      category: newCampaign.category,
      goal: newCampaign.target,
      duration: newCampaign.duration || 30,
      paymentQRs: processedPaymentQRs,
      bankAccounts: validBanks,
      image: base64Image,
      sslCommerzEnabled: newCampaign.sslCommerzEnabled
    };

    try {
      const fd = new FormData();
      const durationDays = parseInt(newCampaign.duration) || 30;
      const endTime = new Date(Date.now() + durationDays * 86400000).toISOString();

      fd.append("title", newCampaign.name);
      fd.append("description", newCampaign.description);
      fd.append("category", newCampaign.category);
      fd.append("goal", newCampaign.target);
      fd.append("duration", durationDays);
      fd.append("endTime", endTime);
      fd.append("sslCommerzEnabled", newCampaign.sslCommerzEnabled);
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

        // Track existing paths to prevent data loss on the backend during updates
        const isUrl = typeof qr.image === 'string' && qr.image.startsWith("http");
        fd.append("qrExistingPaths", isUrl ? qr.image : "");

        if (qrFile) {
          // Provide a real filename to avoid the default "blob" name which backends often block
          const fileName = qr.file ? qr.file.name : `qr_${Date.now()}_${qr.provider}.png`;
          fd.append("qrFiles", qrFile, fileName);
        } else {
          // Maintain indexing with an empty blob
          fd.append("qrFiles", new Blob([], { type: "application/octet-stream" }), "null");
        }
      });
      fd.append("bankAccounts", JSON.stringify(validBanks));

      if (file) {
        fd.append("image", file);
      }

      // Detect if we're editing a backend campaign or a mock one
      // Backend IDs are typically small integers, while mock IDs are large timestamps
      const isRealBackendId = editingCampaignId && editingCampaignId < 1000000000;

      const url = (editingCampaignId && isRealBackendId)
        ? `http://127.0.0.1:8080/api/campaigns/${editingCampaignId}`
        : "http://127.0.0.1:8080/api/campaigns";
      const method = (editingCampaignId && isRealBackendId) ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        body: fd,
      });

      if (!res.ok) {
        const errorMsg = await res.text().catch(() => "Unknown server error");
        console.error("Backend Error Details:", errorMsg);
        throw new Error(`Backend update failed: ${errorMsg}`);
      }

      // SUCCESS: Still save extras because backend might drop them in subsequent GETs
      mockDb.saveCampaignExtras(newCampaign.name, campaignObj);
      if (editingCampaignId) {
        // Also update the ID-based key in case title changes
        mockDb.saveCampaignExtras(editingCampaignId.toString(), campaignObj);
        mockDb.updateCampaign(editingCampaignId, campaignObj);
      }

      refreshData();
      setIsLaunching(false);
      setShowSuccess(true);
      resetForm();
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err) {
      console.warn("Backend update failed, falling back to local DB:", err);

      if (editingCampaignId) {
        mockDb.updateCampaign(editingCampaignId, campaignObj);
        mockDb.saveCampaignExtras(editingCampaignId.toString(), campaignObj);
      } else {
        campaignObj.id = Date.now();
        campaignObj.createdAt = new Date().toISOString();
        campaignObj.endTime = new Date(Date.now() + (parseInt(newCampaign.duration) || 30) * 86400000).toISOString();
        mockDb.addCampaign(campaignObj);
      }

      // Also save extras by title for general lookup
      mockDb.saveCampaignExtras(newCampaign.name, campaignObj);

      refreshData();
      setIsLaunching(false);
      setShowSuccess(true);
      resetForm();
      setTimeout(() => setShowSuccess(false), 5000);
    }
  };

  const handleItemAction = async (id, status) => {
    try {
      const item = items.find(it => it.id === id);
      const isPublic = item?.type === "public" || item?._uniqueId?.startsWith("public-");

      const endpoint = isPublic
        ? `http://127.0.0.1:8080/api/public-resources/${id}/status?status=${status}`
        : `http://127.0.0.1:8080/api/resources/${id}/status?status=${status}`;

      const res = await fetch(endpoint, {
        method: "PUT"
      });

      if (res.ok) {
        refreshData();
      } else {
        mockDb.updateItemStatus(id, status);
        refreshData();
      }
    } catch (err) {
      console.warn("Backend status update failed, falling back to mock DB:", err);
      mockDb.updateItemStatus(id, status);
      refreshData();
    }
  };

  const handleDeleteCampaign = async (id) => {
    if (confirm("Are you sure you want to delete this campaign?")) {
      try {
        const res = await fetch(`http://127.0.0.1:8080/api/campaigns/${id}`, {
          method: "DELETE"
        });
        if (!res.ok) throw new Error("Delete failed");
      } catch (err) {
        console.warn("Backend delete failed, falling back to mock DB:", err);
      }
      mockDb.deleteCampaign(id);
      refreshData();
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
        const res = await fetch(`http://127.0.0.1:8080/api/resources/${id}`, {
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
        const res = await fetch(`http://127.0.0.1:8080/api/public-resources/${id}`, {
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
      const res = await fetch(`http://127.0.0.1:8080/api/users/${id}/status?status=${status}`, {
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
      // Detect header positions (case-insensitive)
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
    // reset input so same file can be re-uploaded
    e.target.value = "";
  };

  const handleClearCSV = () => {
    setCsvFileName(null);
    setCsvFile(null);
    setCsvRecords([]);
  };

  const handleBroadcastEmail = async () => {
    const file = csvFile;
    if (!file) {
      alert("Please upload a CSV file first.");
      return;
    }
    if (!smsPreview) {
      alert("Please write a message to broadcast.");
      return;
    }

    setIsBroadcastingEmail(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("message", smsPreview);

      const res = await fetch("http://127.0.0.1:8080/api/admin/broadcast/email", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Broadcast failed");

      alert("Email broadcast initiated successfully!");
      handleClearCSV();
      setSmsPreview("");
    } catch (error) {
      console.error("Broadcast error:", error);
      alert("Failed to initiate broadcast. Ensure backend is running and connected.");
    } finally {
      setIsBroadcastingEmail(false);
    }
  };

  const handleBroadcastSms = async () => {
    const file = csvFile;
    if (!file) {
      alert("Please upload a CSV file first.");
      return;
    }
    if (!smsPreview) {
      alert("Please write a message to broadcast.");
      return;
    }

    setIsBroadcastingSms(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("message", smsPreview);

      const res = await fetch("http://127.0.0.1:8080/api/admin/broadcast/sms", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("SMS Broadcast failed");

      alert("SMS broadcast initiated successfully! Messages will be sent with a 10-second delay.");
      handleClearCSV();
      setSmsPreview("");
    } catch (error) {
      console.error("SMS Broadcast error:", error);
      alert("Failed to initiate SMS broadcast. Ensure backend is running.");
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

      {/* DEV TOOL (ROLE SWITCHER) */}
      <div className="fixed top-8 right-8 z-50 flex items-center gap-3 px-4 py-2 bg-white/80 backdrop-blur-md rounded-full border border-white shadow-xl">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mode:</span>
        <button
          onClick={() => {
            if (userRole === "admin") {
              setUserRole("student");
            } else {
              setShowAdminAuth(true);
            }
          }}
          className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black transition-all ${userRole === "admin" ? "bg-uiu-emerald text-white shadow-lg shadow-emerald-500/20" : "bg-slate-200 text-slate-500 hover:bg-slate-300"
            }`}
        >
          <Zap className={`w-3 h-3 ${userRole === "admin" ? "fill-white" : ""}`} />
          {userRole === "admin" ? "ADMIN VIEW" : "STUDENT VIEW"}
        </button>
      </div>

      <header className="max-w-7xl mx-auto w-full px-6 pt-8 z-10">
        <Link href="/dashboard" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/50 backdrop-blur-md border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-slate-700 font-bold hover:bg-white/90 hover:text-slate-900 transition-all group w-max">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </Link>
      </header>

      <AnimatePresence mode="wait">
        {userRole === "student" ? (
          <motion.main key="access-denied" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="flex-1 flex flex-col items-center justify-center p-6 z-10 text-center">
            <div className="w-24 h-24 bg-rose-500/10 rounded-3xl flex items-center justify-center mb-6 border border-rose-500/20 shadow-2xl shadow-rose-500/10"><ShieldAlert className="w-12 h-12 text-rose-500 animate-pulse" /></div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">Unauthorized Access!</h1>
            <p className="text-xl font-medium text-slate-500 max-w-md mb-10 leading-relaxed text-rose-600/80">This area is restricted to <span className="font-black text-rose-600">UIU Admins</span> only.</p>
            <Link href="/dashboard" className="px-10 py-4 bg-white/80 backdrop-blur-md border border-white rounded-[1.5rem] font-black text-slate-700 shadow-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-3">
              Return to Dashboard <ArrowRight className="w-5 h-5" />
            </Link>
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
                    {tab.id === "public" && publicItems.filter(i => i.status === "Pending").length > 0 && (
                      <span className="ml-1 w-5 h-5 bg-amber-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                        {publicItems.filter(i => i.status === "Pending").length}
                      </span>
                    )}
                    {tab.id === "messages" && adminRooms.filter(r => r.unreadBy?.includes("ECO_ADMIN")).length > 0 && (
                      <span className="ml-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
                        {adminRooms.filter(r => r.unreadBy?.includes("ECO_ADMIN")).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* QUICK STATS (DYNAMIC) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Clickable: Active Campaigns */}
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

              {/* Other stat cards (non-clickable) */}
              {[
                { label: "Pending Moderation", value: items.filter(it => it.status === "Pending").length, icon: Eye, color: "text-amber-500", bg: "bg-amber-500/10" },
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
                  {/* EXISTING CAMPAIGN CREATOR CODE (REFACTORED FOR mockDb) */}
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
                          <input
                            type="number"
                            min="1"
                            placeholder="Duration (days)"
                            value={newCampaign.duration}
                            onChange={(e) => setNewCampaign({ ...newCampaign, duration: e.target.value })}
                            className="w-full px-5 py-4 rounded-2xl bg-white/80 border border-slate-100 outline-none font-bold text-slate-800 shadow-sm"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-widest pointer-events-none">days</span>
                        </div>
                      </div>

                      {/* CATEGORY SELECTOR */}
                      <div className="relative">
                        <select
                          value={newCampaign.category}
                          onChange={(e) => setNewCampaign({ ...newCampaign, category: e.target.value })}
                          className="w-full px-5 py-4 rounded-2xl bg-white/80 border border-slate-100 outline-none font-bold text-slate-800 shadow-sm appearance-none cursor-pointer"
                        >
                          <option value="Education">Education & Books</option>
                          <option value="Food">Food & Nutrition</option>
                          <option value="Health">Medical & Health</option>
                          <option value="Environment">Eco & Environment</option>
                          <option value="Welfare">Social Welfare</option>
                          <option value="Emergency">Emergency Relief</option>
                          <option value="General">General Contribution</option>
                        </select>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-uiu-emerald font-black text-xs">
                          CATEGORY ▼
                        </div>
                      </div>

                      {/* Global Giving Hub Toggle for Campaign */}
                      <div className="flex items-center justify-between p-5 rounded-2xl bg-emerald-50/30 border border-emerald-100/50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-xl shadow-sm">
                            <CreditCard className="w-5 h-5 text-uiu-emerald" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 leading-none mb-1">Global Giving Hub</p>
                            <p className="text-[10px] font-medium text-slate-400">Allow Global Giving Hub donations for this drive</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewCampaign({ ...newCampaign, sslCommerzEnabled: !newCampaign.sslCommerzEnabled })}
                          className={`w-12 h-6 rounded-full transition-colors relative ${newCampaign.sslCommerzEnabled ? "bg-uiu-emerald" : "bg-slate-300"}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${newCampaign.sslCommerzEnabled ? "left-7" : "left-1"}`} />
                        </button>
                      </div>

                      {/* CAMPAIGN COVER IMAGE UPLOAD BOX */}
                      <div
                        onClick={() => coverInputRef.current?.click()}
                        className="group relative w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center gap-2 hover:border-uiu-emerald/50 hover:bg-emerald-50/30 transition-all cursor-pointer overflow-hidden"
                        style={{ minHeight: coverPreview ? 'auto' : '8rem' }}
                      >
                        <input
                          ref={coverInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleCoverSelect}
                        />
                        {coverPreview ? (
                          <div className="relative w-full">
                            <img src={coverPreview} alt="Campaign cover" className="w-full max-h-48 object-cover rounded-2xl" />
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setCoverPreview(null); setNewCampaign(p => ({ ...p, image: null })); }}
                              className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-rose-500 text-white rounded-full flex items-center justify-center transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-uiu-orange/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <ImagePlus className="w-8 h-8 text-slate-400 group-hover:text-uiu-emerald transition-colors" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-uiu-emerald">Upload Campaign Cover</span>
                          </>
                        )}
                      </div>

                      {/* DYNAMIC MANUAL QR UPLOAD SYSTEM */}
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <QrCode className="w-3.5 h-3.5" /> Dynamic Manual QR Upload System
                          </p>
                          <button
                            type="button"
                            onClick={addPaymentQR}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-uiu-emerald/10 hover:bg-uiu-emerald/20 text-uiu-emerald rounded-full text-[10px] font-black uppercase tracking-widest transition-all"
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

                      {/* BANK ACCOUNTS */}
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <CreditCard className="w-3.5 h-3.5" /> Bank Account Details
                          </p>
                          <button
                            type="button"
                            onClick={addBankAccount}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-uiu-emerald/10 hover:bg-uiu-emerald/20 text-uiu-emerald rounded-full text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            <Plus className="w-3 h-3" /> Add Account
                          </button>
                        </div>

                        <AnimatePresence>
                          {bankAccounts.map((bank, idx) => (
                            <motion.div
                              key={bank.id}
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: 20, height: 0 }}
                              className="relative p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col gap-3"
                            >
                              {/* Entry header */}
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">🏦 Account {idx + 1}</span>
                                {bankAccounts.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeBankAccount(bank.id)}
                                    className="w-6 h-6 flex items-center justify-center rounded-full bg-rose-50 text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  placeholder="Bank Name"
                                  value={bank.bankName}
                                  onChange={(e) => updateBankAccount(bank.id, "bankName", e.target.value)}
                                  className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-700 text-xs focus:ring-2 focus:ring-uiu-emerald/20 transition-all"
                                />
                                <input
                                  type="text"
                                  placeholder="Branch (optional)"
                                  value={bank.branch}
                                  onChange={(e) => updateBankAccount(bank.id, "branch", e.target.value)}
                                  className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-700 text-xs focus:ring-2 focus:ring-uiu-emerald/20 transition-all"
                                />
                              </div>
                              <input
                                type="text"
                                placeholder="Account Holder Name"
                                value={bank.accountName}
                                onChange={(e) => updateBankAccount(bank.id, "accountName", e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 outline-none font-bold text-slate-700 text-xs focus:ring-2 focus:ring-uiu-emerald/20 transition-all"
                              />
                              <input
                                type="text"
                                placeholder="Account Number"
                                value={bank.accountNumber}
                                onChange={(e) => updateBankAccount(bank.id, "accountNumber", e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-white border border-uiu-emerald/20 outline-none font-black text-slate-800 text-sm tracking-widest focus:ring-2 focus:ring-uiu-emerald/20 transition-all"
                              />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>


                      <div className="flex gap-4">
                        <button onClick={handleLaunch} disabled={isLaunching} className="flex-1 py-5 bg-uiu-emerald hover:bg-emerald-600 rounded-2xl text-white font-black flex items-center justify-center gap-3 shadow-xl transition-all disabled:opacity-50">
                          {isLaunching ? (
                            <div className="flex items-center gap-3">
                              <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                              <span className="animate-pulse">{editingCampaignId ? "Updating..." : "Launching & Generating QR..."}</span>
                            </div>
                          ) : (
                            <><Rocket className="w-6 h-6" /> {editingCampaignId ? "Update Campaign" : "Launch Campaign"}</>
                          )}
                        </button>
                        {editingCampaignId && (
                          <button onClick={resetForm} disabled={isLaunching} className="px-8 py-5 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-600 font-black flex items-center justify-center transition-all disabled:opacity-50">
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-xl">
                      {/* ── Header ── */}
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-black text-slate-800">Live Marketing Broadcast</h2>
                        <AnimatePresence>
                          {csvFileName && (
                            <motion.button
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              onClick={handleClearCSV}
                              className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-100 rounded-full hover:bg-rose-100 transition-colors group"
                            >
                              <CheckCircle className="w-3 h-3 text-uiu-emerald" />
                              <span className="text-[10px] font-bold text-slate-600 max-w-[120px] truncate">{csvFileName}</span>
                              <X className="w-3 h-3 text-rose-400 group-hover:text-rose-600 transition-colors" />
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* ── CSV Upload Zone ── */}
                      <input
                        ref={csvInputRef}
                        type="file"
                        className="hidden"
                        accept=".csv"
                        onChange={handleCSVUpload}
                      />
                      {!csvFileName ? (
                        <div
                          onClick={() => csvInputRef.current?.click()}
                          className="group relative w-full h-32 mb-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center gap-2 hover:border-uiu-emerald/50 hover:bg-emerald-50/30 transition-all cursor-pointer overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-uiu-orange/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-uiu-emerald transition-colors" />
                          <div className="text-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-uiu-emerald mb-1">Upload Student CSV</p>
                            <p className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">(Name · Email · Phone Number)</p>
                          </div>
                        </div>
                      ) : (
                        <AnimatePresence>
                          <motion.div
                            key="csv-preview"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mb-6 rounded-2xl overflow-hidden border border-emerald-100/60 bg-white/40 backdrop-blur-md shadow-sm"
                          >
                            {/* Summary bar */}
                            <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-emerald-50/80 to-teal-50/60 border-b border-emerald-100/50">
                              <p className="text-[11px] font-black text-emerald-700">
                                ✅ Successfully parsed <span className="text-uiu-emerald">{csvRecords.length}</span> student records
                              </p>
                              <button
                                onClick={() => csvInputRef.current?.click()}
                                className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-uiu-emerald transition-colors"
                              >
                                Replace ↑
                              </button>
                            </div>

                            {/* Scrollable Table */}
                            <div className="max-h-52 overflow-y-auto no-scrollbar">
                              <table className="w-full text-left">
                                <thead className="sticky top-0 z-10 bg-white/70 backdrop-blur-sm">
                                  <tr>
                                    {["#", "Name", "Email", "Phone"].map(col => (
                                      <th key={col} className="px-4 py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">{col}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {csvRecords.map((row, i) => (
                                    <tr
                                      key={i}
                                      className={`transition-colors ${i % 2 === 0 ? "bg-white/30" : "bg-emerald-50/20"
                                        } hover:bg-emerald-50/50`}
                                    >
                                      <td className="px-4 py-2.5 text-[10px] font-bold text-slate-300">{i + 1}</td>
                                      <td className="px-4 py-2.5 text-[11px] font-bold text-slate-600 max-w-[100px] truncate">{row.name}</td>
                                      <td className="px-4 py-2.5 text-[11px] font-medium text-slate-500 max-w-[140px] truncate">{row.email}</td>
                                      <td className="px-4 py-2.5 text-[11px] font-medium text-slate-500">{row.phone}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </motion.div>
                        </AnimatePresence>
                      )}

                      {/* ── Message + Broadcast Buttons ── */}
                      <div className="space-y-4">
                        <div className="relative">
                          <textarea
                            value={smsPreview}
                            onChange={(e) => setSmsPreview(e.target.value)}
                            className="w-full p-4 bg-white/50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-600 h-24 outline-none focus:ring-2 focus:ring-uiu-emerald/10 transition-all"
                            placeholder="Draft your broadcast message..."
                          />
                          <div className="absolute bottom-3 right-3 text-[10px] font-bold text-slate-300 uppercase italic">Preview</div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <button
                            onClick={handleBroadcastEmail}
                            disabled={isBroadcastingEmail}
                            className="group relative flex items-center justify-center gap-2 py-4 bg-uiu-emerald text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-lg hover:shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all overflow-hidden disabled:opacity-50"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-uiu-emerald opacity-0 group-hover:opacity-100 transition-opacity" />
                            {isBroadcastingEmail ? (
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin relative z-10" />
                            ) : (
                              <Mail className="relative z-10 w-4 h-4" />
                            )}
                            <span className="relative z-10">{isBroadcastingEmail ? "Sending..." : "Broadcast Email"}</span>
                          </button>
                          <button
                            onClick={handleBroadcastSms}
                            disabled={isBroadcastingSms}
                            className="group relative flex items-center justify-center gap-2 py-4 bg-uiu-orange text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-lg hover:shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all overflow-hidden disabled:opacity-50"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-uiu-orange opacity-0 group-hover:opacity-100 transition-opacity" />
                            {isBroadcastingSms ? (
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin relative z-10" />
                            ) : (
                              <MessageSquare className="relative z-10 w-4 h-4" />
                            )}
                            <span className="relative z-10">{isBroadcastingSms ? "Broadcasting..." : "Broadcast SMS"}</span>
                          </button>
                        </div>
                      </div>
                     </div>

                      {/* NEW: BROADCAST LOGS */}
                      <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-xl">
                        <div className="flex items-center justify-between mb-6">
                          <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                            <BarChart3 className="w-5 h-5 text-indigo-500" />
                            Broadcast Logs
                            {broadcastHistory.length > 0 && (
                              <span className="ml-1 px-2 py-0.5 bg-indigo-50 text-indigo-500 text-[9px] font-black rounded-full border border-indigo-100">
                                {broadcastHistory.length}
                              </span>
                            )}
                          </h2>
                          <div className="flex items-center gap-3">
                            <button onClick={refreshData} className="text-[10px] font-black text-uiu-emerald hover:underline">Refresh</button>
                            {broadcastHistory.length > 5 && (
                              <button
                                onClick={() => setShowAllLogs(prev => !prev)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black transition-all ${
                                  showAllLogs
                                    ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100'
                                }`}
                              >
                                {showAllLogs ? (
                                  <><ChevronUp className="w-3 h-3" /> Hide</>
                                ) : (
                                  <><ChevronDown className="w-3 h-3" /> Show All ({broadcastHistory.length})</>
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-slate-100">
                          <table className="w-full text-left">
                            <thead className="bg-slate-50/50 text-[9px] font-black uppercase tracking-widest text-slate-400">
                              <tr>
                                <th className="px-5 py-3">Type / Message</th>
                                <th className="px-5 py-3">Stats</th>
                                <th className="px-5 py-3">Time</th>
                                <th className="px-5 py-3"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {broadcastHistory.length > 0 ? (
                                (showAllLogs ? broadcastHistory : broadcastHistory.slice(0, 5)).map((h) => (
                                  <tr key={h.id} className="hover:bg-rose-50/10 transition-colors group">
                                    <td className="px-5 py-4 min-w-[180px]">
                                      <p className="text-[11px] font-black text-slate-800 line-clamp-1">{h.message}</p>
                                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                                        {h.message?.startsWith("[SMS]") ? "📱 SMS Gateway" : "✉️ Email Server"}
                                      </span>
                                    </td>
                                    <td className="px-5 py-4">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-uiu-emerald">{h.successfulDeliveries}</span>
                                        <span className="text-[10px] font-bold text-slate-300">/ {h.totalRecipients}</span>
                                        <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                          <div className="h-full bg-uiu-emerald rounded-full" style={{ width: `${h.totalRecipients > 0 ? (h.successfulDeliveries / h.totalRecipients) * 100 : 0}%` }} />
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap">
                                      <p className="text-[10px] font-black text-slate-500">{new Date(h.broadcastTime).toLocaleDateString()}</p>
                                      <p className="text-[8px] font-bold text-slate-300">{new Date(h.broadcastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </td>
                                    <td className="px-5 py-4">
                                      <button
                                        onClick={async () => {
                                          if (!confirm('Delete this broadcast log?')) return;
                                          try {
                                            await fetch(`http://127.0.0.1:8080/api/admin/broadcast/history/${h.id}`, { method: 'DELETE' });
                                            setBroadcastHistory(prev => prev.filter(x => x.id !== h.id));
                                          } catch (e) {
                                            setBroadcastHistory(prev => prev.filter(x => x.id !== h.id));
                                          }
                                        }}
                                        className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-rose-50 text-rose-400 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all"
                                        title="Delete log"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr><td colSpan="4" className="px-5 py-10 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">No broadcast logs yet</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {!showAllLogs && broadcastHistory.length > 5 && (
                          <div className="mt-4 text-center">
                            <button
                              onClick={() => setShowAllLogs(true)}
                              className="text-[10px] font-black text-indigo-500 hover:text-indigo-700 transition-colors"
                            >
                              + {broadcastHistory.length - 5} more logs — Show All
                            </button>
                          </div>
                        )}
                      </div>

                      {/* NEW: PENDING RESOURCE APPROVALS */}
                      <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-xl">
                        <div className="flex items-center justify-between mb-8">
                          <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                            <ExternalLink className="w-5 h-5 text-uiu-emerald" /> Pending Approvals
                          </h2>
                          <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black rounded-full border border-amber-100">
                            {items.filter(it => it.status === "Pending").length} Actions Required
                          </span>
                        </div>

                        <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar">
                          {items.filter(it => it.status === "Pending").map((item) => (
                            <motion.div
                              key={item._uniqueId || item.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-5 rounded-2xl bg-white/40 border border-white hover:bg-white/80 transition-all flex items-center justify-between group shadow-sm"
                            >
                              <div className="flex flex-col gap-1">
                                <span className="text-sm font-black text-slate-800">{item.title}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-slate-400">{item.postedBy}</span>
                                  <span className="text-[10px] font-black text-uiu-emerald bg-emerald-50 px-2 py-0.5 rounded-full">{item.condition}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setSelectedItemForReview(item)}
                                  className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center hover:scale-105 active:scale-95 shadow-lg shadow-slate-200/50 transition-all"
                                  title="View Details"
                                >
                                  <Eye className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleItemAction(item.id, "Approved")}
                                  className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20 transition-all"
                                >
                                  <Check className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleItemAction(item.id, "Rejected")}
                                  className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center hover:scale-105 active:scale-95 shadow-lg shadow-rose-500/20 transition-all"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                            </motion.div>
                          ))}
                          {items.filter(it => it.status === "Pending").length === 0 && (
                            <div className="py-10 text-center flex flex-col items-center gap-3">
                              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200"><Check className="w-6 h-6" /></div>
                              <p className="text-xs font-bold text-slate-400">Moderation Queue Clear</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                </motion.div>
              )}

              {activeTab === "items" && (
                <motion.div key="tab-items" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-xl">
                  <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
                    <Package className="w-7 h-7 text-amber-500" /> Marketplace Moderation
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Item Details</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Posted By</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Status</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {items.filter(it => it.type === "academic").length > 0 ? items.filter(it => it.type === "academic").map((item) => (
                          <tr key={item._uniqueId || item.id} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="py-5 px-4 font-bold text-slate-800">{item.title} <span className="text-xs text-slate-400 ml-2">({item.subject})</span></td>
                            <td className="py-5 px-4 text-sm font-medium text-slate-500">{item.postedBy}</td>
                            <td className="py-5 px-4">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${item.status === "Approved" ? "bg-emerald-100 text-emerald-700" :
                                item.status === "Pending" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                                }`}>{item.status}</span>
                            </td>
                            <td className="py-5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {item.status === "Pending" && (
                                  <>
                                    <button onClick={() => handleItemAction(item.id, "Approved")} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"><Check className="w-4 h-4" /></button>
                                    <button onClick={() => handleItemAction(item.id, "Rejected")} className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors"><X className="w-4 h-4" /></button>
                                  </>
                                )}
                                <button onClick={() => handleDeleteItem(item.id)} className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-rose-50 hover:text-rose-500 transition-colors" title="Delete item"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan="4" className="py-10 text-center text-slate-400 font-medium">No items found in system.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === "public" && (
                <motion.div key="tab-public" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-xl">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                      <Users className="w-7 h-7 text-uiu-emerald" /> Public Resource Moderation
                    </h2>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-xs font-black text-amber-700">
                        {publicItems.filter(i => i.status === "Pending").length} Pending
                      </span>
                      <button onClick={refreshData} className="px-4 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-black text-emerald-700 hover:bg-emerald-100 transition-all">
                        ↻ Refresh
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Resource</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Category</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Posted By</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Status</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {publicItems.length > 0 ? publicItems.map((item) => (
                          <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="py-5 px-4">
                              <div className="flex items-center gap-3">
                                {item.image
                                  ? <img src={item.image} className="w-10 h-10 rounded-xl object-cover border border-slate-100" />
                                  : <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center"><Package className="w-5 h-5 text-slate-300" /></div>
                                }
                                <div>
                                  <p className="font-black text-slate-800 text-sm">{item.title}</p>
                                  <p className="text-[10px] text-slate-400 font-medium line-clamp-1">{item.description}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-5 px-4">
                              <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black">{item.category}</span>
                            </td>
                            <td className="py-5 px-4 text-sm font-medium text-slate-500">
                              {item.postedBy}
                              <div className="text-[10px] text-slate-300">{item.userEmail}</div>
                            </td>
                            <td className="py-5 px-4">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${item.status === "Approved" ? "bg-emerald-100 text-emerald-700" :
                                item.status === "Pending" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                                }`}>{item.status}</span>
                            </td>
                            <td className="py-5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {item.status === "Pending" && (
                                  <>
                                    <button
                                      onClick={async () => {
                                        await fetch(`http://127.0.0.1:8080/api/public-resources/${item.id}/status?status=Approved`, { method: "PUT" });
                                        refreshData();
                                      }}
                                      className="px-3 py-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-500 hover:text-white transition-all font-black text-xs flex items-center gap-1"
                                    >
                                      <Check className="w-3.5 h-3.5" /> Approve
                                    </button>
                                    <button
                                      onClick={async () => {
                                        await fetch(`http://127.0.0.1:8080/api/public-resources/${item.id}/status?status=Rejected`, { method: "PUT" });
                                        refreshData();
                                      }}
                                      className="px-3 py-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-500 hover:text-white transition-all font-black text-xs flex items-center gap-1"
                                    >
                                      <X className="w-3.5 h-3.5" /> Reject
                                    </button>
                                  </>
                                )}
                                {item.status !== "Pending" && (
                                  <button
                                    onClick={async () => {
                                      await fetch(`http://127.0.0.1:8080/api/public-resources/${item.id}/status?status=Pending`, { method: "PUT" });
                                      refreshData();
                                    }}
                                    className="px-3 py-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-100 transition-all font-black text-xs"
                                  >
                                    Reset
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeletePublicResource(item.id)}
                                  className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-rose-50 hover:text-rose-500 transition-all"
                                  title="Delete public resource"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan="5" className="py-16 text-center text-slate-400 font-medium">No public resources found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === "users" && (
                <motion.div key="tab-users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-xl">
                  <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
                    <Users className="w-7 h-7 text-blue-500" /> User Directory & Security
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Student Info</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Auth Points</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Risk Status</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 text-right">Access</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {users.map((user) => (
                          <tr key={user._uniqueId || user.id} className="group">
                            <td className="py-5 px-4 font-bold text-slate-800">{user.name} <div className="text-[10px] text-slate-400">{user.id} • {user.dept}</div></td>
                            <td className="py-5 px-4 font-black text-emerald-600">🪙 {user.points}</td>
                            <td className="py-5 px-4">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${user.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                }`}>{user.status}</span>
                            </td>
                            <td className="py-5 px-4 text-right">
                              <button
                                onClick={() => handleUserStatus(user.id, user.status === "Active" ? "Blocked" : "Active")}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${user.status === "Active" ? "bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white" : "bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-600 hover:text-white"
                                  }`}
                              >
                                {user.status === "Active" ? "Restrict Account" : "Unblock Student"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === "messages" && (
                <motion.div key="tab-messages" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}>
                  <AdminChat currentUser={users.find(u => u.email === authEmail)} />
                </motion.div>
              )}

              {activeTab === "settings" && (
                <motion.div key="tab-settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-xl">
                    <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-indigo-500" /> Platform Security</h2>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                        <div><p className="font-bold text-slate-800 text-sm">Maintenance Mode</p><p className="text-[10px] text-slate-400 font-medium tracking-tight">Offline site for everyone except admins</p></div>
                        <button onClick={() => handleUpdateSettings("maintenanceMode", !settings.maintenanceMode)} className={`w-12 h-6 rounded-full transition-colors relative ${settings.maintenanceMode ? "bg-rose-500" : "bg-slate-300"}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.maintenanceMode ? "left-7" : "left-1"}`} /></button>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                        <div><p className="font-bold text-slate-800 text-sm">User Registrations</p><p className="text-[10px] text-slate-400 font-medium tracking-tight">Allow new students to join the ecosystem</p></div>
                        <button onClick={() => handleUpdateSettings("newRegistrations", !settings.newRegistrations)} className={`w-12 h-6 rounded-full transition-colors relative ${settings.newRegistrations ? "bg-uiu-emerald" : "bg-slate-300"}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.newRegistrations ? "left-7" : "left-1"}`} /></button>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-xl">
                    <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><CreditCard className="w-5 h-5 text-amber-500" /> Economy Controls</h2>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Points Graded per Share</label>
                      <input
                        type="number"
                        value={settings.pointsPerDonation}
                        onChange={(e) => handleUpdateSettings("pointsPerDonation", e.target.value)}
                        className="w-full px-5 py-3 rounded-xl bg-slate-50 border border-slate-100 font-black text-slate-700 outline-none focus:bg-white transition-all"
                      />
                      <p className="text-[10px] text-slate-400 italic">Adjusting this will affect future reward calculations across the entire system.</p>
                      <button className="w-full py-4 mt-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-black text-xs shadow-lg transition-all">Save Core Configuration</button>
                    </div>
                  </div>
                  <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 shadow-xl">
                    <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><Settings className="w-5 h-5 text-sky-500" /> Integrations & APIs</h2>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">SMS Gateway IP / Endpoint</label>
                      <input
                        type="text"
                        value={smsGatewayEndpoint || ""}
                        onChange={(e) => setSmsGatewayEndpoint(e.target.value)}
                        className="w-full px-5 py-3 rounded-xl bg-slate-50 border border-slate-100 font-black text-slate-700 outline-none focus:bg-white transition-all"
                        placeholder="http://192.168.0.216:8082"
                      />
                      <p className="text-[10px] text-slate-400 italic">This endpoint will be used for all live SMS broadcasts. Must include http://</p>
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch("http://127.0.0.1:8080/api/admin/broadcast/config", {
                              method: "POST",
                              headers: { "Content-Type": "application/x-www-form-urlencoded" },
                              body: `endpoint=${encodeURIComponent(smsGatewayEndpoint)}`
                            });
                            if (res.ok) alert("SMS Gateway Endpoint Saved!");
                            else alert("Failed to save config.");
                          } catch (e) {
                            alert("Network error.");
                          }
                        }}
                        className="w-full py-4 mt-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-black text-xs shadow-lg transition-all"
                      >
                        Save Gateway Config
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.main>
        )}
      </AnimatePresence>
      {/* ADMIN AUTH MODAL */}
      <AnimatePresence>
        {showAdminAuth && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden"
            >
              {/* Background Accents */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-uiu-emerald/10 blur-3xl rounded-full" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-uiu-orange/10 blur-3xl rounded-full" />

              <div className="relative z-10 text-center mb-8">
                <div className="w-16 h-16 bg-uiu-emerald/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-uiu-emerald/20">
                  <ShieldCheck className="w-8 h-8 text-uiu-emerald" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Admin Verification</h2>
                <p className="text-sm font-bold text-slate-400 mt-2">Authorized personnel only</p>
              </div>

              <div className="space-y-4 relative z-10">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Gmail</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      placeholder="admin@gmail.com"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-uiu-emerald/20 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-uiu-emerald/20 transition-all text-sm"
                    />
                  </div>
                </div>

                {authError && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-rose-500 text-[10px] font-black uppercase text-center tracking-widest bg-rose-50 py-2 rounded-lg">{authError}</motion.p>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowAdminAuth(false);
                      setAuthError("");
                    }}
                    className="flex-1 py-4 font-black text-slate-400 uppercase tracking-widest text-[10px] hover:text-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch("http://127.0.0.1:8080/api/admin/auth/login", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({ email: authEmail, password: authPassword }),
                        });

                        if (response.ok) {
                          setUserRole("admin");
                          setShowAdminAuth(false);
                          setAuthError("");
                          setAuthEmail("");
                          setAuthPassword("");
                        } else {
                          setAuthError("Invalid Admin Credentials");
                        }
                      } catch (err) {
                        setAuthError("Network error. Is backend running?");
                        console.error(err);
                      }
                    }}
                    className="flex-[2] py-4 bg-uiu-emerald text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Authorize Access
                  </button>
                </div>

                <div className="text-center pt-6">
                  <Link
                    href="/admin-register"
                    onClick={() => setShowAdminAuth(false)}
                    className="text-[10px] font-black text-uiu-orange hover:underline decoration-2 underline-offset-4 uppercase tracking-widest"
                  >
                    Request Admin Access
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ACTIVE CAMPAIGNS MODAL ── */}
      <AnimatePresence>
        {showCampaignModal && (
          <motion.div
            key="campaign-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCampaignModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-white/80 backdrop-blur-2xl border border-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-8 pt-8 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-uiu-emerald rounded-2xl text-white shadow-lg shadow-emerald-500/20">
                    <Rocket className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800">Active Campaigns</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{campaigns.length} running drives</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCampaignModal(false)}
                  className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Campaign List */}
              <div className="px-8 py-6 flex flex-col gap-4 max-h-[60vh] overflow-y-auto no-scrollbar">
                {campaigns.length > 0 ? campaigns.map((c) => (
                  <motion.div
                    key={c._uniqueId || c.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="group flex items-center justify-between p-5 rounded-2xl bg-white/60 border border-white hover:bg-white/90 shadow-sm transition-all"
                  >
                    <div className="flex flex-col gap-1 flex-1 mr-4">
                      <span className="text-base font-black text-slate-800">{c.title}</span>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {c.items || `${c.collected}/${c.goal} Items`}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-uiu-emerald text-[10px] font-black border border-emerald-100">
                          {c.donors ?? 0} Donors
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-black border border-amber-100">
                          {c.daysLeft ?? "—"} days left
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-uiu-emerald to-teal-400 rounded-full transition-all"
                          style={{ width: `${c.progress ?? 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditCampaign(c)}
                        className="w-10 h-10 rounded-xl bg-slate-50 text-slate-300 flex items-center justify-center hover:bg-emerald-50 hover:text-uiu-emerald hover:scale-105 active:scale-95 transition-all shadow-sm"
                        title="Edit Campaign"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCampaign(c.id)}
                        className="w-10 h-10 rounded-xl bg-slate-50 text-slate-300 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 hover:scale-105 active:scale-95 transition-all shadow-sm"
                        title="Delete Campaign"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )) : (
                  <div className="py-16 flex flex-col items-center gap-4 text-center">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center">
                      <Rocket className="w-7 h-7 text-slate-200" />
                    </div>
                    <p className="text-sm font-bold text-slate-400">No active campaigns yet.</p>
                    <p className="text-xs text-slate-300 font-medium">Launch one using the form on the left.</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-8 pb-8 pt-2">
                <button
                  onClick={() => setShowCampaignModal(false)}
                  className="w-full py-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-500 font-black text-[11px] uppercase tracking-widest transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ITEM REVIEW MODAL */}
      <AnimatePresence>
        {selectedItemForReview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setSelectedItemForReview(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-uiu-emerald" /> Review Post Details
                </h3>
                <button onClick={() => setSelectedItemForReview(null)} className="p-2 text-slate-400 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 flex flex-col gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resource Title</p>
                  <p className="text-base font-bold text-slate-800">{selectedItemForReview.title}</p>
                </div>
                {selectedItemForReview.description && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Description</p>
                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl mt-1">{selectedItemForReview.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Posted By</p>
                    <p className="text-sm font-bold text-slate-700">{selectedItemForReview.postedBy}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subject/Condition</p>
                    <p className="text-sm font-bold text-uiu-emerald">{selectedItemForReview.subject} - {selectedItemForReview.condition}</p>
                  </div>
                </div>

                {/* SHOW ITEM IMAGE IF EXISTS */}
                {selectedItemForReview.image && (
                  <div className="mt-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Item Image</p>
                    <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 aspect-video flex items-center justify-center">
                      <img src={selectedItemForReview.image} alt="Preview" className="w-full h-full object-contain" />
                    </div>
                  </div>
                )}

                {(selectedItemForReview.downloadUrl || selectedItemForReview.fileName) && (
                  <div className="mt-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Attached Document</p>
                    <a
                      href={
                        selectedItemForReview.downloadUrl?.startsWith("http")
                          ? selectedItemForReview.downloadUrl
                          : `http://127.0.0.1:8080/api/resources/download/${selectedItemForReview.fileName}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3.5 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 rounded-xl font-black text-xs transition-all shadow-sm group"
                    >
                      <Download className="w-4 h-4 group-hover:scale-110 transition-transform" /> Download / View File
                    </a>
                  </div>
                )}
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
                <button
                  onClick={() => {
                    handleItemAction(selectedItemForReview.id, "Approved");
                    setSelectedItemForReview(null);
                  }}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
                >
                  <Check className="w-4 h-4" /> Approve Post
                </button>
                <button
                  onClick={() => {
                    handleItemAction(selectedItemForReview.id, "Rejected");
                    setSelectedItemForReview(null);
                  }}
                  className="flex-1 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <X className="w-4 h-4" /> Reject Post
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

