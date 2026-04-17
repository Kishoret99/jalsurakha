var __awaiter =
    (this && this.__awaiter) ||
    function (e, o, l, s) {
        return new (l = l || Promise)(function (r, t) {
            function n(e) {
                try {
                    a(s.next(e));
                } catch (e) {
                    t(e);
                }
            }
            function i(e) {
                try {
                    a(s.throw(e));
                } catch (e) {
                    t(e);
                }
            }
            function a(e) {
                var t;
                e.done
                    ? r(e.value)
                    : ((t = e.value) instanceof l
                        ? t
                        : new l(function (e) {
                            e(t);
                        })
                    ).then(n, i);
            }
            a((s = s.apply(e, o || [])).next());
        });
    };
!(function () {
    var e = new URLSearchParams(window.location.search);
    let M = e.get("stellarDebugging");
    var t = e.get("stellarLocalMode");
    let d = "11-11-2025";
    function v(...e) {
        M && console.log(...e);
    }
    function N() {
        try {
            var e = document.cookie
                .split(";")
                .find((e) => e.trim().startsWith("stellarVisitorId="));
            if (e) return e.split("=")[1];
        } catch (e) {
            v("Error getting cookie visitorId:", e);
        }
        return null;
    }
    function m() {
        try {
            return window.location.hostname.split(".").slice(-2).join(".");
        } catch (e) {
            v("Error getting domain:", e);
        }
        return null;
    }
    v("stellar version: " + d);
    let p = (function () {
        var e = Date.now(),
            t = localStorage.getItem("stellar_session");
        if (t) {
            v("hay storedSession", t);
            t = JSON.parse(t);
            if (e - t.lastActivity < 18e5)
                return (
                    v("session not expired, updating last activity"),
                    (t.lastActivity = e),
                    localStorage.setItem("stellar_session", JSON.stringify(t)),
                    t.id
                );
        }
        return (
            (t = { id: Math.random().toString(36).substr(2, 10), lastActivity: e }),
            localStorage.setItem("stellar_session", JSON.stringify(t)),
            v("no stored session, created new one: ", t.id),
            t.id
        );
    })(),
        g = (v("sessionId we got: ", p), "https://api.gostellar.app");
    t =
        "true" === t
            ? "http://localhost:3001/public/editorjs"
            : "https://api.gostellar.app/public/editorjs";
    v("EDITOR_URL", t);
    let P = "https://api.gostellar.app/public/experiments/client",
        j = e.get("stellarMode");
    if ("true" === j) {
        console.log("stellarMode is true loading editor");
        var r = document.createElement("script"),
            t = ((r.src = t), document.head.appendChild(r), e.get("experimentId"));
        if (t)
            try {
                fetch(g + "/public/snippet-page-ping", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ experimentId: t }),
                }).catch(function () { });
            } catch (e) { }
    }
    let h = [];
    r = new URL(document.currentScript.src);
    let V = new URLSearchParams(r.search).get("apiKey"),
        f = null,
        J = null,
        u = {},
        w = !1,
        _ = !1,
        n = !1,
        y = !1,
        x = null;
    e = new URLSearchParams(window.location.search);
    let S = "true" === e.get("_stellarSplitUrl");
    t = e.get("_stellarVisitorStatus");
    let W = e.get("_stellarReferrer");
    function b(e) {
        if (
            (v("removing anti flicker overlay", e), "function" == typeof window.rmo)
        )
            try {
                window.rmo();
            } catch (e) {
                console.error("Error executing rmo:", e);
            }
    }
    function I(e) {
        var t = document.createElement("a");
        return (
            (t.href = e),
            (t.pathname.endsWith("/") ? t.pathname : t.pathname + "/").toLowerCase()
        );
    }
    function E() {
        var e = localStorage.getItem("stellarData");
        if ((v("-666- getStellarData", e), _))
            try {
                var t = document.cookie
                    .split("; ")
                    .find((e) => e.startsWith("stellarData="));
                if (t) return (v("cookieStellarData", t), JSON.parse(t.split("=")[1]));
            } catch (e) {
                v("Error getting stellarData cookie: ", e);
            }
        return e ? JSON.parse(e) : {};
    }
    function R(e) {
        var t;
        if (
            (localStorage.setItem("stellarData", JSON.stringify(e)),
                v("setting stellarData", e, _),
                _)
        )
            try {
                var r,
                    n,
                    i = m();
                i &&
                    ((r = new Date()).setDate(r.getDate() + 90),
                        (n =
                            "https:" ===
                                (null ==
                                    (t =
                                        null === window || void 0 === window ? void 0 : window.location)
                                    ? void 0
                                    : t.protocol)
                                ? "Secure;"
                                : ""),
                        (document.cookie =
                            `stellarData=${JSON.stringify(e)}; domain=.${i}; path=/; expires=${r.toUTCString()}; SameSite=Lax; ` +
                            n));
            } catch (e) {
                v("Error setting stellarData cookie: ", e);
            }
    }
    function a(e) {
        return void 0 !== E()[e];
    }
    function H() {
        let e = localStorage.getItem("stellarVisitorId") || N();
        return (
            e ||
            ((e = "visitor_" + Date.now() + Math.random()),
                localStorage.setItem("stellarVisitorId", e)),
            e
        );
    }
    (sessionStorage.getItem("stellarSessionStarted")
        ? S && null !== t
            ? v(
                "Split URL redirect detected (same session), preserving visitor status: " +
                (w = "true" === t),
            )
            : (w = "true" === sessionStorage.getItem("stellarIsReturningVisitor"))
        : (sessionStorage.setItem("stellarSessionStarted", "true"),
            (r = N()),
            S && null !== t
                ? v(
                    "Split URL redirect detected, preserving visitor status: " +
                    (w = "true" === t),
                )
                : (w = !(
                    !localStorage.getItem("stellarVisitorId") &&
                    !r &&
                    (localStorage.setItem(
                        "stellarVisitorId",
                        "visitor_" + Date.now() + Math.random(),
                    ),
                        1)
                ))),
        sessionStorage.setItem("stellarIsReturningVisitor", w.toString()));
    let L = H(),
        k = 0,
        U = 0,
        $ = 0,
        T = [],
        C = [],
        D = [],
        G = 200;
    function s(e) {
        D.length < G && D.push(e);
    }
    function F() {
        if (0 !== D.length && c()) {
            var e = [...D],
                t =
                    ((D = []),
                        JSON.stringify({
                            visitorId: L,
                            sessionId: p,
                            activeExperiments: T,
                            apiKey: x,
                            eventType: "interaction_flush",
                            interactionEvents: e,
                            deviceType: oe(),
                            timestamp: new Date().toISOString(),
                        })),
                r = g + "/public/experiments/event";
            if (navigator.sendBeacon)
                if (navigator.sendBeacon(r, t))
                    return void v("Flushed interaction events via sendBeacon:", e.length);
            try {
                (fetch(r, { method: "POST", body: t, keepalive: !0 }).catch(() => { }),
                    v("Flushed interaction events via fetch:", e.length));
            } catch (e) { }
        }
    }
    let q = new Set(),
        z = !1,
        B = !1;
    function c() {
        return y || (T && 0 < T.length);
    }
    let K = !1,
        i = null,
        X = !1;
    function Y(e) {
        (i && clearTimeout(i),
            (i = setTimeout(() => {
                (O(e), (i = null));
            }, 1500)));
    }
    function Q(e) {
        return `stellar_split_assignment_sent_${p}_` + e;
    }
    function Z(t, e, r = !1) {
        var n;
        t &&
            e &&
            ((n = e),
                sessionStorage.getItem(Q(t)) === String(n)
                    ? v(
                        `Assignment already sent for experiment ${t}, variant ${e} in this session`,
                    )
                    : ((n = T.find((e) => e.experiment === t)) &&
                        ((n.experimentMounted = !0), (n.visualized = !0)),
                        (n = e),
                        sessionStorage.setItem(Q(t), String(n)),
                        O("assigned", r)));
    }
    function ee() {
        document.addEventListener("click", (e) => {
            var t, r, n;
            (U++,
                c() &&
                (t = e.target) &&
                ((r = window.innerWidth),
                    (n = window.innerHeight),
                    s({
                        event_name: "element_click",
                        ts: new Date().toISOString(),
                        page_url: window.location.pathname + window.location.search,
                        x: 0 < r ? Math.round((e.clientX / r) * 1e4) / 1e4 : 0,
                        y: 0 < n ? Math.round((e.clientY / n) * 1e4) / 1e4 : 0,
                        viewport_w: r,
                        viewport_h: n,
                        scroll_y: Math.round(window.scrollY),
                        element_tag: t.tagName || void 0,
                        selector_hash: (function (t) {
                            let r = 5381;
                            for (let e = 0; e < t.length; e++)
                                r = ((r << 5) + r + t.charCodeAt(e)) & 4294967295;
                            return r.toString(36);
                        })(
                            (function (e) {
                                if (e.id) return "#" + e.id;
                                let t = e.tagName.toLowerCase();
                                return (
                                    e.className &&
                                    "string" == typeof e.className &&
                                    (t +=
                                        "." +
                                        e.className.trim().split(/\s+/).slice(0, 3).join(".")),
                                    t
                                );
                            })(t),
                        ),
                        data: JSON.stringify({
                            id: t.id || void 0,
                            classes:
                                t.className && "string" == typeof t.className
                                    ? t.className.trim().split(/\s+/).slice(0, 5)
                                    : void 0,
                        }),
                    })));
        });
    }
    function O(l, s = !1) {
        if ("started" === l && X) v("BLOCKED: Started event already sent");
        else {
            ("started" === l && (X = !0),
                v("=== Sending Stellar event: ", l),
                v(
                    "=== ALL activeExperiments at send time:",
                    JSON.parse(JSON.stringify(T)),
                ));
            let o;
            if (
                ((o = n
                    ? (v("=== Cross domain mode - sending ALL experiments"), T)
                    : T.filter((e) => {
                        var t = a(e.experiment),
                            r =
                                e.experimentMounted ||
                                (t &&
                                    0 <
                                    (null == (r = null == e ? void 0 : e.conversions)
                                        ? void 0
                                        : r.length));
                        return (
                            v(
                                `=== Filter experiment ${e.experiment}: experimentMounted=${e.experimentMounted}, wasEverMounted=${t}, shouldSend=` +
                                r,
                            ),
                            r
                        );
                    })),
                    v("=== Final experimentsToSend:", JSON.parse(JSON.stringify(o))),
                    o.length || y)
            ) {
                let r = [],
                    n = new Set();
                h.forEach((e) => {
                    var t = e.type + "-" + e.message;
                    n.has(t) || (n.add(t), r.push(e));
                });
                var d = (function () {
                    try {
                        var t = new URLSearchParams(window.location.search),
                            r = JSON.parse(
                                sessionStorage.getItem("stellarTrackingData") || "{}",
                            );
                        let e = document.referrer || r.referrer || "";
                        S &&
                            null !== W &&
                            v(
                                "Split URL redirect detected, preserving original referrer: " +
                                (e = decodeURIComponent(W)),
                            );
                        var n = {
                            referrer: e,
                            isReturning: w,
                            utmCampaign: t.get("utm_campaign") || r.utmCampaign || "",
                            utmSource: t.get("utm_source") || r.utmSource || "",
                            utmMedium: t.get("utm_medium") || r.utmMedium || "",
                            utmTerm: t.get("utm_term") || r.utmTerm || "",
                            utmContent: t.get("utm_content") || r.utmContent || "",
                        };
                        return (
                            sessionStorage.setItem(
                                "stellarTrackingData",
                                JSON.stringify(n),
                            ),
                            n
                        );
                    } catch (e) {
                        return (
                            v("Error getting tracking data:", e),
                            {
                                referrer: "",
                                isReturning: !1,
                                utmCampaign: "",
                                utmSource: "",
                                utmMedium: "",
                                utmTerm: "",
                                utmContent: "",
                            }
                        );
                    }
                })(),
                    c = (function () {
                        try {
                            var e;
                            for (e of document.cookie.split(";")) {
                                var t = e.trim();
                                if (t.startsWith("_ga=")) {
                                    var r = t.substring(4).split(".");
                                    if (4 <= r.length)
                                        return r[r.length - 2] + "." + r[r.length - 1];
                                }
                            }
                            return (v("GA4 client_id not found in cookies"), null);
                        } catch (e) {
                            return (v("Error getting GA4 client_id:", e), null);
                        }
                    })(),
                    u = 0 < D.length ? [...D] : void 0,
                    m = Object.assign(
                        {
                            visitorId: L,
                            timeOnPage: k,
                            clickCount: U,
                            scrollDepth: $,
                            idempotencyKey: L + `_${l}_` + Date.now(),
                            activeExperiments: o,
                            visitedPages: C,
                            sessionIssues: r,
                            userAgent:
                                null ==
                                    (m =
                                        null === window || void 0 === window
                                            ? void 0
                                            : window.navigator)
                                    ? void 0
                                    : m.userAgent,
                            eventType: l,
                            timestamp: new Date().toISOString(),
                            sessionId: p,
                            deviceType: oe(),
                            country:
                                null == (m = window.__stellar.geoData) ? void 0 : m.countryCode,
                            apiKey: x,
                            ga4ClientId: c,
                            interactionEvents: u,
                        },
                        d,
                    );
                let e = JSON.stringify(m),
                    t = g + "/public/experiments/event",
                    i = () => {
                        ("converted" === l &&
                            T.forEach((e) => {
                                ((e.converted = !1), (e.conversions = []));
                            }),
                            "assigned" !== l && (D = []));
                    },
                    a = () => {
                        return (
                            !!navigator.sendBeacon &&
                            (v(`Trying sendBeacon fallback for ${l} event`),
                                v("Beacon URL: " + t),
                                v("Beacon payload length: " + e.length),
                                navigator.sendBeacon(t, e)
                                    ? (v(`Successfully sent ${l} event via sendBeacon fallback`),
                                        i(),
                                        !0)
                                    : (v(`sendBeacon fallback also failed for ${l} event`), !1))
                        );
                    };
                s
                    ? (v(`Using sendBeacon directly for ${l} event (page unload)`), a())
                    : (fetch(t, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: e,
                    })
                        .then((e) => {
                            (e.ok
                                ? (v(`Successfully sent ${l} event via fetch`), i)
                                : (v(`Fetch failed for ${l} event with status:`, e.status),
                                    a))();
                        })
                        .catch((e) => {
                            (v(`Fetch failed for ${l} event:`, e), a());
                        }),
                        (h = []),
                        v(
                            "activeExperiments after sending event and emptying conversions",
                            T,
                        ));
            }
        }
    }
    function te() {
        (window.addEventListener("beforeunload", () => {
            (i && (clearTimeout(i), (i = null)),
                T.some((e) => e.conversions && 0 < e.conversions.length) &&
                (v(
                    "Sending pending conversions before page unload with beacon fallback",
                ),
                    O("converted")),
                z || K
                    ? 0 < D.length && F()
                    : (v("Sending ended event using sendBeacon for reliable delivery"),
                        (0 < T.length || y) && O("ended", !0)));
        }),
            document.addEventListener("click", (e) => {
                var e = e.target;
                "A" === e.tagName &&
                    e.hostname === window.location.hostname &&
                    ((z = !0),
                        v(
                            "setting in cache",
                            (e = {
                                timeOnPage: k,
                                clickCount: U,
                                scrollDepth: $,
                                activeExperiments: T,
                                visitedPages: C,
                                hasFetchedExperiments: B,
                            }),
                        ),
                        sessionStorage.setItem("stellarSessionData", JSON.stringify(e)));
            }));
    }
    function re(t) {
        var r = document.querySelector(
            t.stellarId ? `[data-stellar-id="${t.stellarId}"]` : t.selector,
        );
        if (void 0 !== t.positionIndex && r) {
            var n = r.parentElement;
            if (n) {
                var t = t.positionIndex,
                    i = Array.from(n.children),
                    a = i.indexOf(r);
                if (a !== t) {
                    let e = null;
                    (t < i.length &&
                        (e = a <= t ? (t + 1 < i.length ? i[t + 1] : null) : i[t]),
                        n.removeChild(r),
                        n.insertBefore(r, e),
                        r.setAttribute("data-stellar-position", String(t)));
                }
            }
        }
    }
    var ne;
    let ie = [];
    function o(e) {
        var t;
        if (!e) return e;
        let n = (null == (t = window.__stellar) ? void 0 : t.variables) || {};
        return e.replace(/{{(.*?)}}/g, (e, t) => {
            var [t, r] = t.split("||").map((e) => e.trim());
            return void 0 !== n[t] ? n[t] : r || e;
        });
    }
    function ae(r, t) {
        if (t.js)
            try {
                (new Function("element", t.js)(r),
                    v("✓ Executed JS modification for element"));
            } catch (e) {
                console.error("Error executing JS modification:", e);
            }
        else if (
            (void 0 !== t.innerText && (r.innerText = o(t.innerText)),
                void 0 !== t.innerHTML && (r.innerHTML = o(t.innerHTML)),
                void 0 !== t.outerHTML)
        ) {
            var e = o(t.outerHTML);
            {
                var n = r;
                var i = document.createElement("div");
                i.innerHTML = e;
                let t = i.firstElementChild;
                t
                    ? n.tagName !== t.tagName
                        ? (v(
                            "Tag name changed, using outerHTML (event listeners will be lost)",
                        ),
                            (n.outerHTML = e))
                        : (Array.from(n.attributes).forEach((e) => {
                            t.hasAttribute(e.name) || n.removeAttribute(e.name);
                        }),
                            Array.from(t.attributes).forEach((e) => {
                                n.setAttribute(e.name, e.value);
                            }),
                            (n.innerHTML = t.innerHTML),
                            v("Applied changes while preserving event listeners"))
                    : (console.warn(
                        "Failed to parse new HTML, falling back to outerHTML",
                    ),
                        (n.outerHTML = e));
            }
        }
        return (
            void 0 !== t.cssText && (r.style.cssText = t.cssText),
            t.attributes &&
            Object.keys(t.attributes).forEach((e) => {
                void 0 !== t.attributes[e] && (r[e] = t.attributes[e]);
            }),
            t.stellarId &&
            !r.hasAttribute("data-stellar-id") &&
            r.setAttribute("data-stellar-id", t.stellarId),
            !0
        );
    }
    function oe() {
        var e =
            window.innerWidth ||
            document.documentElement.clientWidth ||
            document.body.clientWidth;
        return e <= 767
            ? "mobile"
            : e <= 1024
                ? "tablet"
                : ((e = navigator.userAgent.toLowerCase()),
                    /iphone|ipod|android.*mobile|windows.*phone|blackberry|bb\d+|meego|opera mini|avantgo|mobilesafari|docomo/i.test(
                        e,
                    )
                        ? "mobile"
                        : /(ipad|tablet|playbook|silk)|(android(?!.*mobile))/i.test(e)
                            ? "tablet"
                            : "desktop");
    }
    function le(e) {
        var t,
            r = E(),
            n = r[e.id];
        if ("excluded" !== n)
            return (
                n ||
                (0 !== (n = null != (n = e.traffic) ? n : 100)
                    ? 100 === n ||
                    ((t = 100 * Math.random()) < n
                        ? (v(
                            `Visitor included in ${n}% traffic allocation for experiment ${e.id} (rolled ${t.toFixed(2)})`,
                        ),
                            1)
                        : ((r[e.id] = "excluded"),
                            R(r),
                            void v(
                                `Visitor excluded from ${n}% traffic allocation for experiment ${e.id} (rolled ${t.toFixed(2)})`,
                            )))
                    : ((r[e.id] = "excluded"),
                        R(r),
                        void v(`Experiment ${e.id} has 0% traffic, excluding visitor`)))
            );
        v(`Visitor previously excluded from experiment ${e.id} traffic allocation`);
    }
    function se(e) {
        if (e.targetRules && e.targetRules.length) {
            var t = e.targetRules[0].rules;
            if (null != (r = t.device) && r.enabled) {
                var r = oe();
                if (!t.device.include.includes(r))
                    return void v(
                        `Experiment ${e.id} not mounted: device ${r} not in target list ` +
                        t.device.include,
                    );
            }
            if (null != (r = t.country) && r.enabled) {
                var r =
                    (null == (r = navigator.language.split("-")[1])
                        ? void 0
                        : r.toUpperCase()) || "";
                if (t.country.exclude.includes(r))
                    return void v(
                        `Experiment ${e.id} not mounted: country ${r} in exclude list`,
                    );
                if (0 < t.country.include.length && !t.country.include.includes(r))
                    return void v(
                        `Experiment ${e.id} not mounted: country ${r} not in include list`,
                    );
            }
            if (null != (r = t.visitor) && r.enabled) {
                if ("new" === t.visitor.type && w)
                    return void v(
                        `Experiment ${e.id} not mounted: visitor is returning but experiment targets new visitors`,
                    );
                if ("returning" === t.visitor.type && !w)
                    return void v(
                        `Experiment ${e.id} not mounted: visitor is new but experiment targets returning visitors`,
                    );
            }
        }
        return 1;
    }
    function de(i) {
        if (i.id < 1550) {
            var e = i;
            let t = window.location.href,
                r = (e) => e.replace(/\/+$/, "");
            if (e.url)
                return (
                    v("shouldMountExperimentForUrlOld", e.url, t),
                    I(t),
                    I(e.url),
                    I(t) === I(e.url)
                );
            if (e.advanced_url_rules) {
                var { exclude: a, include: o } = e.advanced_url_rules;
                if (0 < (null == a ? void 0 : a.length))
                    for (var n of a) {
                        if ("contains" === n.type && t.includes(n.url))
                            return (
                                v(
                                    `Experiment ${e.id} not mounted: URL matches exclude rule (contains) ` +
                                    n.url,
                                ),
                                !1
                            );
                        if ("exact" === n.type && r(t) === r(n.url))
                            return (
                                v(
                                    `Experiment ${e.id} not mounted: URL matches exclude rule (exact) ` +
                                    n.url,
                                ),
                                !1
                            );
                    }
                return 0 < (null == o ? void 0 : o.length)
                    ? o.some(
                        (e) =>
                            !("contains" !== e.type || !t.includes(e.url)) ||
                            ("exact" === e.type && r(t) === r(e.url)),
                    )
                    : !0;
            }
            return !0;
        }
        {
            let r = window.location.href,
                n = (e) => e.replace(/\/+$/, "");
            a = new URL(r);
            let l = a.pathname,
                s = a.search;
            if (i.url) return I(r) === I(i.url);
            if (i.advanced_url_rules) {
                var {
                    exclude: o,
                    include: t,
                    includeLogicType: d = "OR",
                    excludeLogicType: c = "OR",
                } = i.advanced_url_rules;
                if (0 < (null == o ? void 0 : o.length)) {
                    var u = o.filter((e) => e.value);
                    if (0 < u.length)
                        if ("AND" === c) {
                            if (u.every((e) => p(e)))
                                return (
                                    v(
                                        `Experiment ${i.id} not mounted: URL matches ALL exclude rules (AND logic)`,
                                    ),
                                    !1
                                );
                        } else
                            for (var m of u)
                                if (p(m))
                                    return (
                                        v(
                                            `Experiment ${i.id} not mounted: URL matches exclude rule (${m.operator || m.type}) "${m.value || m.url}" for target ` +
                                            (m.target || "full_url"),
                                        ),
                                        !1
                                    );
                }
                return 0 < (null == t ? void 0 : t.length)
                    ? 0 === (c = t.filter((e) => e.value)).length ||
                    ("AND" === d
                        ? ((u = c.every((e) => {
                            var t = p(e);
                            return (
                                t ||
                                v(
                                    `Rule check failed: ${e.operator || e.type} "${e.value}" for target "${e.target || "full_url"}"`,
                                ),
                                t
                            );
                        })) ||
                            v(
                                `Experiment ${i.id} not mounted: URL doesn't match all include rules (AND logic)`,
                            ),
                            u)
                        : c.some((e) => {
                            var t = p(e);
                            return (
                                t &&
                                v(
                                    `Experiment ${i.id} rule matched: ${e.operator || e.type} "${e.value}" for target "${e.target || "full_url"}"`,
                                ),
                                t
                            );
                        }))
                    : !0;
            }
            return !0;
            function p(e) {
                let t;
                var i = e.value;
                switch (e.target) {
                    case "path_only":
                    case "page_path":
                        t = l;
                        break;
                    case "query_params":
                        t = s.substring(1);
                        break;
                    default:
                        t = r;
                }
                if (e.operator)
                    switch (e.operator) {
                        case "equals":
                            if ("page_path" === e.target || "path_only" === e.target)
                                return n(t) === n(i);
                            if ("query_params" !== e.target) return n(t) === n(i);
                            {
                                let r = new URLSearchParams(s);
                                var a = new URLSearchParams("?" + i);
                                let n = !0;
                                return (
                                    a.forEach((e, t) => {
                                        r.get(t) !== e && (n = !1);
                                    }),
                                    n
                                );
                            }
                        case "contains":
                            return t.includes(i);
                        case "does_not_contain":
                            return !t.includes(i);
                        case "does_not_equal":
                            return ("page_path" !== e.target && e.target, n(t) !== n(i));
                        case "starts_with":
                            return t.startsWith(i);
                        case "does_not_start_with":
                            return !t.startsWith(i);
                        case "ends_with":
                            return t.endsWith(i);
                        case "does_not_end_with":
                            return !t.endsWith(i);
                        case "matches_regex":
                            try {
                                return new RegExp(i).test(t);
                            } catch (e) {
                                return (v(`Invalid regex pattern "${i}": ` + e.message), !1);
                            }
                        case "does_not_match_regex":
                            try {
                                return !new RegExp(i).test(t);
                            } catch (e) {
                                return (v(`Invalid regex pattern "${i}": ` + e.message), !1);
                            }
                        default:
                            return !1;
                    }
                if ("contains" === e.type) return t.includes(i);
                if ("exact" !== e.type) return !1;
                if ("path_only" === e.target) return n(t) === n(i);
                if ("query_params" !== e.target) return n(t) === n(i);
                {
                    let r = new URLSearchParams(s);
                    var o = new URLSearchParams("?" + i);
                    let n = !0;
                    return (
                        o.forEach((e, t) => {
                            r.get(t) !== e && (n = !1);
                        }),
                        n
                    );
                }
            }
        }
    }
    function ce({ advanced_url_rules: e, url: t }) {
        let r = window.location.href;
        if (!r) return !1;
        let n = (e) => e.replace(/\/+$/, "");
        if (t)
            return (
                v("validateUrlRules url check", t, r),
                v(
                    "validateUrlRules comparing",
                    (l = (s = (e) => {
                        var t = document.createElement("a"),
                            e = ((t.href = e), t.hostname.replace(/^www\./i, ""));
                        return (
                            e + (t.pathname.endsWith("/") ? t.pathname : t.pathname + "/")
                        ).toLowerCase();
                    })(r)),
                    (s = s(t)),
                ),
                l === s
            );
        let i;
        try {
            i = new URL(r);
        } catch (e) {
            return (console.error("Invalid URL:", r), !1);
        }
        let a = (e) => e.replace(/\/+$/, "") || "/",
            o = (t) => {
                if (!t || !t.value) return !1;
                let e;
                switch (t.target) {
                    case "page_path":
                        e = i.pathname;
                        break;
                    case "query_params":
                        e = i.search.substring(1);
                        break;
                    default:
                        e = r;
                }
                switch (t.operator) {
                    case "equals":
                        return "page_path" === t.target
                            ? a(e) === a(t.value)
                            : n(e) === n(t.value);
                    case "contains":
                        return e.includes(t.value);
                    case "does_not_contain":
                        return !e.includes(t.value);
                    case "does_not_equal":
                        return "page_path" === t.target
                            ? a(e) !== a(t.value)
                            : n(e) !== n(t.value);
                    case "starts_with":
                        return e.startsWith(t.value);
                    case "does_not_start_with":
                        return !e.startsWith(t.value);
                    case "ends_with":
                        return e.endsWith(t.value);
                    case "does_not_end_with":
                        return !e.endsWith(t.value);
                    case "matches_regex":
                        try {
                            return new RegExp(t.value).test(e);
                        } catch (e) {
                            return (
                                v(`Invalid regex pattern "${t.value}": ` + e.message),
                                !1
                            );
                        }
                    case "does_not_match_regex":
                        try {
                            return !new RegExp(t.value).test(e);
                        } catch (e) {
                            return (
                                v(`Invalid regex pattern "${t.value}": ` + e.message),
                                !1
                            );
                        }
                    default:
                        return !1;
                }
            };
        if (
            !e ||
            "object" != typeof e ||
            Array.isArray(e) ||
            (!e.include && !e.exclude)
        )
            return !!Array.isArray(e) && e.every((e) => !e || !e.value || o(e));
        var {
            include: t = [],
            exclude: l = [],
            includeLogicType: s = "OR",
            excludeLogicType: e = "OR",
        } = e;
        if (0 < l.length) {
            var l = l.filter((e) => e.value);
            if (0 < l.length)
                if ("AND" === e) {
                    if (l.every((e) => o(e)))
                        return (
                            v(
                                "URL matches all exclude rules (AND logic), experiment blocked",
                            ),
                            !1
                        );
                } else if (l.some((e) => o(e)))
                    return (v("URL matches exclude rule, experiment blocked"), !1);
        }
        return (
            !(0 < t.length) ||
            0 === (e = t.filter((e) => e.value)).length ||
            ("AND" === s
                ? (v("Include rules check (AND logic):", (l = e.every((e) => o(e)))), l)
                : (v("Include rules check (OR logic):", (t = e.some((e) => o(e)))), t))
        );
    }
    function ue(e) {
        return (
            e &&
            ((function (e) {
                var t;
                if (e && e.advanced_url_rules) {
                    e = e.advanced_url_rules;
                    if (
                        "object" == typeof e &&
                        !Array.isArray(e) &&
                        (e.include || e.exclude)
                    ) {
                        e =
                            (null == (t = e.include) ? void 0 : t[0]) ||
                            (null == (t = e.exclude) ? void 0 : t[0]);
                        if (e && void 0 !== e.type && void 0 !== e.url) return 1;
                    }
                }
            })(e)
                ? de
                : (v("validateUrlRules check: ", ce(e)), ce))(e)
        );
    }
    function me(e, t = () => { }) {
        var r =
            null == (r = null == (r = e[0]) ? void 0 : r.project) ? void 0 : r.domain;
        if (we(r)) {
            var n = e.filter((e) => de(e));
            if (0 === n.length)
                return (
                    t(),
                    void v(
                        "Cross domain detected and no experiments match URL target criteria. Skipping all experiments.",
                        {
                            projectDomain: r,
                            currentHostname: window.location.hostname,
                            experimentsChecked: e.length,
                        },
                    )
                );
            v(
                "Cross domain detected but experiments match URL target criteria. Continuing to mount.",
                {
                    projectDomain: r,
                    currentHostname: window.location.hostname,
                    matchingExperiments: n.length,
                    totalExperiments: e.length,
                    matchingExperimentIds: n.map((e) => e.id),
                },
            );
        }
        v("lcdtm1 Running mountExperiments");
        let o = E(),
            i =
                (window.__stellar ||
                    (window.__stellar = { experiments: {}, version: d }),
                    !1);
        function a() {
            (e.forEach((a) => {
                var e;
                if (u[a.id]) v("Skipping already mounted experiment: " + a.id);
                else if (se(a))
                    if (ue(a))
                        if (
                            (v("shouldTriggerExperiment PASSED!: ", a),
                                (function (e) {
                                    var r =
                                        (null == (r = e.advanced_settings)
                                            ? void 0
                                            : r.excluded_experiments) || [];
                                    if (0 !== r.length) {
                                        let t = E();
                                        r = r.some((e) => void 0 !== t[e]);
                                        return (
                                            r &&
                                            v(
                                                "Visitor already assigned to a mutually exclusive experiment, skipping experiment " +
                                                e.id,
                                            ),
                                            r
                                        );
                                    }
                                })(a))
                        )
                            v("Visitor already in mutually exclusive experiment:", a);
                        else if (le(a)) {
                            window.__stellar.experiments[a.id] = {
                                id: a.id,
                                name: a.name,
                                type: a.type,
                                variant_id: o[a.id] || a.variant_to_use,
                                variant_name:
                                    null ==
                                        (e = a.variants.find(
                                            (e) => e.id === (o[a.id] || a.variant_to_use),
                                        ))
                                        ? void 0
                                        : e.name,
                                status: "mounted",
                            };
                            let n = o[a.id],
                                i = n || a.variant_to_use;
                            (v("Variant to use: ", i),
                                a.variants.forEach((e) => {
                                    var t, r;
                                    ((t = e).global_css &&
                                        ((T.find((e) => e.experiment === a.id).visualized = !0),
                                            v("global_css found! visualized is now true")),
                                        t.global_js &&
                                        ((T.find((e) => e.experiment === a.id).visualized = !0),
                                            v("global_js found! visualized is now true")),
                                        t.modifications.forEach((e) => {
                                            e =
                                                "insert" === e.modificationType || e.anchorSelector
                                                    ? e.anchorSelector
                                                    : e.selector;
                                            if (e) {
                                                e = document.querySelectorAll(e);
                                                if (0 < e.length) {
                                                    let t = new IntersectionObserver((e) => {
                                                        e.forEach((e) => {
                                                            e.isIntersecting &&
                                                                ((e = T.find((e) => e.experiment === a.id)) &&
                                                                    ((e.visualized = !0),
                                                                        v("experiment visualized!", e.visualized)),
                                                                    v("disconnecting observer", T),
                                                                    t.disconnect());
                                                        });
                                                    });
                                                    e.forEach((e) => {
                                                        t.observe(e);
                                                    });
                                                }
                                            }
                                        }),
                                        e.id === i &&
                                        (v("Matching variant found: ", e),
                                            e.global_css &&
                                            (v("global_css found: ", e.global_css),
                                                ((t = document.createElement("style")).textContent =
                                                    e.global_css),
                                                document.head.appendChild(t)),
                                            e.global_js &&
                                            (v("global_js found: ", e.global_js),
                                                ((t = document.createElement("script")).textContent =
                                                    e.global_js),
                                                document.body.appendChild(t)),
                                            (t = e.modifications.filter(
                                                (e) =>
                                                    "creation" === e.type ||
                                                    "insert" === e.modificationType ||
                                                    e.anchorSelector,
                                            )),
                                            (r = e.modifications.filter(
                                                (e) =>
                                                    "creation" !== e.type &&
                                                    "insert" !== e.modificationType &&
                                                    !e.anchorSelector,
                                            )),
                                            t.forEach((e) => {
                                                if (
                                                    e.stellarId &&
                                                    document.querySelector(
                                                        `[data-stellar-id="${e.stellarId}"]`,
                                                    )
                                                )
                                                    return void v(
                                                        `Skipping insertion - element with stellar ID "${e.stellarId}" already exists`,
                                                    );
                                                var t,
                                                    r = document.querySelector(e.anchorSelector);
                                                r
                                                    ? ((t =
                                                        {
                                                            after: "afterend",
                                                            before: "beforebegin",
                                                            prepend: "afterbegin",
                                                            append: "beforeend",
                                                            afterend: "afterend",
                                                            beforebegin: "beforebegin",
                                                            afterbegin: "afterbegin",
                                                            beforeend: "beforeend",
                                                        }[e.insertionMode] || "afterend"),
                                                        r.insertAdjacentHTML(t, e.outerHTML),
                                                        v(`✓ Inserted element ${t} ` + e.anchorSelector))
                                                    : h.push({
                                                        type: "INSERTION",
                                                        message:
                                                            "Anchor element not found for selector: " +
                                                            e.anchorSelector,
                                                    });
                                            }),
                                            r.forEach((r) => {
                                                if (
                                                    r.stellarId &&
                                                    document.querySelector(
                                                        `[data-stellar-id="${r.stellarId}"]`,
                                                    )
                                                )
                                                    return void v(
                                                        `Skipping modification - element with stellar ID "${r.stellarId}" already exists`,
                                                    );
                                                var e = document.querySelectorAll(r.selector);
                                                if (
                                                    (v("Modification target elements: ", e), 0 < e.length)
                                                ) {
                                                    let t = !0;
                                                    (e.forEach((e) => {
                                                        ae(e, r, a.id) || (t = !1);
                                                    }),
                                                        t &&
                                                        (e = T.find((e) => e.experiment === a.id)) &&
                                                        (e.visualized = !0));
                                                } else
                                                    h.push({
                                                        type: "MODIFICATION",
                                                        message:
                                                            "Element not found for selector: " + r.selector,
                                                    });
                                            }),
                                            r.forEach((e) => {
                                                void 0 !== e.positionIndex && re(e);
                                            }),
                                            n || ((o[a.id] = e.id), R(o)),
                                            (u[a.id] = !0),
                                            (T.find((e) => e.experiment === a.id).experimentMounted =
                                                !0)));
                                }));
                        } else v("Visitor excluded from traffic allocation:", a);
                    else v("Skipping experiment due to URL targeting rules:", a);
            }),
                O("started"));
        }
        let l;
        function s() {
            (clearTimeout(l),
                (l = setTimeout(() => {
                    (a(), t && !i && 0 === ie.length && (t(), (i = !0)));
                }, 10)));
        }
        ((J = new MutationObserver((e) => {
            e.forEach((e) => {
                e.addedNodes.length && s();
            });
        })).observe(document.body, { childList: !0, subtree: !0 }),
            s());
    }
    function pe(e) {
        (window.__stellarClickGoalsSetup ||
            (window.__stellarClickGoalsSetup = new Set()),
            e.forEach((r) => {
                r &&
                    r.goals &&
                    (v("-666- Mounting click goals for experiment: ", r),
                        r.goals.forEach((t) => {
                            var e;
                            "CLICK" === t.type &&
                                t.selector &&
                                (v("-666- Goal selector: ", t.selector),
                                    (e = r.id + "-" + t.id),
                                    window.__stellarClickGoalsSetup.has(e)
                                        ? v("Delegated listener already exists for goal " + t.id)
                                        : (window.__stellarClickGoalsSetup.add(e),
                                            document.addEventListener(
                                                "click",
                                                function (e) {
                                                    var e = e.target;
                                                    e &&
                                                        e.closest &&
                                                        (e = e.closest(t.selector)) &&
                                                        (v(
                                                            "-666- Click goal element matched:",
                                                            e,
                                                            "for selector:",
                                                            t.selector,
                                                        ),
                                                            v("-666- Has ever mounted: ", (e = a(r.id))),
                                                            v("-666- Global is cross domain: ", n),
                                                            e || n) &&
                                                        ((e = T.find((e) => e.experiment === r.id))
                                                            ? ((e.converted =
                                                                e.converted || t.GoalExperiment.is_main),
                                                                e.conversions.includes(t.id)
                                                                    ? v(
                                                                        `Click goal ${t.id} already converted in this batch.`,
                                                                    )
                                                                    : (e.conversions.push(t.id),
                                                                        v("Click goal converted!", e),
                                                                        Y("converted")))
                                                            : v(
                                                                `Could not find active experiment run for ${r.id} on click conversion.`,
                                                            ));
                                                },
                                                !0,
                                            ),
                                            v(
                                                `Set up delegated click listener for goal ${t.id} with selector: ` +
                                                t.selector,
                                            )));
                        }));
            }));
    }
    function ve() {
        __awaiter(this, void 0, void 0, function* () {
            v("fetchExperiments run! - ", B);
            try {
                x =
                    ((a = 40),
                        (e = 50),
                        yield V
                            ? Promise.resolve(V)
                            : new Promise((t, r) => {
                                let n = 0,
                                    i = setInterval(() => {
                                        n += 1;
                                        var e =
                                            null ==
                                                (e =
                                                    null ==
                                                        (e =
                                                            null === window || void 0 === window
                                                                ? void 0
                                                                : window.dataLayer)
                                                        ? void 0
                                                        : e.find((e) => e.stellarApiKey))
                                                ? void 0
                                                : e.stellarApiKey;
                                        e
                                            ? (clearInterval(i), t(e))
                                            : n >= a &&
                                            (clearInterval(i),
                                                r(
                                                    new Error(
                                                        "Failed to retrieve stellarApiKey from dataLayer",
                                                    ),
                                                ));
                                    }, e);
                            }));
            } catch (e) {
                v("Failed to resolve API key:", e);
            }
            var a, e;
            if (x)
                try {
                    let e;
                    var t,
                        r,
                        n,
                        i = (function () {
                            try {
                                var e,
                                    t,
                                    r = localStorage.getItem("stellar__cache");
                                return r
                                    ? (({ experiments: e, timestamp: t } = JSON.parse(r)),
                                        Date.now() - t < 1e4 ? e : null)
                                    : null;
                            } catch (e) {
                                return (
                                    console.error("Error getting stellar cache: ", e),
                                    null
                                );
                            }
                        })();
                    if ((v("cachedExperiments!: ", i), i)) {
                        if (
                            ((e = i),
                                (y =
                                    "true" === sessionStorage.getItem("stellar__alwaysOnTracking")),
                                0 == i.length && !y)
                        )
                            return (v("removeAntiFlickerOverlay 2"), void b(2));
                        v("Using cached experiments");
                    } else {
                        var o = yield fetch(`${P}/${x}?v=2`, {
                            method: "GET",
                            headers: { "Content-Type": "application/json" },
                        });
                        if (!o.ok) throw new Error("HTTP error! status: " + o.status);
                        var l = yield o.json();
                        Array.isArray(l)
                            ? (e = l)
                            : ((e = l.experiments || []),
                                l.settings && (y = !!l.settings.alwaysOnTracking));
                    }
                    (v("Experiments data retrieved: ", e),
                        v("Always-on tracking: ", y),
                        sessionStorage.setItem("stellar__alwaysOnTracking", y.toString()),
                        (f = e),
                        (T = e.map((t) => {
                            var e = E()[t.id];
                            return {
                                experiment: t.id,
                                variant: e || t.variant_to_use,
                                converted:
                                    (null == (e = T.find((e) => e.experiment === t.id))
                                        ? void 0
                                        : e.converted) || !1,
                                conversions:
                                    (null == (e = T.find((e) => e.experiment === t.id))
                                        ? void 0
                                        : e.conversions) || [],
                                experimentMounted: T.some(
                                    (e) => e.experiment === t.id && e.experimentMounted,
                                ),
                                visualized: !t.smart_trigger,
                                goalType: t.goal.type,
                                goalElementUrl: t.goal.url_match_value,
                                goalUrlMatchType: t.goal.url_match_type,
                                goalUrlMatchValue: t.goal.url_match_value,
                            };
                        })));
                    var s = f;
                    try {
                        var d = { experiments: s, timestamp: Date.now() };
                        localStorage.setItem("stellar__cache", JSON.stringify(d));
                    } catch (e) {
                        console.error("Error setting stellar cache: ", e);
                    }
                    (v("global__experimentsToMount", f),
                        (_ = f.some((e) => e.project.subdomain_testing)) &&
                        (v("global__hasSubdomainTestingEnabled", _),
                            (t = m())
                                ? ((r = "https:" === window.location.protocol ? "Secure;" : ""),
                                    (n = new Date()).setDate(n.getDate() + 90),
                                    (document.cookie =
                                        `stellarVisitorId=${L}; path=/; domain=.${t}; expires=${n.toUTCString()}; SameSite=Lax; ` +
                                        r),
                                    v(
                                        "cookie set",
                                        `stellarVisitorId=${L}; path=/; domain=.${t}; expires=${n.toUTCString()}; SameSite=Lax; ` +
                                        r,
                                    ))
                                : v("No domain found, skipping cookie set")));
                    var c = f.filter((e) => "SPLIT_URL" === e.type),
                        u = f.filter((e) => "AB" === e.type);
                    _e(c)
                        ? v(
                            "Split URL redirect initiated, stopping further processing for this page.",
                        )
                        : (me(u, () => b(4)),
                            A(),
                            setTimeout(() => {
                                pe(f);
                            }, 100),
                            y &&
                            0 === T.length &&
                            (v(
                                "Always-on tracking: sending started event (no experiments)",
                            ),
                                O("started")));
                } catch (e) {
                    (console.error("Error fetching experiments:", e), b(5));
                }
            else
                (console.error("No API key found - skipping experiments fetch"), b(3));
        });
    }
    function ge(t) {
        var e = f.find((e) => e.id === t.experiment);
        if (!e || !e.goals)
            return (
                v("Could not find full experiment data or goals for:", t.experiment),
                []
            );
        var r,
            e = e.goals.filter((e) => "PAGE_VISIT" === e.type),
            n = (v("Checking Page Visit Goals: ", e), window.location.href),
            i = [];
        for (r of e)
            (v(`Checking goal ${r.id} (${r.name}) against URL: ` + n),
                r.url_rules
                    ? (function (n, e) {
                        if (!e) return;
                        let i = (e) => e.replace(/\/+$/, ""),
                            r = (e) => e.replace(/\/+$/, "") || "/",
                            a;
                        try {
                            a = new URL(n);
                        } catch (e) {
                            return void v(
                                "Invalid URL in checkConversionUrlRulesMatch:",
                                n,
                            );
                        }
                        let t = (t) => {
                            if (!t || !t.value) return !1;
                            let e;
                            switch (t.target) {
                                case "page_path":
                                    e = a.pathname;
                                    break;
                                case "query_params":
                                    e = a.search.substring(1);
                                    break;
                                default:
                                    e = n;
                            }
                            switch (t.operator) {
                                case "equals":
                                    return "page_path" === t.target
                                        ? r(e) === r(t.value)
                                        : i(e) === i(t.value);
                                case "contains":
                                    return e.includes(t.value);
                                case "does_not_contain":
                                    return !e.includes(t.value);
                                case "does_not_equal":
                                    return "page_path" === t.target
                                        ? r(e) !== r(t.value)
                                        : i(e) !== i(t.value);
                                case "starts_with":
                                    return e.startsWith(t.value);
                                case "does_not_start_with":
                                    return !e.startsWith(t.value);
                                case "ends_with":
                                    return e.endsWith(t.value);
                                case "does_not_end_with":
                                    return !e.endsWith(t.value);
                                case "matches_regex":
                                    try {
                                        return new RegExp(t.value).test(e);
                                    } catch (e) {
                                        return (
                                            v(`Invalid regex pattern "${t.value}": ` + e.message),
                                            !1
                                        );
                                    }
                                case "does_not_match_regex":
                                    try {
                                        return !new RegExp(t.value).test(e);
                                    } catch (e) {
                                        return (
                                            v(`Invalid regex pattern "${t.value}": ` + e.message),
                                            !1
                                        );
                                    }
                                default:
                                    return !1;
                            }
                        },
                            o =
                                "object" == typeof e &&
                                !Array.isArray(e) &&
                                ("include" in e || "exclude" in e);
                        {
                            if (o) {
                                var {
                                    include: l = [],
                                    exclude: s = [],
                                    includeLogicType: d = "OR",
                                    excludeLogicType: c = "OR",
                                } = e;
                                if (0 < s.length) {
                                    var s = s.filter((e) => e.value);
                                    if (0 < s.length)
                                        if ("AND" === c) {
                                            if (s.every((e) => t(e)))
                                                return void v(
                                                    "Goal conversion blocked by all exclude rules (AND logic)",
                                                );
                                        } else if (s.some((e) => t(e)))
                                            return void v(
                                                "Goal conversion blocked by exclude rule",
                                            );
                                }
                                return 0 < l.length
                                    ? 0 === (c = l.filter((e) => e.value)).length
                                        ? 1
                                        : "AND" === d
                                            ? (v(
                                                "Goal include rules check result (AND logic):",
                                                (s = c.every((e) => t(e))),
                                            ),
                                                s)
                                            : (v(
                                                "Goal include rules check result (OR logic):",
                                                (l = c.some((e) => t(e))),
                                            ),
                                                l)
                                    : 1;
                            }
                            return 0 !== (d = e).length
                                ? d.every((e) => {
                                    if (e && e.value && "" !== e.value.trim()) {
                                        var t = e.value,
                                            r = null == (r = e.type) ? void 0 : r.toLowerCase();
                                        if ("contains" === r)
                                            return (
                                                !!n.includes(t) ||
                                                (v(
                                                    `URL rule check failed: URL "${n}" does not contain "${t}"`,
                                                ),
                                                    !1)
                                            );
                                        if ("exact" === r)
                                            return (
                                                i(n) === i(t) ||
                                                (v(
                                                    `URL rule check failed: Normalized URL "${i(n)}" does not exactly match "${i(t)}"`,
                                                ),
                                                    !1)
                                            );
                                        v(`URL rule check failed: Unknown rule type "${r}"`);
                                    } else
                                        v(
                                            "Invalid or empty rule found, treating as non-match:",
                                            e,
                                        );
                                    return !1;
                                })
                                : void 0;
                        }
                    })(n, r.url_rules) &&
                    (v(`Goal ${r.id} converted based on url_rules!`, r.url_rules),
                        i.push(r))
                    : v(`Goal ${r.id} has no URL rules to check.`));
        return (v("Converted Page Visit Goals found:", i), i);
    }
    function A() {
        v("track page visit run! ", T);
        var e = window.location.pathname + window.location.search;
        (C.push(e),
            (q = new Set()),
            c() &&
            s({
                event_name: "navigation",
                ts: new Date().toISOString(),
                page_url: e,
                referrer: document.referrer || "",
                viewport_w: window.innerWidth,
                viewport_h: window.innerHeight,
            }),
            v("currentPage: ", e),
            T.forEach((t) => {
                v("foriching: ", t, ge(t));
                var e,
                    r = ge(t);
                0 < r.length &&
                    (v("convertedGoals! ", r),
                        v("experiment.experiment: ", t.experiment),
                        v("hasEverMounted: ", (e = a(t.experiment))),
                        e) &&
                    ((t.converted = r.some((e) => e.GoalExperiment.is_main)),
                        f.find((e) => e.id === t.experiment),
                        r.forEach((e) => {
                            t.conversions.includes(e.id)
                                ? v(`Page visit goal ${e.id} already converted in this batch.`)
                                : t.conversions.push(e.id);
                        }),
                        Y("converted"));
            }),
            (z = !1));
    }
    function he() {
        (window.__stellar || (window.__stellar = {}),
            window.__stellar.variables || (window.__stellar.variables = {}),
            new URLSearchParams(window.location.search).forEach((e, t) => {
                window.__stellar.variables[t] = e;
            }),
            v("Initialized __stellar.variables with URL parameters"));
    }
    function fe(n) {
        v("Custom conversion triggered for goal ID:", n);
        var e = f || [];
        let i = !1;
        (e.forEach((t) => {
            var e, r;
            t &&
                t.goals &&
                (e = t.goals.find((e) => e.id === n)) &&
                a(t.id) &&
                ((r = T.find((e) => e.experiment === t.id))
                    ? ((r.converted = r.converted || e.GoalExperiment.is_main),
                        r.conversions.includes(n)
                            ? v(`Goal ${n} already converted in this batch.`)
                            : (r.conversions.push(n),
                                v("Custom conversion applied!", r),
                                (i = !0)))
                    : v(
                        `Could not find active experiment run for ${t.id} on custom conversion.`,
                    ));
        }),
            i
                ? O("converted")
                : v(
                    `No experiments found with goal ID ${n} or no experiments mounted.`,
                ));
    }
    function we(e) {
        if (
            (v(
                "lcdtm1 isCrossDomain",
                e,
                window.location.hostname,
                window.location.hostname.replace(/^www\./, ""),
            ),
                e)
        )
            return (
                (e = e !== window.location.hostname.replace(/^www\./, "")),
                v("lcdtm1 we return ", (n = e)),
                e
            );
        v("lcdtm1 no domain, returning void");
    }
    function _e(t) {
        var e;
        if (
            we(
                null == (e = null == (e = t[0]) ? void 0 : e.project)
                    ? void 0
                    : e.domain,
            )
        ) {
            v("Cross domain split URL experiment detected", window.location.hostname);
            var n = E();
            let e = window.location.href;
            for (let r of t) {
                let t = n[r.id] || r.variant_to_use;
                var i = r.variants.find((e) => e.id === t);
                i &&
                    i.url &&
                    I(e) === I(i.url) &&
                    (v(
                        "On cross-domain variant URL, marking experiment as mounted:",
                        r.id,
                    ),
                        (i = T.find((e) => e.experiment === r.id))) &&
                    ((i.visualized = !0),
                        (u[r.id] = !0),
                        (i.experimentMounted = !0),
                        v("Cross-domain variant marked as mounted. expRun:", i));
            }
            return !1;
        }
        v("lcdtm1 Running mountSplitUrlExperiments");
        var a = E();
        let r = window.location.href,
            o = !1;
        for (let n of t)
            if (
                (v("Processing split URL experiment:", n.id),
                    v("Current URL:", r),
                    u[n.id])
            )
                v("Skipping already mounted split URL experiment: " + n.id);
            else if (se(n))
                if (le(n)) {
                    var l = a[n.id];
                    let t = l || n.variant_to_use;
                    var s = n.variants.find((e) => e.id === t);
                    if (
                        (v("Variant to use: ", s),
                            v("storedVariantId:", l),
                            v("Checking URL match - currentURL path:", I(r)),
                            v(
                                "Checking URL match - variant URL path:",
                                null != s && s.url ? I(s.url) : "N/A",
                            ),
                            ue(n))
                    ) {
                        if (
                            (v("On control URL, checking if redirect needed"),
                                l || (v("No stored variant ID, setting it"), (a[n.id] = t), R(a)),
                                s && s.url && s.url !== n.url)
                        ) {
                            u[n.id] = !0;
                            var d = T.find((e) => e.experiment === n.id),
                                d =
                                    (d && ((d.experimentMounted = !0), (d.visualized = !0)),
                                        Z(n.id, t, !0),
                                        v(
                                            "Skipping pre-redirect started event - will send from variant page",
                                        ),
                                        s.url,
                                        new URL(window.location.href));
                            let r = new URL(s.url, d);
                            var d = (() => {
                                try {
                                    return (
                                        m() ===
                                        new URL(r).hostname.split(".").slice(-2).join(".") &&
                                        new URL(r).hostname !== window.location.hostname
                                    );
                                } catch (e) {
                                    return (v("Error checking subdomain:", e), !1);
                                }
                            })(),
                                c =
                                    (r.searchParams.set("_stellarSplitUrl", "true"),
                                        r.searchParams.set("_stellarVisitorStatus", w.toString()),
                                        r.searchParams.set("_stellarExperimentId", n.id.toString()),
                                        document.referrer || "");
                            return (
                                c &&
                                r.searchParams.set("_stellarReferrer", encodeURIComponent(c)),
                                d &&
                                ((c = encodeURIComponent(JSON.stringify(a))),
                                    r.searchParams.set("_stellarData", c),
                                    r.searchParams.set("_stellarVisitorId", L),
                                    r.searchParams.set("_stellarSessionId", p)),
                                s.preserve_url_params &&
                                new URLSearchParams(window.location.search).forEach(
                                    (e, t) => {
                                        t.startsWith("_stellar") || r.searchParams.set(t, e);
                                    },
                                ),
                                v(
                                    "Redirecting to variant URL with stellarData: " +
                                    (d = r.toString()),
                                ),
                                (K = !0),
                                (window.location.href = d),
                                (o = !0)
                            );
                        }
                        (v("no redirect needed"),
                            s &&
                            s.url === n.url &&
                            (v("On control URL, marking as visualized"),
                                (c = T.find((e) => e.experiment === n.id)) &&
                                ((c.visualized = !0),
                                    (u[n.id] = !0),
                                    (c.experimentMounted = !0)),
                                Z(n.id, t),
                                O("started")));
                    }
                    s &&
                        s.url &&
                        I(r) === I(s.url) &&
                        (v("On variant URL, marking as visualized"),
                            v("Experiment ID:", n.id),
                            v("Current activeExperiments:", T),
                            v("Found expRun:", (d = T.find((e) => e.experiment === n.id))),
                            d
                                ? (v("Setting experimentMounted to true for experiment:", n.id),
                                    (d.visualized = !0),
                                    (u[n.id] = !0),
                                    (d.experimentMounted = !0),
                                    v("expRun after setting flags:", d))
                                : (v("ERROR: Could not find experiment in activeExperiments!"),
                                    v("Experiment ID we are looking for:", n.id),
                                    v("All activeExperiments:", T)),
                            v("activeExperiments after modifications:", T),
                            l || ((a[n.id] = t), R(a), Z(n.id, t)),
                            v("About to send started event. activeExperiments state:", T),
                            O("started"),
                            v("Sent started event for variant URL"));
                } else v("Visitor excluded from traffic allocation:", n);
            else v("Experiment failed target rules check:", n.id);
        return o;
    }
    (v("inicializamos caca"),
        window.__stellar || (window.__stellar = { experiments: {}, version: d }));
    try {
        let t = new URLSearchParams(window.location.search);
        var ye = t.get("_stellarData"),
            l = t.get("_stellarVisitorId"),
            xe = t.get("_stellarSessionId");
        v("URL Parameters at start:", Object.fromEntries(t.entries()));
        let e = !1;
        if (
            (ye &&
                (v("Found stellarData in URL parameters:", ye),
                    R(JSON.parse(decodeURIComponent(ye))),
                    (e = !0)),
                l)
        ) {
            if (
                (v("Found visitorId in URL parameters:", l),
                    localStorage.setItem("stellarVisitorId", l),
                    _)
            )
                try {
                    var Se,
                        be,
                        Ie = m();
                    Ie &&
                        ((Se = new Date()).setDate(Se.getDate() + 90),
                            (be =
                                "https:" ===
                                    (null ==
                                        (ne =
                                            null === window || void 0 === window ? void 0 : window.location)
                                        ? void 0
                                        : ne.protocol)
                                    ? "Secure;"
                                    : ""),
                            (document.cookie =
                                `stellarVisitorId=${l}; domain=.${Ie}; path=/; expires=${Se.toUTCString()}; SameSite=Lax; ` +
                                be),
                            v("Set stellarVisitorId cookie from URL parameter"));
                } catch (e) {
                    v("Error setting stellarVisitorId cookie from URL parameter:", e);
                }
            e = !0;
        }
        if (xe && sessionStorage.getItem("stellar_session")) {
            v("Found sessionId in URL parameters:", xe);
            try {
                var Ee = JSON.parse(sessionStorage.getItem("stellar_session"));
                ((Ee.id = xe),
                    sessionStorage.setItem("stellar_session", JSON.stringify(Ee)),
                    v("Updated sessionId from URL parameter"));
            } catch (e) {
                v("Error updating sessionId from URL parameter:", e);
            }
            e = !0;
        }
        let r = !1;
        var Re,
            Le = Array.from(t.keys());
        (v("Parameters before cleanup:", Le),
            t.has("_stellarData") &&
            (t.delete("_stellarData"),
                (r = !0),
                v("Removed _stellarData parameter")),
            t.has("_stellarVisitorId") &&
            (t.delete("_stellarVisitorId"),
                (r = !0),
                v("Removed _stellarVisitorId parameter")),
            t.has("_stellarSessionId") &&
            (t.delete("_stellarSessionId"),
                (r = !0),
                v("Removed _stellarSessionId parameter")),
            t.has("_stellarSplitUrl") &&
            (t.delete("_stellarSplitUrl"),
                (r = !0),
                v("Removed _stellarSplitUrl parameter")),
            t.has("_stellarVisitorStatus") &&
            (t.delete("_stellarVisitorStatus"),
                (r = !0),
                v("Removed _stellarVisitorStatus parameter")),
            t.has("_stellarExperimentId") &&
            (t.delete("_stellarExperimentId"),
                (r = !0),
                v("Removed _stellarExperimentId parameter")),
            t.has("_stellarReferrer") &&
            (t.delete("_stellarReferrer"),
                (r = !0),
                v("Removed _stellarReferrer parameter")),
            Le.forEach((e) => {
                e.startsWith("_stellar") &&
                    t.has(e) &&
                    (v("Removing parameter: " + e), t.delete(e), (r = !0));
            }),
            v("Parameters after cleanup:", Array.from(t.keys())),
            r &&
            ((Re =
                window.location.pathname +
                (t.toString() ? "?" + t.toString() : "") +
                window.location.hash),
                window.history.replaceState({}, document.title, Re),
                v("Cleaned stellar parameters from URL")),
            e);
    } catch (e) {
        v("Error processing stellar parameters from URL:", e);
    }
    if (
        (he(),
            window.__stellar.utils || (window.__stellar.utils = {}),
            (window.__stellar.utils.repositionElement = re),
            (window.__stellar.conversion = fe),
            "true" === j)
    )
        window.stellarUtils = {
            initializeStellarVariables: he,
            replaceKeywordsWithVars: o,
            repositionElement: re,
        };
    else {
        let o = !1,
            l = !1;
        function ke(e) {
            var t, r;
            if (window.Shopify && (!o || e))
                try {
                    let n = H(),
                        i =
                            (null == (r = null == (t = window.Shopify) ? void 0 : t.routes)
                                ? void 0
                                : r.root) || "/";
                    var a = i + "cart.js";
                    fetch(a)
                        .then((e) => e.json())
                        .then((e) => {
                            var t, r;
                            if (e) {
                                if (
                                    (e.token &&
                                        ((t = e.token), (r = n), !l) &&
                                        x &&
                                        t &&
                                        fetch(g + "/public/shopify/map-visitor", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                                apiKey: x,
                                                cartToken: t,
                                                visitorId: r,
                                            }),
                                            keepalive: !0,
                                        })
                                            .then(() => {
                                                l = !0;
                                            })
                                            .catch(() => { }),
                                        (null == (t = e.attributes)
                                            ? void 0
                                            : t.stellar_visitor_id) !== n)
                                )
                                    return (
                                        (r = i + "cart/update.js"),
                                        (e =
                                            "object" == typeof e.attributes && null !== e.attributes
                                                ? e.attributes
                                                : {}),
                                        fetch(r, {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                                attributes: Object.assign(Object.assign({}, e), {
                                                    stellar_visitor_id: n,
                                                }),
                                            }),
                                        }).then(() => {
                                            o = !0;
                                        })
                                    );
                                o = !0;
                            }
                        })
                        .catch(() => { });
                } catch (e) {
                    v("Shopify cart sync error:", e);
                }
        }
        function Ue() {
            var e, t, r, n, i, a;
            (a = sessionStorage.getItem("stellarSessionData")) &&
                (({
                    timeOnPage: a,
                    clickCount: e,
                    scrollDepth: t,
                    activeExperiments: r,
                    visitedPages: n,
                    hasFetchedExperiments: i,
                } = JSON.parse(a)),
                    (k = a),
                    (U = e),
                    ($ = t),
                    (T = r),
                    (C = n),
                    (B = i));
            {
                let e = history.pushState,
                    t = history.replaceState;
                function o() {
                    var e, t;
                    ((u = {}),
                        f &&
                        ((e = f.filter((e) => "SPLIT_URL" === e.type)),
                            (t = f.filter((e) => "AB" === e.type)),
                            _e(e),
                            me(t),
                            pe(f)));
                }
                ((history.pushState = function () {
                    (v("Stellar: pushState called"),
                        e.apply(this, arguments),
                        setTimeout(() => {
                            (v("Stellar: pushState timeout triggered"), A(), o());
                        }, 50));
                }),
                    (history.replaceState = function () {
                        (v("Stellar: replaceState called"),
                            t.apply(this, arguments),
                            setTimeout(() => {
                                (v("Stellar: replaceState timeout triggered"), A(), o());
                            }, 50));
                    }),
                    ["popstate", "locationchange"].forEach((e) => {
                        window.addEventListener(e, function () {
                            (v(`Stellar: ${e} triggered`),
                                setTimeout(() => {
                                    (A(), o());
                                }, 50));
                        });
                    }));
                let r = window.location.href;
                new MutationObserver(function (e) {
                    r !== window.location.href &&
                        (v(
                            "Stellar: URL changed from observer:",
                            r,
                            "to",
                            window.location.href,
                        ),
                            (r = window.location.href),
                            window.dispatchEvent(new Event("locationchange")));
                }).observe(document, { subtree: !0, childList: !0 });
            }
            (setInterval(() => {
                k += 1;
            }, 1e3),
                ee());
            {
                let a = [25, 50, 75, 90, 100];
                document.addEventListener("scroll", () => {
                    var e = window.scrollY,
                        t = window.innerHeight,
                        r = document.documentElement.scrollHeight,
                        n = Math.floor(((e + t) / r) * 100);
                    if ((($ = Math.max($, n)), c()))
                        for (var i of a)
                            n >= i &&
                                !q.has(i) &&
                                (q.add(i),
                                    s({
                                        event_name: "scroll_depth",
                                        ts: new Date().toISOString(),
                                        page_url: window.location.pathname + window.location.search,
                                        scroll_percent: i,
                                        viewport_w: window.innerWidth,
                                        viewport_h: t,
                                        scroll_y: Math.round(e),
                                    }));
                });
            }
            if ((te(), ve(), setTimeout(ke, 1500), window.Shopify)) {
                let n = window.fetch,
                    i =
                        ((window.fetch = function (...e) {
                            var t = n.apply(this, e);
                            try {
                                var r =
                                    "string" == typeof e[0]
                                        ? e[0]
                                        : e[0] instanceof Request
                                            ? e[0].url
                                            : "";
                                /\/cart\/(add|change|update|clear)(\.js|\.json)?(\?|$)/i.test(
                                    r,
                                ) &&
                                    t
                                        .then(() => {
                                            setTimeout(() => ke(!0), 300);
                                        })
                                        .catch(() => { });
                            } catch (e) { }
                            return t;
                        }),
                            XMLHttpRequest.prototype.open);
                XMLHttpRequest.prototype.open = function (e, t, ...r) {
                    var n = String(t);
                    return (
                        /\/cart\/(add|change|update|clear)(\.js|\.json)?(\?|$)/i.test(n) &&
                        this.addEventListener("load", () => {
                            setTimeout(() => ke(!0), 300);
                        }),
                        i.apply(this, [e, t, ...r])
                    );
                };
            }
            setInterval(() => {
                0 < D.length && F();
            }, 1e4);
        }
        "loading" === document.readyState
            ? document.addEventListener("DOMContentLoaded", Ue)
            : Ue();
    }
})();
