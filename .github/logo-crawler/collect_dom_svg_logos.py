#!/usr/bin/env python3
import argparse, asyncio, csv, hashlib, json, re, zipfile
from pathlib import Path
from urllib.parse import urljoin, urlparse
from playwright.async_api import async_playwright

BAD_WORDS = ('favicon','icon','apple-touch','sprite','loader','flag','social','footer')

def slug(s):
    return re.sub(r'[^a-z0-9]+','-',s.lower()).strip('-') or 'provider'

def valid_svg(data: bytes) -> bool:
    head=data[:5000].lstrip().lower()
    return b'<svg' in head and b'<html' not in head and b'<!doctype html' not in head

def score(meta):
    text=' '.join(str(meta.get(k,'')) for k in ('kind','alt','cls','id','src')).lower()
    s=0
    if 'logo' in text: s+=12
    if 'brand' in text: s+=6
    if meta.get('kind')=='inline': s+=6
    if meta.get('visible'): s+=4
    if meta.get('width',0)>=100: s+=3
    if meta.get('height',0)>=24: s+=2
    if any(w in text for w in BAD_WORDS): s-=12
    if 'white' in text or 'mono' in text: s-=2
    return s

async def fetch_svg(request, url):
    try:
        r=await request.get(url, timeout=20000)
        if not r.ok: return None
        data=await r.body()
        if valid_svg(data): return data
    except Exception:
        return None
    return None

async def process(browser, row, outdir, sem):
    async with sem:
        name=row.get('Provider Name','').strip()
        site=row.get('Official URL','').strip()
        rec={'rank':row.get('Rank',''),'provider':name,'slug':slug(name),'official_url':site,'status':'unresolved','source':'','local_file':'','sha256':'','notes':''}
        if not site:
            rec['notes']='missing_official_url'; return rec
        ctx=await browser.new_context(user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36', viewport={'width':1440,'height':1000}, ignore_https_errors=True)
        page=await ctx.new_page()
        try:
            await page.goto(site, wait_until='domcontentloaded', timeout=45000)
            await page.wait_for_timeout(2500)
            final=page.url
            rec['official_url']=final
            items=await page.evaluate("""
            () => {
              const out=[];
              const vis=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>8&&r.height>8&&s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0'};
              document.querySelectorAll('svg').forEach(e=>{const p=e.closest('a,div,header,nav,span');const t=[e.getAttribute('aria-label')||'',e.id||'',e.className?.baseVal||'',p?.id||'',p?.className||'',p?.getAttribute?.('aria-label')||''].join(' ');if(/logo|brand/i.test(t))out.push({kind:'inline',html:e.outerHTML,alt:e.getAttribute('aria-label')||'',id:e.id||'',cls:(e.className&&e.className.baseVal)||'',visible:vis(e),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,src:location.href});});
              document.querySelectorAll('img,source').forEach(e=>{const src=e.currentSrc||e.src||e.getAttribute('srcset')?.split(',').pop()?.trim().split(' ')[0]||'';const t=[e.alt||'',e.id||'',e.className||'',src,e.closest('a,div,header,nav')?.className||''].join(' ');if(src&&(/logo|brand/i.test(t)||/\.svg(?:\?|$)/i.test(src)))out.push({kind:'img',src:new URL(src,location.href).href,alt:e.alt||'',id:e.id||'',cls:e.className||'',visible:vis(e),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height});});
              document.querySelectorAll('*').forEach(e=>{const bg=getComputedStyle(e).backgroundImage;const m=bg&&bg.match(/url\(["']?(.*?)["']?\)/);const t=[e.id||'',e.className||''].join(' ');if(m&&/logo|brand/i.test(t+ ' '+m[1]))out.push({kind:'bg',src:new URL(m[1],location.href).href,alt:'',id:e.id||'',cls:e.className||'',visible:vis(e),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height});});
              return out;
            }
            """)
            candidates=[]
            for m in items:
                data=None
                if m.get('kind')=='inline':
                    data=m.get('html','').encode('utf-8')
                    if not valid_svg(data): data=None
                elif str(m.get('src','')).startswith('data:image/svg+xml'):
                    import urllib.parse, base64
                    src=m['src']
                    try:
                        payload=src.split(',',1)[1]
                        data=base64.b64decode(payload) if ';base64' in src[:80] else urllib.parse.unquote_to_bytes(payload)
                    except Exception: data=None
                else:
                    data=await fetch_svg(ctx.request, m.get('src',''))
                if data: candidates.append((score(m),m,data))
            if not candidates:
                rec['notes']='no_valid_svg_found'; return rec
            candidates.sort(key=lambda x:x[0], reverse=True)
            sc,m,data=candidates[0]
            folder=outdir/'logos'; folder.mkdir(parents=True,exist_ok=True)
            fn=f"{slug(name)}.svg"; (folder/fn).write_bytes(data)
            rec.update(status='downloaded',source=m.get('src',final),local_file='logos/'+fn,sha256=hashlib.sha256(data).hexdigest(),score=sc,notes=m.get('kind',''))
            return rec
        except Exception as e:
            rec['notes']=type(e).__name__; return rec
        finally:
            await ctx.close()

async def main_async(a):
    rows=list(csv.DictReader(open(a.input,encoding='utf-8-sig')))
    rows=[r for r in rows if a.start<=int(r.get('Rank') or 0)<=a.end]
    out=Path(a.output); out.mkdir(parents=True,exist_ok=True)
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,args=['--no-sandbox'])
        sem=asyncio.Semaphore(a.workers)
        res=await asyncio.gather(*(process(browser,r,out,sem) for r in rows))
        await browser.close()
    res.sort(key=lambda x:int(x.get('rank') or 0))
    cols=['rank','provider','slug','official_url','status','source','local_file','sha256','score','notes']
    with open(out/'manifest.csv','w',newline='',encoding='utf-8') as f:
        w=csv.DictWriter(f,fieldnames=cols,extrasaction='ignore');w.writeheader();w.writerows(res)
    (out/'manifest.json').write_text(json.dumps(res,indent=2,ensure_ascii=False),encoding='utf-8')
    with zipfile.ZipFile(str(out)+'.zip','w',zipfile.ZIP_DEFLATED) as z:
        for pth in out.rglob('*'):
            if pth.is_file(): z.write(pth,pth.relative_to(out))

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--input',required=True);ap.add_argument('--output',required=True);ap.add_argument('--start',type=int,default=1);ap.add_argument('--end',type=int,default=9999);ap.add_argument('--workers',type=int,default=4)
    asyncio.run(main_async(ap.parse_args()))
