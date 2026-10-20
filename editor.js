
(()=>{'use strict';const controlRegistry=new Map();const $=id=>document.getElementById(id)||controlRegistry.get(id)||null;let rows=[],original='',history=[],page=0,editing=null;let magnetStart=null;let profiles={},autosaveTimer=null;let currentSourceName='';let pageSize=80;let hiddenTabs=new Set(), design={theme:'dark',layout:'normal',bgColor:'#171923',fgColor:'#e6e6e6',panelColor:'#212530',textColorMode:'common',pageTitle:'',exportName:'',font:'serif',fontSize:16,lineHeight:1.9,spacing:12,accentColor:'#bb7093',showHeading:true,showTabs:true,showIndex:true,diceMode:'original',rubySize:40,frameMode:'none',frameColor1:'#d49ab9',frameColor2:'#f5dcea',frameDirection:'135',frameWidth:18,frameMobileHeight:110,frameImage:''};const presets={dark:['#171923','#e6e6e6','#212530'],light:['#f6f7fb','#242633','#ffffff'],sepia:['#f4ead7','#453a2f','#fff9ed'],navy:['#101b30','#eef3ff','#1b2b47']};const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));function formatRuby(s){const src=String(s??'');const re=/｜([^｜《》\n]+)《([^《》\n]+)》/g;let out='',start=0,m;while((m=re.exec(src))!==null){out+=esc(src.slice(start,m.index));out+='<ruby>'+esc(m[1])+'<rt>'+esc(m[2])+'</rt></ruby>';start=re.lastIndex;}return out+esc(src.slice(start));}function snapshot(){scheduleAutosave();history.push(JSON.stringify({rows,hiddenTabs:[...hiddenTabs],profiles,design}));if(history.length>25)history.shift()}function textOf(n){return(n?.innerText||n?.textContent||'').trim()}function parseHTML(source){
 const doc=new DOMParser().parseFromString(source,'text/html');
 let candidates=[...doc.querySelectorAll('p')].filter(p=>p.querySelector('span,.name,.tab,.message,.text')||p.closest('.chatlog,#chatlog'));
 if(!candidates.length)candidates=[...doc.querySelectorAll('.chatlog > *,#chatlog > *')].filter(x=>textOf(x));
 if(!candidates.length)candidates=[...doc.querySelectorAll('p')].filter(x=>textOf(x));
 return candidates.map(p=>{
  const spans=[...p.children].filter(x=>x.tagName==='SPAN');
  const named=p.querySelector('.name,[class*="name"]');
  const tabbed=p.querySelector('.tab,[class*="tab"]');
  const messaged=p.querySelector('.message,.text,[class*="message"]');
  let tabNode=tabbed, nameNode=named, msgNode=messaged;
  // Standard Ccfolia export: <span> [main]</span> <span>Character</span> : <span>Speech</span>
  if(spans.length>=3 && /^\s*\[[^\]]+\]\s*$/.test(textOf(spans[0]))){
   tabNode ||= spans[0]; nameNode ||= spans[1]; msgNode ||= spans[2];
  } else if(spans.length>=2 && !nameNode && !msgNode){
   nameNode=spans[0];msgNode=spans[1];
  }
  const clone=p.cloneNode(true);
  for(const e of clone.querySelectorAll('.name,.tab,[class*="name"],[class*="tab"]'))e.remove();
  let body=msgNode?textOf(msgNode):textOf(clone);
  if(!msgNode && nameNode){const prefix=textOf(nameNode);if(body.startsWith(prefix))body=body.slice(prefix.length).replace(/^\s*[:：]\s*/,'').trim()}
  const style=(nameNode?.getAttribute('style')||'')+';'+(p.getAttribute('style')||'');
  const color=(style.match(/(?:^|;)\s*color\s*:\s*(#[0-9a-fA-F]{3,8}|rgb\([^)]*\))/)||[])[1]||'#aeb6ff';
  const name=textOf(nameNode)||'（名前なし）';
  const tab=textOf(tabNode).replace(/^\s*\[|\]\s*$/g,'')||'メイン';
  return {name,tab,text:body,color,source:p.outerHTML};
 }).filter(x=>x.text||x.name!=='（名前なし）');
}
function load(str,filename){let result=[];hiddenTabs=new Set();design={theme:'dark',layout:'normal',bgColor:'#171923',fgColor:'#e6e6e6',panelColor:'#212530',textColorMode:'common',pageTitle:'',exportName:'',font:'serif',fontSize:16,lineHeight:1.9,spacing:12,accentColor:'#bb7093',showHeading:true,showTabs:true,showIndex:true,diceMode:'original',rubySize:40,frameMode:'none',frameColor1:'#d49ab9',frameColor2:'#f5dcea',frameDirection:'135',frameWidth:18,frameMobileHeight:110,frameImage:''};try{if(filename?.endsWith('.json')){const obj=JSON.parse(str);result=Array.isArray(obj)?obj:obj.rows; if(!Array.isArray(result))throw Error('不正なJSONです');original=obj.original||'';hiddenTabs=new Set(obj.hiddenTabs||[]);if(obj.design)design={...design,...obj.design};profiles=obj.profiles||{};if(obj.pageTitle)design.pageTitle=obj.pageTitle;if(obj.exportName)design.exportName=obj.exportName}else{result=parseHTML(str);original=str;const doc=new DOMParser().parseFromString(str,'text/html');design.pageTitle=(doc.querySelector('title')?.textContent||'').trim()||filename.replace(/\.html?$/i,'');design.exportName=filename.replace(/\.html?$/i,'')}}catch(e){alert('読み込みに失敗しました：'+e.message);return}if(!result.length){alert('発言が見つかりませんでした。ココフォリアから出力したHTMLを指定してください。');return}rows=result.map(r=>({name:String(r.name||''),tab:String(r.tab||'メイン'),text:String(r.text||''),color:String(r.color||'#aeb6ff'),type:r.type||'message',image:r.image||''}));currentSourceName=filename||'';if($('diceMode'))$('diceMode').value=design.diceMode||'original';history=[];page=0;editing=null;$('drop').classList.add('hidden');$('work').classList.remove('hidden');syncDesign();render()}
function readFile(file){if(!file)return;const reader=new FileReader();reader.onload=()=>load(String(reader.result),file.name.toLowerCase());reader.readAsText(file,'UTF-8')}
$('file').onchange=e=>readFile(e.target.files[0]);const drop=$('drop');drop.ondragover=e=>{e.preventDefault();drop.classList.add('over')};drop.ondragleave=()=>drop.classList.remove('over');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('over');readFile(e.dataTransfer.files[0])};drop.onclick=e=>{if(e.target.closest('label'))return;$('file').click()};$('reset').onclick=()=>{if(rows.length&&!confirm('編集中のデータを閉じますか？'))return;rows=[];$('file').value='';$('drop').classList.remove('hidden');$('work').classList.add('hidden')};
function matches(r){let q=$('search').value.toLowerCase(),t=$('tabFilter').value,n=$('nameFilter').value;return !hiddenTabs.has(r.tab)&&(!q||(r.name+' '+r.tab+' '+r.text).toLowerCase().includes(q))&&(!t||r.tab===t)&&(!n||r.name===n)}function filtered(){return rows.map((r,i)=>({...r,i})).filter(matches)}function refreshFilters(){const tabs=[...new Set(rows.map(r=>r.tab))],names=[...new Set(rows.map(r=>r.name))];for(const [id,arr,placeholder] of [['tabFilter',tabs,'すべてのタブ'],['nameFilter',names,'すべての発言者']]){const el=$(id),selected=el.value;el.innerHTML='<option value="">'+placeholder+'</option>'+arr.map(a=>'<option value="'+esc(a)+'">'+esc(a)+'</option>').join('');el.value=arr.includes(selected)?selected:''}}
function render(){refreshFilters();refreshTabManager();refreshSpeakers();let result=filtered(),total=Math.max(1,Math.ceil(result.length/pageSize));page=Math.min(page,total-1);$('stats').textContent=`全 ${rows.length} 件 / 表示対象 ${result.length} 件 / 非表示 ${rows.filter(r=>hiddenTabs.has(r.tab)).length} 件`; const slice=result.slice(page*pageSize,(page+1)*pageSize);$('items').innerHTML=slice.length?slice.map(r=>`<article draggable="${editing===r.i?'false':'true'}" data-row-index="${r.i}" class="item ${r.type&&r.type!=='message'?'special':''} ${editing===r.i?'is-editing':''} ${magnetStart?.index===r.i?'magnet-origin':''}" style="--ruby-size:${(Number(design.rubySize)||40)/100}em;--card-font-size:${Number(design.fontSize)||16}px;--card-line-height:${Number(design.lineHeight)||1.9};--card-spacing:${Number(design.spacing)||12}px;--card-font-family:${design.font==='sans'?'sans-serif':design.font==='mono'?'monospace':'serif'};--c:${/^#[0-9a-f]{3,8}$/i.test(r.color)?r.color:'#888'}"><div class="strip"></div><div class="iteminner"><div class="meta"><span class="number">#${r.i+1}</span><span class="tab">${esc(r.tab)}</span><span class="who" style="color:${/^#[0-9a-f]{3,8}$/i.test(r.color)?r.color:'#aeb6ff'}">${esc(r.name)}</span><div class="actions"><button data-action="up" data-index="${r.i}" title="上へ">↑</button><button data-action="down" data-index="${r.i}" title="下へ">↓</button><button data-action="magnet" data-index="${r.i}" class="magnet-btn ${magnetStart?.index===r.i?'magnet-active':''}" title="同じタブの範囲を磁石でまとめる" aria-label="磁石で範囲指定">🧲</button><button data-action="specialMenu" data-index="${r.i}" title="この位置に見出し・画像を挿入">＋挿入</button><button data-action="insertBefore" data-index="${r.i}" title="この発言の直前に追加">＋前</button><button data-action="insertAfter" data-index="${r.i}" title="この発言の直後に追加">＋後</button><button data-action="edit" data-index="${r.i}">編集</button><button data-action="delete" data-index="${r.i}" class="danger">削除</button></div></div><div style="${design.textColorMode==='speaker'?'color:'+(/^#[0-9a-f]{3,8}$/i.test(r.color)?r.color:'#888'): ''}" class="msg ${design.textColorMode==='speaker'?'speaker-color':''}">${r.type==='scene'?'<div class="scene-title">'+formatRuby(r.text)+'</div>':r.type==='image'?'<img class="inserted-image" alt="挿絵" src="'+(String(r.image||'').startsWith('data:image/')?r.image:'')+'"><div>'+formatRuby(r.text)+'</div>':formatRuby(r.text)}</div>${editing===r.i?`<div class="editfields"><div class="edithelp">ここで直接編集できます。変更内容は上の発言カードにすぐ反映されます。</div><input id="edName" aria-label="名前" value="${esc(r.name)}"><input id="edTab" aria-label="タブ" value="${esc(r.tab)}"><input id="edColor" aria-label="色" type="color" value="${/^#[0-9a-f]{6}$/i.test(r.color)?r.color:'#aeb6ff'}"><textarea id="edText" aria-label="本文">${esc(r.text)}</textarea><div class="ruby-guide"><strong>✦ ふりがなの付け方</strong>　① 本文で漢字などをドラッグして選択 → ② 下の「ふりがな」ボタン → ③ 読みを入力。<br>例：川崎 → <ruby>川崎<rt>かわさき</rt></ruby>　※必要な文字だけに付けられます。</div><div class="ruby-tools"><button type="button" id="addRuby" title="本文で文字を選択してから押してください">✦ 選択文字にふりがな</button><span>文字を選択してから押してください</span></div><div class="editbuttons"><button id="apply" class="primary">変更を確定</button><button id="cancel">キャンセル</button></div></div>`:''}</div></article>`).join(''):'<div class="empty">該当する発言がありません</div>';const startPage=Math.max(0,Math.min(page-2,total-5)),endPage=Math.min(total,startPage+5);const pageButtons=Array.from({length:endPage-startPage},(_,idx)=>{const p=startPage+idx;return `<button type="button" data-goto-page="${p}" class="page-num ${p===page?'current':''}" ${p===page?'aria-current="page"':''}>${p+1}</button>`}).join('');$('pager').innerHTML=`<div class="page-toolbar"><label for="pageCountSelect">1ページの表示件数</label><select id="pageCountSelect"><option value="20">20件</option><option value="50">50件</option><option value="80">80件</option><option value="150">150件</option><option value="300">300件</option></select><span class="page-count">${result.length? page*pageSize+1:0}〜${Math.min(result.length,(page+1)*pageSize)} / ${result.length}件</span></div><nav class="page-navigation" aria-label="発言ページの移動"><button type="button" id="firstPage" ${page===0?'disabled':''}>最初</button><button type="button" id="prev" ${page===0?'disabled':''}>前へ</button>${pageButtons}<button type="button" id="next" ${page>=total-1?'disabled':''}>次へ</button><button type="button" id="lastPage" ${page>=total-1?'disabled':''}>最後</button></nav><form id="pageJumpForm" class="page-jump"><label for="pageJumpInput">ページ指定</label><input id="pageJumpInput" type="number" inputmode="numeric" min="1" max="${total}" value="${page+1}" aria-label="移動先ページ"><span>/ ${total}</span><button type="submit">移動</button></form>`;$('pageCountSelect').value=String(pageSize);const changePage=(next)=>{if(!Number.isInteger(next)||next<0||next>=total||next===page)return;page=next;editing=null;render();$('items').scrollIntoView({behavior:'auto',block:'start'})};$('firstPage').onclick=()=>changePage(0);$('prev').onclick=()=>changePage(page-1);$('next').onclick=()=>changePage(page+1);$('lastPage').onclick=()=>changePage(total-1);$('pager').querySelectorAll('[data-goto-page]').forEach(btn=>{btn.onclick=()=>changePage(Number(btn.dataset.gotoPage))});$('pageJumpForm').onsubmit=e=>{e.preventDefault();const n=Number($('pageJumpInput').value);if(!Number.isInteger(n)||n<1||n>total){$('pageJumpInput').focus();return}changePage(n-1)};$('pageCountSelect').onchange=e=>{const n=Number(e.target.value);if(![20,50,80,150,300].includes(n))return;const position=page*pageSize;pageSize=n;page=Math.floor(position/pageSize);editing=null;render()};const apply=$('apply');if(apply)apply.onclick=()=>{snapshot();rows[editing]={...rows[editing],name:$('edName').value,tab:$('edTab').value,text:$('edText').value,color:$('edColor').value};editing=null;render()};if($('addRuby'))$('addRuby').onclick=()=>{const field=$('edText');if(!field)return;const s=field.selectionStart,e=field.selectionEnd;if(s===e){alert('先に本文欄でふりがなを付けたい文字を選択してください。');field.focus();return;}const selected=field.value.slice(s,e);if(selected.includes('｜')||selected.includes('《')||selected.includes('》')||selected.includes('\n')){alert('改行やふりがな記号を含まない文字を選択してください。');return;}const reading=prompt('「'+selected+'」のふりがなを入力してください');if(!reading)return;if(/[《》\n]/.test(reading)){alert('ふりがなに改行・《・》は使えません。');return;}const ruby='｜'+selected+'《'+reading.trim()+'》';field.setRangeText(ruby,s,e,'end');field.dispatchEvent(new Event('input',{bubbles:true}));field.focus();};if($('cancel'))$('cancel').onclick=()=>{editing=null;render()};scheduleAutosave()}

// Show unfinished per-message edits as a temporary preview without committing them.
let previewTimer;
function scheduleLivePreview(){
 clearTimeout(previewTimer);
 previewTimer=setTimeout(()=>{
  const frame=$('previewFrame');if(!frame||!rows.length)return;
  const edit=editing;
  let saved;
  if(Number.isInteger(edit)&&rows[edit]&&$('edText')){
   saved=rows[edit];rows[edit]={...saved,name:$('edName').value,tab:$('edTab').value,text:$('edText').value,color:$('edColor').value};
  }
  try{frame.srcdoc=htmlOut();$('previewStatus').textContent='現在の編集内容を表示中';}
  catch(error){$('previewStatus').textContent='プレビュー表示に失敗しました';console.error(error)}
  finally{if(saved)rows[edit]=saved;}
 },180);
}
$('previewRefresh').onclick=()=>{};
$('items').addEventListener('input', e=>{
 if(!e.target.closest('.editfields'))return;
 const card=e.target.closest('.item');
 if(card){
  const who=card.querySelector('.who'),msg=card.querySelector('.msg');
  if(who&&$('edName'))who.textContent=$('edName').value;
  if(msg&&$('edText'))msg.innerHTML=formatRuby($('edText').value);
  if(who&&$('edColor'))who.style.color=$('edColor').value;
  const strip=card.querySelector('.strip');if(strip)strip.style.background=$('edColor').value;
  const tab=card.querySelector('.tab');if(tab&&$('edTab'))tab.textContent=$('edTab').value;
  if(msg){msg.style.color=design.textColorMode==='speaker'?$('edColor').value:'';}
 }
 // Current card itself is the live preview.
});

function doMagnet(index){
 if(!Number.isInteger(index)||index<0||index>=rows.length)return;
 if(magnetStart===null){magnetStart={index,tab:rows[index].tab};render();showNotice('🧲 開始位置を選択しました。同じタブの最後の発言で🧲を押してください。');return;}
 if(index===magnetStart.index){magnetStart=null;render();showNotice('🧲 範囲選択を解除しました');return;}
 if(index<magnetStart.index){magnetStart={index,tab:rows[index].tab};render();showNotice('🧲 開始位置を変更しました。最後の発言を選んでください。');return;}
 if(rows[index].tab!==magnetStart.tab){showNotice('🧲 最後の発言は開始位置と同じタブを選んでください');return;}
 const first=magnetStart.index,last=index,tab=magnetStart.tab;
 const picked=[];for(let i=first;i<=last;i++)if(rows[i].tab===tab)picked.push(i);
 magnetStart=null;
 if(picked.length<2){render();showNotice('この範囲に同じタブの発言が2件以上ありません');return;}
 // Reorder only: keep every message as an independent editable item.
 snapshot();const selected=new Set(picked);const moving=picked.map(i=>rows[i]);const remaining=rows.filter((_,i)=>!selected.has(i));
 remaining.splice(first,0,...moving);rows=remaining;editing=null;
 page=Math.floor(first/pageSize);render();markChangedCards((r,i)=>i>=first&&i<first+moving.length);
 showNotice('🧲 '+moving.length+'件の「'+tab+'」の発言をまとめました。元に戻すこともできます。');
}

$('items').onclick=e=>{const btn=e.target.closest('button[data-action]');if(!btn)return;const i=+btn.dataset.index,a=btn.dataset.action;if(a==='specialMenu'){
  const host=btn.closest('.item');const previous=host.querySelector('.special-insert-menu');
  document.querySelectorAll('.special-insert-menu').forEach(x=>x.remove());
  if(previous)return;
  const menu=document.createElement('div');menu.className='special-insert-menu';
  menu.innerHTML='<span>この発言のどこに挿入しますか？</span><button type="button" data-special-kind="scene" data-side="before">見出しを前に</button><button type="button" data-special-kind="scene" data-side="after">見出しを後に</button><button type="button" data-special-kind="image" data-side="before">画像を前に</button><button type="button" data-special-kind="image" data-side="after">画像を後に</button><button type="button" data-dismiss-special="1">閉じる</button>';
  menu.dataset.targetIndex=String(i);host.querySelector('.iteminner').append(menu);menu.scrollIntoView({block:'nearest',behavior:'smooth'});return;
 }if(a==='magnet'){doMagnet(i);return;}if(a==='insertBefore'||a==='insertAfter'){const pos=i+(a==='insertAfter'?1:0);snapshot();const base=rows[i];rows.splice(pos,0,{name:base.name||'KP',tab:base.tab||'メイン',text:'',color:base.color||'#aeb6ff'});$('search').value='';$('tabFilter').value='';$('nameFilter').value='';editing=pos;page=Math.floor(pos/pageSize);render();const field=$('edText');if(field){field.focus({preventScroll:true});field.closest('.item')?.scrollIntoView({block:'center',behavior:'smooth'});}showNotice('指定位置に発言を追加しました。内容を入力して「変更を確定」を押してください。');return;}if(a==='edit'){editing=i;render();const field=$('edText');if(field){field.focus({preventScroll:true});field.closest('.item')?.scrollIntoView({block:'nearest',behavior:'smooth'});}return}if(a==='delete'){snapshot();rows.splice(i,1)}else if(a==='up'&&i>0){snapshot();[rows[i-1],rows[i]]=[rows[i],rows[i-1]]}else if(a==='down'&&i<rows.length-1){snapshot();[rows[i+1],rows[i]]=[rows[i],rows[i+1]]}render()};for(const id of ['search','tabFilter','nameFilter'])$(id).addEventListener(id==='search'?'input':'change',()=>{page=0;editing=null;render()});$('add').onclick=()=>{snapshot();rows.push({name:'KP',tab:'メイン',text:'',color:'#aeb6ff'});$('search').value='';$('tabFilter').value='';$('nameFilter').value='';page=Math.ceil(rows.length/pageSize)-1;editing=rows.length-1;render();$('edText')?.focus()};$('undo').onclick=()=>{if(!history.length){alert('元に戻せる操作がありません');return}{const prior=JSON.parse(history.pop());rows=prior.rows||prior;hiddenTabs=new Set(prior.hiddenTabs||[])}editing=null;render()};$('rename').onclick=()=>{const old=$('oldName').value,neo=$('newName').value;if(!old||!neo)return alert('変更前・変更後の名前を入力してください');const count=rows.filter(r=>r.name===old).length;if(!count)return alert('一致する発言者がいません');snapshot();rows.forEach(r=>{if(r.name===old)r.name=neo});editing=null;render();closeMenu();markChangedCards(r=>r.name===neo);showNotice(count+'件の発言者名を変更しました')};$('removeFiltered').onclick=()=>{const target=filtered();if(!target.length)return;if(!confirm(target.length+'件の発言を削除します。よろしいですか？'))return;snapshot();const ids=new Set(target.map(x=>x.i));rows=rows.filter((_,i)=>!ids.has(i));render()};function download(data,name,type){let blob=new Blob([data],{type});let url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}function diceClass(text){const s=String(text||'');if(/失敗|ファンブル|Fumble|failure/i.test(s))return 'dice-fail';if(/成功|クリティカル|Critical|success/i.test(s))return 'dice-success';return ''}
function htmlOut(){
 const safeColor=(c,defaultColor)=>/^#[0-9a-f]{6}$/i.test(c)?c:defaultColor;
 const bg=safeColor(design.bgColor,'#171923'), fg=safeColor(design.fgColor,'#e6e6e6'),panel=safeColor(design.panelColor,'#212530'),accent=safeColor(design.accentColor,'#bb7093');
 const frameWidth=Math.min(48,Math.max(4,Number(design.frameWidth)||18));
 const frameMobileHeight=Math.min(220,Math.max(40,Number(design.frameMobileHeight)||110));
 const c1=safeColor(design.frameColor1,'#d49ab9'),c2=safeColor(design.frameColor2,'#f5dcea');
 const angle=[90,135,180].includes(Number(design.frameDirection))?Number(design.frameDirection):135;
 const img=typeof design.frameImage==='string'&&/^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(design.frameImage)?design.frameImage:'';
 const frameBg=design.frameMode==='gradient'?`linear-gradient(${angle}deg,${c1},${c2})`:design.frameMode==='image'&&img?`url(\"${img}\") center/cover no-repeat`:c1;
 const frameCSS=design.frameMode==='none'?'':`@media(min-width:621px){body{padding:${frameWidth}px!important;background:${frameBg}!important;margin:26px auto;max-width:1000px}.log-paper{background:${bg};padding:42px 25px 100px;min-height:80vh}}@media(max-width:620px){body{padding:0!important;background:${bg};max-width:none}.log-paper{margin-top:${frameMobileHeight}px;padding:20px 16px 100px;background:${bg}}body:before{content:'';position:absolute;top:0;left:0;width:100%;height:${frameMobileHeight}px;background:${frameBg};pointer-events:none}}`;

 const chosen=rows.filter(r=>!hiddenTabs.has(r.tab));const tabs=[...new Set(chosen.map(r=>r.tab))];
 const title=esc(design.pageTitle||design.exportName||'セッションログ');
 const font=({serif:'Georgia, "Yu Mincho", "Hiragino Mincho ProN",serif',sans:'system-ui,"Yu Gothic",Meiryo,sans-serif',modern:'"Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif',mono:'ui-monospace,Consolas,monospace'})[design.font]||'serif';
 const size=Math.min(24,Math.max(12,Number(design.fontSize)||16));const lh=Math.min(2.6,Math.max(1.3,Number(design.lineHeight)||1.9));const gap=Math.min(36,Math.max(0,Number(design.spacing)||0));
 const lines=chosen.map((r,entryIndex)=>r.type==='scene'?`<section id="entry-${entryIndex}" class="entry scene-entry" data-tab="${esc(r.tab)}"><h2>${formatRuby(r.text)}</h2></section>`:r.type==='image'?`<figure id="entry-${entryIndex}" class="entry illustration-entry" data-tab="${esc(r.tab)}"><img src="${String(r.image||'').startsWith('data:image/')?r.image:''}" alt="挿絵"><figcaption>${formatRuby(r.text)}</figcaption></figure>`:`<div id="entry-${entryIndex}" class="entry" data-tab="${esc(r.tab)}" style="--speaker:${safeColor(r.color,'#aeb6ff')}"><div class="head">${design.showTabs?`<span class="tab">[${esc(r.tab)}]</span>`:''}<button class="name profile-link" type="button" data-person="${esc(r.name)}" style="--speaker:${safeColor(r.color,'#aeb6ff')}">${esc(r.name)}</button></div><div class="message ${design.diceMode==='colored'?diceClass(r.text):''}">${formatRuby(r.text).replace(/\n/g,'<br>')}</div></div>`).join('\n');
 const index=design.showIndex&&tabs.length?`<details class="toc"><summary>目次・タブ表示</summary><div class="tocitems"><button type="button" data-filter="">すべて</button>${tabs.map(t=>`<button type="button" data-filter="${esc(t)}">${esc(t)}</button>`).join('')}</div></details>`:'';
 // ログごとに安定したしおりキーを生成。別のログとの混同を防ぐ。
 const bookmarkIdentity=JSON.stringify([design.pageTitle||'',chosen.length,chosen.slice(0,3).map(r=>[r.name,r.text]),chosen.slice(-3).map(r=>[r.name,r.text])]);
 let hash=2166136261;for(let k=0;k<bookmarkIdentity.length;k++){hash=Math.imul(hash^bookmarkIdentity.charCodeAt(k),16777619)}
 const bookmarkKey='shockdazou-bookmark-v1-'+(hash>>>0).toString(16);
 const bookmarkStyle=`.bookmark-tools{position:fixed;right:18px;bottom:18px;z-index:20;display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:${panel};color:${fg};border:1px solid ${accent}80;padding:10px 12px;border-radius:14px;box-shadow:0 5px 28px #0003;font:13px system-ui,sans-serif;max-width:calc(100vw - 28px)}.bookmark-tools button{font:inherit;cursor:pointer;border:1px solid ${accent}99;background:${bg};color:${fg};padding:7px 10px;border-radius:9px}.bookmark-tools button:hover{border-color:${accent}}.bookmark-tools span{font-size:11px;opacity:.85}.bookmark-tools button:disabled{opacity:.45;cursor:default}@media(max-width:620px){.bookmark-tools{left:12px;right:12px;bottom:10px;justify-content:center}.bookmark-tools button{padding:6px 8px}}`;
 const foldScript="(function(){const entries=[...document.querySelectorAll('.chatlog>.entry')];function toggle(scene){const btn=scene.querySelector('.scene-fold');if(!btn)return;const expanded=btn.getAttribute('aria-expanded')!=='false';let el=scene.nextElementSibling;while(el&&!el.classList.contains('scene-entry')){el.hidden=expanded;el=el.nextElementSibling}btn.setAttribute('aria-expanded',String(!expanded));btn.textContent=(expanded?'▶':'▼')+' '+btn.dataset.label;}for(const scene of entries.filter(e=>e.classList.contains('scene-entry'))){const h=scene.querySelector('h2');if(!h)continue;const b=document.createElement('button');b.type='button';b.className='scene-fold';b.dataset.label=h.textContent;b.setAttribute('aria-expanded','true');b.textContent='▼ '+b.dataset.label;h.replaceChildren(b);b.addEventListener('click',()=>toggle(scene));}const restore=document.getElementById('bookmarkRestore');restore?.addEventListener('click',()=>{for(const scene of entries.filter(e=>e.classList.contains('scene-entry'))){const b=scene.querySelector('.scene-fold');if(b?.getAttribute('aria-expanded')==='false')toggle(scene)}},true);})();";
 const bookmarkBar='<aside class="bookmark-tools" aria-label="読書位置のしおり"><button type="button" id="bookmarkSave">🔖 この位置を保存</button><button type="button" id="bookmarkRestore">↩ 前回の位置へ</button><span id="bookmarkStatus" role="status" aria-live="polite"></span></aside>';
 const bookmarkScript=`(function(){'use strict';const key=${JSON.stringify(bookmarkKey)};const entries=[...document.querySelectorAll('.entry')];const saveBtn=document.getElementById('bookmarkSave');const restoreBtn=document.getElementById('bookmarkRestore');const status=document.getElementById('bookmarkStatus');let available=true;let timer=null;function current(){let best=0;for(let i=0;i<entries.length;i++){if(entries[i].getBoundingClientRect().top<=Math.min(200,innerHeight*.33))best=i;else break;}return best;}function stored(){try{const raw=localStorage.getItem(key);if(raw===null)return null;const n=Number(raw);return Number.isInteger(n)&&n>=0&&n<entries.length?n:null}catch(e){available=false;return null}}function save(show){if(!available)return;try{localStorage.setItem(key,String(current()));restoreBtn.disabled=false;if(show)status.textContent='しおりを保存しました'}catch(e){available=false;status.textContent='この環境では位置を保存できません'}}function restore(){const n=stored();if(n===null){status.textContent='保存されたしおりがありません';return}document.querySelectorAll('.entry').forEach(el=>el.hidden=false);entries[n].scrollIntoView({block:'start',behavior:'instant'});status.textContent='前回の位置に戻りました'}saveBtn.addEventListener('click',()=>save(true));restoreBtn.addEventListener('click',restore);restoreBtn.disabled=stored()===null;if(!available){status.textContent='ブラウザの保存設定をご確認ください';saveBtn.disabled=true;restoreBtn.disabled=true;return}window.addEventListener('scroll',()=>{if(timer!==null)clearTimeout(timer);timer=setTimeout(()=>save(false),700)},{passive:true});document.addEventListener('visibilitychange',()=>{if(document.hidden)save(false)});window.addEventListener('pagehide',()=>save(false));if(stored()!==null){status.textContent='前回のしおりがあります';setTimeout(()=>{restore()},120)}})();`;
 const profileData=JSON.stringify(profiles).replace(/</g,'\\u003c');
 const extraCSS=`.scene-entry{padding:30px 0 15px;text-align:center}.scene-entry h2{font-size:1.5em;border-bottom:1px solid ${accent};padding-bottom:12px}.illustration-entry{text-align:center}.illustration-entry img{display:block;margin:0 auto;max-width:100%;max-height:650px;object-fit:contain;border-radius:8px}.illustration-entry figcaption{opacity:.7;font-size:.85em}.dice-success{color:#2684d6!important}.dice-fail{color:#d54b61!important}.profile-link{border:0;background:none;color:var(--speaker);font:inherit;font-weight:700;padding:0;cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px}.person-card{position:fixed;inset:0;background:#000a;display:grid;place-items:center;z-index:99;padding:16px}.person-card>div{background:${panel};color:${fg};padding:25px;border:1px solid ${accent};border-radius:14px;max-width:450px;width:100%;max-height:90vh;overflow:auto}.person-card img{max-width:100%;max-height:220px;object-fit:contain}.person-card button{padding:6px 12px;border-radius:7px;cursor:pointer}`;
 const profileScript=`(function(){const profiles=${profileData};document.querySelectorAll('.profile-link').forEach(el=>el.addEventListener('click',()=>{const p=profiles[el.dataset.person];if(!p){return;}const dialog=document.createElement('div');dialog.className='person-card';const card=document.createElement('div');const close=document.createElement('button');close.textContent='閉じる';close.onclick=()=>dialog.remove();const title=document.createElement('h2');title.textContent=el.dataset.person;card.append(title);if(p.image&&p.image.startsWith('data:image/')){const img=document.createElement('img');img.src=p.image;img.alt=el.dataset.person;card.append(img);}const description=document.createElement('p');description.style.whiteSpace='pre-wrap';description.textContent=p.description||'';card.append(description,close);dialog.append(card);dialog.onclick=e=>{if(e.target===dialog)dialog.remove()};document.body.append(dialog)}))})();`;
 const layout=design.layout==='card'?`.entry{background:${panel};border-radius:12px;padding:18px 20px;border:1px solid ${accent}33}`:design.layout==='compact'?`.entry{display:flex;gap:22px;align-items:baseline;padding:8px 0}.head{width:190px;flex:none;margin:0}`:`.entry{padding:10px 0;border-bottom:1px solid ${accent}30}`;
 return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>:root{color-scheme:${design.theme==='light'||design.theme==='sepia'?'light':'dark'}}*{box-sizing:border-box}html{scroll-behavior:smooth}[hidden]{display:none!important}body{background:${bg};color:${fg};font-family:${font};font-size:${size}px;line-height:${lh};max-width:980px;margin:0 auto;padding:42px 25px 100px;overflow-wrap:anywhere}.siteheader{text-align:center;padding:35px 0 40px;margin-bottom:32px;border-bottom:1px solid ${accent}}.eyebrow{color:${accent};font-size:11px;letter-spacing:.3em}.siteheader h1{font-size:clamp(22px,4vw,40px);line-height:1.4;font-weight:500;letter-spacing:.07em;margin:14px 0}.toc{position:sticky;top:0;background:${bg};padding:12px 0;margin-bottom:22px;border-bottom:1px solid ${accent}55;z-index:2}.toc summary{cursor:pointer;color:${accent};font-size:13px}.tocitems{display:flex;flex-wrap:wrap;gap:8px;padding:12px 0}.toc button{border:1px solid ${accent};border-radius:6px;background:transparent;color:${fg};padding:5px 10px;cursor:pointer}.toc button[aria-pressed=true]{background:${accent};color:${bg}}.chatlog{display:flex;flex-direction:column;gap:${gap}px}.entry{min-width:0}.head{font-weight:700;margin-bottom:5px}.tab{font-size:.74em;opacity:.6;margin-right:10px}.name{color:var(--speaker)}.message{white-space:normal;color:${design.textColorMode==='speaker'?'var(--speaker)':fg}}ruby rt{font-size:${(Number(design.rubySize)||40)/100}em;line-height:1; font-weight:400}ruby{ruby-position:over}${layout}${extraCSS}${bookmarkStyle}${frameCSS}@media(max-width:620px){.entry{display:block}.head{width:auto;margin-bottom:5px}body{padding:20px 16px}}</style></head><body><div class="log-paper">${design.showHeading?`<header class="siteheader"><div class="eyebrow">SESSION LOG</div><h1>${title}</h1></header>`:''}${index}<main class="chatlog">${lines}</main></div>${bookmarkBar}<script>document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{const tab=b.dataset.filter;document.querySelectorAll('.entry').forEach(e=>e.hidden=!!tab&&e.dataset.tab!==tab);document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));}));${bookmarkScript}${profileScript}${foldScript}</script></body></html>`;
}

function refreshTabManager(){const select=$('manageTab'),selected=select.value;const tabs=[...new Set(rows.map(r=>r.tab))];select.innerHTML='<option value="">タブを選択</option>'+tabs.map(t=>`<option value="${esc(t)}">${esc(t)}${hiddenTabs.has(t)?'（非表示）':''}</option>`).join('');select.value=tabs.includes(selected)?selected:'';const tab=select.value;const count=rows.filter(r=>r.tab===tab).length;$('tabCount').textContent=tab?`${count} 件の発言・${hiddenTabs.has(tab)?'非表示中':'表示中'}`:'タブを選んでください';$('toggleTab').textContent=tab&&hiddenTabs.has(tab)?'再表示する':'非表示にする';$('toggleTab').disabled=!tab;$('deleteTab').disabled=!tab}
$('manageTab').onchange=refreshTabManager;
$('toggleTab').onclick=()=>{const t=$('manageTab').value;if(!t)return;snapshot();if(hiddenTabs.has(t))hiddenTabs.delete(t);else hiddenTabs.add(t);page=0;render()};
$('deleteTab').onclick=()=>{const t=$('manageTab').value;if(!t)return;const count=rows.filter(r=>r.tab===t).length;if(!confirm(`「${t}」の発言 ${count} 件をすべて削除します。元に戻す機能はありますが、保存後は復元できません。続けますか？`))return;snapshot();rows=rows.filter(r=>r.tab!==t);hiddenTabs.delete(t);render()};
function syncDesign(){for(const k of ['theme','layout','bgColor','fgColor','panelColor','textColorMode','pageTitle','exportName','font','fontSize','lineHeight','spacing','accentColor','rubySize','frameMode','frameColor1','frameColor2','frameDirection','frameWidth','frameMobileHeight'])$(k).value=design[k]??'';for(const k of ['showHeading','showTabs','showIndex'])$(k).checked=design[k]!==false} 
for(const k of ['pageTitle','exportName','font','fontSize','lineHeight','spacing','accentColor','rubySize'])$(k).addEventListener('input',()=>{design[k]=$(k).value;document.querySelectorAll('.item').forEach(card=>{card.style.setProperty('--ruby-size',((Number(design.rubySize)||40)/100)+'em');card.style.setProperty('--card-font-size',(Number(design.fontSize)||16)+'px');card.style.setProperty('--card-line-height',String(Number(design.lineHeight)||1.9));card.style.setProperty('--card-spacing',(Number(design.spacing)||12)+'px');card.style.setProperty('--card-font-family',design.font==='sans'?'sans-serif':design.font==='mono'?'monospace':'serif')})});
for(const id of ['frameMode','frameColor1','frameColor2','frameDirection','frameWidth','frameMobileHeight'])$(id).addEventListener('input',()=>{design[id]=$(id).value;scheduleLivePreview()});
$('frameImageFile').addEventListener('change',e=>{const f=e.target.files?.[0];if(!f)return;if(!/^image\/(png|jpeg|webp|gif)$/.test(f.type)){alert('PNG・JPEG・WebP・GIFを選択してください');return;}if(f.size>1500000){alert('HTMLが重くならないよう1.5MB以下の画像を選んでください');return;}const reader=new FileReader();reader.onload=()=>{design.frameImage=String(reader.result);design.frameMode='image';$('frameMode').value='image';$('frameImageStatus').textContent='画像を設定しました（完成HTMLに埋め込み）';scheduleLivePreview()};reader.readAsDataURL(f)});
$('frameImageClear').onclick=()=>{design.frameImage='';$('frameImageFile').value='';$('frameImageStatus').textContent='未設定';if(design.frameMode==='image'){design.frameMode='solid';$('frameMode').value='solid'}scheduleLivePreview()};
for(const k of ['showHeading','showTabs','showIndex'])$(k).addEventListener('change',()=>{design[k]=$(k).checked;scheduleLivePreview()});
function outname(ext){return (String(design.exportName||design.pageTitle||'session-log').replace(/\.(html?|txt|json)$/i,'').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').trim()||'session-log')+'.'+ext}
$('theme').onchange=()=>{design.theme=$('theme').value;if(presets[design.theme]){[design.bgColor,design.fgColor,design.panelColor]=presets[design.theme]}syncDesign();scheduleLivePreview()};
$('layout').onchange=()=>{design.layout=$('layout').value;scheduleLivePreview()};$('textColorMode').onchange=()=>{design.textColorMode=$('textColorMode').value;render()};for(const id of ['bgColor','fgColor','panelColor'])$(id).oninput=()=>{design[id]=$(id).value;design.theme='custom';$('theme').value='custom';scheduleLivePreview()};
$('preview').onclick=()=>{const url=URL.createObjectURL(new Blob([htmlOut()],{type:'text/html;charset=utf-8'}));const w=window.open(url,'_blank');if(!w)alert('ポップアップがブロックされました。Chromeで許可してください。');setTimeout(()=>URL.revokeObjectURL(url),60000)};
 $('save').onclick=()=>download('\ufeff'+htmlOut(),outname('html'),'text/html;charset=utf-8');$('txt').onclick=()=>download(rows.filter(r=>!hiddenTabs.has(r.tab)).map(r=>`[${r.tab}] ${r.name}：${r.text}`).join('\n\n'),outname('txt'),'text/plain;charset=utf-8');$('project').onclick=()=>download(JSON.stringify({format:'ccfolia-log-editor-v1.4',rows,original,hiddenTabs:[...hiddenTabs],design,profiles,pageTitle:design.pageTitle,exportName:design.exportName},null,2),outname('json'),'application/json');
// 上部メニューから編集パネルを切り替え。各項目はDOMごと移動し、イベントを維持する。
const side=$('settingsContent');side.querySelectorAll('[id]').forEach(el=>controlRegistry.set(el.id,el));
const blocks={};let currentPanel='tabs';
const nodes=[...side.childNodes];let section='tabs';
for(const node of nodes){
 if(node.nodeType===1 && node.tagName==='H2'){
  const label=node.textContent;
  section=label.includes('タブ')?'tabs':label.includes('HTML')?'design':label.includes('発言者')?'speakers':label.includes('一括編集')?'names':section;
 }
 if(node.nodeType===1 && node.id==='removeFiltered')section='bulk';
 if(node.nodeType===1 && node.tagName==='H2' && node.textContent.includes('文末文字'))section='suffix';
 if(node.nodeType===1 && node.tagName==='HR')continue;
 (blocks[section] ||= []).push(node);
}
function showPanel(which){currentPanel=which;const container=$('menuPanel');container.replaceChildren(...(blocks[which]||[]));document.querySelectorAll('.menu-nav button').forEach(b=>b.classList.toggle('selected',b.dataset.panel===which));if(which==='tabs')refreshTabManager();if(which==='speakers')refreshSpeakers();if(which==='suffix')updateSuffixPreview();}
function openMenu(which='tabs'){$('menuOverlay').classList.remove('hidden');showPanel(which)}
function closeMenu(){ $('menuOverlay').classList.add('hidden') }
function showNotice(message){let el=$('editNotice');if(!el){el=document.createElement('div');el.id='editNotice';el.setAttribute('role','status');const work=$('work');work.insertBefore(el,work.firstChild)}el.textContent=message;el.classList.remove('hidden')}
function markChangedCards(predicate){document.querySelectorAll('#items .item').forEach(card=>{const id=Number(card.querySelector('button[data-index]')?.dataset.index);if(Number.isInteger(id)&&rows[id]&&predicate(rows[id],id))card.classList.add('was-changed')})}

$('tools').onclick=()=>openMenu();$('closeMenu').onclick=closeMenu;$('closeOverlay').onclick=closeMenu;
document.querySelectorAll('.menu-nav button').forEach(b=>b.onclick=()=>showPanel(b.dataset.panel));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
function refreshSpeakers(){const el=$('speakerSelect');if(!el)return;const selected=el.value;const all=[...new Set(rows.map(r=>r.name))];el.replaceChildren(...all.map(name=>{const o=document.createElement('option');o.value=name;o.textContent=name+' ('+rows.filter(r=>r.name===name).length+'件)';return o}));if(all.includes(selected))el.value=selected;else if(all.length)el.value=all[0];syncSpeakerColor()}
function syncSpeakerColor(){const name=$('speakerSelect').value;const match=rows.find(r=>r.name===name);$('speakerColor').value= /^#[0-9a-f]{6}$/i.test(match?.color||'')?match.color:'#aeb6ff'}
$('speakerSelect').onchange=syncSpeakerColor;
$('setSpeakerColor').onclick=()=>{const name=$('speakerSelect').value;if(!name)return;const count=rows.filter(r=>r.name===name).length;snapshot();rows.forEach(r=>{if(r.name===name)r.color=$('speakerColor').value});editing=null;render();closeMenu();markChangedCards(r=>r.name===name);showNotice(name+' の発言 '+count+' 件の色を変更しました')};
// 発言末尾のテキセ区切り文字だけを対象にした、安全な一括編集。
function suffixCandidate(text, marker, skipSpaces, repeat){
 if(!marker)return text;
 const tail=skipSpaces?(text.match(/\s*$/u)||[''])[0]:'';
 let body=tail?text.slice(0,-tail.length):text;
 if(!body.endsWith(marker))return text;
 do{body=body.slice(0,-marker.length)}while(repeat&&body.endsWith(marker));
 return body+tail;
}
function suffixTarget(){
 const scope=$('suffixScope').value;
 if(scope==='filtered')return filtered().map(r=>r.i);
 if(scope==='tab')return rows.map((r,i)=>r.tab===$('suffixTab').value?i:-1).filter(i=>i>=0);
 return rows.map((_,i)=>i);
}
function updateSuffixPreview(){
 const sel=$('suffixTab'),chosen=sel.value;
 const tabs=[...new Set(rows.map(r=>r.tab))];
 sel.replaceChildren(...tabs.map(t=>{const el=document.createElement('option');el.value=t;el.textContent=t;return el}));
 if(tabs.includes(chosen))sel.value=chosen;
 const isTab=$('suffixScope').value==='tab';
 $('suffixTab').classList.toggle('hidden',!isTab);$('suffixTabLabel').classList.toggle('hidden',!isTab);
 const marker=$('suffixText').value,skip=$('suffixSpaces').checked,repeat=$('suffixRepeat').checked;
 const ids=suffixTarget();
 const matches=ids.filter(i=>suffixCandidate(rows[i].text,marker,skip,repeat)!==rows[i].text);
 $('suffixPreview').textContent=`対象 ${ids.length} 件のうち、文末「${marker||'（未入力）'}」を削除できる発言は ${matches.length} 件です。`;
 $('removeSuffix').disabled=!marker||!matches.length;
}
for(const id of ['suffixText','suffixScope','suffixTab','suffixSpaces','suffixRepeat'])$(id).addEventListener(['suffixText'].includes(id)?'input':'change',updateSuffixPreview);
$('removeSuffix').onclick=()=>{
 const marker=$('suffixText').value,skip=$('suffixSpaces').checked,repeat=$('suffixRepeat').checked;
 if(!marker)return alert('削除する文字を入力してください');
 const changes=suffixTarget().map(i=>({i,text:suffixCandidate(rows[i].text,marker,skip,repeat)})).filter(x=>x.text!==rows[x.i].text);
 if(!changes.length)return alert('該当する文末文字がありません');
 if(!confirm(`${changes.length} 件の発言から文末「${marker}」を削除します。続けますか？`))return;
 snapshot();changes.forEach(({i,text})=>rows[i].text=text);editing=null;render();updateSuffixPreview();closeMenu();markChangedCards((r,i)=>changes.some(c=>c.i===i));showNotice(`${changes.length} 件の文末文字を削除しました`);
};

// 範囲移動：発言者名・本文・色・タブを変えずに行の順序だけを更新する。
const rangePanel=document.createElement('div');
rangePanel.innerHTML=`<h2>発言をまとめて移動</h2><p class="range-help">ログの番号（#）を指定して範囲を選択します。「指定タブだけ」を選ぶと、その範囲に挟まっている別タブの発言は移動しません。元のログを直接書き換えず、元に戻すこともできます。</p>
<label for="rangeMode">選択方法</label><select id="rangeMode"><option value="tab">指定タブの発言だけを集める</option><option value="all">範囲内の全発言をまとめる</option></select>
<label id="rangeTabLabel" for="rangeTab">まとめたいタブ</label><select id="rangeTab"></select>
<div class="range-grid"><div><label for="rangeStart">開始番号（#）</label><input type="number" id="rangeStart" min="1" step="1" value="1"></div><div><label for="rangeEnd">終了番号（#）</label><input type="number" id="rangeEnd" min="1" step="1" value="1"></div></div>
<label for="rangeDestination">移動先</label><select id="rangeDestination"><option value="end">ログの最後にまとめる</option><option value="before">指定番号の前</option><option value="after">指定番号の後</option></select>
<div id="rangeAnchorWrap" class="hidden"><label for="rangeAnchor">移動先の番号（#）</label><input type="number" id="rangeAnchor" min="1" step="1" value="1"></div>
<div id="rangeInfo" class="range-summary" aria-live="polite">ログを読み込むと選択内容が表示されます。</div>
<button class="primary" id="moveRange">選択した発言をまとめて移動</button>
<p class="range-help">番号は画面の検索結果ではなく、発言左上にある元の番号（#）です。ページをまたぐ範囲も指定できます。HTML出力にも変更後の順番が反映されます。</p>`;
blocks.range=[rangePanel];
// Keep the range controls in the document before registering their handlers.
$('settingsContent').appendChild(rangePanel);
function prepareRange(){
 const select=$('rangeTab');const tabs=[...new Set(rows.map(r=>r.tab))];const prev=select.value;
 select.replaceChildren(...tabs.map(t=>{const x=document.createElement('option');x.value=t;x.textContent=t;return x}));
 if(tabs.includes(prev))select.value=prev;
 $('rangeStart').max=rows.length;$('rangeEnd').max=rows.length;$('rangeAnchor').max=rows.length;
 if(!rangePanel.dataset.init){$('rangeEnd').value=rows.length||1;rangePanel.dataset.init='1'}
 const useTab=$('rangeMode').value==='tab';$('rangeTab').classList.toggle('hidden',!useTab);$('rangeTabLabel').classList.toggle('hidden',!useTab);
 $('rangeAnchorWrap').classList.toggle('hidden',$('rangeDestination').value==='end');
 updateRangeInfo();
}
function selectionForRange(){
 const start=Number($('rangeStart').value),end=Number($('rangeEnd').value);
 if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end>rows.length||start>end)return null;
 return rows.map((r,i)=>({r,i})).filter(({r,i})=>i>=start-1&&i<=end-1&&($('rangeMode').value==='all'||r.tab===$('rangeTab').value)).map(x=>x.i);
}
function updateRangeInfo(){
 const ids=selectionForRange();const info=$('rangeInfo');
 if(!ids){info.textContent='開始番号と終了番号を確認してください。';$('moveRange').disabled=true;return}
 if(!ids.length){info.textContent='この範囲に該当する発言はありません。';$('moveRange').disabled=true;return}
 const p=ids.slice(0,3).map(i=>`#${i+1} [${rows[i].tab}] ${rows[i].name}：${rows[i].text.slice(0,28).replace(/\n/g,' ')}`).join('\n');
 info.textContent=`移動する発言：${ids.length}件\n${p}${ids.length>3?'\n…':''}`;
 $('moveRange').disabled=false;
}
for(const id of ['rangeMode','rangeTab','rangeStart','rangeEnd','rangeDestination','rangeAnchor'])$(id).addEventListener('input',prepareRange);
$('moveRange').onclick=()=>{
 const selected=selectionForRange();if(!selected||!selected.length)return alert('移動する発言を選択してください');
 const where=$('rangeDestination').value;const anchor=Number($('rangeAnchor').value)-1;
 if(where!=='end'&&(!Number.isInteger(anchor)||anchor<0||anchor>=rows.length))return alert('移動先の番号が正しくありません');
 if(where!=='end'&&selected.includes(anchor))return alert('移動先には、移動対象に含まれない発言の番号を指定してください');
 if(!confirm(`${selected.length}件の発言をまとめて移動しますか？`))return;
 snapshot();const picked=new Set(selected),moving=selected.map(i=>rows[i]);const remaining=rows.filter((_,i)=>!picked.has(i));
 let pos=remaining.length;
 if(where!=='end'){const before=rows.slice(0,anchor).filter((_,i)=>!picked.has(i)).length;pos=before+(where==='after'?1:0)}
 remaining.splice(pos,0,...moving);rows=remaining;page=0;editing=null;render();prepareRange();
 alert(`${moving.length}件の発言を移動しました。`);
};
const oldShowPanel=showPanel;
showPanel=function(which){oldShowPanel(which);if(which==='range')prepareRange()};

showPanel('tabs');
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='z'&&e.target.tagName!=='INPUT'&&e.target.tagName!=='TEXTAREA'){e.preventDefault();$('undo').click()}})

// v2.9 additions
const imagePicker=$('insertImagePicker');
let pendingSpecialPosition=null;
function addSpecial(type, image='', position=null){
 const text=prompt(type==='scene'?'追加する章・シーン名を入力してください':'画像の説明（省略できます）',type==='scene'?'新しいシーン':'');
 if(text===null)return;
 const pos=Number.isInteger(position)?Math.max(0,Math.min(rows.length,position)):rows.length;
 const preceding=rows[Math.max(0,pos-1)]||rows[pos]||{};
 snapshot();rows.splice(pos,0,{name:'',tab:preceding.tab||$('tabFilter').value||'メイン',text,color:'#aa7290',type,image});
 $('search').value='';$('tabFilter').value='';$('nameFilter').value='';editing=null;
 page=Math.floor(pos/pageSize);render();
 const card=[...$('items').querySelectorAll('.item[data-row-index]')].find(el=>Number(el.dataset.rowIndex)===pos);
 card?.scrollIntoView({block:'center',behavior:'smooth'});
 showNotice(Number.isInteger(position)?'指定した位置に追加しました。':'末尾に追加しました。');
}
$('addScene').onclick=()=>addSpecial('scene');
$('addImage').onclick=()=>{pendingSpecialPosition=null;imagePicker.click()};
$('items').addEventListener('click', e=>{
 const b=e.target.closest('[data-special-kind],[data-dismiss-special]');if(!b)return;
 const menu=b.closest('.special-insert-menu');if(!menu)return;
 e.preventDefault();e.stopPropagation();
 if(b.hasAttribute('data-dismiss-special')){menu.remove();return}
 const anchor=Number(menu.dataset.targetIndex),position=anchor+(b.dataset.side==='after'?1:0);
 if(b.dataset.specialKind==='scene')addSpecial('scene','',position);
 else{pendingSpecialPosition=position;imagePicker.click()}
});
imagePicker.onchange=async e=>{
 const f=e.target.files?.[0];if(!f){pendingSpecialPosition=null;return}
 if(!/^image\/(png|jpeg|webp|gif)$/.test(f.type)||f.size>2200000){alert('PNG・JPEG・WebP・GIF、2.2MB以下の画像にしてください');pendingSpecialPosition=null;imagePicker.value='';return}
 try{const image=await readAsData(f);addSpecial('image',image,pendingSpecialPosition)}catch{alert('画像を読み込めませんでした')}
 pendingSpecialPosition=null;imagePicker.value='';
};
function readAsData(f){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(f)})}
$('diceMode').onchange=()=>{design.diceMode=$('diceMode').value;scheduleAutosave();showNotice('ダイス色の設定を変更しました。HTML出力に反映します。')};
$('profiles').onclick=()=>{
 const names=[...new Set(rows.map(r=>r.name).filter(Boolean))];if(!names.length)return alert('先にログを読み込んでください');
 const overlay=document.createElement('div');overlay.className='profile-editor-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','人物プロフィール編集');
 const panel=document.createElement('section');panel.className='profile-editor-panel';overlay.append(panel);
 panel.innerHTML='<div class="profile-editor-head"><h2 style="margin:0;color:#ab6286">✿ 人物プロフィール編集</h2><button type="button" class="close-profile">閉じる ✕</button></div><p class="profile-editor-foot">発言者を選び、紹介文と画像を編集できます。完成HTMLでは発言者名をクリックすると表示されます。</p><div class="profile-editor-grid"><div class="profile-editor-names"></div><div class="profile-editor-form"><strong class="selected-name"></strong><label>紹介文<textarea placeholder="キャラクターの紹介文を入力"></textarea></label><label>立ち絵・紹介画像<input class="profile-image-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label><div class="profile-editor-picture">画像未設定</div><div class="profile-editor-actions"><button type="button" class="remove-picture">画像を削除</button><button type="button" class="save-profile primary">プロフィールを保存</button></div><p class="profile-editor-foot">画像は2.2MBまで。保存した内容は編集データと完成HTMLに含まれます。</p></div></div>';
 document.body.append(overlay);const one=s=>panel.querySelector(s),nameList=one('.profile-editor-names'),desc=one('textarea'),picture=one('.profile-editor-picture');let selected=names[0],tempImage=null,dirty=false;
 const paint=()=>{picture.replaceChildren();if(tempImage){const img=document.createElement('img');img.src=tempImage;img.alt=selected;picture.append(img)}else picture.textContent='画像未設定';};
 function store(){profiles[selected]={...(profiles[selected]||{}),description:desc.value,image:tempImage||''};dirty=false;scheduleAutosave();}
 function select(name){if(dirty)store();selected=name;desc.value=profiles[name]?.description||'';tempImage=profiles[name]?.image||'';dirty=false;one('.selected-name').textContent=name;nameList.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.name===name));one('.profile-image-file').value='';paint()}
 names.forEach(name=>{const b=document.createElement('button');b.type='button';b.dataset.name=name;b.textContent=name;b.onclick=()=>select(name);nameList.append(b)});
 desc.addEventListener('input',()=>{dirty=true});one('.profile-image-file').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;if(!/^image\/(png|jpeg|webp|gif)$/.test(f.type)||f.size>2200000){alert('PNG・JPEG・WebP・GIF、2.2MB以下の画像にしてください');return}tempImage=await readAsData(f);dirty=true;paint()};
 one('.remove-picture').onclick=()=>{tempImage=null;dirty=true;paint()};one('.save-profile').onclick=()=>{store();showNotice(selected+' のプロフィールを保存しました')};
 const close=()=>{if(dirty)store();overlay.remove()};one('.close-profile').onclick=close;overlay.onclick=e=>{if(e.target===overlay)close()};overlay.addEventListener('keydown',e=>{if(e.key==='Escape')close()});select(selected);
};
// Drag movement works on message cards; filters are cleared on drop to make the new order evident.
let draggingIndex=null;
$('items').addEventListener('dragstart',e=>{const card=e.target.closest('.item[data-row-index]');if(!card||editing!==null){e.preventDefault();return;}draggingIndex=+card.dataset.rowIndex;card.classList.add('dragging');if(e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(draggingIndex))}});
$('items').addEventListener('dragover',e=>{if(draggingIndex===null)return;const target=e.target.closest('.item[data-row-index]');if(!target)return;e.preventDefault();document.querySelectorAll('.item.drag-target').forEach(x=>x.classList.remove('drag-target'));target.classList.add('drag-target')});
$('items').addEventListener('drop',e=>{if(draggingIndex===null)return;const target=e.target.closest('.item[data-row-index]');if(!target)return;e.preventDefault();const from=draggingIndex,to=+target.dataset.rowIndex;draggingIndex=null;if(from===to)return;snapshot();const [r]=rows.splice(from,1);rows.splice(to,0,r);$('search').value='';$('tabFilter').value='';$('nameFilter').value='';page=Math.floor(to/pageSize);render();showNotice('発言の順番を変更しました')});
$('items').addEventListener('dragend',()=>{draggingIndex=null;document.querySelectorAll('.dragging,.drag-target').forEach(x=>x.classList.remove('dragging','drag-target'))});
// Persist locally in IndexedDB, not on GitHub or an external service.
const DB_NAME='shockdazou-log-editor-v30-profiles';let dbPromise=null,saveEnabled=false;
function database(){if(!('indexedDB' in window))return Promise.reject(Error('IndexedDB unavailable'));if(dbPromise)return dbPromise;dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>req.result.createObjectStore('projects');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});return dbPromise}
async function putDraft(payload){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('projects','readwrite');tx.objectStore('projects').put(payload,'last');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
async function getDraft(){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('projects','readonly');const req=tx.objectStore('projects').get('last');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
function scheduleAutosave(){if(!saveEnabled||!rows.length)return;clearTimeout(autosaveTimer);const state=$('autosaveState');state.textContent='保存中…';autosaveTimer=setTimeout(async()=>{try{await putDraft({rows,original,hiddenTabs:[...hiddenTabs],design,profiles,sourceName:currentSourceName,updated:Date.now()});state.textContent='✓ 自動保存済み '+new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})}catch(e){state.textContent='自動保存できません。JSONでバックアップしてください'}},650)}
// Save changes to design/profile even where the existing editor does not redraw its cards.
document.addEventListener('change',e=>{if(e.target.closest('#work,#menuOverlay'))scheduleAutosave()},true);
document.addEventListener('input',e=>{if(e.target.closest('#menuOverlay')&&!e.target.closest('#edText'))scheduleAutosave()},true);
(async()=>{try{const draft=await getDraft();saveEnabled=true;if(draft?.rows?.length){const date=new Date(draft.updated).toLocaleString('ja-JP');if(confirm('前回の編集中ログがあります（'+date+'）。\n続きから再開しますか？')){load(JSON.stringify({...draft,format:'ccfolia-log-editor-v2.9'}),'autosaved.json');profiles=draft.profiles||{};currentSourceName=draft.sourceName||'';showNotice('自動保存された編集データから再開しました')}}$('autosaveState').textContent='自動保存オン'}catch(e){saveEnabled=false;$('autosaveState').textContent='自動保存不可（JSON保存をご利用ください）'}})();


// 発言検索からカードへ直接ジャンプ（検索結果が他ページでも移動できる）
const directJumpPanel=document.getElementById('directJumpPanel');
function updateDirectJump(){
  if(!directJumpPanel)return;
  const q=($('search')?.value||'').trim().toLowerCase();
  if(!q){directJumpPanel.hidden=true;directJumpPanel.innerHTML='';return;}
  const hitList=rows.map((r,i)=>({...r,_row:i})).filter(r=>
    !hiddenTabs.has(r.tab)&&
    (String(r.name||'')+' '+String(r.tab||'')+' '+String(r.text||'')).toLowerCase().includes(q)
  );
  directJumpPanel.hidden=false;
  const list=hitList.slice(0,30).map(r=>'<button type="button" class="jump-result" data-direct-row="'+r._row+'"><span class="jump-num">#'+(r._row+1)+'</span><span class="jump-excerpt">'+esc((r.name?r.name+'：':'')+String(r.text||'').replace(/\s+/g,' ').slice(0,125))+'</span></button>').join('');
  directJumpPanel.innerHTML='<strong>検索結果 '+hitList.length+'件 — 発言を押すとその場所へ移動</strong><div class="jump-result-list">'+(list||'<span class="jump-note">一致する発言がありません。</span>')+'</div>'+(hitList.length>30?'<p class="jump-note">最初の30件を表示しています。語句を絞るとほかの結果を探せます。</p>':'');
}
directJumpPanel?.addEventListener('click',ev=>{
  const btn=ev.target.closest('[data-direct-row]');if(!btn)return;
  const idx=Number(btn.dataset.directRow);
  if(!Number.isInteger(idx)||idx<0||idx>=rows.length)return;
  $('search').value='';$('tabFilter').value='';$('nameFilter').value='';
  editing=null;page=Math.floor(idx/pageSize);
  render();
  updateDirectJump();
  const card=[...$('items').querySelectorAll('.item[data-row-index]')].find(el=>Number(el.dataset.rowIndex)===idx);
  if(card){card.classList.add('jump-highlight');card.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>card.classList.remove('jump-highlight'),3200)}
});
$('search')?.addEventListener('input',updateDirectJump);


// v3.6: bulk cleanup, contiguous-speaker merge, multi-log import, shortcuts
const v36Modal=document.createElement('dialog');v36Modal.className='v36-dialog';document.body.appendChild(v36Modal);
function v36Dialog(title,fields,preview,onConfirm){
  v36Modal.replaceChildren();
  const heading=document.createElement('h3');heading.textContent=title;v36Modal.append(heading);
  const area=document.createElement('div');area.className='v36-fields';v36Modal.append(area);
  fields(area);
  const prev=document.createElement('div');prev.className='v36-preview';v36Modal.append(prev);
  const controls=document.createElement('div');controls.className='v36-buttons';v36Modal.append(controls);
  const cancel=document.createElement('button');cancel.textContent='キャンセル';cancel.onclick=()=>v36Modal.close();
  const commit=document.createElement('button');commit.className='primary';commit.textContent='実行する';commit.onclick=()=>onConfirm(()=>v36Modal.close());
  controls.append(cancel,commit);
  const repaint=()=>{prev.textContent=preview();};area.addEventListener('change',repaint);repaint();
  v36Modal.showModal();
}
function v36Check(parent,id,label,checked=false){const lab=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.id=id;input.checked=checked;lab.append(input,document.createTextNode(label));parent.append(lab);return input;}
function v36SelectedIndices(rules){
  return rows.flatMap((r,i)=>{
    if(r.type!=='message')return [];
    const txt=String(r.text||'').trim();
    const blank=txt.length===0;
    const slash=/^[/／\s]+$/.test(txt);
    const dice=/^(?:シークレットダイス|(?:CCB|CC|1D100|1d100)\b|\d+[dD]\d+\b)/.test(txt)||/ダイス(?:ロール|結果)/.test(txt);
    const sys=/^(?:システム|system|SYSTEM)(?:\s*[:：]|\s)/.test(txt);
    return (rules.blank&&blank)||(rules.slash&&slash)||(rules.dice&&dice)||(rules.sys&&sys)?[i]:[];
  });
}
$('v36Clean').onclick=()=>{
  if(!rows.length)return alert('先にログを読み込んでください');
  const rules={};
  v36Dialog('不要発言の候補を確認して削除',area=>{
    rules.blank=v36Check(area,'v36b','空白・改行だけの発言',true);
    rules.slash=v36Check(area,'v36s','「/」「//」だけの発言',true);
    rules.dice=v36Check(area,'v36d','ダイスロール関連の発言（判定結果も含む）',false);
    rules.sys=v36Check(area,'v36x','システム通知らしい発言',false);
  },()=>{
    const found=v36SelectedIndices(Object.fromEntries(Object.entries(rules).map(([k,el])=>[k,el.checked])));
    return '削除候補：'+found.length+'件 / 全'+rows.length+'件\n\n'+found.slice(0,12).map(i=>'#'+(i+1)+' ['+rows[i].tab+'] '+rows[i].name+'：'+rows[i].text.slice(0,65)).join('\n')+(found.length>12?'\n…残り'+(found.length-12)+'件':'');
  },close=>{
    const found=v36SelectedIndices(Object.fromEntries(Object.entries(rules).map(([k,el])=>[k,el.checked])));
    if(!found.length)return alert('削除候補がありません');
    if(!confirm(found.length+'件を削除します。元に戻すことができます。続けますか？'))return;
    snapshot();const ids=new Set(found);rows=rows.filter((_,i)=>!ids.has(i));editing=null;page=0;render();close();showNotice(found.length+'件の不要発言を削除しました');
  });
};
function v36MergeGroups(){const groups=[];for(let i=0;i<rows.length;){let j=i+1;const r=rows[i];if(r.type==='message'||!r.type){while(j<rows.length&&(rows[j].type==='message'||!rows[j].type)&&rows[j].name===r.name&&rows[j].tab===r.tab)j++;if(j-i>1)groups.push([i,j]);}i=j;}return groups;}
$('v36Merge').onclick=()=>{
  if(!rows.length)return alert('先にログを読み込んでください');
  let choice;
  v36Dialog('同じ発言者の連続セリフを結合',area=>{
    const label=document.createElement('label');label.textContent='つなぎ方：';choice=document.createElement('select');choice.innerHTML='<option value="newline">改行でつなぐ</option><option value="space">空白でつなぐ</option>';label.append(choice);area.append(label);
  },()=>{const groups=v36MergeGroups();return '結合できるグループ：'+groups.length+'組\n'+groups.slice(0,10).map(([s,e])=>'#'+(s+1)+'〜#'+e+' ['+rows[s].tab+'] '+rows[s].name+'（'+(e-s)+'発言）').join('\n')+'\n※同じタブ・同じ名前で連続した発言のみ。章・画像は結合しません。';},close=>{
    const groups=v36MergeGroups();if(!groups.length)return alert('結合できる連続発言はありません');
    if(!confirm(groups.length+'組の発言を結合します。よろしいですか？'))return;
    snapshot();const sep=choice.value==='space'?' ':'\n';
    for(const [start,end] of groups.reverse()){
      rows[start]={...rows[start],text:rows.slice(start,end).map(r=>r.text).join(sep)};
      rows.splice(start+1,end-start-1);
    }
    editing=null;page=0;render();close();showNotice(groups.length+'組のセリフを結合しました');
  });
};
$('v36Multi').onclick=()=>{if(!rows.length)return alert('先に最初のログを読み込んでください');$('v36MultiFiles').click()};
$('v36MultiFiles').onchange=async e=>{
  const files=[...e.target.files];e.target.value='';if(!files.length)return;
  const added=[];const errors=[];
  for(const file of files){
    try{
      const s=await file.text();let result;
      if(file.name.toLowerCase().endsWith('.json')){
        const obj=JSON.parse(s);result=Array.isArray(obj)?obj:obj.rows;
      }else result=parseHTML(s);
      if(!Array.isArray(result)||!result.length)throw new Error('発言を読み取れません');
      added.push({filename:file.name,rows:result.map(r=>({name:String(r.name||''),tab:String(r.tab||'メイン'),text:String(r.text||''),color:String(r.color||'#aeb6ff'),type:r.type||'message',image:r.image||''}))});
    }catch(err){errors.push(file.name+'：'+err.message)}
  }
  if(!added.length){alert('追加できるログがありません。\n'+errors.join('\n'));return;}
  const total=added.reduce((n,o)=>n+o.rows.length,0);
  if(!confirm(added.length+'ファイル、計'+total+'件を現在のログ末尾に追加します。\n発言順はファイルの選択順で維持します。よろしいですか？'))return;
  snapshot();for(const item of added)rows.push(...item.rows);
  editing=null;render();showNotice(total+'件の発言を末尾に追加しました'+(errors.length?'（一部読み込み失敗）':''));
  if(errors.length)alert('読み込めなかったファイル：\n'+errors.join('\n'));
};
document.addEventListener('keydown',e=>{
  if(!(e.ctrlKey||e.metaKey)||e.altKey)return;
  const tag=e.target?.tagName||'';
  const typing=e.target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(tag);
  const k=e.key.toLowerCase();
  if(k==='s'){if(!rows.length)return;e.preventDefault();$('project').click();showNotice('編集データをJSONで保存しました');}
  else if(k==='f'&&!typing){if(!rows.length)return;e.preventDefault();$('search').focus();$('search').select();}
  else if(k==='z'&&!typing&&!v36Modal.open){if(!rows.length)return;e.preventDefault();$('undo').click();}
});

})();
