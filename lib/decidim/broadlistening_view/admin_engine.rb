# frozen_string_literal: true

module Decidim
  module BroadlisteningView
    class AdminEngine < ::Rails::Engine
      isolate_namespace Decidim::BroadlisteningView::Admin

      paths["db/migrate"] = nil
      paths["lib/tasks"] = nil

      routes do
        resources :reports do
          member do
            post :publish
            post :unpublish
          end
        end
        root to: "reports#index"
      end

      def load_seed
        nil
      end
    end
  end
end
