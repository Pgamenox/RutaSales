// Executable contract only: no server, database, network or GPS collection.
export function authorize(actor, companyId, permission, deviceId) {
  if (!actor?.authenticated) throw Error('401');
  const permissions = {superadmin:['license:write','company:write'],central:['device:write','location:read','shift:write'],supervisor:['location:read','shift:write'],device:['location:write']};
  if (!permissions[actor.role]?.includes(permission)) throw Error('403');
  if (actor.role !== 'superadmin' && actor.companyId !== companyId) throw Error('403');
  if (actor.role === 'supervisor' && (!deviceId || !actor.deviceIds?.includes(deviceId))) throw Error('403');
  if (actor.role === 'device' && actor.deviceId !== deviceId) throw Error('403');
}
export function canIngest({actor,companyId,deviceId,license,shift,capturedAt,lastCapturedAt,now}) {
  authorize(actor,companyId,'location:write',deviceId);
  if (license.companyId !== companyId || license.status !== 'ACTIVE' || !Number.isFinite(Date.parse(license.expiresAt)) || Date.parse(license.expiresAt)<=now) throw Error('LICENSE_INACTIVE');
  if (!shift || shift.companyId!==companyId || shift.deviceId!==deviceId || !shift.informed || shift.closedAt || !(Date.parse(shift.startsAt)<=capturedAt && capturedAt<Date.parse(shift.endsAt)) || !(Date.parse(shift.startsAt)<=now && now<Date.parse(shift.endsAt))) throw Error('OUTSIDE_SHIFT');
  if (!Number.isFinite(capturedAt) || capturedAt>now || now-capturedAt>300000) throw Error('INVALID_TIME');
  if (lastCapturedAt!==null && (!Number.isFinite(lastCapturedAt) || capturedAt-lastCapturedAt<300000)) throw Error('INTERVAL');
  return true;
}
