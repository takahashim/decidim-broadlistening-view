# frozen_string_literal: true

module Decidim
  module BroadlisteningView
    module Admin
      class ReportForm < Decidim::Form
        mimic :report

        attribute :title, String
        attribute :description, String
        attribute :json_file
        attribute :json_text, String

        validates :title, presence: true
        validate :validate_json_data

        def result_data
          @result_data ||= parse_json_data
        end

        def map_model(model)
          self.title = model.title
          self.description = model.description
          self.json_text = model.result_data.to_json if model.result_data.present?
        end

        private

        def parse_json_data
          if json_file.present?
            JSON.parse(json_file.read)
          elsif json_text.present?
            JSON.parse(json_text)
          end
        rescue JSON::ParserError
          nil
        end

        def validate_json_data
          return if json_file.blank? && json_text.blank?

          if result_data.nil?
            errors.add(:base, I18n.t("reports.form.invalid_json", scope: "decidim.broadlistening_view.admin"))
            return
          end

          required_keys = %w[arguments clusters overview]
          missing_keys = required_keys - result_data.keys

          return if missing_keys.empty?

          errors.add(:base, I18n.t("reports.form.missing_keys",
                                   scope: "decidim.broadlistening_view.admin",
                                   keys: missing_keys.join(", ")))
        end
      end
    end
  end
end
