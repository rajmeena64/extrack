export function clearClientStorage() {
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
