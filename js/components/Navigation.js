/* Navigation Component - Handles navigation functionality */

class Navigation {
  constructor() {
    this.header = $("#header");
    this.nav = $("#nav-menu");
    this.navToggle = $("#nav-toggle");
    this.navLinks = $$(".nav-link");
    this.sections = $$("section[id]");

    this.isScrolled = false;
    this.activeSection = "home";
    this.scrollThreshold = 100;

    this.init();
  }

  init() {
    this.bindEvents();
    this.handleInitialState();
    this.observeSections();
  }

  bindEvents() {
    // Mobile menu toggle
    if (this.navToggle) {
      on(this.navToggle, "click", this.toggleMobileMenu.bind(this));
    }

    // Navigation links
    this.navLinks.forEach((link) => {
      on(link, "click", this.handleNavClick.bind(this));
    });

    // Scroll events
    on(window, "scroll", throttle(this.handleScroll.bind(this), 16));

    // Resize events
    on(window, "resize", debounce(this.handleResize.bind(this), 250));

    // Click outside to close mobile menu
    on(document, "click", this.handleDocumentClick.bind(this));

    // Escape key to close mobile menu
    on(document, "keydown", this.handleKeydown.bind(this));
  }

  handleInitialState() {
    // Set initial active section based on hash or default to home
    const hash = window.location.hash.slice(1);
    if (hash && this.sections.some((section) => section.id === hash)) {
      this.setActiveSection(hash);
    } else {
      this.setActiveSection("home");
    }

    // Check initial scroll position
    this.handleScroll();
  }

  observeSections() {
    // Use Intersection Observer for better performance
    const observerOptions = {
      root: null,
      rootMargin: "-50% 0px -50% 0px",
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          this.setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    this.sections.forEach((section) => {
      observer.observe(section);
    });
  }

  toggleMobileMenu() {
    const isActive = toggleClass(this.nav, "active");
    toggleClass(this.navToggle, "active", isActive);
    toggleClass(document.body, "nav-open", isActive);

    // Update ARIA attributes
    this.navToggle.setAttribute("aria-expanded", isActive);

    // Prevent body scroll when menu is open
    if (isActive) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }

  closeMobileMenu() {
    removeClass(this.nav, "active");
    removeClass(this.navToggle, "active");
    removeClass(document.body, "nav-open");

    this.navToggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  handleNavClick(event) {
    event.preventDefault();

    const link = event.currentTarget;
    const targetId =
      link.getAttribute("data-section") || link.getAttribute("href").slice(1);
    const targetSection = $(`#${targetId}`);

    if (targetSection) {
      // Close mobile menu if open
      this.closeMobileMenu();

      // Smooth scroll to section
      this.scrollToSection(targetSection);

      // Update URL hash
      this.updateHash(targetId);

      // Set active section
      this.setActiveSection(targetId);
    }
  }

  scrollToSection(section) {
    const headerHeight = this.header.offsetHeight;
    const targetPosition = section.offsetTop - headerHeight;

    if (prefersReducedMotion()) {
      window.scrollTo(0, targetPosition);
    } else {
      window.scrollTo({
        top: targetPosition,
        behavior: "smooth",
      });
    }
  }

  handleScroll() {
    const scrollY = window.pageYOffset;
    const shouldBeScrolled = scrollY > this.scrollThreshold;

    if (shouldBeScrolled !== this.isScrolled) {
      this.isScrolled = shouldBeScrolled;
      toggleClass(this.header, "scrolled", this.isScrolled);
    }
  }

  setActiveSection(sectionId) {
    if (this.activeSection === sectionId) return;

    this.activeSection = sectionId;

    // Update navigation links
    this.navLinks.forEach((link) => {
      const linkSection =
        link.getAttribute("data-section") || link.getAttribute("href").slice(1);
      const isActive = linkSection === sectionId;

      toggleClass(link, "active", isActive);
      link.setAttribute("aria-current", isActive ? "page" : "false");
    });

    // Dispatch custom event
    this.dispatchSectionChange(sectionId);
  }

  updateHash(sectionId) {
    if (history.pushState) {
      history.pushState(null, null, `#${sectionId}`);
    } else {
      window.location.hash = sectionId;
    }
  }

  dispatchSectionChange(sectionId) {
    const event = new CustomEvent("sectionchange", {
      detail: { section: sectionId },
    });
    document.dispatchEvent(event);
  }

  handleResize() {
    // Close mobile menu on desktop
    if (window.innerWidth > 768) {
      this.closeMobileMenu();
    }
  }

  handleDocumentClick(event) {
    // Close mobile menu when clicking outside
    if (
      hasClass(this.nav, "active") &&
      !this.nav.contains(event.target) &&
      !this.navToggle.contains(event.target)
    ) {
      this.closeMobileMenu();
    }
  }

  handleKeydown(event) {
    // Close mobile menu on Escape
    if (event.key === "Escape" && hasClass(this.nav, "active")) {
      this.closeMobileMenu();
      this.navToggle.focus();
    }

    // Handle navigation with arrow keys
    if (
      document.activeElement &&
      hasClass(document.activeElement, "nav-link")
    ) {
      const currentIndex = this.navLinks.indexOf(document.activeElement);
      let nextIndex;

      switch (event.key) {
        case "ArrowLeft":
        case "ArrowUp":
          event.preventDefault();
          nextIndex =
            currentIndex > 0 ? currentIndex - 1 : this.navLinks.length - 1;
          this.navLinks[nextIndex].focus();
          break;

        case "ArrowRight":
        case "ArrowDown":
          event.preventDefault();
          nextIndex =
            currentIndex < this.navLinks.length - 1 ? currentIndex + 1 : 0;
          this.navLinks[nextIndex].focus();
          break;

        case "Home":
          event.preventDefault();
          this.navLinks[0].focus();
          break;

        case "End":
          event.preventDefault();
          this.navLinks[this.navLinks.length - 1].focus();
          break;
      }
    }
  }

  // Public methods
  goToSection(sectionId) {
    const section = $(`#${sectionId}`);
    if (section) {
      this.scrollToSection(section);
      this.updateHash(sectionId);
      this.setActiveSection(sectionId);
    }
  }

  getCurrentSection() {
    return this.activeSection;
  }

  // Clean up
  destroy() {
    // Remove event listeners
    off(this.navToggle, "click", this.toggleMobileMenu);

    this.navLinks.forEach((link) => {
      off(link, "click", this.handleNavClick);
    });

    off(window, "scroll", this.handleScroll);
    off(window, "resize", this.handleResize);
    off(document, "click", this.handleDocumentClick);
    off(document, "keydown", this.handleKeydown);

    // Reset body styles
    document.body.style.overflow = "";
    removeClass(document.body, "nav-open");
  }
}

// Auto-initialize if DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.navigation = new Navigation();
  });
} else {
  window.navigation = new Navigation();
}

// Export for module usage
if (typeof module !== "undefined" && module.exports) {
  module.exports = Navigation;
}
