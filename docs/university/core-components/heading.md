---
description: Add headings (H1-H6) to structure content in Webstudio.
---

# Heading

> See [MDN: Heading elements](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements)

The **Heading** component renders HTML heading elements (h1-h6) for creating a hierarchical structure of titles and subtitles on your page.

## Overview

Headings establish the document outline and help users and search engines understand your content structure. They're crucial for:

- **Accessibility**: Screen readers use headings for navigation
- **SEO**: Search engines use headings to understand page content
- **Visual hierarchy**: Guide users through your content

## Tag Options

| Tag  | Typical Use                         |
| ---- | ----------------------------------- |
| `h1` | Page title (use only once per page) |
| `h2` | Major section titles                |
| `h3` | Subsection titles                   |
| `h4` | Sub-subsection titles               |
| `h5` | Minor headings                      |
| `h6` | Smallest headings                   |

## Properties

| Property | Type   | Description                                 |
| -------- | ------ | ------------------------------------------- |
| `tag`    | string | Heading level: h1, h2, h3, h4, h5, or h6    |
| `id`     | string | Unique identifier (useful for anchor links) |
| `class`  | string | CSS class names                             |

## Heading Hierarchy

Always maintain proper heading hierarchy:

```
h1: Page Title
├── h2: Section 1
│   ├── h3: Subsection 1.1
│   └── h3: Subsection 1.2
├── h2: Section 2
│   ├── h3: Subsection 2.1
│   │   └── h4: Sub-subsection 2.1.1
│   └── h3: Subsection 2.2
└── h2: Section 3
```

### Common Mistakes to Avoid

❌ **Don't skip levels**: Going from h2 directly to h4  
❌ **Don't choose heading level for style**: Use CSS instead  
❌ **Don't use multiple h1 tags**: One per page is the standard

## Styling Headings

### Default Preset Styles

Webstudio applies browser-normalized styles to headings. You can customize:

- **Font Size**: Each heading level typically has progressively smaller sizes
- **Font Weight**: Often bold (700) or semi-bold (600)
- **Line Height**: Tighter than body text (1.1-1.3)
- **Margin**: Space above and below headings
- **Color**: Can match or contrast with body text

### Typography Scale

A common typographic scale for headings:

| Level | Size (desktop) | Size (mobile) |
| ----- | -------------- | ------------- |
| h1    | 48-64px        | 32-40px       |
| h2    | 36-48px        | 28-32px       |
| h3    | 28-32px        | 24-28px       |
| h4    | 24-28px        | 20-24px       |
| h5    | 20-24px        | 18-20px       |
| h6    | 16-18px        | 16-18px       |

## Dynamic Headings

Headings can display dynamic content from:

- CMS collections
- Page variables
- URL parameters

To bind dynamic content:

1. Select the Heading
2. Click the binding icon in Settings
3. Choose your data source

## Anchor Links

Create anchor links to headings for in-page navigation:

1. Set an `id` on the Heading (e.g., "features")
2. Create a [Link](link.md) with href `#features`
3. Clicking the link scrolls to that heading

## SEO Best Practices

1. **Include keywords**: Place important keywords in headings naturally

2. **Be descriptive**: Headings should clearly describe the content that follows

3. **Keep h1 unique**: Each page should have exactly one h1 that describes the page's main topic

4. **Front-load important words**: Put key terms at the beginning of headings

## Related Components

- [Text](text.md) - General text content
- [Paragraph](paragraph.md) - Body text
