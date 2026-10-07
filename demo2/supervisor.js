import {supabase,$,esc,requireRole,logout} from "./common.js";

let account=null,sellers=[],routes=[],customers=[],visits=[],incidents=[],reassignments=[],filter="all",page=0,totalVisits=0;
const PAGE_SIZE=25;
const today=()=>new Date().toISOString().slice(0,10);
const routeName=id=>routes.find(x=>x.id===id)?.name||"Ruta";
const sellerName=id=>sellers.find(x=>x.id===id)?.name||"Vendedor";

function zone(v){
 const d=Number(v.distance_m);
 if(!Number.isFinite(d))return {key:"none",html:'<div class="small">Sin validación de distancia.</div>'};
 if(d<=100)return {key:"valid",html:'<div class="ok">✅ VISITA VÁLIDA — '+Math.round(d)+' m</div>'};
 if(d<=250)return {key:"review",html:'<div style="font-weight:800">⚠️ REVISAR — '+Math.round(d)+' m</div>'};
 return {key:"out",html:'<div class="danger">❌ FUERA DE ZONA — '+Math.round(d)+' m</div>'};
}
function renderVisits(){
 const list=filter==="all"?visits:visits.filter(v=>zone(v).key===filter);
 $("visitsList").innerHTML=list.length?list.map(v=>{
   const gps=(v.lat!=null&&v.lng!=null)?'<div class="small">📍 '+Number(v.lat).toFixed(6)+', '+Number(v.lng).toFixed(6)+' · ±'+Math.round(v.accuracy||0)+' m</div>':'';
   const photo=v.has_photo?'<div><button class="light" onclick="loadVisitPhoto(\''+v.id+'\',this)">📷 Ver evidencia</button><div id="photo_'+v.id+'"></div></div>':'';
   const stamp=v.completed_at?'<div class="small">Hora servidor: '+new Date(v.completed_at).toLocaleString()+'</div>':'';
   return '<div class="visit"><b>'+esc(v.customer_name)+'</b> <span class="badge">'+esc(v.status)+'</span><div class="small">'+esc(routeName(v.route_id))+' · '+esc(sellerName(v.seller_id))+' · '+esc(v.visit_date)+' · Intento '+(v.attempt_no||1)+'</div>'+(v.reprogram_reason?'<div class="small">Reprogramación: '+esc(v.reprogram_reason)+'</div>':'')+gps+stamp+zone(v).html+photo+'</div>';
 }).join(""):'<div class="small">Sin visitas en este filtro.</div>';
}
function fillSelectors(){
 const rv=$("route").value,sv=$("seller").value,cv=$("customer").value;
 $("route").innerHTML=routes.map(r=>'<option value="'+r.id+'">'+esc(r.name)+'</option>').join("");
 $("seller").innerHTML=sellers.map(s=>'<option value="'+s.id+'">'+esc(s.name)+'</option>').join("");
 if($("pdfSeller"))$("pdfSeller").innerHTML=sellers.map(s=>'<option value="'+s.id+'">'+esc(s.name)+'</option>').join("");
 $("customer").innerHTML=customers.map(c=>'<option value="'+c.id+'">'+esc(c.name)+'</option>').join("");
 if(routes.some(x=>x.id===rv))$("route").value=rv;
 if(sellers.some(x=>x.id===sv))$("seller").value=sv;
 if(customers.some(x=>x.id===cv))$("customer").value=cv;
 updateCustomerInfo();
}
function updateCustomerInfo(){
 const c=customers.find(x=>x.id===$("customer").value);
 $("customerInfo").innerHTML=c?'<b>'+esc(c.name)+'</b><div>'+esc(c.address)+'</div><div>GPS esperado: '+Number(c.lat).toFixed(6)+', '+Number(c.lng).toFixed(6)+' · radio '+c.allowed_radius_m+' m</div>':'Selecciona un cliente.';
}
function renderProposals(){
 const proposals=incidents.filter(i=>i.incident_type==="NUEVO CLIENTE");
 $("proposalList").innerHTML=proposals.length?proposals.map(i=>{
  const photo='<div><button class="light" onclick="loadIncidentPhoto(\''+i.id+'\',this)">📷 Ver evidencia</button><div id="incphoto_'+i.id+'"></div></div>';
  const status=i.resolved?(i.resolution_note==="APROBADO"?"✅ APROBADO":"❌ "+esc(i.resolution_note||"REVISADO")):"⏳ PENDIENTE";
  const buttons=!i.resolved?'<button onclick="approveProposal(\''+i.id+'\')">✅ Aprobar y guardar cliente</button><button class="light" onclick="rejectProposal(\''+i.id+'\')">❌ Rechazar</button>':'';
  return '<div class="visit"><b>➕ '+esc(i.proposal_name||"Negocio nuevo")+'</b> <span class="badge">'+status+'</span><div class="small">Vendedor: '+esc(sellerName(i.seller_id))+' · Ruta: '+esc(routeName(i.route_id))+'</div><div>'+esc(i.proposal_address||"Sin referencia")+'</div><div class="small">GPS '+Number(i.lat).toFixed(6)+', '+Number(i.lng).toFixed(6)+' · ±'+Math.round(i.accuracy||0)+' m</div>'+photo+buttons+'</div>';
 }).join(""):'<div class="small">Sin negocios propuestos.</div>';
}
function renderIncidents(){
 const normal=incidents.filter(i=>i.incident_type!=="NUEVO CLIENTE");
 $("incidentsList").innerHTML=normal.length?normal.map(i=>{
   const photo='<div><button class="light" onclick="loadIncidentPhoto(\''+i.id+'\',this)">📷 Ver evidencia</button><div id="incphoto_'+i.id+'"></div></div>';
   const others=sellers.filter(s=>s.id!==i.seller_id);
   const controls=!i.resolved?'<select id="to_'+i.id+'">'+others.map(s=>'<option value="'+s.id+'">'+esc(s.name)+'</option>').join("")+'</select><button onclick="reassignIncident(\''+i.id+'\',\''+i.route_id+'\',\''+i.seller_id+'\')">↔️ Reasignar pendientes</button><button class="light" onclick="resolveIncident(\''+i.id+'\')">✅ Atendido sin reasignación</button>':'<div class="ok">Resuelto: '+esc(i.resolution_note||"Atendido")+'</div>';
   return '<div class="visit"><b>🚨 '+esc(i.incident_type)+'</b><div class="small">'+esc(sellerName(i.seller_id))+' · '+esc(routeName(i.route_id))+'</div><div>'+esc(i.details||"")+'</div><div class="small">GPS '+Number(i.lat).toFixed(6)+', '+Number(i.lng).toFixed(6)+' · ±'+Math.round(i.accuracy||0)+' m</div>'+photo+controls+'</div>';
 }).join(""):'<div class="small">Sin contingencias.</div>';
}
function renderHistory(){
 $("reassignList").innerHTML=reassignments.length?reassignments.map(r=>'<div class="visit"><b>'+esc(routeName(r.route_id))+'</b><div>'+esc(sellerName(r.from_seller_id))+' → '+esc(sellerName(r.to_seller_id))+'</div><div class="small">'+r.pending_count+' pendiente(s) · '+new Date(r.created_at).toLocaleString()+'</div><div class="small">'+esc(r.reason||"")+'</div></div>').join(""):'<div class="small">Sin reasignaciones.</div>';
}
async function load(){
 const x=await requireRole("SUPERVISOR");if(!x)return;account=x.account;$("welcome").textContent="Supervisor · "+account.full_name;
 const [sr,rr,cr,vr,ir,hr]=await Promise.all([
   supabase.from("rs_sellers").select("*").eq("active",true).order("name"),
   supabase.from("rs_routes").select("*").eq("active",true).order("name"),
   supabase.from("rs_customers").select("*").eq("active",true).order("name"),
   supabase.from("rs_visits").select("id,route_id,seller_id,customer_id,customer_name,address,visit_date,status,result,lat,lng,accuracy,started_at,completed_at,original_seller_id,created_at,evidence_source,device_captured_at,target_lat,target_lng,allowed_radius_m,distance_m,within_zone,parent_visit_id,attempt_no,reprogrammed_for,reprogram_reason",{count:"exact"}).eq("visit_date",($("historyDate")?.value||today())).order("created_at",{ascending:false}).range(page*PAGE_SIZE,page*PAGE_SIZE+PAGE_SIZE-1),
   supabase.from("rs_incidents").select("id,route_id,seller_id,incident_type,details,lat,lng,accuracy,captured_at,resolved,reassigned_to,created_at,resolved_at,resolution_note,proposal_name,proposal_address,approved_customer_id").order("created_at",{ascending:false}).limit(50),
   supabase.from("rs_reassignments").select("*").order("created_at",{ascending:false}).limit(50)
 ]);
 const err=[sr,rr,cr,vr,ir,hr].find(x=>x.error)?.error;
 if(err){$("visitsList").innerHTML='<div class="danger">'+esc(err.message)+'</div>';return}
 sellers=sr.data||[];routes=rr.data||[];customers=cr.data||[];visits=(vr.data||[]).map(v=>({...v,has_photo:!!v.evidence_source}));totalVisits=vr.count||0;incidents=ir.data||[];reassignments=hr.data||[];
 if($("pageInfo"))$("pageInfo").textContent=(page+1)+" / "+Math.max(1,Math.ceil(totalVisits/PAGE_SIZE));
 if($("prevPage"))$("prevPage").disabled=page===0;
 if($("nextPage"))$("nextPage").disabled=(page+1)*PAGE_SIZE>=totalVisits;
 $("kSellers").textContent=sellers.length;$("kRoutes").textContent=routes.length;$("kVisits").textContent=totalVisits;
 $("kPending").textContent=visits.filter(v=>v.status==="PENDIENTE").length;$("kDone").textContent=visits.filter(v=>v.status==="COMPLETADA").length;
 $("kProposals").textContent=incidents.filter(i=>i.incident_type==="NUEVO CLIENTE"&&!i.resolved).length;
 $("kIncidents").textContent=incidents.filter(i=>i.incident_type!=="NUEVO CLIENTE"&&!i.resolved).length;
 $("kValid").textContent=visits.filter(v=>zone(v).key==="valid").length;$("kReview").textContent=visits.filter(v=>zone(v).key==="review").length;$("kOut").textContent=visits.filter(v=>zone(v).key==="out").length;
 $("sellerList").innerHTML=sellers.map(s=>'<div class="visit"><b>'+esc(s.name)+'</b></div>').join("")||'<div class="small">Sin vendedores.</div>';
 $("routeList").innerHTML=routes.map(r=>'<div class="visit"><b>'+esc(r.name)+'</b></div>').join("")||'<div class="small">Sin rutas.</div>';
 fillSelectors();renderVisits();renderProposals();renderIncidents();renderHistory();
}

$("saveVisit").onclick=async()=>{
 const c=customers.find(x=>x.id===$("customer").value);
 if(!c)return $("saveMsg").textContent="Selecciona un cliente.";
 const routeId=$("route").value,sellerId=$("seller").value,date=$("date").value;
 if(!routeId||!sellerId)return $("saveMsg").textContent="Falta ruta o vendedor.";
 if(visits.some(v=>v.customer_id===c.id&&v.route_id===routeId&&v.visit_date===date))return $("saveMsg").textContent="⚠️ Este cliente ya está asignado en esa ruta y fecha.";
 const {error}=await supabase.from("rs_visits").insert({
   route_id:routeId,seller_id:sellerId,customer_id:c.id,customer_name:c.name,address:c.address,
   visit_date:date,status:"PENDIENTE",target_lat:c.lat,target_lng:c.lng,allowed_radius_m:c.allowed_radius_m
 });
 $("saveMsg").textContent=error?"No se pudo guardar: "+error.message:"Visita asignada.";
 if(!error)await load();
};

window.approveProposal=async id=>{
 const i=incidents.find(x=>x.id===id);if(!i)return;
 const {data:c,error:e1}=await supabase.from("rs_customers").insert({
   name:i.proposal_name,address:i.proposal_address||"Sin referencia",lat:i.lat,lng:i.lng,allowed_radius_m:100,active:true
 }).select("id").single();
 if(e1)return alert("No se pudo crear cliente: "+e1.message);
 const {error:e2}=await supabase.from("rs_incidents").update({resolved:true,resolved_at:new Date().toISOString(),resolution_note:"APROBADO",approved_customer_id:c.id}).eq("id",id);
 if(e2)return alert("Cliente creado, pero no se pudo cerrar la propuesta: "+e2.message);
 alert("Negocio aprobado y agregado al catálogo.");await load();
};
window.rejectProposal=async id=>{
 if(!confirm("¿Rechazar esta propuesta?"))return;
 const {error}=await supabase.from("rs_incidents").update({resolved:true,resolved_at:new Date().toISOString(),resolution_note:"RECHAZADO"}).eq("id",id);
 if(error)return alert(error.message);await load();
};
window.resolveIncident=async id=>{
 const {error}=await supabase.from("rs_incidents").update({resolved:true,resolved_at:new Date().toISOString(),resolution_note:"Atendido sin reasignación"}).eq("id",id);
 if(error)return alert(error.message);await load();
};
window.reassignIncident=async(id,routeId,fromSellerId)=>{
 const to=$("to_"+id)?.value;if(!to)return alert("Selecciona otro vendedor.");
 const pending=visits.filter(v=>v.seller_id===fromSellerId&&v.route_id===routeId&&v.status==="PENDIENTE");
 if(!pending.length)return alert("No hay visitas pendientes.");
 for(const v of pending){
   const {error}=await supabase.from("rs_visits").update({seller_id:to,original_seller_id:v.original_seller_id||fromSellerId}).eq("id",v.id);
   if(error)return alert("No se pudo reasignar: "+error.message);
 }
 const inc=incidents.find(x=>x.id===id);
 const reason=(inc?.incident_type||"Imprevisto")+(inc?.details?" · "+inc.details:"");
 const {error:hErr}=await supabase.from("rs_reassignments").insert({incident_id:id,route_id:routeId,from_seller_id:fromSellerId,to_seller_id:to,pending_count:pending.length,reason});
 if(hErr)return alert("Visitas reasignadas, pero no se guardó historial: "+hErr.message);
 await supabase.from("rs_incidents").update({resolved:true,resolved_at:new Date().toISOString(),reassigned_to:to,resolution_note:"Pendientes reasignados"}).eq("id",id);
 alert("Se reasignaron "+pending.length+" visita(s).");await load();
};

$("customer").onchange=updateCustomerInfo;
$("refresh").onclick=load;$("logout").onclick=logout;
document.querySelectorAll(".zoneFilter").forEach(b=>b.onclick=()=>{filter=b.dataset.filter;renderVisits()});
$("date").value=today();
load();
window.loadVisitPhoto=async(id,btn)=>{
 if(btn)btn.disabled=true;
 const {data,error}=await supabase.from("rs_visits").select("photo_data").eq("id",id).single();
 if(error){if(btn)btn.disabled=false;return alert("No se pudo cargar la evidencia: "+error.message)}
 const box=$("photo_"+id);
 if(box)box.innerHTML=data?.photo_data?'<img src="'+data.photo_data+'" alt="Evidencia" loading="lazy" style="width:100%;max-width:300px;border-radius:10px;margin-top:8px">':'<div class="small">Sin fotografía.</div>';
 if(btn)btn.remove();
};
if($("historyDate")){
 $("historyDate").value=today();
 $("historyDate").onchange=()=>{page=0;load()};
}
if($("prevPage"))$("prevPage").onclick=()=>{if(page>0){page--;load()}};
if($("nextPage"))$("nextPage").onclick=()=>{if((page+1)*PAGE_SIZE<totalVisits){page++;load()}};

window.loadIncidentPhoto=async(id,btn)=>{
 if(btn)btn.disabled=true;
 const {data,error}=await supabase.from("rs_incidents").select("photo_data").eq("id",id).single();
 if(error){if(btn)btn.disabled=false;return alert("No se pudo cargar la evidencia: "+error.message)}
 const box=$("incphoto_"+id);
 if(box)box.innerHTML=data?.photo_data?'<img src="'+data.photo_data+'" alt="Evidencia" loading="lazy" style="width:100%;max-width:300px;border-radius:10px;margin-top:8px">':'<div class="small">Sin fotografía.</div>';
 if(btn)btn.remove();
};

if($("pdfDate"))$("pdfDate").value=today();
if($("downloadPdf"))$("downloadPdf").onclick=async()=>{
 const sellerId=$("pdfSeller").value,date=$("pdfDate").value||today();
 if(!sellerId)return $("pdfMsg").textContent="Selecciona un vendedor.";
 $("pdfMsg").textContent="Generando PDF…";
 const {data,error}=await supabase.from("rs_visits")
   .select("customer_name,address,visit_date,status,result,accuracy,distance_m,within_zone,completed_at,created_at,attempt_no,reprogram_reason,evidence_source")
   .eq("seller_id",sellerId).eq("visit_date",date).order("created_at");
 if(error){$("pdfMsg").textContent="No se pudo generar: "+error.message;return}
 const seller=sellers.find(s=>s.id===sellerId);
 try{
   const {jsPDF}=await import("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm");
   const doc=new jsPDF({unit:"mm",format:"a4"});
   const rows=data||[];
   const counts={
     total:rows.length,
     done:rows.filter(x=>x.status==="COMPLETADA").length,
     pending:rows.filter(x=>x.status==="PENDIENTE").length,
     reprogram:rows.filter(x=>x.status==="REPROGRAMADA").length,
     out:rows.filter(x=>Number.isFinite(Number(x.distance_m))&&Number(x.distance_m)>250).length
   };
   doc.setFontSize(16);doc.text("RutaSales — Reporte diario",14,16);
   doc.setFontSize(10);
   doc.text("Supervisor: "+account.full_name,14,24);
   doc.text("Vendedor: "+(seller?.name||"Vendedor"),14,30);
   doc.text("Fecha: "+date,14,36);
   doc.text("Visitas: "+counts.total+"   Completadas: "+counts.done+"   Pendientes: "+counts.pending+"   Reprogramadas: "+counts.reprogram+"   Fuera de zona: "+counts.out,14,44);
   let y=54;
   rows.forEach((r,idx)=>{
     if(y>280){doc.addPage();y=16}
     const dist=Number.isFinite(Number(r.distance_m))?Math.round(Number(r.distance_m))+" m":"sin distancia";
     const line=(idx+1)+". "+(r.customer_name||"Cliente")+" | "+(r.status||"")+" | intento "+(r.attempt_no||1)+" | "+dist+(r.evidence_source?" | evidencia":"");
     const split=doc.splitTextToSize(line,180);
     doc.text(split,14,y);y+=split.length*5;
     if(r.reprogram_reason){const rr=doc.splitTextToSize("Motivo: "+r.reprogram_reason,174);doc.text(rr,18,y);y+=rr.length*5}
     y+=2;
   });
   doc.save("RutaSales_"+(seller?.name||"vendedor").replace(/[^a-z0-9]+/gi,"_")+"_"+date+".pdf");
   $("pdfMsg").textContent="✅ PDF generado.";
 }catch(e){$("pdfMsg").textContent="No se pudo crear el PDF: "+e.message}
};
