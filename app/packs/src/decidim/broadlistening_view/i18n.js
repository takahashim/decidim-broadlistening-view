/**
 * I18n helper for Broadlistening View
 *
 * Reads localized strings directly from a data attribute set by Rails.
 * Simple and reliable - no timing dependencies.
 *
 * See: config/locales/*.yml for message definitions
 */

/**
 * Get all broadlistening_view messages from DOM
 * @returns {Object} Messages object
 */
const getViewMessages = () => {
  const element = document.getElementById("broadlistening-view-i18n");
  if (!element || !element.dataset.messages) {
    return {};
  }

  try {
    return JSON.parse(element.dataset.messages);
  } catch (e) {
    console.error("[broadlistening_view] Failed to parse i18n messages:", e);
    return {};
  }
};

/**
 * Get a translated message by key
 * @param {string} key - Dot-separated key (e.g., "toolbar.all")
 * @param {Object} interpolations - Values to interpolate (e.g., { count: 5 })
 * @returns {string} Translated message or key if not found
 */
export const t = (key, interpolations = {}) => {
  const messages = getViewMessages();

  // Navigate to the nested key
  let value = messages;
  for (const part of key.split(".")) {
    if (value && typeof value === "object") {
      value = value[part];
    } else {
      value = undefined;
      break;
    }
  }

  // If not found, return the key itself as fallback
  if (value === undefined || value === null) {
    console.warn(`[broadlistening_view] Missing translation: ${key}`);
    return key;
  }

  // Handle interpolations (e.g., %{count})
  if (typeof value === "string" && Object.keys(interpolations).length > 0) {
    return value.replace(/%\{(\w+)\}/g, (match, name) => {
      return interpolations[name] !== undefined ? interpolations[name] : match;
    });
  }

  return value;
};
