import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import {accountHandler} from '../_shared/accounts.js';
Deno.serve(accountHandler({createClient,url:Deno.env.get('SUPABASE_URL'),anon:Deno.env.get('SUPABASE_ANON_KEY'),service:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),operation:'reset'}));
