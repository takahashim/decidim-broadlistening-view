# frozen_string_literal: true

module Decidim
  module BroadlisteningView
    class Permissions < Decidim::DefaultPermissions
      def permissions
        return permission_action if permission_action.scope != :admin

        case permission_action.subject
        when :broadlistening_view_report
          apply_report_permissions
        end

        permission_action
      end

      private

      def apply_report_permissions
        case permission_action.action
        when :read, :create, :update, :destroy, :publish, :unpublish
          allow! if user_is_admin?
        end
      end

      def user_is_admin?
        user&.admin? || space_allows_admin?
      end

      def space_allows_admin?
        return false unless context[:current_participatory_space]

        Decidim::ParticipatoryProcessUserRole.exists?(
          user: user,
          participatory_process: context[:current_participatory_space],
          role: %w(admin collaborator moderator valuator)
        )
      end
    end
  end
end
