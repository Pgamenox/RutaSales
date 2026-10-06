import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
export const URL="https://ezfqvhoprfstcmdiflcm.supabase.co";
export const KEY="sb_publishable_wLgcGxNPSly8oN321Wqllg_aBbhPbKM";
export const supabase=createClient(URL,KEY);
export const $=id=>document.getElementById(id);
export const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
export async function sessionAccount(){
 const {data:{session}}=await supabase.auth.getSession();
 if(!session){location.href="index.html";return null}
 const {data,error}=await supabase.from("rs_accounts").select("*").eq("user_id",session.user.id).single();
 if(error||!data||!data.active){await supabase.auth.signOut();location.href="index.html";return null}
 return {session,account:data};
}
export async function requireRole(role){
 const x=await sessionAccount(); if(!x)return null;
 if(x.account.role!==role){
   location.href=x.account.role==="CENTRAL"?"central.html":x.account.role==="SUPERVISOR"?"supervisor.html":"vendedor.html";
   return null;
 }
 return x;
}
export async function logout(){await supabase.auth.signOut();location.href="index.html"}
export function geo(){
 return new Promise((ok,bad)=>navigator.geolocation.getCurrentPosition(
  p=>ok({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy,capturedAt:Date.now()}),
  bad,{enableHighAccuracy:true,timeout:15000,maximumAge:0}
 ));
}