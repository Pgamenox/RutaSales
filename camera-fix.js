// Ajuste móvil: evita llamar play() mientras el stream aún está iniciando.
window.openCamera=async function(id){
  const v=db.visits.find(x=>x.id===id);
  if(!v||!v.pending)return;
  if(!window.isSecureContext)return alert('La cámara en vivo requiere HTTPS.');
  if(!navigator.mediaDevices?.getUserMedia)return alert('Este navegador no permite cámara en vivo.');

  if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}
  const video=$('camVideo');
  video.pause();
  video.srcObject=null;
  camVisitId=id;
  $('camModal').classList.remove('hidden');
  $('camStatus').textContent='Solicitando cámara trasera…';

  try{
    stream=await navigator.mediaDevices.getUserMedia({
      video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},
      audio:false
    });
    video.autoplay=true;
    video.playsInline=true;
    video.muted=true;
    video.onloadedmetadata=()=>{
      $('camStatus').textContent='Cámara en vivo activa. Toma la evidencia ahora.';
    };
    video.srcObject=stream;
    if(video.readyState>=1){
      $('camStatus').textContent='Cámara en vivo activa. Toma la evidencia ahora.';
    }
  }catch(e){
    closeCamera();
    alert('No se pudo abrir la cámara: '+(e.message||e.name));
  }
};
