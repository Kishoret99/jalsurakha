(function (window, document) {
  const CROW_AI = "crowai";
  if (window[CROW_AI + "_loaded"]) return;
  window[CROW_AI + "_loaded"] = 1;

  window[CROW_AI] =
    window[CROW_AI] ||
    function () {
      (window[CROW_AI].q = window[CROW_AI].q || []).push(arguments);
    };

  const VERSION = "1.2";
  const TENANT_ID = "89U88kLHvazB2WkCnXY8";
  const LOADING_TIMEOUT = 3000;
  const CACHE_FOR_SESSION = false;
  const CDN_BASE = "https://127.0.0.1:8787";

  const DEBUG_PREFIX = "[CROWAI-HEADSCRIPT]";
  const log = (...args) => console.log(DEBUG_PREFIX, ...args);
  const logError = (...args) => console.error(DEBUG_PREFIX, ...args);
  const logWarn = (...args) => console.warn(DEBUG_PREFIX, ...args);

  const perf = {
    scriptStart: performance.now(),
    antiFlickerApplied: null,
    initializeStart: null,
    fetchStart: null,
    fetchEnd: null,
    cacheHit: false,
    cacheType: null,
    domReadyWait: false,
    domReadyStart: null,
    domReadyEnd: null,
    variantApplied: null,
    antiFlickerRemoved: null,
    finishTime: null,
    timedOut: false,
    lcp: null,
    lcpElement: null,
    fcp: null,
    fp: null,
    cls: null,
    inp: null,
    requests: [],
    eventScriptLoad: null,
    navigationTiming: null,
  };

  const trackLCP = () => {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          perf.lcp = lastEntry.startTime;
          perf.lcpElement = lastEntry.element?.tagName || "unknown";
          log("LCP recorded", {
            time: lastEntry.startTime.toFixed(2) + "ms",
            element: perf.lcpElement,
            size: lastEntry.size,
            url: lastEntry.url || "N/A",
          });
        }
      });
      lcpObserver.observe({
        type: "largest-contentful-paint",
        buffered: true,
      });
    } catch (e) {
      logWarn("LCP observer not supported", e);
    }
  };

  const trackResourceTiming = () => {
    try {
      const safeNum = (val) => (isNaN(val) || val < 0 ? 0 : val);
      const resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const isCrowaiRequest = entry.name.includes(CDN_BASE + "/js/");
          if (isCrowaiRequest) {
            const isCached = entry.transferSize === 0;
            const dns = isCached ? 0 : safeNum(entry.domainLookupEnd - entry.domainLookupStart);
            const tcp = isCached ? 0 : safeNum(entry.connectEnd - entry.connectStart);
            const ttfb = isCached ? 0 : safeNum(entry.responseStart - entry.requestStart);
            const download = isCached ? 0 : safeNum(entry.responseEnd - entry.responseStart);
            perf.requests.push({
              name: entry.name.split("?")[0].split("/").pop() || entry.name,
              fullUrl: entry.name,
              duration: safeNum(entry.duration),
              transferSize: entry.transferSize || 0,
              startTime: entry.startTime,
              dns: dns,
              tcp: tcp,
              ttfb: ttfb,
              download: download,
              cached: isCached,
            });
          }
        });
      });
      resourceObserver.observe({ type: "resource", buffered: true });
    } catch (e) {
      logWarn("Resource timing observer not supported", e);
    }
  };

  const getNavigationTiming = () => {
    try {
      const nav = performance.getEntriesByType("navigation")[0];
      if (nav) {
        const safeNum = (val) => (isNaN(val) || val < 0 ? 0 : val);
        return {
          dns: safeNum(nav.domainLookupEnd - nav.domainLookupStart),
          tcp: safeNum(nav.connectEnd - nav.connectStart),
          ttfb: safeNum(nav.responseStart - nav.requestStart),
          domContentLoaded: safeNum(nav.domContentLoadedEventEnd),
          domComplete: safeNum(nav.domComplete),
          loadEvent: safeNum(nav.loadEventEnd),
        };
      }
    } catch (e) {
      logWarn("Navigation timing not available", e);
    }
    return null;
  };

  const trackPaintTiming = () => {
    try {
      const paintObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name === "first-paint") {
            perf.fp = entry.startTime;
            log("FP recorded", { time: entry.startTime.toFixed(2) + "ms" });
          } else if (entry.name === "first-contentful-paint") {
            perf.fcp = entry.startTime;
            log("FCP recorded", { time: entry.startTime.toFixed(2) + "ms" });
          }
        });
      });
      paintObserver.observe({ type: "paint", buffered: true });
    } catch (e) {
      logWarn("Paint timing observer not supported", e);
    }
  };

  const trackCLS = () => {
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            perf.cls = clsValue;
          }
        });
      });
      clsObserver.observe({ type: "layout-shift", buffered: true });
    } catch (e) {
      logWarn("CLS observer not supported", e);
    }
  };

  const trackINP = () => {
    try {
      let maxINP = 0;
      const inpObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.interactionId) {
            const duration = entry.duration;
            if (duration > maxINP) {
              maxINP = duration;
              perf.inp = duration;
              log("INP updated", { time: duration.toFixed(2) + "ms" });
            }
          }
        });
      });
      inpObserver.observe({
        type: "event",
        buffered: true,
        durationThreshold: 16,
      });
    } catch (e) {
      logWarn("INP observer not supported", e);
    }
  };

  trackLCP();
  trackPaintTiming();
  trackCLS();
  trackINP();
  trackResourceTiming();

  window[CROW_AI + "Perf"] = perf;

  const logPerfSummary = () => {
    const now = performance.now();
    perf.finishTime = now;
    perf.navigationTiming = getNavigationTiming();

    const total = (perf.finishTime - perf.scriptStart).toFixed(2) + "ms";
    const antiFlickerDuration =
      perf.antiFlickerRemoved && perf.antiFlickerApplied
        ? (perf.antiFlickerRemoved - perf.antiFlickerApplied).toFixed(2) + "ms"
        : "N/A";
    const fetchDuration =
      perf.fetchEnd && perf.fetchStart
        ? (perf.fetchEnd - perf.fetchStart).toFixed(2) + "ms"
        : "N/A (from cache)";
    const domWaitDuration =
      perf.domReadyEnd && perf.domReadyStart
        ? (perf.domReadyEnd - perf.domReadyStart).toFixed(2) + "ms"
        : perf.domReadyWait
          ? "waiting... (TIMEOUT fired first)"
          : "0ms (already ready)";
    const initToFinish =
      perf.finishTime && perf.initializeStart
        ? (perf.finishTime - perf.initializeStart).toFixed(2)
        : "N/A";

    const raceWinner = perf.timedOut ? "TIMEOUT" : "VARIANT";
    const flickerRisk = perf.timedOut ? "YES (variant applied after page shown)" : "NO";
    const variantAppliedTime = perf.variantApplied
      ? (perf.variantApplied - perf.scriptStart).toFixed(2) + "ms"
      : "N/A (pending or no variant)";

    const scriptStartFromNav = perf.scriptStart.toFixed(2) + "ms";
    const variantFromNav = perf.variantApplied
      ? perf.variantApplied.toFixed(2) + "ms"
      : "N/A (pending)";
    const finishFromNav = perf.finishTime.toFixed(2) + "ms";

    let summary =
      `\n${DEBUG_PREFIX} ╔═══════════════════════════════════════════════════════════╗\n` +
      `${DEBUG_PREFIX} ║              CROWAI HEADSCRIPT PERFORMANCE                 ║\n` +
      `${DEBUG_PREFIX} ╠═══════════════════════════════════════════════════════════╣\n` +
      `${DEBUG_PREFIX} ║  RACE RESULT                                              ║\n` +
      `${DEBUG_PREFIX} ║  ─────────────────────────────────────────────────────    ║\n` +
      `${DEBUG_PREFIX} ║  Winner:              ${(raceWinner + " (" + LOADING_TIMEOUT + "ms timeout vs DOM+variant)").padEnd(35)}║\n` +
      `${DEBUG_PREFIX} ║  Flicker Risk:        ${flickerRisk.padEnd(35)}║\n` +
      `${DEBUG_PREFIX} ╠═══════════════════════════════════════════════════════════╣\n` +
      `${DEBUG_PREFIX} ║  PAGE LOAD vs SCRIPT LOAD                                 ║\n` +
      `${DEBUG_PREFIX} ║  ─────────────────────────────────────────────────────    ║\n` +
      `${DEBUG_PREFIX} ║  Page Navigation:     0ms (baseline)                      ║\n` +
      `${DEBUG_PREFIX} ║  Script Started:      ${(scriptStartFromNav + " (delay before script)").padEnd(35)}║\n` +
      `${DEBUG_PREFIX} ║  Variant Applied:     ${(variantFromNav + " (from page nav)").padEnd(35)}║\n` +
      `${DEBUG_PREFIX} ║  Anti-flicker Done:   ${(finishFromNav + " (from page nav)").padEnd(35)}║\n` +
      `${DEBUG_PREFIX} ╠═══════════════════════════════════════════════════════════╣\n` +
      `${DEBUG_PREFIX} ║  SCRIPT TIMING (from script start)                        ║\n` +
      `${DEBUG_PREFIX} ║  ─────────────────────────────────────────────────────    ║\n` +
      `${DEBUG_PREFIX} ║  Total Time:          ${total.padEnd(35)}║\n` +
      `${DEBUG_PREFIX} ║  Anti-flicker Hidden: ${antiFlickerDuration.padEnd(35)}║\n` +
      `${DEBUG_PREFIX} ║  Fetch Duration:      ${fetchDuration.padEnd(35)}║\n` +
      `${DEBUG_PREFIX} ║  DOM Wait Duration:   ${domWaitDuration.padEnd(35)}║\n` +
      `${DEBUG_PREFIX} ║  Variant Applied At:  ${variantAppliedTime.padEnd(35)}║\n` +
      `${DEBUG_PREFIX} ╠═══════════════════════════════════════════════════════════╣\n` +
      `${DEBUG_PREFIX} ║  STATUS                                                   ║\n` +
      `${DEBUG_PREFIX} ║  ─────────────────────────────────────────────────────    ║\n` +
      `${DEBUG_PREFIX} ║  Cache Hit:           ${(perf.cacheHit ? "YES (" + perf.cacheType + ")" : "NO").padEnd(35)}║\n` +
      `${DEBUG_PREFIX} ║  DOM Ready Wait:      ${(perf.domReadyWait ? "YES" : "NO").padEnd(35)}║\n` +
      `${DEBUG_PREFIX} ║  Timed Out:           ${(perf.timedOut ? "YES" : "NO").padEnd(35)}║\n` +
      `${DEBUG_PREFIX} ╚═══════════════════════════════════════════════════════════╝\n`;

    const hasWebVitals =
      perf.fp !== null ||
      perf.fcp !== null ||
      perf.lcp !== null ||
      perf.cls !== null ||
      perf.inp !== null;
    if (hasWebVitals) {
      summary +=
        `${DEBUG_PREFIX} ─────────────────────────────────────────\n` +
        `${DEBUG_PREFIX} WEB VITALS:\n`;
      if (perf.fp !== null) {
        summary += `${DEBUG_PREFIX}   FP (First Paint):     ${perf.fp.toFixed(2)}ms\n`;
      }
      if (perf.fcp !== null) {
        summary += `${DEBUG_PREFIX}   FCP (First Content):  ${perf.fcp.toFixed(2)}ms\n`;
      }
      if (perf.lcp !== null) {
        summary +=
          `${DEBUG_PREFIX}   LCP (Largest Content): ${perf.lcp.toFixed(2)}ms\n` +
          `${DEBUG_PREFIX}   LCP Element:           ${perf.lcpElement}\n`;
      }
      if (perf.inp !== null) {
        summary += `${DEBUG_PREFIX}   INP (Interaction):    ${perf.inp.toFixed(2)}ms\n`;
      }
      if (perf.cls !== null) {
        summary += `${DEBUG_PREFIX}   CLS (Layout Shift):   ${perf.cls.toFixed(4)}\n`;
      }
    }

    if (perf.eventScriptLoad !== null) {
      summary +=
        `${DEBUG_PREFIX} ─────────────────────────────────────────\n` +
        `${DEBUG_PREFIX} Event Script Load:     ${perf.eventScriptLoad.toFixed(2)}ms\n`;
    }

    if (perf.navigationTiming) {
      const nav = perf.navigationTiming;
      summary +=
        `${DEBUG_PREFIX} ─────────────────────────────────────────\n` +
        `${DEBUG_PREFIX} PAGE NAVIGATION TIMING:\n` +
        `${DEBUG_PREFIX}   DNS Lookup:          ${nav.dns.toFixed(2)}ms\n` +
        `${DEBUG_PREFIX}   TCP Connect:         ${nav.tcp.toFixed(2)}ms\n` +
        `${DEBUG_PREFIX}   TTFB:                ${nav.ttfb.toFixed(2)}ms\n` +
        `${DEBUG_PREFIX}   DOMContentLoaded:    ${nav.domContentLoaded.toFixed(2)}ms\n` +
        `${DEBUG_PREFIX}   DOM Complete:        ${nav.domComplete.toFixed(2)}ms\n`;
    }

    if (perf.requests.length > 0) {
      summary +=
        `${DEBUG_PREFIX} ─────────────────────────────────────────\n` +
        `${DEBUG_PREFIX} CROWAI REQUEST TIMING:\n`;
      perf.requests.forEach((req) => {
        const cacheStatus = req.cached ? " (from cache)" : "";
        summary +=
          `${DEBUG_PREFIX}   ${req.name}${cacheStatus}:\n` +
          `${DEBUG_PREFIX}     Total Duration:    ${req.duration.toFixed(2)}ms\n` +
          `${DEBUG_PREFIX}     DNS:               ${req.dns.toFixed(2)}ms\n` +
          `${DEBUG_PREFIX}     TCP:               ${req.tcp.toFixed(2)}ms\n` +
          `${DEBUG_PREFIX}     TTFB:              ${req.ttfb.toFixed(2)}ms\n` +
          `${DEBUG_PREFIX}     Download:          ${req.download.toFixed(2)}ms\n` +
          `${DEBUG_PREFIX}     Transfer Size:     ${req.transferSize} bytes\n`;
      });
    }

    summary += `${DEBUG_PREFIX} ==========================================\n`;
    console.log(summary);
  };

  const logWebVitalsSummary = () => {
    const hasWebVitals =
      perf.fp !== null ||
      perf.fcp !== null ||
      perf.lcp !== null ||
      perf.cls !== null ||
      perf.inp !== null;
    if (!hasWebVitals) return;
    let summary = `\n${DEBUG_PREFIX} ========== WEB VITALS SUMMARY ==========\n`;
    if (perf.fp !== null) {
      summary += `${DEBUG_PREFIX}   FP (First Paint):     ${perf.fp.toFixed(2)}ms\n`;
    }
    if (perf.fcp !== null) {
      summary += `${DEBUG_PREFIX}   FCP (First Content):  ${perf.fcp.toFixed(2)}ms\n`;
    }
    if (perf.lcp !== null) {
      summary +=
        `${DEBUG_PREFIX}   LCP (Largest Content): ${perf.lcp.toFixed(2)}ms\n` +
        `${DEBUG_PREFIX}   LCP Element:           ${perf.lcpElement}\n`;
    }
    if (perf.inp !== null) {
      summary += `${DEBUG_PREFIX}   INP (Interaction):    ${perf.inp.toFixed(2)}ms\n`;
    }
    if (perf.cls !== null) {
      summary += `${DEBUG_PREFIX}   CLS (Layout Shift):   ${perf.cls.toFixed(4)}\n`;
    }
    summary += `${DEBUG_PREFIX} ==========================================\n`;
    console.log(summary);
  };

  setTimeout(logWebVitalsSummary, 3000);

  log("Script loaded", { VERSION, TENANT_ID, LOADING_TIMEOUT });
  const COOKIE_UID = CROW_AI + "uid";
  const COOKIE_NV = CROW_AI + "nv";
  const COOKIE_PV = CROW_AI + "pv";
  const VARIANT_CACHE_KEY = CROW_AI + "vc";
  const NO_MATCH_CACHE_KEY = CROW_AI + "nm";
  const PAGE_COUNT_KEY = CROW_AI + "pc";
  const SCRIPT = "script";
  const URLS = "urls";
  const ANTI_FLICKER_STYLE =
    "body{opacity:0!important;visibility:hidden!important;transition:none!important}";

  const currentUrl = window.location.href;
  const baseUrl = window.location.origin + window.location.pathname;
  const isDisabled = ~currentUrl.indexOf(CROW_AI + "_dis");
  const urlParam = new URLSearchParams(window.location.search).get("crowai");

  let isLoaded = 0;
  let loadingTimer = null;

  window[CROW_AI].T = TENANT_ID;
  window[CROW_AI].V = VERSION;

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
      if (days === 0) {
        document.cookie = name + "=" + value + ";path=/;SameSite=Lax";
      } else {
        const expires = new Date(Date.now() + days * 864e5).toUTCString();
        document.cookie = name + "=" + value + ";expires=" + expires + ";path=/;SameSite=Lax";
      }
    } catch {}
  };

  const isPreviewUrl = urlParam && urlParam.startsWith("crowaipv_");
  if (isPreviewUrl) {
    try {
      sessionStorage.setItem(COOKIE_PV, urlParam);
    } catch {}
  }
  const previewData = isPreviewUrl
    ? urlParam
    : (function () {
        try {
          return sessionStorage.getItem(COOKIE_PV) || "";
        } catch {
          return "";
        }
      })();
  const isPreviewMode = !!previewData;

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

  const trackError = (code) => window[CROW_AI]("event", "ce", { et: code });
  const createElement = (tag) => document.createElement(tag);
  const appendToHead = (el) => document.head?.appendChild(el);

  const finishLoading = (isError) => {
    const caller = isError ? "TIMEOUT" : "VARIANT";
    if (isLoaded++) {
      log(`finishLoading called by ${caller} but already loaded (race lost)`);
      return;
    }
    clearTimeout(loadingTimer);
    const afEl = document.getElementById(CROW_AI + "af");
    if (afEl) {
      afEl.remove();
      perf.antiFlickerRemoved = performance.now();
    }
    if (isError) {
      perf.timedOut = true;
      logWarn("=== TIMEOUT WON THE RACE ===");
      logWarn(
        "Page was hidden for " +
          LOADING_TIMEOUT / 1000 +
          "s, showing now. Variant will apply later (may cause flicker)"
      );
      trackError("to");
    } else {
      log("=== VARIANT WON THE RACE ===");
      log("Variant applied before timeout. No flicker!");
    }
    logPerfSummary();
  };

  const logLateVariantSummary = () => {
    const domWaitActual =
      perf.domReadyEnd && perf.domReadyStart
        ? (perf.domReadyEnd - perf.domReadyStart).toFixed(2)
        : "N/A";
    const domReadyFromNav = perf.domReadyEnd ? perf.domReadyEnd.toFixed(2) : "N/A";
    const domReadyFromScript = perf.domReadyEnd
      ? (perf.domReadyEnd - perf.scriptStart).toFixed(2)
      : "N/A";
    const variantFromNav = perf.variantApplied ? perf.variantApplied.toFixed(2) : "N/A";
    const variantFromScript = perf.variantApplied
      ? (perf.variantApplied - perf.scriptStart).toFixed(2)
      : "N/A";
    const flickerDuration =
      perf.variantApplied && perf.finishTime
        ? (perf.variantApplied - perf.finishTime).toFixed(2)
        : "N/A";

    let summary =
      `\n${DEBUG_PREFIX} ╔═══════════════════════════════════════════════════════════╗\n` +
      `${DEBUG_PREFIX} ║           LATE VARIANT APPLICATION (FLICKER!)              ║\n` +
      `${DEBUG_PREFIX} ╠═══════════════════════════════════════════════════════════╣\n` +
      `${DEBUG_PREFIX} ║  WHAT HAPPENED                                            ║\n` +
      `${DEBUG_PREFIX} ║  ─────────────────────────────────────────────────────    ║\n` +
      `${DEBUG_PREFIX} ║  1. Timeout fired at ${LOADING_TIMEOUT}ms (page shown)${" ".repeat(Math.max(0, 18 - String(LOADING_TIMEOUT).length))}║\n` +
      `${DEBUG_PREFIX} ║  2. DOM became ready later                                ║\n` +
      `${DEBUG_PREFIX} ║  3. Variant applied AFTER page was visible = FLICKER     ║\n` +
      `${DEBUG_PREFIX} ╠═══════════════════════════════════════════════════════════╣\n` +
      `${DEBUG_PREFIX} ║  TIMING DETAILS                                           ║\n` +
      `${DEBUG_PREFIX} ║  ─────────────────────────────────────────────────────    ║\n` +
      `${DEBUG_PREFIX} ║  DOM Ready (from nav):      ${(domReadyFromNav + "ms").padEnd(28)}║\n` +
      `${DEBUG_PREFIX} ║  DOM Ready (from script):   ${(domReadyFromScript + "ms").padEnd(28)}║\n` +
      `${DEBUG_PREFIX} ║  DOM Wait Duration:         ${(domWaitActual + "ms").padEnd(28)}║\n` +
      `${DEBUG_PREFIX} ║  Variant Applied (from nav):${(variantFromNav + "ms").padEnd(28)}║\n` +
      `${DEBUG_PREFIX} ║  Variant Applied (script):  ${(variantFromScript + "ms").padEnd(28)}║\n` +
      `${DEBUG_PREFIX} ║  ─────────────────────────────────────────────────────    ║\n` +
      `${DEBUG_PREFIX} ║  Flicker Duration:          ${(flickerDuration + "ms (page visible before variant)").padEnd(28)}║\n` +
      `${DEBUG_PREFIX} ╚═══════════════════════════════════════════════════════════╝\n`;
    console.log(summary);
  };

  const applyVariant = (code) => {
    log("applyVariant called - injecting immediately", {
      codeLength: code?.length || 0,
    });
    if (code) {
      log("Injecting variant code into head");
      ((s) => ((s.textContent = code), appendToHead(s)))(createElement(SCRIPT));
      perf.variantApplied = performance.now();
      log("Variant code injected", {
        time: perf.variantApplied.toFixed(2) + "ms",
      });
    } else {
      log("No variant code to inject");
    }
    finishLoading();
  };

  const handleVariantAssignment = () => {
    log("handleVariantAssignment started");
    const startTime = performance.now();

    const lastActivity = parseInt(getCookie(CROW_AI + "act") || "0");
    let cachedAssignments = null;
    log("Session check", {
      lastActivity,
      isSessionValid: lastActivity && Date.now() - lastActivity < 18e5,
      isPreviewMode,
    });

    if (lastActivity && Date.now() - lastActivity < 18e5) {
      const nmCache = getCache(NO_MATCH_CACHE_KEY);
      if (nmCache?.[URLS]?.includes(currentUrl) || nmCache?.[URLS]?.includes(baseUrl)) {
        perf.cacheHit = true;
        perf.cacheType = "no-match";
        if (CACHE_FOR_SESSION) {
          log("Cache hit: no-match cache, skipping fetch");
          return finishLoading();
        }
        log("Cache hit: no-match cache, but re-validating (CACHE_FOR_SESSION=false)");
      }

      const variantCache = getCache(VARIANT_CACHE_KEY) || {};
      const baseUrlCache = variantCache[baseUrl];
      const cached = variantCache[currentUrl] || (baseUrlCache?.iq ? baseUrlCache : null);
      if (cached && cached.t && Object.keys(cached.t).length > 0) {
        perf.cacheHit = true;
        perf.cacheType = "variant" + (cached.iq ? " (ignore-query)" : "");
        cachedAssignments = cached.t;
        log("Cache hit: variant cache", {
          assignments: cached.t,
          ignoreQuery: cached.iq,
        });
        if (cached.r) {
          log("Cached split URL redirect", { url: cached.r });
          try {
            window.location.replace(cached.r);
          } catch {
            window.location.href = cached.r;
          }
          return;
        }
        if (CACHE_FOR_SESSION) {
          return applyVariant(cached.c);
        }
        log("Re-validating cached assignments (CACHE_FOR_SESSION=false)");
      } else {
        log("Cache miss: no cached variant for URL");
      }
    }

    log("Starting script tag fetch");
    perf.fetchStart = performance.now();

    window[CROW_AI + "_r"] = (d) => {
      try {
        perf.fetchEnd = performance.now();
        const fetchDuration = (perf.fetchEnd - perf.fetchStart).toFixed(2);
        log("Script tag callback received", {
          fetchDuration: fetchDuration + "ms",
          hasAssignments: d.t && Object.keys(d.t).length > 0,
          hasCode: !!d.c,
          ignoreQuery: d.iq,
          isError: !!d.e,
        });

        if (d.e) {
          logError("Worker returned error response");
          trackError("we");
          return finishLoading();
        }

        if (d.u && !getCookie(COOKIE_UID)) {
          log("Setting user ID cookie and new visitor flag");
          setCookie(COOKIE_UID, d.u, 100);
          setCookie(COOKIE_NV, "1", 0);
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
          return;
        }

        if (!d.t || Object.keys(d.t).length === 0) {
          log("No assignments returned, caching as no-match", { ignoreQuery: d.iq });
          if (!isPreviewMode) {
            let cache = getCache(NO_MATCH_CACHE_KEY) || { [URLS]: [] };
            const cacheUrl = d.iq ? baseUrl : currentUrl;
            cache[URLS].includes(cacheUrl) || cache[URLS].push(cacheUrl);
            setStorageItem(NO_MATCH_CACHE_KEY, cache);
          }
          return finishLoading();
        }

        if (!isPreviewMode) {
          log("Caching variant for URL", { ignoreQuery: d.iq, assignments: d.t });
          const cache = getCache(VARIANT_CACHE_KEY) || {};
          cache[d.iq ? baseUrl : currentUrl] = {
            t: d.t,
            c: d.c,
            iq: d.iq ? 1 : 0,
            r: d.r || "",
          };
          setStorageItem(VARIANT_CACHE_KEY, cache);
        }

        if (isLoaded) {
          logLateVariantSummary();
          return;
        }

        const totalDuration = (performance.now() - startTime).toFixed(2);
        log("Applying variant", { totalDuration: totalDuration + "ms" });
        applyVariant(d.c);
      } catch (error) {
        logError("crowai_r callback error", error);
        finishLoading();
      }
    };

    let caParam = "";
    if (cachedAssignments) {
      caParam = Object.entries(cachedAssignments)
        .map(function (e) {
          return encodeURIComponent(e[0]) + ":" + encodeURIComponent(e[1]);
        })
        .join(",");
      log("Sending cached assignments for re-validation", { ca: caParam });
    }

    const s = createElement(SCRIPT);
    s.async = 1;
    s.src =
      CDN_BASE +
      "/js/test/variation?" +
      (caParam ? "ca=" + caParam + "&" : "") +
      CROW_AI +
      "=" +
      (isPreviewMode
        ? previewData + "_" + encodeURIComponent(currentUrl)
        : TENANT_ID +
          "_" +
          (window[PAGE_COUNT_KEY] || 1) +
          "_" +
          (getCookie(COOKIE_UID) || "") +
          "_" +
          (getCookie(COOKIE_NV) ? "1" : "0") +
          "_" +
          encodeURIComponent(currentUrl)) +
      "&V=" +
      VERSION +
      "&sc=" +
      encodeURIComponent(document.cookie);
    log("Script tag injection", { src: s.src.split("?")[0] });
    s.onerror = () => {
      logError("Script tag network error");
      trackError("vne");
      finishLoading();
    };
    appendToHead(s);
  };

  const initialize = () => {
    perf.initializeStart = performance.now();

    if (isDisabled) {
      log("Script disabled via URL param");
      return;
    }

    let pc = parseInt(getCookie(PAGE_COUNT_KEY) || "0") + 1;
    setCookie(PAGE_COUNT_KEY, pc.toString(), 100);
    window[PAGE_COUNT_KEY] = pc;
    log("Page count", { pc });

    const timeoutMs = isPreviewMode ? 10000 : LOADING_TIMEOUT;
    log("Setting loading timeout", { timeout: timeoutMs, isPreviewMode });
    loadingTimer = setTimeout(() => {
      if (!isLoaded) {
        logWarn(`Timeout fired after ${timeoutMs}ms - variant not ready yet`);
        finishLoading(1);
      } else {
        log("Timeout fired but variant already applied - no action needed");
      }
    }, timeoutMs);

    log("Loading event script");
    const script = createElement(SCRIPT);
    script.async = 1;
    script.src = CDN_BASE + "/js/event?V=" + VERSION;
    const eventScriptStart = performance.now();
    script.onload = () => {
      perf.eventScriptLoad = performance.now() - eventScriptStart;
      log("Event script loaded", {
        duration: perf.eventScriptLoad.toFixed(2) + "ms",
      });
    };
    script.onerror = () => {
      logError("Event script failed to load");
      trackError("ene");
    };
    appendToHead(script);

    handleVariantAssignment();
  };

  if (isDisabled) {
    log("Script disabled, skipping anti-flicker");
  } else {
    log("Applying anti-flicker style");
    ((s) => ((s.id = CROW_AI + "af"), (s.textContent = ANTI_FLICKER_STYLE), appendToHead(s)))(
      createElement("style")
    );
    perf.antiFlickerApplied = performance.now();
  }

  log("Calling initialize immediately (not waiting for DOMContentLoaded)");
  initialize();
})(window, document);