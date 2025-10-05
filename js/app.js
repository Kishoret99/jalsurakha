/* Main Application - Initializes and coordinates all components */

class JalSurakshaApp {
  constructor() {
    this.components = {};
    this.isInitialized = false;
    this.config = {
      enableAnalytics: true,
      enableServiceWorker: false,
      enableLazyLoading: true,
      enableAnimations: !prefersReducedMotion(),
    };

    this.init();
  }

  async init() {
    try {
      // Wait for DOM to be ready
      if (document.readyState === "loading") {
        await new Promise((resolve) => {
          document.addEventListener("DOMContentLoaded", resolve);
        });
      }

      // Initialize core functionality
      await this.initializeCore();

      // Initialize components
      await this.initializeComponents();

      // Setup global event handlers
      this.setupGlobalEvents();

      // Initialize additional features
      this.initializeFeatures();

      // Mark as initialized
      this.isInitialized = true;

      // Dispatch ready event
      this.dispatchReadyEvent();

      console.log("JalSuraksha app initialized successfully");
    } catch (error) {
      console.error("Failed to initialize JalSuraksha app:", error);
      this.handleInitializationError(error);
    }
  }

  async initializeCore() {
    // Set up error handling
    this.setupErrorHandling();

    // Initialize theme
    this.initializeTheme();

    // Initialize accessibility features
    this.initializeAccessibility();

    // Set initial loading state
    addClass(document.body, "app-loading");
  }

  async initializeComponents() {
    const componentPromises = [];

    // Initialize navigation (critical)
    if (typeof Navigation !== "undefined") {
      componentPromises.push(
        this.initializeComponent("navigation", Navigation)
      );
    }

    // Initialize scroll animations
    if (typeof ScrollAnimations !== "undefined") {
      componentPromises.push(
        this.initializeComponent("scrollAnimations", ScrollAnimations)
      );
    }

    // Initialize process timeline
    if (typeof ProcessTimeline !== "undefined") {
      componentPromises.push(
        this.initializeComponent("processTimeline", ProcessTimeline)
      );
    }

    // Initialize contact form
    if (typeof ContactForm !== "undefined") {
      componentPromises.push(
        this.initializeComponent("contactForm", ContactForm)
      );
    }

    // Initialize loading screen
    if (typeof LoadingScreen !== "undefined" && !window.loadingScreen) {
      componentPromises.push(
        this.initializeComponent("loadingScreen", LoadingScreen)
      );
    }

    // Initialize logo manager
    if (typeof LogoManager !== "undefined") {
      componentPromises.push(
        this.initializeComponent("logoManager", LogoManager)
      );
    }

    // Wait for all components to initialize
    await Promise.allSettled(componentPromises);
  }

  async initializeComponent(name, ComponentClass, options = {}) {
    try {
      // Check if component already exists
      if (window[name]) {
        this.components[name] = window[name];
        return this.components[name];
      }

      // Create new component instance
      this.components[name] = new ComponentClass(options);

      // Store in global scope for debugging
      if (typeof window !== "undefined") {
        window[name] = this.components[name];
      }

      console.log(`${name} component initialized`);
      return this.components[name];
    } catch (error) {
      console.error(`Failed to initialize ${name} component:`, error);
      return null;
    }
  }

  setupGlobalEvents() {
    // Handle page visibility changes
    on(document, "visibilitychange", () => {
      if (document.hidden) {
        this.handlePageHidden();
      } else {
        this.handlePageVisible();
      }
    });

    // Handle online/offline status
    on(window, "online", this.handleOnline.bind(this));
    on(window, "offline", this.handleOffline.bind(this));

    // Handle resize events
    on(window, "resize", debounce(this.handleResize.bind(this), 250));

    // Handle scroll events for global features
    on(window, "scroll", throttle(this.handleScroll.bind(this), 16));

    // Handle keyboard navigation
    on(document, "keydown", this.handleGlobalKeydown.bind(this));

    // Handle hash changes
    on(window, "hashchange", this.handleHashChange.bind(this));

    // Handle back-to-top button
    this.initializeBackToTop();
  }

  initializeFeatures() {
    // Initialize lazy loading
    if (this.config.enableLazyLoading) {
      this.initializeLazyLoading();
    }

    // Initialize analytics
    if (this.config.enableAnalytics) {
      this.initializeAnalytics();
    }

    // Initialize service worker
    if (this.config.enableServiceWorker) {
      this.initializeServiceWorker();
    }

    // Initialize performance monitoring
    this.initializePerformanceMonitoring();

    // Initialize smooth scrolling
    this.initializeSmoothScrolling();

    // Remove loading state
    removeClass(document.body, "app-loading");
    addClass(document.body, "app-ready");
  }

  setupErrorHandling() {
    // Global error handler
    window.addEventListener("error", (event) => {
      console.error("Global error:", event.error);
      this.trackError(event.error, "javascript");
    });

    // Unhandled promise rejection handler
    window.addEventListener("unhandledrejection", (event) => {
      console.error("Unhandled promise rejection:", event.reason);
      this.trackError(event.reason, "promise");
    });
  }

  initializeTheme() {
    // Check for saved theme preference
    const savedTheme = storage.get("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    const theme = savedTheme || (prefersDark ? "dark" : "light");
    this.setTheme(theme);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", (e) => {
      if (!storage.get("theme")) {
        this.setTheme(e.matches ? "dark" : "light");
      }
    });
  }

  setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    storage.set("theme", theme);

    // Dispatch theme change event
    const event = new CustomEvent("theme-change", { detail: { theme } });
    document.dispatchEvent(event);
  }

  initializeAccessibility() {
    // Skip links for keyboard navigation
    this.addSkipLinks();

    // Focus management
    this.setupFocusManagement();

    // ARIA live regions
    this.setupLiveRegions();

    // High contrast mode detection
    this.detectHighContrast();
  }

  addSkipLinks() {
    const skipLinks = createElement("div", {
      className: "skip-links",
      innerHTML: `
        <a href="#main" class="skip-link">Skip to main content</a>
        <a href="#nav-menu" class="skip-link">Skip to navigation</a>
      `,
    });

    document.body.insertBefore(skipLinks, document.body.firstChild);
  }

  setupFocusManagement() {
    // Track focus for better keyboard navigation
    let focusedElement = null;

    on(document, "focusin", (event) => {
      focusedElement = event.target;
    });

    // Restore focus after modal closes
    on(document, "modal-close", () => {
      if (focusedElement && document.contains(focusedElement)) {
        focusedElement.focus();
      }
    });
  }

  setupLiveRegions() {
    // Create ARIA live region for announcements
    const liveRegion = createElement("div", {
      id: "live-region",
      className: "sr-only",
      "aria-live": "polite",
      "aria-atomic": "true",
    });

    document.body.appendChild(liveRegion);
  }

  detectHighContrast() {
    // Detect high contrast mode
    const testElement = createElement("div", {
      style:
        'border: 1px solid red; border-color: red; position: absolute; height: 5px; top: -999px; background-image: url("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");',
    });

    document.body.appendChild(testElement);

    const isHighContrast =
      testElement.offsetHeight === 0 ||
      window.getComputedStyle(testElement).borderTopColor ===
        window.getComputedStyle(testElement).borderRightColor;

    if (isHighContrast) {
      addClass(document.body, "high-contrast");
    }

    document.body.removeChild(testElement);
  }

  initializeLazyLoading() {
    // Lazy load images
    const lazyImages = $$("img[data-src]");

    if (lazyImages.length === 0) return;

    const imageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.add("loaded");
            imageObserver.unobserve(img);
          }
        });
      },
      {
        rootMargin: "50px",
      }
    );

    lazyImages.forEach((img) => imageObserver.observe(img));
  }

  initializeAnalytics() {
    // Initialize Google Analytics or other analytics
    // This is a placeholder - implement based on your analytics needs
    this.analytics = {
      track: (event, properties = {}) => {
        if (typeof gtag !== "undefined") {
          gtag("event", event, properties);
        }

        // Custom analytics implementation
        console.log("Analytics:", event, properties);
      },

      page: (path) => {
        if (typeof gtag !== "undefined") {
          gtag("config", "GA_MEASUREMENT_ID", {
            page_path: path,
          });
        }
      },
    };

    // Track page view
    this.analytics.page(window.location.pathname);
  }

  initializeServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration);
        })
        .catch((error) => {
          console.log("Service Worker registration failed:", error);
        });
    }
  }

  initializePerformanceMonitoring() {
    // Monitor page load performance
    if (window.performance && window.performance.timing) {
      window.addEventListener("load", () => {
        setTimeout(() => {
          const timing = window.performance.timing;
          const loadTime = timing.loadEventEnd - timing.navigationStart;

          console.log(`Page load time: ${loadTime}ms`);

          // Track performance metrics
          if (this.analytics) {
            this.analytics.track("page_load_time", {
              load_time: loadTime,
              dom_ready:
                timing.domContentLoadedEventEnd - timing.navigationStart,
            });
          }
        }, 0);
      });
    }
  }

  initializeSmoothScrolling() {
    // Handle smooth scrolling for anchor links
    delegate(document, 'a[href^="#"]', "click", (event) => {
      event.preventDefault();

      const targetId = event.target.getAttribute("href").slice(1);
      const targetElement = $(`#${targetId}`);

      if (targetElement) {
        scrollTo(targetElement);

        // Update URL hash
        if (history.pushState) {
          history.pushState(null, null, `#${targetId}`);
        }
      }
    });
  }

  initializeBackToTop() {
    const backToTopButton = $("#back-to-top");
    if (!backToTopButton) return;

    // Show/hide based on scroll position
    const toggleBackToTop = () => {
      const scrollY = window.pageYOffset;
      const shouldShow = scrollY > 500;

      toggleClass(backToTopButton, "visible", shouldShow);
    };

    on(window, "scroll", throttle(toggleBackToTop, 100));

    // Handle click
    on(backToTopButton, "click", (event) => {
      event.preventDefault();

      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });

      // Focus management
      const mainHeading = $("h1") || $("main");
      if (mainHeading) {
        mainHeading.focus();
      }
    });

    // Initial check
    toggleBackToTop();
  }

  // Event handlers
  handlePageHidden() {
    // Pause animations, videos, etc.
    Object.values(this.components).forEach((component) => {
      if (component && typeof component.pause === "function") {
        component.pause();
      }
    });
  }

  handlePageVisible() {
    // Resume animations, videos, etc.
    Object.values(this.components).forEach((component) => {
      if (component && typeof component.resume === "function") {
        component.resume();
      }
    });
  }

  handleOnline() {
    removeClass(document.body, "offline");
    this.showNotification("Connection restored", "success");
  }

  handleOffline() {
    addClass(document.body, "offline");
    this.showNotification(
      "Connection lost. Some features may not work.",
      "warning"
    );
  }

  handleResize() {
    // Update viewport height CSS custom property
    document.documentElement.style.setProperty(
      "--vh",
      `${window.innerHeight * 0.01}px`
    );

    // Notify components of resize
    Object.values(this.components).forEach((component) => {
      if (component && typeof component.handleResize === "function") {
        component.handleResize();
      }
    });
  }

  handleScroll() {
    // Global scroll handling
    const scrollY = window.pageYOffset;

    // Update scroll position CSS custom property
    document.documentElement.style.setProperty("--scroll-y", `${scrollY}px`);

    // Add scrolled class to body
    toggleClass(document.body, "scrolled", scrollY > 100);
  }

  handleGlobalKeydown(event) {
    // Global keyboard shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case "k":
          event.preventDefault();
          // Open search or navigation
          break;
      }
    }

    // Escape key handling
    if (event.key === "Escape") {
      // Close any open modals, menus, etc.
      this.closeAllOverlays();
    }
  }

  handleHashChange() {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const targetElement = $(`#${hash}`);
      if (targetElement) {
        scrollTo(targetElement);
      }
    }
  }

  handleInitializationError(error) {
    console.error("App initialization failed:", error);

    // Show error message to user
    const errorMessage = createElement("div", {
      className: "app-error",
      innerHTML: `
        <h2>Something went wrong</h2>
        <p>The application failed to load properly. Please refresh the page to try again.</p>
        <button onclick="window.location.reload()">Refresh Page</button>
      `,
    });

    document.body.appendChild(errorMessage);
  }

  // Utility methods
  showNotification(message, type = "info") {
    // Use contact form's notification system if available
    if (
      this.components.contactForm &&
      this.components.contactForm.showNotification
    ) {
      this.components.contactForm.showNotification(message, type);
      return;
    }

    // Fallback notification
    console.log(`Notification (${type}): ${message}`);
  }

  closeAllOverlays() {
    // Close mobile menu
    if (this.components.navigation) {
      this.components.navigation.closeMobileMenu();
    }

    // Close any modals
    $$(".modal-overlay.active").forEach((modal) => {
      removeClass(modal, "active");
    });

    // Dispatch close event
    const event = new CustomEvent("close-overlays");
    document.dispatchEvent(event);
  }

  trackError(error, type) {
    if (this.analytics) {
      this.analytics.track("error", {
        error_type: type,
        error_message: error.message,
        error_stack: error.stack,
        user_agent: navigator.userAgent,
        url: window.location.href,
      });
    }
  }

  dispatchReadyEvent() {
    const event = new CustomEvent("app-ready", {
      detail: {
        components: Object.keys(this.components),
        config: this.config,
      },
    });
    document.dispatchEvent(event);
  }

  // Public API
  getComponent(name) {
    return this.components[name];
  }

  getAllComponents() {
    return { ...this.components };
  }

  isReady() {
    return this.isInitialized;
  }

  // Clean up
  destroy() {
    // Destroy all components
    Object.values(this.components).forEach((component) => {
      if (component && typeof component.destroy === "function") {
        component.destroy();
      }
    });

    // Remove global event listeners
    off(document, "visibilitychange");
    off(window, "online");
    off(window, "offline");
    off(window, "resize");
    off(window, "scroll");
    off(document, "keydown");
    off(window, "hashchange");

    // Clear components
    this.components = {};
    this.isInitialized = false;
  }
}

// Initialize the application
window.app = new JalSurakshaApp();

// Export for module usage
if (typeof module !== "undefined" && module.exports) {
  module.exports = JalSurakshaApp;
}
