# frozen_string_literal: true

module Decidim
  module BroadlisteningView
    module ApplicationHelper
      # Color palette for clusters (matching broadlistening-ruby)
      CLUSTER_COLORS = [
        "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
        "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
        "#aec7e8", "#ffbb78", "#98df8a", "#ff9896", "#c5b0d5"
      ].freeze

      def cluster_color(index)
        CLUSTER_COLORS[index % CLUSTER_COLORS.length]
      end

      def format_count(count)
        number_with_delimiter(count)
      end
    end
  end
end
