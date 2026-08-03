(() => {
  const DEFAULT_ENABLED = false;
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const object = (value) => value && typeof value === "object" ? value : {};

  function normalizeRules(raw) {
    const rules = object(raw);
    return {
      page: { ...object(rules.page) },
      path: { ...object(rules.path) },
      domain: { ...object(rules.domain) }
    };
  }

  function normalizePrefs(raw = {}) {
    const prefs = object(raw);
    return {
      ...prefs,
      defaultEnabled: typeof prefs.defaultEnabled === "boolean" ? prefs.defaultEnabled : DEFAULT_ENABLED,
      disabledPages: { ...object(prefs.disabledPages) },
      scopeRules: normalizeRules(prefs.scopeRules)
    };
  }

  function cleanPage(url = "", base = globalThis.location?.href) {
    try {
      const value = new URL(url, base);
      value.hash = "";
      return /^(https?:|file:)$/.test(value.protocol) ? value.href : "";
    } catch {
      return String(url).split("#")[0];
    }
  }

  function asURL(url) {
    try { return new URL(url, globalThis.location?.href); }
    catch { return null; }
  }

  function domainKey(url) {
    const value = asURL(url);
    if (!value) return "";
    return value.protocol === "file:" ? "file:" : value.origin;
  }

  function normalizedPath(path = "/") {
    const value = String(path || "/").replace(/\/+$/, "");
    return value || "/";
  }

  function pathKey(url) {
    const value = asURL(url);
    const domain = domainKey(url);
    return value && domain ? `${domain}${normalizedPath(value.pathname)}` : "";
  }

  function scopeKey(scope, url) {
    if (scope === "domain") return domainKey(url);
    if (scope === "path") return pathKey(url);
    return cleanPage(url);
  }

  function pathMatches(url, key) {
    const value = asURL(url);
    const root = asURL(key);
    if (!value || !root || domainKey(value.href) !== domainKey(root.href)) return false;
    const path = normalizedPath(value.pathname);
    const prefix = normalizedPath(root.pathname);
    return path === prefix || prefix === "/" || path.startsWith(`${prefix}/`);
  }

  function pathDepth(key) {
    const value = asURL(key);
    return value ? normalizedPath(value.pathname).length : 0;
  }

  function resolve(rawPrefs, url) {
    const prefs = normalizePrefs(rawPrefs);
    const { page, path, domain } = prefs.scopeRules;
    const pageKeyValue = scopeKey("page", url);
    if (pageKeyValue && own(page, pageKeyValue)) return { enabled: page[pageKeyValue] === true, scope: "page", key: pageKeyValue };
    if (pageKeyValue && own(prefs.disabledPages, pageKeyValue)) return { enabled: prefs.disabledPages[pageKeyValue] !== true, scope: "page", key: pageKeyValue };
    const paths = Object.entries(path)
      .filter(([key]) => pathMatches(url, key))
      .sort((a, b) => pathDepth(b[0]) - pathDepth(a[0]));
    if (paths[0]) return { enabled: paths[0][1] === true, scope: "path", key: paths[0][0] };
    const domainKeyValue = scopeKey("domain", url);
    if (domainKeyValue && own(domain, domainKeyValue)) return { enabled: domain[domainKeyValue] === true, scope: "domain", key: domainKeyValue };
    return { enabled: prefs.defaultEnabled === true, scope: "default", key: "" };
  }

  function setScope(rawPrefs, scope, url, enabled) {
    const prefs = normalizePrefs(rawPrefs);
    const key = scopeKey(scope, url);
    if (!key || !prefs.scopeRules[scope]) return prefs;
    const scopeRules = normalizeRules(prefs.scopeRules);
    scopeRules[scope][key] = enabled === true;
    const next = { ...prefs, scopeRules };
    if (scope === "page") next.disabledPages = { ...prefs.disabledPages, [key]: enabled !== true };
    return next;
  }

  globalThis.PastelPenScope = Object.freeze({
    DEFAULT_ENABLED,
    cleanPage,
    normalizePrefs,
    pageEnabled: (prefs, url) => resolve(prefs, url).enabled,
    scopeValue: (prefs, scope, url) => {
      const rules = normalizePrefs(prefs).scopeRules[scope] || {};
      const key = scopeKey(scope, url);
      return own(rules, key) ? rules[key] === true : resolve(prefs, url).enabled;
    },
    resolve,
    setScope,
    scopeKey,
    domainKey,
    pathKey
  });
})();
