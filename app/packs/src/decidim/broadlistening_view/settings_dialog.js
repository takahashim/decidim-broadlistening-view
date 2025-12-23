// Settings Dialog component for Broadlistening visualization
// Uses a11y-dialog-component for accessibility
import { icon, escapeHtml, Dialogs } from "./decidim_core_shim";
import { t } from "./i18n";

/**
 * Settings Dialog for density filter configuration
 */
export default class SettingsDialog {
  /**
   * @param {Object} options
   * @param {number} options.maxDensity - Current max density value (0-1)
   * @param {number} options.minValue - Current min value
   * @param {Function} options.onApply - Callback when settings are applied
   * @param {Function} options.onClose - Callback when dialog is closed
   */
  constructor(options = {}) {
    this.options = {
      maxDensity: 0.2,
      minValue: 5,
      onApply: null,
      onClose: null,
      ...options
    };

    this.element = null;
    this.dialog = null;
    this.isOpen = false;
  }

  /**
   * Open the settings dialog
   */
  open() {
    if (this.isOpen) return;
    this.isOpen = true;

    const { maxDensity, minValue } = this.options;
    const dialogId = `blv-settings-${Math.random().toString(36).slice(2)}`;

    this.element = document.createElement("div");
    this.element.dataset.dialog = dialogId;
    this.element.className = "blv-settings-dialog";

    this.element.innerHTML = `
      <div id="${escapeHtml(dialogId)}-content" class="blv-settings-dialog__content">
        <button type="button"
                class="blv-settings-dialog__close"
                data-dialog-close="${escapeHtml(dialogId)}"
                data-dialog-closable
                aria-label="${escapeHtml(t("common.close"))}">
          ${icon("close-line")}
        </button>
        <div data-dialog-container class="blv-settings-dialog__container">
          <h3 id="dialog-title-${escapeHtml(dialogId)}" data-dialog-title class="blv-settings-dialog__title">
            ${escapeHtml(t("settings.title"))}
          </h3>
          <div id="dialog-desc-${escapeHtml(dialogId)}" class="blv-settings-dialog__body">
            <div class="blv-settings-dialog__field">
              <label for="${escapeHtml(dialogId)}-maxDensity">${escapeHtml(t("settings.max_density_label"))}</label>
              <div class="blv-slider">
                <input type="range"
                       id="${escapeHtml(dialogId)}-maxDensity"
                       min="0.1" max="1" step="0.1"
                       value="${escapeHtml(String(maxDensity))}"
                       data-setting="maxDensity" />
                <div class="blv-slider__labels">
                  <span>10%</span>
                  <span class="blv-slider__value">${escapeHtml(String(Math.round(maxDensity * 100)))}%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
            <div class="blv-settings-dialog__field">
              <label for="${escapeHtml(dialogId)}-minValue">${escapeHtml(t("settings.min_value_label"))}</label>
              <div class="blv-slider">
                <input type="range"
                       id="${escapeHtml(dialogId)}-minValue"
                       min="0" max="10" step="1"
                       value="${escapeHtml(String(minValue))}"
                       data-setting="minValue" />
                <div class="blv-slider__labels">
                  <span>0</span>
                  <span class="blv-slider__value">${escapeHtml(t("common.items_count", { count: minValue }))}</span>
                  <span>10</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div data-dialog-actions class="blv-settings-dialog__footer">
          <button type="button"
                  class="button button__sm button__transparent-secondary"
                  data-dialog-close="${escapeHtml(dialogId)}">
            ${escapeHtml(t("common.cancel"))}
          </button>
          <button type="button"
                  class="button button__sm button__secondary"
                  data-action="apply">
            ${escapeHtml(t("common.apply"))}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.element);

    // Initialize a11y-dialog-component
    this.dialog = new Dialogs(`[data-dialog="${dialogId}"]`, {
      closingSelector: `[data-dialog-close="${dialogId}"]`,
      backdropSelector: `[data-dialog="${dialogId}"]`,
      labelledby: `dialog-title-${dialogId}`,
      describedby: `dialog-desc-${dialogId}`,
      enableAutoFocus: false,
      onOpen: () => {
        setTimeout(() => this.focusFirstInput(), 0);
      },
      onClose: () => {
        setTimeout(() => this.handleClose(), 0);
      }
    });

    this.bindEvents();
    this.dialog.open();
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    if (!this.element) return;

    // Slider value updates
    this.element.querySelectorAll("input[type='range']").forEach(input => {
      input.addEventListener("input", (e) => {
        const value = parseFloat(e.target.value);
        const valueDisplay = e.target.parentElement.querySelector(".blv-slider__value");
        if (e.target.dataset.setting === "maxDensity") {
          valueDisplay.textContent = `${Math.round(value * 100)}%`;
        } else {
          valueDisplay.textContent = t("common.items_count", { count: value });
        }
      });
    });

    // Apply button
    this.element.querySelector("[data-action='apply']").addEventListener("click", () => {
      this.apply();
    });
  }

  /**
   * Focus first input element
   */
  focusFirstInput() {
    const firstInput = this.element.querySelector("input[type='range']");
    if (firstInput) {
      firstInput.focus();
    }
  }

  /**
   * Apply settings and close
   */
  apply() {
    if (!this.element) return;

    const maxDensityInput = this.element.querySelector("[data-setting='maxDensity']");
    const minValueInput = this.element.querySelector("[data-setting='minValue']");

    const newSettings = {
      maxDensity: parseFloat(maxDensityInput.value),
      minValue: parseInt(minValueInput.value, 10)
    };

    if (this.options.onApply) {
      this.options.onApply(newSettings);
    }

    this.dialog.close();
  }

  /**
   * Handle dialog close (called by a11y-dialog-component)
   */
  handleClose() {
    this.destroy();

    if (this.options.onClose) {
      this.options.onClose();
    }
  }

  /**
   * Close the dialog
   */
  close() {
    if (!this.isOpen || !this.dialog) return;
    this.dialog.close();
  }

  /**
   * Destroy dialog and clean up
   */
  destroy() {
    this.isOpen = false;

    if (this.dialog) {
      this.dialog.destroy();
      this.dialog = null;
    }

    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}
