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
    if (isLoaded++) return;
    clearTimeout(loadingTimer);
    document.getElementById(CROW_AI + "af")?.remove();
    isError && trackError("to");
  };

  const applyVariant = (code) => {
    code && ((s) => ((s.textContent = code), appendToHead(s)))(createElement(SCRIPT));
    finishLoading();
  };

  const handleVariantAssignment = () => {
    const lastActivity = parseInt(getCookie(CROW_AI + "act") || "0");
    let cachedAssignments = null;

    if (lastActivity && Date.now() - lastActivity < 18e5) {
      const nmCache = getCache(NO_MATCH_CACHE_KEY);
      if (nmCache?.[URLS]?.includes(currentUrl) || nmCache?.[URLS]?.includes(baseUrl)) {
        if (CACHE_FOR_SESSION) {
          return finishLoading();
        }
      }

      const variantCache = getCache(VARIANT_CACHE_KEY) || {};
      const baseUrlCache = variantCache[baseUrl];
      const cached = variantCache[currentUrl] || (baseUrlCache?.iq ? baseUrlCache : null);
      if (cached && cached.t && Object.keys(cached.t).length > 0) {
        cachedAssignments = cached.t;
        if (CACHE_FOR_SESSION) {
          return applyVariant(cached.c);
        }
      }
    }

    window[CROW_AI + "_r"] = (d) => {
      try {
        if (d.e) {
          trackError("we");
          return finishLoading();
        }

        if (d.u && !getCookie(COOKIE_UID)) {
          setCookie(COOKIE_UID, d.u, 100);
          setCookie(COOKIE_NV, "1", 0);
        }

        if (d.rd) {
          if (!isPreviewMode && d.t && Object.keys(d.t).length > 0) {
            try {
              const cache = getCache(VARIANT_CACHE_KEY) || {};
              cache[currentUrl] = { t: d.t, c: "", iq: 0, rd: d.rd };
              setStorageItem(VARIANT_CACHE_KEY, cache);
            } catch {}
          }
          try {
            window.location.replace(d.rd);
          } catch {
            window.location.href = d.rd;
          }
          return;
        }

        if (d.rdjs) {
          var jsTarget = "";
          try {
            jsTarget = new Function("url", d.rdjs)(currentUrl);
          } catch (e) {
            trackError("rje");
            return finishLoading();
          }
          if (typeof jsTarget === "string" && jsTarget && jsTarget !== currentUrl) {
            try {
              window.location.replace(jsTarget);
            } catch {
              window.location.href = jsTarget;
            }
            return;
          }
          return finishLoading();
        }

        if (!d.t || Object.keys(d.t).length === 0) {
          if (!isPreviewMode) {
            let cache = getCache(NO_MATCH_CACHE_KEY) || { [URLS]: [] };
            const cacheUrl = d.iq ? baseUrl : currentUrl;
            cache[URLS].includes(cacheUrl) || cache[URLS].push(cacheUrl);
            setStorageItem(NO_MATCH_CACHE_KEY, cache);
          }
          return finishLoading();
        }

        if (!isPreviewMode) {
          const cache = getCache(VARIANT_CACHE_KEY) || {};
          cache[d.iq ? baseUrl : currentUrl] = {
            t: d.t,
            c: d.c,
            iq: d.iq ? 1 : 0,
          };
          setStorageItem(VARIANT_CACHE_KEY, cache);
        }

        if (isLoaded) return;
        applyVariant(d.c);
      } catch {
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
    s.onerror = () => {
      trackError("vne");
      finishLoading();
    };
    appendToHead(s);
  };

  const initialize = () => {
    if (isDisabled) return;

    let pc = parseInt(getCookie(PAGE_COUNT_KEY) || "0") + 1;
    setCookie(PAGE_COUNT_KEY, pc.toString(), 100);
    window[PAGE_COUNT_KEY] = pc;

    loadingTimer = setTimeout(
      () => {
        isLoaded || finishLoading(1);
      },
      isPreviewMode ? 10000 : LOADING_TIMEOUT
    );

    const script = createElement(SCRIPT);
    script.async = 1;
    script.src = CDN_BASE + "/js/event?V=" + VERSION;
    script.onerror = () => trackError("ene");
    appendToHead(script);

    handleVariantAssignment();
  };

  isDisabled ||
    ((s) => ((s.id = CROW_AI + "af"), (s.textContent = ANTI_FLICKER_STYLE), appendToHead(s)))(
      createElement("style")
    );

  initialize();
})(window, document);
