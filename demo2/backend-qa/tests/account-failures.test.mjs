// Fault injection verifies handler decisions; this is not a real GoTrue/network test.
import test from 'node:test';
import assert from 'node:assert/strict';
import {accountHandler} from '../supabase/functions/_shared/accounts.js';
const id='00000000-0000-4000-8000-000000000001';
const actor='00000000-0000-4000-8000-000000000002';
const secret='Synthetic-only-strong-password';
const body={request_id:id,email:'qa@example.invalid',password:secret,full_name:'QA',role:'SUPERVISOR'};
function fixture({fault='',operation='create',recovered=false}={}){
 const calls=[];const state={created:recovered,linked:false,complete:false,closed:null,blocked:false};
 const ok=data=>({data,error:null}),bad=message=>({data:null,error:{message}});
 const authAdmin={
  createUser:async()=>{calls.push('createAuth');if(fault==='create')return bad('unavailable');state.created=true;return ok({user:{id}})},
  getUserById:async()=>ok({user:{id,app_metadata:{rutasales_request_id:id}}}),
  deleteUser:async()=>{calls.push('deleteAuth');if(fault==='delete')return bad('unavailable');state.created=false;return ok({})},
  updateUserById:async()=>{calls.push('updatePassword');return fault==='password'?bad('unavailable'):ok({user:{id}})}
 };
 const createClient=()=>({auth:{getUser:async()=>ok({user:{id:actor}}),admin:authAdmin},
  rpc:async name=>{
   calls.push(name);
   if(name==='rs_reserve_account')return fault==='reserve'?bad('quota'):ok({state:'PENDING'});
   if(name==='rs_provision_context')return state.complete||fault==='expired'?bad('request unauthorized'):ok({auth_id:state.created?id:null,email:body.email});
   if(name==='rs_finish_account'){
    if(['finish','delete'].includes(fault))return bad('SQL failure');
    state.linked=true;state.complete=true;
    return fault==='lostFinish'?bad('response lost after COMMIT'):ok(id);
   }
   if(name==='rs_close_account_request'){state.closed=state.created?'RECONCILE':'FAILED';return ok(null)}
   if(name==='rs_begin_reset'){if(state.blocked)return bad('reset in progress');state.blocked=true;return ok(id)}
   if(name==='rs_finish_reset'){if(fault==='resetFinish')return bad('SQL unavailable');state.blocked=false;return ok(null)}
   throw Error('Unexpected RPC '+name);
  },from:()=>({select:()=>({eq:async()=>ok(state.linked?[{user_id:id}]:[])})})});
 const handler=accountHandler({createClient,url:'http://127.0.0.1',anon:'qa',service:'qa-service',operation});
 const run=()=>handler(new Request('http://127.0.0.1/functions',{method:'POST',headers:{Authorization:'Bearer qa','Content-Type':'application/json'},body:JSON.stringify(operation==='reset'?{target_user_id:id,new_password:secret}:body)}));
 return {calls,state,run};
}
test('Reserva rechazada nunca crea ni borra identidad Auth',async()=>{const f=fixture({fault:'reserve'});assert.equal((await f.run()).status,409);assert.deepEqual(f.calls,['rs_reserve_account'])});
test('Auth no creado libera solicitud sin borrar otro usuario',async()=>{const f=fixture({fault:'create'});assert.equal((await f.run()).status,409);assert.equal(f.state.closed,'FAILED');assert.ok(!f.calls.includes('deleteAuth'))});
test('Finalización fallida compensa únicamente identidad recién creada',async()=>{const f=fixture({fault:'finish'});assert.equal((await f.run()).status,409);assert.equal(f.state.created,false);assert.equal(f.state.closed,'FAILED');assert.equal(f.calls.filter(x=>x==='deleteAuth').length,1)});
test('Compensación fallida conserva Auth y estado RECONCILE',async()=>{const f=fixture({fault:'delete'});assert.equal((await f.run()).status,409);assert.equal(f.state.created,true);assert.equal(f.state.closed,'RECONCILE')});
test('Respuesta SQL perdida tras COMMIT nunca borra usuario ya vinculado',async()=>{const f=fixture({fault:'lostFinish'});assert.equal((await f.run()).status,409);assert.equal(f.state.linked,true);assert.equal(f.state.created,true);assert.ok(!f.calls.includes('deleteAuth'));assert.equal(f.state.closed,null)});
test('Recuperación de Auth etiquetado no crea una segunda identidad',async()=>{const f=fixture({recovered:true});assert.equal((await f.run()).status,200);assert.equal(f.state.linked,true);assert.ok(!f.calls.includes('createAuth'));assert.ok(!f.calls.includes('deleteAuth'))});
test('Worker no autorizado no crea ni compensa identidades',async()=>{const f=fixture({fault:'expired',recovered:true});assert.equal((await f.run()).status,409);assert.equal(f.state.created,true);assert.ok(!f.calls.includes('deleteAuth'));assert.ok(!f.calls.includes('createAuth'))});
test('Reset con fallo Auth o SQL queda bloqueado y segundo intento no cambia contraseña',async()=>{for(const fault of ['password','resetFinish']){const f=fixture({operation:'reset',fault});assert.ok((await f.run()).status>=400);assert.equal(f.state.blocked,true);assert.ok((await f.run()).status>=400);assert.equal(f.calls.filter(x=>x==='updatePassword').length,1)}});
