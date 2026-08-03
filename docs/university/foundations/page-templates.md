---
description: Create reusable page blueprints inside a project.
---

# Page templates

Page templates are reusable page blueprints stored inside a project. They help designers create consistent page structures that can be turned into new pages later.

Use page templates when you want to:

- Start new pages from a consistent layout
- Give content editors a safe way to create new pages
- Reuse SEO, social image, language, and custom metadata defaults
- Keep page creation consistent across a client or team project

{% embed url="https://youtu.be/ysATesLnuaI" %}

{% hint style="info" %}
Page templates are different from [Marketplace](../marketplace.md) templates. Marketplace templates are reusable assets you insert from Webstudio or the community. Page templates are private to the current project and are created by the project designer.
{% endhint %}

## How page templates work

Page templates live in the **Page templates** section of the Pages panel.

Templates are not published pages. They do not have paths, do not appear in the sitemap, and do not create public routes. They only become public when someone creates a regular page from the template and publishes that page.

Pages created from a template are independent copies. Updating the template later does not update pages that were already created from it.

## Creating a page template

In Design mode:

1. Open the Pages panel
2. Click the create button
3. Choose **New page template**
4. Enter the template name and page metadata defaults
5. Click **Create template**
6. Design the template on the canvas

Template settings include the same editorial metadata used by pages, such as title, description, search visibility, language, social image, and custom metadata. Templates do not include page paths, redirects, status codes, document type, or authentication because they are not live routes.

## Creating a page from a template

In the **Page templates** section, click the create button on a template row.

Webstudio opens **Create page from template**, pre-filled with values from the template. Review or adjust the page name, path, SEO, social image, and other page settings, then click **Create page**.

Webstudio creates a regular page with a copied component tree, fresh internal IDs, and a unique path based on the page name.

## Editing and managing templates

Designers can:

- Select a template to edit it on the canvas
- Open template settings
- Copy a template and paste it into another project
- Duplicate a template
- Delete a template
- Reorder templates in the Page templates section

Right-click a template row to copy, duplicate, or delete it.

## Copying pages, folders, and templates

In Design mode, the Pages panel supports copy and paste for pages, folders, and page templates.

Use this when you want to:

- Move a finished page structure between projects
- Copy a group of pages organized in a folder
- Reuse a page template in another project
- Create a backup copy before making structural changes

Right-click a page or folder and choose **Copy**, then right-click the destination folder and choose **Paste**. You can also use `⌘ + c` and `⌘ + v` when the page, folder, or template is selected. On Windows, use `Ctrl` instead of `⌘`.

When pasted, Webstudio creates new internal IDs and automatically adjusts names, paths, folder slugs, tokens, assets, variables, and styles as needed to fit the destination project.

## Content mode

Content editors can create pages from existing page templates when they have editing access. This gives editors a controlled page creation workflow without giving them full design control.

Editors cannot create or edit the templates themselves. When creating a page from a template, editors can only change fields that are safe for content editing. Dynamic, data-bound, or structural settings remain controlled by the designer.

In Content mode, editors can create regular static pages from templates and edit safe page settings such as page name, path, title, description, search visibility, language, social image, and custom metadata. Dynamic paths, redirects, status codes, document type, authentication, and template management remain Design-mode controls.

## Related

- [Page settings](page-settings.md) – Configure page paths, SEO, authentication, and metadata
- [Modes](modes.md) – Understand Design and Content mode permissions
- [Marketplace](../marketplace.md) – Insert community and Webstudio templates
- [Reusability & maintainability](reusability.md) – Choose the right reuse tool
