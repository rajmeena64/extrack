const OBFUSCATION_PREFIX = "v1.";
const OBFUSCATION_SALT = "Entrack.Settings.2026";
const LEGACY_OBFUSCATION_SALT = ["Ex", "track.Settings.2026"].join("");

const toBase64Url = (binary) => (
  btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "")
);

const fromBase64Url = (value) => {
  const base64 = String(value || "")
    .replaceAll("-", "+")
    .replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return atob(padded);
};

const bytesToBinary = (bytes) => {
  let binary = "";

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return binary;
};

const binaryToBytes = (binary) => {
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

const xorBytes = (bytes, salt = OBFUSCATION_SALT) => {
  const saltBytes = new TextEncoder().encode(salt);

  return bytes.map((byte, index) => byte ^ saltBytes[index % saltBytes.length]);
};

export function encodeStorageValue(value) {
  const json = JSON.stringify(value ?? null);
  const bytes = new TextEncoder().encode(json);
  return `${OBFUSCATION_PREFIX}${toBase64Url(bytesToBinary(xorBytes(bytes)))}`;
}

export function decodeStorageValue(value) {
  if (typeof value !== "string" || !value.startsWith(OBFUSCATION_PREFIX)) {
    return null;
  }

  const encoded = value.slice(OBFUSCATION_PREFIX.length);
  const bytes = binaryToBytes(fromBase64Url(encoded));
  const salts = [OBFUSCATION_SALT, LEGACY_OBFUSCATION_SALT];

  for (const salt of salts) {
    try {
      const json = new TextDecoder().decode(xorBytes(bytes, salt));
      return JSON.parse(json);
    } catch {
      // Try the next salt for settings saved before the rename.
    }
  }

  return null;
}
