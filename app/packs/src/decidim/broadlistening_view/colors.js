// Color palette for cluster visualization
// Based on cluster-view color scheme

export const CLUSTER_COLORS = [
  "#7ac943", // green
  "#3fa9f5", // blue
  "#ff7997", // pink
  "#ffcc5c", // yellow
  "#845ec2", // purple
  "#00c9a7", // teal
  "#ff6f61", // coral
  "#6c5ce7", // indigo
  "#fdcb6e", // gold
  "#74b9ff"  // light blue
];

// Inactive/filtered color
export const INACTIVE_COLOR = "rgba(200, 200, 200, 0.3)";

/**
 * Get color for a cluster based on its ID
 * @param {string} clusterId - Cluster ID like "1_0", "1_1", etc.
 * @returns {string} Hex color string
 */
export function getClusterColor(clusterId) {
  if (!clusterId) return INACTIVE_COLOR;

  // Extract index from cluster ID (e.g., "1_0" -> 0, "1_5" -> 5)
  const match = clusterId.match(/_(\d+)$/);
  if (match) {
    const index = parseInt(match[1], 10);
    return CLUSTER_COLORS[index % CLUSTER_COLORS.length];
  }

  return CLUSTER_COLORS[0];
}

/**
 * Get color by index
 * @param {number} index - Color index
 * @returns {string} Hex color string
 */
export function getColorByIndex(index) {
  return CLUSTER_COLORS[index % CLUSTER_COLORS.length];
}

/**
 * Convert hex color to rgba with opacity
 * @param {string} hex - Hex color string
 * @param {number} opacity - Opacity value (0-1)
 * @returns {string} RGBA color string
 */
export function hexToRgba(hex, opacity = 1) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;

  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
