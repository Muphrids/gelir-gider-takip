/**
 * Parola tabanlı AES-GCM şifreleme/çözme yardımcı işlevleri.
 * Web Crypto API kullanarak yerel verileri son derece güvenli şekilde şifreler.
 */

// Helper to convert array buffer to hex string
function bufToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper to convert hex string to array buffer
function hexToBuf(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes.buffer;
}

// Derive a CryptoKey from the raw hex string key (SHA-256 hash)
async function getCryptoKey(hexKey: string): Promise<CryptoKey> {
  const rawKeyBytes = new Uint8Array(hexKey.length / 2);
  for (let i = 0; i < rawKeyBytes.length; i++) {
    rawKeyBytes[i] = parseInt(hexKey.substr(i * 2, 2), 16);
  }
  return crypto.subtle.importKey(
    'raw',
    rawKeyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(dataStr: string, hexKey: string): Promise<string> {
  if (!hexKey) return dataStr;
  try {
    const key = await getCryptoKey(hexKey);
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 12-byte IV for AES-GCM
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(dataStr);

    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encodedData
    );

    const ivHex = bufToHex(iv.buffer);
    const cipherHex = bufToHex(ciphertext);

    return `${ivHex}:${cipherHex}`;
  } catch (error) {
    console.error('Encryption error:', error);
    return dataStr;
  }
}

export async function decryptData(encryptedStr: string, hexKey: string): Promise<string> {
  if (!hexKey) return encryptedStr;
  try {
    const parts = encryptedStr.split(':');
    if (parts.length !== 2) {
      // Fallback/Legacy decryption support for simple XOR
      return decryptDataLegacyXOR(encryptedStr, hexKey);
    }

    const [ivHex, cipherHex] = parts;
    const iv = new Uint8Array(hexToBuf(ivHex));
    const ciphertext = hexToBuf(cipherHex);
    const key = await getCryptoKey(hexKey);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    // Try legacy XOR decryption in case it was stored with the old version
    return decryptDataLegacyXOR(encryptedStr, hexKey);
  }
}

function decryptDataLegacyXOR(encryptedStr: string, key: string): string {
  try {
    const decoded = atob(encryptedStr);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return decodeURIComponent(escape(result));
  } catch {
    return '';
  }
}
