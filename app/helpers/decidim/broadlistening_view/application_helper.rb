# frozen_string_literal: true

module Decidim
  module BroadlisteningView
    module ApplicationHelper
      # Color palette for clusters (matching cluster-view)
      CLUSTER_COLORS = [
        "#7ac943", # green
        "#3fa9f5", # blue
        "#ff7997", # pink
        "#ffcc5c", # yellow
        "#845ec2", # purple
        "#00c9a7", # teal
        "#ff6f61", # coral
        "#6c5ce7", # indigo
        "#fdcb6e", # gold
        "#74b9ff"  # light blue
      ].freeze

      def cluster_color(index)
        CLUSTER_COLORS[index % CLUSTER_COLORS.length]
      end

      def format_count(count)
        number_with_delimiter(count)
      end

      # Generate JavaScript configuration for i18n messages
      # Returns a hidden element with data attribute containing messages
      # JavaScript reads from this element, avoiding timing issues with Turbo
      def broadlistening_view_js_config
        messages = I18n.t("decidim.broadlistening_view.js", default: {})
        return "" if messages.blank?

        content_tag(:div,
                    "",
                    id: "broadlistening-view-i18n",
                    hidden: true,
                    data: { messages: messages.to_json })
      end
    end
  end
end
