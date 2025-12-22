# frozen_string_literal: true

module Decidim
  module BroadlisteningView
    module Admin
      class CreateReport < Decidim::Command
        def initialize(form, current_user, component)
          @form = form
          @current_user = current_user
          @component = component
        end

        def call
          return broadcast(:invalid) if form.invalid?

          create_report

          broadcast(:ok, report)
        end

        private

        attr_reader :form, :current_user, :component, :report

        def create_report
          @report = Decidim::BroadlisteningView::Report.create!(
            component: component,
            title: form.title,
            description: form.description,
            result_data: form.result_data || {},
            published: false
          )
        end
      end
    end
  end
end
