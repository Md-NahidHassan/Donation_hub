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
  saveCampaignExtras: (title, extras) => {
    if (typeof window === "undefined") return;
    const existing = JSON.parse(localStorage.getItem(KEYS.EXTRAS) || '{}');
    existing[title] = extras;
    localStorage.setItem(KEYS.EXTRAS, JSON.stringify(existing));
  },
  getCampaignExtras: (title) => {
    if (typeof window === "undefined") return null;
    const existing = JSON.parse(localStorage.getItem(KEYS.EXTRAS) || '{}');
    return existing[title] || null;
  },

  /**
   * Returns true if a campaign's countdown has ended.
   * Uses the same persisted endTime key that campaign-details stores,
   * so the expiry check is perfectly in sync with the countdown timer.
   */
  isCampaignExpired: (campaign) => {
    if (typeof window === "undefined") return false;
    const key = campaign.id?.toString() || campaign.title;
    // 1. Check persisted endTime (most reliable)
    const stored = localStorage.getItem(`ecoKnot_endTime_${key}`);
    if (stored) {
      // Robust check: Is it a numeric timestamp or an ISO string?
      if (/^\d+$/.test(stored) && stored.length > 10) {
        return parseInt(stored) <= Date.now();
      }
      const time = new Date(stored).getTime();
      if (!isNaN(time)) return time <= Date.now();
    }
    // 2. Fallback: use campaign.endTime
    if (campaign.endTime) {
      const time = new Date(campaign.endTime).getTime();
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
