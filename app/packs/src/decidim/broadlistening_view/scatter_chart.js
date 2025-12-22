// Scatter Chart for Broadlistening visualization
import Plotly from "../../../vendor/plotly-2.35.0.min.js";
import { getClusterColor, INACTIVE_COLOR } from "./colors.js";

/**
 * Wrap text to specified character limit
 * @param {string} text - Text to wrap
 * @param {number} maxChars - Maximum characters per line
 * @returns {string} Wrapped text with <br> tags
 */
function wrapText(text, maxChars = 16) {
  if (!text || text.length <= maxChars) return text;

  const words = text.split("");
  const lines = [];
  let currentLine = "";

  for (const char of words) {
    if (currentLine.length >= maxChars) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine += char;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.join("<br>");
}

export class ScatterChart {
  constructor(container, data, options = {}) {
    this.container = container;
    this.arguments = data.arguments || [];
    this.clusters = data.clusters || [];
    this.options = {
      targetLevel: 1,
      selectedClusterId: null,
      filteredArgumentIds: null,
      ...options
    };

    // Build cluster indexes for O(1) lookups
    this.clusterById = new Map(this.clusters.map(c => [c.id, c]));
    this.childrenByParent = new Map();
    for (const cluster of this.clusters) {
      if (cluster.parent) {
        if (!this.childrenByParent.has(cluster.parent)) {
          this.childrenByParent.set(cluster.parent, []);
        }
        this.childrenByParent.get(cluster.parent).push(cluster);
      }
    }
  }

  render() {
    if (this.arguments.length === 0) {
      this.container.innerHTML = '<p class="text-gray text-center py-8">データがありません。</p>';
      return;
    }

    const colors = this.getPointColors();
    const annotations = this.getClusterAnnotations();

    const trace = {
      x: this.arguments.map(a => a.x),
      y: this.arguments.map(a => a.y),
      mode: "markers",
      type: "scattergl",
      marker: {
        color: colors,
        size: 8,
        opacity: 0.7
      },
      text: this.arguments.map(a => this.formatHoverText(a)),
      hoverinfo: "text",
      hovertemplate: "%{text}<extra></extra>",
      hoverlabel: {
        align: "left",
        bgcolor: "white",
        bordercolor: "#ccc",
        font: { size: 12, family: "sans-serif" }
      }
    };

    const layout = {
      showlegend: false,
      hovermode: "closest",
      dragmode: "pan",
      xaxis: {
        showgrid: false,
        zeroline: false,
        showticklabels: false,
        title: ""
      },
      yaxis: {
        showgrid: false,
        zeroline: false,
        showticklabels: false,
        title: ""
      },
      margin: { l: 10, r: 10, t: 10, b: 10 },
      annotations: annotations,
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)"
    };

    const config = {
      responsive: true,
      displayModeBar: true,
      modeBarButtonsToRemove: ["select2d", "lasso2d", "resetScale2d", "toImage", "zoom2d"],
      displaylogo: false,
      scrollZoom: true
    };

    Plotly.newPlot(this.container, [trace], layout, config);
  }

  /**
   * Get cluster ID at specific level from an argument's cluster_ids
   */
  getClusterIdAtLevel(clusterIds, level) {
    return clusterIds.find(id => id.startsWith(`${level}_`));
  }

  getPointColors() {
    const { targetLevel, selectedClusterId, filteredArgumentIds } = this.options;

    // Pre-compute child cluster IDs for selected cluster (if any)
    let childIds = null;
    if (selectedClusterId) {
      const childClusters = this.childrenByParent.get(selectedClusterId) || [];
      childIds = new Set(childClusters.map(c => c.id));
    }

    return this.arguments.map(arg => {
      // Check if argument is filtered out
      if (filteredArgumentIds && !filteredArgumentIds.has(arg.arg_id)) {
        return INACTIVE_COLOR;
      }

      const clusterIds = arg.cluster_ids || [];

      // If a cluster is selected, show children of that cluster
      if (selectedClusterId && childIds) {
        // Check if this point belongs to one of the child clusters
        const childId = clusterIds.find(id => childIds.has(id));
        if (childId) {
          return getClusterColor(childId);
        }
        return INACTIVE_COLOR;
      }

      // Default: color by target level cluster
      const clusterId = this.getClusterIdAtLevel(clusterIds, targetLevel);
      if (!clusterId) {
        return INACTIVE_COLOR;
      }

      return getClusterColor(clusterId);
    });
  }

  /**
   * Calculate centroid for a set of points
   */
  calculateCentroid(points) {
    if (points.length === 0) return null;
    const sumX = points.reduce((acc, p) => acc + p.x, 0);
    const sumY = points.reduce((acc, p) => acc + p.y, 0);
    return {
      x: sumX / points.length,
      y: sumY / points.length
    };
  }

  /**
   * Group points by cluster ID at a specific level
   */
  groupPointsByCluster(clusterLevel) {
    const groups = new Map();

    this.arguments.forEach(arg => {
      const clusterId = arg.cluster_ids.find(id => {
        const level = parseInt(id.split("_")[0], 10);
        return level === clusterLevel;
      });

      if (clusterId) {
        const existing = groups.get(clusterId) || [];
        existing.push(arg);
        groups.set(clusterId, existing);
      }
    });

    return groups;
  }

  getClusterAnnotations() {
    const { targetLevel, selectedClusterId } = this.options;

    let clustersToShow;
    let clusterPoints;

    if (selectedClusterId) {
      // Show children of selected cluster
      clustersToShow = this.childrenByParent.get(selectedClusterId) || [];
      const childLevel = clustersToShow[0]?.level || targetLevel + 1;
      clusterPoints = this.groupPointsByCluster(childLevel);
    } else {
      // Show target level clusters
      clustersToShow = this.clusters.filter(c => c.level === targetLevel);
      clusterPoints = this.groupPointsByCluster(targetLevel);
    }

    return clustersToShow
      .filter(cluster => {
        const points = clusterPoints.get(cluster.id);
        return points && points.length > 0;
      })
      .map(cluster => {
        const points = clusterPoints.get(cluster.id);
        const centroid = this.calculateCentroid(points);

        if (!centroid) return null;

        return {
          x: centroid.x,
          y: centroid.y,
          text: wrapText(cluster.label, 16),
          showarrow: false,
          font: {
            size: 11,
            color: "#333",
            family: "sans-serif"
          },
          bgcolor: "rgba(255, 255, 255, 0.85)",
          borderpad: 4,
          borderwidth: 0
        };
      })
      .filter(a => a !== null);
  }

  formatHoverText(argument) {
    const lines = [];

    // Add argument text (with wrapping)
    const text = argument.argument || "";
    const wrapped = this.wrapHoverText(text, 30);
    lines.push(wrapped);

    // Add cluster info based on current view
    const { selectedClusterId, targetLevel } = this.options;

    if (selectedClusterId) {
      // Show child cluster label
      const childClusters = this.childrenByParent.get(selectedClusterId) || [];
      const childIds = new Set(childClusters.map(c => c.id));
      const childId = argument.cluster_ids.find(id => childIds.has(id));
      if (childId) {
        const cluster = this.clusterById.get(childId);
        if (cluster) {
          lines.push(`<b>[${cluster.label}]</b>`);
        }
      }
    } else if (argument.cluster_ids && argument.cluster_ids.length > targetLevel) {
      const clusterId = this.getClusterIdAtLevel(argument.cluster_ids, targetLevel);
      const cluster = this.clusterById.get(clusterId);
      if (cluster) {
        lines.push(`<b>[${cluster.label}]</b>`);
      }
    }

    return lines.join("<br>");
  }

  wrapHoverText(text, maxChars) {
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

      // Limit to 4 lines
      if (lines.length >= 4) {
        lines[lines.length - 1] += "...";
        break;
      }
    }

    return lines.join("<br>");
  }

  /**
   * Update chart options and re-render
   * @param {Object} newOptions - New options to merge
   */
  update(newOptions) {
    this.options = { ...this.options, ...newOptions };
    this.render();
  }

  /**
   * Destroy the chart
   */
  destroy() {
    Plotly.purge(this.container);
  }
}
