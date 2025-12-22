// Chart Manager for Broadlistening visualization
import Plotly from "../../../vendor/plotly-basic-2.35.0.min.js";

// Color palette for clusters
const CLUSTER_COLORS = [
  "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
  "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
  "#aec7e8", "#ffbb78", "#98df8a", "#ff9896", "#c5b0d5"
];

export class ChartManager {
  constructor(container, data, options = {}) {
    this.container = container;
    this.data = data;
    this.options = {
      defaultChart: "scatter",
      showFilter: true,
      ...options
    };

    this.arguments = data.arguments || [];
    this.clusters = data.clusters || [];
    this.comments = data.comments || {};

    this.init();
  }

  init() {
    if (this.arguments.length === 0) {
      this.container.innerHTML = '<p class="callout warning">データがありません。</p>';
      return;
    }

    this.createLayout();
    this.renderScatterChart();
  }

  createLayout() {
    this.container.innerHTML = `
      <div class="broadlistening-view-chart">
        <div class="broadlistening-view-chart__plot" id="scatter-plot-${this.container.id || 'main'}"></div>
      </div>
    `;

    this.plotContainer = this.container.querySelector(".broadlistening-view-chart__plot");
  }

  renderScatterChart() {
    const colors = this.getPointColors();
    const annotations = this.getClusterAnnotations();

    const trace = {
      x: this.arguments.map(a => a.x),
      y: this.arguments.map(a => a.y),
      mode: "markers",
      type: "scattergl",
      marker: {
        color: colors,
        size: 6,
        opacity: 0.7
      },
      text: this.arguments.map(a => this.formatHoverText(a)),
      hoverinfo: "text",
      hoverlabel: {
        bgcolor: "white",
        font: { size: 12 }
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
      margin: { l: 20, r: 20, t: 20, b: 20 },
      annotations: annotations,
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)"
    };

    const config = {
      responsive: true,
      displayModeBar: true,
      modeBarButtonsToRemove: ["select2d", "lasso2d", "resetScale2d", "toImage"],
      displaylogo: false,
      scrollZoom: true
    };

    Plotly.newPlot(this.plotContainer, [trace], layout, config);
  }

  getPointColors() {
    return this.arguments.map(arg => {
      const clusterIds = arg.cluster_ids || [];
      // Use level 1 cluster for coloring (index 1 in cluster_ids array)
      const level1ClusterId = clusterIds[1];
      if (!level1ClusterId) {
        return "#cccccc";
      }

      // Extract cluster index from id like "1_0", "1_1", etc.
      const match = level1ClusterId.match(/_(\d+)$/);
      if (match) {
        const index = parseInt(match[1], 10);
        return CLUSTER_COLORS[index % CLUSTER_COLORS.length];
      }

      return "#cccccc";
    });
  }

  getClusterAnnotations() {
    // Get level 1 clusters for annotations
    const level1Clusters = this.clusters.filter(c => c.level === 1);

    return level1Clusters.map(cluster => {
      // Calculate centroid for this cluster
      const clusterPoints = this.arguments.filter(arg =>
        arg.cluster_ids && arg.cluster_ids.includes(cluster.id)
      );

      if (clusterPoints.length === 0) {
        return null;
      }

      const centroid = {
        x: clusterPoints.reduce((sum, p) => sum + p.x, 0) / clusterPoints.length,
        y: clusterPoints.reduce((sum, p) => sum + p.y, 0) / clusterPoints.length
      };

      return {
        x: centroid.x,
        y: centroid.y,
        text: cluster.label,
        showarrow: false,
        font: {
          size: 11,
          color: "#333"
        },
        bgcolor: "rgba(255, 255, 255, 0.8)",
        borderpad: 4
      };
    }).filter(a => a !== null);
  }

  formatHoverText(argument) {
    const lines = [];

    // Add argument text (truncated)
    const text = argument.argument || "";
    const truncated = text.length > 100 ? text.substring(0, 100) + "..." : text;
    lines.push(truncated);

    // Add cluster info
    if (argument.cluster_ids && argument.cluster_ids.length > 1) {
      const clusterId = argument.cluster_ids[1];
      const cluster = this.clusters.find(c => c.id === clusterId);
      if (cluster) {
        lines.push(`[${cluster.label}]`);
      }
    }

    return lines.join("<br>");
  }
}
