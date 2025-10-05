/* Loading Screen Component - Handles page loading animations */

class LoadingScreen {
  constructor(options = {}) {
    this.options = {
      minDisplayTime: 500, // Minimum time to show loading screen
      fadeOutDuration: 400, // Fade out animation duration
      autoHide: true, // Auto-hide when page loads
      showProgress: true, // Show loading progress
      ...options,
    };

    this.loadingScreen = $("#loading-screen");
    this.progressBar = null;
    this.startTime = Date.now();
    this.isHidden = false;
    this.loadingPromises = [];

    this.init();
  }

  init() {
    if (!this.loadingScreen) return;

    this.setupProgressBar();
    this.bindEvents();
    this.startLoading();

    if (this.options.autoHide) {
      this.waitForPageLoad();
    }
  }

  setupProgressBar() {
    if (!this.options.showProgress) return;

    this.progressBar = this.loadingScreen.querySelector(".loading-progress");
    if (this.progressBar) {
      this.progressBar.style.width = "0%";
    }
  }

  bindEvents() {
    // Handle page visibility changes
    on(document, "visibilitychange", () => {
      if (document.hidden && !this.isHidden) {
        this.pauseAnimations();
      } else if (!document.hidden && !this.isHidden) {
        this.resumeAnimations();
      }
    });

    // Handle errors that might prevent loading
    on(window, "error", (event) => {
      console.warn("Loading error:", event.error);
      // Still hide loading screen to prevent infinite loading
      setTimeout(() => this.hide(), 500);
    });
  }

  startLoading() {
    // Add loading promises for critical resources
    this.addLoadingPromise(this.loadFonts());
    this.addLoadingPromise(this.loadCriticalImages());
    this.addLoadingPromise(this.loadScripts());

    // Start progress animation
    this.animateProgress();
  }

  async loadFonts() {
    if (!document.fonts) return Promise.resolve();

    try {
      // Wait for critical fonts to load
      const fontPromises = [
        document.fonts.load("400 16px Inter"),
        document.fonts.load("600 24px Poppins"),
      ];

      await Promise.allSettled(fontPromises);
      return true;
    } catch (error) {
      console.warn("Font loading error:", error);
      return false;
    }
  }

  async loadCriticalImages() {
    // Load hero section images and other critical visuals
    const criticalImages = [
      // Add any critical image URLs here
      // 'assets/hero-image.jpg',
      // 'assets/logo.png'
    ];

    if (criticalImages.length === 0) return Promise.resolve();

    const imagePromises = criticalImages.map((src) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = src;
      });
    });

    try {
      await Promise.allSettled(imagePromises);
      return true;
    } catch (error) {
      console.warn("Image loading error:", error);
      return false;
    }
  }

  async loadScripts() {
    // Wait for critical scripts to be ready
    const scriptChecks = [
      () => typeof $ !== "undefined",
      () => typeof Navigation !== "undefined",
      () => typeof ScrollAnimations !== "undefined",
    ];

    const maxWaitTime = 3000; // 3 seconds max
    const checkInterval = 100; // Check every 100ms
    let elapsed = 0;

    return new Promise((resolve) => {
      const checkScripts = () => {
        const allReady = scriptChecks.every((check) => {
          try {
            return check();
          } catch {
            return false;
          }
        });

        if (allReady || elapsed >= maxWaitTime) {
          resolve(allReady);
        } else {
          elapsed += checkInterval;
          setTimeout(checkScripts, checkInterval);
        }
      };

      checkScripts();
    });
  }

  addLoadingPromise(promise) {
    this.loadingPromises.push(promise);
  }

  animateProgress() {
    if (!this.progressBar) return;

    let progress = 0;
    const increment = 1;
    const maxProgress = 90; // Don't reach 100% until everything is loaded

    const updateProgress = () => {
      if (this.isHidden) return;

      progress += increment;
      progress = Math.min(progress, maxProgress);

      this.setProgress(progress);

      if (progress < maxProgress) {
        // Slow down as we approach max
        const delay = progress > 50 ? 100 : 50;
        setTimeout(updateProgress, delay);
      }
    };

    updateProgress();
  }

  setProgress(percentage) {
    if (this.progressBar) {
      this.progressBar.style.width = `${percentage}%`;

      // Add completion animation when reaching 100%
      if (percentage >= 100) {
        addClass(this.progressBar, "complete");
      }
    }

    // Dispatch progress event
    const event = new CustomEvent("loading-progress", {
      detail: { progress: percentage },
    });
    document.dispatchEvent(event);
  }

  async waitForPageLoad() {
    // Wait for DOM to be fully loaded
    if (document.readyState !== "complete") {
      await new Promise((resolve) => {
        const handleLoad = () => {
          off(window, "load", handleLoad);
          resolve();
        };
        on(window, "load", handleLoad);
      });
    }

    // Wait for all loading promises
    try {
      await Promise.allSettled(this.loadingPromises);
    } catch (error) {
      console.warn("Loading promise error:", error);
    }

    // Ensure minimum display time
    const elapsed = Date.now() - this.startTime;
    const remainingTime = Math.max(0, this.options.minDisplayTime - elapsed);

    if (remainingTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, remainingTime));
    }

    // Complete progress and hide
    this.setProgress(100);
    setTimeout(() => this.hide(), 200);
  }

  hide() {
    if (this.isHidden) return;

    this.isHidden = true;

    // Complete progress if not already done
    this.setProgress(100);

    // Fade out animation
    if (!prefersReducedMotion()) {
      this.animateHide();
    } else {
      this.immediateHide();
    }

    // Dispatch hidden event
    const event = new CustomEvent("loading-complete");
    document.dispatchEvent(event);
  }

  animateHide() {
    addClass(this.loadingScreen, "hiding");

    // Use CSS animation or Web Animations API
    if (this.loadingScreen.animate) {
      const animation = this.loadingScreen.animate(
        [
          { opacity: 1, transform: "scale(1)" },
          { opacity: 0, transform: "scale(1.05)" },
        ],
        {
          duration: this.options.fadeOutDuration,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          fill: "forwards",
        }
      );

      animation.addEventListener("finish", () => {
        this.immediateHide();
      });
    } else {
      // Fallback to CSS transition
      this.loadingScreen.style.transition = `opacity ${this.options.fadeOutDuration}ms ease-out`;
      this.loadingScreen.style.opacity = "0";

      setTimeout(() => {
        this.immediateHide();
      }, this.options.fadeOutDuration);
    }
  }

  immediateHide() {
    addClass(this.loadingScreen, "hidden");
    this.loadingScreen.style.display = "none";

    // Enable body scroll
    removeClass(document.body, "loading");

    // Focus management
    this.manageFocus();
  }

  manageFocus() {
    // Focus the main content or first interactive element
    const mainContent = $("main") || $("body");
    if (mainContent) {
      mainContent.focus();
    }

    // Remove loading screen from tab order
    this.loadingScreen.setAttribute("aria-hidden", "true");
  }

  pauseAnimations() {
    if (this.loadingScreen) {
      addClass(this.loadingScreen, "paused");
    }
  }

  resumeAnimations() {
    if (this.loadingScreen) {
      removeClass(this.loadingScreen, "paused");
    }
  }

  // Public methods
  show() {
    if (!this.loadingScreen) return;

    this.isHidden = false;
    this.startTime = Date.now();

    removeClass(this.loadingScreen, "hidden", "hiding");
    this.loadingScreen.style.display = "flex";
    this.loadingScreen.style.opacity = "1";

    addClass(document.body, "loading");

    this.setProgress(0);
    this.animateProgress();
  }

  updateProgress(percentage) {
    this.setProgress(clamp(percentage, 0, 100));
  }

  addTask(taskPromise, weight = 1) {
    this.addLoadingPromise(taskPromise);
    return taskPromise;
  }

  // Simulate loading for demo purposes
  simulateLoading(duration = 3000) {
    return new Promise((resolve) => {
      let progress = 0;
      const steps = 50;
      const stepDuration = duration / steps;

      const updateStep = () => {
        progress += 100 / steps;
        this.setProgress(Math.min(progress, 90));

        if (progress < 90) {
          setTimeout(updateStep, stepDuration);
        } else {
          setTimeout(() => {
            this.setProgress(100);
            setTimeout(() => this.hide(), 200);
            resolve();
          }, 500);
        }
      };

      updateStep();
    });
  }

  // Error handling
  handleError(error) {
    console.error("Loading screen error:", error);

    // Show error state or just hide loading screen
    this.setProgress(100);
    setTimeout(() => this.hide(), 500);
  }

  // Clean up
  destroy() {
    this.isHidden = true;

    // Remove event listeners
    off(document, "visibilitychange");
    off(window, "error");
    off(window, "load");

    // Clear any pending timeouts
    if (this.loadingScreen) {
      this.loadingScreen.style.display = "none";
    }

    removeClass(document.body, "loading");
  }
}

// Auto-initialize loading screen
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.loadingScreen = new LoadingScreen();
  });
} else {
  window.loadingScreen = new LoadingScreen();
}

// Export for module usage
if (typeof module !== "undefined" && module.exports) {
  module.exports = LoadingScreen;
}
