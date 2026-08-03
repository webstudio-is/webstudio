---
description: Add structured data to a page with valid JSON-LD in the document head.
---

# 🏷️ JSON-LD

The JSON-LD component adds structured data to a page as a
`<script type="application/ld+json">` element. Search engines can use this data
to understand entities such as organizations, products, articles, events, and
local businesses.

## Add JSON-LD to a page

1. Add a [Head Slot](head-slot.md) to the page if it does not already have one.
2. Add the **JSON-LD** component inside the Head Slot.
3. Select the JSON-LD instance and enter a JSON object or array in **Code**.
4. Publish the site and test the page with a structured-data validation tool.

JSON-LD can be placed in the page body, but Head Slot is the recommended
location. Content inside Head Slot is emitted in the document `<head>`.

## Code

Enter JSON only. Do not include a `<script>` element because the component
creates it automatically.

For example, an organization can be described with:

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Northstar Studio",
  "url": "https://example.com",
  "logo": "https://example.com/logo.png"
}
```

The editor formats valid JSON when it opens and when it loses focus. It does
not reformat while you are typing. The project stores the JSON without
presentation-only whitespace.

The top-level value must be an object or an array. Most Schema.org documents
should include `"@context": "https://schema.org"`.

## Dynamic structured data

The Code property can be bound to data for dynamic pages. The resulting value
must still be a valid JSON object or array. Use dynamic JSON-LD for values such
as a product name, price, availability, article author, or canonical URL.

Keep the structured data consistent with content visitors can see on the page.
Do not describe content that is absent or misleading.

## Validate JSON-LD

Webstudio validates fixed JSON-LD values and can report:

- Invalid JSON that cannot be emitted as structured data.
- Invalid JSON-LD keyword values and value-object combinations.
- A missing top-level `@context`.
- Unknown or superseded Schema.org types and properties.
- Properties unsupported by the supplied Schema.org type.
- Primitive values that conflict with a property's Schema.org range.
- JSON-LD incorrectly entered as custom page metadata.

Dynamic values require testing on a rendered or published page because their
final value is only known at runtime.

Schema.org vocabulary findings are warnings because JSON-LD can use custom
vocabularies and extensions. Passing Webstudio validation does not guarantee
eligibility for a search-engine rich result; search engines apply additional
type-specific requirements and content policies.

You can also validate published pages with:

- [Rich Results Test](https://search.google.com/test/rich-results)
- [Schema Markup Validator](https://validator.schema.org/)

## JSON-LD and other components

Use JSON-LD instead of an [HTML Embed](html-embed.md) when adding structured
data. JSON-LD accepts only the data, creates the correct script element, and
provides focused validation.

Do not add JSON-LD through custom metadata in Page Settings. Custom metadata
creates `<meta>` elements and cannot create a JSON-LD script.

## Related

- [Head Slot](head-slot.md) - Add page-specific elements to the document head
- [SEO settings](../foundations/seo-settings.md) - Configure page titles, descriptions, and indexing
- [Variables](../foundations/variables.md) - Bind components to dynamic data
