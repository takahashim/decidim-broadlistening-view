# Decidim Broadlistening View

A Decidim component for displaying pre-computed broadlistening analysis results with interactive Plotly.js visualizations.

## Features

- Display `hierarchical_result.json` data from [kouchou-ai](https://github.com/digitaldemocracy2030/kouchou-ai/)
- Interactive scatter plot visualization using Plotly.js
- Hierarchical cluster display
- Admin interface for uploading JSON files or direct input
- Japanese and English localization

## Requirements

- Decidim 0.29.x
- Ruby 3.1+

## Installation

Add to your Decidim application's Gemfile:

```ruby
gem "decidim-broadlistening-view", git: "https://github.com/takahashim/decidim-broadlistening-view.git"
```

Run:

```bash
bundle install
bin/rails decidim_broadlistening_view:install:migrations
bin/rails db:migrate
```

## Usage

1. Add the "Broadlistening Viewer" component to a participatory space (Assembly, Process, etc.)
2. In the admin panel, create a new report
3. Upload a `hierarchical_result.json` file or paste JSON directly
4. Publish the report to make it visible to users

## JSON Format

The component expects JSON data in the `hierarchical_result.json` format from [kouchou-ai](https://github.com/digitaldemocracy2030/kouchou-ai/):

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
  "config": {},
  "comment_num": 100
}
```

## Vendored Libraries

This gem includes the following vendored libraries:

- [Plotly.js Basic](https://plotly.com/javascript/) v2.35.0 (MIT License)

## Development

```bash
# Clone the repository
git clone https://github.com/takahashim/decidim-broadlistening-view.git
cd decidim-broadlistening-view

# Install dependencies
bundle install
```

## License

AGPL-3.0
