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
  "#74b9ff", // light blue
  "#e17055", // burnt orange
  "#00b894", // mint
  "#fd79a8", // hot pink
  "#a29bfe", // lavender
  "#55efc4", // aqua
  "#fab1a0", // peach
  "#81ecec", // cyan
  "#f8b500", // amber
  "#2d98da", // ocean blue
  "#26de81", // lime
  "#fc5c65", // watermelon
  "#45aaf2", // sky blue
  "#a55eea", // violet
  "#fed330", // sunshine
  "#20bf6b", // emerald
  "#eb3b5a", // strawberry
  "#fa8231", // tangerine
  "#4b7bec", // royal blue
  "#8854d0", // grape
  "#2bcbba"  // seafoam
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
