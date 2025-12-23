// Utility functions for Broadlistening visualization

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Wrap text with line breaks at specified character limit
 * @param {string} text - Text to wrap
 * @param {number} maxChars - Maximum characters per line
 * @returns {string} Wrapped text with <br> tags
 */
export function wrapText(text, maxChars) {
  if (!text || text.length <= maxChars) return text;

  const lines = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      lines.push(remaining);
      break;
    }
    lines.push(remaining.substring(0, maxChars));
    remaining = remaining.substring(maxChars);
  }

  return lines.join("<br>");
}

/**
 * Wrap text with line breaks and limit number of lines
 * @param {string} text - Text to wrap
 * @param {number} maxChars - Maximum characters per line
 * @param {number} maxLines - Maximum number of lines (default: 4)
 * @returns {string} Wrapped text with <br> tags, truncated with "..." if needed
 */
export function wrapTextWithLimit(text, maxChars, maxLines = 4) {
  if (!text) return "";
  if (text.length <= maxChars) return text;

  const lines = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      lines.push(remaining);
      break;
    }
    lines.push(remaining.substring(0, maxChars));
    remaining = remaining.substring(maxChars);

    if (lines.length >= maxLines) {
      lines[lines.length - 1] += "...";
      break;
    }
  }

  return lines.join("<br>");
}
