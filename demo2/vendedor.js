import {supabase,$,esc,requireRole,logout,geo} from "./common.js";

let account=null;
let routes=[];
let visits=[];
let incidents=[];
let pendingGps={};
let stream=null;
let currentMode="visit";
let currentVisitId=null;
let incidentRouteId=null;
let incidentGps=null;
let proposalGps=null;

function gpsHtml(g){
  return '<div style="margin-top:8px;padding:9px;border:1px solid #cfe3d5;background:#f3fff6;border-radius:9px"><b>✅ GPS obtenido</b><div>Latitud: '+g.lat.toFixed(6)+'</div><div>Longitud: '+g.lng.toFixed(6)+'</div><div>Precisión: ±'+Math.round(g.accuracy)+' m</div></div>';
}
function routeName(id){return routes.find(r=>r.id===id)?.name||"Ruta";}

async function load(){
  const x=await requireRole("VENDEDOR"); if(!x)return;
  account=x.account;
  $("welcome").textContent="Vendedor · "+account.full_name;

  const [{data:r,error:re},{data:v,error:ve},{data:i,error:ie}]=await Promise.all([
    supabase.from("rs_routes").select("*").eq("active",true).order("name"),
    supabase.from("rs_visits").select("*").order("visit_date").order("created_at"),
    supabase.from("rs_incidents").select("*").order("created_at",{ascending:false})
  ]);
  if(re||ve||ie){
    $("visitsList").innerHTML='<div class="danger">No se pudieron cargar los datos.</div>';
    return;
  }

  routes=r||[]; visits=v||[]; incidents=i||[];
  $("proposalRoute").innerHTML=routes.map(r=>'<option value="'+r.id+'">'+esc(r.name)+'</option>').join("");

  $("kAssigned").textContent=visits.length;
  $("kPending").textContent=visits.filter(v=>v.status==="PENDIENTE").length;
  $("kDone").textContent=visits.filter(v=>v.status==="COMPLETADA").length;

  $("visitsList").innerHTML=visits.length?visits.map(v=>{
    const route=esc(routeName(v.route_id));
    if(v.status!=="PENDIENTE"){
      const zone=Number.isFinite(Number(v.distance_m))
        ? (Number(v.distance_m)<=100?"✅ VÁLIDA":Number(v.distance_m)<=250?"⚠️ REVISAR":"❌ FUERA DE ZONA")
        : "";
      return '<div class="visit"><b>'+esc(v.customer_name)+'</b> <span class="badge">'+esc(v.status)+'</span><div class="small">'+route+' · '+esc(v.address)+' · '+esc(v.visit_date)+'</div><div class="ok">Evidencia enviada '+zone+'</div></div>';
    }
    const g=pendingGps[v.id];
    return '<div class="visit"><b>'+esc(v.customer_name)+'</b> <span class="badge">PENDIENTE</span><div class="small">'+route+' · '+esc(v.address)+' · '+esc(v.visit_date)+'</div>'+
      '<button type="button" onclick="captureGps(\''+v.id+'\')">1️⃣ 📍 Obtener mi ubicación</button>'+
      '<div id="gps_'+v.id+'">'+(g?gpsHtml(g):'<div class="small">GPS pendiente.</div>')+'</div>'+
      '<button type="button" id="photo_'+v.id+'" onclick="openCameraForVisit(\''+v.id+'\')" '+(g?'':'disabled')+'>2️⃣ 📷 Foto y enviar evidencia</button>'+
      '<button type="button" class="dark" onclick="openIncident(\''+v.route_id+'\')">🚨 Reportar imprevisto</button></div>';
  }).join(""):'<div class="small">Sin visitas asignadas.</div>';

  $("incidentsList").innerHTML=incidents.length?incidents.map(i=>{
    if(i.incident_type==="NUEVO CLIENTE"){
      const status=i.resolved?(i.resolution_note==="APROBADO"?"✅ APROBADO":"❌ "+esc(i.resolution_note||"REVISADO")):"⏳ PENDIENTE";
      return '<div class="visit"><b>➕ '+esc(i.proposal_name||"Negocio nuevo")+'</b> <span class="badge">'+status+'</span><div class="small">'+esc(i.proposal_address||"")+'</div><div class="small">GPS ±'+Math.round(i.accuracy||0)+' m</div></div>';
    }
    const status=i.resolved?"✅ ATENDIDO":"⏳ PENDIENTE";
    return '<div class="visit"><b>'+esc(i.incident_type)+'</b> <span class="badge">'+status+'</span><div class="small">'+esc(i.details||"")+'</div></div>';
  }).join(""):'<div class="small">Sin imprevistos ni altas.</div>';
}

window.captureGps=async id=>{
  try{
    const g=await geo();
    if(g.accuracy>150)return alert("GPS con baja precisión: ±"+Math.round(g.accuracy)+" m. Intenta de nuevo.");
    pendingGps[id]=g;
    $("gps_"+id).innerHTML=gpsHtml(g);
    $("photo_"+id).disabled=false;
  }catch(err){alert("No se pudo obtener tu ubicación: "+err.message)}
};

window.openCameraForVisit=async id=>{
  const g=pendingGps[id];
  if(!g)return alert("Primero obtén tu ubicación.");
  if(Date.now()-g.capturedAt>120000){delete pendingGps[id];await load();return alert("El GPS venció. Obtén tu ubicación nuevamente.");}
  currentMode="visit"; currentVisitId=id;
  $("camTitle").textContent="📷 Evidencia de visita";
  $("camGpsStatus").innerHTML=gpsHtml(g);
  await startCamera();
};

window.openIncident=routeId=>{
  incidentRouteId=routeId;
  $("incidentModal").classList.remove("hidden");
};

async function startCamera(){
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
    $("video").srcObject=stream;
    $("camModal").classList.remove("hidden");
  }catch(err){alert("No se pudo abrir la cámara: "+err.message)}
}
function closeCamera(){
  if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}
  $("video").srcObject=null;
  $("camModal").classList.add("hidden");
  currentVisitId=null;
}
async function snapshot(){
  const v=$("video");
  if(!v.videoWidth)throw new Error("La cámara aún no está lista.");
  let w=Math.min(1600,v.videoWidth),h=Math.round(v.videoHeight*(w/v.videoWidth));
  let quality=.78;
  const targetBytes=600*1024;
  const minQuality=.55;
  const encode=()=>{
    const canvas=document.createElement("canvas");
    canvas.width=w;canvas.height=h;
    canvas.getContext("2d").drawImage(v,0,0,w,h);
    return canvas.toDataURL("image/jpeg",quality);
  };
  const bytes=data=>Math.ceil((data.length-(data.indexOf(",")+1))*0.75);
  let data=encode();
  while(bytes(data)>targetBytes&&quality>minQuality){
    quality=Math.max(minQuality,quality-.07);
    data=encode();
  }
  while(bytes(data)>800*1024&&w>900){
    w=Math.round(w*.82);h=Math.round(v.videoHeight*(w/v.videoWidth));quality=.68;
    data=encode();
  }
  if(bytes(data)>800*1024)throw new Error("La fotografía sigue siendo demasiado pesada. Intenta nuevamente.");
  return data;
}

$("snapBtn").onclick=async()=>{
  let photo;
  try{photo=await snapshot()}catch(e){return alert(e.message)}

  if(currentMode==="visit"){
    const id=currentVisitId,g=pendingGps[id];
    if(!id||!g)return;
    if(Date.now()-g.capturedAt>120000){closeCamera();delete pendingGps[id];await load();return alert("El GPS venció. Repite el paso 1.");}
    const {error}=await supabase.from("rs_visits").update({
      status:"COMPLETADA",lat:g.lat,lng:g.lng,accuracy:g.accuracy,
      photo_data:photo,evidence_source:"LIVE_CAMERA",device_captured_at:new Date().toISOString()
    }).eq("id",id);
    if(error)return alert("No se pudo enviar: "+error.message);
    delete pendingGps[id];closeCamera();alert("Visita enviada con GPS + cámara en vivo.");await load();
  }

  if(currentMode==="incident"){
    const g=incidentGps;
    if(!incidentRouteId||!g)return;
    if(Date.now()-g.capturedAt>120000){closeCamera();return alert("El GPS del imprevisto venció.");}
    const {error}=await supabase.from("rs_incidents").insert({
      route_id:incidentRouteId,seller_id:account.seller_id,
      incident_type:$("incidentType").value,details:$("incidentDetails").value.trim(),
      lat:g.lat,lng:g.lng,accuracy:g.accuracy,photo_data:photo,resolved:false
    });
    if(error)return alert("No se pudo enviar el imprevisto: "+error.message);
    closeCamera();$("incidentModal").classList.add("hidden");$("incidentDetails").value="";
    incidentRouteId=null;incidentGps=null;alert("Imprevisto enviado al supervisor.");await load();
  }

  if(currentMode==="customer"){
    const g=proposalGps,name=$("proposalName").value.trim(),address=$("proposalAddress").value.trim(),routeId=$("proposalRoute").value;
    if(!g||!name||!routeId)return;
    if(Date.now()-g.capturedAt>120000){closeCamera();return alert("El GPS venció.");}
    const {error}=await supabase.from("rs_incidents").insert({
      route_id:routeId,seller_id:account.seller_id,incident_type:"NUEVO CLIENTE",
      details:"Alta propuesta por vendedor",proposal_name:name,proposal_address:address,
      lat:g.lat,lng:g.lng,accuracy:g.accuracy,photo_data:photo,resolved:false
    });
    if(error)return alert("No se pudo enviar el negocio: "+error.message);
    closeCamera();$("proposalName").value="";$("proposalAddress").value="";proposalGps=null;
    alert("Negocio enviado al supervisor para aprobación.");await load();
  }
};

$("incidentContinue").onclick=async()=>{
  try{
    const g=await geo();
    if(g.accuracy>150)return alert("GPS con baja precisión: ±"+Math.round(g.accuracy)+" m.");
    incidentGps=g;currentMode="incident";currentVisitId=null;
    $("camTitle").textContent="🚨 Evidencia del imprevisto";$("camGpsStatus").innerHTML=gpsHtml(g);
    $("incidentModal").classList.add("hidden");await startCamera();
  }catch(err){alert("No se pudo obtener GPS/cámara: "+err.message)}
};

$("proposalContinue").onclick=async()=>{
  const name=$("proposalName").value.trim();
  if(!name)return alert("Escribe el nombre del negocio.");
  if(!$("proposalRoute").value)return alert("No tienes una ruta disponible.");
  try{
    const g=await geo();
    if(g.accuracy>150)return alert("GPS con baja precisión: ±"+Math.round(g.accuracy)+" m.");
    proposalGps=g;currentMode="customer";currentVisitId=null;
    $("camTitle").textContent="➕ Foto del negocio nuevo";$("camGpsStatus").innerHTML=gpsHtml(g);
    $("customerProposalModal").classList.add("hidden");await startCamera();
  }catch(err){alert("No se pudo obtener GPS/cámara: "+err.message)}
};

$("openCustomerProposal").onclick=()=>$("customerProposalModal").classList.remove("hidden");
$("proposalCancel").onclick=()=>{$("customerProposalModal").classList.add("hidden");proposalGps=null};
$("incidentCancel").onclick=()=>{$("incidentModal").classList.add("hidden");incidentRouteId=null};
$("cancelCam").onclick=closeCamera;
$("refreshSeller").onclick=load;
$("logout").onclick=logout;

load();