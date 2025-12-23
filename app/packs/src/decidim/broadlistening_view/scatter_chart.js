// Scatter Chart for Broadlistening visualization
import Plotly from "../../../vendor/plotly-2.35.0.min.js";
import { getClusterColor, INACTIVE_COLOR } from "./colors";
import { escapeHtml, wrapText, wrapTextWithLimit } from "./utils";

export default class ScatterChart {
  constructor(container, data, options = {}) {
    this.container = container;
    this.arguments = data.arguments || [];
    this.clusters = data.clusters || [];
    this.options = {
      targetLevel: 1,
      selectedClusterId: null,
      filteredArgumentIds: null,
      filteredClusterIds: null, // Set of cluster IDs to show in density mode
      maxLevel: null, // Max level for density mode
      ...options
    };

    // Use pre-built indexes if provided, otherwise build them
    if (this.options.clusterById) {
      this.clusterById = this.options.clusterById;
      this.childrenByParent = this.options.childrenByParent;
      this.clustersByLevel = this.options.clustersByLevel;
      this.argumentsByClusterId = this.options.argumentsByClusterId;
    } else {
      this.buildIndexes();
    }
  }

  /**
   * Build cluster and argument indexes for O(1) lookups
   * Called only when indexes are not provided via options
   */
  buildIndexes() {
    this.clusterById = new Map(this.clusters.map(c => [c.id, c]));
    this.childrenByParent = new Map();
    this.clustersByLevel = new Map();
    for (const cluster of this.clusters) {
      if (cluster.parent) {
        if (!this.childrenByParent.has(cluster.parent)) {
          this.childrenByParent.set(cluster.parent, []);
        }
        this.childrenByParent.get(cluster.parent).push(cluster);
      }
      const level = cluster.level ?? 0;
      if (!this.clustersByLevel.has(level)) {
        this.clustersByLevel.set(level, []);
      }
      this.clustersByLevel.get(level).push(cluster);
    }

    this.argumentsByClusterId = new Map();
    for (const arg of this.arguments) {
      for (const clusterId of (arg.cluster_ids || [])) {
        if (!this.argumentsByClusterId.has(clusterId)) {
          this.argumentsByClusterId.set(clusterId, []);
        }
        this.argumentsByClusterId.get(clusterId).push(arg);
      }
    }
  }

  render() {
    if (this.arguments.length === 0) {
      this.container.innerHTML = '<p class="text-gray text-center py-8">データがありません。</p>';
      return;
    }

    const trace = this.buildTrace();
    const layout = this.buildLayout();
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
   * Build trace data for Plotly
   * @returns {Object} Plotly trace object
   */
  buildTrace() {
    const colors = this.getPointColors();

    return {
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
  }

  /**
   * Build layout for Plotly
   * @returns {Object} Plotly layout object
   */
  buildLayout() {
    const annotations = this.getClusterAnnotations();

    return {
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
  }

  /**
   * Get cluster ID at specific level from an argument's cluster_ids
   * Cluster IDs follow the format "${level}_${index}" (e.g., "1_0", "2_3")
   * @param {string[]} clusterIds - Array of cluster IDs
   * @param {number} level - Target level
   * @returns {string|undefined} Cluster ID at the specified level
   */
  getClusterIdAtLevel(clusterIds, level) {
    return clusterIds.find(id => id.startsWith(`${level}_`));
  }

  getPointColors() {
    const { targetLevel, selectedClusterId, filteredArgumentIds, filteredClusterIds, maxLevel } = this.options;

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

      // Density mode: color by maxLevel cluster, filter by filteredClusterIds
      if (filteredClusterIds && maxLevel !== null) {
        const deepestClusterId = this.getClusterIdAtLevel(clusterIds, maxLevel);
        if (!deepestClusterId || !filteredClusterIds.has(deepestClusterId)) {
          return INACTIVE_COLOR;
        }
        return getClusterColor(deepestClusterId);
      }

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

  getClusterAnnotations() {
    const { targetLevel, selectedClusterId, filteredClusterIds, maxLevel } = this.options;

    let clustersToShow;

    if (filteredClusterIds && maxLevel !== null) {
      // Density mode: show only filtered clusters at maxLevel
      const maxLevelClusters = this.clustersByLevel.get(maxLevel) || [];
      clustersToShow = maxLevelClusters.filter(c => filteredClusterIds.has(c.id));
    } else if (selectedClusterId) {
      // Show children of selected cluster
      clustersToShow = this.childrenByParent.get(selectedClusterId) || [];
    } else {
      // Show target level clusters
      clustersToShow = this.clustersByLevel.get(targetLevel) || [];
    }

    return clustersToShow
      .filter(cluster => {
        const points = this.argumentsByClusterId.get(cluster.id);
        return points && points.length > 0;
      })
      .map(cluster => {
        const points = this.argumentsByClusterId.get(cluster.id);
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

    // Add argument text (with wrapping, escaped for HTML safety)
    const text = escapeHtml(argument.argument || "");
    const wrapped = wrapTextWithLimit(text, 30);
    lines.push(wrapped);

    // Add cluster info based on current view
    const { selectedClusterId, targetLevel, filteredClusterIds, maxLevel } = this.options;

    if (filteredClusterIds && maxLevel !== null) {
      // Density mode: show maxLevel cluster label
      const clusterId = this.getClusterIdAtLevel(argument.cluster_ids || [], maxLevel);
      if (clusterId) {
        const cluster = this.clusterById.get(clusterId);
        if (cluster) {
          lines.push(`<b>[${escapeHtml(cluster.label)}]</b>`);
        }
      }
    } else if (selectedClusterId) {
      // Show child cluster label
      const childClusters = this.childrenByParent.get(selectedClusterId) || [];
      const childIds = new Set(childClusters.map(c => c.id));
      const clusterIds = argument.cluster_ids || [];
      const childId = clusterIds.find(id => childIds.has(id));
      if (childId) {
        const cluster = this.clusterById.get(childId);
        if (cluster) {
          lines.push(`<b>[${escapeHtml(cluster.label)}]</b>`);
        }
      }
    } else {
      // Default: show target level cluster label
      const clusterIds = argument.cluster_ids || [];
      const clusterId = this.getClusterIdAtLevel(clusterIds, targetLevel);
      if (clusterId) {
        const cluster = this.clusterById.get(clusterId);
        if (cluster) {
          lines.push(`<b>[${escapeHtml(cluster.label)}]</b>`);
        }
      }
    }

    return lines.join("<br>");
  }

  /**
   * Update chart options and re-render
   * Uses Plotly.react for smoother updates (preserves zoom/pan state)
   * @param {Object} newOptions - New options to merge
   */
  update(newOptions) {
    this.options = { ...this.options, ...newOptions };

    if (this.arguments.length === 0) {
      return;
    }

    const trace = this.buildTrace();
    const layout = this.buildLayout();

    Plotly.react(this.container, [trace], layout);
  }

  /**
   * Destroy the chart
   */
  destroy() {
    Plotly.purge(this.container);
  }
}
