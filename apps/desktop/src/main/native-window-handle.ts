/**
 * Electron exposes native window handles as little-endian buffers. Converting
 * them once in a small helper keeps all HWND logging consistent.
 */
export function formatNativeWindowHandle(handle: Uint8Array | ArrayBuffer): string {
  const bytes = handle instanceof Uint8Array ? handle : new Uint8Array(handle);
  let value = 0n;

  for (let index = 0; index < bytes.length; index += 1) {
    value |= BigInt(bytes[index] ?? 0) << (BigInt(index) * 8n);
  }

  return `0x${value.toString(16).toUpperCase()}`;
}
