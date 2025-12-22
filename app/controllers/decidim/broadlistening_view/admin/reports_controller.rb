# frozen_string_literal: true

module Decidim
  module BroadlisteningView
    module Admin
      class ReportsController < Admin::ApplicationController
        helper_method :reports, :report

        def index
          enforce_permission_to :read, :broadlistening_view_report
        end

        def show
          enforce_permission_to :read, :broadlistening_view_report, report: report
        end

        def new
          enforce_permission_to :create, :broadlistening_view_report
          @form = form(ReportForm).instance
        end

        def create
          enforce_permission_to :create, :broadlistening_view_report
          @form = form(ReportForm).from_params(params)

          CreateReport.call(@form, current_user, current_component) do
            on(:ok) do |created_report|
              flash[:notice] = I18n.t("reports.create.success", scope: "decidim.broadlistening_view.admin")
              redirect_to report_path(created_report)
            end

            on(:invalid) do
              flash.now[:alert] = I18n.t("reports.create.error", scope: "decidim.broadlistening_view.admin")
              render :new
            end
          end
        end

        def edit
          enforce_permission_to :update, :broadlistening_view_report, report: report
          @form = form(ReportForm).from_model(report)
        end

        def update
          enforce_permission_to :update, :broadlistening_view_report, report: report
          @form = form(ReportForm).from_params(params)

          UpdateReport.call(@form, report) do
            on(:ok) do
              flash[:notice] = I18n.t("reports.update.success", scope: "decidim.broadlistening_view.admin")
              redirect_to reports_path
            end

            on(:invalid) do
              flash.now[:alert] = I18n.t("reports.update.error", scope: "decidim.broadlistening_view.admin")
              render :edit
            end
          end
        end

        def destroy
          enforce_permission_to :destroy, :broadlistening_view_report, report: report
          report.destroy!
          flash[:notice] = I18n.t("reports.destroy.success", scope: "decidim.broadlistening_view.admin")
          redirect_to reports_path
        end

        def publish
          enforce_permission_to :publish, :broadlistening_view_report, report: report
          report.update!(published: true)
          flash[:notice] = I18n.t("reports.publish.success", scope: "decidim.broadlistening_view.admin")
          redirect_to reports_path
        end

        def unpublish
          enforce_permission_to :unpublish, :broadlistening_view_report, report: report
          report.update!(published: false)
          flash[:notice] = I18n.t("reports.unpublish.success", scope: "decidim.broadlistening_view.admin")
          redirect_to reports_path
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
end
