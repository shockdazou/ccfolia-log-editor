
(()=>{'use strict';const controlRegistry=new Map();const $=id=>document.getElementById(id)||controlRegistry.get(id)||null;let rows=[],original='',history=[],page=0,editing=null;const pageSize=80;let hiddenTabs=new Set(), design={theme:'dark',layout:'normal',bgColor:'#171923',fgColor:'#e6e6e6',panelColor:'#212530',textColorMode:'common',pageTitle:'',exportName:'',font:'serif',fontSize:16,lineHeight:1.9,spacing:12,accentColor:'#bb7093',showHeading:true,showTabs:true,showIndex:true};const presets={dark:['#171923','#e6e6e6','#212530'],light:['#f6f7fb','#242633','#ffffff'],sepia:['#f4ead7','#453a2f','#fff9ed'],navy:['#101b30','#eef3ff','#1b2b47']};const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));function snapshot(){history.push(JSON.stringify({rows,hiddenTabs:[...hiddenTabs]}));if(history.length>25)history.shift()}function textOf(n){return(n?.innerText||n?.textContent||'').trim()}function parseHTML(source){
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
function load(str,filename){let result=[];hiddenTabs=new Set();design={theme:'dark',layout:'normal',bgColor:'#171923',fgColor:'#e6e6e6',panelColor:'#212530',textColorMode:'common',pageTitle:'',exportName:'',font:'serif',fontSize:16,lineHeight:1.9,spacing:12,accentColor:'#bb7093',showHeading:true,showTabs:true,showIndex:true};try{if(filename?.endsWith('.json')){const obj=JSON.parse(str);result=Array.isArray(obj)?obj:obj.rows; if(!Array.isArray(result))throw Error('不正なJSONです');original=obj.original||'';hiddenTabs=new Set(obj.hiddenTabs||[]);if(obj.design)design={...design,...obj.design};if(obj.pageTitle)design.pageTitle=obj.pageTitle;if(obj.exportName)design.exportName=obj.exportName}else{result=parseHTML(str);original=str;const doc=new DOMParser().parseFromString(str,'text/html');design.pageTitle=(doc.querySelector('title')?.textContent||'').trim()||filename.replace(/\.html?$/i,'');design.exportName=filename.replace(/\.html?$/i,'')}}catch(e){alert('読み込みに失敗しました：'+e.message);return}if(!result.length){alert('発言が見つかりませんでした。ココフォリアから出力したHTMLを指定してください。');return}rows=result.map(r=>({name:String(r.name||''),tab:String(r.tab||'メイン'),text:String(r.text||''),color:String(r.color||'#aeb6ff')}));history=[];page=0;editing=null;$('drop').classList.add('hidden');$('work').classList.remove('hidden');syncDesign();render()}
function readFile(file){if(!file)return;const reader=new FileReader();reader.onload=()=>load(String(reader.result),file.name.toLowerCase());reader.readAsText(file,'UTF-8')}
$('file').onchange=e=>readFile(e.target.files[0]);const drop=$('drop');drop.ondragover=e=>{e.preventDefault();drop.classList.add('over')};drop.ondragleave=()=>drop.classList.remove('over');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('over');readFile(e.dataTransfer.files[0])};drop.onclick=e=>{if(e.target.closest('label'))return;$('file').click()};$('reset').onclick=()=>{if(rows.length&&!confirm('編集中のデータを閉じますか？'))return;rows=[];$('file').value='';$('drop').classList.remove('hidden');$('work').classList.add('hidden')};
function matches(r){let q=$('search').value.toLowerCase(),t=$('tabFilter').value,n=$('nameFilter').value;return !hiddenTabs.has(r.tab)&&(!q||(r.name+' '+r.tab+' '+r.text).toLowerCase().includes(q))&&(!t||r.tab===t)&&(!n||r.name===n)}function filtered(){return rows.map((r,i)=>({...r,i})).filter(matches)}function refreshFilters(){const tabs=[...new Set(rows.map(r=>r.tab))],names=[...new Set(rows.map(r=>r.name))];for(const [id,arr,placeholder] of [['tabFilter',tabs,'すべてのタブ'],['nameFilter',names,'すべての発言者']]){const el=$(id),selected=el.value;el.innerHTML='<option value="">'+placeholder+'</option>'+arr.map(a=>'<option value="'+esc(a)+'">'+esc(a)+'</option>').join('');el.value=arr.includes(selected)?selected:''}}
function render(){refreshFilters();refreshTabManager();refreshSpeakers();let result=filtered(),total=Math.max(1,Math.ceil(result.length/pageSize));page=Math.min(page,total-1);$('stats').textContent=`全 ${rows.length} 件 / 表示対象 ${result.length} 件 / 非表示 ${rows.filter(r=>hiddenTabs.has(r.tab)).length} 件`; const slice=result.slice(page*pageSize,(page+1)*pageSize);$('items').innerHTML=slice.length?slice.map(r=>`<article class="item ${editing===r.i?'is-editing':''}" style="--card-font-size:${Number(design.fontSize)||16}px;--card-line-height:${Number(design.lineHeight)||1.9};--card-spacing:${Number(design.spacing)||12}px;--card-font-family:${design.font==='sans'?'sans-serif':design.font==='mono'?'monospace':'serif'};--c:${/^#[0-9a-f]{3,8}$/i.test(r.color)?r.color:'#888'}"><div class="strip"></div><div class="iteminner"><div class="meta"><span class="number">#${r.i+1}</span><span class="tab">${esc(r.tab)}</span><span class="who" style="color:${/^#[0-9a-f]{3,8}$/i.test(r.color)?r.color:'#aeb6ff'}">${esc(r.name)}</span><div class="actions"><button data-action="up" data-index="${r.i}" title="上へ">↑</button><button data-action="down" data-index="${r.i}" title="下へ">↓</button><button data-action="edit" data-index="${r.i}">編集</button><button data-action="delete" data-index="${r.i}" class="danger">削除</button></div></div><div style="${design.textColorMode==='speaker'?'color:'+(/^#[0-9a-f]{3,8}$/i.test(r.color)?r.color:'#888'): ''}" class="msg ${design.textColorMode==='speaker'?'speaker-color':''}">${esc(r.text)}</div>${editing===r.i?`<div class="editfields"><div class="edithelp">ここで直接編集できます。変更内容は上の発言カードにすぐ反映されます。</div><input id="edName" aria-label="名前" value="${esc(r.name)}"><input id="edTab" aria-label="タブ" value="${esc(r.tab)}"><input id="edColor" aria-label="色" type="color" value="${/^#[0-9a-f]{6}$/i.test(r.color)?r.color:'#aeb6ff'}"><textarea id="edText" aria-label="本文">${esc(r.text)}</textarea><div class="editbuttons"><button id="apply" class="primary">変更を確定</button><button id="cancel">キャンセル</button></div></div>`:''}</div></article>`).join(''):'<div class="empty">該当する発言がありません</div>';$('pager').innerHTML=`<button id="prev" ${page===0?'disabled':''}>前へ</button><span>${page+1} / ${total} ページ</span><button id="next" ${page>=total-1?'disabled':''}>次へ</button>`;$('prev').onclick=()=>{page--;editing=null;render()};$('next').onclick=()=>{page++;editing=null;render()};const apply=$('apply');if(apply)apply.onclick=()=>{snapshot();rows[editing]={...rows[editing],name:$('edName').value,tab:$('edTab').value,text:$('edText').value,color:$('edColor').value};editing=null;render()};if($('cancel'))$('cancel').onclick=()=>{editing=null;render()}}

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
  if(msg&&$('edText'))msg.textContent=$('edText').value;
  if(who&&$('edColor'))who.style.color=$('edColor').value;
  const strip=card.querySelector('.strip');if(strip)strip.style.background=$('edColor').value;
  const tab=card.querySelector('.tab');if(tab&&$('edTab'))tab.textContent=$('edTab').value;
  if(msg){msg.style.color=design.textColorMode==='speaker'?$('edColor').value:'';}
 }
 // Current card itself is the live preview.
});
$('items').onclick=e=>{const btn=e.target.closest('button[data-action]');if(!btn)return;const i=+btn.dataset.index,a=btn.dataset.action;if(a==='edit'){editing=i;render();const field=$('edText');if(field){field.focus({preventScroll:true});field.closest('.item')?.scrollIntoView({block:'nearest',behavior:'smooth'});}return}if(a==='delete'){snapshot();rows.splice(i,1)}else if(a==='up'&&i>0){snapshot();[rows[i-1],rows[i]]=[rows[i],rows[i-1]]}else if(a==='down'&&i<rows.length-1){snapshot();[rows[i+1],rows[i]]=[rows[i],rows[i+1]]}render()};for(const id of ['search','tabFilter','nameFilter'])$(id).addEventListener(id==='search'?'input':'change',()=>{page=0;editing=null;render()});$('add').onclick=()=>{snapshot();rows.push({name:'KP',tab:'メイン',text:'',color:'#aeb6ff'});$('search').value='';$('tabFilter').value='';$('nameFilter').value='';page=Math.ceil(rows.length/pageSize)-1;editing=rows.length-1;render();$('edText')?.focus()};$('undo').onclick=()=>{if(!history.length){alert('元に戻せる操作がありません');return}{const prior=JSON.parse(history.pop());rows=prior.rows||prior;hiddenTabs=new Set(prior.hiddenTabs||[])}editing=null;render()};$('rename').onclick=()=>{const old=$('oldName').value,neo=$('newName').value;if(!old||!neo)return alert('変更前・変更後の名前を入力してください');const count=rows.filter(r=>r.name===old).length;if(!count)return alert('一致する発言者がいません');snapshot();rows.forEach(r=>{if(r.name===old)r.name=neo});editing=null;render();closeMenu();markChangedCards(r=>r.name===neo);showNotice(count+'件の発言者名を変更しました')};$('removeFiltered').onclick=()=>{const target=filtered();if(!target.length)return;if(!confirm(target.length+'件の発言を削除します。よろしいですか？'))return;snapshot();const ids=new Set(target.map(x=>x.i));rows=rows.filter((_,i)=>!ids.has(i));render()};function download(data,name,type){let blob=new Blob([data],{type});let url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}function htmlOut(){
 const safeColor=(c,defaultColor)=>/^#[0-9a-f]{6}$/i.test(c)?c:defaultColor;
 const bg=safeColor(design.bgColor,'#171923'), fg=safeColor(design.fgColor,'#e6e6e6'),panel=safeColor(design.panelColor,'#212530'),accent=safeColor(design.accentColor,'#bb7093');
 const chosen=rows.filter(r=>!hiddenTabs.has(r.tab));const tabs=[...new Set(chosen.map(r=>r.tab))];
 const title=esc(design.pageTitle||design.exportName||'セッションログ');
 const font=({serif:'Georgia, "Yu Mincho", "Hiragino Mincho ProN",serif',sans:'system-ui,"Yu Gothic",Meiryo,sans-serif',modern:'"Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif',mono:'ui-monospace,Consolas,monospace'})[design.font]||'serif';
 const size=Math.min(24,Math.max(12,Number(design.fontSize)||16));const lh=Math.min(2.6,Math.max(1.3,Number(design.lineHeight)||1.9));const gap=Math.min(36,Math.max(0,Number(design.spacing)||0));
 const lines=chosen.map(r=>`<div class="entry" data-tab="${esc(r.tab)}" style="--speaker:${safeColor(r.color,'#aeb6ff')}"><div class="head">${design.showTabs?`<span class="tab">[${esc(r.tab)}]</span>`:''}<span class="name">${esc(r.name)}</span></div><div class="message">${esc(r.text).replace(/\n/g,'<br>')}</div></div>`).join('\n');
 const index=design.showIndex&&tabs.length?`<details class="toc"><summary>目次・タブ表示</summary><div class="tocitems"><button type="button" data-filter="">すべて</button>${tabs.map(t=>`<button type="button" data-filter="${esc(t)}">${esc(t)}</button>`).join('')}</div></details>`:'';
 const layout=design.layout==='card'?`.entry{background:${panel};border-radius:12px;padding:18px 20px;border:1px solid ${accent}33}`:design.layout==='compact'?`.entry{display:flex;gap:22px;align-items:baseline;padding:8px 0}.head{width:190px;flex:none;margin:0}`:`.entry{padding:10px 0;border-bottom:1px solid ${accent}30}`;
 return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>:root{color-scheme:${design.theme==='light'||design.theme==='sepia'?'light':'dark'}}*{box-sizing:border-box}html{scroll-behavior:smooth}[hidden]{display:none!important}body{background:${bg};color:${fg};font-family:${font};font-size:${size}px;line-height:${lh};max-width:980px;margin:0 auto;padding:42px 25px 100px;overflow-wrap:anywhere}.siteheader{text-align:center;padding:35px 0 40px;margin-bottom:32px;border-bottom:1px solid ${accent}}.eyebrow{color:${accent};font-size:11px;letter-spacing:.3em}.siteheader h1{font-size:clamp(22px,4vw,40px);line-height:1.4;font-weight:500;letter-spacing:.07em;margin:14px 0}.toc{position:sticky;top:0;background:${bg};padding:12px 0;margin-bottom:22px;border-bottom:1px solid ${accent}55;z-index:2}.toc summary{cursor:pointer;color:${accent};font-size:13px}.tocitems{display:flex;flex-wrap:wrap;gap:8px;padding:12px 0}.toc button{border:1px solid ${accent};border-radius:6px;background:transparent;color:${fg};padding:5px 10px;cursor:pointer}.toc button[aria-pressed=true]{background:${accent};color:${bg}}.chatlog{display:flex;flex-direction:column;gap:${gap}px}.entry{min-width:0}.head{font-weight:700;margin-bottom:5px}.tab{font-size:.74em;opacity:.6;margin-right:10px}.name{color:var(--speaker)}.message{white-space:normal;color:${design.textColorMode==='speaker'?'var(--speaker)':fg}}${layout}@media(max-width:620px){.entry{display:block}.head{width:auto;margin-bottom:5px}body{padding:20px 16px}}</style></head><body>${design.showHeading?`<header class="siteheader"><div class="eyebrow">SESSION LOG</div><h1>${title}</h1></header>`:''}${index}<main class="chatlog">${lines}</main><script>document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{const tab=b.dataset.filter;document.querySelectorAll('.entry').forEach(e=>e.hidden=!!tab&&e.dataset.tab!==tab);document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));}));</script></body></html>`;
}

function refreshTabManager(){const select=$('manageTab'),selected=select.value;const tabs=[...new Set(rows.map(r=>r.tab))];select.innerHTML='<option value="">タブを選択</option>'+tabs.map(t=>`<option value="${esc(t)}">${esc(t)}${hiddenTabs.has(t)?'（非表示）':''}</option>`).join('');select.value=tabs.includes(selected)?selected:'';const tab=select.value;const count=rows.filter(r=>r.tab===tab).length;$('tabCount').textContent=tab?`${count} 件の発言・${hiddenTabs.has(tab)?'非表示中':'表示中'}`:'タブを選んでください';$('toggleTab').textContent=tab&&hiddenTabs.has(tab)?'再表示する':'非表示にする';$('toggleTab').disabled=!tab;$('deleteTab').disabled=!tab}
$('manageTab').onchange=refreshTabManager;
$('toggleTab').onclick=()=>{const t=$('manageTab').value;if(!t)return;snapshot();if(hiddenTabs.has(t))hiddenTabs.delete(t);else hiddenTabs.add(t);page=0;render()};
$('deleteTab').onclick=()=>{const t=$('manageTab').value;if(!t)return;const count=rows.filter(r=>r.tab===t).length;if(!confirm(`「${t}」の発言 ${count} 件をすべて削除します。元に戻す機能はありますが、保存後は復元できません。続けますか？`))return;snapshot();rows=rows.filter(r=>r.tab!==t);hiddenTabs.delete(t);render()};
function syncDesign(){for(const k of ['theme','layout','bgColor','fgColor','panelColor','textColorMode','pageTitle','exportName','font','fontSize','lineHeight','spacing','accentColor'])$(k).value=design[k]??'';for(const k of ['showHeading','showTabs','showIndex'])$(k).checked=design[k]!==false} 
for(const k of ['pageTitle','exportName','font','fontSize','lineHeight','spacing','accentColor'])$(k).addEventListener('input',()=>{design[k]=$(k).value;document.querySelectorAll('.item').forEach(card=>{card.style.setProperty('--card-font-size',(Number(design.fontSize)||16)+'px');card.style.setProperty('--card-line-height',String(Number(design.lineHeight)||1.9));card.style.setProperty('--card-spacing',(Number(design.spacing)||12)+'px');card.style.setProperty('--card-font-family',design.font==='sans'?'sans-serif':design.font==='mono'?'monospace':'serif')})});
for(const k of ['showHeading','showTabs','showIndex'])$(k).addEventListener('change',()=>{design[k]=$(k).checked;scheduleLivePreview()});
function outname(ext){return (String(design.exportName||design.pageTitle||'session-log').replace(/\.(html?|txt|json)$/i,'').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').trim()||'session-log')+'.'+ext}
$('theme').onchange=()=>{design.theme=$('theme').value;if(presets[design.theme]){[design.bgColor,design.fgColor,design.panelColor]=presets[design.theme]}syncDesign();scheduleLivePreview()};
$('layout').onchange=()=>{design.layout=$('layout').value;scheduleLivePreview()};$('textColorMode').onchange=()=>{design.textColorMode=$('textColorMode').value;render()};for(const id of ['bgColor','fgColor','panelColor'])$(id).oninput=()=>{design[id]=$(id).value;design.theme='custom';$('theme').value='custom';scheduleLivePreview()};
$('preview').onclick=()=>{const url=URL.createObjectURL(new Blob([htmlOut()],{type:'text/html;charset=utf-8'}));const w=window.open(url,'_blank');if(!w)alert('ポップアップがブロックされました。Chromeで許可してください。');setTimeout(()=>URL.revokeObjectURL(url),60000)};
 $('save').onclick=()=>download('\ufeff'+htmlOut(),outname('html'),'text/html;charset=utf-8');$('txt').onclick=()=>download(rows.filter(r=>!hiddenTabs.has(r.tab)).map(r=>`[${r.tab}] ${r.name}：${r.text}`).join('\n\n'),outname('txt'),'text/plain;charset=utf-8');$('project').onclick=()=>download(JSON.stringify({format:'ccfolia-log-editor-v1.4',rows,original,hiddenTabs:[...hiddenTabs],design,pageTitle:design.pageTitle,exportName:design.exportName},null,2),outname('json'),'application/json');
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
})();