---
description: >-
  Learn how to use Webstudio's visual builder to create a Baserow frontend with filters and dynamic pages.
---

# How to build a frontend for Baserow using Webstudio

{% embed url="https://www.youtube.com/watch?v=oAaGTsHt-aE" %}

By the end of this tutorial, you will have:

- **An overview page** – Displaying all records from Baserow with links to detail pages
- **A details page** – A dynamic page showing individual record data
- **Filters** – Search and filter functionality
- **A sitemap** – Dynamic sitemap containing your Baserow records

## Why Baserow?

[Baserow](https://baserow.io/) is an open-source, self-hostable database platform similar to Airtable. Benefits include:

- **Self-hosting option** – Full control over your data
- **Open source** – No vendor lock-in
- **API-first** – Easy integration with external tools
- **Generous free tier** – Great for getting started

## Getting Started

### 1. Set Up Baserow

1. Create a Baserow account or self-host an instance
2. Create a table with your data (e.g., products, team members, portfolio items)
3. Add a URL-friendly field for slugs (alphanumeric characters and dashes only)
4. Generate an API token in your account settings

### 2. Create a Dynamic Page in Webstudio

1. Go to Pages > Create new page
2. Set the Dynamic Path (e.g., `/items/:slug`)
3. The `:slug` parameter will match your Baserow slug field

### 3. Configure the Resource Variable

1. Select Body in the Navigator
2. Go to Settings > Add Variable > Resource
3. Configure the API request:
   - **URL**: Your Baserow API endpoint with filter
   - **Method**: GET
   - **Headers**: Add `Authorization: Token YOUR_API_TOKEN`

**Dynamic URL with filter:**

```
`https://api.baserow.io/api/database/rows/table/YOUR_TABLE_ID/?user_field_names=true&filter__slug__equal=${system.params.slug}`
```

Replace:

- `YOUR_TABLE_ID` with your Baserow table ID
- `slug` with your actual field name

### 4. Bind Data to Components

1. Add components for your content (Heading, Text, Image, etc.)
2. Use the Expression editor to bind data from your Resource
3. Access fields like: `baserowData.results[0].title`

## Creating the Overview Page

### Fetching All Records

Create a Resource on your overview page that fetches all records:

```
https://api.baserow.io/api/database/rows/table/YOUR_TABLE_ID/?user_field_names=true
```

### Using Collection Component

1. Add a **Collection** component
2. Bind it to your Resource data
3. Design a card template inside the Collection
4. Each record automatically creates a card

### Adding Filters

1. Create filter variables (e.g., search term, category)
2. Modify your Resource URL to include filter parameters
3. Bind filter inputs to your variables
4. The page updates when filters change

## Creating a Dynamic Sitemap

1. Create a sitemap page (e.g., `/sitemap.xml`)
2. Add a Resource fetching all records
3. Use the [XML Node](../core-components/xml-node.md) component
4. Map your records to sitemap URL entries

## Markdown Content

If your Baserow records contain rich text or Markdown:

1. Add a **Markdown Embed** component
2. Bind the Markdown field to the component
3. Style the rendered HTML using child selectors

## Related Resources

- [CMS Documentation](../foundations/cms.md)
- [Resource Variables](../foundations/variables.md#resource)
- [Collection Component](../core-components/collection.md)
- [Using Filters](../how-tos/using-filters-to-dynamically-display-content.md)
