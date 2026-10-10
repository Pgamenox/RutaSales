/* RutaGPS DEMO only. Browser localStorage is NOT an authorization boundary. */
const STORAGE_KEY='rutagps_beta_demo_v1';
export const TIERS=[5,12,15,30];
export const DEVICES=Object.freeze(Array.from({length:30},(_,i)=>'GPS-'+String(i+1).padStart(3,'0')));
export function loadDemo(){try{const v=JSON.parse(localStorage.getItem(STORAGE_KEY));if(v?.version===1&&Array.isArray(v.companies))return v}catch{}return {version:1,companies:[],selectedCompanyId:null}}
export function saveDemo(v){if(v.version!==1||!Array.isArray(v.companies))throw Error('Invalid demo');localStorage.setItem(STORAGE_KEY,JSON.stringify(v))}
export function addCompany(v,name,capacity,months=12){name=String(name).trim();capacity=Number(capacity);if(name.length<2||!TIERS.includes(capacity))throw Error('Invalid company or tier');const until=new Date();until.setMonth(until.getMonth()+Number(months));const c={id:crypto.randomUUID(),name,capacity,status:'ACTIVE',workers:[],expiresAt:until.toISOString()};v.companies.push(c);v.selectedCompanyId=c.id;return c}
export function valid(c){return c&&c.status==='ACTIVE'&&Date.parse(c.expiresAt)>Date.now()}
export function assignWorker(c,id,companies=[c]){if(!valid(c))throw Error('Licencia inactiva');if(!DEVICES.includes(id))throw Error('Dispositivo inexistente en la demo');if(companies.some(other=>other.id!==c.id&&other.workers.includes(id)))throw Error('GPS ya asignado a otra empresa');if(c.workers.includes(id))throw Error('Ya asignado');if(c.workers.length>=c.capacity)throw Error('Cupo agotado');c.workers.push(id)}
export function unassignWorker(c,id){c.workers=c.workers.filter(w=>w!==id)}
export function upgradeCompany(c,tier){tier=Number(tier);if(!TIERS.includes(tier)||tier<c.capacity)throw Error('Ampliación inválida');c.capacity=tier}
export function renew(c){const d=new Date(Math.max(Date.now(),Date.parse(c.expiresAt)));d.setFullYear(d.getFullYear()+1);c.expiresAt=d.toISOString();c.status='ACTIVE'}
