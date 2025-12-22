# frozen_string_literal: true

module Decidim
  module BroadlisteningView
    module Admin
      class ApplicationController < Decidim::Admin::Components::BaseController
        helper Decidim::BroadlisteningView::ApplicationHelper
      end
    end
  end
end
