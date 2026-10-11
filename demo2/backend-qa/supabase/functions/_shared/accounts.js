// Independent backend candidate. Manual GoTrue validation also supports asymmetric JWTs.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function accountHandler({createClient,url,anon,service,operation}){
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const rpc=async(client,name,args)=>{const {data,error}=await client.rpc(name,args);if(error)throw Error(error.message);return data};
 return async req=>{
  const origin=req.headers.get('origin'),headers={'Content-Type':'application/json','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
  // QA candidate only. Production needs an explicit allowlist instead of arbitrary origins.
  if(origin){let local=false;try{local=['127.0.0.1','localhost'].includes(new URL(origin).hostname)}catch{}if(!local)return new Response(JSON.stringify({error:'Origen no autorizado.'}),{status:403,headers});headers['Access-Control-Allow-Origin']=origin;headers.Vary='Origin';}
  const response=(status,data)=>new Response(JSON.stringify(data),{status,headers});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return response(405,{error:'Método no permitido.'});
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');if(!token)return response(401,{error:'Sesión requerida.'});
  const {data:identity,error:authError}=await admin.auth.getUser(token);if(authError||!identity.user)return response(401,{error:'Sesión inválida.'});
  const user=createClient(url,anon,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}}),actor=identity.user.id;
  let body;try{const reader=req.body?.getReader();if(!reader)throw Error('body');const chunks=[];let bytes=0;while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>8192){await reader.cancel();return response(413,{error:'Solicitud demasiado grande.'})}chunks.push(value)}const raw=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){raw.set(chunk,offset);offset+=chunk.byteLength}body=JSON.parse(new TextDecoder().decode(raw));}catch{return response(400,{error:'Solicitud inválida.'})}
  if(!body||typeof body!=='object'||Array.isArray(body)||('company_id' in body))return response(400,{error:'Solicitud inválida.'});
  if(operation==='reset'){
   if(!uuid.test(body.target_user_id||'')||typeof body.new_password!=='string'||body.new_password.length<12||body.new_password.length>128)return response(400,{error:'Contraseña de 12 a 128 caracteres requerida.'});
   const nonce=crypto.randomUUID();try{
    await rpc(user,'rs_begin_reset',{p_target:body.target_user_id,p_nonce:nonce});
    const {error}=await admin.auth.admin.updateUserById(body.target_user_id,{password:body.new_password});if(error)return response(503,{error:'Reset incompleto; acceso a datos bloqueado hasta recuperación por Central.'});
    await rpc(admin,'rs_finish_reset',{p_target:body.target_user_id,p_nonce:nonce,p_actor:actor});
    return response(200,{ok:true,require_new_login:true});
   }catch{return response(403,{error:'Reset rechazado o incompleto. Actualiza el estado antes de reintentar.'})}
  }
  if(!uuid.test(body.request_id||'')||typeof body.password!=='string'||body.password.length<12||body.password.length>128)return response(400,{error:'Identificador de solicitud y contraseña de 12 a 128 caracteres requeridos.'});
  const worker=crypto.randomUUID(),args={p_id:body.request_id,p_worker:worker,p_actor:actor};let created=null,reserved=false;
  try{
   const reservation=await rpc(user,'rs_reserve_account',{p_id:body.request_id,p_worker:worker,p_email:body.email,p_name:body.full_name,p_role:body.role,p_supervisor:body.supervisor_user_id||null});
   if(reservation.state==='COMPLETE')return response(200,{ok:true,user_id:reservation.user_id,replayed:true});reserved=true;
   const context=await rpc(admin,'rs_provision_context',args);let id=context.auth_id;
   if(!id){
    const {data,error}=await admin.auth.admin.createUser({email:context.email,password:body.password,email_confirm:true,app_metadata:{rutasales_request_id:body.request_id}});
    if(error||!data.user)throw Error('Auth creation failed');id=data.user.id;created=id;
   }
   const result=await rpc(admin,'rs_finish_account',{...args,p_user:id});
   return response(200,{ok:true,user_id:result,replayed:false});
  }catch{
   if(reserved){try{
    // Re-authorize worker and inspect link status before any compensation. A failed or
    // superseded worker never deletes an identity created/recovered by another worker.
    const context=await rpc(admin,'rs_provision_context',args);
    if(created&&context.auth_id===created){const {data,error}=await admin.auth.admin.getUserById(created);if(!error&&data.user?.app_metadata?.rutasales_request_id===body.request_id){
      // Finish response may be lost after COMMIT: check completed replay first.
      const {data:accounts,error:checkError}=await user.from('rs_accounts').select('user_id').eq('user_id',created);
      if(!checkError&&accounts.length===0)await admin.auth.admin.deleteUser(created);
    }}
    await rpc(admin,'rs_close_account_request',args);
   }catch{/* Keep durable reservation/metadata for reconciliation; never report success. */}}
   return response(409,{error:'Alta no completada. Conserva la solicitud y consulta su estado antes de reintentar.'});
  }
 };
}
