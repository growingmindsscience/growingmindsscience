/* Scroll-led homepage Lens integration checks.
   Run: node scripts/smoke-home-lens.mjs (requires playwright-core and Chrome).
   Set LENS_CAPTURE=1 for the batched visual/contrast inspection. */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.env.LENS_TEST_PORT) || 8269;
const base = `http://127.0.0.1:${port}`;
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {cwd:root,stdio:'ignore'});
await sleep(500);
const browser = await chromium.launch({...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {channel:'chrome'}), args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
const errors=[];
const keys=['observe','understand','respond','reflect'];
const report={contrastIssues:[],layouts:[],performance:[],geometryIssues:[]};
const capture=process.env.LENS_CAPTURE==='1';
const output=root+'output/home-lens-scroll';
if(capture) await mkdir(output,{recursive:true});
const check=(condition,message)=>{assert.ok(condition,message);console.log('✓ '+message);};
async function ready(page){
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/index.html#lens');
  await page.evaluate(async()=>{await document.fonts.ready;await document.querySelector('.story-photo img').decode();});
  await page.locator('.story-is-enhanced').waitFor();
}
async function read(page,key){
  await page.evaluate(key=>{
    const beat=document.querySelector(`[data-story-beat="${key}"]`);
    const figure=document.querySelector('.story-scene');
    const header=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h'))||72;
    const phone=innerWidth<=700&&innerHeight>560;
    const line=Math.round(Math.min(innerHeight-60,phone?header+figure.offsetHeight+40:Math.max(header+100,innerHeight*.43)));
    scrollTo({top:scrollY+beat.getBoundingClientRect().top-line+32,behavior:'instant'});
  },key);
  await page.waitForFunction(key=>document.querySelector('[data-guided-lens]').dataset.step===key,key);
}
async function contrast(page,label){
  const issues=await page.locator('[data-guided-lens]').evaluate(scope=>{
    const rgb=s=>(s.match(/[\d.]+/g)||[]).map(Number);
    const lum=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
    const bg=n=>{while(n){const c=rgb(getComputedStyle(n).backgroundColor);if(c.length===3||c[3]===1)return c;n=n.parentElement;}return [255,255,255];};
    return [...scope.querySelectorAll('*')].filter(n=>n.getBoundingClientRect().height>0&&[...n.childNodes].some(c=>c.nodeType===3&&c.textContent.trim())).flatMap(n=>{
      const s=getComputedStyle(n),a=lum(rgb(s.color)),b=lum(bg(n)),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
      const large=parseFloat(s.fontSize)>=24||(parseFloat(s.fontSize)>=18.66&&parseInt(s.fontWeight)>=700);
      return ratio+.01<(large?3:4.5)?[{text:n.textContent.trim().slice(0,70),ratio:+ratio.toFixed(2),color:s.color}]:[];
    });
  });
  report.contrastIssues.push(...issues.map(issue=>({label,...issue})));
}
try {
  for(const [width,height] of [[320,740],[390,844],[430,932],[768,1024],[1440,1000],[667,375]].filter(([width])=>!process.env.LENS_ONLY||width===Number(process.env.LENS_ONLY))) {
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
    const page=await context.newPage();page.setDefaultTimeout(6000);
    await ready(page);
    const scope=page.locator('[data-guided-lens]');
    check(await scope.locator('.story-beat:visible').count()===4 && await scope.locator('button,details,[role="tab"]').count()===0,`${width}px: entire lesson is readable without operating controls`);
    const focusBefore=await page.evaluate(()=>document.activeElement.tagName);
    const frames=[];
    for(const key of keys){
      await read(page,key);
      check(await scope.locator('[data-story-caption]:visible').count()===1 && await scope.locator(`[data-story-stage="${key}"]`).getAttribute('aria-current')==='step',`${width}px: scrolling selects ${key}`);
      frames.push(await scope.locator('[data-story-focus]').boundingBox());
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}px: ${key} has no horizontal overflow`);
      if(capture) {
        await contrast(page,`${width}px ${key}`);
        if(width===390||width===1440) await page.screenshot({path:`${output}/${width}-${key}.png`});
      }
    }
    if(frames[2].width<frames[3].width && frames[2].height<frames[3].height) check(true,`${width}px: close hand detail opens back to the wider scene`);
    else report.geometryIssues.push({width,frames});
    for(const key of keys.slice().reverse()) await read(page,key);
    check(await page.evaluate(()=>document.activeElement.tagName)===focusBefore,`${width}px: scrolling preserves keyboard focus`);
    await read(page,'understand');
    const initialScroll=await page.evaluate(()=>scrollY);
    await page.keyboard.press('PageDown');
    await page.waitForFunction(y=>scrollY>y,initialScroll);
    check(await page.evaluate(()=>scrollY)>initialScroll,`${width}px: native keyboard scrolling works`);
    report.layouts.push(await scope.evaluate(n=>({viewport:[innerWidth,innerHeight],height:n.offsetHeight,photoHeight:n.querySelector('.story-photo').offsetHeight,figureHeight:n.querySelector('.story-scene').offsetHeight,sticky:getComputedStyle(n.querySelector('.story-scene')).position,background:getComputedStyle(n).backgroundColor})));
    if(capture && width===390){
      await page.waitForTimeout(400);
      await page.evaluate(()=>{const n=document.querySelector('#lens');scrollTo({top:scrollY+n.getBoundingClientRect().top-72,behavior:'instant'});});
      await page.waitForFunction(()=>document.querySelector('[data-guided-lens]').dataset.step==='observe');
      await page.screenshot({path:output+'/mobile-entry.png'});
    }
    if(width===1440){
      check(await scope.locator('a').count()===1 && await scope.locator('a').getAttribute('href')==='/lens/leaving-the-playground','one optional route opens the full Lens with sources');
      await scope.locator('a').focus();
      check(await scope.locator('a').evaluate(n=>getComputedStyle(n).outlineStyle)!=='none','full Lens link has visible keyboard focus');
      const client=await context.newCDPSession(page);
      await page.emulateMedia({reducedMotion:'no-preference'});
      for(const rate of [1,4]){
        await client.send('Emulation.setCPUThrottlingRate',{rate});
        await read(page,'observe');
        await page.bringToFront();
        const result=await page.evaluate(()=>new Promise(resolve=>{
          requestAnimationFrame(start=>{
            let last=start;const intervals=[];const top=scrollY;
            function tick(now){if(now>start)intervals.push(now-last);last=now;scrollTo(0,top+Math.min(900,(now-start)*1.2));if(now-start<750)requestAnimationFrame(tick);else resolve({frames:intervals.length,fps:Math.round(1000/(intervals.reduce((a,b)=>a+b,0)/intervals.length)),worstMs:Math.round(Math.max(...intervals))});}
            requestAnimationFrame(tick);
          });
        }));
        report.performance.push({cpuSlowdown:rate,...result});
      }
      await client.send('Emulation.setCPUThrottlingRate',{rate:1});
      await read(page,'understand');
      await page.emulateMedia({reducedMotion:'reduce'});
      await read(page,'respond');
      check(await scope.locator('[data-story-focus]').evaluate(n=>n.getAnimations().filter(a=>a.playState==='running').length)===0,'reduced motion cancels movement and changes the frame immediately');
      await page.goto(base+'/lens/leaving-the-playground.html');
      await page.getByRole('tab',{name:/Respond/}).click();
      check(await page.locator('[data-tabs-scope]').getAttribute('data-step')==='respond','standalone Lens retains its shared tab behavior');
    }
    await context.close();
  }
  const darkContext=await browser.newContext({viewport:{width:390,height:844},colorScheme:'dark',reducedMotion:'reduce'});
  const dark=await darkContext.newPage();await ready(dark);
  check(await dark.locator('html').getAttribute('data-theme')==='dark','dark mode follows the site theme');
  for(const key of keys){await read(dark,key);if(capture)await contrast(dark,'dark '+key);}
  if(capture)await dark.screenshot({path:output+'/dark-mobile.png'});
  await darkContext.close();
  for(const fallback of ['no-js','blocked-script','no-observer']){
    const context=await browser.newContext({viewport:{width:390,height:844},javaScriptEnabled:fallback!=='no-js'});
    const page=await context.newPage();
    if(fallback==='blocked-script')await page.route('**/assets/js/home-lens.js*',r=>r.abort());
    if(fallback==='no-observer')await page.addInitScript(()=>{delete window.IntersectionObserver;});
    await page.goto(base+'/index.html#lens');
    check(await page.locator('[data-guided-lens] .story-beat:visible').count()===4,`${fallback}: all four lessons remain readable`);
    await context.close();
  }
  check(errors.length===0,'no JavaScript errors');
  if(capture)await writeFile(output+'/inspection.json',JSON.stringify(report,null,2));
  check(report.geometryIssues.length===0,'focus frames stay correctly sized in every crop');
  check(report.contrastIssues.length===0,'visible text passes AA contrast in light and dark');
  if(capture)console.log(JSON.stringify(report,null,2));
  console.log('ALL PASSED');
} finally {await browser.close();server.kill();}
