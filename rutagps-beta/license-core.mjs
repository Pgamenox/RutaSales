export const TIERS = Object.freeze([5,12,15,30]);
export function licenseState(license, now = new Date()) {
  if (!license || !TIERS.includes(license.capacity)) return 'INVALID';
  if (license.status === 'SUSPENDED') return 'SUSPENDED';
  if (license.status !== 'ACTIVE') return 'INACTIVE';
  const start=Date.parse(license.starts_at), end=Date.parse(license.expires_at);
  if (!Number.isFinite(start)||!Number.isFinite(end)||end<=start) return 'INVALID';
  const time=now.getTime();
  return time < start ? 'PENDING' : time >= end ? 'EXPIRED' : 'ACTIVE';
}
export function canAssign(license, activeWorkerIds, newWorkerId, now=new Date()) {
  if (licenseState(license,now)!=='ACTIVE') return {ok:false,reason:'LICENSE_NOT_ACTIVE'};
  if (typeof newWorkerId!=='string'||!newWorkerId.trim()) return {ok:false,reason:'INVALID_WORKER'};
  const workers=new Set(activeWorkerIds);
  if (workers.has(newWorkerId)) return {ok:false,reason:'ALREADY_ASSIGNED'};
  return workers.size >= license.capacity ? {ok:false,reason:'CAPACITY_REACHED'} : {ok:true,reason:'AVAILABLE'};
}
export function upgrade(license,capacity) {
  if (!TIERS.includes(capacity)||capacity<license.capacity) throw new Error('INVALID_UPGRADE');
  return {...license,capacity};
}
