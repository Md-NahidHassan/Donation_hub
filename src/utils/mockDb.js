/**
 * EcoKnot Mock Database Utility
 * This centralized manager handles persistent state in localStorage.
 * Switch these functions to real API calls when connecting to a backend.
 */

const KEYS = {
  CAMPAIGNS: "ecoKnot_campaigns",
  ITEMS: "ecoKnot_items",
  USERS: "ecoKnot_users",
  ADMINS: "ecoKnot_admins",
  SETTINGS: "ecoKnot_settings",
  EXTRAS: "ecoKnot_campaign_extras"
};

export const mockDb = {
  parseJavaDate: (dateVal) => {
    if (!dateVal) return new Date(NaN);
    if (Array.isArray(dateVal)) {
      const [year, month, day, hour, minute, second] = dateVal;
      return new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
    }
    if (typeof dateVal === 'string') {
      if (dateVal.startsWith('[') && dateVal.endsWith(']')) {
        try {
          const arr = JSON.parse(dateVal);
          if (Array.isArray(arr)) {
            const [year, month, day, hour, minute, second] = arr;
            return new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
          }
        } catch (e) {}
      }
    }
    return new Date(dateVal);
  },

  saveCampaignExtras: (title, extras) => {
    if (typeof window === "undefined") return;

    // Strip base64 image data — these are large blobs that quickly overflow
    // the 5 MB localStorage quota. Backend URLs are kept; data: URIs are dropped.
    const stripBase64 = (val) => {
      if (typeof val === 'string' && val.startsWith('data:')) return null;
      return val;
    };

    const sanitized = {
      ...extras,
      image: stripBase64(extras.image),
      paymentQRs: Array.isArray(extras.paymentQRs)
        ? extras.paymentQRs.map(qr => ({ ...qr, image: stripBase64(qr.image), preview: stripBase64(qr.preview) }))
        : extras.paymentQRs,
    };

    const existing = JSON.parse(localStorage.getItem(KEYS.EXTRAS) || '{}');
    existing[title] = sanitized;

    // Try to save; if still over quota, evict the oldest entry and retry once.
    try {
      localStorage.setItem(KEYS.EXTRAS, JSON.stringify(existing));
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        const keys = Object.keys(existing);
        if (keys.length > 1) {
          // Remove the first (oldest) key and retry
          delete existing[keys[0]];
          try {
            localStorage.setItem(KEYS.EXTRAS, JSON.stringify(existing));
          } catch (_) {
            // Still failing — clear the entire extras bucket and store only this entry
            try {
              localStorage.setItem(KEYS.EXTRAS, JSON.stringify({ [title]: sanitized }));
            } catch (__) {
              console.warn('localStorage quota exceeded even after cleanup. Skipping extras save.');
            }
          }
        } else {
          // Only one entry and it's still too big — skip silently
          console.warn('localStorage quota exceeded. Skipping extras save for:', title);
        }
      }
    }
  },
  getCampaignExtras: (title) => {
    if (typeof window === "undefined") return null;
    const existing = JSON.parse(localStorage.getItem(KEYS.EXTRAS) || '{}');
    return existing[title] || null;
  },

  mapCampaign: (c) => {
    if (!c) return null;
    const isBackend = c.id && parseInt(c.id) < 1000000000;
    const extra = mockDb.getCampaignExtras(c.title) || mockDb.getCampaignExtras(c.id?.toString()) || {};

    // 1. Cover Image: Prioritize backend imagePath / image, then extra.image
    let imageUrl = c.imagePath || c.image || extra.image;
    if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('blob:') && !imageUrl.startsWith('data:')) {
      imageUrl = `http://localhost:8080/${imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl}`;
    }

    // 2. Goal: Prioritize backend goal, then extra.goal
    let goal = c.goal !== undefined && c.goal !== null ? c.goal : (extra.goal || 0);

    // 3. Progress: Prioritize backend progress. If null/undefined, calculate using collected and goal
    let progress = c.progress;
    if (progress === undefined || progress === null) {
      const parsedGoal = parseFloat(goal) || 0;
      const collected = parseFloat(c.collected) || 0;
      progress = parsedGoal > 0 ? Math.round((collected / parsedGoal) * 100) : 0;
    }

    // 4. Duration: Prioritize backend duration, then extra.duration
    const durationDays = parseInt(c.duration !== undefined && c.duration !== null ? c.duration : (extra.duration || 30));

    // 5. End Time: Prioritize backend endTime, then extra.endTime. Fallback to createdAt + duration.
    let endTime = c.endTime || extra.endTime;
    if (!endTime && (c.createdAt || extra.createdAt)) {
      const start = mockDb.parseJavaDate(c.createdAt || extra.createdAt).getTime();
      endTime = new Date(start + durationDays * 86400000).toISOString();
    } else if (!endTime) {
      endTime = new Date(Date.now() + durationDays * 86400000).toISOString();
    }

    const endMs = mockDb.parseJavaDate(endTime).getTime();
    // Always normalize endTime to an ISO string so downstream code can safely do `new Date(endTime)`
    // This is critical because the backend returns LocalDateTime as arrays like [2026,5,25,20,26,48]
    if (!isNaN(endMs)) {
      endTime = new Date(endMs).toISOString();
    }
    const nowMs = Date.now();
    const daysLeft = Math.max(0, Math.ceil((endMs - nowMs) / 86400000));

    // Update local storage for this campaign key so countdown is in sync
    const key = c.id?.toString() || c.title;
    if (key && typeof window !== "undefined") {
      try {
        localStorage.setItem(`ecoKnot_endTime_${key}`, String(endMs));
      } catch (e) {}
    }

    // 6. Expiry status
    const isExpired = daysLeft <= 0;

    // 7. Payment QRs & Bank Accounts
    let rawQRs = c.paymentQRs;
    if (typeof rawQRs === 'string') {
      try { rawQRs = JSON.parse(rawQRs); } catch (e) { rawQRs = []; }
    }
    if (!Array.isArray(rawQRs)) {
      rawQRs = [];
    }

    let parsedQRs = [];
    let parsedBanks = [];

    // Parse from backend paymentQRs
    if (rawQRs.length > 0) {
      rawQRs.forEach(item => {
        if (item.provider === "Bank") {
          const parts = (item.accountDetails || "").split(" | ");
          parsedBanks.push({
            id: item.id || Date.now() + Math.random(),
            bankName: parts[0] || "",
            branch: parts[1] || "N/A",
            accountName: parts[2] || "",
            accountNumber: parts[3] || ""
          });
        } else {
          let qrUrl = item.qrImagePath || item.image;
          if (qrUrl && !qrUrl.startsWith('http') && !qrUrl.startsWith('blob:') && !qrUrl.startsWith('data:')) {
            qrUrl = `http://localhost:8080/${qrUrl.startsWith('/') ? qrUrl.slice(1) : qrUrl}`;
          }
          parsedQRs.push({
            id: item.id || Date.now() + Math.random(),
            provider: item.provider,
            number: item.accountDetails || item.number || "",
            image: qrUrl,
            preview: qrUrl
          });
        }
      });
    }

    // Fallback/Overlay with local storage extras if they are present and backend list was empty
    if (parsedQRs.length === 0 && extra.paymentQRs && extra.paymentQRs.length > 0) {
      parsedQRs = extra.paymentQRs.map((qr, idx) => ({
        id: qr.id || idx,
        provider: qr.provider,
        number: qr.number,
        image: qr.image,
        preview: qr.image
      }));
    }
    if (parsedBanks.length === 0 && extra.bankAccounts && extra.bankAccounts.length > 0) {
      parsedBanks = extra.bankAccounts.map((b, idx) => ({
        id: b.id || idx,
        bankName: b.bankName,
        branch: b.branch || "N/A",
        accountName: b.accountName,
        accountNumber: b.accountNumber
      }));
    }

    // 8. Reactions & Views
    const cId = c.id?.toString() || c.title || '';
    let storedReactions = {};
    let storedViewCount = 0;
    if (typeof window !== "undefined") {
      try {
        storedReactions = JSON.parse(localStorage.getItem(`campaign_reactions_${cId}`) || '{}');
        storedViewCount = parseInt(localStorage.getItem(`campaign_viewCount_${cId}`) || '0');
      } catch (e) {}
    }

    return {
      ...c,
      _uniqueId: isBackend ? `backend-${c.id}` : `mock-${c.id || Date.now()}`,
      image: imageUrl,
      goal: goal,
      progress: progress,
      daysLeft: daysLeft,
      endTime: endTime,
      duration: durationDays,
      isExpired: isExpired,
      sslCommerzEnabled: c.sslCommerzEnabled !== undefined ? c.sslCommerzEnabled : (extra.sslCommerzEnabled !== undefined ? extra.sslCommerzEnabled : true),
      paymentQRs: parsedQRs,
      bankAccounts: parsedBanks,
      likeCount: storedReactions.LIKE ?? c.likeCount ?? 0,
      loveCount: storedReactions.LOVE ?? c.loveCount ?? 0,
      sadCount: storedReactions.SAD ?? c.sadCount ?? 0,
      viewCount: Math.max(storedViewCount, c.viewCount || 0)
    };
  },

  /**
   * Returns true if a campaign's countdown has ended.
   * Uses the same persisted endTime key that campaign-details stores,
   * so the expiry check is perfectly in sync with the countdown timer.
   */
  isCampaignExpired: (campaign) => {
    if (typeof window === "undefined") return false;
    // 1. Prioritize campaign.endTime if present and valid
    if (campaign.endTime) {
      const time = mockDb.parseJavaDate(campaign.endTime).getTime();
      if (!isNaN(time)) return time <= Date.now();
    }
    const key = campaign.id?.toString() || campaign.title;
    // 2. Fallback to persisted/cached endTime
    const stored = localStorage.getItem(`ecoKnot_endTime_${key}`);
    if (stored) {
      if (/^\d+$/.test(stored) && stored.length > 10) {
        return parseInt(stored) <= Date.now();
      }
      const time = mockDb.parseJavaDate(stored).getTime();
      if (!isNaN(time)) return time <= Date.now();
    }
    // 3. Fallback: daysLeft (only if it's a valid number)
    if (typeof campaign.daysLeft === 'number') return campaign.daysLeft <= 0;
    return false;
  },
  // --- CAMPAIGNS ---
  getCampaigns: () => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem(KEYS.CAMPAIGNS);
    return saved ? JSON.parse(saved) : [];
  },

  addCampaign: (campaign) => {
    const existing = mockDb.getCampaigns();
    const newList = [...existing, { ...campaign, id: Date.now(), status: "Live", progress: 0, collected: 0 }];
    localStorage.setItem(KEYS.CAMPAIGNS, JSON.stringify(newList));
    return newList;
  },

  deleteCampaign: (id) => {
    const existing = mockDb.getCampaigns();
    const newList = existing.filter(c => c.id.toString() !== id.toString());
    localStorage.setItem(KEYS.CAMPAIGNS, JSON.stringify(newList));
    return newList;
  },

  updateCampaign: (id, updatedFields) => {
    const existing = mockDb.getCampaigns();
    const newList = existing.map(c => c.id.toString() === id.toString() ? { ...c, ...updatedFields } : c);
    localStorage.setItem(KEYS.CAMPAIGNS, JSON.stringify(newList));
    return newList;
  },

  // --- MARKETPLACE ITEMS ---
  getItems: () => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem(KEYS.ITEMS);
    return saved ? JSON.parse(saved) : [];
  },

  addItem: (item) => {
    const existing = mockDb.getItems();
    const newItem = {
      ...item, 
      id: Date.now(), 
      status: "Pending", 
      postedDate: new Date().toISOString().split('T')[0],
      description: item.description || "",
      downloadUrl: item.downloadUrl || null,
      fileName: item.fileName || null,
      fileType: item.fileType || null,
      fileSize: item.fileSize || null,
    };
    const newList = [...existing, newItem];
    localStorage.setItem(KEYS.ITEMS, JSON.stringify(newList));
    return newItem;
  },


  updateItemStatus: (id, status) => {
    const existing = mockDb.getItems();
    const newList = existing.map(item => item.id.toString() === id.toString() ? { ...item, status } : item);
    localStorage.setItem(KEYS.ITEMS, JSON.stringify(newList));
    return newList;
  },

  deleteItem: (id) => {
    const existing = mockDb.getItems();
    const newList = existing.filter(item => item.id.toString() !== id.toString());
    localStorage.setItem(KEYS.ITEMS, JSON.stringify(newList));
    return newList;
  },

  getItemById: (id) => {
    const items = mockDb.getItems();
    return items.find(item => item.id === Number(id)) || null;
  },

  // --- USERS ---
  getUsers: () => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem(KEYS.USERS);
    return saved ? JSON.parse(saved) : [
      { id: "0112310467", name: "Md. Nahid Hassan", dept: "CSE", status: "Active", points: 450 },
      { id: "0112310470", name: "Sarah Malik", dept: "EEE", status: "Active", points: 280 },
      { id: "0112310502", name: "Abir Tahmid", dept: "Pharmacy", status: "Active", points: 120 }
    ];
  },

  updateUserStatus: (id, status) => {
    const existing = mockDb.getUsers();
    const newList = existing.map(user => user.id.toString() === id.toString() ? { ...user, status } : user);
    localStorage.setItem(KEYS.USERS, JSON.stringify(newList));
    return newList;
  },

  addUser: (user) => {
    const existing = mockDb.getUsers();
    // Avoid duplicates
    if (existing.some(u => u.id.toString() === user.id.toString())) return existing;
    const newList = [...existing, { status: "Active", points: 0, ...user }];
    localStorage.setItem(KEYS.USERS, JSON.stringify(newList));
    return newList;
  },

  // --- ADMINS ---
  getAdmins: () => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem(KEYS.ADMINS);
    return saved ? JSON.parse(saved) : [
      { email: "admin@gmail.com", password: "admin123" },
      { email: "mhassan2310467@bscse.uiu.ac.bd", password: "admin123" }
    ];
  },

  addAdmin: (admin) => {
    const existing = mockDb.getAdmins();
    const newList = [...existing, admin];
    localStorage.setItem(KEYS.ADMINS, JSON.stringify(newList));
    return newList;
  },

  // --- SYSTEM SETTINGS ---
  getSettings: () => {
    if (typeof window === "undefined") return {};
    const saved = localStorage.getItem(KEYS.SETTINGS);
    return saved ? JSON.parse(saved) : {
      siteName: "EcoKnot",
      maintenanceMode: false,
      newRegistrations: true,
      pointsPerDonation: 50,
      sslCommerzEnabled: true
    };
  },

  updateSettings: (newSettings) => {
    const existing = mockDb.getSettings();
    const updated = { ...existing, ...newSettings };
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  }
};
