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
    return { [prefix + item.id]: { revision: crypto.randomUUID(), removed: action === "remove", item } };
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
          body: JSON.stringify({ item, removed: change.removed, snapshot })
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
    } catch (error) { console.debug("HiBulb sync will retry", error.message); }
    finally { running = false; }
  }
  setInterval(flush, 30000);
  schedule();
  return { stage, schedule };
})();
