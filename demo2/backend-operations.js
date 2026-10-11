// Candidate RPC adapter. Activated only by the isolated QA server until rollout is approved.
export function candidateOperations(client){
 const call=async(name,args)=>{const {data,error}=await client.rpc(name,args);if(error)throw Error(error.message);return data};
 const evidence=g=>({p_lat:g.lat,p_lng:g.lng,p_accuracy:g.accuracy,p_time:new Date(g.capturedAt).toISOString()});
 return {
  complete:(id,g,photo)=>call('rs_complete_visit',{p_id:id,...evidence(g),p_photo:photo,p_result:null}),
  submit:(route,type,details,name,address,g,photo)=>call('rs_submit_incident',{p_route:route,p_type:type,p_details:details,p_name:name,p_address:address,...evidence(g),p_photo:photo}),
  resolve:(id,decision)=>call('rs_resolve_incident',{p_id:id,p_decision:decision}),
  reassign:(id,to,reason)=>call('rs_reassign_incident',{p_incident:id,p_to:to,p_reason:reason}),
  deactivate:(seller,to)=>call('rs_deactivate_seller',{p_seller:seller,p_to:to}),
  assignRoute:(route,supervisor)=>call('rs_assign_route',{p_route:route,p_supervisor:supervisor})
 };
}
