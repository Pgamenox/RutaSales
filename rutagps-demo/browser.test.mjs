// Run explicitly: PLAYWRIGHT_MODULE=/absolute/path/to/playwright node rutagps-demo/browser.test.mjs
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=resolve('rutagps-demo');
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!path.startsWith(root+'/'))throw Error();const data=await readFile(path);res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':'text/html');res.end(data)}catch{res.statusCode=404;res.end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/admin.html');await page.locator('#company').fill('Empresa A');await page.locator('#add').click();await page.locator('#assignBtn').click();
 await page.locator('#company').fill('Empresa B');await page.locator('#capacity').selectOption('12');await page.locator('#add').click();await page.locator('#assignBtn').click();await page.locator('#assignBtn').click();
 await page.goto(base+'/central.html');assert.equal(await page.locator('#rows tr').count(),2);await page.locator('#start').click();await page.locator('#next').click();assert.equal(await page.locator('#working').textContent(),'2');await page.locator('#pause').click();assert.equal(await page.locator('#working').textContent(),'0');assert.ok(await page.locator('#next').isDisabled());
 const a=await page.locator('#companySelect option').first().getAttribute('value');await page.locator('#companySelect').selectOption(a);await page.goto(base+'/historial.html');assert.equal(await page.locator('#device option').count(),1);await page.locator('#csv').click();
 await page.goto(base+'/admin.html');await page.locator('#records tr').first().locator('[data-action="toggle"]').click();await page.goto(base+'/central.html');assert.ok(await page.locator('#start').isDisabled());await page.goto(base+'/historial.html');assert.equal(await page.locator('#device option').count(),0);assert.ok(await page.locator('#csv').isDisabled());
 await page.goto(base+'/admin.html');await page.locator('#records tr').first().locator('[data-action="renew"]').click();await page.goto(base+'/historial.html');assert.equal(await page.locator('#device option').count(),1);
 // Cross-tab removal invalidates history without reload.
 const admin=await page.context().newPage();await admin.goto(base+'/admin.html');await admin.locator('[data-unassign]').click();await page.waitForFunction(()=>document.querySelector('#device').options.length===0);
 for(const capacity of [5,12,15,30]){await page.evaluate(cap=>{const c={id:'qa',name:'Empresa QA',capacity:cap,status:'ACTIVE',expiresAt:'2099-01-01',workers:Array.from({length:cap},(_,i)=>'GPS-'+String(i+1).padStart(3,'0'))};localStorage.setItem('rutagps_beta_demo_v1',JSON.stringify({version:1,companies:[c],selectedCompanyId:'qa'}))},capacity);await page.goto(base+'/central.html');assert.equal(await page.locator('#rows tr').count(),capacity);await page.locator('#start').click();await page.locator('#next').click();await page.goto(base+'/historial.html');assert.equal(await page.locator('#device option').count(),capacity)}
 await page.setViewportSize({width:390,height:844});await page.goto(base+'/central.html');assert.ok(await page.locator('#start').isVisible());
 assert.deepEqual(errors,[]);console.log('PASS browser: admin, company persistence, assignments, shifts, history, suspension, renewal, cross-tab removal, 5/12/15/30, mobile viewport; no JS errors');
}finally{await browser.close();await new Promise(r=>server.close(r))}
