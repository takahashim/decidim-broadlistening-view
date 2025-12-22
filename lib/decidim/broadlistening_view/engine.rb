# frozen_string_literal: true

require "rails"
require "decidim/core"

module Decidim
  module BroadlisteningView
    class Engine < ::Rails::Engine
      isolate_namespace Decidim::BroadlisteningView

      routes do
        resources :reports, only: [:index, :show]
        root to: "reports#index"
      end

      initializer "decidim_broadlistening_view.webpacker.assets_path" do
        Decidim.register_assets_path File.expand_path("app/packs", root)
      end

      initializer "decidim_broadlistening_view.add_cells_view_paths" do
        Cell::ViewModel.view_paths << File.expand_path("#{Decidim::BroadlisteningView::Engine.root}/app/cells")
        Cell::ViewModel.view_paths << File.expand_path("#{Decidim::BroadlisteningView::Engine.root}/app/views")
      end

      config.to_prepare do
        # Require any additional files here
      end
    end
  end
end
