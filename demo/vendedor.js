const BASE="https://ezfqvhoprfstcmdiflcm.supabase.co/rest/v1/";
const KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZnF2aG9wcmZzdGNtZGlmbGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMjUyMjUsImV4cCI6MjEwNjgwMTIyNX0.j-HOi4cgIwKZmpJ10ZX2bAW6a2zNaCgT-BSA2P1lYVc";
const SEL="SSA25wyzucK04-nBYw9a47ixCrMBsbbo";
const $=id=>document.getElementById(id);
let sellerId=localStorage.getItem("rs_demo_seller")||"0c2bf2e3-a002-4332-b9f2-e9802d4af315";
let sellers=[],routes=[],pendingGps={},stream=null,currentVisitId=null,currentMode="visit",incidentRouteId=null,incidentGps=null,proposalGps=null;
function h(extra={}){return {apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json","x-rutasales-token":SEL,"x-rutasales-seller":sellerId,...extra}}
async function api(path,opt={}){opt.headers=h(opt.headers||{});const r=await fetch(BASE+path,opt);if(!r.ok)throw new Error(await r.text());const t=await r.text();return t?JSON.parse(t):null}
function e(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function geo(){return new Promise((ok,bad)=>navigator.geolocation.getCurrentPosition(p=>ok({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy,capturedAt:Date.now()}),bad,{enableHighAccuracy:true,timeout:15000,maximumAge:0}))}
function gpsHtml(g){return '<div style="margin-top:8px;padding:9px;border:1px solid #cfe3d5;background:#f3fff6;border-radius:9px"><b>✅ GPS obtenido</b><div>Latitud: '+g.lat.toFixed(6)+'</div><div>Longitud: '+g.lng.toFixed(6)+'</div><div>Precisión: ±'+Math.round(g.accuracy)+' m</div></div>'}
async function load(){
 try{
  const allSellers=await fetch(BASE+"rs_sellers?select=id,name,active&active=eq.true&order=name",{headers:{apikey:KEY,Authorization:"Bearer "+KEY,"x-rutasales-token":SEL}});
  if(!allSellers.ok)throw new Error(await allSellers.text());
  sellers=await allSellers.json();
  if(!sellers.find(s=>s.id===sellerId)&&sellers[0])sellerId=sellers[0].id;
  $("sellerPick").innerHTML=sellers.map(s=>'<option value="'+s.id+'" '+(s.id===sellerId?'selected':'')+'>'+e(s.name)+'</option>').join("");
  const [rr,visits,incs]=await Promise.all([
    api("rs_routes?select=*&active=eq.true&order=name"),
    api("rs_visits?select=*&order=visit_date.asc,created_at.asc"),
    api("rs_incidents?select=*&order=created_at.desc")
  ]);
  routes=rr;
  if($("proposalRoute"))$("proposalRoute").innerHTML=routes.map(r=>'<option value="'+r.id+'">'+e(r.name)+'</option>').join("");
  $("kAssigned").textContent=visits.length;
  $("kPending").textContent=visits.filter(v=>v.status==="PENDIENTE").length;
  $("kDone").textContent=visits.filter(v=>v.status==="COMPLETADA").length;
  $("visitsList").innerHTML=visits.length?visits.map(v=>{
    const route=e(routes.find(r=>r.id===v.route_id)?.name);
    if(v.status!=="PENDIENTE")return '<div class="visit"><b>'+e(v.customer_name)+'</b> <span class="badge">'+e(v.status)+'</span><div class="small">'+route+' · '+e(v.address)+' · '+e(v.visit_date)+'</div><div class="ok">Evidencia enviada al supervisor</div></div>';
    const g=pendingGps[v.id];
    return '<div class="visit"><b>'+e(v.customer_name)+'</b> <span class="badge">PENDIENTE</span><div class="small">'+route+' · '+e(v.address)+' · '+e(v.visit_date)+'</div>'+
      '<button type="button" onclick="captureGps(\''+v.id+'\')">1️⃣ 📍 Obtener mi ubicación actual</button>'+
      '<div id="gps_'+v.id+'">'+(g?gpsHtml(g):'<div class="small">GPS pendiente.</div>')+'</div>'+
      '<button type="button" id="photo_'+v.id+'" onclick="openCameraForVisit(\''+v.id+'\')" '+(g?'':'disabled')+'>2️⃣ 📷 Tomar foto y enviar evidencia</button>'+
      '<button type="button" class="dark" onclick="openIncident(\''+v.route_id+'\')">🚨 Reportar imprevisto</button>'+
      '</div>';
  }).join(""):'<div class="small">Sin visitas asignadas.</div>';
  $("incidentsList").innerHTML=incs.length?incs.map(i=>{
    if(i.incident_type==="NUEVO CLIENTE"){
      const status=i.resolved?(i.resolution_note==="APROBADO"?"✅ APROBADO":"❌ "+e(i.resolution_note||"REVISADO")):"⏳ PENDIENTE";
      return '<div class="visit"><b>➕ '+e(i.proposal_name||"Negocio nuevo")+'</b> <span class="badge">'+status+'</span><div class="small">'+e(i.proposal_address||"")+'</div><div class="small">'+new Date(i.captured_at).toLocaleString()+' · GPS ±'+Math.round(i.accuracy||0)+' m</div></div>';
    }
    return '<div class="visit"><b>'+e(i.incident_type)+'</b><div class="small">'+new Date(i.captured_at).toLocaleString()+' · GPS ±'+Math.round(i.accuracy||0)+' m</div></div>';
  }).join(""):'<div class="small">Sin imprevistos ni altas.</div>';
 }catch(err){$("visitsList").innerHTML='<div class="danger">Error: '+e(err.message)+'</div>'}
}
async function captureGps(id){
 try{
  const g=await geo();
  if(g.accuracy>150)return alert("GPS con baja precisión: "+Math.round(g.accuracy)+" m. Intenta de nuevo.");
  pendingGps[id]=g;
  const el=$("gps_"+id); if(el)el.innerHTML=gpsHtml(g);
  const btn=$("photo_"+id); if(btn)btn.disabled=false;
 }catch(err){alert("No se pudo obtener tu ubicación: "+err.message)}
}
async function openCameraForVisit(id){
 const g=pendingGps[id];
 if(!g)return alert("Primero pulsa Obtener mi ubicación actual.");
 if(Date.now()-g.capturedAt>120000){delete pendingGps[id];await load();return alert("El GPS venció. Obtén tu ubicación nuevamente.");}
 currentMode="visit"; currentVisitId=id;
 $("camTitle").textContent="2️⃣ 📷 Evidencia de visita"; $("camGpsStatus").innerHTML=gpsHtml(g);
 try{
  stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
  $("video").srcObject=stream;
  $("camModal").classList.remove("hidden");
 }catch(err){alert("No se pudo abrir la cámara: "+err.message)}
}
function closeCamera(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}$("video").srcObject=null;$("camModal").classList.add("hidden");currentVisitId=null}
$("cancelCam").onclick=closeCamera;
$("snapBtn").onclick=async()=>{
 const v=$("video");if(!v.videoWidth)return alert("La cámara aún no está lista.");
 const canvas=document.createElement("canvas"),w=Math.min(640,v.videoWidth),hh=Math.round(v.videoHeight*(w/v.videoWidth));
 canvas.width=w;canvas.height=hh;canvas.getContext("2d").drawImage(v,0,0,w,hh);
 const p=canvas.toDataURL("image/jpeg",.56);

 if(currentMode==="visit"){
   const id=currentVisitId,g=pendingGps[id];
   if(!id||!g)return;
   if(Date.now()-g.capturedAt>120000){closeCamera();delete pendingGps[id];await load();return alert("El GPS venció. Repite el paso 1.");}
   try{
    await api("rs_visits?id=eq."+id,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"COMPLETADA",lat:g.lat,lng:g.lng,accuracy:g.accuracy,photo_data:p,evidence_source:"LIVE_CAMERA",device_captured_at:new Date().toISOString()})});
    delete pendingGps[id];closeCamera();alert("Visita enviada con GPS + cámara en vivo.");await load();
   }catch(err){alert("No se pudo enviar la evidencia: "+err.message)}
 }else if(currentMode==="incident"){
   const g=incidentGps;
   if(!incidentRouteId||!g)return;
   if(Date.now()-g.capturedAt>120000){closeCamera();return alert("El GPS del imprevisto venció. Repórtalo nuevamente.");}
   try{
     await api("rs_incidents",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({
       route_id:incidentRouteId,
       seller_id:sellerId,
       incident_type:$("incidentType").value,
       details:$("incidentDetails").value.trim(),
       lat:g.lat,lng:g.lng,accuracy:g.accuracy,photo_data:p,resolved:false
     })});
     closeCamera(); $("incidentModal").classList.add("hidden"); $("incidentDetails").value=""; incidentRouteId=null; incidentGps=null;
     alert("Imprevisto enviado al supervisor con GPS + foto."); await load();
   }catch(err){alert("No se pudo enviar el imprevisto: "+err.message)}
 }else if(currentMode==="customer"){
   const g=proposalGps,routeId=$("proposalRoute").value,name=$("proposalName").value.trim(),address=$("proposalAddress").value.trim();
   if(!g||!routeId||!name)return alert("Faltan datos del negocio.");
   if(Date.now()-g.capturedAt>120000){closeCamera();return alert("El GPS venció. Registra nuevamente el negocio.");}
   try{
     await api("rs_incidents",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({
       route_id:routeId,
       seller_id:sellerId,
       incident_type:"NUEVO CLIENTE",
       details:"Alta propuesta por vendedor",
       proposal_name:name,
       proposal_address:address,
       lat:g.lat,lng:g.lng,accuracy:g.accuracy,photo_data:p,resolved:false
     })});
     closeCamera();$("proposalName").value="";$("proposalAddress").value="";proposalGps=null;
     alert("Negocio enviado al supervisor para aprobación.");await load();
   }catch(err){alert("No se pudo enviar el negocio: "+err.message)}
 }
};
function openIncident(routeId){incidentRouteId=routeId;$("incidentModal").classList.remove("hidden")}
$("incidentCancel").onclick=()=>{$("incidentModal").classList.add("hidden");incidentRouteId=null;$("incidentDetails").value=""};
$("openCustomerProposal").onclick=()=>{$("customerProposalModal").classList.remove("hidden")};
$("proposalCancel").onclick=()=>{$("customerProposalModal").classList.add("hidden");$("proposalName").value="";$("proposalAddress").value="";proposalGps=null};
$("proposalContinue").onclick=async()=>{
 const name=$("proposalName").value.trim();
 if(!name)return alert("Escribe el nombre del negocio.");
 try{
   const g=await geo();
   if(g.accuracy>150)return alert("GPS con baja precisión: "+Math.round(g.accuracy)+" m. Intenta de nuevo.");
   proposalGps=g;currentMode="customer";currentVisitId=null;
   $("camTitle").textContent="➕ Foto del negocio nuevo";$("camGpsStatus").innerHTML=gpsHtml(g);
   stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
   $("video").srcObject=stream;$("customerProposalModal").classList.add("hidden");$("camModal").classList.remove("hidden");
 }catch(err){alert("No se pudo obtener GPS/cámara: "+err.message)}
};
$("incidentContinue").onclick=async()=>{
 try{
   const g=await geo();
   if(g.accuracy>150)return alert("GPS con baja precisión: "+Math.round(g.accuracy)+" m. Intenta de nuevo.");
   incidentGps=g; currentMode="incident"; currentVisitId=null;
   $("camTitle").textContent="🚨 Evidencia del imprevisto"; $("camGpsStatus").innerHTML=gpsHtml(g);
   stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
   $("video").srcObject=stream; $("incidentModal").classList.add("hidden"); $("camModal").classList.remove("hidden");
 }catch(err){alert("No se pudo obtener GPS/cámara: "+err.message)}
};
$("sellerPick").onchange=async ev=>{sellerId=ev.target.value;localStorage.setItem("rs_demo_seller",sellerId);pendingGps={};await load()};
$("refreshSeller").onclick=load;
window.captureGps=captureGps;window.openCameraForVisit=openCameraForVisit;window.openIncident=openIncident;
load();