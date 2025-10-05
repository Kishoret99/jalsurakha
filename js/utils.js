/* Utility Functions - Core helper functions */

// DOM Utility Functions
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) =>
  Array.from(parent.querySelectorAll(selector));

// Event Utility Functions
const on = (element, event, handler, options = {}) => {
  if (typeof element === "string") {
    element = $(element);
  }
  if (element) {
    element.addEventListener(event, handler, options);
  }
};

const off = (element, event, handler, options = {}) => {
  if (typeof element === "string") {
    element = $(element);
  }
  if (element) {
    element.removeEventListener(event, handler, options);
  }
};

const once = (element, event, handler) => {
  on(element, event, handler, { once: true });
};

// Delegate event handling
const delegate = (parent, selector, event, handler) => {
  on(parent, event, (e) => {
    const target = e.target.closest(selector);
    if (target) {
      handler.call(target, e);
    }
  });
};

// DOM Manipulation Utilities
const createElement = (tag, attributes = {}, children = []) => {
  const element = document.createElement(tag);

  Object.entries(attributes).forEach(([key, value]) => {
    if (key === "className") {
      element.className = value;
    } else if (key === "innerHTML") {
      element.innerHTML = value;
    } else if (key === "textContent") {
      element.textContent = value;
    } else if (key.startsWith("data-")) {
      element.setAttribute(key, value);
    } else {
      element[key] = value;
    }
  });

  children.forEach((child) => {
    if (typeof child === "string") {
      element.appendChild(document.createTextNode(child));
    } else {
      element.appendChild(child);
    }
  });

  return element;
};

const addClass = (element, ...classes) => {
  if (typeof element === "string") {
    element = $(element);
  }
  if (element) {
    element.classList.add(...classes);
  }
};

const removeClass = (element, ...classes) => {
  if (typeof element === "string") {
    element = $(element);
  }
  if (element) {
    element.classList.remove(...classes);
  }
};

const toggleClass = (element, className, force) => {
  if (typeof element === "string") {
    element = $(element);
  }
  if (element) {
    return element.classList.toggle(className, force);
  }
};

const hasClass = (element, className) => {
  if (typeof element === "string") {
    element = $(element);
  }
  return element ? element.classList.contains(className) : false;
};

// Animation Utilities
const animate = (element, keyframes, options = {}) => {
  if (typeof element === "string") {
    element = $(element);
  }
  if (element && element.animate) {
    return element.animate(keyframes, {
      duration: 300,
      easing: "ease-out",
      fill: "forwards",
      ...options,
    });
  }
};

const fadeIn = (element, duration = 300) => {
  if (typeof element === "string") {
    element = $(element);
  }
  if (element) {
    element.style.opacity = "0";
    element.style.display = "block";
    return animate(element, [{ opacity: 0 }, { opacity: 1 }], { duration });
  }
};

const fadeOut = (element, duration = 300) => {
  if (typeof element === "string") {
    element = $(element);
  }
  if (element) {
    const animation = animate(element, [{ opacity: 1 }, { opacity: 0 }], {
      duration,
    });

    if (animation) {
      animation.addEventListener("finish", () => {
        element.style.display = "none";
      });
    }

    return animation;
  }
};

const slideDown = (element, duration = 300) => {
  if (typeof element === "string") {
    element = $(element);
  }
  if (element) {
    const height = element.scrollHeight;
    element.style.height = "0";
    element.style.overflow = "hidden";
    element.style.display = "block";

    return animate(element, [{ height: "0px" }, { height: `${height}px` }], {
      duration,
    });
  }
};

const slideUp = (element, duration = 300) => {
  if (typeof element === "string") {
    element = $(element);
  }
  if (element) {
    const animation = animate(
      element,
      [{ height: `${element.offsetHeight}px` }, { height: "0px" }],
      { duration }
    );

    if (animation) {
      animation.addEventListener("finish", () => {
        element.style.display = "none";
        element.style.height = "";
        element.style.overflow = "";
      });
    }

    return animation;
  }
};

// Utility Functions
const debounce = (func, wait, immediate = false) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(this, args);
  };
};

const throttle = (func, limit) => {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Number Utilities
const clamp = (number, min, max) => Math.max(min, Math.min(number, max));

const lerp = (start, end, factor) => start * (1 - factor) + end * factor;

const map = (value, inMin, inMax, outMin, outMax) => {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
};

const randomBetween = (min, max) => Math.random() * (max - min) + min;

const roundTo = (number, decimals) => {
  const factor = Math.pow(10, decimals);
  return Math.round(number * factor) / factor;
};

// String Utilities
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

const kebabCase = (str) =>
  str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

const camelCase = (str) => str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

const truncate = (str, length, suffix = "...") => {
  if (str.length <= length) return str;
  return str.substring(0, length) + suffix;
};

// Array Utilities
const chunk = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

const shuffle = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const unique = (array) => [...new Set(array)];

// Object Utilities
const deepClone = (obj) => {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(deepClone);
  if (typeof obj === "object") {
    const cloned = {};
    Object.keys(obj).forEach((key) => {
      cloned[key] = deepClone(obj[key]);
    });
    return cloned;
  }
};

const merge = (target, ...sources) => {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        merge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return merge(target, ...sources);
};

const isObject = (item) =>
  item && typeof item === "object" && !Array.isArray(item);

// Storage Utilities
const storage = {
  set(key, value, expiry = null) {
    const data = {
      value,
      expiry: expiry ? Date.now() + expiry : null,
    };
    localStorage.setItem(key, JSON.stringify(data));
  },

  get(key) {
    try {
      const data = JSON.parse(localStorage.getItem(key));
      if (!data) return null;

      if (data.expiry && Date.now() > data.expiry) {
        localStorage.removeItem(key);
        return null;
      }

      return data.value;
    } catch {
      return null;
    }
  },

  remove(key) {
    localStorage.removeItem(key);
  },

  clear() {
    localStorage.clear();
  },
};

// URL Utilities
const getQueryParam = (param) => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
};

const setQueryParam = (param, value) => {
  const url = new URL(window.location);
  url.searchParams.set(param, value);
  window.history.pushState({}, "", url);
};

const removeQueryParam = (param) => {
  const url = new URL(window.location);
  url.searchParams.delete(param);
  window.history.pushState({}, "", url);
};

// Validation Utilities
const isEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

const isPhone = (phone) => {
  const regex = /^[\+]?[1-9][\d]{0,15}$/;
  return regex.test(phone.replace(/\s/g, ""));
};

const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
};

// Performance Utilities
const requestIdleCallback = (callback) => {
  if (window.requestIdleCallback) {
    return window.requestIdleCallback(callback);
  } else {
    return setTimeout(callback, 1);
  }
};

const cancelIdleCallback = (id) => {
  if (window.cancelIdleCallback) {
    window.cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
};

// Device Detection
const isMobile = () => {
  return (
    window.innerWidth <= 768 ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
  );
};

const isTouch = () => {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
};

const prefersReducedMotion = () => {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

// Scroll Utilities
const getScrollPosition = () => ({
  x: window.pageXOffset || document.documentElement.scrollLeft,
  y: window.pageYOffset || document.documentElement.scrollTop,
});

const scrollTo = (element, options = {}) => {
  if (typeof element === "string") {
    element = $(element);
  }

  if (element) {
    element.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
      inline: "nearest",
      ...options,
    });
  }
};

const isInViewport = (element, threshold = 0) => {
  if (typeof element === "string") {
    element = $(element);
  }

  if (!element) return false;

  const rect = element.getBoundingClientRect();
  const windowHeight =
    window.innerHeight || document.documentElement.clientHeight;
  const windowWidth = window.innerWidth || document.documentElement.clientWidth;

  return (
    rect.top >= -threshold &&
    rect.left >= -threshold &&
    rect.bottom <= windowHeight + threshold &&
    rect.right <= windowWidth + threshold
  );
};

// Export utilities for module usage
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    $,
    $$,
    on,
    off,
    once,
    delegate,
    createElement,
    addClass,
    removeClass,
    toggleClass,
    hasClass,
    animate,
    fadeIn,
    fadeOut,
    slideDown,
    slideUp,
    debounce,
    throttle,
    clamp,
    lerp,
    map,
    randomBetween,
    roundTo,
    capitalize,
    kebabCase,
    camelCase,
    truncate,
    chunk,
    shuffle,
    unique,
    deepClone,
    merge,
    isObject,
    storage,
    getQueryParam,
    setQueryParam,
    removeQueryParam,
    isEmail,
    isPhone,
    isEmpty,
    requestIdleCallback,
    cancelIdleCallback,
    isMobile,
    isTouch,
    prefersReducedMotion,
    getScrollPosition,
    scrollTo,
    isInViewport,
  };
}
