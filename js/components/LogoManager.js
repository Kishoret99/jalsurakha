/* Logo Manager Component - Handles logo loading and reuse */

class LogoManager {
  constructor() {
    this.logoCache = new Map();
    this.logoConfig = {
      main: {
        src: "assets/logo.svg",
        alt: "JalSuraksha Logo",
        width: 32,
        height: 32,
      },
      loading: {
        src: "assets/logo.svg",
        alt: "JalSuraksha Logo",
        width: 60,
        height: 60,
      },
    };

    this.init();
  }

  init() {
    this.preloadLogos();
    this.setupLazyLoading();
  }

  async preloadLogos() {
    // Preload logo SVGs for better performance
    const preloadPromises = Object.entries(this.logoConfig).map(
      ([key, config]) => {
        return this.preloadSVG(config.src).then((svg) => {
          this.logoCache.set(key, svg);
          return { key, svg };
        });
      }
    );

    try {
      await Promise.allSettled(preloadPromises);
      console.log("Logos preloaded successfully");
    } catch (error) {
      console.warn("Error preloading logos:", error);
    }
  }

  async preloadSVG(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(src);
      img.onerror = reject;
      img.src = src;
    });
  }

  setupLazyLoading() {
    // Set up intersection observer for lazy loading logos
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target;
              if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute("data-src");
                observer.unobserve(img);
              }
            }
          });
        },
        {
          rootMargin: "50px",
        }
      );

      // Observe all logo images with data-src
      const lazyLogos = $$('img[data-src*="logo"]');
      lazyLogos.forEach((img) => observer.observe(img));
    }
  }

  createLogo(type = "main", options = {}) {
    const config = this.logoConfig[type];
    if (!config) {
      console.error(`Logo type "${type}" not found`);
      return null;
    }

    const logoContainer = createElement("div", {
      className: "logo",
    });

    const iconContainer = createElement("div", {
      className: "logo-icon",
    });

    const img = createElement("img", {
      src: config.src,
      alt: config.alt,
      width: options.width || config.width,
      height: options.height || config.height,
      ...options.attributes,
    });

    iconContainer.appendChild(img);
    logoContainer.appendChild(iconContainer);

    if (options.showText !== false && type === "main") {
      const textElement = createElement("span", {
        className: "logo-text",
        textContent: "JalSuraksha",
      });
      logoContainer.appendChild(textElement);
    }

    return logoContainer;
  }

  createLoadingLogo(options = {}) {
    const config = this.logoConfig.loading;

    const container = createElement("div", {
      className: "water-drop",
    });

    const img = createElement("img", {
      src: config.src,
      alt: config.alt,
      width: options.width || config.width,
      height: options.height || config.height,
      ...options.attributes,
    });

    container.appendChild(img);
    return container;
  }

  // Replace existing logos with optimized versions
  replaceLogo(selector, type = "main", options = {}) {
    const element = typeof selector === "string" ? $(selector) : selector;
    if (!element) return false;

    const newLogo = this.createLogo(type, options);
    if (newLogo) {
      element.parentNode.replaceChild(newLogo, element);
      return true;
    }
    return false;
  }

  // Update logo source for better caching
  updateLogoSrc(type, newSrc) {
    if (this.logoConfig[type]) {
      this.logoConfig[type].src = newSrc;
      this.logoCache.delete(type); // Clear cache
      return this.preloadSVG(newSrc).then((svg) => {
        this.logoCache.set(type, svg);
      });
    }
    return Promise.reject(`Logo type "${type}" not found`);
  }

  // Get logo configuration
  getLogoConfig(type) {
    return this.logoConfig[type] || null;
  }

  // Optimize logo display based on device
  optimizeForDevice() {
    const isHighDPI = window.devicePixelRatio > 1;
    const isMobile = window.innerWidth <= 768;

    if (isHighDPI) {
      // Use higher resolution logos for high DPI displays
      $$(".logo-icon img").forEach((img) => {
        if (!img.style.imageRendering) {
          img.style.imageRendering = "crisp-edges";
        }
      });
    }

    if (isMobile) {
      // Slightly smaller logos on mobile
      $$(".logo-icon").forEach((icon) => {
        if (!icon.classList.contains("mobile-optimized")) {
          icon.style.width = "28px";
          icon.style.height = "28px";
          icon.classList.add("mobile-optimized");
        }
      });
    }
  }

  // Handle logo errors gracefully
  handleLogoError(img, fallbackText = "JalSuraksha") {
    img.style.display = "none";

    // Create fallback text logo
    const fallback = createElement("div", {
      className: "logo-fallback",
      textContent: fallbackText,
      style: "font-weight: bold; color: var(--light-blue); font-size: 1.2em;",
    });

    img.parentNode.appendChild(fallback);
  }

  // Add error handling to all logo images
  addErrorHandling() {
    $$(".logo-icon img, .water-drop img").forEach((img) => {
      if (!img.dataset.errorHandled) {
        img.addEventListener("error", () => {
          this.handleLogoError(img);
        });
        img.dataset.errorHandled = "true";
      }
    });
  }

  // Public API
  init() {
    this.preloadLogos();
    this.setupLazyLoading();
    this.addErrorHandling();

    // Optimize on load and resize
    this.optimizeForDevice();
    on(
      window,
      "resize",
      debounce(() => {
        this.optimizeForDevice();
      }, 250)
    );
  }

  // Clean up
  destroy() {
    this.logoCache.clear();
    off(window, "resize", this.optimizeForDevice);
  }
}

// Auto-initialize if DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.logoManager = new LogoManager();
  });
} else {
  window.logoManager = new LogoManager();
}

// Export for module usage
if (typeof module !== "undefined" && module.exports) {
  module.exports = LogoManager;
}
