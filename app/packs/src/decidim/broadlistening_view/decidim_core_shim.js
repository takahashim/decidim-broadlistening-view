/**
 * Shim for decidim-core utilities
 *
 * This shim provides a centralized import point for decidim-core utilities.
 * Internal paths may change between decidim versions (e.g., icon.js moved
 * from src/decidim/icon to src/decidim/refactor/moved/icon in 0.30+).
 *
 * When decidim-core implements the official public API at src/decidim/core,
 * update the imports below to use that stable API instead.
 *
 * See: docs/proposal-decidim-js-public-api.md
 */

// Paths for decidim-core 0.29.x
export { escapeHtml, escapeQuotes } from "src/decidim/utilities/text";
export { default as icon } from "src/decidim/icon";
export { Dialogs } from "src/decidim/a11y";
