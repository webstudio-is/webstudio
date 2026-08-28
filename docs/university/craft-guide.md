---
description: Apply the Craft specification in a Webstudio project.
---

# Use Craft

Use the Craft Style Guide as a starting point, then map its semantic variables
and composite Tokens to your project.

## Get started

1. Go to **Marketplace → Pages → Craft**.
2. Insert the **Style Guide** page.
3. Customize the theme or palette variables on **Global Root**.
4. Map Craft semantic variables to the theme.
5. Build with semantic variables and composite Tokens.
6. Document project extensions in the Style Guide.

## Use the page template

The Craft Style Guide includes a page template with navigation, a main region,
sections, containers, and a footer:

1. Copy the template structure when creating a page.
2. Duplicate the template section and name it for its content, such as `Hero`.
3. Design the section using Craft variables and Tokens.
4. Duplicate the clean template section for the next section.

## Maintain the Style Guide

Use `Style Guide` as the page name. Prefix Tokens used only to present the
Style Guide with two underscores, such as `__badge` or `__outline`. Do not use
these presentation Tokens on the published site.

## Name Navigator items

Use title case and semantic labels in the Navigator.

- Give Box, Slot, HTML Embed, and Collection instances names that describe
  their purpose.
- Name containers after their content rather than position or appearance.
- Use a plural parent and singular children for repeated content, such as
  `Cards` containing several `Card` items.
- Prefix a Box using the `section` element with `Section`, such as
  `Section Hero`.
- Keep one HTML Embed instance responsible for one purpose, and begin its code
  with a comment describing that purpose.

Recommended page structure:

```text
Page Wrapper
├── Slot
│   ├── Global Styles
│   └── Nav
├── Main
│   └── Section
│       └── Container
└── Slot
    └── Footer
```

## Use Craft Library

Craft Library is a collection of section templates built to Craft standards
and available in the [Marketplace](marketplace.md).

Templates must avoid unexplained hardcoded design values. They must consume
documented Craft variables or documented extensions so that a section adapts
when inserted into another conforming project.

<figure><img src="../.gitbook/assets/craft-library.png" alt="Craft Library in the Webstudio Marketplace"><figcaption><p>Craft Library in the Marketplace</p></figcaption></figure>

{% embed url="https://x.com/getwebstudio/status/1895213059251011768" %}

## Related

- [Craft](craft.md) – Follow the universal specification
- [Craft changelog](craft-changelog.md) – Review changes to the standard
- [Marketplace](marketplace.md) – Access Craft Library and other resources
- [Contributing to the Marketplace](../contributing/marketplace.md) – Submit Craft resources
- [Anatomy of the Webstudio builder](foundations/anatomy-of-the-webstudio-builder.md) – Understand the Builder interface
