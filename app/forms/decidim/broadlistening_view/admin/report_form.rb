# frozen_string_literal: true

module Decidim
  module BroadlisteningView
    module Admin
      class ReportForm < Decidim::Form
        include Decidim::TranslatableAttributes

        mimic :report

        translatable_attribute :title, String
        translatable_attribute :description, String
        attribute :json_file
        attribute :json_text, String

        validates :title, translatable_presence: true
        validate :validate_json_data

        def result_data
          @result_data ||= parse_json_data
        end

        def map_model(model)
          # title and description are handled automatically by TranslatableAttributes
          self.json_text = model.result_data.to_json if model.result_data.present?
        end

        private

        def parse_json_data
          raw = if json_file.present?
                  json_file.read
                elsif json_text.present?
                  json_text
                end
          return unless raw

          # Kouchou AI uses NaN, so we can allow them
          parsed = JSON.parse(raw, allow_nan: true)
          sanitize_non_finite_floats(parsed)
        rescue JSON::ParserError
          nil
        end

        def sanitize_non_finite_floats(obj)
          case obj
          when Float
            obj.finite? ? obj : nil
          when Hash
            obj.transform_values { |v| sanitize_non_finite_floats(v) }
          when Array
            obj.map { |v| sanitize_non_finite_floats(v) }
          else
            obj
          end
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
