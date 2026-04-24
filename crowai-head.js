(function (window, document) {
  const CROW_AI = "crowai";
  const DEBUG_PREFIX = "[CROWAI-HEAD]";
  const _t0 = performance.now();
  const _ms = () => (performance.now() - _t0).toFixed(1);
  const log = (...args) => {
    try {
      console.log(DEBUG_PREFIX, "+" + _ms() + "ms", ...args);
    } catch {}
  };
  const logErr = (...args) => {
    try {
      console.error(DEBUG_PREFIX, "+" + _ms() + "ms", ...args);
    } catch {}
  };
  const logTime = (label, fn) => {
    const start = performance.now();
    const result = fn();
    log(label, "took", (performance.now() - start).toFixed(1) + "ms");
    return result;
  };
  log("script start", "url:", window.location.href, "readyState:", document.readyState);
  if (window[CROW_AI + "_loaded"]) {
    log("guard: already loaded, exiting");
    return;
  }
  log("guard: first load, continuing");
  window[CROW_AI + "_loaded"] = 1;

  const ca = (window[CROW_AI] =
    window[CROW_AI] ||
    function () {
      (ca.q = ca.q || []).push(arguments);
    });

  const VERSION = "1.3";
  const TENANT_ID = "89U88kLHvazB2WkCnXY8";
  const LOADING_TIMEOUT = 3000;
  const CACHE_FOR_SESSION = true;
  const CODE_CACHE_TTL = 15000;
  const MAX_CACHED_URLS = 50;
  const CDN_BASE = "https://127.0.0.1:8787";
  const COOKIE_UID = CROW_AI + "uid";
  const COOKIE_NV = CROW_AI + "nv";
  const COOKIE_PV = CROW_AI + "pv";
  const VARIANT_CACHE_KEY = CROW_AI + "vc";
  const PAGE_COUNT_KEY = CROW_AI + "pc";
  const SCRIPT = "script";
  const AF_ID = CROW_AI + "af";
  const VS_ID = CROW_AI + "vs";
  const ANTI_FLICKER_STYLE =
    "html{opacity:0!important;visibility:hidden!important;transition:none!important}";

  const loc = window.location;
  const enc = encodeURIComponent;
  const getById = (id) => document.getElementById(id);

  let currentUrl = loc.href;
  let baseUrl = loc.origin + loc.pathname;
  const isDisabled = () => ~loc.href.indexOf(CROW_AI + "_dis");
  const urlParam = new URLSearchParams(loc.search).get("crowai");

  let isLoaded = 0;
  let loadingTimer = null;
  let isFirstFetch = true;

  ca.T = TENANT_ID;
  ca.V = VERSION;
  ca.AF = ANTI_FLICKER_STYLE;

  const getCookie = (name) => {
    try {
      const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
      return match ? match[2] : "";
    } catch {
      return "";
    }
  };

  const setCookie = (name, value, days) => {
    try {
      const expires = days ? ";expires=" + new Date(Date.now() + days * 864e5).toUTCString() : "";
      document.cookie = name + "=" + value + expires + ";path=/;SameSite=Lax";
    } catch {}
  };

  const isPreviewUrl = urlParam && urlParam.startsWith("crowaipv_");
  log("preview url check", "isPreviewUrl:", !!isPreviewUrl, "urlParam:", urlParam);
  let previewData = "";
  try {
    if (isPreviewUrl) sessionStorage.setItem(COOKIE_PV, urlParam);
    previewData = isPreviewUrl ? urlParam : sessionStorage.getItem(COOKIE_PV) || "";
    log(
      "preview data resolved",
      "previewData:",
      previewData ? previewData.slice(0, 40) + "..." : "(none)"
    );
  } catch (e) {
    logErr("sessionStorage access failed", e);
  }
  const isPreviewMode = !!previewData;
  log(
    "preview mode detection",
    "isPreviewMode:",
    isPreviewMode,
    "previewData:",
    previewData ? previewData.slice(0, 40) + "..." : "(none)"
  );
  log(
    "isDisabled check",
    "disabled:",
    !!isDisabled(),
    "href contains crowai_dis:",
    ~loc.href.indexOf(CROW_AI + "_dis") ? true : false
  );

  const getStorageItem = (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return window[key];
    }
  };

  const setStorageItem = (key, data) => {
    const value = JSON.stringify(data);
    try {
      localStorage.setItem(key, value);
    } catch {
      window[key] = value;
    }
  };

  const getCache = (key) => {
    try {
      return isPreviewMode ? null : JSON.parse(getStorageItem(key) ?? "null");
    } catch {
      return null;
    }
  };

  const trackError = (code) => ca("event", "ce", { et: code });
  const createElement = (tag) => document.createElement(tag);
  const appendToHead = (el) => document.head?.appendChild(el);

  const finishLoading = (isError) => {
    if (isLoaded++) {
      log("finishLoading skipped: already loaded");
      return;
    }
    log(
      "finishLoading called",
      "isError:",
      !!isError,
      "total time from script start:",
      _ms() + "ms"
    );
    clearTimeout(loadingTimer);
    const af = getById(AF_ID);
    if (af) {
      log("clearing anti-flicker style content");
      af.textContent = "";
    }
    if (isError) {
      log("tracking timeout error (to)");
      trackError("to");
    }
  };

  const applyVariant = (code) => {
    const codeLen = code ? code.length : 0;
    log(
      "applyVariant called",
      "code bytes:",
      codeLen,
      "deferApply:",
      !!window.CROWAI_DEFER_APPLY,
      "ready:",
      !!window._crowai_readyToApply
    );
    if (window.CROWAI_DEFER_APPLY && !window._crowai_readyToApply) {
      log("applyVariant: CROWAI_DEFER_APPLY mode, stashing code for later");
      window._crowai_pendingCode = code;
      return;
    }
    if (!code) {
      log("applyVariant: no code to inject");
      return finishLoading();
    }
    const old = getById(VS_ID);
    if (old) {
      log("removing previous variant script before re-injection");
      old.remove();
    }
    log("injecting variant script into head");
    const s = createElement(SCRIPT);
    s.id = VS_ID;
    s.textContent = code;
    appendToHead(s);
    finishLoading();
  };

  window[CROW_AI + "_applied"] = () => {
    log("crowai_applied called", "has pending code:", !!window._crowai_pendingCode);
    window._crowai_readyToApply = true;
    const pending = window._crowai_pendingCode;
    if (pending) {
      window._crowai_pendingCode = null;
      applyVariant(pending);
    }
  };

  const handleVariantAssignment = () => {
    log("handleVariantAssignment: start");
    const vc = getCache(VARIANT_CACHE_KEY) || {};
    const cachedAssignments = vc.assignments || {};
    const cacheAge = vc.ts ? Date.now() - vc.ts : null;
    log(
      "variant cache read",
      "hit:",
      !!vc.ts,
      "assignments count:",
      Object.keys(cachedAssignments).length,
      "age ms:",
      cacheAge
    );

    if (CACHE_FOR_SESSION && vc.urls) {
      const urlEntry = vc.urls[currentUrl] || vc.urls[baseUrl];
      log(
        "CACHE_FOR_SESSION: checking url cache",
        "urls count:",
        Object.keys(vc.urls).length,
        "entry found:",
        !!urlEntry
      );
      if (urlEntry && urlEntry.c && Date.now() - (urlEntry.ts || 0) < CODE_CACHE_TTL) {
        log(
          "CACHE_FOR_SESSION: cache HIT, applying cached variant",
          "code bytes:",
          urlEntry.c.length,
          "age ms:",
          Date.now() - (urlEntry.ts || 0)
        );
        if (urlEntry.r) {
          try {
            window.location.replace(urlEntry.r);
          } catch {
            window.location.href = urlEntry.r;
          }
          return;
        }
        return applyVariant(urlEntry.c);
      }
    }

    const fetchStart = performance.now();
    log("setting up crowai_r callback, awaiting worker response");

    window[CROW_AI + "_r"] = (d) => {
      const fetchDuration = (performance.now() - fetchStart).toFixed(1);
      log(
        "crowai_r callback received",
        "fetch duration:",
        fetchDuration + "ms",
        "has tests:",
        d && d.t ? Object.keys(d.t).length : 0,
        "has code length:",
        d && d.c ? d.c.length : 0,
        "has error:",
        !!(d && d.e),
        "response url:",
        d && d.url ? d.url : "(none)"
      );
      try {
        if (d.url && d.url !== loc.href) {
          log(
            "url match guard: STALE — response url does not match current",
            "response:",
            d.url,
            "current:",
            loc.href
          );
          return;
        }
        log("url match guard: matches (or no url provided)");
        if (d.e) {
          log("worker error response detected, errCode:", d.e);
          trackError("we");
          return finishLoading();
        }

        if (d.u && !getCookie(COOKIE_UID)) {
          log("setting UID cookie from worker response", "uid:", d.u);
          setCookie(COOKIE_UID, d.u, 100);
          setCookie(COOKIE_NV, "1", 0);
        } else {
          log(
            "uid already present or not provided",
            "has-existing:",
            !!getCookie(COOKIE_UID),
            "provided:",
            !!d.u
          );
        }

        if (d.r) {
          log("Split URL redirect", { url: d.r });
          try {
            window.location.replace(d.r);
          } catch {
            window.location.href = d.r;
          }
          return;
        }

        if (!d.t || Object.keys(d.t).length === 0) {
          log("no tests matched for url");
          return finishLoading();
        }

        if (!isPreviewMode) {
          const now = Date.now();
          const cache = getCache(VARIANT_CACHE_KEY) || {};
          cache.assignments = { ...cache.assignments, ...d.t };
          cache.ts = now;
          log(
            "variant cache write",
            "assignments count:",
            Object.keys(d.t).length,
            "CACHE_FOR_SESSION:",
            CACHE_FOR_SESSION
          );
          if (CACHE_FOR_SESSION) {
            const urls = cache.urls || {};
            urls[d.iq ? baseUrl : currentUrl] = { c: d.c, ts: now };
            Object.keys(urls).forEach((u) => {
              if (now - (urls[u].ts || 0) > CODE_CACHE_TTL) delete urls[u];
            });
            const keys = Object.keys(urls).sort((a, b) => (urls[b].ts || 0) - (urls[a].ts || 0));
            const kept = {};
            keys.slice(0, MAX_CACHED_URLS).forEach((k) => (kept[k] = urls[k]));
            cache.urls = kept;
            log("CACHE_FOR_SESSION: urls map updated", "urls count:", Object.keys(kept).length);
          }
          setStorageItem(VARIANT_CACHE_KEY, cache);
        } else {
          log("preview mode: skipping variant cache write");
        }

        if (isLoaded) {
          log("finishLoading already fired, skipping applyVariant");
          return;
        }
        log("applying variant code", "bytes:", d.c ? d.c.length : 0);
        applyVariant(d.c);
      } catch (err) {
        logErr("error in crowai_r callback", err);
        finishLoading();
      }
    };

    const caParam = Object.entries(cachedAssignments)
      .map((e) => enc(e[0]) + ":" + enc(e[1]))
      .join(",");
    log(
      "ca= param built",
      "testIds count:",
      Object.keys(cachedAssignments).length,
      "caParam length:",
      caParam.length
    );

    const s = createElement(SCRIPT);
    s.async = 1;
    s.src =
      CDN_BASE +
      "/js/test/variation?" +
      (caParam ? "ca=" + caParam + "&" : "") +
      CROW_AI +
      "=" +
      (isPreviewMode
        ? previewData + "_" + enc(currentUrl)
        : TENANT_ID +
          "_" +
          window[PAGE_COUNT_KEY] +
          "_" +
          (getCookie(COOKIE_UID) || "") +
          "_" +
          (getCookie(COOKIE_NV) ? "1" : "0") +
          "_" +
          enc(currentUrl)) +
      "&V=" +
      VERSION +
      "&sc=" +
      enc(document.cookie);
    s.onerror = ((failedUrl) => (err) => {
      logErr("variant script fetch error (vne)", err);
      trackError("vne");
      if (failedUrl !== currentUrl) return;
      finishLoading();
    })(currentUrl);
    log(
      "CDN URL constructed",
      "length:",
      s.src.length,
      "query string starts:",
      s.src.indexOf("?") > -1
        ? s.src.slice(s.src.indexOf("?"), s.src.indexOf("?") + 80)
        : "(none)"
    );
    appendToHead(s);
    log("variant script tag appended to head, fetch started");
  };

  let fetchVariantCallCount = 0;
  const fetchVariant = () => {
    fetchVariantCallCount++;
    const prevUrl = currentUrl;
    if (fetchVariantCallCount > 1) {
      log(
        "SPA navigation detected: crowai_fetch called again",
        "callCount:",
        fetchVariantCallCount,
        "old url:",
        prevUrl,
        "new url:",
        loc.href
      );
    } else {
      log("fetchVariant: initial call");
    }
    if (isDisabled()) {
      log("fetchVariant: disabled, skipping");
      return;
    }
    currentUrl = loc.href;
    baseUrl = loc.origin + loc.pathname;
    isLoaded = 0;
    clearTimeout(loadingTimer);

    const uidCookie = getCookie(COOKIE_UID);
    const nvCookie = getCookie(COOKIE_NV);
    const pcCookie = getCookie(PAGE_COUNT_KEY);
    log(
      "cookies read",
      "UID:",
      uidCookie || "(none)",
      "NV:",
      nvCookie || "(none)",
      "PC:",
      pcCookie || "(none)"
    );

    let pc = parseInt(pcCookie || "0") + 1;
    setCookie(PAGE_COUNT_KEY, pc.toString(), 100);
    window[PAGE_COUNT_KEY] = pc;
    log("page count incremented", "new pc:", pc);

    const skipAf = !isFirstFetch && ca.SUBSEQUENT_AF !== true;
    isFirstFetch = false;

    if (skipAf) {
      log("anti-flicker skipped for SPA nav (SUBSEQUENT_AF not true)");
    } else {
      const existingAf = getById(AF_ID);
      if (!existingAf) {
        const afNode = createElement("style");
        afNode.id = AF_ID;
        afNode.textContent = ANTI_FLICKER_STYLE;
        appendToHead(afNode);
        const afGuard = () => {
          if (isLoaded) return;
          if (!getById(AF_ID)) {
            appendToHead(afNode);
            log("anti-flicker re-attached — was wiped by hydration");
          }
          requestAnimationFrame(afGuard);
        };
        requestAnimationFrame(afGuard);
        log("anti-flicker style injected");
      } else {
        existingAf.textContent = ANTI_FLICKER_STYLE;
        log("anti-flicker re-activated for SPA nav");
      }
    }

    const timeoutMs = isPreviewMode ? 10000 : LOADING_TIMEOUT;
    log("loading timer armed", "timeoutMs:", timeoutMs, "isPreviewMode:", isPreviewMode);
    loadingTimer = setTimeout(() => {
      if (!isLoaded) {
        log("loading timeout fired — no response received in time");
        finishLoading(1);
      }
    }, timeoutMs);

    handleVariantAssignment();
  };

  window[CROW_AI + "_fetch"] = fetchVariant;

  const initialize = () => {
    log("initialize: start");

    const getVariantCleanups = () =>
      (window._crowaiVariantCleanups = window._crowaiVariantCleanups || []);

    const poll = (cb, delay) => {
      log("utils.poll invoked", "delay:", delay);
      const id = setInterval(cb, delay);
      const cancel = () => clearInterval(id);
      getVariantCleanups().push(cancel);
      return cancel;
    };

    const waitUntil = (fn) =>
      new Promise((resolve) => {
        let cancel;
        const check = () => {
          try {
            const result = fn();
            if (result) {
              cancel?.();
              resolve(result);
            }
          } catch {}
        };
        if (
          !(() => {
            try {
              return fn();
            } catch {
              return null;
            }
          })()
        ) {
          cancel = poll(check, 50);
        } else {
          resolve(fn());
        }
      });

    const waitForElement = (selector) => {
      log("utils.waitForElement invoked", "selector:", selector);
      return waitUntil(() => document.querySelector(selector));
    };

    const observeSelector = (selector, callback, options) => {
      log("utils.observeSelector invoked", "selector:", selector, "options:", options);
      const opts = options || {};
      let disconnected = false;
      let timeoutId;
      const tryCallback = (el) => {
        try {
          callback(el);
        } catch {}
      };
      const disconnect = () => {
        if (disconnected) return;
        disconnected = true;
        observer.disconnect();
        clearTimeout(timeoutId);
      };
      const observer = new MutationObserver(() => {
        document.querySelectorAll(selector).forEach((el) => {
          if (disconnected) return;
          tryCallback(el);
          if (opts.once) disconnect();
        });
      });
      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class"],
      });
      document.querySelectorAll(selector).forEach((el) => {
        if (disconnected) return;
        tryCallback(el);
        if (opts.once) disconnect();
      });
      if (opts.timeout != null) {
        timeoutId = setTimeout(() => {
          if (!disconnected) {
            disconnect();
            if (opts.onTimeout)
              try {
                opts.onTimeout();
              } catch {}
          }
        }, opts.timeout);
      }
      getVariantCleanups().push(disconnect);
      return disconnect;
    };

    const getState = () => {
      const vc = getCache(VARIANT_CACHE_KEY) || {};
      return { assignments: vc.assignments || {} };
    };
    const getVisitor = () => ({
      userId: getCookie(COOKIE_UID) || "",
    });

    const onCleanup = (fn) => {
      getVariantCleanups().push(fn);
      log("onCleanup registered", "total variant cleanups:", getVariantCleanups().length);
    };

    ca.utils = {
      poll,
      waitUntil,
      waitForElement,
      observeSelector,
      onCleanup,
      getState,
      getVisitor,
      getCookie,
      setCookie,
      getStorageItem,
      setStorageItem,
    };

    if (isDisabled()) {
      log("initialize: disabled, skipping fetch/library");
      return;
    }

    const script = createElement(SCRIPT);
    script.async = 1;
    script.src = CDN_BASE + "/js/library?V=" + VERSION;
    const eventScriptStart = performance.now();
    script.onload = () => {
      log(
        "event script loaded",
        "duration:",
        (performance.now() - eventScriptStart).toFixed(1) + "ms"
      );
    };
    script.onerror = (err) => {
      logErr("event script fetch error", err);
    };
    log("appending event script to head", "src:", script.src);
    appendToHead(script);

    log("calling fetchVariant for initial page");
    fetchVariant();
    log("initialize: complete");
  };

  initialize();
})(window, document);