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
