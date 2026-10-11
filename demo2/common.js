import {rolePage,validGps} from "./operations.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/+esm";
export const URL="https://ezfqvhoprfstcmdiflcm.supabase.co";
export const KEY="sb_publishable_wLgcGxNPSly8oN321Wqllg_aBbhPbKM";
export const supabase=createClient(URL,KEY);
// QA server substitutes this constant only on loopback; published runtime remains legacy.
export const candidateBackend=false;
export const $=id=>document.getElementById(id);
export const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
export async function sessionAccount(){
 const {data:{session}}=await supabase.auth.getSession();
 if(!session){location.href="index.html";return null}
 const {data,error}=await supabase.from("rs_accounts").select("*").eq("user_id",session.user.id).single();
 if(error||!rolePage(data)){await supabase.auth.signOut();location.href="index.html";return null}
 return {session,account:data};
}
export async function requireRole(role){
 const x=await sessionAccount(); if(!x)return null;
 if(x.account.role!==role){
   location.href=rolePage(x.account);
   return null;
 }
 return x;
}
export async function logout(){await supabase.auth.signOut();location.href="index.html"}
export function geo(){
 return new Promise((ok,bad)=>navigator.geolocation.getCurrentPosition(
  p=>{const g={lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy,capturedAt:Date.now()};if(!validGps(g))return bad(Error("GPS inválido o precisión mayor a 150 m."));ok(g)},
  bad,{enableHighAccuracy:true,timeout:15000,maximumAge:0}
 ));
}