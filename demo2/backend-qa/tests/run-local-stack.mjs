// Disposable CI local stack only. No linked-project or remote commands.
import {execFileSync,spawnSync} from 'node:child_process';import {readFileSync,existsSync} from 'node:fs';import {resolve} from 'node:path';import assert from 'node:assert/strict';
assert.equal(process.env.GITHUB_ACTIONS,'true','Launcher restricted to disposable GitHub CI');
assert.equal(process.env.RUNNER_ENVIRONMENT,'github-hosted','Requires fresh hosted runner');
const cli=resolve('node_modules/.bin/supabase');
assert.match(readFileSync('supabase/config.toml','utf8'),/project_id = "rutasales-backend-qa"/);
assert.equal(existsSync('supabase/.temp/project-ref'),false,'Never run with a linked project');
assert.equal(execFileSync(cli,['--version'],{encoding:'utf8'}).trim(),'2.120.0');
const command=args=>execFileSync(cli,[...args,'--workdir','.'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:600000,maxBuffer:64*1024*1024});
let result=1;
try{
 console.log('Starting disposable LOCAL Supabase: Auth + REST + PostgreSQL');
 command(['start','--exclude','realtime,storage-api,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor']);
 command(['db','reset','--local','--no-seed','--yes']);
 console.log('Local migrations applied; testing real Auth and REST/RPC');
 result=spawnSync(process.execPath,['--test','tests/auth-api.test.mjs'],{stdio:'inherit',env:{...process.env,SUPABASE_CLI:cli},timeout:180000}).status??1;
}catch(e){const clean=String(e.stderr||e.message).replace(/eyJ[A-Za-z0-9._-]+/g,'[JWT omitted]').replace(/sb_(secret|publishable)_[A-Za-z0-9_-]+/g,'[key omitted]').replace(/postgres(?:ql)?:\/\/[^\s]+/g,'[local DB URL omitted]');console.error(clean.slice(-2500));}
finally{try{command(['stop','--no-backup']);console.log('Disposable stack stopped and volumes removed')}catch{console.error('Stack cleanup failed; runner remains disposable')}}
process.exitCode=result;
