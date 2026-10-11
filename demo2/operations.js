// Shared guards; authorization remains the responsibility of server/RLS.
export function rolePage(account){return account?.active===true?({CENTRAL:'central.html',SUPERVISOR:'supervisor.html',VENDEDOR:'vendedor.html'}[account.role]||null):null}
export function localDate(date=new Date()){const pad=n=>String(n).padStart(2,'0');return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`}
export function distanceValue(value){if(value===null||value===undefined||String(value).trim()==='')return null;const n=Number(value);return Number.isFinite(n)&&n>=0?n:null}
export function zoneKey(value){const n=distanceValue(value);return n===null?'none':n<=100?'valid':n<=250?'review':'out'}
export function photoSource(value){return typeof value==='string'&&/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(value)?value:null}
export function validGps(g,now=Date.now()){return Boolean(g&&Number.isFinite(g.lat)&&g.lat>=-90&&g.lat<=90&&Number.isFinite(g.lng)&&g.lng>=-180&&g.lng<=180&&Number.isFinite(g.accuracy)&&g.accuracy>=0&&g.accuracy<=150&&Number.isFinite(g.capturedAt)&&now>=g.capturedAt&&now-g.capturedAt<=120000)}
export async function updateOne(query,field='id'){const {data,error}=await query.select(field).single();if(error)throw Error(error.message);if(!data)throw Error('El registro cambió o ya no tienes permiso. Actualiza e intenta de nuevo.');return data}
export async function fetchAll(makeQuery,size=500){const rows=[];for(let start=0;;start+=size){const {data,error}=await makeQuery().range(start,start+size-1);if(error)throw Error(error.message);rows.push(...(data||[]));if((data||[]).length<size)return rows}}
