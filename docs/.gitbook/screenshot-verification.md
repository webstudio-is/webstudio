# Screenshot manual verification

This file tracks screenshots that were preserved because a current light and dark replacement could not be captured safely and deterministically during the documentation audit. Replace an image only after both theme variants reproduce the documented state, use the same crop, and are wired with precise alt text.

## Authenticated Webstudio account states

These require a suitable account, workspace, billing state, or Marketplace submission. Verify the documented workflow, then capture both themes without exposing personal or billing data.

- `dashboard-plan-name.png`, `dashboard.webp`, `new-workspace-dialog.png`, `workspace-members-dialog.png`, `workspace-role-selector.png`, `workspace-selector.png`, `project-transfer-dialog.png`
- `upgrade-account-pricing.png`
- `marketplace-submission.png`, `marketplace-page-settings.png`, `marketplace-three-tabs.png`, `craft-library.png`

## Purpose-built Builder fixture states

These require a disposable project containing the exact component tree, data, breakpoint, binding, or style state. The local documentation project did not contain those states, and it was not mutated solely to produce screenshots.

- Collections and Radix: `accordion-collection.png`, `collection-component.png`, `component-array.png`, `right-and-wrong-way-collections.png`, `tab-content.png`, `tab-trigger.png`, `radix-accordion-content.png`, `radix-accordion.png`, `radix-collapsible.png`, `radix-components.png`, `radix-forms.png`
- Content mode and Content Blocks: `add-content.png`, `delete-instance-content-mode.gif`, `edit-text.gif`, `image-content-mode.png`, `startingpoint-content-block.png`, `templates-content-mode.png`, `templates-design-mode.png`
- Component settings: `blockquote-cite-property.avif`, `blockquote-cite-tag.avif`, `content-embed-code.png`, `content-embed-component.png`, `content-embed-style.png`, `form-components.png`, `form-name.png`, `form-recipient.png`, `gsap.png`, `link-href-property.avif`, `link-local-link-state.png`, `link-target-property.avif`, `link-to-section.png`, `list-component-properties.avif`, `markdown-embed-code.webp`, `markdown-embed-style.webp`, `markdown-embed.png`, `search-blog.png`, `section-id.png`, `slot-component-overview.png`, `text-input.png`, `vimeo-component-properties.avif`, `vimeo-instance-properties.avif`, `xml-component.png`
- Page and CMS states: `address-bar.png`, `cms-dynamic-404-show-404-content.png`, `cms-dynamic-404-show-regular-content.png`, `cms-dynamic-404-status-code.png`, `page-settings-authentication-enabled.png`, `page-settings-general.png`, `page-settings-plain-text-page.png`, `page-settings-xml-doc-type.png`, `static-sitemap-data.png`
- Style and breakpoint states: `animation-group-disable-breakpoint.png`, `before-example.png`, `breakpoints-cascade.png`, `convert-to-token.png`, `create-data-variables.png`, `create-style-tag.png`, `css-var-example.png`, `css-var-usage.png`, `custom-attributes.png`, `empty-circle.png`, `global-tags.png`, `grid-area-picker.png`, `grid-areas.png`, `grid-child-area.png`, `grid-child.png`, `grid-generator.png`, `grid-guides.png`, `grid-presets.png`, `grid-settings.png`, `h1-token.png`, `layout-section.png`, `new-token.png`, `paste-html-tailwind-command.png`, `property-label-tooltip.png`, `pseudo-element-autocomplete.png`, `state-active.png`, `states-dropdown.png`, `style-sources.png`, `tokens-added.png`, `transforms-section.png`, `upload-font.png`, `use-variable.png`, `webstudio-expression-editor.png`
- Vimeo background-video sequence: `vimeo-bg-video-step-1.avif`, `vimeo-bg-video-step-2.avif`, `vimeo-bg-video-step-3.avif`, `vimeo-bg-video-step-4.avif`, `vimeo-bg-video-step-5.avif`, `vimeo-bg-video-step-6.avif`, `vimeo-bg-video-step-7.avif`

## Content Engine fixture states

These require the article-query and asset hierarchy from the original blog fixture. Verify the current Assets query, Markdown editor, and result shapes before recapturing.

- `content-engine-article-query.png`, `content-engine-assets-structure.png`, `content-engine-markdown-editor.png`, `content-engine-overview-query.png`

## Motion captures

These are animations rather than static screenshots. Recreate the interaction in both themes and keep equivalent timing, pointer movement, and crop.

- `css-paste.gif`, `delete-instance-content-mode.gif`, `edit-text.gif`, `parent-child-demo.gif`, `sharecontent.gif`
- `flotiq-bind-data.gif`, `flotiq-listing-page.gif`

## Inception

These require the authenticated Inception product, suitable generated frames, history, credits, and billing state.

- `inception-balance.png`, `inception-boards-panel.png`, `inception-buy-credits.webp`, `inception-custom-style.webp`, `inception-frame-menu.png`, `inception-frame-toolbar.png`, `inception-history.png`, `inception-image-edit.png`, `inception-improve-design.png`, `inception-model-selector.webp`, `inception-overview.webp`, `inception-project-menu.png`, `inception-prompt-panel.png`, `inception-selected-edit.webp`, `inception-style-picker.webp`

## Third-party integrations

These require authenticated third-party accounts and current sample data. Verify both the third-party UI and the corresponding Webstudio state. If a third-party product does not offer both themes, document that exception instead of fabricating a themed variant.

- Airtable: `airtable-automation-toggle.avif`, `airtable-frontend-cover.png`, `airtable-input-settings.avif`, `airtable-webhook-setup.avif`
- Flotiq: `flotiq-create-content-type.png`, `flotiq-data-variable.png`, `flotiq-dynamic-page.jpeg`, `flotiq-dynamic-path.png`, `flotiq-inspect-tool.png`
- n8n: `n8n-webhook-form-settings.avif`, `n8n-workflow-overview.avif`
- Integration covers: `headless-wordpress-cover.png`, `hygraph-frontend-cover.png`, `notion-website-cover.png`
- The Airtable frontend, Notion, and WordPress integration pages also contain externally hosted `images.surferseo.art` screenshots. Verify and replace every remote screenshot on those three pages; do not remove one before its replacement is committed.

## Self-hosting and external tools

These require current accounts or installations for VS Code, Cloudflare, Coolify, DigitalOcean, Flightcontrol, Netlify, or Vercel. Recreate the documented step in the provider's current UI and record any provider that lacks a matching theme.

- `build-config.png`, `cloudflare-pages-new-project.png`, `flightcontrol-aws-setup.png`, `flightcontrol-build-config-own.png`, `flightcontrol-connect-github.png`, `flightcontrol-docker-export.png`, `flightcontrol-done.png`, `netlify-drag-drop.png`, `netlify-new-project.png`, `third-party-images-flight-control.png`, `vercel-new-project.png`, `vscode-dialog.png`
- `webstudio-digital-ocean-coolify-1.webp`, `webstudio-digital-ocean-coolify-3.png`, `webstudio-digital-ocean-coolify-4.png`, `webstudio-digital-ocean-coolify-5.png`, `webstudio-digital-ocean-coolify-6.png`, `webstudio-digital-ocean-coolify-8.png`, `webstudio-digital-ocean-coolify-9.png`, `webstudio-sync.png`

## Result and cover states

These are real product or published-site states that need the original project, error condition, or course page to reproduce accurately.

- `add-new-domain.png`, `worker-not-found.png`
- `webstudio-essentials-course.png`
