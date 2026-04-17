/**
 * Stellar A/B Testing Snippet — Deobfuscated Reference
 * Original source: https://d3niuqph2rteir.cloudfront.net/client_js/stellar.js
 * Version: 11-11-2025
 *
 * This is a hand-deobfuscated, semantically-renamed version of the minified
 * client snippet. Behavior should be functionally equivalent to the original.
 * Comments mark non-obvious quirks; everything else mirrors the original flow.
 *
 * NOTE: The original was minified and partly truncated when shared. The tail
 * of the page-visit goal evaluator (`checkPageVisitGoals`) is reconstructed
 * from context — verify against the live script before relying on it.
 */

// Runtime async/await support shim emitted by the original (TypeScript downlevel).
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
  return new (P = P || Promise)(function (resolve, reject) {
    function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
    function rejected(value)  { try { step(generator.throw(value)); } catch (e) { reject(e); } }
    function step(result) {
      var t;
      result.done
        ? resolve(result.value)
        : ((t = result.value) instanceof P ? t : new P(function (r) { r(t); })).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};

(function () {
  // ============================================================
  // Config / constants
  // ============================================================
  const queryParams = new URLSearchParams(window.location.search);
  const DEBUG               = queryParams.get('stellarDebugging');
  const LOCAL_MODE          = queryParams.get('stellarLocalMode');
  const STELLAR_VERSION     = '11-11-2025';
  const API_BASE            = 'https://api.gostellar.app';
  const EXPERIMENTS_URL     = 'https://api.gostellar.app/public/experiments/client';
  const EDITOR_URL = LOCAL_MODE === 'true'
    ? 'http://localhost:3001/public/editorjs'
    : 'https://api.gostellar.app/public/editorjs';
  const INTERACTION_BUFFER_MAX = 200;

  function debugLog(...args) {
    if (DEBUG) console.log(...args);
  }

  // ============================================================
  // Identity helpers (visitor / domain / session)
  // ============================================================
  function getCookieVisitorId() {
    try {
      const cookie = document.cookie
        .split(';')
        .find(c => c.trim().startsWith('stellarVisitorId='));
      if (cookie) return cookie.split('=')[1];
    } catch (e) {
      debugLog('Error getting cookie visitorId:', e);
    }
    return null;
  }

  function getRootDomain() {
    try {
      // e.g. "www.foo.example.com" -> "example.com"
      return window.location.hostname.split('.').slice(-2).join('.');
    } catch (e) {
      debugLog('Error getting domain:', e);
    }
    return null;
  }

  debugLog('stellar version: ' + STELLAR_VERSION);

  // Session id — 30-min sliding window in localStorage.
  const sessionId = (function () {
    const now = Date.now();
    const stored = localStorage.getItem('stellar_session');
    if (stored) {
      debugLog('hay storedSession', stored);
      const parsed = JSON.parse(stored);
      if (now - parsed.lastActivity < 1_800_000) {
        debugLog('session not expired, updating last activity');
        parsed.lastActivity = now;
        localStorage.setItem('stellar_session', JSON.stringify(parsed));
        return parsed.id;
      }
    }
    const fresh = { id: Math.random().toString(36).substr(2, 10), lastActivity: now };
    localStorage.setItem('stellar_session', JSON.stringify(fresh));
    debugLog('no stored session, created new one: ', fresh.id);
    return fresh.id;
  })();
  debugLog('sessionId we got: ', sessionId);

  // ============================================================
  // Visual editor mode (?stellarMode=true)
  // ============================================================
  const stellarMode = queryParams.get('stellarMode');
  if (stellarMode === 'true') {
    console.log('stellarMode is true loading editor');
    const editorScript = document.createElement('script');
    editorScript.src = EDITOR_URL;
    document.head.appendChild(editorScript);

    const editorExperimentId = queryParams.get('experimentId');
    if (editorExperimentId) {
      try {
        fetch(API_BASE + '/public/snippet-page-ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ experimentId: editorExperimentId }),
        }).catch(() => {});
      } catch (e) {}
    }
  }

  // ============================================================
  // Module state
  // ============================================================
  let sessionIssues          = [];   // { type, message } — deduped before send
  const scriptUrl            = new URL(document.currentScript.src);
  const apiKeyFromScriptSrc  = new URLSearchParams(scriptUrl.search).get('apiKey');
  let experiments            = null; // raw experiments from API
  let mutationObserver       = null;
  let mountedExperiments     = {};   // experimentId -> true once mounted
  let isReturningVisitor     = false;
  let hasSubdomainTesting    = false;
  let crossDomainMode        = false; // set when running cross-domain
  let alwaysOnTracking       = false;
  let apiKey                 = null;

  // Split-URL redirect carry-over
  const splitParams          = new URLSearchParams(window.location.search);
  const isSplitUrlRedirect   = splitParams.get('_stellarSplitUrl') === 'true';
  const splitVisitorStatus   = splitParams.get('_stellarVisitorStatus');
  const splitUrlReferrer     = splitParams.get('_stellarReferrer');

  // ============================================================
  // Anti-flicker overlay
  // ============================================================
  function removeAntiFlickerOverlay(reason) {
    debugLog('removing anti flicker overlay', reason);
    if (typeof window.rmo === 'function') {
      try { window.rmo(); } catch (e) { console.error('Error executing rmo:', e); }
    }
  }

  // ============================================================
  // URL helpers
  // ============================================================
  function normalizeUrlPath(href) {
    const a = document.createElement('a');
    a.href = href;
    const path = a.pathname.endsWith('/') ? a.pathname : a.pathname + '/';
    return path.toLowerCase();
  }

  // ============================================================
  // stellarData (per-visitor experiment assignments)
  // Stored in localStorage; mirrored to a cookie when subdomain
  // testing is enabled so siblings on *.domain see the same state.
  // ============================================================
  function getStellarData() {
    const ls = localStorage.getItem('stellarData');
    debugLog('-666- getStellarData', ls);
    if (hasSubdomainTesting) {
      try {
        const cookie = document.cookie
          .split('; ')
          .find(c => c.startsWith('stellarData='));
        if (cookie) {
          debugLog('cookieStellarData', cookie);
          return JSON.parse(cookie.split('=')[1]);
        }
      } catch (e) {
        debugLog('Error getting stellarData cookie: ', e);
      }
    }
    return ls ? JSON.parse(ls) : {};
  }

  function setStellarData(data) {
    localStorage.setItem('stellarData', JSON.stringify(data));
    debugLog('setting stellarData', data, hasSubdomainTesting);
    if (hasSubdomainTesting) {
      try {
        const domain = getRootDomain();
        if (domain) {
          const expires = new Date();
          expires.setDate(expires.getDate() + 90);
          const secure = window?.location?.protocol === 'https:' ? 'Secure;' : '';
          document.cookie =
            `stellarData=${JSON.stringify(data)}; domain=.${domain}; path=/; ` +
            `expires=${expires.toUTCString()}; SameSite=Lax; ${secure}`;
        }
      } catch (e) {
        debugLog('Error setting stellarData cookie: ', e);
      }
    }
  }

  function wasEverMounted(experimentId) {
    return getStellarData()[experimentId] !== undefined;
  }

  function getOrCreateVisitorId() {
    let id = localStorage.getItem('stellarVisitorId') || getCookieVisitorId();
    if (!id) {
      id = 'visitor_' + Date.now() + Math.random();
      localStorage.setItem('stellarVisitorId', id);
    }
    return id;
  }

  // ============================================================
  // Resolve new-vs-returning visitor
  // ============================================================
  if (sessionStorage.getItem('stellarSessionStarted')) {
    if (isSplitUrlRedirect && splitVisitorStatus !== null) {
      isReturningVisitor = splitVisitorStatus === 'true';
      debugLog('Split URL redirect detected (same session), preserving visitor status: ' + isReturningVisitor);
    } else {
      isReturningVisitor = sessionStorage.getItem('stellarIsReturningVisitor') === 'true';
    }
  } else {
    sessionStorage.setItem('stellarSessionStarted', 'true');
    const cookieVisitorId = getCookieVisitorId();
    if (isSplitUrlRedirect && splitVisitorStatus !== null) {
      isReturningVisitor = splitVisitorStatus === 'true';
      debugLog('Split URL redirect detected, preserving visitor status: ' + isReturningVisitor);
    } else {
      // Returning if any prior id existed; otherwise create one and mark new.
      const hadPriorId = localStorage.getItem('stellarVisitorId') || cookieVisitorId;
      if (!hadPriorId) {
        localStorage.setItem('stellarVisitorId', 'visitor_' + Date.now() + Math.random());
        isReturningVisitor = false;
      } else {
        isReturningVisitor = true;
      }
    }
  }
  sessionStorage.setItem('stellarIsReturningVisitor', isReturningVisitor.toString());

  // ============================================================
  // Per-page tracking state
  // ============================================================
  const visitorId         = getOrCreateVisitorId();
  let timeOnPage          = 0;
  let clickCount          = 0;
  let scrollDepth         = 0;
  let activeExperiments   = []; // { experiment, variant, converted, conversions[], experimentMounted, visualized, ... }
  const visitedPages      = [];
  let interactionBuffer   = []; // capped at INTERACTION_BUFFER_MAX

  function bufferInteractionEvent(evt) {
    if (interactionBuffer.length < INTERACTION_BUFFER_MAX) {
      interactionBuffer.push(evt);
    }
  }

  function flushInteractionBuffer() {
    if (interactionBuffer.length === 0 || !shouldSendEvents()) return;
    const events = [...interactionBuffer];
    interactionBuffer = [];
    const payload = JSON.stringify({
      visitorId,
      sessionId,
      activeExperiments,
      apiKey,
      eventType: 'interaction_flush',
      interactionEvents: events,
      deviceType: getDeviceType(),
      timestamp: new Date().toISOString(),
    });
    const url = API_BASE + '/public/experiments/event';
    if (navigator.sendBeacon && navigator.sendBeacon(url, payload)) {
      debugLog('Flushed interaction events via sendBeacon:', events.length);
      return;
    }
    try {
      fetch(url, { method: 'POST', body: payload, keepalive: true }).catch(() => {});
      debugLog('Flushed interaction events via fetch:', events.length);
    } catch (e) {}
  }

  // Tracks pages already counted in this session so we don't double-count.
  const _trackedPages = new Set();
  let internalLinkClicked  = false;
  let hasFetchedExperiments = false;

  function shouldSendEvents() {
    return alwaysOnTracking || (activeExperiments && activeExperiments.length > 0);
  }

  let _kReserved        = false;
  let debounceTimer     = null;
  let startedEventSent  = false;

  function debounceEventSend(eventType) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      sendEvent(eventType);
      debounceTimer = null;
    }, 1500);
  }

  function getSplitAssignmentKey(experimentId) {
    return `stellar_split_assignment_sent_${sessionId}_${experimentId}`;
  }

  function markVariantAssigned(experimentId, variantId, useBeacon = false) {
    if (!experimentId || !variantId) return;
    const key = getSplitAssignmentKey(experimentId);
    if (sessionStorage.getItem(key) === String(variantId)) {
      debugLog(`Assignment already sent for experiment ${experimentId}, variant ${variantId} in this session`);
      return;
    }
    const exp = activeExperiments.find(e => e.experiment === experimentId);
    if (exp) {
      exp.experimentMounted = true;
      exp.visualized = true;
    }
    sessionStorage.setItem(key, String(variantId));
    sendEvent('assigned', useBeacon);
  }

  // ============================================================
  // Click heatmap tracking
  // ============================================================
  function setupClickTracking() {
    document.addEventListener('click', (e) => {
      clickCount++;
      if (!shouldSendEvents()) return;
      const target = e.target;
      if (!target) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      bufferInteractionEvent({
        event_name: 'element_click',
        ts: new Date().toISOString(),
        page_url: window.location.pathname + window.location.search,
        x: vw > 0 ? Math.round((e.clientX / vw) * 1e4) / 1e4 : 0,
        y: vh > 0 ? Math.round((e.clientY / vh) * 1e4) / 1e4 : 0,
        viewport_w: vw,
        viewport_h: vh,
        scroll_y: Math.round(window.scrollY),
        element_tag: target.tagName || undefined,
        selector_hash: hashDjb2(buildSimpleSelector(target)),
        data: JSON.stringify({
          id: target.id || undefined,
          classes:
            target.className && typeof target.className === 'string'
              ? target.className.trim().split(/\s+/).slice(0, 5)
              : undefined,
        }),
      });
    });

    function buildSimpleSelector(el) {
      if (el.id) return '#' + el.id;
      let sel = el.tagName.toLowerCase();
      if (el.className && typeof el.className === 'string') {
        sel += '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.');
      }
      return sel;
    }

    function hashDjb2(str) {
      let h = 5381;
      for (let i = 0; i < str.length; i++) {
        h = ((h << 5) + h + str.charCodeAt(i)) & 0xFFFFFFFF;
      }
      return h.toString(36);
    }
  }

  // ============================================================
  // Send event
  // ============================================================
  function sendEvent(eventType, useBeaconDirectly = false) {
    if (eventType === 'started' && startedEventSent) {
      debugLog('BLOCKED: Started event already sent');
      return;
    }
    if (eventType === 'started') startedEventSent = true;

    debugLog('=== Sending Stellar event: ', eventType);
    debugLog('=== ALL activeExperiments at send time:', JSON.parse(JSON.stringify(activeExperiments)));

    let experimentsToSend;
    if (crossDomainMode) {
      debugLog('=== Cross domain mode - sending ALL experiments');
      experimentsToSend = activeExperiments;
    } else {
      experimentsToSend = activeExperiments.filter(e => {
        const everMounted = wasEverMounted(e.experiment);
        const shouldSend =
          e.experimentMounted ||
          (everMounted && (e?.conversions?.length ?? 0) > 0);
        debugLog(
          `=== Filter experiment ${e.experiment}: experimentMounted=${e.experimentMounted}, ` +
          `wasEverMounted=${everMounted}, shouldSend=${shouldSend}`
        );
        return shouldSend;
      });
    }
    debugLog('=== Final experimentsToSend:', JSON.parse(JSON.stringify(experimentsToSend)));

    if (experimentsToSend.length === 0 && !alwaysOnTracking) return;

    // Dedupe session issues by `${type}-${message}`.
    const dedupedIssues = [];
    const seenIssues = new Set();
    sessionIssues.forEach(issue => {
      const key = issue.type + '-' + issue.message;
      if (!seenIssues.has(key)) { seenIssues.add(key); dedupedIssues.push(issue); }
    });

    const tracking = getTrackingData();
    const ga4ClientId = getGa4ClientId();
    const interactionEvents = interactionBuffer.length > 0 ? [...interactionBuffer] : undefined;

    const payload = Object.assign({
      visitorId,
      timeOnPage,
      clickCount,
      scrollDepth,
      idempotencyKey: `${visitorId}_${eventType}_${Date.now()}`,
      activeExperiments: experimentsToSend,
      visitedPages,
      sessionIssues: dedupedIssues,
      userAgent: window?.navigator?.userAgent,
      eventType,
      timestamp: new Date().toISOString(),
      sessionId,
      deviceType: getDeviceType(),
      country: window.__stellar?.geoData?.countryCode,
      apiKey,
      ga4ClientId,
      interactionEvents,
    }, tracking);

    const body = JSON.stringify(payload);
    const url  = API_BASE + '/public/experiments/event';

    const onSuccess = () => {
      if (eventType === 'converted') {
        activeExperiments.forEach(e => { e.converted = false; e.conversions = []; });
      }
      if (eventType !== 'assigned') interactionBuffer = [];
    };

    const beaconFallback = () => {
      if (!navigator.sendBeacon) return false;
      debugLog(`Trying sendBeacon fallback for ${eventType} event`);
      debugLog('Beacon URL: ' + url);
      debugLog('Beacon payload length: ' + body.length);
      if (navigator.sendBeacon(url, body)) {
        debugLog(`Successfully sent ${eventType} event via sendBeacon fallback`);
        onSuccess();
        return true;
      }
      debugLog(`sendBeacon fallback also failed for ${eventType} event`);
      return false;
    };

    if (useBeaconDirectly) {
      debugLog(`Using sendBeacon directly for ${eventType} event (page unload)`);
      beaconFallback();
      return;
    }

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
      .then(resp => {
        if (resp.ok) {
          debugLog(`Successfully sent ${eventType} event via fetch`);
          onSuccess();
        } else {
          debugLog(`Fetch failed for ${eventType} event with status:`, resp.status);
          beaconFallback();
        }
      })
      .catch(err => {
        debugLog(`Fetch failed for ${eventType} event:`, err);
        beaconFallback();
      });

    sessionIssues = [];
    debugLog('activeExperiments after sending event and emptying conversions', activeExperiments);
  }

  // ============================================================
  // Tracking helpers (UTMs / referrer / GA4)
  // ============================================================
  function getTrackingData() {
    try {
      const params = new URLSearchParams(window.location.search);
      const stored = JSON.parse(sessionStorage.getItem('stellarTrackingData') || '{}');
      let referrer = document.referrer || stored.referrer || '';
      if (isSplitUrlRedirect && splitUrlReferrer !== null) {
        referrer = decodeURIComponent(splitUrlReferrer);
        debugLog('Split URL redirect detected, preserving original referrer: ' + referrer);
      }
      const data = {
        referrer,
        isReturning: isReturningVisitor,
        utmCampaign: params.get('utm_campaign') || stored.utmCampaign || '',
        utmSource:   params.get('utm_source')   || stored.utmSource   || '',
        utmMedium:   params.get('utm_medium')   || stored.utmMedium   || '',
        utmTerm:     params.get('utm_term')     || stored.utmTerm     || '',
        utmContent:  params.get('utm_content')  || stored.utmContent  || '',
      };
      sessionStorage.setItem('stellarTrackingData', JSON.stringify(data));
      return data;
    } catch (e) {
      debugLog('Error getting tracking data:', e);
      return {
        referrer: '', isReturning: false,
        utmCampaign: '', utmSource: '', utmMedium: '', utmTerm: '', utmContent: '',
      };
    }
  }

  function getGa4ClientId() {
    try {
      for (const raw of document.cookie.split(';')) {
        const cookie = raw.trim();
        if (cookie.startsWith('_ga=')) {
          const parts = cookie.substring(4).split('.');
          if (parts.length >= 4) return parts[parts.length - 2] + '.' + parts[parts.length - 1];
        }
      }
      debugLog('GA4 client_id not found in cookies');
      return null;
    } catch (e) {
      debugLog('Error getting GA4 client_id:', e);
      return null;
    }
  }

  // ============================================================
  // beforeunload handler
  // ============================================================
  function setupBeforeUnload() {
    window.addEventListener('beforeunload', () => {
      if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }

      const hasPendingConversions = activeExperiments.some(
        e => e.conversions && e.conversions.length > 0
      );
      if (hasPendingConversions) {
        debugLog('Sending pending conversions before page unload with beacon fallback');
        sendEvent('converted');
      }

      if (internalLinkClicked || _kReserved) {
        if (interactionBuffer.length > 0) flushInteractionBuffer();
      } else {
        debugLog('Sending ended event using sendBeacon for reliable delivery');
        if (activeExperiments.length > 0 || alwaysOnTracking) {
          sendEvent('ended', /* useBeaconDirectly */ true);
        }
      }
    });

    // Track internal link clicks so we can persist state across SPA-like nav.
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (target.tagName === 'A' && target.hostname === window.location.hostname) {
        internalLinkClicked = true;
        const cache = {
          timeOnPage,
          clickCount,
          scrollDepth,
          activeExperiments,
          visitedPages,
          hasFetchedExperiments,
        };
        debugLog('setting in cache', cache);
        sessionStorage.setItem('stellarSessionData', JSON.stringify(cache));
      }
    });
  }

  // ============================================================
  // DOM modifications
  // ============================================================
  function applyPositionIndex(modification) {
    const el = document.querySelector(
      modification.stellarId
        ? `[data-stellar-id="${modification.stellarId}"]`
        : modification.selector
    );
    if (modification.positionIndex === undefined || !el) return;

    const parent = el.parentElement;
    if (!parent) return;

    const target = modification.positionIndex;
    const siblings = Array.from(parent.children);
    const current = siblings.indexOf(el);
    if (current === target) return;

    let referenceNode = null;
    if (target < siblings.length) {
      // If moving forward, account for the removal shift.
      referenceNode = current <= target
        ? (target + 1 < siblings.length ? siblings[target + 1] : null)
        : siblings[target];
    }
    parent.removeChild(el);
    parent.insertBefore(el, referenceNode);
    el.setAttribute('data-stellar-position', String(target));
  }

  // Template interpolation: {{varName||fallback}} from window.__stellar.variables
  function interpolateTemplate(text) {
    if (!text) return text;
    const variables = window.__stellar?.variables || {};
    return text.replace(/{{(.*?)}}/g, (full, expr) => {
      const [name, fallback] = expr.split('||').map(s => s.trim());
      return variables[name] !== undefined ? variables[name] : (fallback || full);
    });
  }

  function applyModification(el, mod /*, experimentId */) {
    if (mod.js) {
      try {
        new Function('element', mod.js)(el);
        debugLog('✓ Executed JS modification for element');
      } catch (e) {
        console.error('Error executing JS modification:', e);
      }
    } else {
      if (mod.innerText !== undefined) el.innerText = interpolateTemplate(mod.innerText);
      if (mod.innerHTML !== undefined) el.innerHTML = interpolateTemplate(mod.innerHTML);
      if (mod.outerHTML !== undefined) {
        const html = interpolateTemplate(mod.outerHTML);
        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        const parsed = wrapper.firstElementChild;
        if (!parsed) {
          console.warn('Failed to parse new HTML, falling back to outerHTML');
          el.outerHTML = html;
        } else if (el.tagName !== parsed.tagName) {
          debugLog('Tag name changed, using outerHTML (event listeners will be lost)');
          el.outerHTML = html;
        } else {
          // Preserve event listeners by syncing attrs + innerHTML on the same node.
          Array.from(el.attributes).forEach(a => {
            if (!parsed.hasAttribute(a.name)) el.removeAttribute(a.name);
          });
          Array.from(parsed.attributes).forEach(a => {
            el.setAttribute(a.name, a.value);
          });
          el.innerHTML = parsed.innerHTML;
          debugLog('Applied changes while preserving event listeners');
        }
      }
    }
    if (mod.cssText !== undefined) el.style.cssText = mod.cssText;
    if (mod.attributes) {
      Object.keys(mod.attributes).forEach(k => {
        if (mod.attributes[k] !== undefined) el[k] = mod.attributes[k];
      });
    }
    if (mod.stellarId && !el.hasAttribute('data-stellar-id')) {
      el.setAttribute('data-stellar-id', mod.stellarId);
    }
    return true;
  }

  // ============================================================
  // Device & targeting
  // ============================================================
  function getDeviceType() {
    const w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    if (w <= 767)  return 'mobile';
    if (w <= 1024) return 'tablet';
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipod|android.*mobile|windows.*phone|blackberry|bb\d+|meego|opera mini|avantgo|mobilesafari|docomo/i.test(ua)) return 'mobile';
    if (/(ipad|tablet|playbook|silk)|(android(?!.*mobile))/i.test(ua)) return 'tablet';
    return 'desktop';
  }

  // Sticky traffic-allocation roll. Returns truthy when included.
  function checkTrafficAllocation(exp) {
    const data = getStellarData();
    const existing = data[exp.id];
    if (existing === 'excluded') {
      debugLog(`Visitor previously excluded from experiment ${exp.id} traffic allocation`);
      return undefined;
    }
    if (existing) return existing;

    const trafficPct = exp.traffic ?? 100;
    if (trafficPct === 0) {
      data[exp.id] = 'excluded';
      setStellarData(data);
      debugLog(`Experiment ${exp.id} has 0% traffic, excluding visitor`);
      return undefined;
    }
    if (trafficPct === 100) return true;

    const roll = Math.random() * 100;
    if (roll < trafficPct) {
      debugLog(`Visitor included in ${trafficPct}% traffic allocation for experiment ${exp.id} (rolled ${roll.toFixed(2)})`);
      return true;
    }
    data[exp.id] = 'excluded';
    setStellarData(data);
    debugLog(`Visitor excluded from ${trafficPct}% traffic allocation for experiment ${exp.id} (rolled ${roll.toFixed(2)})`);
    return undefined;
  }

  // Device / country / visitor-type targeting.
  function checkTargetingRules(exp) {
    const tr = exp.targetRules?.[0]?.rules;
    if (!tr) return true;

    if (tr.device?.enabled) {
      const device = getDeviceType();
      if (!tr.device.include.includes(device)) {
        debugLog(`Experiment ${exp.id} not mounted: device ${device} not in target list ${tr.device.include}`);
        return undefined;
      }
    }
    if (tr.country?.enabled) {
      const country = (navigator.language.split('-')[1]?.toUpperCase()) || '';
      if (tr.country.exclude.includes(country)) {
        debugLog(`Experiment ${exp.id} not mounted: country ${country} in exclude list`);
        return undefined;
      }
      if (tr.country.include.length > 0 && !tr.country.include.includes(country)) {
        debugLog(`Experiment ${exp.id} not mounted: country ${country} not in include list`);
        return undefined;
      }
    }
    if (tr.visitor?.enabled) {
      if (tr.visitor.type === 'new' && isReturningVisitor) {
        debugLog(`Experiment ${exp.id} not mounted: visitor is returning but experiment targets new visitors`);
        return undefined;
      }
      if (tr.visitor.type === 'returning' && !isReturningVisitor) {
        debugLog(`Experiment ${exp.id} not mounted: visitor is new but experiment targets returning visitors`);
        return undefined;
      }
    }
    return true;
  }

  // ============================================================
  // URL rule engine
  // ============================================================
  // Legacy rules for experiments with id < 1550.
  function matchUrlRulesLegacy(exp) {
    const currentUrl = window.location.href;
    const stripTrailingSlash = (s) => s.replace(/\/+$/, '');

    if (exp.url) {
      debugLog('shouldMountExperimentForUrlOld', exp.url, currentUrl);
      return normalizeUrlPath(currentUrl) === normalizeUrlPath(exp.url);
    }

    if (exp.advanced_url_rules) {
      const { exclude = [], include = [] } = exp.advanced_url_rules;
      for (const rule of exclude) {
        if (rule.type === 'contains' && currentUrl.includes(rule.url)) {
          debugLog(`Experiment ${exp.id} not mounted: URL matches exclude rule (contains) ${rule.url}`);
          return false;
        }
        if (rule.type === 'exact' && stripTrailingSlash(currentUrl) === stripTrailingSlash(rule.url)) {
          debugLog(`Experiment ${exp.id} not mounted: URL matches exclude rule (exact) ${rule.url}`);
          return false;
        }
      }
      if (include.length > 0) {
        return include.some(r =>
          (r.type === 'contains' && currentUrl.includes(r.url)) ||
          (r.type === 'exact' && stripTrailingSlash(currentUrl) === stripTrailingSlash(r.url))
        );
      }
    }
    return true;
  }

  // Advanced rule engine for newer experiments (id >= 1550).
  function matchUrlRulesAdvanced(exp) {
    const currentUrl = window.location.href;
    const stripTrailingSlash = (s) => s.replace(/\/+$/, '');

    if (exp.url) {
      return normalizeUrlPath(currentUrl) === normalizeUrlPath(exp.url);
    }
    if (!exp.advanced_url_rules) return true;

    const url = new URL(currentUrl);
    const pathname = url.pathname;
    const search   = url.search;

    const {
      exclude = [],
      include = [],
      includeLogicType = 'OR',
      excludeLogicType = 'OR',
    } = exp.advanced_url_rules;

    // Exclude rules
    const excludeFiltered = exclude.filter(r => r.value);
    if (excludeFiltered.length > 0) {
      if (excludeLogicType === 'AND') {
        if (excludeFiltered.every(r => evalRule(r))) {
          debugLog(`Experiment ${exp.id} not mounted: URL matches ALL exclude rules (AND logic)`);
          return false;
        }
      } else {
        for (const rule of excludeFiltered) {
          if (evalRule(rule)) {
            debugLog(
              `Experiment ${exp.id} not mounted: URL matches exclude rule ` +
              `(${rule.operator || rule.type}) "${rule.value || rule.url}" for target ${rule.target || 'full_url'}`
            );
            return false;
          }
        }
      }
    }

    // Include rules
    if (include.length === 0) return true;
    const includeFiltered = include.filter(r => r.value);
    if (includeFiltered.length === 0) return true;

    if (includeLogicType === 'AND') {
      const ok = includeFiltered.every(r => {
        const m = evalRule(r);
        if (!m) debugLog(`Rule check failed: ${r.operator || r.type} "${r.value}" for target "${r.target || 'full_url'}"`);
        return m;
      });
      if (!ok) debugLog(`Experiment ${exp.id} not mounted: URL doesn't match all include rules (AND logic)`);
      return ok;
    }
    return includeFiltered.some(r => {
      const m = evalRule(r);
      if (m) debugLog(`Experiment ${exp.id} rule matched: ${r.operator || r.type} "${r.value}" for target "${r.target || 'full_url'}"`);
      return m;
    });

    function evalRule(rule) {
      const value = rule.value;
      let target;
      switch (rule.target) {
        case 'path_only':
        case 'page_path':   target = pathname; break;
        case 'query_params':target = search.substring(1); break;
        default:            target = currentUrl;
      }

      if (rule.operator) {
        switch (rule.operator) {
          case 'equals':
            if (rule.target === 'page_path' || rule.target === 'path_only') {
              return stripTrailingSlash(target) === stripTrailingSlash(value);
            }
            if (rule.target !== 'query_params') {
              return stripTrailingSlash(target) === stripTrailingSlash(value);
            }
            return queryParamsEqual(search, value);

          case 'contains':            return target.includes(value);
          case 'does_not_contain':    return !target.includes(value);
          case 'does_not_equal':      return stripTrailingSlash(target) !== stripTrailingSlash(value);
          case 'starts_with':         return target.startsWith(value);
          case 'does_not_start_with': return !target.startsWith(value);
          case 'ends_with':           return target.endsWith(value);
          case 'does_not_end_with':   return !target.endsWith(value);
          case 'matches_regex':
            try { return new RegExp(value).test(target); }
            catch (e) { debugLog(`Invalid regex pattern "${value}": ${e.message}`); return false; }
          case 'does_not_match_regex':
            try { return !new RegExp(value).test(target); }
            catch (e) { debugLog(`Invalid regex pattern "${value}": ${e.message}`); return false; }
          default: return false;
        }
      }

      // Legacy `type` field on advanced rules.
      if (rule.type === 'contains') return target.includes(value);
      if (rule.type !== 'exact') return false;
      if (rule.target === 'path_only') return stripTrailingSlash(target) === stripTrailingSlash(value);
      if (rule.target !== 'query_params') return stripTrailingSlash(target) === stripTrailingSlash(value);
      return queryParamsEqual(search, value);
    }

    function queryParamsEqual(search, expectedQuery) {
      const actual = new URLSearchParams(search);
      const expected = new URLSearchParams('?' + expectedQuery);
      let ok = true;
      expected.forEach((v, k) => { if (actual.get(k) !== v) ok = false; });
      return ok;
    }
  }

  // Goal-side validator (separate, slightly different shape than mount-side).
  function validateUrlRulesForGoal({ advanced_url_rules, url }) {
    const currentUrl = window.location.href;
    if (!currentUrl) return false;
    const stripTrailingSlash = (s) => s.replace(/\/+$/, '');

    if (url) {
      debugLog('validateUrlRules url check', url, currentUrl);
      const hostPath = (h) => {
        const a = document.createElement('a');
        a.href = h;
        const host = a.hostname.replace(/^www\./i, '');
        return (host + (a.pathname.endsWith('/') ? a.pathname : a.pathname + '/')).toLowerCase();
      };
      const cur = hostPath(currentUrl);
      const exp = hostPath(url);
      debugLog('validateUrlRules comparing', cur, exp);
      return cur === exp;
    }

    let parsed;
    try { parsed = new URL(currentUrl); }
    catch (e) { console.error('Invalid URL:', currentUrl); return false; }

    const stripPath = (p) => p.replace(/\/+$/, '') || '/';

    const evalRule = (rule) => {
      if (!rule || !rule.value) return false;
      let target;
      switch (rule.target) {
        case 'page_path':    target = parsed.pathname; break;
        case 'query_params': target = parsed.search.substring(1); break;
        default:             target = currentUrl;
      }
      switch (rule.operator) {
        case 'equals':
          return rule.target === 'page_path'
            ? stripPath(target) === stripPath(rule.value)
            : stripTrailingSlash(target) === stripTrailingSlash(rule.value);
        case 'contains':            return target.includes(rule.value);
        case 'does_not_contain':    return !target.includes(rule.value);
        case 'does_not_equal':
          return rule.target === 'page_path'
            ? stripPath(target) !== stripPath(rule.value)
            : stripTrailingSlash(target) !== stripTrailingSlash(rule.value);
        case 'starts_with':         return target.startsWith(rule.value);
        case 'does_not_start_with': return !target.startsWith(rule.value);
        case 'ends_with':           return target.endsWith(rule.value);
        case 'does_not_end_with':   return !target.endsWith(rule.value);
        case 'matches_regex':
          try { return new RegExp(rule.value).test(target); }
          catch (e) { debugLog(`Invalid regex pattern "${rule.value}": ${e.message}`); return false; }
        case 'does_not_match_regex':
          try { return !new RegExp(rule.value).test(target); }
          catch (e) { debugLog(`Invalid regex pattern "${rule.value}": ${e.message}`); return false; }
        default: return false;
      }
    };

    if (
      !advanced_url_rules ||
      typeof advanced_url_rules !== 'object' ||
      Array.isArray(advanced_url_rules) ||
      (!advanced_url_rules.include && !advanced_url_rules.exclude)
    ) {
      // Treat array as flat AND list.
      return Array.isArray(advanced_url_rules)
        ? advanced_url_rules.every(r => !r || !r.value || evalRule(r))
        : false;
    }

    const {
      include = [],
      exclude = [],
      includeLogicType = 'OR',
      excludeLogicType = 'OR',
    } = advanced_url_rules;

    const exFiltered = exclude.filter(r => r.value);
    if (exFiltered.length > 0) {
      if (excludeLogicType === 'AND') {
        if (exFiltered.every(r => evalRule(r))) {
          debugLog('URL matches all exclude rules (AND logic), experiment blocked');
          return false;
        }
      } else if (exFiltered.some(r => evalRule(r))) {
        debugLog('URL matches exclude rule, experiment blocked');
        return false;
      }
    }
    if (include.length === 0) return true;
    const inFiltered = include.filter(r => r.value);
    if (inFiltered.length === 0) return true;

    if (includeLogicType === 'AND') {
      const ok = inFiltered.every(r => evalRule(r));
      debugLog('Include rules check (AND logic):', ok);
      return ok;
    }
    const ok = inFiltered.some(r => evalRule(r));
    debugLog('Include rules check (OR logic):', ok);
    return ok;
  }

  // Picks legacy vs advanced based on shape.
  function matchUrlRules(exp) {
    if (!exp) return false;
    const isLegacyShape = (() => {
      const r = exp.advanced_url_rules;
      if (!r) return false;
      if (typeof r === 'object' && !Array.isArray(r) && (r.include || r.exclude)) {
        const sample = r.include?.[0] || r.exclude?.[0];
        if (sample && sample.type !== undefined && sample.url !== undefined) return true;
      }
      return false;
    })();

    if (isLegacyShape) return matchUrlRulesLegacy(exp);
    debugLog('validateUrlRules check: ', validateUrlRulesForGoal(exp));
    return validateUrlRulesForGoal(exp);
  }

  // ============================================================
  // Cross-domain detector — placeholder to mirror original
  // ============================================================
  function isCrossDomain(projectDomain) {
    if (!projectDomain) return false;
    try {
      const host = window.location.hostname.replace(/^www\./i, '');
      const proj = String(projectDomain).replace(/^www\./i, '');
      return host !== proj && !host.endsWith('.' + proj);
    } catch (e) { return false; }
  }

  // ============================================================
  // Mount experiments (AB type)
  // ============================================================
  function mountExperiments(experimentsList, onComplete = () => {}) {
    const projectDomain = experimentsList[0]?.project?.domain;
    if (isCrossDomain(projectDomain)) {
      const matching = experimentsList.filter(e => matchUrlRulesLegacy(e));
      if (matching.length === 0) {
        onComplete();
        debugLog('Cross domain detected and no experiments match URL target criteria. Skipping all experiments.', {
          projectDomain,
          currentHostname: window.location.hostname,
          experimentsChecked: experimentsList.length,
        });
        return;
      }
      debugLog('Cross domain detected but experiments match URL target criteria. Continuing to mount.', {
        projectDomain,
        currentHostname: window.location.hostname,
        matchingExperiments: matching.length,
        totalExperiments: experimentsList.length,
        matchingExperimentIds: matching.map(e => e.id),
      });
    }
    debugLog('lcdtm1 Running mountExperiments');

    const stellarData = getStellarData();
    if (!window.__stellar) window.__stellar = { experiments: {}, version: STELLAR_VERSION };

    let completedOnce = false;

    function applyAll() {
      experimentsList.forEach(exp => {
        if (mountedExperiments[exp.id]) {
          debugLog('Skipping already mounted experiment: ' + exp.id);
          return;
        }
        if (!checkTargetingRules(exp)) return;
        if (!matchUrlRules(exp)) {
          debugLog('Skipping experiment due to URL targeting rules:', exp);
          return;
        }
        debugLog('shouldTriggerExperiment PASSED!: ', exp);

        if (isInMutuallyExclusiveExperiment(exp)) {
          debugLog('Visitor already in mutually exclusive experiment:', exp);
          return;
        }
        if (!checkTrafficAllocation(exp)) {
          debugLog('Visitor excluded from traffic allocation:', exp);
          return;
        }

        const variantId = stellarData[exp.id] || exp.variant_to_use;
        const isExisting = !!stellarData[exp.id];

        window.__stellar.experiments[exp.id] = {
          id: exp.id,
          name: exp.name,
          type: exp.type,
          variant_id: variantId,
          variant_name: exp.variants.find(v => v.id === variantId)?.name,
          status: 'mounted',
        };

        debugLog('Variant to use: ', variantId);

        exp.variants.forEach(variant => {
          // Mark visualized if any global asset will affect the page.
          if (variant.global_css) {
            activeExperiments.find(e => e.experiment === exp.id).visualized = true;
            debugLog('global_css found! visualized is now true');
          }
          if (variant.global_js) {
            activeExperiments.find(e => e.experiment === exp.id).visualized = true;
            debugLog('global_js found! visualized is now true');
          }

          // Set up IntersectionObservers for each modification target.
          variant.modifications.forEach(mod => {
            const sel = (mod.modificationType === 'insert' || mod.anchorSelector)
              ? mod.anchorSelector
              : mod.selector;
            if (!sel) return;
            const els = document.querySelectorAll(sel);
            if (els.length === 0) return;
            const io = new IntersectionObserver(entries => {
              entries.forEach(entry => {
                if (entry.isIntersecting) {
                  const tracked = activeExperiments.find(e => e.experiment === exp.id);
                  if (tracked) {
                    tracked.visualized = true;
                    debugLog('experiment visualized!', tracked.visualized);
                  }
                  debugLog('disconnecting observer', activeExperiments);
                  io.disconnect();
                }
              });
            });
            els.forEach(el => io.observe(el));
          });

          if (variant.id !== variantId) return;

          debugLog('Matching variant found: ', variant);

          if (variant.global_css) {
            debugLog('global_css found: ', variant.global_css);
            const style = document.createElement('style');
            style.textContent = variant.global_css;
            document.head.appendChild(style);
          }
          if (variant.global_js) {
            debugLog('global_js found: ', variant.global_js);
            const script = document.createElement('script');
            script.textContent = variant.global_js;
            document.body.appendChild(script);
          }

          // Insertions vs in-place modifications.
          const insertions = variant.modifications.filter(m =>
            m.type === 'creation' || m.modificationType === 'insert' || m.anchorSelector
          );
          const modifications = variant.modifications.filter(m =>
            m.type !== 'creation' && m.modificationType !== 'insert' && !m.anchorSelector
          );

          insertions.forEach(ins => {
            if (ins.stellarId && document.querySelector(`[data-stellar-id="${ins.stellarId}"]`)) {
              debugLog(`Skipping insertion - element with stellar ID "${ins.stellarId}" already exists`);
              return;
            }
            const anchor = document.querySelector(ins.anchorSelector);
            if (!anchor) {
              sessionIssues.push({
                type: 'INSERTION',
                message: 'Anchor element not found for selector: ' + ins.anchorSelector,
              });
              return;
            }
            const mode = {
              after: 'afterend',
              before: 'beforebegin',
              prepend: 'afterbegin',
              append: 'beforeend',
              afterend: 'afterend',
              beforebegin: 'beforebegin',
              afterbegin: 'afterbegin',
              beforeend: 'beforeend',
            }[ins.insertionMode] || 'afterend';
            anchor.insertAdjacentHTML(mode, ins.outerHTML);
            debugLog(`✓ Inserted element ${mode} ${ins.anchorSelector}`);
          });

          modifications.forEach(mod => {
            if (mod.stellarId && document.querySelector(`[data-stellar-id="${mod.stellarId}"]`)) {
              debugLog(`Skipping modification - element with stellar ID "${mod.stellarId}" already exists`);
              return;
            }
            const els = document.querySelectorAll(mod.selector);
            debugLog('Modification target elements: ', els);
            if (els.length === 0) {
              sessionIssues.push({
                type: 'MODIFICATION',
                message: 'Element not found for selector: ' + mod.selector,
              });
              return;
            }
            let allOk = true;
            els.forEach(el => {
              if (!applyModification(el, mod, exp.id)) allOk = false;
            });
            if (allOk) {
              const tracked = activeExperiments.find(e => e.experiment === exp.id);
              if (tracked) tracked.visualized = true;
            }
          });

          modifications.forEach(mod => {
            if (mod.positionIndex !== undefined) applyPositionIndex(mod);
          });

          if (!isExisting) {
            stellarData[exp.id] = variant.id;
            setStellarData(stellarData);
          }
          mountedExperiments[exp.id] = true;
          activeExperiments.find(e => e.experiment === exp.id).experimentMounted = true;
        });
      });

      sendEvent('started');
    }

    function isInMutuallyExclusiveExperiment(exp) {
      const excluded = exp.advanced_settings?.excluded_experiments || [];
      if (excluded.length === 0) return false;
      const data = getStellarData();
      const conflict = excluded.some(id => data[id] !== undefined);
      if (conflict) {
        debugLog('Visitor already assigned to a mutually exclusive experiment, skipping experiment ' + exp.id);
      }
      return conflict;
    }

    let scheduleTimer;
    function schedule() {
      clearTimeout(scheduleTimer);
      scheduleTimer = setTimeout(() => {
        applyAll();
        if (onComplete && !completedOnce /* && pendingAsync.length === 0 */) {
          onComplete();
          completedOnce = true;
        }
      }, 10);
    }

    mutationObserver = new MutationObserver(mutations => {
      mutations.forEach(m => { if (m.addedNodes.length) schedule(); });
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    schedule();
  }

  // ============================================================
  // Click goals (delegated listeners)
  // ============================================================
  function setupClickGoals(experimentsList) {
    if (!window.__stellarClickGoalsSetup) window.__stellarClickGoalsSetup = new Set();

    experimentsList.forEach(exp => {
      if (!exp || !exp.goals) return;
      debugLog('-666- Mounting click goals for experiment: ', exp);

      exp.goals.forEach(goal => {
        if (goal.type !== 'CLICK' || !goal.selector) return;
        debugLog('-666- Goal selector: ', goal.selector);

        const setupKey = `${exp.id}-${goal.id}`;
        if (window.__stellarClickGoalsSetup.has(setupKey)) {
          debugLog('Delegated listener already exists for goal ' + goal.id);
          return;
        }
        window.__stellarClickGoalsSetup.add(setupKey);

        document.addEventListener('click', (e) => {
          const target = e.target;
          if (!target?.closest) return;
          const matched = target.closest(goal.selector);
          if (!matched) return;

          debugLog('-666- Click goal element matched:', matched, 'for selector:', goal.selector);
          const everMounted = wasEverMounted(exp.id);
          debugLog('-666- Has ever mounted: ', everMounted);
          debugLog('-666- Global is cross domain: ', crossDomainMode);
          if (!everMounted && !crossDomainMode) return;

          const tracked = activeExperiments.find(e => e.experiment === exp.id);
          if (!tracked) {
            debugLog(`Could not find active experiment run for ${exp.id} on click conversion.`);
            return;
          }
          tracked.converted = tracked.converted || goal.GoalExperiment.is_main;
          if (tracked.conversions.includes(goal.id)) {
            debugLog(`Click goal ${goal.id} already converted in this batch.`);
            return;
          }
          tracked.conversions.push(goal.id);
          debugLog('Click goal converted!', tracked);
          debounceEventSend('converted');
        }, true);

        debugLog(`Set up delegated click listener for goal ${goal.id} with selector: ${goal.selector}`);
      });
    });
  }

  // ============================================================
  // Fetch experiments and kick everything off
  // ============================================================
  function fetchAndMountExperiments() {
    return __awaiter(this, void 0, void 0, function* () {
      debugLog('fetchExperiments run! - ', hasFetchedExperiments);

      // Resolve API key — from script src first, else poll dataLayer up to 40x at 50ms.
      try {
        const MAX_TRIES = 40;
        const INTERVAL_MS = 50;
        apiKey = yield apiKeyFromScriptSrc
          ? Promise.resolve(apiKeyFromScriptSrc)
          : new Promise((resolve, reject) => {
              let tries = 0;
              const timer = setInterval(() => {
                tries++;
                const found = window?.dataLayer?.find(e => e.stellarApiKey)?.stellarApiKey;
                if (found) { clearInterval(timer); resolve(found); }
                else if (tries >= MAX_TRIES) {
                  clearInterval(timer);
                  reject(new Error('Failed to retrieve stellarApiKey from dataLayer'));
                }
              }, INTERVAL_MS);
            });
      } catch (e) {
        debugLog('Failed to resolve API key:', e);
      }

      if (!apiKey) {
        console.error('No API key found - skipping experiments fetch');
        removeAntiFlickerOverlay(3);
        return;
      }

      try {
        let experimentsArray;

        const cached = (function () {
          try {
            const raw = localStorage.getItem('stellar__cache');
            if (!raw) return null;
            const { experiments: cachedExps, timestamp } = JSON.parse(raw);
            return Date.now() - timestamp < 10_000 ? cachedExps : null;
          } catch (e) {
            console.error('Error getting stellar cache: ', e);
            return null;
          }
        })();
        debugLog('cachedExperiments!: ', cached);

        if (cached) {
          experimentsArray = cached;
          alwaysOnTracking = sessionStorage.getItem('stellar__alwaysOnTracking') === 'true';
          if (cached.length === 0 && !alwaysOnTracking) {
            debugLog('removeAntiFlickerOverlay 2');
            removeAntiFlickerOverlay(2);
            return;
          }
          debugLog('Using cached experiments');
        } else {
          const resp = yield fetch(`${EXPERIMENTS_URL}/${apiKey}?v=2`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          if (!resp.ok) throw new Error('HTTP error! status: ' + resp.status);
          const json = yield resp.json();
          if (Array.isArray(json)) {
            experimentsArray = json;
          } else {
            experimentsArray = json.experiments || [];
            if (json.settings) alwaysOnTracking = !!json.settings.alwaysOnTracking;
          }
        }

        debugLog('Experiments data retrieved: ', experimentsArray);
        debugLog('Always-on tracking: ', alwaysOnTracking);
        sessionStorage.setItem('stellar__alwaysOnTracking', alwaysOnTracking.toString());

        experiments = experimentsArray;
        activeExperiments = experimentsArray.map(exp => {
          const variant = getStellarData()[exp.id];
          const prior = activeExperiments.find(e => e.experiment === exp.id);
          return {
            experiment: exp.id,
            variant: variant || exp.variant_to_use,
            converted: prior?.converted || false,
            conversions: prior?.conversions || [],
            experimentMounted: activeExperiments.some(e => e.experiment === exp.id && e.experimentMounted),
            visualized: !exp.smart_trigger,
            goalType: exp.goal.type,
            goalElementUrl: exp.goal.url_match_value,
            goalUrlMatchType: exp.goal.url_match_type,
            goalUrlMatchValue: exp.goal.url_match_value,
          };
        });

        // Refresh cache.
        try {
          localStorage.setItem('stellar__cache', JSON.stringify({
            experiments: experiments,
            timestamp: Date.now(),
          }));
        } catch (e) {
          console.error('Error setting stellar cache: ', e);
        }

        debugLog('global__experimentsToMount', experiments);
        hasSubdomainTesting = experiments.some(e => e.project.subdomain_testing);
        if (hasSubdomainTesting) {
          debugLog('global__hasSubdomainTestingEnabled', hasSubdomainTesting);
          const domain = getRootDomain();
          if (domain) {
            const secure = window.location.protocol === 'https:' ? 'Secure;' : '';
            const expires = new Date();
            expires.setDate(expires.getDate() + 90);
            const cookie =
              `stellarVisitorId=${visitorId}; path=/; domain=.${domain}; ` +
              `expires=${expires.toUTCString()}; SameSite=Lax; ${secure}`;
            document.cookie = cookie;
            debugLog('cookie set', cookie);
          } else {
            debugLog('No domain found, skipping cookie set');
          }
        }

        const splitUrlExps = experiments.filter(e => e.type === 'SPLIT_URL');
        const abExps       = experiments.filter(e => e.type === 'AB');

        if (handleSplitUrlRedirects(splitUrlExps)) {
          debugLog('Split URL redirect initiated, stopping further processing for this page.');
          return;
        }

        mountExperiments(abExps, () => removeAntiFlickerOverlay(4));
        setupClickTracking();
        setTimeout(() => setupClickGoals(experiments), 100);

        if (alwaysOnTracking && activeExperiments.length === 0) {
          debugLog('Always-on tracking: sending started event (no experiments)');
          sendEvent('started');
        }
      } catch (e) {
        console.error('Error fetching experiments:', e);
        removeAntiFlickerOverlay(5);
      }
    });
  }

  // ============================================================
  // Page-visit goals
  // ============================================================
  function checkPageVisitGoals(tracked) {
    const exp = experiments.find(e => e.id === tracked.experiment);
    if (!exp || !exp.goals) {
      debugLog('Could not find full experiment data or goals for:', tracked.experiment);
      return [];
    }
    const pageVisitGoals = exp.goals.filter(g => g.type === 'PAGE_VISIT');
    debugLog('Checking Page Visit Goals: ', pageVisitGoals);
    const currentUrl = window.location.href;
    const matched = [];

    for (const goal of pageVisitGoals) {
      debugLog(`Checking goal ${goal.id} (${goal.name}) against URL: ${currentUrl}`);

      if (goal.url_rules) {
        // Evaluate url_rules using the same engine as URL targeting.
        const ruleResult = checkConversionUrlRulesMatch(currentUrl, goal.url_rules);
        if (ruleResult) {
          debugLog(`Goal ${goal.id} converted based on url_rules!`, goal.url_rules);
          matched.push(goal);
        }
      } else {
        debugLog(`Goal ${goal.id} has no URL rules to check.`);
      }
    }
    debugLog('Converted Page Visit Goals found:', matched);
    return matched;
  }

  // Goal-level URL rule matcher (inline in ge in the original).
  function checkConversionUrlRulesMatch(currentUrl, rules) {
    if (!rules) return undefined;

    const stripTrailingSlash = (s) => s.replace(/\/+$/, '');
    const stripPath = (s) => s.replace(/\/+$/, '') || '/';
    let parsed;
    try { parsed = new URL(currentUrl); }
    catch (e) {
      debugLog('Invalid URL in checkConversionUrlRulesMatch:', currentUrl);
      return undefined;
    }

    const evalRule = (rule) => {
      if (!rule || !rule.value) return false;
      let target;
      switch (rule.target) {
        case 'page_path':    target = parsed.pathname; break;
        case 'query_params': target = parsed.search.substring(1); break;
        default:             target = currentUrl;
      }
      switch (rule.operator) {
        case 'equals':
          return rule.target === 'page_path'
            ? stripPath(target) === stripPath(rule.value)
            : stripTrailingSlash(target) === stripTrailingSlash(rule.value);
        case 'contains':            return target.includes(rule.value);
        case 'does_not_contain':    return !target.includes(rule.value);
        case 'does_not_equal':
          return rule.target === 'page_path'
            ? stripPath(target) !== stripPath(rule.value)
            : stripTrailingSlash(target) !== stripTrailingSlash(rule.value);
        case 'starts_with':         return target.startsWith(rule.value);
        case 'does_not_start_with': return !target.startsWith(rule.value);
        case 'ends_with':           return target.endsWith(rule.value);
        case 'does_not_end_with':   return !target.endsWith(rule.value);
        case 'matches_regex':
          try { return new RegExp(rule.value).test(target); }
          catch (e) { debugLog(`Invalid regex pattern "${rule.value}": ${e.message}`); return false; }
        case 'does_not_match_regex':
          try { return !new RegExp(rule.value).test(target); }
          catch (e) { debugLog(`Invalid regex pattern "${rule.value}": ${e.message}`); return false; }
        default: return false;
      }
    };

    // Structured rules with include/exclude.
    const isStructured = typeof rules === 'object' && !Array.isArray(rules) && ('include' in rules || 'exclude' in rules);

    if (isStructured) {
      const {
        include = [],
        exclude = [],
        includeLogicType = 'OR',
        excludeLogicType = 'OR',
      } = rules;

      const exFiltered = exclude.filter(r => r.value);
      if (exFiltered.length > 0) {
        if (excludeLogicType === 'AND') {
          if (exFiltered.every(r => evalRule(r))) {
            debugLog('Goal conversion blocked by all exclude rules (AND logic)');
            return undefined;
          }
        } else if (exFiltered.some(r => evalRule(r))) {
          debugLog('Goal conversion blocked by exclude rule');
          return undefined;
        }
      }

      if (include.length === 0) return true;
      const inFiltered = include.filter(r => r.value);
      if (inFiltered.length === 0) return true;
      if (includeLogicType === 'AND') {
        const ok = inFiltered.every(r => evalRule(r));
        debugLog('Goal include rules check result (AND logic):', ok);
        return ok;
      }
      const ok = inFiltered.some(r => evalRule(r));
      debugLog('Goal include rules check result (OR logic):', ok);
      return ok;
    }

    // Legacy flat array of rules — must ALL match (AND).
    if (rules.length === 0) return undefined;
    return rules.every(rule => {
      if (!rule || !rule.value || rule.value.trim() === '') {
        debugLog('Invalid or empty rule found, treating as non-match:', rule);
        return false;
      }
      const value = rule.value;
      const type = rule.type?.toLowerCase();
      if (type === 'contains') {
        if (currentUrl.includes(value)) return true;
        debugLog(`URL rule check failed: URL "${currentUrl}" does not contain "${value}"`);
        return false;
      }
      if (type === 'exact') {
        if (stripTrailingSlash(currentUrl) === stripTrailingSlash(value)) return true;
        debugLog(`URL rule check failed: Normalized URL "${stripTrailingSlash(currentUrl)}" does not exactly match "${stripTrailingSlash(value)}"`);
        return false;
      }
      debugLog(`URL rule check failed: Unknown rule type "${type}"`);
      return false;
    });
  }

  // ============================================================
  // Track page visit (called on initial load and SPA navigations)
  // ============================================================
  function trackPageVisit() {
    debugLog('track page visit run! ', activeExperiments);
    const currentPage = window.location.pathname + window.location.search;

    visitedPages.push(currentPage);
    _trackedPages.clear(); // reset scroll-depth milestones per page

    if (shouldSendEvents()) {
      bufferInteractionEvent({
        event_name: 'navigation',
        ts: new Date().toISOString(),
        page_url: currentPage,
        referrer: document.referrer || '',
        viewport_w: window.innerWidth,
        viewport_h: window.innerHeight,
      });
    }

    debugLog('currentPage: ', currentPage);

    activeExperiments.forEach(tracked => {
      debugLog('foriching: ', tracked, checkPageVisitGoals(tracked));
      const convertedGoals = checkPageVisitGoals(tracked);
      if (convertedGoals.length > 0) {
        debugLog('convertedGoals! ', convertedGoals);
        debugLog('experiment.experiment: ', tracked.experiment);
        const everMounted = wasEverMounted(tracked.experiment);
        debugLog('hasEverMounted: ', everMounted);
        if (!everMounted) return;

        tracked.converted = convertedGoals.some(g => g.GoalExperiment.is_main);
        experiments.find(e => e.id === tracked.experiment); // side-effect lookup (original does this)
        convertedGoals.forEach(g => {
          if (tracked.conversions.includes(g.id)) {
            debugLog(`Page visit goal ${g.id} already converted in this batch.`);
          } else {
            tracked.conversions.push(g.id);
          }
        });
        debounceEventSend('converted');
      }
    });

    internalLinkClicked = false;
  }

  // ============================================================
  // Initialize __stellar.variables from URL query params
  // ============================================================
  function initStellarVariables() {
    if (!window.__stellar) window.__stellar = {};
    if (!window.__stellar.variables) window.__stellar.variables = {};
    new URLSearchParams(window.location.search).forEach((value, key) => {
      window.__stellar.variables[key] = value;
    });
    debugLog('Initialized __stellar.variables with URL parameters');
  }

  // ============================================================
  // Custom (programmatic) conversion — called via window.__stellar.conversion(goalId)
  // ============================================================
  function customConversion(goalId) {
    debugLog('Custom conversion triggered for goal ID:', goalId);
    const allExperiments = experiments || [];
    let didConvert = false;

    allExperiments.forEach(exp => {
      if (!exp || !exp.goals) return;
      const goal = exp.goals.find(g => g.id === goalId);
      if (!goal) return;
      if (!wasEverMounted(exp.id)) return;

      const tracked = activeExperiments.find(e => e.experiment === exp.id);
      if (!tracked) {
        debugLog(`Could not find active experiment run for ${exp.id} on custom conversion.`);
        return;
      }
      tracked.converted = tracked.converted || goal.GoalExperiment.is_main;
      if (tracked.conversions.includes(goalId)) {
        debugLog(`Goal ${goalId} already converted in this batch.`);
      } else {
        tracked.conversions.push(goalId);
        debugLog('Custom conversion applied!', tracked);
        didConvert = true;
      }
    });

    if (didConvert) {
      sendEvent('converted');
    } else {
      debugLog(`No experiments found with goal ID ${goalId} or no experiments mounted.`);
    }
  }

  // ============================================================
  // Cross-domain detection
  // ============================================================
  function isCrossDomain(projectDomain) {
    debugLog('lcdtm1 isCrossDomain', projectDomain, window.location.hostname,
      window.location.hostname.replace(/^www\./, ''));
    if (!projectDomain) {
      debugLog('lcdtm1 no domain, returning void');
      return undefined;
    }
    const result = projectDomain !== window.location.hostname.replace(/^www\./, '');
    debugLog('lcdtm1 we return ', result);
    crossDomainMode = result;
    return result;
  }

  // ============================================================
  // Split-URL redirect handler
  // ============================================================
  function handleSplitUrlRedirects(splitUrlExps) {
    // Cross-domain split URL: don't redirect, just mark as mounted if on variant URL.
    const projectDomain = splitUrlExps[0]?.project?.domain;
    if (isCrossDomain(projectDomain)) {
      debugLog('Cross domain split URL experiment detected', window.location.hostname);
      const stellarData = getStellarData();
      const currentUrl = window.location.href;

      for (const exp of splitUrlExps) {
        const variantId = stellarData[exp.id] || exp.variant_to_use;
        const variant = exp.variants.find(v => v.id === variantId);
        if (variant && variant.url && normalizeUrlPath(currentUrl) === normalizeUrlPath(variant.url)) {
          debugLog('On cross-domain variant URL, marking experiment as mounted:', exp.id);
          const tracked = activeExperiments.find(e => e.experiment === exp.id);
          if (tracked) {
            tracked.visualized = true;
            mountedExperiments[exp.id] = true;
            tracked.experimentMounted = true;
            debugLog('Cross-domain variant marked as mounted. expRun:', tracked);
          }
        }
      }
      return false; // no redirect, let bootstrap continue
    }

    debugLog('lcdtm1 Running mountSplitUrlExperiments');
    const stellarData = getStellarData();
    const currentUrl = window.location.href;
    let didRedirect = false;

    for (const exp of splitUrlExps) {
      debugLog('Processing split URL experiment:', exp.id);
      debugLog('Current URL:', currentUrl);

      if (mountedExperiments[exp.id]) {
        debugLog('Skipping already mounted split URL experiment: ' + exp.id);
        continue;
      }
      if (!checkTargetingRules(exp)) {
        debugLog('Experiment failed target rules check:', exp.id);
        continue;
      }
      if (!checkTrafficAllocation(exp)) {
        debugLog('Visitor excluded from traffic allocation:', exp);
        continue;
      }

      const storedVariantId = stellarData[exp.id];
      const variantId = storedVariantId || exp.variant_to_use;
      const variant = exp.variants.find(v => v.id === variantId);

      debugLog('Variant to use: ', variant);
      debugLog('storedVariantId:', storedVariantId);
      debugLog('Checking URL match - currentURL path:', normalizeUrlPath(currentUrl));
      debugLog('Checking URL match - variant URL path:', variant?.url ? normalizeUrlPath(variant.url) : 'N/A');

      if (!matchUrlRules(exp)) continue;

      // On control URL — check if redirect needed.
      debugLog('On control URL, checking if redirect needed');
      if (!storedVariantId) {
        debugLog('No stored variant ID, setting it');
        stellarData[exp.id] = variantId;
        setStellarData(stellarData);
      }

      if (variant && variant.url && variant.url !== exp.url) {
        // Redirect to variant URL.
        mountedExperiments[exp.id] = true;
        const tracked = activeExperiments.find(e => e.experiment === exp.id);
        if (tracked) { tracked.experimentMounted = true; tracked.visualized = true; }
        markVariantAssigned(exp.id, variantId, true);
        debugLog('Skipping pre-redirect started event - will send from variant page');

        const currentParsed = new URL(window.location.href);
        const redirectUrl = new URL(variant.url, currentParsed);

        // Check if variant is on a subdomain of the same root domain.
        const isSubdomainRedirect = (() => {
          try {
            return getRootDomain() === new URL(redirectUrl).hostname.split('.').slice(-2).join('.')
              && new URL(redirectUrl).hostname !== window.location.hostname;
          } catch (e) { debugLog('Error checking subdomain:', e); return false; }
        })();

        redirectUrl.searchParams.set('_stellarSplitUrl', 'true');
        redirectUrl.searchParams.set('_stellarVisitorStatus', isReturningVisitor.toString());
        redirectUrl.searchParams.set('_stellarExperimentId', exp.id.toString());

        const referrer = document.referrer || '';
        if (referrer) {
          redirectUrl.searchParams.set('_stellarReferrer', encodeURIComponent(referrer));
        }

        // For subdomain redirects, carry over visitor identity and assignment data.
        if (isSubdomainRedirect) {
          const encodedData = encodeURIComponent(JSON.stringify(stellarData));
          redirectUrl.searchParams.set('_stellarData', encodedData);
          redirectUrl.searchParams.set('_stellarVisitorId', visitorId);
          redirectUrl.searchParams.set('_stellarSessionId', sessionId);
        }

        // Carry over original URL params if the experiment says to.
        if (variant.preserve_url_params) {
          new URLSearchParams(window.location.search).forEach((val, key) => {
            if (!key.startsWith('_stellar')) redirectUrl.searchParams.set(key, val);
          });
        }

        const finalUrl = redirectUrl.toString();
        debugLog('Redirecting to variant URL with stellarData: ' + finalUrl);
        _kReserved = true;
        window.location.href = finalUrl;
        didRedirect = true;
        return didRedirect; // stop processing further experiments
      }

      // On control URL, variant URL === control URL (no redirect needed).
      debugLog('no redirect needed');
      if (variant && variant.url === exp.url) {
        debugLog('On control URL, marking as visualized');
        const tracked = activeExperiments.find(e => e.experiment === exp.id);
        if (tracked) {
          tracked.visualized = true;
          mountedExperiments[exp.id] = true;
          tracked.experimentMounted = true;
        }
        markVariantAssigned(exp.id, variantId);
        sendEvent('started');
      }

      // Already on variant URL — mark as mounted.
      if (variant && variant.url && normalizeUrlPath(currentUrl) === normalizeUrlPath(variant.url)) {
        debugLog('On variant URL, marking as visualized');
        debugLog('Experiment ID:', exp.id);
        debugLog('Current activeExperiments:', activeExperiments);
        const tracked = activeExperiments.find(e => e.experiment === exp.id);
        debugLog('Found expRun:', tracked);
        if (tracked) {
          debugLog('Setting experimentMounted to true for experiment:', exp.id);
          tracked.visualized = true;
          mountedExperiments[exp.id] = true;
          tracked.experimentMounted = true;
          debugLog('expRun after setting flags:', tracked);
        } else {
          debugLog('ERROR: Could not find experiment in activeExperiments!');
          debugLog('Experiment ID we are looking for:', exp.id);
          debugLog('All activeExperiments:', activeExperiments);
        }
        debugLog('activeExperiments after modifications:', activeExperiments);
        if (!storedVariantId) {
          stellarData[exp.id] = variantId;
          setStellarData(stellarData);
          markVariantAssigned(exp.id, variantId);
        }
        debugLog('About to send started event. activeExperiments state:', activeExperiments);
        sendEvent('started');
        debugLog('Sent started event for variant URL');
      }
    }
    return didRedirect;
  }

  // ============================================================
  // Shopify cart sync — maps stellarVisitorId into Shopify cart attributes
  // ============================================================
  let shopifyCartSynced = false;
  let shopifyVisitorMapped = false;

  function syncShopifyCart(force) {
    if (!window.Shopify) return;
    if (shopifyCartSynced && !force) return;

    try {
      const vid = getOrCreateVisitorId();
      const shopifyRoot = window.Shopify?.routes?.root || '/';
      const cartUrl = shopifyRoot + 'cart.js';

      fetch(cartUrl)
        .then(r => r.json())
        .then(cart => {
          if (!cart) return;

          // Map visitor to cart token on the Stellar backend.
          if (cart.token && !shopifyVisitorMapped && apiKey) {
            fetch(API_BASE + '/public/shopify/map-visitor', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ apiKey, cartToken: cart.token, visitorId: vid }),
              keepalive: true,
            })
              .then(() => { shopifyVisitorMapped = true; })
              .catch(() => {});
          }

          // Stamp stellar_visitor_id into Shopify cart attributes.
          if (cart.attributes?.stellar_visitor_id !== vid) {
            const updateUrl = shopifyRoot + 'cart/update.js';
            const attrs = typeof cart.attributes === 'object' && cart.attributes !== null
              ? cart.attributes
              : {};
            return fetch(updateUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                attributes: { ...attrs, stellar_visitor_id: vid },
              }),
            }).then(() => { shopifyCartSynced = true; });
          }
          shopifyCartSynced = true;
        })
        .catch(() => {});
    } catch (e) {
      debugLog('Shopify cart sync error:', e);
    }
  }

  // ============================================================
  // Bootstrap & SPA navigation handling
  // ============================================================
  debugLog('inicializamos caca');
  if (!window.__stellar) window.__stellar = { experiments: {}, version: STELLAR_VERSION };

  // Process stellar parameters carried across redirects (subdomain split-URL).
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const paramStellarData      = urlParams.get('_stellarData');
    const paramVisitorId        = urlParams.get('_stellarVisitorId');
    const paramSessionId        = urlParams.get('_stellarSessionId');

    debugLog('URL Parameters at start:', Object.fromEntries(urlParams.entries()));
    let hadStellarParams = false;

    if (paramStellarData) {
      debugLog('Found stellarData in URL parameters:', paramStellarData);
      setStellarData(JSON.parse(decodeURIComponent(paramStellarData)));
      hadStellarParams = true;
    }
    if (paramVisitorId) {
      debugLog('Found visitorId in URL parameters:', paramVisitorId);
      localStorage.setItem('stellarVisitorId', paramVisitorId);
      if (hasSubdomainTesting) {
        try {
          const domain = getRootDomain();
          if (domain) {
            const expires = new Date();
            expires.setDate(expires.getDate() + 90);
            const secure = window?.location?.protocol === 'https:' ? 'Secure;' : '';
            document.cookie =
              `stellarVisitorId=${paramVisitorId}; domain=.${domain}; path=/; ` +
              `expires=${expires.toUTCString()}; SameSite=Lax; ${secure}`;
            debugLog('Set stellarVisitorId cookie from URL parameter');
          }
        } catch (e) {
          debugLog('Error setting stellarVisitorId cookie from URL parameter:', e);
        }
      }
      hadStellarParams = true;
    }
    if (paramSessionId && sessionStorage.getItem('stellar_session')) {
      debugLog('Found sessionId in URL parameters:', paramSessionId);
      try {
        const sess = JSON.parse(sessionStorage.getItem('stellar_session'));
        sess.id = paramSessionId;
        sessionStorage.setItem('stellar_session', JSON.stringify(sess));
        debugLog('Updated sessionId from URL parameter');
      } catch (e) {
        debugLog('Error updating sessionId from URL parameter:', e);
      }
      hadStellarParams = true;
    }

    // Clean all _stellar* params from the visible URL.
    let didCleanParams = false;
    const allKeys = Array.from(urlParams.keys());
    debugLog('Parameters before cleanup:', allKeys);

    ['_stellarData', '_stellarVisitorId', '_stellarSessionId',
     '_stellarSplitUrl', '_stellarVisitorStatus', '_stellarExperimentId',
     '_stellarReferrer'].forEach(key => {
      if (urlParams.has(key)) {
        urlParams.delete(key);
        didCleanParams = true;
        debugLog(`Removed ${key} parameter`);
      }
    });
    // Catch any remaining _stellar* params.
    allKeys.forEach(key => {
      if (key.startsWith('_stellar') && urlParams.has(key)) {
        debugLog('Removing parameter: ' + key);
        urlParams.delete(key);
        didCleanParams = true;
      }
    });
    debugLog('Parameters after cleanup:', Array.from(urlParams.keys()));

    if (didCleanParams) {
      const cleanUrl = window.location.pathname
        + (urlParams.toString() ? '?' + urlParams.toString() : '')
        + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
      debugLog('Cleaned stellar parameters from URL');
    }
  } catch (e) {
    debugLog('Error processing stellar parameters from URL:', e);
  }

  // Expose public API.
  initStellarVariables();
  if (!window.__stellar.utils) window.__stellar.utils = {};
  window.__stellar.utils.repositionElement = applyPositionIndex;
  window.__stellar.conversion = customConversion;

  if (stellarMode === 'true') {
    // Editor mode — expose helpers but don't run the experiment runtime.
    window.stellarUtils = {
      initializeStellarVariables: initStellarVariables,
      replaceKeywordsWithVars: interpolateTemplate,
      repositionElement: applyPositionIndex,
    };
  } else {
    // ── Normal runtime ──

    // Restore state from a prior same-site navigation (internal link click).
    function onDomReady() {
      const cached = sessionStorage.getItem('stellarSessionData');
      if (cached) {
        const {
          timeOnPage: t, clickCount: c, scrollDepth: s,
          activeExperiments: ae, visitedPages: vp, hasFetchedExperiments: hf,
        } = JSON.parse(cached);
        timeOnPage = t;
        clickCount = c;
        scrollDepth = s;
        activeExperiments = ae;
        visitedPages.push(...vp);
        hasFetchedExperiments = hf;
      }

      // SPA navigation detection — intercept pushState/replaceState/popstate.
      const origPushState    = history.pushState;
      const origReplaceState = history.replaceState;

      function onSpaNavigation() {
        mountedExperiments = {};
        if (experiments) {
          const splitUrlExps = experiments.filter(e => e.type === 'SPLIT_URL');
          const abExps       = experiments.filter(e => e.type === 'AB');
          handleSplitUrlRedirects(splitUrlExps);
          mountExperiments(abExps);
          setupClickGoals(experiments);
        }
      }

      history.pushState = function () {
        debugLog('Stellar: pushState called');
        origPushState.apply(this, arguments);
        setTimeout(() => { debugLog('Stellar: pushState timeout triggered'); trackPageVisit(); onSpaNavigation(); }, 50);
      };
      history.replaceState = function () {
        debugLog('Stellar: replaceState called');
        origReplaceState.apply(this, arguments);
        setTimeout(() => { debugLog('Stellar: replaceState timeout triggered'); trackPageVisit(); onSpaNavigation(); }, 50);
      };
      ['popstate', 'locationchange'].forEach(evt => {
        window.addEventListener(evt, () => {
          debugLog(`Stellar: ${evt} triggered`);
          setTimeout(() => { trackPageVisit(); onSpaNavigation(); }, 50);
        });
      });

      // Watch for URL changes via DOM mutations (catch-all for frameworks
      // that don't use pushState/replaceState).
      let lastHref = window.location.href;
      new MutationObserver(() => {
        if (lastHref !== window.location.href) {
          debugLog('Stellar: URL changed from observer:', lastHref, 'to', window.location.href);
          lastHref = window.location.href;
          window.dispatchEvent(new Event('locationchange'));
        }
      }).observe(document, { subtree: true, childList: true });
    }

    // Time-on-page counter — increments every second.
    setInterval(() => { timeOnPage += 1; }, 1000);

    // Click heatmap.
    setupClickTracking();

    // Scroll depth tracking with milestone thresholds.
    const scrollMilestones = [25, 50, 75, 90, 100];
    document.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      const viewportH = window.innerHeight;
      const docH = document.documentElement.scrollHeight;
      const pct = Math.floor(((scrollY + viewportH) / docH) * 100);
      scrollDepth = Math.max(scrollDepth, pct);

      if (!shouldSendEvents()) return;
      for (const milestone of scrollMilestones) {
        if (pct >= milestone && !_trackedPages.has(milestone)) {
          _trackedPages.add(milestone);
          bufferInteractionEvent({
            event_name: 'scroll_depth',
            ts: new Date().toISOString(),
            page_url: window.location.pathname + window.location.search,
            scroll_percent: milestone,
            viewport_w: window.innerWidth,
            viewport_h: viewportH,
            scroll_y: Math.round(scrollY),
          });
        }
      }
    });

    // Core lifecycle.
    setupBeforeUnload();
    fetchAndMountExperiments();

    // Shopify integration.
    setTimeout(syncShopifyCart, 1500);
    if (window.Shopify) {
      // Intercept fetch calls to Shopify cart endpoints to re-sync.
      const origFetch = window.fetch;
      window.fetch = function (...args) {
        const result = origFetch.apply(this, args);
        try {
          const url = typeof args[0] === 'string' ? args[0]
            : args[0] instanceof Request ? args[0].url : '';
          if (/\/cart\/(add|change|update|clear)(\.js|\.json)?(\?|$)/i.test(url)) {
            result.then(() => { setTimeout(() => syncShopifyCart(true), 300); }).catch(() => {});
          }
        } catch (e) {}
        return result;
      };

      // Intercept XMLHttpRequest.open for Shopify cart endpoints.
      const origXhrOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        const urlStr = String(url);
        if (/\/cart\/(add|change|update|clear)(\.js|\.json)?(\?|$)/i.test(urlStr)) {
          this.addEventListener('load', () => { setTimeout(() => syncShopifyCart(true), 300); });
        }
        return origXhrOpen.apply(this, [method, url, ...rest]);
      };
    }

    // Periodic interaction buffer flush (every 10 seconds).
    setInterval(() => {
      if (interactionBuffer.length > 0) flushInteractionBuffer();
    }, 10_000);

    // Kick off once DOM is ready.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onDomReady);
    } else {
      onDomReady();
    }
  }
})();
