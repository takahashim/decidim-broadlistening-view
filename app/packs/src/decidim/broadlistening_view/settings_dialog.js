// Settings Dialog component for Broadlistening visualization
// Uses a11y-dialog-component for accessibility
import Dialog from "a11y-dialog-component";
import icon from "src/decidim/icon";

/**
 * Settings Dialog for density filter configuration
 */
export class SettingsDialog {
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
      <div id="${dialogId}-content" class="blv-settings-dialog__content">
        <button type="button"
                class="blv-settings-dialog__close"
                data-dialog-close="${dialogId}"
                data-dialog-closable
                aria-label="閉じる">
          ${icon("close-line")}
        </button>
        <div data-dialog-container>
          <h3 id="dialog-title-${dialogId}" data-dialog-title class="blv-settings-dialog__title">
            表示設定
          </h3>
          <div id="dialog-desc-${dialogId}" class="blv-settings-dialog__body">
            <div class="blv-settings-dialog__field">
              <label for="${dialogId}-maxDensity">上位何%の意見グループを表示するか</label>
              <div class="blv-slider">
                <input type="range"
                       id="${dialogId}-maxDensity"
                       min="0.1" max="1" step="0.1"
                       value="${maxDensity}"
                       data-setting="maxDensity" />
                <div class="blv-slider__labels">
                  <span>10%</span>
                  <span class="blv-slider__value">${Math.round(maxDensity * 100)}%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
            <div class="blv-settings-dialog__field">
              <label for="${dialogId}-minValue">意見グループのサンプル数の最小数</label>
              <div class="blv-slider">
                <input type="range"
                       id="${dialogId}-minValue"
                       min="0" max="10" step="1"
                       value="${minValue}"
                       data-setting="minValue" />
                <div class="blv-slider__labels">
                  <span>0</span>
                  <span class="blv-slider__value">${minValue}件</span>
                  <span>10</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div data-dialog-actions class="blv-settings-dialog__footer">
          <button type="button"
                  class="button button__sm button__transparent-secondary"
                  data-dialog-close="${dialogId}">
            キャンセル
          </button>
          <button type="button"
                  class="button button__sm button__secondary"
                  data-action="apply">
            適用
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.element);

    // Initialize a11y-dialog-component
    this.dialog = new Dialog(`[data-dialog="${dialogId}"]`, {
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
          valueDisplay.textContent = `${value}件`;
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
