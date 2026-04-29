# Page Templates Plan

## Overview

This plan introduces a **Page Templates** feature in two phases. V1 gives designers a way to define reusable page blueprints within a project. V2 extends the content editing experience by giving editors meaningful control over page settings and the ability to create new pages from those same templates.

---

## V1 — Designer Page Templates

### Summary

Designers can define reusable, per-project page templates and use them as starting points when creating new pages. This gives design teams a way to enforce consistent structure and content patterns across pages in a project without starting from scratch every time.

### Scope

- **Designers only.** Templates are created, edited, and used exclusively in Design mode.
- Pages created from a template are **independent copies** — there is no sync or update propagation between a template and the pages derived from it.
- Templates are **per-project** artifacts — they are never published and do not appear in the site's public routes or sitemap.

---

### What Is Built

#### Template Storage

- Templates live in a dedicated collection, separate from regular pages and folders.
- They carry the same content as a page (name, title, meta, component tree) but intentionally have no page path, folder placement, or publish-related fields — templates are not live routes.
- The templates collection is optional — existing projects without it load safely, treating the absence as an empty collection. No data migration is required.

#### Data Safety Boundaries

- Templates are fully excluded from sitemap generation, route resolution, and all published site output. Only the builder canvas is aware of them.
- A clear type distinction between a template and a page is enforced throughout. All lookups that power the published site use this to ensure templates can never leak into public output.

#### Pages Panel UI

- A distinct **Page Templates** section appears in the Pages panel, below the folder tree.
- The section and all template actions are only visible to designers in Design mode. Content mode users see nothing related to templates.
- Each template row has two actions:
  - A **create button** (`+`) that opens a creation dialog pre-filled from the template's settings, where the designer confirms or adjusts all page settings before the page is created.
  - A **settings button** (`...`) that opens the template's settings panel.
- A **New Template** button in the section header opens the new-template creation form.

#### Creating a New Template

- The creation form collects: template name, SEO title, description, exclude-from-search toggle, social image (URL or asset picker), and custom metadata key/value pairs.
- All expression fields support variable binding via binding popovers — the same capability as regular page settings.
- On creation, a blank component tree body is initialised as the template's root, ready for the designer to build out on the canvas.

#### Editing Template Settings

- The settings panel is identical in structure to the regular page settings form, minus path and folder fields.
- Changes are auto-saved continuously with a short debounce; unsaved changes are also flushed immediately when the panel is closed.
- The settings panel is rendered as read-only in content mode — no editor can accidentally modify a template's settings.

#### Template CRUD

- **Duplicate:** produces a full independent copy of the template's component tree and metadata, with a de-duplicated name.
- **Delete:** removes the template and cleans up its entire component tree.

#### Canvas Editing of Templates

- Selecting a template loads it on the canvas for full design editing, just like a regular page.
- The builder's awareness and selection systems are fully template-aware — navigating between templates and regular pages does not corrupt canvas state or selection.
- Asset usage tracking and asset replacement both correctly account for assets referenced inside templates.

#### Creating a Page from a Template (Core Engine)

- The underlying copy logic performs a full deep-copy of the template's component tree, styles, properties, and data sources — all with fresh, unique identifiers.
- All variable expressions in the copied metadata (title, description, social image URL, etc.) are correctly rebound to the new page's context, preserving the intended dynamic behaviour.
- Name and path collisions with existing pages are resolved automatically.

#### Create Page from Template Dialog

- Clicking the create button (`+`) on a template row opens a creation dialog rather than immediately creating a page.
- The dialog is pre-populated from the template's metadata and derives a unique path from the name automatically.
- All standard page settings are available for the designer to review or adjust before confirming: name, path, title, description, language, SEO, social image, status, redirect, document type, and custom metadata.
- The page is only created once the designer confirms, giving them full control over settings upfront.

#### Template Row Context Menu

- Template rows now have a right-click context menu with **Duplicate** and **Delete** actions, matching the behaviour of regular page and folder rows.
- Duplicate produces a full independent copy of the template (component tree + metadata) with a de-duplicated name and navigates to the new template.
- Delete shows a confirmation dialog before removing the template and its component tree, and navigates away if the deleted template was the active canvas view.

#### Template Ordering

- Templates can now be drag-and-drop reordered within the Page Templates section using the same sortable-item mechanism as the pages tree.
- The new order is persisted immediately to the project data.

---

### Limitations

#### URL Display When Editing a Template

- When a template is the active canvas view, any part of the UI that displays the current page's URL shows the root URL (`/`) as a placeholder, since templates have no path. This could be confusing.

#### Visual Differentiation

- The "New Template" button in the panel header reuses the same icon as the "New Page" button. Templates and pages are visually indistinguishable in the panel icon set.

---

## V2 — Editor Page Creation & Limited Page Settings

### Summary

In the current product, content editors have no ability to modify page settings of any kind. V2 introduces a meaningful, safe subset of page-setting control for editors — both on existing pages and when creating new pages from templates. The guiding principle is that editors can change things that are purely editorial (names, readable text, simple toggles) but cannot touch anything that is dynamic, data-bound, or structural.

### Scope

- **Editors only.** Design mode behaviour is unchanged.
- Editors gain access to a limited set of page settings on existing pages.
- Editors gain the ability to create new pages from page templates, with the same limited settings available at creation time.
- Editors retain their existing content-editing capability on the page canvas.

### Editable Page Settings for Editors

Editors should be able to edit the following page settings, subject to the conditions noted:

| Setting                              | Editable by Editor? | Condition                                                                                                      |
| ------------------------------------ | ------------------- | -------------------------------------------------------------------------------------------------------------- |
| Page name                            | Yes                 | Always                                                                                                         |
| Page path                            | Yes                 | Only if the path is a plain static value — not dynamic (no path parameters) and not using any variable binding |
| Title                                | Yes                 | Only if the title is a plain static value and is not using any variable binding                                |
| Search settings (SEO indexing, etc.) | Yes                 | Only if none of the search setting fields are using variable bindings                                          |
| Social image settings                | Yes                 | Only if none of the social image fields are using any variable binding                                         |
| Redirect                             | No                  | —                                                                                                              |
| Custom metadata                      | No                  | —                                                                                                              |
| Any field with a variable binding    | No                  | Binding presence locks the field for editors regardless of which setting it belongs to                         |

**Key rule:** if a field has a binding attached, it is read-only for editors. The editor should be able to see the current value but not modify it. This prevents editors from accidentally breaking dynamic behaviour set up by the designer.

### Editor Page Creation from Templates

- Editors should see a **New Page** option that surfaces the project's available page templates.
- The creation flow mirrors the designer flow, but is scoped to only the settings editors are permitted to set:
  - Page name
  - Page path (static only, following the same binding rule as above)
  - Title (if not bound)
  - Search settings (if not bound)
  - Social image settings (if not bound)
- After creation, the editor lands on the new page with the template's content already in place and can immediately begin editing content within their existing permissions.
- Editors cannot create blank pages — template-based creation is the only page creation path available to them. If no templates exist in the project, editors have no page creation option.
