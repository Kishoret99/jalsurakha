/* Contact Form Component - Handles form validation and submission */

class ContactForm {
  constructor() {
    this.form = $("#contact-form");
    this.fields = {};
    this.validators = {};
    this.isSubmitting = false;

    this.init();
  }

  init() {
    if (!this.form) return;

    this.setupFields();
    this.setupValidators();
    this.bindEvents();
    this.initializeFieldAnimations();
  }

  setupFields() {
    const fieldElements = $$("input, select, textarea", this.form);

    fieldElements.forEach((field) => {
      const name = field.name;
      if (name) {
        this.fields[name] = {
          element: field,
          value: "",
          isValid: false,
          isDirty: false,
          errors: [],
        };
      }
    });
  }

  setupValidators() {
    this.validators = {
      name: {
        required: true,
        minLength: 2,
        maxLength: 50,
        pattern: /^[a-zA-Z\s]+$/,
        message: "Please enter a valid name (2-50 characters, letters only)",
      },

      email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: "Please enter a valid email address",
      },

      phone: {
        required: true,
        pattern: /^[\+]?[1-9][\d]{0,15}$/,
        message: "Please enter a valid phone number",
      },

      service: {
        required: true,
        message: "Please select a service",
      },

      message: {
        required: false,
        minLength: 10,
        maxLength: 500,
        message: "Message should be between 10-500 characters",
      },
    };
  }

  bindEvents() {
    // Form submission
    on(this.form, "submit", this.handleSubmit.bind(this));

    // Field events
    Object.values(this.fields).forEach((field) => {
      const { element } = field;

      // Real-time validation
      on(
        element,
        "input",
        debounce((event) => {
          this.validateField(event.target.name);
          this.updateFieldUI(event.target.name);
        }, 300)
      );

      // Blur validation
      on(element, "blur", (event) => {
        this.markFieldAsDirty(event.target.name);
        this.validateField(event.target.name);
        this.updateFieldUI(event.target.name);
      });

      // Focus events for animations
      on(element, "focus", (event) => {
        this.handleFieldFocus(event.target);
      });

      // Change events for selects
      if (element.tagName === "SELECT") {
        on(element, "change", (event) => {
          this.validateField(event.target.name);
          this.updateFieldUI(event.target.name);
        });
      }
    });

    // Prevent double submission
    on(this.form, "keydown", (event) => {
      if (event.key === "Enter" && event.target.tagName !== "TEXTAREA") {
        if (this.isSubmitting) {
          event.preventDefault();
        }
      }
    });
  }

  initializeFieldAnimations() {
    // Add floating label animations
    Object.values(this.fields).forEach((field) => {
      const { element } = field;
      const formGroup = element.closest(".form-group");

      if (formGroup && !hasClass(formGroup, "form-field-focus")) {
        addClass(formGroup, "form-field-focus");
      }
    });
  }

  validateField(fieldName) {
    const field = this.fields[fieldName];
    const validator = this.validators[fieldName];

    if (!field || !validator) return true;

    const value = field.element.value.trim();
    field.value = value;
    field.errors = [];

    // Required validation
    if (validator.required && isEmpty(value)) {
      field.errors.push("This field is required");
      field.isValid = false;
      return false;
    }

    // Skip other validations if field is empty and not required
    if (!validator.required && isEmpty(value)) {
      field.isValid = true;
      return true;
    }

    // Length validation
    if (validator.minLength && value.length < validator.minLength) {
      field.errors.push(`Minimum ${validator.minLength} characters required`);
      field.isValid = false;
      return false;
    }

    if (validator.maxLength && value.length > validator.maxLength) {
      field.errors.push(`Maximum ${validator.maxLength} characters allowed`);
      field.isValid = false;
      return false;
    }

    // Pattern validation
    if (validator.pattern && !validator.pattern.test(value)) {
      field.errors.push(validator.message);
      field.isValid = false;
      return false;
    }

    // Custom validations
    if (fieldName === "email" && !isEmail(value)) {
      field.errors.push(validator.message);
      field.isValid = false;
      return false;
    }

    if (fieldName === "phone" && !isPhone(value)) {
      field.errors.push(validator.message);
      field.isValid = false;
      return false;
    }

    field.isValid = true;
    return true;
  }

  validateForm() {
    let isFormValid = true;

    Object.keys(this.fields).forEach((fieldName) => {
      this.markFieldAsDirty(fieldName);
      const isFieldValid = this.validateField(fieldName);
      this.updateFieldUI(fieldName);

      if (!isFieldValid) {
        isFormValid = false;
      }
    });

    return isFormValid;
  }

  markFieldAsDirty(fieldName) {
    const field = this.fields[fieldName];
    if (field) {
      field.isDirty = true;
    }
  }

  updateFieldUI(fieldName) {
    const field = this.fields[fieldName];
    if (!field || !field.isDirty) return;

    const { element, isValid, errors } = field;
    const formGroup = element.closest(".form-group");

    if (!formGroup) return;

    // Remove existing error elements
    const existingError = formGroup.querySelector(".field-error");
    if (existingError) {
      existingError.remove();
    }

    // Update field classes
    removeClass(element, "field-valid", "field-invalid");
    addClass(element, isValid ? "field-valid" : "field-invalid");

    // Add error message if invalid
    if (!isValid && errors.length > 0) {
      const errorElement = createElement("div", {
        className: "field-error",
        textContent: errors[0],
      });

      formGroup.appendChild(errorElement);

      // Animate error message
      if (!prefersReducedMotion()) {
        fadeIn(errorElement, 200);
      }
    }

    // Update ARIA attributes
    element.setAttribute("aria-invalid", !isValid);
    if (!isValid && errors.length > 0) {
      element.setAttribute("aria-describedby", `${fieldName}-error`);
    } else {
      element.removeAttribute("aria-describedby");
    }
  }

  handleFieldFocus(element) {
    const formGroup = element.closest(".form-group");
    if (formGroup) {
      addClass(formGroup, "focused");

      // Remove focus class on blur
      const handleBlur = () => {
        removeClass(formGroup, "focused");
        off(element, "blur", handleBlur);
      };
      on(element, "blur", handleBlur);
    }
  }

  async handleSubmit(event) {
    event.preventDefault();

    if (this.isSubmitting) return;

    // Validate form
    const isValid = this.validateForm();

    if (!isValid) {
      this.focusFirstInvalidField();
      this.showNotification("Please correct the errors below", "error");
      return;
    }

    this.isSubmitting = true;
    this.showSubmittingState();

    try {
      // Collect form data
      const formData = this.collectFormData();

      // Submit form (simulate API call)
      await this.submitForm(formData);

      // Handle success
      this.handleSubmitSuccess();
    } catch (error) {
      console.error("Form submission error:", error);
      this.handleSubmitError(error);
    } finally {
      this.isSubmitting = false;
      this.hideSubmittingState();
    }
  }

  collectFormData() {
    const data = {};

    Object.keys(this.fields).forEach((fieldName) => {
      const field = this.fields[fieldName];
      data[fieldName] = field.value;
    });

    return {
      ...data,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
  }

  async submitForm(formData) {
    // Simulate API call
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate success/failure
        if (Math.random() > 0.1) {
          // 90% success rate
          resolve({ success: true, message: "Form submitted successfully" });
        } else {
          reject(new Error("Server error occurred"));
        }
      }, 2000);
    });
  }

  showSubmittingState() {
    const submitButton = this.form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;

      const originalText = submitButton.textContent;
      submitButton.setAttribute("data-original-text", originalText);

      // Add spinner
      const spinner = createElement("div", { className: "spinner spinner-sm" });
      submitButton.innerHTML = "";
      submitButton.appendChild(spinner);
      submitButton.appendChild(document.createTextNode(" Sending..."));

      addClass(submitButton, "btn-loading");
    }

    // Disable form
    addClass(this.form, "form-submitting");
  }

  hideSubmittingState() {
    const submitButton = this.form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = false;

      const originalText = submitButton.getAttribute("data-original-text");
      if (originalText) {
        submitButton.textContent = originalText;
        submitButton.removeAttribute("data-original-text");
      }

      removeClass(submitButton, "btn-loading");
    }

    // Enable form
    removeClass(this.form, "form-submitting");
  }

  handleSubmitSuccess() {
    this.showNotification(
      "Thank you! Your message has been sent successfully.",
      "success"
    );
    this.resetForm();

    // Scroll to top of form
    scrollTo(this.form, { block: "center" });

    // Analytics tracking
    this.trackFormSubmission("success");
  }

  handleSubmitError(error) {
    this.showNotification(
      "Sorry, there was an error sending your message. Please try again.",
      "error"
    );

    // Analytics tracking
    this.trackFormSubmission("error", error.message);
  }

  resetForm() {
    this.form.reset();

    // Reset field states
    Object.values(this.fields).forEach((field) => {
      field.value = "";
      field.isValid = false;
      field.isDirty = false;
      field.errors = [];

      // Remove UI classes
      removeClass(field.element, "field-valid", "field-invalid");
    });

    // Remove error messages
    $$(".field-error", this.form).forEach((error) => error.remove());

    // Remove form classes
    removeClass(this.form, "form-submitting");
  }

  focusFirstInvalidField() {
    const firstInvalidField = Object.values(this.fields).find(
      (field) => !field.isValid && field.isDirty
    );

    if (firstInvalidField) {
      firstInvalidField.element.focus();
      scrollTo(firstInvalidField.element, { block: "center" });
    }
  }

  showNotification(message, type = "info") {
    // Create notification element
    const notification = createElement("div", {
      className: `notification notification-${type}`,
      innerHTML: `
        <div class="notification-icon">
          ${this.getNotificationIcon(type)}
        </div>
        <div class="notification-content">
          <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close" aria-label="Close notification">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6l12 12M6 18L18 6"/>
          </svg>
        </button>
      `,
    });

    // Add to document
    document.body.appendChild(notification);

    // Show with animation
    requestAnimationFrame(() => {
      addClass(notification, "show");
    });

    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.hideNotification(notification);
    }, 5000);

    // Handle close button
    const closeButton = notification.querySelector(".notification-close");
    on(closeButton, "click", () => {
      this.hideNotification(notification);
    });
  }

  hideNotification(notification) {
    removeClass(notification, "show");

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }

  getNotificationIcon(type) {
    const icons = {
      success:
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
      error:
        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
    };

    return icons[type] || icons.info;
  }

  trackFormSubmission(status, error = null) {
    // Analytics tracking (Google Analytics, etc.)
    if (typeof gtag !== "undefined") {
      gtag("event", "form_submit", {
        event_category: "Contact",
        event_label: status,
        value: status === "success" ? 1 : 0,
      });
    }

    // Custom analytics
    if (window.analytics) {
      window.analytics.track("Contact Form Submitted", {
        status,
        error,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Public methods
  setFieldValue(fieldName, value) {
    const field = this.fields[fieldName];
    if (field) {
      field.element.value = value;
      field.value = value;
      this.validateField(fieldName);
      this.updateFieldUI(fieldName);
    }
  }

  getFieldValue(fieldName) {
    const field = this.fields[fieldName];
    return field ? field.value : null;
  }

  getFormData() {
    return this.collectFormData();
  }

  // Clean up
  destroy() {
    // Remove event listeners
    off(this.form, "submit", this.handleSubmit);

    Object.values(this.fields).forEach((field) => {
      off(field.element, "input");
      off(field.element, "blur");
      off(field.element, "focus");
      off(field.element, "change");
    });

    // Remove notifications
    $$(".notification").forEach((notification) => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    });
  }
}

// Auto-initialize if DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.contactForm = new ContactForm();
  });
} else {
  window.contactForm = new ContactForm();
}

// Export for module usage
if (typeof module !== "undefined" && module.exports) {
  module.exports = ContactForm;
}
