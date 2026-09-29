// Mejora móvil para cambio de rol y confirmación visual.
(function(){
  function switchRoleSafe(roleName){
    const seller=document.getElementById('seller');
    const supervisor=document.getElementById('supervisor');
    if(!seller||!supervisor)return;
    const isSupervisor=roleName==='supervisor';
    seller.classList.toggle('hidden',isSupervisor);
    supervisor.classList.toggle('hidden',!isSupervisor);
    try{ if(typeof render==='function') render(); }catch(e){ console.error('Render de rol:',e); }
    let banner=document.getElementById('roleModeBanner');
    if(!banner){
      banner=document.createElement('div');
      banner.id='roleModeBanner';
      banner.className='card no-print';
      const main=document.querySelector('main');
      if(main)main.insertBefore(banner,main.firstChild);
    }
    banner.innerHTML=isSupervisor?'<b>👔 Modo Supervisor activo</b><div class="small">Viendo asignaciones, avances y evidencias guardadas en este teléfono.</div>':'<b>📱 Modo Vendedor activo</b><div class="small">Viendo la ruta y evidencias del vendedor.</div>';
    const target=isSupervisor?supervisor:seller;
    setTimeout(()=>target.scrollIntoView({behavior:'smooth',block:'start'}),50);
  }
  window.switchRoleSafe=switchRoleSafe;
  document.addEventListener('DOMContentLoaded',()=>{
    const bSeller=document.getElementById('btnSeller');
    const bSupervisor=document.getElementById('btnSupervisor');
    if(bSeller)bSeller.addEventListener('click',e=>{e.preventDefault();switchRoleSafe('seller');});
    if(bSupervisor)bSupervisor.addEventListener('click',e=>{e.preventDefault();switchRoleSafe('supervisor');});
  });
})();
