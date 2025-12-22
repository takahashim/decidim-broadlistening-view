# frozen_string_literal: true

module Decidim
  module BroadlisteningView
    class Report < ApplicationRecord
      self.table_name = "decidim_broadlistening_view_reports"

      belongs_to :component, foreign_key: "decidim_component_id", class_name: "Decidim::Component"

      validates :title, presence: true

      scope :published, -> { where(published: true) }
      scope :draft, -> { where(published: false) }

      # Convenience methods for accessing result_data
      def arguments
        result_data["arguments"] || []
      end

      def clusters
        result_data["clusters"] || []
      end

      def comments
        result_data["comments"] || {}
      end

      def property_map
        result_data["propertyMap"] || {}
      end

      def overview
        result_data["overview"]
      end

      def config
        result_data["config"] || {}
      end

      def comment_num
        result_data["comment_num"] || arguments.size
      end

      def cluster_at_level(level)
        clusters.select { |c| c["level"] == level }
      end

      def top_level_clusters
        cluster_at_level(1).sort_by { |c| -(c["value"] || 0) }
      end

      def children_of(parent_id)
        clusters.select { |c| c["parent"] == parent_id }.sort_by { |c| -(c["value"] || 0) }
      end

      def max_cluster_level
        clusters.map { |c| c["level"] || 0 }.max || 0
      end

      def hierarchical_clusters
        build_hierarchy("0")
      end

      private

      def build_hierarchy(parent_id, depth = 0)
        return [] if depth > 3

        children_of(parent_id).map do |cluster|
          {
            cluster: cluster,
            children: build_hierarchy(cluster["id"], depth + 1)
          }
        end
      end

      public

      # JSON validation
      def valid_result_data?
        return false if result_data.blank?
        return false unless result_data.is_a?(Hash)

        required_keys = %w[arguments clusters overview]
        required_keys.all? { |key| result_data.key?(key) }
      end

      def has_data?
        result_data.present? && arguments.any?
      end
    end
  end
end
