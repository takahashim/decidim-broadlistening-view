# frozen_string_literal: true

module Decidim
  module BroadlisteningView
    module Admin
      class UpdateReport < Decidim::Command
        def initialize(form, report)
          @form = form
          @report = report
        end

        def call
          return broadcast(:invalid) if form.invalid?

          update_report

          broadcast(:ok, report)
        end

        private

        attr_reader :form, :report

        def update_report
          attributes = {
            title: form.title,
            description: form.description
          }

          # Only update result_data if new JSON was provided
          attributes[:result_data] = form.result_data if form.result_data.present?

          report.update!(attributes)
        end
      end
    end
  end
end
