# frozen_string_literal: true

module Decidim
  module BroadlisteningView
    # Declares which actions exist for the report subject. Role-based gating
    # is delegated to the upstream permission chain via the participatory
    # space's Permissions class.
    class Permissions < Decidim::DefaultPermissions
      def permissions
        return permission_action if permission_action.scope != :admin
        return permission_action if permission_action.subject != :broadlistening_view_report

        case permission_action.action
        when :read, :create, :update, :destroy, :publish, :unpublish
          allow!
        end

        permission_action
      end
    end
  end
end
