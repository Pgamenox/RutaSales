import {distanceValue} from './operations.js';
export function renderDailyReport(doc,{rows,supervisor,seller,date}){
 const counts={total:rows.length,done:rows.filter(x=>x.status==='COMPLETADA').length,pending:rows.filter(x=>x.status==='PENDIENTE').length,reprogram:rows.filter(x=>x.status==='REPROGRAMADA').length,out:rows.filter(x=>distanceValue(x.distance_m)!==null&&distanceValue(x.distance_m)>250).length};
 let y=16;
 const line=(text,size=10,x=14,width=180)=>{doc.setFontSize(size);for(const part of doc.splitTextToSize(String(text),width)){if(y>280){doc.addPage();y=16}doc.text(part,x,y);y+=size===16?8:5}};
 line('RutaSales - Reporte diario',16);y+=2;
 line('Supervisor: '+supervisor);line('Vendedor: '+seller);line('Fecha: '+date);y+=3;
 line(`Visitas: ${counts.total}   Completadas: ${counts.done}   Pendientes: ${counts.pending}   Reprogramadas: ${counts.reprogram}   Fuera de zona: ${counts.out}`);y+=5;
 rows.forEach((r,i)=>{const d=distanceValue(r.distance_m);line(`${i+1}. ${r.customer_name||'Cliente'} | ${r.status||''} | intento ${r.attempt_no||1} | ${d===null?'sin distancia':Math.round(d)+' m'}${r.evidence_source?' | evidencia':''}`);if(r.reprogram_reason)line('Motivo: '+r.reprogram_reason,10,18,174);y+=2});return counts;
}
