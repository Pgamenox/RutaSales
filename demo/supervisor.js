const BASE="https://ezfqvhoprfstcmdiflcm.supabase.co/rest/v1/";
const KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZnF2aG9wcmZzdGNtZGlmbGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMjUyMjUsImV4cCI6MjEwNjgwMTIyNX0.j-HOi4cgIwKZmpJ10ZX2bAW6a2zNaCgT-BSA2P1lYVc";
const SUP="xrE8K-1lI6GxphDjPton6HC4-iTKN14u";
const $=id=>document.getElementById(id);
const H={apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json","x-rutasales-token":SUP};
async function api(path,opt={}){opt.headers={...H,...(opt.headers||{})};const r=await fetch(BASE+path,opt);if(!r.ok)throw new Error(await r.text());const t=await r.text();return t?JSON.parse(t):null}
function e(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function today(){return new Date().toISOString().slice(0,10)}
let sellers=[],routes=[];
function fillSelects(){const rv=$("route").value,sv=$("seller").value;$("route").innerHTML=routes.map(r=>'<option value="'+r.id+'">'+e(r.name)+'</option>').join("");$("seller").innerHTML=sellers.map(s=>'<option value="'+s.id+'">'+e(s.name)+'</option>').join("");if(rv&&routes.some(r=>r.id===rv))$("route").value=rv;if(sv&&sellers.some(s=>s.id===sv))$("seller").value=sv}
function renderVisit(v){
 const r=e(routes.find(x=>x.id===v.route_id)?.name),s=e(sellers.find(x=>x.id===v.seller_id)?.name);
 const has=Number.isFinite(Number(v.lat))&&Number.isFinite(Number(v.lng));
 const gps=has?'<div style="margin-top:10px;padding:10px;border:1px solid #cfe3d5;background:#f3fff6;border-radius:10px"><b>📍 GPS REGISTRADO</b><div>Latitud: '+Number(v.lat).toFixed(6)+'</div><div>Longitud: '+Number(v.lng).toFixed(6)+'</div><div>Precisión: ±'+Math.round(Number(v.accuracy)||0)+' metros</div><a href="https://www.google.com/maps?q='+encodeURIComponent(v.lat+','+v.lng)+'" target="_blank" rel="noopener"><button type="button" class="light" style="margin-top:8px">Abrir punto en Google Maps</button></a></div>':'<div class="danger" style="margin-top:10px">⚠️ Esta visita no tiene GPS.</div>';
 const stamp=v.completed_at?'<div class="small"><b>Hora servidor:</b> '+new Date(v.completed_at).toLocaleString()+'</div>':'';
 const zone=v.within_zone===true?'<div class="ok">✅ DENTRO DE ZONA · '+Math.round(Number(v.distance_m)||0)+' m del punto esperado</div>':(v.within_zone===false?'<div class="danger">⚠️ FUERA DE ZONA · '+Math.round(Number(v.distance_m)||0)+' m del punto esperado</div>':'<div class="small">Sin punto esperado para validar distancia.</div>');
 const target=(Number.isFinite(Number(v.target_lat))&&Number.isFinite(Number(v.target_lng)))?'<div class="small"><b>Punto esperado:</b> '+Number(v.target_lat).toFixed(6)+', '+Number(v.target_lng).toFixed(6)+' · radio '+Math.round(Number(v.allowed_radius_m)||100)+' m</div>':'';
 const source=v.photo_data?'<div class="ok">✅ Evidencia: '+e(v.evidence_source||"CÁMARA EN VIVO")+'</div><img class="evidence" src="'+v.photo_data+'">'+gps+target+zone+stamp:'<div class="small">Aún sin evidencia.</div>';
 return '<div class="visit"><b>'+e(v.customer_name)+'</b> <span class="badge">'+e(v.status)+'</span><div class="small">'+r+' · '+s+' · '+e(v.visit_date)+'</div><div>'+e(v.address)+'</div>'+source+'</div>';
}
async function refreshLists(){try{const [ss,rr,visits,incs]=await Promise.all([api("rs_sellers?select=*&order=name"),api("rs_routes?select=*&order=name"),api("rs_visits?select=*&order=created_at.desc"),api("rs_incidents?select=*&order=created_at.desc")]);sellers=ss;routes=rr;fillSelects();$("kRoutes").textContent=routes.length;$("kSellers").textContent=sellers.length;$("kVisits").textContent=visits.length;$("kIncidents").textContent=incs.filter(i=>!i.resolved).length;$("visitsList").innerHTML=visits.length?visits.map(renderVisit).join(""):'<div class="small">Sin visitas.</div>';$("incidentsList").innerHTML=incs.length?incs.map(i=>'<div class="visit"><b>'+e(i.incident_type)+'</b><div class="small">'+e(sellers.find(s=>s.id===i.seller_id)?.name)+' · GPS '+Number(i.lat).toFixed(6)+', '+Number(i.lng).toFixed(6)+' · ±'+Math.round(i.accuracy||0)+' m · '+new Date(i.captured_at).toLocaleString()+'</div><a href="https://www.google.com/maps?q='+encodeURIComponent(i.lat+','+i.lng)+'" target="_blank" rel="noopener"><button type="button" class="light">📍 Ver GPS de contingencia</button></a></div>').join(""):'<div class="small">Sin contingencias.</div>'}catch(err){$("saveMsg").textContent="Error: "+err.message}}
$("date").value=today();
$("refreshData").onclick=refreshLists;
$("useCurrentGps").onclick=()=>{
 if(!navigator.geolocation)return $("saveMsg").textContent="Este navegador no tiene geolocalización.";
 $("saveMsg").textContent="Obteniendo ubicación actual…";
 navigator.geolocation.getCurrentPosition(p=>{
   $("targetLat").value=p.coords.latitude.toFixed(6);
   $("targetLng").value=p.coords.longitude.toFixed(6);
   $("saveMsg").textContent="Punto esperado cargado · precisión ±"+Math.round(p.coords.accuracy||0)+" m";
 },err=>$("saveMsg").textContent="No se pudo obtener ubicación: "+err.message,{enableHighAccuracy:true,timeout:15000,maximumAge:0});
};
$("saveVisit").onclick=async()=>{
 const client=$("client").value.trim(),address=$("address").value.trim();
 if(!client||!address)return $("saveMsg").textContent="Falta cliente o dirección.";
 const lat=$("targetLat").value.trim(),lng=$("targetLng").value.trim(),radius=Math.max(20,Number($("radius").value)||100);
 const payload={route_id:$("route").value,seller_id:$("seller").value,customer_name:client,address,visit_date:$("date").value,status:"PENDIENTE",allowed_radius_m:radius};
 if(lat!==""&&lng!==""){payload.target_lat=Number(lat);payload.target_lng=Number(lng)}
 try{
   $("saveMsg").textContent="Guardando…";
   await api("rs_visits",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(payload)});
   $("client").value="";$("address").value="";$("targetLat").value="";$("targetLng").value="";
   $("saveMsg").textContent="Visita asignada.";
   await refreshLists();
 }catch(err){$("saveMsg").textContent="No se pudo guardar: "+err.message}
};
refreshLists();