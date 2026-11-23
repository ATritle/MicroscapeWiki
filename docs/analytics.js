export const measurementId = "G-90EN0H2GM4";
const hosts = new Set(["microscapewiki.com", "www.microscapewiki.com"]);

function cleanPageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && hosts.has(url.hostname) ? "https://microscapewiki.com" + url.pathname : null;
  } catch { return null; }
}

export function createPageTracker({browser = globalThis.window, doc = globalThis.document,
  navigator = globalThis.navigator, prerender = globalThis.__WIKI_PRERENDER__} = {}) {
  let initialized = false, previousPage = "";
  return function trackPageView(meta) {
    if (prerender || !browser || !doc || !hosts.has(browser.location.hostname)
      || navigator?.globalPrivacyControl === true || navigator?.doNotTrack === "1") return false;
    const page = cleanPageUrl(meta.canonical);
    if (!page || page === previousPage) return false;
    let referrer = previousPage;
    if (!referrer && doc.referrer) {
      try { const url = new URL(doc.referrer); if (["https:", "http:"].includes(url.protocol)) referrer = url.origin + "/"; } catch {}
    }
    browser.dataLayer ||= [];
    browser.gtag ||= function() { browser.dataLayer.push(arguments); };
    const context = {page_location:page, page_referrer:referrer, page_title:meta.title};
    browser.gtag("set", context);
    if (!initialized) {
      browser.gtag("js", new Date());
      browser.gtag("config", measurementId, {send_page_view:false, allow_google_signals:false,
        allow_ad_personalization_signals:false});
      const script = doc.createElement("script");
      script.async = true;
      script.src = "https://www.googletagmanager.com/gtag/js?id=" + measurementId;
      doc.head.append(script);
      initialized = true;
    }
    browser.gtag("event", "page_view", {...context, send_to:measurementId});
    previousPage = page;
    return true;
  };
}

export const trackPageView = createPageTracker();
