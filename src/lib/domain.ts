/**
 * Domain detection utility for routing between B2C and B2B hospital portal.
 * 
 * hospital.sentio.in.net → B2B hospital portal (top-level routes)
 * sentio.in.net (and everything else) → B2C consumer app (routes under /b2b/)
 */

const HOSPITAL_HOSTNAMES = [
  'hospital.sentio.in.net',
  'www.hospital.sentio.in.net',
];

export function isHospitalPortal(): boolean {
  const hostname = window.location.hostname;
  
  if (HOSPITAL_HOSTNAMES.includes(hostname)) {
    return true;
  }
  
  // Dev mode: allow ?portal=hospital query param for testing
  if (import.meta.env.DEV) {
    const params = new URLSearchParams(window.location.search);
    return params.get('portal') === 'hospital';
  }
  
  return false;
}

/**
 * Returns the correct path prefix for B2B routes.
 * On hospital subdomain: "" (top-level)
 * On main domain: "/b2b"
 */
export function b2bPrefix(): string {
  return isHospitalPortal() ? '' : '/b2b';
}

/**
 * Build a B2B path that works on both domains.
 * b2bPath('/dashboard') → '/dashboard' on hospital subdomain, '/b2b/dashboard' on main domain
 */
export function b2bPath(path: string): string {
  return `${b2bPrefix()}${path}`;
}
