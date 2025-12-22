# frozen_string_literal: true

$LOAD_PATH.push File.expand_path("lib", __dir__)

require "decidim/broadlistening_view/version"

Gem::Specification.new do |spec|
  spec.name = "decidim-broadlistening-view"
  spec.version = Decidim::BroadlisteningView::VERSION
  spec.authors = ["Code for Japan"]
  spec.email = ["info@code4japan.org"]
  spec.summary = "A Decidim component for displaying broadlistening visualizations"
  spec.description = "Display pre-computed broadlistening analysis results with interactive Plotly.js visualizations"
  spec.homepage = "https://github.com/codeforjapan/decidim-cfj"
  spec.license = "AGPL-3.0"
  spec.required_ruby_version = ">= 3.1.0"

  spec.files = Dir.chdir(__dir__) do
    `git ls-files -z`.split("\x0").reject do |f|
      (File.expand_path(f) == __FILE__) ||
        f.start_with?(*%w[bin/ test/ spec/ features/ .git .github appveyor Gemfile])
    end
  end
  spec.require_paths = ["lib"]

  spec.add_dependency "decidim-admin", Decidim::BroadlisteningView::DECIDIM_VERSION
  spec.add_dependency "decidim-core", Decidim::BroadlisteningView::DECIDIM_VERSION

  spec.add_development_dependency "decidim-dev", Decidim::BroadlisteningView::DECIDIM_VERSION
end
