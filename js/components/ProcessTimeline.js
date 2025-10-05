/* Process Timeline Component - Interactive 6-stage cleaning process */

class ProcessTimeline {
  constructor() {
    this.timeline = $("#process-timeline");
    this.progressLine = $("#progress-line");
    this.steps = $$(".process-step");
    this.stepMarkers = $$(".step-marker");
    this.stepContents = $$(".step-content");

    this.currentStep = 0;
    this.isAutoPlaying = false;
    this.autoPlayInterval = null;
    this.autoPlayDelay = 3000; // 3 seconds
    this.isVisible = false;

    this.observer = null;
    this.stepObservers = [];

    this.init();
  }

  init() {
    if (!this.timeline) return;

    this.setupSteps();
    this.bindEvents();
    this.setupIntersectionObserver();

    // Delay initialization slightly to ensure DOM is ready
    requestAnimationFrame(() => {
      this.initializeProgress();

      // Check if process section is already visible
      if (isInViewport(this.timeline, 100)) {
        this.startAutoPlay();
      }
    });
  }

  setupSteps() {
    this.steps.forEach((step, index) => {
      // Add step number for accessibility
      const stepNumber = index + 1;
      step.setAttribute("data-step", stepNumber);
      step.setAttribute("role", "button");
      step.setAttribute("tabindex", "0");
      step.setAttribute("aria-label", `Process step ${stepNumber}`);

      // Add click and keyboard event handlers
      on(step, "click", () => this.goToStep(index));
      on(step, "keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.goToStep(index);
        }
      });

      // Add hover effects
      on(step, "mouseenter", () => this.highlightStep(index));
      on(step, "mouseleave", () => this.removeHighlight(index));
    });
  }

  bindEvents() {
    // Handle scroll-based progress updates
    on(window, "scroll", throttle(this.updateScrollProgress.bind(this), 16));

    // Handle resize events
    on(window, "resize", debounce(this.handleResize.bind(this), 250));

    // Handle visibility changes
    on(document, "visibilitychange", () => {
      if (document.hidden) {
        this.pauseAutoPlay();
      } else if (this.isAutoPlaying) {
        this.resumeAutoPlay();
      }
    });

    // Handle section changes
    on(document, "sectionchange", (event) => {
      if (event.detail.section === "process") {
        this.startAutoPlay();
      } else {
        this.pauseAutoPlay();
      }
    });
  }

  setupIntersectionObserver() {
    // Main timeline observer
    const timelineOptions = {
      root: null,
      rootMargin: "0px 0px -30% 0px",
      threshold: 0.2,
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        this.isVisible = entry.isIntersecting;

        if (this.isVisible) {
          setTimeout(() => {
            this.initializeSteps();
            this.startAutoPlay();
          }, 300);
        } else {
          this.pauseAutoPlay();
        }
      });
    }, timelineOptions);

    if (this.timeline) {
      this.observer.observe(this.timeline);
    }

    // Individual step observers for scroll-based activation
    this.setupStepObservers();
  }

  setupStepObservers() {
    const stepOptions = {
      root: null,
      rootMargin: "-40% 0px -40% 0px",
      threshold: 0.5,
    };

    this.steps.forEach((step, index) => {
      const stepObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && this.isVisible && !this.isAutoPlaying) {
            this.goToStep(index, true);
          }
        });
      }, stepOptions);

      stepObserver.observe(step);
      this.stepObservers.push(stepObserver);
    });
  }

  initializeSteps() {
    // Reset all steps to initial state
    this.steps.forEach((step, index) => {
      const marker = step.querySelector(".step-marker");
      const content = step.querySelector(".step-content");

      // Remove all state classes
      removeClass(marker, "active", "completed", "pending");
      removeClass(content, "active", "completed", "pending");

      // Set initial state
      if (index === 0) {
        addClass(marker, "active");
        addClass(content, "active");
      } else {
        addClass(marker, "pending");
        addClass(content, "pending");
      }
    });

    this.currentStep = 0;
    this.updateProgressLine(false);
  }

  initializeProgress() {
    // Set initial state - ensure first step is active
    this.currentStep = -1; // Reset to force update
    this.goToStep(0, false);
    this.updateProgressLine(false);

    // Ensure proper initial classes
    this.steps.forEach((step, index) => {
      removeClass(step, "active", "completed", "pending");
      if (index === 0) {
        addClass(step, "active");
      } else {
        addClass(step, "pending");
      }
    });
  }

  goToStep(stepIndex, animate = true) {
    if (stepIndex < 0 || stepIndex >= this.steps.length) return;

    const previousStep = this.currentStep;
    this.currentStep = stepIndex;

    // Update step states with individual marker and content classes
    this.steps.forEach((step, index) => {
      const marker = step.querySelector(".step-marker");
      const content = step.querySelector(".step-content");

      if (!marker || !content) return;

      // Remove all state classes
      removeClass(marker, "active", "completed", "pending");
      removeClass(content, "active", "completed", "pending");

      const isActive = index === stepIndex;
      const isCompleted = index < stepIndex;
      const isPending = index > stepIndex;

      // Add appropriate state classes
      if (isActive) {
        addClass(marker, "active");
        addClass(content, "active");
      } else if (isCompleted) {
        addClass(marker, "completed");
        addClass(content, "completed");
      } else {
        addClass(marker, "pending");
        addClass(content, "pending");
      }

      // Update ARIA attributes
      step.setAttribute("aria-current", isActive ? "step" : "false");
      step.setAttribute("aria-expanded", isActive ? "true" : "false");
    });

    // Update progress line
    this.updateProgressLine(animate);

    // Animate step content if needed
    if (animate && stepIndex !== previousStep) {
      this.animateStepTransition(previousStep, stepIndex);
    }

    // Dispatch custom event
    this.dispatchStepChange(stepIndex);

    // Reset auto-play timer
    if (this.isAutoPlaying) {
      this.resetAutoPlayTimer();
    }
  }

  updateProgressLine(animate = true) {
    if (!this.progressLine) return;

    const progress =
      this.steps.length > 1
        ? (this.currentStep / (this.steps.length - 1)) * 100
        : 0;

    if (animate && !prefersReducedMotion()) {
      this.progressLine.style.transition =
        "height 0.6s cubic-bezier(0.4, 0, 0.2, 1)";
    } else {
      this.progressLine.style.transition = "none";
    }

    this.progressLine.style.height = `${progress}%`;
  }

  updateScrollProgress() {
    if (!this.timeline || !isInViewport(this.timeline, 100)) return;

    const timelineRect = this.timeline.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    // Calculate scroll progress within the timeline section
    const scrollProgress = clamp(
      (windowHeight - timelineRect.top) / (windowHeight + timelineRect.height),
      0,
      1
    );

    // Map scroll progress to step index
    const targetStep = Math.floor(scrollProgress * this.steps.length);
    const clampedStep = clamp(targetStep, 0, this.steps.length - 1);

    // Only update if step changed and auto-play is not active
    if (clampedStep !== this.currentStep && !this.isAutoPlaying) {
      this.goToStep(clampedStep);
    }
  }

  animateStepTransition(fromIndex, toIndex) {
    const fromStep = this.steps[fromIndex];
    const toStep = this.steps[toIndex];

    if (!fromStep || !toStep || prefersReducedMotion()) return;

    // Animate step markers
    const fromMarker = fromStep.querySelector(".step-marker");
    const toMarker = toStep.querySelector(".step-marker");

    if (fromMarker) {
      animate(
        fromMarker,
        [
          { transform: "scale(1.2)", backgroundColor: "var(--light-blue)" },
          { transform: "scale(1)", backgroundColor: "var(--success-green)" },
        ],
        { duration: 300 }
      );
    }

    if (toMarker) {
      animate(
        toMarker,
        [
          { transform: "scale(1)", backgroundColor: "var(--primary-blue)" },
          { transform: "scale(1.2)", backgroundColor: "var(--light-blue)" },
          { transform: "scale(1)", backgroundColor: "var(--light-blue)" },
        ],
        { duration: 600 }
      );
    }

    // Animate step content
    const toContent = toStep.querySelector(".step-content");
    if (toContent) {
      animate(
        toContent,
        [
          { opacity: 0.8, transform: "translateY(10px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 400, delay: 200 }
      );
    }
  }

  highlightStep(stepIndex) {
    if (stepIndex === this.currentStep) return;

    const step = this.steps[stepIndex];
    const marker = step.querySelector(".step-marker");

    if (marker && !prefersReducedMotion()) {
      addClass(step, "hover");
      animate(
        marker,
        [{ transform: "scale(1)" }, { transform: "scale(1.1)" }],
        { duration: 200, fill: "forwards" }
      );
    }
  }

  removeHighlight(stepIndex) {
    if (stepIndex === this.currentStep) return;

    const step = this.steps[stepIndex];
    const marker = step.querySelector(".step-marker");

    if (marker && !prefersReducedMotion()) {
      removeClass(step, "hover");
      animate(
        marker,
        [{ transform: "scale(1.1)" }, { transform: "scale(1)" }],
        { duration: 200, fill: "forwards" }
      );
    }
  }

  startAutoPlay() {
    if (this.isAutoPlaying || prefersReducedMotion() || !this.isVisible) return;

    this.isAutoPlaying = true;
    console.log("Starting timeline auto-play");

    // Start from step 0
    this.goToStep(0, true);
    this.resetAutoPlayTimer();
  }

  pauseAutoPlay() {
    if (!this.isAutoPlaying) return;

    this.isAutoPlaying = false;
    console.log("Pausing timeline auto-play");

    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
  }

  resetAutoPlayTimer() {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
    }

    this.autoPlayInterval = setInterval(() => {
      if (!this.isVisible || !this.isAutoPlaying) {
        this.pauseAutoPlay();
        return;
      }

      const nextStep = (this.currentStep + 1) % this.steps.length;
      this.goToStep(nextStep, true);

      console.log(`Auto-play: Moving to step ${nextStep + 1}`);
    }, this.autoPlayDelay);
  }

  dispatchStepChange(stepIndex) {
    const event = new CustomEvent("process-step-change", {
      detail: {
        currentStep: stepIndex,
        totalSteps: this.steps.length,
        stepElement: this.steps[stepIndex],
      },
    });
    document.dispatchEvent(event);
  }

  handleResize() {
    // Recalculate positions and update progress
    requestAnimationFrame(() => {
      this.updateProgressLine(false);
    });
  }

  // Public methods
  nextStep() {
    const nextIndex = (this.currentStep + 1) % this.steps.length;
    this.goToStep(nextIndex);
  }

  previousStep() {
    const prevIndex =
      this.currentStep > 0 ? this.currentStep - 1 : this.steps.length - 1;
    this.goToStep(prevIndex);
  }

  getCurrentStep() {
    return {
      index: this.currentStep,
      element: this.steps[this.currentStep],
      total: this.steps.length,
    };
  }

  setAutoPlayDelay(delay) {
    this.autoPlayDelay = delay;
    if (this.isAutoPlaying) {
      this.resetAutoPlayTimer();
    }
  }

  // Keyboard navigation
  handleKeyboardNavigation(event) {
    if (!this.timeline.contains(document.activeElement)) return;

    switch (event.key) {
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        this.previousStep();
        break;

      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        this.nextStep();
        break;

      case "Home":
        event.preventDefault();
        this.goToStep(0);
        break;

      case "End":
        event.preventDefault();
        this.goToStep(this.steps.length - 1);
        break;

      case " ":
      case "Enter":
        event.preventDefault();
        // Toggle auto-play
        if (this.isAutoPlaying) {
          this.pauseAutoPlay();
        } else {
          this.startAutoPlay();
        }
        break;
    }
  }

  // Clean up
  destroy() {
    this.pauseAutoPlay();

    if (this.observer) {
      this.observer.disconnect();
    }

    // Disconnect step observers
    this.stepObservers.forEach((observer) => {
      observer.disconnect();
    });
    this.stepObservers = [];

    // Remove event listeners
    this.steps.forEach((step) => {
      off(step, "click");
      off(step, "keydown");
      off(step, "mouseenter");
      off(step, "mouseleave");
    });

    off(window, "scroll", this.updateScrollProgress);
    off(window, "resize", this.handleResize);
    off(document, "visibilitychange");
    off(document, "sectionchange");
  }
}

// Auto-initialize if DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.processTimeline = new ProcessTimeline();
  });
} else {
  window.processTimeline = new ProcessTimeline();
}

// Export for module usage
if (typeof module !== "undefined" && module.exports) {
  module.exports = ProcessTimeline;
}
