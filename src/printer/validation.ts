// Strict printer address validation helpers

export function validateIPAddress(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false;
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;
  for (const p of parts) {
    if (!/^[0-9]+$/.test(p)) return false;
    const n = Number(p);
    if (!Number.isFinite(n) || n < 0 || n > 255) return false;
    // prevent leading zeros like "01"? allow though; keep simple
    if (p.length > 1 && p.startsWith('0')) {
      // disallow octal-style leading zeros
      return false;
    }
  }
  return true;
}

export function validatePort(port: string | number): boolean {
  const n = typeof port === 'string' ? Number(port) : port;
  if (!Number.isFinite(n)) return false;
  if (!Number.isInteger(n)) return false;
  return n >= 1 && n <= 65535;
}

export default { validateIPAddress, validatePort };
