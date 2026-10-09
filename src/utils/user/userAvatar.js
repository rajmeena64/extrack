export function getUserAvatar(user) {
  const profilePicture = String(user?.profilePicture || user?.avatarUrl || '').trim();
  if (profilePicture) {
    try {
      const url = new URL(profilePicture);
      if (url.protocol === 'https:' || url.protocol === 'http:') return url.toString();
    } catch {}
  }
  return null;
}

export function getGoogleProfilePicture(user) {
  return getUserAvatar(user);
}
