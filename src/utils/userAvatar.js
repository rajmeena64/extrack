export function getGoogleProfilePicture(user) {
  const provider = String(user?.authProvider || '').toLowerCase();
  const profilePicture = String(user?.profilePicture || '').trim();

  if (!provider.includes('google') || !profilePicture) return null;

  try {
    const url = new URL(profilePicture);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}
