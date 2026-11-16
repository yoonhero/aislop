var sessions = new Map();
var resource;
var active = false;
const pluginID = 'hibulb@aislop.local';
function install() {}
function uninstall() {}

async function startup({ rootURI }) {
  await Zotero.initializationPromise;
  active = true;
  resource = Services.io.getProtocolHandler('resource').QueryInterface(Ci.nsIResProtocolHandler);
  resource.setSubstitution('hibulb', Services.io.newURI(rootURI));
  Zotero.Reader.registerEventListener('renderToolbar', mount, pluginID);
  Zotero.Reader.registerEventListener('renderSidebarAnnotationHeader', sidebar, pluginID);
  for (const reader of Zotero.Reader._readers) mount({ reader });
}

async function mount({ reader }) {
  if (sessions.has(reader)) return;
  sessions.set(reader, null);
  try {
    await reader._initPromise;
    if (!active || !reader._iframeWindow) { sessions.delete(reader); return; }
    const item = Zotero.Items.get(reader.itemID);
    const prefix = 'extensions.hibulb.layout.' + item.libraryID + '.' + item.key + '.';
    const host = {
      css: (await Zotero.HTTP.request('GET', 'resource://hibulb/reader.css')).responseText,
      getLayout(id) {
        try { return JSON.parse(Zotero.Prefs.get(prefix + id, true) || '{}'); }
        catch { return {}; }
      },
      setLayout(id, changes) {
        Zotero.Prefs.set(prefix + id, JSON.stringify({ ...this.getLayout(id), ...changes }), true);
        for (const [other, session] of sessions) {
          if (other.itemID === reader.itemID) session?.schedule();
        }
      },
      async render(source) {
        const markdown = ChromeUtils.importESModule('resource://hibulb/vendor/markdown.mjs');
        const { html, equations } = markdown.renderMarkdown(source);
        if (!equations.length) return html;
        const math = ChromeUtils.importESModule('resource://hibulb/vendor/math.mjs');
        return html.replace(/<span data-pastel-equation="(\d+)"><\/span>/g,
          (_, index) => math.renderMath(equations[Number(index)]));
      },
      error(error) { Zotero.logError(error); },
      closed() { sessions.delete(reader); }
    };
    const content = reader._iframeWindow.wrappedJSObject;
    const source = (await Zotero.HTTP.request('GET', 'resource://hibulb/reader.js')).responseText;
    if (!active || !reader._iframeWindow) return;
    content.eval(source);
    const bridge = Cu.cloneInto({
      css: host.css,
      getLayout: id => Cu.cloneInto(host.getLayout(id), content),
      setLayout: (id, changes) => host.setLayout(id, changes),
      render: source => new content.Promise((resolve, reject) => {
        host.render(source).then(resolve, error => reject(String(error)));
      }),
      error: error => Zotero.logError(String(error)),
      closed: host.closed
    }, content, { cloneFunctions: true });
    const session = new content.HiBulbReader(reader._internalReader, bridge);
    sessions.set(reader, session);
  } catch (error) {
    sessions.delete(reader);
    Zotero.logError(error);
  }
}

function sidebar({ reader, doc, params, append }) {
  const session = sessions.get(reader);
  if (!session || !params.annotation) return;
  const button = doc.createElement('button');
  button.className = 'hibulb-sidebar-note';
  button.title = button.ariaLabel = 'Open margin note';
  button.textContent = '▤';
  button.onclick = event => { event.stopPropagation(); session.openNote(params.annotation.id, true); };
  append(button);
}

async function shutdown() {
  active = false;
  Zotero.Reader.unregisterEventListener('renderToolbar', mount);
  Zotero.Reader.unregisterEventListener('renderSidebarAnnotationHeader', sidebar);
  for (const session of sessions.values()) session?.destroy();
  sessions.clear();
  resource?.setSubstitution('hibulb', null);
}
