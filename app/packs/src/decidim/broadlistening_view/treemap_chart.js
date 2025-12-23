// Treemap Chart for Broadlistening visualization
import Plotly from "../../../vendor/plotly-2.35.0.min.js";
import { escapeHtml } from "./decidim_core_shim";
import { wrapText } from "./utils";

// Pastel color palette for treemap (matches cluster-view)
const TREEMAP_COLORS = [
  "#b3daa1", // light green
  "#f5c5d7", // light pink
  "#d5e5f0", // light blue
  "#fbecc0", // light yellow
  "#80b8ca", // teal
  "#dabeed", // light purple
  "#fad1af", // peach
  "#fbb09d", // coral
  "#a6e3ae", // mint
  "#f1e4d6"  // cream
];

export default class TreemapChart {
  constructor(container, data, options = {}) {
    this.container = container;
    this.arguments = data.arguments || [];
    this.clusters = data.clusters || [];
    this.options = {
      level: "0",
      onLevelChange: null,
      filteredArgumentIds: null,
      filteredClusterIds: null,
      ...options
    };

    this.maxLevel = Math.max(...this.clusters.map(c => c.level || 0), 0);
  }

  render() {
    if (this.clusters.length === 0) {
      this.container.innerHTML = '<p class="text-gray text-center py-8">データがありません。</p>';
      return;
    }

    const treemapData = this.buildTreemapData();
    const layout = this.buildLayout();
    const config = {
      responsive: true,
      displayModeBar: false,
      locale: "ja"
    };

    Plotly.newPlot(this.container, [treemapData], layout, config).then(() => {
      // Add click event listener for zooming
      this.container.on("plotly_click", (event) => {
        if (event.points && event.points[0]) {
          const clickedId = event.points[0].data.ids[event.points[0].pointNumber];
          if (clickedId && this.options.onLevelChange) {
            this.options.onLevelChange(clickedId.toString());
          }
        }
      });

      // Darken pathbar on hover for visibility
      this.container.on("plotly_hover", () => this.darkenPathbar());
      this.container.on("plotly_unhover", () => this.darkenPathbar());
      this.darkenPathbar();
    });
  }

  buildTreemapData() {
    const { level, filteredArgumentIds, filteredClusterIds } = this.options;
    const isArgumentFiltering = !!filteredArgumentIds;
    const isClusterFiltering = !!filteredClusterIds;

    // Convert clusters to treemap nodes
    const clusterNodes = this.clusters.map((cluster, index) => {
      const isFiltered = isClusterFiltering &&
                         cluster.level === this.maxLevel &&
                         !filteredClusterIds.has(cluster.id);

      return {
        id: cluster.id,
        label: cluster.label,
        parent: index === 0 ? "" : cluster.parent,
        value: cluster.value || 0,
        takeaway: cluster.takeaway || "",
        filtered: isFiltered
      };
    });

    // Convert arguments to leaf nodes
    const argumentNodes = this.arguments.map(arg => {
      const parentClusterId = arg.cluster_ids[2] || arg.cluster_ids[1] || arg.cluster_ids[0];

      let isFiltered = false;
      if (isArgumentFiltering && !filteredArgumentIds.has(arg.arg_id)) {
        isFiltered = true;
      }
      if (isClusterFiltering) {
        // Cluster IDs follow the format "${level}_${index}" (e.g., "1_0", "2_3")
        const deepestClusterId = arg.cluster_ids.find(id => id.startsWith(`${this.maxLevel}_`));
        if (deepestClusterId && !filteredClusterIds.has(deepestClusterId)) {
          isFiltered = true;
        }
      }

      return {
        id: arg.arg_id,
        label: arg.argument,
        parent: parentClusterId,
        value: 1,
        takeaway: "",
        filtered: isFiltered
      };
    });

    const allNodes = [...clusterNodes, ...argumentNodes];

    return {
      type: "treemap",
      ids: allNodes.map(n => n.id),
      labels: allNodes.map(n => {
        const maxChars = n.id === level ? 50 : 15;
        return wrapText(escapeHtml(n.label), maxChars);
      }),
      parents: allNodes.map(n => n.parent),
      values: allNodes.map(n => n.filtered ? 0 : n.value),
      customdata: allNodes.map(n => {
        if (n.filtered) return "";
        return wrapText(escapeHtml(n.takeaway), 15);
      }),
      level: level,
      branchvalues: "total",
      marker: {
        colors: allNodes.map(n => n.filtered ? "#cccccc" : ""),
        line: {
          width: 1,
          color: "white"
        }
      },
      hoverinfo: "text",
      hovertemplate: "%{customdata}<extra></extra>",
      hoverlabel: {
        align: "left"
      },
      texttemplate: "%{label}<br>%{value:,}件<br>%{percentEntry:.2%}",
      textfont: {
        size: 14
      },
      insidetextfont: {
        size: 14
      },
      maxdepth: 2,
      pathbar: {
        thickness: 32,
        textfont: {
          size: 14
        }
      }
    };
  }

  buildLayout() {
    return {
      margin: { l: 10, r: 10, b: 10, t: 30 },
      colorway: TREEMAP_COLORS
    };
  }

  darkenPathbar() {
    const panels = this.container.querySelectorAll(".treemap > .slice > .surface");
    const lastPanel = panels[panels.length - 1];
    const leafColor = this.getElementColor(lastPanel);

    if (panels.length > 1) {
      this.darkenElement(panels[0], leafColor);
    }

    const pathbars = this.container.querySelectorAll(".treemap > .pathbar > .surface");
    for (const pathbar of pathbars) {
      this.darkenElement(pathbar, leafColor);
    }
  }

  getElementColor(elem) {
    if (!elem) return "";
    try {
      const style = elem.getAttribute("style") || "";
      const match = style.match(/fill:\s*(rgb\([^)]+\))/);
      return match ? match[1] : "";
    } catch {
      return "";
    }
  }

  darkenElement(elem, originalColor) {
    if (!elem || !originalColor) return;

    const currentColor = this.getElementColor(elem);
    if (currentColor !== originalColor) return;

    const darkenedColor = originalColor.replace(
      /rgb\((\d+),\s*(\d+),\s*(\d+)\)/,
      (match, r, g, b) => {
        const darken = (val) => Math.max(0, parseInt(val) - 30);
        return `rgb(${darken(r)}, ${darken(g)}, ${darken(b)})`;
      }
    );

    const style = elem.getAttribute("style") || "";
    const newStyle = style.replace(originalColor, darkenedColor);
    elem.setAttribute("style", newStyle);
  }

  /**
   * Update chart options and re-render
   * @param {Object} newOptions - New options to merge
   */
  update(newOptions) {
    this.options = { ...this.options, ...newOptions };

    // Use react for smoother updates
    const treemapData = this.buildTreemapData();
    const layout = this.buildLayout();

    Plotly.react(this.container, [treemapData], layout).then(() => {
      this.darkenPathbar();
    });
  }

  /**
   * Destroy the chart
   */
  destroy() {
    Plotly.purge(this.container);
  }
}
