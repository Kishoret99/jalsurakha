/* Scroll Animations Component - Simple and consistent scroll-triggered animations */

class ScrollAnimations {
  constructor() {
    this.observer = null;
    this.animatedElements = new Set();
    
    this.init();
  }
  
  init() {
    // Skip animations if user prefers reduced motion
    if (prefersReducedMotion()) {
      this.showAllElements();
      return;
    }
    
    this.setupObserver();
    this.observeElements();
    this.initializeCounters();
  }
  
  setupObserver() {
    const observerOptions = {
      threshold: 0.2,
      rootMargin: "0px 0px -100px 0px"
    };
    
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          this.animateElement(entry.target);
          this.observer.unobserve(entry.target); // Animate only once
        }
      });
    }, observerOptions);
  }
  
  observeElements() {
    // Find all elements that need animation
    const elementsToAnimate = [
      ...$$('.about-card'),
      ...$$('.service-card'),
      ...$$('.client-item'),
      ...$$('.section-header'),
      ...$$('[data-count]')
    ];
    
    elementsToAnimate.forEach((element) => {
      // Add fade-in class for consistent animation
      addClass(element, 'fade-in-element');
      this.observer.observe(element);
    });
  }
  
  animateElement(element) {
    if (this.animatedElements.has(element)) return;
    
    this.animatedElements.add(element);
    
    // Simple fade in animation
    addClass(element, 'animate-in');
    
    // Handle counter elements
    if (element.hasAttribute('data-count')) {
      this.animateCounter(element);
    }
  }
  
  animateCounter(element) {
    const targetValue = parseInt(element.getAttribute('data-count'), 10);
    const suffix = element.getAttribute('data-suffix') || '';
    const duration = 2000; // 2 seconds
    
    let currentValue = 0;
    const increment = targetValue / (duration / 50); // Update every 50ms
    
    const updateCounter = () => {
      currentValue += increment;
      
      if (currentValue >= targetValue) {
        element.textContent = targetValue + suffix;
        return;
      }
      
      element.textContent = Math.floor(currentValue) + suffix;
      setTimeout(updateCounter, 50);
    };
    
    // Start counter after a small delay
    setTimeout(updateCounter, 300);
  }
  
  showAllElements() {
    // Show all elements immediately without animation
    const allElements = [
      ...$$('.about-card'),
      ...$$('.service-card'),
      ...$$('.client-item'),
      ...$$('.section-header'),
      ...$$('[data-count]')
    ];
    
    allElements.forEach((element) => {
      addClass(element, 'animate-in');
      
      // Initialize counters immediately
      if (element.hasAttribute('data-count')) {
        const targetValue = element.getAttribute('data-count');
        const suffix = element.getAttribute('data-suffix') || '';
        element.textContent = targetValue + suffix;
      }
    });
  }
  
  // Clean up
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.animatedElements.clear();
  }
}

// Auto-initialize if DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.scrollAnimations = new ScrollAnimations();
  });
} else {
  window.scrollAnimations = new ScrollAnimations();
}

// Export for module usage
if (typeof module !== "undefined" && module.exports) {
  module.exports = ScrollAnimations;
}