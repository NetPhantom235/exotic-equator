/**
 * Sistema de validación de formularios unificado
 */

// Definiciones de tipos en JSDoc para mantener el soporte de TypeScript
/**
 * @typedef {Object} ValidationRule
 * @property {(value: string) => boolean} test
 * @property {string} message
 */

/**
 * @typedef {Object} ValidationOptions
 * @property {boolean} [showOnBlur]
 * @property {boolean} [showOnChange]
 * @property {boolean} [showOnSubmit]
 * @property {boolean} [realtimeValidation]
 * @property {string} [customErrorClass]
 */

/**
 * @typedef {Object} FieldValidation
 * @property {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement} element
 * @property {ValidationRule[]} rules
 * @property {HTMLElement | null} [errorElement]
 * @property {string} [errorClass]
 * @property {boolean} [valid]
 */

const defaultOptions = {
  showOnBlur: true,
  showOnChange: false,
  showOnSubmit: true,
  realtimeValidation: false,
  customErrorClass: 'field-error'
};

export class FormValidator {
  /**
   * @param {HTMLFormElement} formElement
   * @param {Partial<ValidationOptions>} [options={}]
   */
  constructor(formElement, options = {}) {
    /** @type {HTMLFormElement} */
    this.form = formElement;
    /** @type {Record<string, FieldValidation>} */
    this.fields = {};
    /** @type {boolean} */
    this.isValid = true;
    /** @type {ValidationOptions} */
    this.options = { ...defaultOptions, ...options };
    /** @type {string} */
    this.errorClass = this.options.customErrorClass || 'field-error';

    // Bind methods
    this.handleSubmit = this.handleSubmit.bind(this);
    this.validateField = this.validateField.bind(this);
    this.validateForm = this.validateForm.bind(this);

    // Evitar eventos duplicados
    this.form.removeEventListener('submit', this.handleSubmit);
    this.form.addEventListener('submit', this.handleSubmit);
  }

  /**
   * @param {Event} e
   */
  handleSubmit(e) {
    e.preventDefault();
    
    if (this.validateForm()) {
      if (this.submitHandler) {
        this.submitHandler(e);
      } else {
        this.form.submit();
      }
    }
  }

  /**
   * @param {string} fieldName
   * @param {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement} element
   * @param {ValidationRule[]} rules
   * @param {string} [errorClass]
   */
  addField(fieldName, element, rules, errorClass) {
    this.fields[fieldName] = {
      element,
      rules,
      errorClass: errorClass || this.errorClass
    };

    if (this.options.showOnBlur) {
      element.addEventListener('blur', () => this.validateField(fieldName));
    }

    if (this.options.showOnChange) {
      element.addEventListener('input', () => this.validateField(fieldName));
    }
  }

  /**
   * @param {string} fieldName
   * @returns {boolean}
   */
  validateField(fieldName) {
    const field = this.fields[fieldName];
    if (!field) return true;

    const value = field.element.value;
    let isValid = true;
    let errorMessage = '';

    for (const rule of field.rules) {
      if (!rule.test(value)) {
        isValid = false;
        errorMessage = rule.message;
        break;
      }
    }

    field.valid = isValid;
    this.showError(fieldName, isValid ? '' : errorMessage);
    return isValid;
  }

  /**
   * @returns {boolean}
   */
  validateForm() {
    let isValid = true;
    
    for (const fieldName in this.fields) {
      if (!this.validateField(fieldName)) {
        isValid = false;
      }
    }

    this.isValid = isValid;
    return isValid;
  }

  /**
   * @param {string} fieldName
   * @param {string} message
   */
  showError(fieldName, message) {
    const field = this.fields[fieldName];
    if (!field) return;

    let errorElement = field.errorElement;
    
    if (!errorElement) {
      errorElement = document.createElement('span');
      errorElement.className = field.errorClass || this.errorClass;
      field.element.parentNode?.insertBefore(errorElement, field.element.nextSibling);
      field.errorElement = errorElement;
    }

    errorElement.textContent = message;
    field.element.setAttribute('aria-invalid', message ? 'true' : 'false');
    
    if (message) {
      field.element.classList.add('invalid');
      errorElement.classList.add('visible');
    } else {
      field.element.classList.remove('invalid');
      errorElement.classList.remove('visible');
    }
  }

  /**
   * @param {(e: Event) => void} handler
   */
  onSubmit(handler) {
    this.submitHandler = handler;
  }

  reset() {
    this.form.reset();
    for (const fieldName in this.fields) {
      this.showError(fieldName, '');
    }
    this.isValid = true;
  }
}
