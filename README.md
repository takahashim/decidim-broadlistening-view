# Decidim Broadlistening View

A Decidim component for displaying pre-computed broadlistening analysis results with interactive Plotly.js visualizations.

## Features

- Display `hierarchical_result.json` data from broadlistening-ruby
- Interactive scatter plot visualization using Plotly.js
- Cluster overview with color-coded cards
- Admin interface for uploading JSON files or direct input
- Japanese and English localization

## Installation

Add to your Decidim application's Gemfile:

```ruby
gem "decidim-broadlistening-view"
```

Run:

```bash
bundle install
bin/rails decidim_broadlistening_view:install:migrations
bin/rails db:migrate
```

## Usage

1. Add the "Broadlistening Viewer" component to a participatory space
2. In the admin panel, create a new report
3. Upload a `hierarchical_result.json` file or paste JSON directly
4. Publish the report to make it visible to users

## JSON Format

The component expects JSON data in the `hierarchical_result.json` format from broadlistening-ruby:

```json
{
  "arguments": [
    {
      "arg_id": "A1_0",
      "argument": "Opinion text",
      "comment_id": 1,
      "x": -1.234,
      "y": 2.345,
      "cluster_ids": ["0", "1_0", "2_1"]
    }
  ],
  "clusters": [
    {
      "level": 1,
      "id": "1_0",
      "label": "Category A",
      "takeaway": "Description",
      "value": 50,
      "parent": "0"
    }
  ],
  "overview": "Summary text",
  "comments": {},
  "propertyMap": {},
  "translations": {},
  "config": {}
}
```

## License

AGPL-3.0
