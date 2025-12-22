# frozen_string_literal: true

Decidim.register_component(:broadlistening_view) do |component|
  component.engine = Decidim::BroadlisteningView::Engine
  component.admin_engine = Decidim::BroadlisteningView::AdminEngine
  component.icon = "media/images/decidim_broadlistening_view.svg"
  component.icon_key = "bar-chart-2-line"

  component.on(:create) do |instance|
    # Called when a component is created
  end

  component.on(:before_destroy) do |instance|
    # Called before a component is destroyed
    raise StandardError, "Cannot destroy component with reports" if Decidim::BroadlisteningView::Report.where(component: instance).any?
  end

  component.permissions_class_name = "Decidim::BroadlisteningView::Permissions"

  # Component settings
  component.settings(:global) do |settings|
    settings.attribute :announcement, type: :text, translated: true, editor: true
  end

  component.settings(:step) do |settings|
    settings.attribute :announcement, type: :text, translated: true, editor: true
  end

  # Register hooks
  component.register_stat :reports_count do |components, start_at, end_at|
    reports = Decidim::BroadlisteningView::Report.where(component: components)
    reports = reports.where("created_at >= ?", start_at) if start_at.present?
    reports = reports.where("created_at <= ?", end_at) if end_at.present?
    reports.count
  end

  # Seeds
  component.seeds do |participatory_space|
    # Seed data for development
  end
end
