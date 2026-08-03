# ♻️ Reusability & maintainability

Webstudio provides several tools that let you build sites that are easy to update and scale. Instead of making the same change in dozens of places, you can centralize content, styles, and structure so that editing one thing updates everywhere.

## Slots — shared structure across pages

<figure><img src="../../.gitbook/assets/slot-component-overview.png" alt="Slot component in the Navigator showing shared structure"><figcaption><p>A Slot references another page's content — edit the source once, all slots update</p></figcaption></figure>

A [Slot](../core-components/slot.md) is a component that references the content of another page. Any instance that uses that slot always renders the same content, so editing the source page updates every slot automatically.

**Common uses:**
- Navigation header and footer shared across all pages
- A cookie banner or chat widget added once and reused everywhere
- A 404 layout reused inside multiple dynamic page templates

To create a shared layout, build the header (or any repeating section) on one page, then add a Slot on every other page and point it at that source. You only maintain the design in one place.

{% hint style="info" %}
[CSS variables](css-variables.md) defined on a parent are accessible inside Slots. [Data variables](variables.md), however, are scoped to their page and are not available inside Slots.
{% endhint %}

→ [Slot component reference](../core-components/slot.md)

## Design tokens & CSS variables — reusable styles

<figure><img src="../../.gitbook/assets/h1-token.png" alt="A design token applied to a Heading instance in the Style Sources input"><figcaption><p>A token applied to an instance — styles update everywhere this token is used</p></figcaption></figure>

CSS variables and design tokens work together as two layers of reusability.

**[CSS variables](css-variables.md)** are the bottom layer — individual named values like colors, sizes, and spacing. Define `--color-brand` once, and use it in any style input across the entire site. When the brand color changes, update the variable in one place and every element referencing it updates.

<figure><img src="../../.gitbook/assets/css-var-example.png" alt="CSS variable defined in the Advanced section with a name and value" width="319"><figcaption><p>Define a CSS variable once, use it anywhere</p></figcaption></figure>

**[Design tokens](design-tokens.md)** are the next layer — named collections of styles that can be applied to any element, similar to CSS classes but without their common problems like combo classes, breakpoint conflicts, and accidental style inheritance. A `card` token might define padding, background, and border-radius. The values inside a token can reference CSS variables, giving you another level of reuse.

Together: CSS variables store the raw values, tokens package those variables into semantic, reusable style groups.

When you update a token — say, changing the padding defined on it — every element using that token updates automatically. Without tokens, you would make the same style change on every element individually.

**Common uses:**
- CSS variables: `--color-brand`, `--space-md`, `--radius-lg`
- Tokens: `button-primary`, `card`, `heading-lg` — each referencing those variables internally

→ [Design tokens](design-tokens.md) · [CSS variables](css-variables.md)

## Dynamic data — one template, many pages

### Static pages vs. dynamic pages

A **static page** is the full implementation of a design — layout, styles, and content all built directly on the canvas. The content is part of the page itself: you type the text, drop in the images, and publish. A home page, an about page, or a contact page are typically static.

A **dynamic page** is the design without the content. It has the same layout and structure as a static page, but instead of real text and images, its content comes from data — fetched at request time from an external source. The same template renders differently for every record: one URL loads a blog post, another loads a different one, using the exact same page design.

This is the key to scaling content-heavy sites. Instead of creating a separate page for every blog post, product, or team member, you build one dynamic page template and let the data do the rest.

<figure><img src="../../.gitbook/assets/right-and-wrong-way-collections.png" alt="Comparison showing one template for all records vs. one page per record"><figcaption><p>One template renders all records — don't create a separate page for each</p></figcaption></figure>

→ [CMS & dynamic data](cms.md)

## Page templates — repeatable page creation

[Page templates](page-templates.md) let designers create reusable page blueprints inside a project. Unlike dynamic pages, which render many URLs from one live page and external data, page templates create independent regular pages.

Use page templates for repeatable static page types, such as service pages, campaign pages, landing pages, or client-created content pages that should start from a controlled structure.

## Why Webstudio is not a CMS

Webstudio is a **visual builder**, not a content management system. It does not have a built-in database for storing and managing hundreds of records.

This means:
- Creating one page per blog post is **not the right approach** for content-heavy sites. You would end up managing hundreds of pages inside the builder, with no structured editing workflow, no content relations, and no bulk operations.
- The right approach is to store that content in a dedicated CMS (WordPress, Directus, Baserow, Ghost, etc.) and connect it to a single dynamic page template in Webstudio via the [CMS integration](cms.md).

The builder is designed to be the **presentation layer** — responsible for layout, design, and how data is displayed — while the CMS is the **data layer** responsible for storing and editing content at scale.

{% hint style="info" %}
Webstudio dynamic pages use **one template for all records**. The CMS handles creating, editing, and organizing the actual records. Webstudio fetches and displays them.
{% endhint %}

## Summary

| Tool | What it solves |
|---|---|
| [Slots](../core-components/slot.md) | Duplicate structure across pages — edit once, update everywhere |
| [CSS variables](css-variables.md) + [Design tokens](design-tokens.md) | Hard-coded style values scattered across elements |
| [Dynamic data](cms.md) | Building one page per content item instead of one template |
| [Page templates](page-templates.md) | Recreating the same page structure manually |
| External CMS | Managing dozens or hundreds of records inside the builder |

## Related

- [Slot](../core-components/slot.md) – Shared components across pages
- [CSS variables](css-variables.md) – Individual named values (colors, sizes, spacing)
- [Design tokens](design-tokens.md) – Reusable style collections built on top of CSS variables
- [CMS & dynamic data](cms.md) – One template, many pages
- [Page templates](page-templates.md) – Reusable blueprints for creating pages
- [Data variables](variables.md) – Binding data to the canvas
