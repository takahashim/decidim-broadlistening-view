# frozen_string_literal: true

module Decidim
  module BroadlisteningView
    class ReportsController < Decidim::BroadlisteningView::ApplicationController
      include Decidim::ComponentPathHelper

      helper_method :reports, :report

      def index
        @reports = reports.published
      end

      def show
        return redirect_to reports_path unless report.published?
      end

      private

      def reports
        @reports ||= Report.where(component: current_component).order(created_at: :desc)
      end

      def report
        @report ||= reports.find(params[:id])
      end
    end
  end
end
