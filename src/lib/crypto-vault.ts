import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * Field-level encryption at rest (AES-256-GCM) with key rotation.
 *
 * Keys come from `ENCRYPTION_KEYS` (JSON: { keyId: base64(32 bytes) }) and the
 * active key from `ENCRYPTION_ACTIVE_KEY_ID`. Ciphertext embeds the keyId, so
 * old values keep decrypting after a rotation. A clearly-warned dev key is used
 * when unset so the demo runs; production MUST set real keys.
 *
 * Used for provider tokens / connection secrets — never for values we can simply
 * mask (those are masked, not stored in full). No `server-only` import so the
 * round-trip is unit-testable; it is only ever imported by server code.
 */

let warned = false;

function loadKeys(): { keys: Record<string, Buffer>; activeId: string } {
  const raw = process.env.ENCRYPTION_KEYS;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      const keys: Record<string, Buffer> = {};
      for (const [id, b64] of Object.entries(parsed)) {
        const buf = Buffer.from(b64, "base64");
        if (buf.length === 32) keys[id] = buf;
      }
      const activeId = process.env.ENCRYPTION_ACTIVE_KEY_ID || Object.keys(keys)[0];
      if (activeId && keys[activeId]) return { keys, activeId };
    } catch {
      /* fall through to dev key */
    }
  }
  if (!warned && process.env.NODE_ENV === "production") {
    // eslint-disable-next-line no-console
    console.warn("[crypto-vault] ENCRYPTION_KEYS not set — using an insecure dev key. Set real keys in production.");
    warned = true;
  }
  // Deterministic dev key (NOT for production).
  const dev = Buffer.from("perx-dev-encryption-key-000000000".slice(0, 32));
  return { keys: { dev }, activeId: "dev" };
}

export function encryptField(plaintext: string): string {
  const { keys, activeId } = loadKeys();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keys[activeId], iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [activeId, iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(".");
}

export function decryptField(token: string): string | null {
  const { keys } = loadKeys();
  const [keyId, ivB64, tagB64, ctB64] = token.split(".");
  const key = keys[keyId];
  if (!key || !ivB64 || !tagB64 || !ctB64) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(ctB64, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** True if a real (non-dev) key set is configured. */
export function encryptionConfigured(): boolean {
  return Boolean(process.env.ENCRYPTION_KEYS);
}
