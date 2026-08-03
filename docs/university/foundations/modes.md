---
description: >-
  Modes change the Builder’s behavior, such as previewing your site without
  distractions.
icon: paintbrush-fine
---

# Modes

There are three modes:

- [Design](modes.md#design)
- [Content](modes.md#content)
- [Preview](modes.md#preview)

You can change modes in the Top Bar or via [keyboard shortcuts](shortcuts.md) if you have sufficient [permissions](share-links.md#types-of-share-links).

Additionally, you can open any project in [Safe Mode](modes.md#safe-mode), which disables script execution for security and troubleshooting purposes.

<figure><img src="../../.gitbook/assets/builder-modes.png" alt=""><figcaption></figcaption></figure>

## Design

Designer mode provides the full power of the builder. For example, you can add and style components.

## Content

Content mode tailors the builder’s features to editor tasks like updating text and images, and adding templates to designer-specified regions. Text and supported props are editable only inside [Content Blocks](../core-components/content-block.md); everything outside them is read-only. This mode is ideal for team members and clients.

### Allowed actions

In Content mode, the following actions can be performed:

- Edit text content (e.g., paragraphs, headings, links, etc.) inside Content Blocks
- Add and edit links within text inside Content Blocks
- Upload and change images inside Content Blocks when their props are available in Content mode
- Insert instances of templates to designer-specified regions called [Content Blocks](../core-components/content-block.md)
- Create pages from existing [Page templates](page-templates.md), if the designer provided them
- Edit safe page settings: page name, static path, title, description, search visibility, language, social image, and custom metadata
- Publish the site (optional [permission](share-links.md#types-of-share-links))

Content mode keeps structural and developer-oriented settings protected. Editors cannot create dynamic paths, change redirects, status codes, document type, authentication, page variables, or the page templates themselves.

### For designers/developers

As the website designer/developer, Content mode helps you strike the balance between creating a professional website while also letting your clients/team members edit it without them breaking it or deviating from the design system.

{% embed url="https://youtu.be/hzRy45vIViY" %}

Here’s what you need to know:

- You can try the Content mode by going to the Top Bar and changing modes.
- Users on the Pro tier can create a [Share link](share-links.md) with “Content” permission
- Editors can perform [these actions](modes.md#allowed-actions)
- You can create templates that editors can insert with [Content Blocks](../core-components/content-block.md)
- You can create [Page templates](page-templates.md) that editors can use to create new pages
- Editors can update safe page metadata, but dynamic routes, redirects, authentication, document type, and status-code logic remain under designer control

#### Creating a Content mode share link

1. Go to **Share** in the top bar
2. Create a new share link
3. Check "Content mode" option
4. Optionally enable/disable publish permission for the client

#### Testing Content mode

You can quickly switch to Content mode using the mode dropdown arrow next to Design in the top bar — useful for testing what clients will see before sharing the link.

#### Content Block templates

Content Block templates cannot be deleted by editors. Even if all instances of a template are removed, the template itself remains available for editors to add again. Make sure templates include complete styling since editors don't have access to the Style panel.

### For editors

With Content mode, you can dive right in and edit the website without feeling overwhelmed or risking any changes to the site that could cause issues.

{% embed url="https://youtu.be/0GoOe5D-hQk" %}

Here’s what you need to know:

- You can click directly on the canvas to update text inside a Content Block. Text outside a Content Block is read-only. Want to update a title to the latest promotion? Click, type, done.

  <figure><img src="../../.gitbook/assets/edit-text.gif" alt="editing content on the canvas"><figcaption><p>Editing content on the canvas</p></figcaption></figure>

- Some items inside a Content Block may have settings, like images. Clicking on an image will display the settings on the right. There, you can upload a new image. Just be sure to fill in the field called “Alt” describing the image so visually impaired people can consume your site.

  <figure><img src="../../.gitbook/assets/image-content-mode.png" alt="image editing in content editor mode"><figcaption><p>The image can be replaced in the Settings Panel</p></figcaption></figure>

- The designer must include [Content Blocks](../core-components/content-block.md#content-block-in-content-mode) for content you need to change. These are the regions where you can edit content and add templates the designer provided. See [Content Block](../core-components/content-block.md) for more information.

  <figure><img src="../../.gitbook/assets/add-content.png" alt="Adding a template"><figcaption></figcaption></figure>

- If the designer provided [Page templates](page-templates.md), you can create new pages from them and edit page details like name, path, SEO title, description, language, social image, and custom metadata.

- Changes save in real-time, but you must publish your changes when you are ready for them to go live. To do so, open the publish dialog by clicking “Publish” in the top right, then click “Publish”. It takes around 45 seconds for the site to publish. Note, “Publish” may be disabled if the designer didn’t enable the publishing permission for you.

## Preview

Preview mode hides editing capabilities so you can browse your website. Use it to test navigation, interactions, and responsive behavior on every breakpoint.

## Safe Mode

Safe mode is a security and troubleshooting feature that prevents all scripts from executing in your project. This is useful when:

- You suspect a script is causing issues or slowing down the builder
- You need to troubleshoot problems that might be caused by custom JavaScript
- You want to safely inspect a project before running potentially harmful code
- You're reviewing a marketplace template or imported project

### How to Enable Safe Mode

From the dashboard:

1. Right-click (or long press on mobile) on a project
2. Select **Open in safe mode** from the menu

When safe mode is active, you'll see a shield icon in the top bar indicating that script execution is disabled.

### What Safe Mode Disables

- All JavaScript in HTML Embed components
- Custom scripts added to the project
- Third-party scripts (analytics, widgets, etc.)

### What Still Works

- All styling and layout features
- Component rendering
- Text and image editing
- Building and publishing

{% hint style="info" %}
Safe mode only affects the builder preview. Published sites always run scripts normally, regardless of whether you edited the project in safe mode.
{% endhint %}

## Related

- [Share links](share-links.md) – Create Content mode share links for clients
- [Content Block](../core-components/content-block.md) – Define editable regions for Content mode
- [Shortcuts](shortcuts.md) – Keyboard shortcuts to switch modes quickly
- [Anatomy of the Webstudio builder](anatomy-of-the-webstudio-builder.md) – Overview of the Builder interface
