function clearCookies() {
  try {
    const hostParts = window.location.hostname.split('.');
    const domainCandidates = hostParts
      .map((_, index) => `.${hostParts.slice(index).join('.')}`)
      .filter((domain) => domain.includes('.'));
    const pathCandidates = ['/', window.location.pathname || '/'];

    document.cookie.split(";").forEach((cookie) => {
      const cookieName = cookie.split("=")[0]?.trim();
      if (!cookieName) return;

      pathCandidates.forEach((path) => {
        document.cookie = `${cookieName}=; Max-Age=0; path=${path}`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;

        domainCandidates.forEach((domain) => {
          document.cookie = `${cookieName}=; Max-Age=0; path=${path}; domain=${domain}`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; domain=${domain}`;
        });
      });
    });
  } catch {
    // HttpOnly cookies are cleared by the backend logout endpoint.
  }
}

function clearWebCaches() {
  try {
    if (!('caches' in window)) return;

    window.caches
      .keys()
      .then((cacheNames) => Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName))))
      .catch(() => null);
  } catch {
    // Cache API may be unavailable or blocked.
  }
}

export function clearClientStorage() {
  clearCookies();

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

  clearWebCaches();
}
