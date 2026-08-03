---
description: Format dates in XML sitemaps and RSS feeds using the XML Time component.
---

# 🕐 XML Time

> See [MDN: Date.toISOString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString)

The XML Time component converts machine-readable date and time values to ISO 8601 format. This is essential for generating valid XML feeds like RSS, Atom, and sitemaps that require standardized date formats.

## When to Use

Use XML Time for:

- RSS feed publication dates (`<pubDate>`)
- Atom feed `<updated>` and `<published>` elements
- Sitemap `<lastmod>` timestamps
- Any XML output requiring ISO 8601 formatted dates

## How to Use

1. Drag an **XML Time** component from Components > XML onto your canvas
2. Bind the `datetime` property to a date value from your CMS or data source
3. The component outputs the date in ISO format (e.g., `2024-01-15T10:30:00.000Z`)

## Properties

| Property    | Type        | Description                                                                            |
| ----------- | ----------- | -------------------------------------------------------------------------------------- |
| `datetime`  | Date/String | The date value to convert. Accepts a JavaScript Date object, ISO string, or timestamp. |
| `dateStyle` | String      | Controls the output format style for the date.                                         |

## Example Usage

### RSS Feed Item Date

When building an RSS feed with a Collection, use XML Time to format publication dates:

```xml
<item>
  <title>Article Title</title>
  <pubDate>
    <!-- XML Time outputs: 2024-01-15T10:30:00.000Z -->
  </pubDate>
</item>
```

### Sitemap Last Modified

For XML sitemaps, XML Time ensures proper date formatting:

```xml
<url>
  <loc>https://example.com/page</loc>
  <lastmod>
    <!-- XML Time outputs the ISO date -->
  </lastmod>
</url>
```

## Binding Dynamic Dates

To display dynamic dates from your CMS:

1. Select the XML Time component
2. In Settings, click the binding icon next to `datetime`
3. Open the Expression editor
4. Bind to your date field: `Collection Item.publishedAt`

## Difference from Time Component

| Component    | Output                                             | Use Case                       |
| ------------ | -------------------------------------------------- | ------------------------------ |
| **Time**     | Human-readable dates (e.g., "January 15, 2024")    | Displaying dates to users      |
| **XML Time** | ISO 8601 format (e.g., "2024-01-15T10:30:00.000Z") | Machine-readable XML/RSS feeds |

## Technical Notes

- XML Time renders the date string directly without any HTML wrapper
- The ISO 8601 format is universally recognized by feed readers and XML parsers
- Always ensure your source date is valid; invalid dates will produce unexpected output

## Related Components

- [XML Node](xml-node.md) – Create XML elements for feeds
- [Time](time.md) – Display human-readable dates
- [Collection](collection.md) – Loop through data for feed items
