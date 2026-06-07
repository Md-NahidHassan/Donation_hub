"use client";

import { useState, useEffect } from "react";
import { User } from "lucide-react";

// Global cache to avoid duplicate fetches
let globalAvatarMap = null;
let fetchPromise = null;

export default function UserAvatar({ email, name, className, iconClassName = "w-5 h-5", fallbackIsImage = false }) {
    const [avatarUrl, setAvatarUrl] = useState(null);

    useEffect(() => {
        if (!email) return;

        // Function to resolve the avatar
        const resolveAvatar = async () => {
            // First check if current user matches, to instantly show own avatar
            if (typeof window !== "undefined") {
                try {
                    const str = localStorage.getItem("user");
                    if (str) {
                        const u = JSON.parse(str);
                        if (u.email === email && (u.profileImageUrl || u.image)) {
                            setAvatarUrl(u.profileImageUrl || u.image);
                            return;
                        }
                    }
                } catch (e) {}
            }

            if (globalAvatarMap) {
                if (globalAvatarMap[email]) setAvatarUrl(globalAvatarMap[email]);
                return;
            }

            if (!fetchPromise) {
                fetchPromise = fetch("http://localhost:8080/api/users")
                    .then(res => res.json())
                    .then(data => {
                        const map = {};
                        if (Array.isArray(data)) {
                            data.forEach(u => {
                                if (u.email) {
                                    map[u.email] = u.profileImageUrl || u.image || null;
                                }
                            });
                        }
                        globalAvatarMap = map;
                        return map;
                    })
                    .catch(() => ({}));
            }

            const map = await fetchPromise;
            if (map[email]) {
                setAvatarUrl(map[email]);
            }
        };

        resolveAvatar();
    }, [email]);

    if (avatarUrl) {
        return (
            <img 
                src={avatarUrl} 
                alt={name || "User"} 
                className={`${className || ""} object-cover`} 
            />
        );
    }

    if (fallbackIsImage) {
        // If the wrapper is an img tag normally, we should probably output null or generic data URL?
        // But usually we apply this inside a div wrap. 
        // We'll trust the parent has a container and we just return the icon.
        return <User className={iconClassName} />;
    }

    // Default icon mode
    return <User className={iconClassName} />;
}
