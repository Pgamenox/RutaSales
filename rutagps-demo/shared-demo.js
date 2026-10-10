/* RutaGPS DEMO only. Browser localStorage is NOT an authorization boundary. */
const STORAGE_KEY='rutagps_beta_demo_v1';
export const TIERS=[5,12,15,30];
export const DEVICES=Object.freeze(Array.from({length:30},(_,i)=>'GPS-'+String(i+1).padStart(3,'0')));
export function validateDemo(v){
if(v?.version!==1||!Array.isArray(v.companies))throw Error('Invalid demo');
const ids=new Set();
for(const c of v.companies){if(!c||typeof c.id!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(c.id)||ids.has(c.id)||typeof c.name!=='string'||c.name.trim().length<2||c.name.length>90||!TIERS.includes(c.capacity)||!['ACTIVE','SUSPENDED'].includes(c.status)||!Number.isFinite(Date.parse(c.expiresAt))||!Array.isArray(c.workers)||c.workers.length>c.capacity||new Set(c.workers).size!==c.workers.length||c.workers.some(id=>!DEVICES.includes(id)))throw Error('Invalid company');ids.add(c.id)}
if(v.selectedCompanyId!==null&&!ids.has(v.selectedCompanyId))throw Error('Invalid selection');return v;
}
export function loadDemo(){try{return validateDemo(JSON.parse(localStorage.getItem(STORAGE_KEY)))}catch{return {version:1,companies:[],selectedCompanyId:null}}}
export function saveDemo(v){validateDemo(v);localStorage.setItem(STORAGE_KEY,JSON.stringify(v))}
export function addCompany(v,name,capacity,months=12){name=String(name).trim();capacity=Number(capacity);if(name.length<2||name.length>90||!TIERS.includes(capacity)||![1,6,12].includes(Number(months)))throw Error('Invalid company or tier');const until=addMonths(new Date(),Number(months));const c={id:crypto.randomUUID(),name,capacity,status:'ACTIVE',workers:[],expiresAt:until.toISOString()};v.companies.push(c);v.selectedCompanyId=c.id;return c}
export function valid(c){return Boolean(c&&c.status==='ACTIVE'&&TIERS.includes(c.capacity)&&Array.isArray(c.workers)&&c.workers.length<=c.capacity&&Date.parse(c.expiresAt)>Date.now())}
export function assignWorker(c,id,companies=[c]){if(!valid(c))throw Error('Licencia inactiva');if(!DEVICES.includes(id))throw Error('Dispositivo inexistente en la demo');if(c.workers.includes(id))throw Error('Ya asignado');if(c.workers.length>=c.capacity)throw Error('Cupo agotado');c.workers.push(id)}
export function unassignWorker(c,id){c.workers=c.workers.filter(w=>w!==id)}
export function upgradeCompany(c,tier){tier=Number(tier);if(!TIERS.includes(tier)||tier<c.capacity)throw Error('Ampliación inválida');c.capacity=tier}
export function addMonths(date,months){const d=new Date(date),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+months);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d}
export function renew(c){if(!Number.isFinite(Date.parse(c.expiresAt)))throw Error('Vencimiento inválido');c.expiresAt=addMonths(new Date(Math.max(Date.now(),Date.parse(c.expiresAt))),12).toISOString();c.status='ACTIVE'}
export function licensedDevices(v){const c=v.companies.find(c=>c.id===v.selectedCompanyId);return valid(c)?[...c.workers]:[]}
