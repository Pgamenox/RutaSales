const BASE="https://ezfqvhoprfstcmdiflcm.supabase.co/rest/v1/";
const KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZnF2aG9wcmZzdGNtZGlmbGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMjUyMjUsImV4cCI6MjEwNjgwMTIyNX0.j-HOi4cgIwKZmpJ10ZX2bAW6a2zNaCgT-BSA2P1lYVc";
const SUP="xrE8K-1lI6GxphDjPton6HC4-iTKN14u";
const SEL="SSA25wyzucK04-nBYw9a47ixCrMBsbbo";
const VIEW=document.body.dataset.view;
let sellerId=localStorage.getItem("rs_demo_seller")||"0c2bf2e3-a002-4332-b9f2-e9802d4af315",stream=null;
const app=document.getElementById("app");
function h(token,sid,extra={}){const x={apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json","x-rutasales-token":token,...extra};if(sid)x["x-rutasales-seller"]=sid;return x}
async function api(path,opt={},token=SUP,sid){opt.headers=h(token,sid,opt.headers||{});const r=await fetch(BASE+path,opt);if(!r.ok)throw new Error(await r.text());const t=await r.text();return t?JSON.parse(t):null}
function e(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function today(){return new Date().toISOString().slice(0,10)}
function geo(){return new Promise((ok,bad)=>navigator.geolocation.getCurrentPosition(p=>ok({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy}),bad,{enableHighAccuracy:true,timeout:15000,maximumAge:0}))}
async function evidence(){const m=document.getElementById("camModal"),v=document.getElementById("video");m.classList.remove("hidden");stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});v.srcObject=stream;return new Promise((resolve,reject)=>{snapBtn.onclick=async()=>{try{const g=await geo();if(g.accuracy>150)return alert("GPS con baja precisión: "+Math.round(g.accuracy)+" m");const c=document.createElement("canvas"),w=Math.min(640,v.videoWidth||640),hh=Math.round((v.videoHeight||480)*(w/(v.videoWidth||640)));c.width=w;c.height=hh;c.getContext("2d").drawImage(v,0,0,w,hh);const p=c.toDataURL("image/jpeg",.56);closeCam();resolve({g,p})}catch(err){alert("No se pudo obtener GPS: "+err.message)}};cancelCam.onclick=()=>{closeCam();reject(new Error("cancel"))}})}
function closeCam(){document.getElementById("camModal")?.classList.add("hidden");if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}}
async function supervisor(){
 try{
  const [sellers,routes,visits,incs]=await Promise.all([api("rs_sellers?select=*&order=name"),api("rs_routes?select=*&order=name"),api("rs_visits?select=*&order=created_at.desc"),api("rs_incidents?select=*&order=created_at.desc")]);
  const active=localStorage.getItem("rs_active_route")||(routes[0]?.id||""),rv=visits.filter(v=>!active||v.route_id===active),open=incs.filter(i=>!i.resolved);
  const ro=routes.map(r=>'<option value="'+r.id+'" '+(r.id===active?'selected':'')+'>'+e(r.name)+'</option>').join(""),so=sellers.map(s=>'<option value="'+s.id+'">'+e(s.name)+'</option>').join("");
  app.innerHTML='<div class="card"><b>Panel Supervisor</b><div class="small">Sincronización automática cada 3 segundos.</div></div>'+
  '<div class="grid"><div class="card"><div class="small">Rutas</div><h2>'+routes.length+'</h2></div><div class="card"><div class="small">Vendedores</div><h2>'+sellers.length+'</h2></div><div class="card"><div class="small">Visitas ruta activa</div><h2>'+rv.length+'</h2></div><div class="card"><div class="small">Contingencias abiertas</div><h2>'+open.length+'</h2></div></div>'+
  '<div class="card"><label>Ruta activa</label><select id="rf">'+ro+'</select></div>'+
  '<div class="card"><b>Asignar visita</b><div class="row"><div><label>Ruta</label><select id="fr">'+ro+'</select></div><div><label>Vendedor</label><select id="fs">'+so+'</select></div></div><div class="row"><div><label>Cliente</label><input id="fc"></div><div><label>Fecha</label><input id="fd" type="date" value="'+today()+'"></div></div><label>Dirección</label><input id="fa"><button id="add">Asignar visita</button></div>'+
  '<div class="card"><b>Ruta activa</b>'+(rv.length?rv.map(v=>'<div class="visit"><b>'+e(v.customer_name)+'</b> <span class="badge">'+e(v.status)+'</span><div class="small">'+e(routes.find(r=>r.id===v.route_id)?.name)+' · '+e(sellers.find(s=>s.id===v.seller_id)?.name)+' · '+e(v.address)+'</div>'+(v.completed_at?'<div class="ok">Evidencia recibida · hora servidor '+new Date(v.completed_at).toLocaleString()+'</div>':'')+(v.photo_data?'<img class="evidence" src="'+v.photo_data+'">':'')+'</div>').join(""):'<p class="small">Sin visitas en esta ruta.</p>')+'</div>'+
  '<div class="card"><b>🚨 Centro de contingencias</b>'+(open.length?open.map(i=>'<div class="visit"><b>'+e(i.incident_type)+'</b><div class="small">'+e(sellers.find(s=>s.id===i.seller_id)?.name)+' · '+e(routes.find(r=>r.id===i.route_id)?.name)+' · GPS ±'+Math.round(i.accuracy||0)+' m · '+new Date(i.captured_at).toLocaleString()+'</div><div>'+e(i.details||"")+'</div>'+(i.photo_data?'<img class="evidence" src="'+i.photo_data+'">':'')+'<label>Reasignar pendientes a</label><select id="to_'+i.id+'">'+so+'</select><button class="dark" onclick="reassign(\''+i.id+'\',\''+i.seller_id+'\',\''+i.route_id+'\')">Reasignar pendientes</button></div>').join(""):'<p class="small">Sin contingencias abiertas.</p>')+'</div>';
  rf.onchange=x=>{localStorage.setItem("rs_active_route",x.target.value);supervisor()};
  add.onclick=async()=>{if(!fc.value.trim()||!fa.value.trim())return alert("Falta cliente o dirección");await api("rs_visits",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({route_id:fr.value,seller_id:fs.value,customer_name:fc.value.trim(),address:fa.value.trim(),visit_date:fd.value,status:"PENDIENTE"})});supervisor()}
 }catch(err){app.innerHTML='<div class="card danger">Error: '+e(err.message)+'</div>'}
}
async function reassign(i,from,r){const to=document.getElementById("to_"+i).value;if(to===from)return alert("Selecciona otro vendedor");await api("rs_visits?seller_id=eq."+from+"&route_id=eq."+r+"&status=eq.PENDIENTE",{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({seller_id:to,original_seller_id:from})});await api("rs_incidents?id=eq."+i,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({resolved:true,reassigned_to:to})});supervisor()}window.reassign=reassign;
async function seller(){
 try{
  const sellers=await api("rs_sellers?select=id,name,active&active=eq.true&order=name",{},SEL,sellerId);if(!sellers.find(s=>s.id===sellerId)&&sellers[0])sellerId=sellers[0].id;
  const [routes,visits,incs]=await Promise.all([api("rs_routes?select=*&active=eq.true&order=name",{},SEL,sellerId),api("rs_visits?select=*&order=visit_date.asc,created_at.asc",{},SEL,sellerId),api("rs_incidents?select=*&order=created_at.desc",{},SEL,sellerId)]);
  const so=sellers.map(s=>'<option value="'+s.id+'" '+(s.id===sellerId?'selected':'')+'>'+e(s.name)+'</option>').join("");
  app.innerHTML='<div class="card"><b>App Vendedor</b><label>Vendedor demo</label><select id="sp">'+so+'</select><div class="small">Para esta muestra el selector sustituye al login.</div></div>'+
  '<div class="grid"><div class="card"><div class="small">Asignadas</div><h2>'+visits.length+'</h2></div><div class="card"><div class="small">Pendientes</div><h2>'+visits.filter(v=>v.status==="PENDIENTE").length+'</h2></div><div class="card"><div class="small">Completadas</div><h2>'+visits.filter(v=>v.status==="COMPLETADA").length+'</h2></div></div>'+
  '<div class="card"><b>Mis visitas</b>'+(visits.length?visits.map(v=>'<div class="visit"><b>'+e(v.customer_name)+'</b> <span class="badge">'+e(v.status)+'</span><div class="small">'+e(routes.find(r=>r.id===v.route_id)?.name)+' · '+e(v.address)+' · '+e(v.visit_date)+'</div>'+(v.status==="PENDIENTE"?'<button onclick="complete(\''+v.id+'\')">📍📷 Registrar visita</button><button class="dark" onclick="incident(\''+v.route_id+'\')">🚨 Reportar imprevisto</button>':'<div class="ok">Evidencia enviada al supervisor</div>')+'</div>').join(""):'<p class="small">Sin visitas asignadas.</p>')+'</div>'+
  '<div class="card"><b>Mis imprevistos</b>'+(incs.length?incs.map(i=>'<div class="visit"><b>'+e(i.incident_type)+'</b> <span class="badge">'+(i.resolved?'RESUELTO':'ABIERTO')+'</span><div class="small">'+new Date(i.captured_at).toLocaleString()+' · GPS ±'+Math.round(i.accuracy||0)+' m</div></div>').join(""):'<p class="small">Sin imprevistos.</p>')+'</div>';
  sp.onchange=x=>{sellerId=x.target.value;localStorage.setItem("rs_demo_seller",sellerId);seller()}
 }catch(err){app.innerHTML='<div class="card danger">Error: '+e(err.message)+'</div>'}
}
async function complete(id){try{const x=await evidence();await api("rs_visits?id=eq."+id,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"COMPLETADA",lat:x.g.lat,lng:x.g.lng,accuracy:x.g.accuracy,photo_data:x.p})},SEL,sellerId);alert("Visita enviada con GPS + cámara en vivo.");seller()}catch(err){}}
async function incident(r){const type=prompt("Tipo de imprevisto");if(!type)return;const details=prompt("Descripción")||"";try{const x=await evidence();await api("rs_incidents",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({route_id:r,seller_id:sellerId,incident_type:type,details,lat:x.g.lat,lng:x.g.lng,accuracy:x.g.accuracy,photo_data:x.p})},SEL,sellerId);alert("Imprevisto enviado.");seller()}catch(err){}}
window.complete=complete;window.incident=incident;
function userIsEditing(){
 const a=document.activeElement;
 if(a && ["INPUT","TEXTAREA","SELECT"].includes(a.tagName)) return true;
 const modal=document.getElementById("camModal");
 return !!(modal && !modal.classList.contains("hidden"));
}
if(VIEW==="supervisor"){
 supervisor();
 setInterval(()=>{if(!userIsEditing())supervisor()},3000);
}else{
 seller();
 setInterval(()=>{if(!userIsEditing())seller()},3000);
}