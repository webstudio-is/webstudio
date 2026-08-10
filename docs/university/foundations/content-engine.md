---
description: Create a file-based blog with Markdown, Assets queries, and dynamic pages.
---

# 📚 Content Engine

Webstudio's Content Engine turns Markdown and JSON files in Assets into content
you can query and bind in the visual editor. The files remain the source of
truth, including their filenames, folders, metadata, and relative links. You
can move the same files between projects or use them outside Webstudio without
exporting them from a database first.

This guide creates a blog overview at `/blog` and one dynamic article page at
`/blog/:slug`.

<figure><img src="../../.gitbook/assets/content-engine-assets-structure.png" alt="Assets panel showing Markdown articles and their assets folder"><figcaption><p>Markdown articles stored alongside their assets</p></figcaption></figure>

## Build it with MCP

An AI agent can complete this entire workflow through
[Webstudio MCP](../mcp.md). It can create the folders and Markdown files, upload
images, build both pages, configure the Assets resources, add the Collection,
bind the article directly, set the page metadata, and check the rendered result
with vision. Everything remains editable in the visual editor.

Give the agent an editable project share link when it asks for one, then make a
request such as:

> Use Webstudio CLI to build a blog with the Content Engine. Store the articles
> as Markdown files, create `/blog` and `/blog/:slug`, exclude drafts, and check
> both pages on desktop and mobile.

The remaining steps explain the same workflow when you want to build or inspect
it manually.

## 1. Organize the files

Create this folder structure in the Assets panel:

```text
blog/
  posts/
    assets/
```

Keeping all articles in one folder makes them easy to query. Images can live
next to the articles or in a nested folder.

Open the settings for the `posts` folder and copy its ID. Both Assets resources
in this guide use that ID to query only files in this folder.

## 2. Create an article

1. Open `blog/posts` in the Assets panel.
2. Open the add menu and choose **Create text file**.
3. Name the file `hello-world.md`.
4. Add the article metadata between the two `---` lines, followed by the
   article body:

```markdown
---
title: Hello world
slug: hello-world
publishedAt: 2026-08-10
excerpt: A short introduction to the article.
draft: false
featureImage: ./assets/hello-world.png
author: Ada Lovelace
---

# Hello world

Write the article here.
```

<figure><img src="../../.gitbook/assets/content-engine-markdown-editor.png" alt="Markdown editor showing article frontmatter and body"><figcaption><p>An article's metadata and body in the Markdown editor</p></figcaption></figure>

### Frontmatter

The opening YAML block is called **frontmatter**. It must be the first block in
the Markdown file and must start and end with `---` on separate lines.

Frontmatter accepts strings, numbers, booleans, `null`, arrays, and nested
objects. The Content Engine exposes these fields under `properties`, such as
`properties.title` and `properties.slug`.

You define the fields yourself. Keep their names and value types consistent
between articles so one query and one page design work for every article.

{% hint style="warning" %}
`draft` is a field you defined, not the visual editor's automatic
[page draft](page-settings.md#draft-pages) setting. Add a query filter that
excludes `draft: true` anywhere unpublished articles must not appear.
{% endhint %}

The Markdown below the closing `---` is the body. It is available separately
at `content.text` when the Assets resource uses **Markdown body reference**.

### Relative asset paths

Upload `hello-world.png` to `blog/posts/assets`. The article refers to it with
`./assets/hello-world.png`, relative to the Markdown file. When an Assets
resource returns `properties.featureImage`, Webstudio turns that path into the
published image URL. Bind the returned value directly to an image, background
image, social image, download link, or another URL property.

Relative paths also work in nested objects, arrays, and JSON files. Query
strings and fragments are preserved, so a value such as
`./assets/hello-world.png?width=1200#cover` remains usable.

Imported content can also use published asset paths such as
`./assets/hero.png` or `/assets/hero.png`. Webstudio matches the final filename
across project Asset folders, so the content file and referenced asset do not
need to share the same folder hierarchy. The filename must identify exactly
one project asset.

Webstudio resolves a path only when it uniquely matches a project asset.
External URLs, other root-relative URLs, missing paths, and ambiguous paths
remain unchanged. Keep the clean path in the source instead of hardcoding an
asset ID or generated filename. This is what makes the content portable.

### JSON files

The Content Engine can query JSON files as well as Markdown. A JSON file must
contain an object at its root:

```json
{
  "name": "Ada Lovelace",
  "role": "Author",
  "avatar": "./assets/ada.png"
}
```

Its fields are also exposed under `properties`, such as `properties.name` and
`properties.avatar`. Use JSON when the file contains structured data without a
Markdown body.

## 3. Query the articles for the overview

Create a static page with the path `/blog`, then add an Assets resource to its
page-level **Dynamic data**:

1. Create a **System Resource** and choose **Assets**.
2. Name it `posts`.
3. Under **Output**, choose **Selected fields**, turn off **File metadata**, and
   include only the fields the overview renders, such as `properties.title`,
   `properties.slug`, `properties.publishedAt`, `properties.excerpt`, and
   `properties.featureImage`.
4. Under **Result**, choose **Many**.
5. Under **Content**, choose **Metadata only**. The overview does not render
   complete article bodies.
6. Add these filters:
   - `extension` **equals** `"md"`
   - `folder id` **equals** the quoted `posts` folder ID
   - `properties.draft` **does not equal** `true`
7. Sort `properties.publishedAt` in descending order. Add `id` in ascending
   order as a second sort so articles with the same publication date keep a
   stable order.

<figure><img src="../../.gitbook/assets/content-engine-overview-query.png" alt="Assets overview query filtering Markdown files and drafts, then sorting by publication date and ID"><figcaption><p>The Webstudio Updates query also filters articles by category</p></figcaption></figure>

Choosing only the fields the page renders keeps the published content data
small. Leaving article bodies out of the overview also avoids loading every
article just to display a list.

## 4. Build the overview

1. Add a [Collection](../core-components/collection.md) to the page.
2. Bind the Collection data to `posts.data`.
3. Rename the Collection Item to `Post`.
4. Design one article card inside the Collection.
5. Bind the card's text and image to fields on `Post.value`, such as
   `Post.value.properties.title` and
   `Post.value.properties.featureImage`.
6. Bind the card link to `"/blog/" + Post.value.properties.slug`.

The Assets resource returns many results as an object, so the current article
inside the Collection is available through the Collection Item's `value`.

## 5. Create the dynamic article page

Create one page with the path `/blog/:slug`. This page is the template for all
articles. In the visual editor's address bar, enter `hello-world` as the
preview value for `:slug`.

Add another Assets resource to the page-level **Dynamic data**:

1. Create a **System Resource** and choose **Assets**.
2. Name it `post`.
3. Under **Output**, choose **Selected fields**, turn off **File metadata**, and
   include the fields this page renders, such as `properties.title`,
   `properties.publishedAt`, `properties.excerpt`, `properties.featureImage`,
   and `properties.author`.
4. Under **Result**, choose **Exactly one**.
5. Under **Content**, choose **Markdown body reference**.
6. Add these filters:
   - `extension` **equals** `"md"`
   - `folder id` **equals** the quoted `posts` folder ID
   - `properties.slug` **equals** `system.params.slug`
   - `properties.draft` **does not equal** `true`

<figure><img src="../../.gitbook/assets/content-engine-article-query.png" alt="Assets resource filtering one Markdown article by folder and the dynamic page slug"><figcaption><p>The article resource uses the dynamic slug from the page URL</p></figcaption></figure>

**Exactly one** returns the matching article directly at `post.data`. It also
reports an error if two articles use the same slug. You do not need a
Collection on the article page.

**Markdown body reference** keeps article bodies out of the published content
database. Webstudio first finds the matching article, then loads only that
Markdown body from Assets.

## 6. Bind the article

Bind the article components directly to `post.data`:

- Heading: `post.data?.properties?.title`
- Author: `post.data?.properties?.author`
- Image source: `post.data?.properties?.featureImage`
- Markdown Embed code: `post.data?.content?.text`

Add a [Markdown Embed](../core-components/markdown-embed.md) for the body. Style
its nested headings, paragraphs, links, lists, and images once; the styles apply
to every article.

In Page Settings, bind the fields needed for search and sharing:

- **Title**: `post.data?.properties?.title`
- **Description**: `post.data?.properties?.excerpt`
- **Social image**: `post.data?.properties?.featureImage`
- **Status code**: `post.data ? 200 : 404`

The status expression returns a real 404 when no article matches the URL.

## 7. Publish the article

Start new articles with `draft: true`. The overview and article queries above
will exclude them. Change `draft` to `false` when the article is ready:

```yaml
draft: false
```

The overview query will now include it. If you build a
[custom sitemap](../core-components/xml-node.md) for the dynamic article URLs,
give its Assets resource the same `properties.draft does not equal true`
filter. The metadata field does not automatically remove an article from a
custom sitemap.

To publish another article, duplicate the Markdown file and change its title,
slug, publication date, image, and body. The existing overview and dynamic page
will render it without another page design.

## Reference other content files

An article can reference data stored in another Markdown or JSON file. For
example, keep author details in `blog/authors/ada.md` and reference its
frontmatter from an article:

```yaml
author:
  $ref: ../authors/ada.md#frontmatter
```

The `$ref` object must contain only the `$ref` field. Its path is relative to
the file containing the reference. The optional fragment chooses which part of
the target file to use:

| Reference                              | Result                                         |
| -------------------------------------- | ---------------------------------------------- |
| `../authors/ada.md#frontmatter`        | The Markdown frontmatter as an object          |
| `../authors/ada.md#body`               | The Markdown body without frontmatter          |
| `../authors/ada.md`                    | The complete Markdown source                   |
| `../authors/ada.json`                  | The complete JSON value                        |
| `../authors/ada.json#/profile/name`    | One value selected with a JSON Pointer         |

The Content Engine resolves a reference only when a query uses that data. It
rejects missing targets and reference cycles instead of returning incomplete
content. References let several articles share one author record while all
source files and links remain portable.

## Related

- [Assets](assets.md) – Create, edit, organize, and reference project files
- [Data variables](variables.md) – Define resources and understand their scope
- [Expression editor](expression-editor.md) – Bind query results to components
- [Collection](../core-components/collection.md) – Render article lists
- [Markdown Embed](../core-components/markdown-embed.md) – Render and style an article body
