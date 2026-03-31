/**
 * Domain detection utility for routing between B2C and B2B hospital portal.
 * 
 * hospital.sentio.in.net → B2B hospital portal
 * sentio.in.net (and everything else) → B2C consumer app
 */

const HOSPITAL_HOSTNAMES = [
  'hospital.sentio.in.net',
  'www.hospital.sentio.in.net',
];

export function isHospitalPortal(): boolean {
  const hostname = window.location.hostname;
  
  // Check for hospital subdomain
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
