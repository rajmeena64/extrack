export function clearClientStorage() {
  try {
    document.cookie.split(";").forEach((cookie) => {
      const cookieName = cookie.split("=")[0]?.trim();
      if (!cookieName) return;

      document.cookie = `${cookieName}=; Max-Age=0; path=/`;
      document.cookie = `${cookieName}=; Max-Age=0; path=/; SameSite=Lax`;
    });
  } catch {
    // HttpOnly cookies are cleared by the backend logout endpoint.
  }

  try {
    localStorage.clear();
  } catch {
    // Ignore storage cleanup failures.
  }

  try {
    sessionStorage.clear();
  } catch {
    // Ignore storage cleanup failures.
  }
}
