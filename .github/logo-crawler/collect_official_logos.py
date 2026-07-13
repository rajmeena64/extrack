#!/usr/bin/env python3
import argparse,csv,hashlib,json,re,zipfile
from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path
from urllib.parse import urljoin,urlparse
import requests
from bs4 import BeautifulSoup
try:
 from ddgs import DDGS
except Exception:
 DDGS=None

UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36'
BAD={'wikipedia.org','facebook.com','instagram.com','linkedin.com','youtube.com','trustpilot.com','investopedia.com','tradingview.com','tradezella.com','tradersync.com','tradesviz.com','brokerchooser.com','forexbrokers.com'}
HEAD={'User-Agent':UA,'Accept':'text/html,application/xhtml+xml,image/avif,image/webp,image/png,image/svg+xml,*/*;q=.8'}

def slug(s):
 s=s.lower();s=re.sub(r'[^a-z0-9]+','-',s).strip('-');return s or 'provider'
def bad(u):
 h=urlparse(u).netloc.lower().removeprefix('www.');return any(h==x or h.endswith('.'+x) for x in BAD)
def official(name,provided=''):
 if provided and not bad(provided): return provided,'provided'
 if DDGS:
  for q in (f'{name} official website',f'{name} broker official',f'{name} prop firm official'):
   try:
    for x in DDGS().text(q,max_results=6):
     u=x.get('href') or x.get('url') or ''
     if u.startswith('http') and not bad(u):
      h=urlparse(u).netloc.lower(); n=re.sub(r'[^a-z0-9]','',name.lower())
      if any(t in re.sub(r'[^a-z0-9]','',h) for t in re.findall(r'[a-z0-9]{4,}',n)) or re.sub(r'[^a-z0-9]','',h.split('.')[0]) in n:
       return f'{urlparse(u).scheme}://{urlparse(u).netloc}/','search'
   except Exception: pass
 return '','unresolved'
def candidates(site):
 r=requests.get(site,headers=HEAD,timeout=18,allow_redirects=True)
 r.raise_for_status(); soup=BeautifulSoup(r.text,'lxml'); out=[]
 for tag in soup.find_all(['link','meta','img']):
  u=''
  if tag.name=='link' and any(x in ' '.join(tag.get('rel',[])).lower() for x in ('icon','logo','apple-touch')): u=tag.get('href','')
  elif tag.name=='meta' and tag.get('property','').lower() in ('og:image','twitter:image'): u=tag.get('content','')
  elif tag.name=='img':
   txt=' '.join([tag.get('alt',''),tag.get('class','') if isinstance(tag.get('class',''),str) else ' '.join(tag.get('class',[])),tag.get('id','')]).lower()
   if 'logo' in txt or 'brand' in txt: u=tag.get('src') or tag.get('data-src') or ''
  if u: out.append(urljoin(r.url,u))
 for p in ('/logo.svg','/assets/logo.svg','/images/logo.svg','/static/logo.svg','/favicon.svg','/favicon.png','/favicon.ico'):
  out.append(urljoin(r.url,p))
 seen=[]
 for u in out:
  if u.startswith('http') and u not in seen and not bad(u): seen.append(u)
 return seen[:40],r.url
def score(u,ctype,size):
 s=0; x=u.lower()
 if 'logo' in x:s+=8
 if x.endswith('.svg') or 'svg' in ctype:s+=6
 if any(k in x for k in ('header','brand','primary')):s+=3
 if any(k in x for k in ('white','mono','footer','small','icon','favicon')):s-=3
 if size>1500:s+=2
 return s
def one(row,out):
 name=row['Provider Name']; typ=row.get('Provider Type',''); site,src=official(name,row.get('Official URL',''))
 rec={'rank':row.get('Rank',''),'provider':name,'slug':slug(name),'type':typ,'official_url':site,'status':'unresolved','source':'','local_file':'','notes':src}
 if not site:return rec
 try: urls,site2=candidates(site); rec['official_url']=site2
 except Exception as e: rec['notes']+=';site:'+type(e).__name__; return rec
 best=None
 for u in urls:
  try:
   rr=requests.get(u,headers=HEAD,timeout=15,allow_redirects=True)
   if rr.status_code!=200 or len(rr.content)<150: continue
   ct=rr.headers.get('content-type','').split(';')[0].lower()
   if not (ct.startswith('image/') or u.lower().endswith(('.svg','.png','.jpg','.jpeg','.webp','.ico'))): continue
   sc=score(rr.url,ct,len(rr.content))
   if best is None or sc>best[0]: best=(sc,rr.url,ct,rr.content)
  except Exception: pass
 if not best:return rec
 sc,u,ct,data=best
 ext={ 'image/svg+xml':'.svg','image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp','image/x-icon':'.ico','image/vnd.microsoft.icon':'.ico'}.get(ct)
 if not ext:
  ext=Path(urlparse(u).path).suffix.lower(); ext=ext if ext in ('.svg','.png','.jpg','.jpeg','.webp','.ico') else '.bin'
 folder=out/'logos';folder.mkdir(parents=True,exist_ok=True); fn=f"{slug(name)}{ext}";(folder/fn).write_bytes(data)
 rec.update(status='downloaded',source=u,local_file='logos/'+fn,sha256=hashlib.sha256(data).hexdigest(),bytes=len(data),score=sc)
 return rec
def write(out,res):
 cols=['rank','provider','slug','type','official_url','status','source','local_file','bytes','sha256','score','notes']
 with open(out/'manifest.csv','w',newline='',encoding='utf-8') as f:
  w=csv.DictWriter(f,fieldnames=cols,extrasaction='ignore');w.writeheader();w.writerows(res)
 (out/'manifest.json').write_text(json.dumps(res,indent=2,ensure_ascii=False),encoding='utf-8')
 with zipfile.ZipFile(str(out)+'.zip','w',zipfile.ZIP_DEFLATED) as z:
  for p in out.rglob('*'):
   if p.is_file():z.write(p,p.relative_to(out))
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--input',required=True);ap.add_argument('--output',required=True);ap.add_argument('--start',type=int,default=1);ap.add_argument('--end',type=int,default=9999);ap.add_argument('--workers',type=int,default=8);a=ap.parse_args()
 out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
 rows=list(csv.DictReader(open(a.input,encoding='utf-8-sig')));rows=[r for r in rows if a.start<=int(r.get('Rank') or 0)<=a.end]
 res=[]
 with ThreadPoolExecutor(max_workers=a.workers) as ex:
  fm={ex.submit(one,r,out):r for r in rows}
  for i,f in enumerate(as_completed(fm),1):
   try:x=f.result()
   except Exception as e:
    r=fm[f];x={'rank':r.get('Rank',''),'provider':r.get('Provider Name',''),'slug':slug(r.get('Provider Name','')),'type':r.get('Provider Type',''),'status':'unresolved','notes':'worker:'+type(e).__name__}
   print(f"[{i}/{len(rows)}] {x['provider']} -> {x['status']}");res.append(x)
 res.sort(key=lambda x:int(x.get('rank') or 0));write(out,res)
if __name__=='__main__':main()
