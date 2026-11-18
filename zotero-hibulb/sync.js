// Loaded into the plugin bootstrap scope. All mutations use the personal library.
var FirefoxSync = (() => {
  const path = '/hibulb/sync', pref = 'extensions.hibulb.pair';
  const predicate = 'dc:relation';
  const recordURI = id => 'urn:hibulb:firefox:' + id;
  function canonical(url) {
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) throw Error('Invalid article URL');
    parsed.hash = '';
    for (const name of [...parsed.searchParams.keys()]) {
      if (/^(utm_.+|fbclid|gclid)$/i.test(name)) parsed.searchParams.delete(name);
    }
    return parsed.href;
  }
  async function linked(uri) {
    return (await Zotero.Relations.getByPredicateAndObject('item', predicate, uri))
      .find(i => i.libraryID === Zotero.Libraries.userLibraryID && !i.deleted);
  }
  function locate(html, item) {
    const win = Zotero.getMainWindow();
    const doc = new win.DOMParser().parseFromString(html, 'text/html');
    const scope = Cu.Sandbox(Services.scriptSecurityManager.getSystemPrincipal());
    Object.assign(scope,{document:doc,Node:win.Node,NodeFilter:win.NodeFilter,getComputedStyle:el=>el.style});
    Services.scriptloader.loadSubScript('resource://hibulb/anchors.js',scope);
    const anchors = scope.PastelAnchors, index = anchors.index();
    let hit = anchors.locate(item, index);
    if (!hit) {
      // Snapshot serialization can change whitespace in otherwise identical text.
      const compact = index.text.replace(/\s/g,''), needle = item.exact.replace(/\s/g,'');
      const at = compact.indexOf(needle);
      if (!needle || at === -1 || compact.indexOf(needle, at + 1) !== -1) return null;
      let count = 0, start, end;
      for (let i=0;i<index.text.length;i++) {
        if (/\s/.test(index.text[i])) continue;
        if (count === at) start=i;
        if (++count === at + needle.length) { end=i+1; break; }
      }
      hit={start,end};
    }
    const first=index.parts.find(p=>p.end>hit.start), last=index.parts.find(p=>p.end>=hit.end);
    if (!first || !last) return null;
    const range=doc.createRange();
    if (first.atomic) range.setStartBefore(first.node); else range.setStart(first.node,hit.start-first.start);
    if (last.atomic) range.setEndAfter(last.node); else range.setEnd(last.node,hit.end-last.start);
    let root=range.commonAncestorContainer;
    if (root.nodeType===3) root=root.parentElement;
    const parts=[];
    for (let el=root;el!==doc.body;el=el.parentElement) {
      if (el.id && doc.querySelectorAll('#'+win.CSS.escape(el.id)).length===1) {parts.unshift('#'+win.CSS.escape(el.id));break;}
      const index=[...el.parentElement.children].filter(s=>s.localName===el.localName).indexOf(el)+1;
      parts.unshift(win.CSS.escape(el.localName)+':nth-of-type('+index+')');
    }
    const prefix=doc.createRange(); prefix.selectNodeContents(root); prefix.setEnd(range.startContainer,range.startOffset);
    const start=prefix.toString().length,end=start+range.toString().length;
    const refined={type:'TextPositionSelector',start,end};
    const position=parts.length?{type:'CssSelector',value:parts.join(' > ')}:refined;
    if(parts.length && (start!==0||end!==root.textContent.length))position.refinedBy=refined;
    return {position,sortIndex:String(Math.min(9999999,hit.start)).padStart(7,'0')};
  }
  async function article(url) {
    const existing=await linked('urn:hibulb:page:'+url);
    if(existing && existing.isAttachment() && !Zotero.Items.get(existing.parentID)?.deleted)return {att:existing,parent:Zotero.Items.get(existing.parentID)};
    const search=new Zotero.Search();search.libraryID=Zotero.Libraries.userLibraryID;
    search.addCondition('url','is',url);
    let parent;
    for(const id of await search.search()){
      const obj=Zotero.Items.get(id);
      if(obj.deleted)continue;
      const p=obj.isRegularItem()?obj:obj.parentID&&Zotero.Items.get(obj.parentID);
      if(!p||p.deleted)continue;
      parent ||= p;
      const att=p.getAttachments().map(id=>Zotero.Items.get(id)).find(a=>a.attachmentContentType==='text/html' && a.getField('url') && canonical(a.getField('url'))===url);
      if(att)return {parent:p,att};
    }
    return {parent};
  }
  async function receive({item,removed,snapshot}) {
    if(!item||!/^[-_\w]{1,128}$/.test(item.id)||typeof item.exact!=='string'||!item.exact.trim()||
      typeof item.quote!=='string'||!/^#[0-9a-f]{6}$/i.test(item.color)||typeof (item.note??'')!=='string')return 400;
    const url=canonical(item.url), identity=recordURI(item.id);
    let annotation=await linked(identity);
    if(removed){if(annotation){annotation.deleted=true;await annotation.saveTx();}return 204;}
    let att=annotation && Zotero.Items.get(annotation.parentID);
    if(!annotation){
      let page=await article(url);att=page.att;
      let html;
      if(att)html=await Zotero.File.getContentsAsync(await att.getFilePathAsync());
      else if(snapshot===undefined)return 409;
      else if(snapshot===null){
        const {HiddenBrowser}=ChromeUtils.importESModule('chrome://zotero/content/HiddenBrowser.mjs');
        const b=new HiddenBrowser({docShell:{allowImages:true}});
        try{await b.load(url,{requireSuccessfulStatus:true});html=await b.snapshot();}finally{b.destroy();}
      } else if(typeof snapshot==='string')html=snapshot;
      else return 400;
      const located=locate(html,item);
      if(!located)return 422;
      const lib=Zotero.Libraries.userLibraryID;
      let col=Zotero.Collections.getByLibrary(lib).find(c=>!c.parentID&&c.name==='HiBulb · Firefox');
      if(!col){col=new Zotero.Collection();col.libraryID=lib;col.name='HiBulb · Firefox';await col.saveTx();}
      if(!page.parent){page.parent=new Zotero.Item('webpage');page.parent.libraryID=lib;page.parent.setField('title',item.title||url);page.parent.setField('url',url);}
      page.parent.addToCollection(col.id);await page.parent.saveTx();
      if(!att)att=await Zotero.Attachments.importFromSnapshotContent({url,title:'원문 스냅샷',parentItemID:page.parent.id,snapshotContent:html});
      if(att.addRelation(predicate,'urn:hibulb:page:'+url))await att.saveTx();
      annotation=await Zotero.Annotations.saveFromJSON(att,{key:Zotero.DataObjectUtilities.generateKey(),type:'highlight',
        text:item.quote,comment:item.note||'',color:item.color,pageLabel:'',...located,relations:{[predicate]:identity}});
    }else{
      annotation.annotationComment=item.note||'';annotation.annotationColor=item.color;await annotation.saveTx();
    }
    const layout='extensions.hibulb.layout.'+att.libraryID+'.'+att.key+'.'+annotation.key;
    const previous=JSON.parse(Zotero.Prefs.get(layout,true)||'{}'),p=item.placement;
    Zotero.Prefs.set(layout,JSON.stringify({...previous,open:!item.folded,...(p&&[p.x,p.y,p.w].every(Number.isFinite)?{x:p.x,dy:p.y,scale:p.w/300}:{})}),true);
    for(const [reader,session] of sessions)if(reader.itemID===att.id)session?.schedule();
    return 204;
  }
  let pending=Promise.resolve();
  function start() {
    if(!Zotero.Prefs.get(pref,true))Zotero.Prefs.set(pref,Services.uuid.generateUUID().toString().slice(1,-1),true);
    class Endpoint {
      supportedMethods=['POST'];supportedDataTypes=['application/json'];
      init({headers,data}){
        if(headers['x-hibulb-pair']!==Zotero.Prefs.get(pref,true))return 403;
        const result=pending.then(()=>receive(data));
        pending=result.catch(e=>Zotero.logError(e));return result;
      }
    }
    Zotero.Server.Endpoints[path]=Endpoint;
  }
  return {start,stop(){delete Zotero.Server.Endpoints[path];return pending;}};
})();
