export function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  for (let i = 0; i < arr.length; i += 0x8000) {
    bin += String.fromCharCode(...arr.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

export function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  return fromBase64(b64);
}

export function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(length);
  crypto.getRandomValues(b);
  return b;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function utf8Encode(s: string): Uint8Array<ArrayBuffer> {
  return encoder.encode(s);
}

export function utf8Decode(b: ArrayBuffer | Uint8Array): string {
  return decoder.decode(b);
}
