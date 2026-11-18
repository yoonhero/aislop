// Each pending record is written atomically with its Firefox notebook change.
const HiBulbSync = (() => {
  const prefix = "hibulb.pending.", pairing = "hibulb.pairing";
  let running = false, timer;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(flush, 700);
  }
  async function stage(action, item) {
    if (!item || !/^https?:/.test(item.url) || !["add", "note", "color", "placement", "fold", "remove"].includes(action)) return {};
    if (!(await browser.storage.local.get(pairing))[pairing]) return {};
    const key = prefix + item.id;
    const previous = (await browser.storage.local.get(key))[key];
    const fields = [...new Set([...(previous?.fields || []), action])];
    return { [key]: { revision: crypto.randomUUID(), removed: action === "remove", fields, item } };
  }
  async function flush() {
    if (running) return;
    running = true;
    try {
      const store = await browser.storage.local.get(null), token = store[pairing];
      if (!token) return;
      for (const [key, change] of Object.entries(store)) {
        if (!key.startsWith(prefix)) continue;
        try {
        const { context, path, notebookPlacement, ...item } = change.item;
        const send = async snapshot => fetch("http://127.0.0.1:23119/hibulb/sync", {
          method: "POST", credentials: "omit", redirect: "error", signal: AbortSignal.timeout(65000),
          headers: { "Content-Type": "application/json", "Zotero-Allowed-Request": "1", "X-HiBulb-Pair": token },
          body: JSON.stringify({ item, removed: change.removed, fields:change.fields, snapshot })
        });
        let response = await send();
        if (response.status === 409) {
          const tabs = await browser.tabs.query({});
          const tab = tabs.find(t => PastelPenScope.cleanPage(t.url) === item.url);
          if (tab) {
            await browser.tabs.executeScript(tab.id, {file:"vendor/snapshot.js"});
            const [html] = await browser.tabs.executeScript(tab.id, {code:
              '(async()=>{if(location.href.split("#")[0]!=='+JSON.stringify(item.url)+')return null;const page=await HiBulbSingleFile.getPageData({removeScripts:true,removeFrames:true,blockAudios:true,blockVideos:true,removeHiddenElements:false});return location.href.split("#")[0]==='+JSON.stringify(item.url)+'?page.content:null})()'
            });
            if (html) response = await send(html);
          } else response = await send(null); // Request Zotero's own web capture.
        }
        if (!response.ok) continue;
        // Serialize compare-and-remove with writes to avoid acknowledging a newer edit.
        const ack = writes.then(async () => {
          const latest = (await browser.storage.local.get(key))[key];
          if (latest?.revision === change.revision) await browser.storage.local.remove(key);
        });
        writes = ack.catch(console.warn);
        await ack;
        } catch (error) { console.debug("HiBulb will retry this annotation", error.message); if(error instanceof TypeError)break; }
      }
      await pull(token);
    } catch (error) { console.debug("HiBulb sync will retry", error.message); }
    finally { running = false; }
  }
  async function pull(token) {
    const {key,read}=PastelPen;
    const records=read((await browser.storage.local.get(key))[key]).items;
    const response=await fetch("http://127.0.0.1:23119/hibulb/sync",{
      method:"POST",credentials:"omit",redirect:"error",signal:AbortSignal.timeout(60000),
      headers:{"Content-Type":"application/json","Zotero-Allowed-Request":"1","X-HiBulb-Pair":token},
      body:JSON.stringify({action:"pull",known:records.map(i=>i.id)})
    });
    if(!response.ok)return;
    const updates=await response.json();
    const apply=writes.then(async()=>{
      const stored=await browser.storage.local.get([pairing,key,...updates.map(i=>prefix+i.id)]);
      if(stored[pairing]!==token)return;
      const data=read(stored[key]),local=new Map(data.items.map(i=>[i.id,i]));
      let changed=false;
      for(const update of updates){
        if(stored[prefix+update.id])continue;
        const item=local.get(update.id);
        if(!item){
          if(update.exact && update.url){data.items.unshift(update);local.set(update.id,update);changed=true;}
        }else if((item.note||"")!==update.note || item.color!==update.color){
          item.note=update.note;item.color=update.color;changed=true;
        }
      }
      if(changed)await browser.storage.local.set({[key]:data});
    });
    writes=apply.catch(console.warn);
    await apply;
  }
  setInterval(flush, 30000);
  schedule();
  return { stage, schedule };
})();
