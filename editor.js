(() => {
 'use strict';
 const design = window.CoverDesign, files = window.JWPortfolioFiles;
 const form = document.querySelector('#cover-form'), preview = document.querySelector('#cover-preview');
 const status = document.querySelector('#status'), stage = document.querySelector('.preview-stage');
 const decoder = new TextDecoder(), encoder = new TextEncoder();
 const bytes = base64 => Uint8Array.from(atob(base64),c => c.charCodeAt(0));
 const read = name => decoder.decode(bytes(files[name]));
 const base64 = text => { let binary=''; for(const byte of encoder.encode(text)) binary+=String.fromCharCode(byte); return btoa(binary); };
 let config = design.load(), dirty = false;
 const source = new DOMParser().parseFromString(read('index.html'),'text/html');
 let css = read('styles.css').replace(/url\(['"]?(assets\/[^)'"\s]+)['"]?\)/g,(_match,path) => `url(data:font/ttf;base64,${files[path]})`);
 preview.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><style>${css}\nhtml,body{overflow:hidden;scroll-snap-type:none}</style></head><body>${source.querySelector('#home').outerHTML}</body></html>`;
 function fields() {
   for (const [name,value] of Object.entries(config)) {
     const field = form.elements.namedItem(name);
     if (field) { if(field.type==='checkbox') field.checked=value; else field.value=value; }
   }
 }
 function paint() {
   if (!preview.contentDocument?.querySelector('#home')) return;
   design.apply(config,preview.contentDocument);
   requestAnimationFrame(() => {
     const title = preview.contentDocument.querySelector('h1'), role = preview.contentDocument.querySelector('.cover-role');
     const range = preview.contentDocument.createRange(); range.selectNodeContents(title);
     const rect = range.getBoundingClientRect(), roleRect = role.getBoundingClientRect();
     const clipped = rect.right>1910 || rect.left<0 || roleRect.top<0 || rect.bottom>1000;
     const note = document.querySelector('#layout-note');
     note.classList.toggle('warning',clipped);
     note.textContent = clipped ? '글자가 화면 끝에 닿아요. 크기나 위치를 조금 조절해 주세요.' : '오른쪽에서 조절하면 바로 반영돼요.';
   });
 }
 function changed() { dirty=true; status.textContent='수정 중 · 저장을 누르면 홈페이지에도 반영돼요.'; paint(); }
 form.addEventListener('submit',event => event.preventDefault());
 form.addEventListener('input',event => {
   const field=event.target;
   if (!field.name || !field.validity.valid || (field.type==='number' && field.value==='')) return;
   config=design.normalize({...config,[field.name]:field.type==='checkbox'?field.checked:field.value});
   changed();
 });
 preview.addEventListener('load',() => {paint();preview.contentDocument.fonts.ready.then(paint);});
 new ResizeObserver(() => { preview.style.transform=`scale(${stage.clientWidth/1920})`; }).observe(stage);
 document.querySelector('#third-size').addEventListener('click',() => {config.roleSize=Number((config.titleSize/3).toFixed(1));fields();changed();});
 document.querySelector('#reset').addEventListener('click',() => {config={...design.defaults};fields();changed();status.textContent='처음 상태로 되돌렸어요. 적용하려면 저장을 눌러 주세요.';});
 document.querySelector('#save').addEventListener('click',() => {
   if (!form.reportValidity()) {status.textContent='입력값의 범위를 확인해 주세요. 아직 저장하지 않았어요.';return;}
   try {design.save(config);dirty=false;status.textContent=location.protocol==='file:'?'편집 내용을 저장했어요. 홈페이지에 적용하려면 수정본 ZIP을 받아 주세요.':'저장했어요. 홈페이지 보기에서 확인할 수 있어요.';}
   catch {status.textContent='브라우저에 저장할 수 없어요. 수정본 ZIP으로 보관해 주세요.';}
 });
 window.addEventListener('beforeunload',event => {if(dirty){event.preventDefault();event.returnValue='';}});
 // Store-only ZIP: includes all original films/assets and the reusable editor.
 const crcTable = Array.from({length:256},(_,n) => {for(let k=0;k<8;k++) n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
 const crc32 = data => {let crc=0xffffffff;for(const byte of data) crc=crcTable[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;};
 function zip(entries) {
   const chunks=[],central=[];let offset=0,centralLength=0;
   for(const [path,data] of entries) {
     const name=encoder.encode(path),crc=crc32(data),header=new Uint8Array(30),h=new DataView(header.buffer);
     h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x800,true);h.setUint16(12,0x21,true);h.setUint32(14,crc,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,name.length,true);
     chunks.push(header,name,data);
     const record=new Uint8Array(46),r=new DataView(record.buffer);
     r.setUint32(0,0x02014b50,true);r.setUint16(4,20,true);r.setUint16(6,20,true);r.setUint16(8,0x800,true);r.setUint16(14,0x21,true);r.setUint32(16,crc,true);r.setUint32(20,data.length,true);r.setUint32(24,data.length,true);r.setUint16(28,name.length,true);r.setUint32(42,offset,true);
     central.push(record,name);centralLength+=46+name.length;offset+=30+name.length+data.length;
   }
   const end=new Uint8Array(22),e=new DataView(end.buffer);
   e.setUint32(0,0x06054b50,true);e.setUint16(8,entries.length,true);e.setUint16(10,entries.length,true);e.setUint32(12,centralLength,true);e.setUint32(16,offset,true);
   return new Blob([...chunks,...central,end],{type:'application/zip'});
 }
 document.querySelector('#download').addEventListener('click',() => {
   if (!form.reportValidity()) {status.textContent='입력값의 범위를 확인한 뒤 내려받아 주세요.';return;}
   const button=document.querySelector('#download');button.disabled=true;
   try {
     const exported={...config,revision:'cover-'+Date.now()},exportFiles={...files};
     exportFiles['cover-config.js']=base64('window.JWCoverConfig = '+JSON.stringify(exported)+';\n');
     // Bake the cover into HTML as well, keeping every later page unchanged.
     const html=new DOMParser().parseFromString(read('index.html'),'text/html');design.apply(exported,html);
     exportFiles['index.html']=base64('<!doctype html>\n'+html.documentElement.outerHTML);
     const entries=Object.entries(exportFiles).map(([name,data]) => [name,bytes(data)]);
     entries.push(['portfolio-files.js',encoder.encode('window.JWPortfolioFiles = '+JSON.stringify(exportFiles)+';\n')]);
     entries.push(['읽어주세요.txt',encoder.encode('index.html: 홈페이지 열기\neditor.html: 첫 페이지 편집\n수정 후 저장하거나 수정본 ZIP 받기를 눌러 주세요.\n모든 파일과 assets 폴더를 함께 보관해 주세요.\n')]);
     const url=URL.createObjectURL(zip(entries)),link=document.createElement('a');
     link.href=url;link.download='JEON-WOOJIN-PORTFOLIO-EDITED.zip';link.click();setTimeout(() => URL.revokeObjectURL(url),60000);
     status.textContent='수정본 ZIP을 준비했어요. 압축을 풀고 index.html을 열어 주세요.';
   } catch {status.textContent='파일을 만들지 못했어요. 다시 내려받아 주세요.';}
   finally {button.disabled=false;}
 });
 fields();
 if(location.protocol==='file:') status.textContent='파일로 열었을 때는 수정본 ZIP을 내려받아 홈페이지에 적용해 주세요.';
})();
