const BASE="https://ezfqvhoprfstcmdiflcm.supabase.co/rest/v1/";
const KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZnF2aG9wcmZzdGNtZGlmbGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMjUyMjUsImV4cCI6MjEwNjgwMTIyNX0.j-HOi4cgIwKZmpJ10ZX2bAW6a2zNaCgT-BSA2P1lYVc";
const SUP="xrE8K-1lI6GxphDjPton6HC4-iTKN14u";
const $=id=>document.getElementById(id);
const H={apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json","x-rutasales-token":SUP};
async function api(path,opt={}){opt.headers={...H,...(opt.headers||{})};const r=await fetch(BASE+path,opt);if(!r.ok)throw new Error(await r.text());const t=await r.text();return t?JSON.parse(t):null}
function e(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function today(){return new Date().toISOString().slice(0,10)}
let sellers=[],routes=[];
function fillSelects(){
 const rv=$("route").value,sv=$("seller").value;
 $("route").innerHTML=routes.map(r=>'<option value="'+r.id+'">'+e(r.name)+'</option>').join("");
 $("seller").innerHTML=sellers.map(s=>'<option value="'+s.id+'">'+e(s.name)+'</option>').join("");
 if(rv && routes.some(r=>r.id===rv)) $("route").value=rv;
 if(sv && sellers.some(s=>s.id===sv)) $("seller").value=sv;
}
async function refreshLists(){
 try{
  const [ss,rr,visits,incs]=await Promise.all([
    api("rs_sellers?select=*&order=name"),
    api("rs_routes?select=*&order=name"),
    api("rs_visits?select=*&order=created_at.desc"),
    api("rs_incidents?select=*&order=created_at.desc")
  ]);
  sellers=ss;routes=rr;fillSelects();
  $("kRoutes").textContent=routes.length;
  $("kSellers").textContent=sellers.length;
  $("kVisits").textContent=visits.length;
  $("kIncidents").textContent=incs.filter(i=>!i.resolved).length;
  $("visitsList").innerHTML=visits.length?visits.map(v=>{
  const routeName=e(routes.find(r=>r.id===v.route_id)?.name);
  const sellerName=e(sellers.find(s=>s.id===v.seller_id)?.name);
  const hasGps=Number.isFinite(v.lat)&&Number.isFinite(v.lng);
  const gpsBlock=hasGps?'<div class="small"><b>GPS:</b> '+Number(v.lat).toFixed(6)+', '+Number(v.lng).toFixed(6)+' · precisión ±'+Math.round(v.accuracy||0)+' m</div><a href="https://www.google.com/maps?q='+encodeURIComponent(v.lat+','+v.lng)+'" target="_blank" rel="noopener"><button type="button" class="light">📍 Ver ubicación GPS</button></a>':'<div class="small danger">Sin GPS registrado.</div>';
  const evidence=v.photo_data?'<div class="ok">✅ Evidencia: '+e(v.evidence_source||"CÁMARA EN VIVO")+'</div><img class="evidence" src="'+v.photo_data+'">'+gpsBlock+(v.completed_at?'<div class="small"><b>Hora servidor:</b> '+new Date(v.completed_at).toLocaleString()+'</div>':''):'<div class="small">Aún sin evidencia.</div>';
  return '<div class="visit"><b>'+e(v.customer_name)+'</b> <span class="badge">'+e(v.status)+'</span><div class="small">'+routeName+' · '+sellerName+' · '+e(v.visit_date)+'</div><div>'+e(v.address)+'</div>'+evidence+'</div>';
}).join(""):'<div class="small">Sin visitas.</div>';
  $("incidentsList").innerHTML=incs.length?incs.map(i=>'<div class="visit"><b>'+e(i.incident_type)+'</b><div class="small">'+e(sellers.find(s=>s.id===i.seller_id)?.name)+' · '+new Date(i.captured_at).toLocaleString()+' · GPS ±'+Math.round(i.accuracy||0)+' m</div><div>'+e(i.details||"")+'</div></div>').join(""):'<div class="small">Sin contingencias.</div>';
 }catch(err){$("saveMsg").textContent="Error al actualizar: "+err.message}
}
$("date").value=today();
$("refreshData").addEventListener("click",refreshLists);
$("saveVisit").addEventListener("click",async()=>{
 const client=$("client").value.trim(),address=$("address").value.trim();
 if(!client||!address){$("saveMsg").textContent="Falta cliente o dirección.";return}
 $("saveVisit").disabled=true;$("saveMsg").textContent="Guardando…";
 try{
  await api("rs_visits",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({route_id:$("route").value,seller_id:$("seller").value,customer_name:client,address,visit_date:$("date").value,status:"PENDIENTE"})});
  $("saveMsg").textContent="Visita asignada correctamente.";
  $("client").value="";$("address").value="";
  await refreshLists();
 }catch(err){$("saveMsg").textContent="No se pudo guardar: "+err.message}
 finally{$("saveVisit").disabled=false}
});
refreshLists();