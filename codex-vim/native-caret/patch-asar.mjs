import { appendFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2];
if (!root) throw Error("usage: node patch-asar.mjs EXTRACTED_ASAR");

const build = join(root, ".vite", "build");
const mains = readdirSync(build).filter(name => /^main-.*\.js$/.test(name));
if (mains.length !== 1) throw Error(`expected one main bundle, found: ${mains.join(", ")}`);

const marker = "aislop-native-vim-caret-v5";
const css = `
:root:not([data-aislop-vim-mode]) :is(textarea,[contenteditable]:not([contenteditable="false" i]),.ProseMirror),
:root[data-aislop-vim-mode="insert"] :is(textarea,[contenteditable]:not([contenteditable="false" i]),.ProseMirror) {
  caret-shape: bar !important;
  caret-color: currentColor !important;
  caret-animation: auto !important;
}

:root[data-aislop-vim-mode="normal"] :is(textarea,[contenteditable]:not([contenteditable="false" i]),.ProseMirror) {
  caret-shape: block !important;
  caret-color: currentColor !important;
  caret-color: color-mix(in srgb, currentColor 42%, transparent) !important;
  caret-animation: manual !important;
}

:root[data-aislop-vim-mode="visual"] :is(textarea,[contenteditable]:not([contenteditable="false" i]),.ProseMirror) {
  caret-shape: block !important;
  caret-color: currentColor !important;
  caret-color: color-mix(in srgb, currentColor 32%, transparent) !important;
  caret-animation: manual !important;
}

:root[data-aislop-vim-mode="visual"] :is(textarea,[contenteditable]:not([contenteditable="false" i]),.ProseMirror)::selection {
  color: inherit;
  background: color-mix(in srgb, currentColor 24%, transparent);
}
`.trim();
const encodedCSS = Buffer.from(css).toString("base64");
const patch = `
/* ${marker} */
{
 const {app,BrowserWindow}=require("electron"),fs=require("node:fs"),path=require("node:path");
 const modeFile="/tmp/aislop-codex-vim-mode";
 let mode="insert";
 const log=(event,data={})=>{
   try{
     const file=path.join(app.getPath("logs"),"CodexVimCaret.log");
     fs.mkdirSync(path.dirname(file),{recursive:true});
     fs.appendFileSync(file,JSON.stringify({at:new Date().toISOString(),event,...data})+"\\n");
   }catch{}
 };
 const readMode=()=>{
   try{
     const value=fs.readFileSync(modeFile,"utf8").trim();
     return ["insert","normal","visual"].includes(value)?value:"insert";
   }catch{return "insert";}
 };
 const publish=window=>{
   if(window.isDestroyed()||window.webContents.isDestroyed())return;
   window.webContents.executeJavaScript(
     \`document.documentElement.dataset.aislopVimMode=\${JSON.stringify(mode)}\`
   ).catch(error=>log("publish-failed",{message:String(error)}));
 };
 const sync=()=>{
   const next=readMode();
   if(next===mode)return;
   mode=next;
   BrowserWindow.getAllWindows().forEach(publish);
   log("mode",{mode});
 };
 const install=window=>{
   if(window.__aislopNativeCaret)return;
   window.__aislopNativeCaret=true;
   const apply=async()=>{
     try{
       const report=await window.webContents.executeJavaScript(\`(()=>{
         let style=document.getElementById("aislop-native-vim-caret");
         if(!style){
           style=document.createElement("style");
           style.id="aislop-native-vim-caret";
           style.textContent=atob(${JSON.stringify(encodedCSS)});
           document.documentElement.append(style);
         }
         document.documentElement.dataset.aislopVimMode=\${JSON.stringify(mode)};
         const editors=[...document.querySelectorAll("textarea,[contenteditable],.ProseMirror")];
         return {
           mode:document.documentElement.dataset.aislopVimMode,
           supportsBlock:CSS.supports("caret-shape","block"),
           supportsAnimation:CSS.supports("caret-animation","manual"),
           editors:editors.map(el=>({
             tag:el.tagName,
             className:String(el.className).slice(0,160),
             contentEditable:el.getAttribute("contenteditable"),
             role:el.getAttribute("role"),
             caretShape:getComputedStyle(el).caretShape,
             caretColor:getComputedStyle(el).caretColor
           }))
         };
       })()\`);
       log("applied",report);
     }catch(error){log("failed",{message:String(error)});}
   };
   window.webContents.on("dom-ready",apply);
   if(!window.webContents.isLoadingMainFrame())apply();
 };
 mode=readMode();
 BrowserWindow.getAllWindows().forEach(install);
 app.on("browser-window-created",(_event,window)=>install(window));
 fs.watchFile(modeFile,{interval:50},sync);
 app.once("will-quit",()=>fs.unwatchFile(modeFile,sync));
 log("loaded",{mode,windows:BrowserWindow.getAllWindows().length});
}
`;

appendFileSync(join(build, mains[0]), patch);
console.log(`patched ${mains[0]} with ${marker}`);
