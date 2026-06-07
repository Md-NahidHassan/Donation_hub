/**
 * Shared user utility for EcoKnot frontend.
 * Normalizes the user object from localStorage so profile images
 * work consistently everywhere. Settings saves as 'profileImageUrl',
 * this helper makes both 'image' and 'profileImageUrl' available.
 */

export function getCurrentUser() {
  if (typeof window === "undefined") return null;
  try {
    const str = localStorage.getItem("user");
    if (!str) return null;
    const u = JSON.parse(str);
    // Normalize: support both 'profileImageUrl' (settings) and 'image' (legacy)
    const avatar = u.profileImageUrl || u.image || null;
    return { ...u, image: avatar, profileImageUrl: avatar };
  } catch {
    return null;
  }
}

export function getProfileImage(user) {
  if (!user) return null;
  return user.profileImageUrl || user.image || null;
}
