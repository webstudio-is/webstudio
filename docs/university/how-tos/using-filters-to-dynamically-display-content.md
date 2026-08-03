---
description: >-
  When building with Webstudio, you get dynamic, not static. This enables
  providing search and filters to your visitors. Whether you want to filter your
  blog or create a dashboard, you can use Webstudio
---

# ▶️ Using filters to dynamically display content (Airtable example)

{% embed url="https://youtu.be/n5tG2j6_4dw" %}

## Overview

Unlike static website builders, Webstudio enables dynamic filtering by:

1. User submits search form → values go into URL query parameters
2. Page reloads with parameters in URL
3. API query uses parameters to filter results
4. Collection displays filtered data

## Step 1: Create the Search Form

1. Add a **Form** component (not Webhook Form)
2. Inside, add: Label + Text Input + Submit Button
3. Name the input (e.g., "name") — this becomes the query parameter

## Step 2: Create the Results Collection

1. Add a **Collection** component
2. Inside, add elements for each field (heading, text, images, etc.)
3. Wrap the Collection in a Box to control layout/spacing between items

## Step 3: Set Up the API Resource

1. Select the Collection's parent element → Settings → Add Variable
2. Type: **Resource**
3. Get the curl command from Airtable's API Documentation (Help → API Documentation)
4. Paste it — Webstudio auto-parses URL and headers
5. Remove `max_records` and `view` parameters to get all records

## Step 4: Add Dynamic Filtering

Use the Expression editor to build a dynamic URL with Airtable's `filterByFormula` parameter:

### Basic Filter (always applied)

```javascript
`https://api.airtable.com/v0/BASE_ID/TABLE?filterByFormula=SEARCH("${system.search.name}",{name})`;
```

### Conditional Filter (only when search param exists)

```javascript
`https://api.airtable.com/v0/BASE_ID/TABLE${system.search.name ? `?filterByFormula=SEARCH("${system.search.name}",{name})` : ""}`;
```

**Key concepts:**

- Backticks (`) create template literals for mixing static and dynamic content
- `${...}` inserts dynamic values
- `system.search.paramName` accesses URL query parameters
- Ternary operator `condition ? ifTrue : ifFalse` for conditional logic
- Airtable requires values in quotes: `SEARCH("value",{column})`

## Step 5: Bind Collection Data

1. Select the Collection → Data → bind to `resource.data.records`
2. Bind each element inside: `collectionItem.fields.fieldname`

## Debugging

- Inspect the resource variable to see the JSON response
- Status 200 = success; 4xx/5xx = error
- Check for "undefined" in your query — means the parameter wasn't found

{% hint style="info" %}
You can add multiple filters by extending the filterByFormula with AND/OR logic. Consider building complex expressions in an external code editor, then adapt for Webstudio's variable system.
{% endhint %}

## Related

- [CMS](../foundations/cms.md) – Understand how dynamic content works in Webstudio
- [Collection](../core-components/collection.md) – Display lists of dynamic data
- [Variables](../foundations/variables.md) – Create and use variables for dynamic content
- [Airtable Integration](../integrations/airtable-frontend.md) – Connect your Airtable base to Webstudio
- [Form](../core-components/form.md) – Build forms to capture user input
