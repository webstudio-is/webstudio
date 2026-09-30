---
description: Write and understand URL path patterns used by project settings.
---

# URL path patterns

Webstudio uses path patterns in Page Settings and Project settings. In Project settings, the same syntax is used by **Authentication** and **HTTP response headers**. For example, you can require a password for every page under `/private` or apply a response header to every page under `/docs`.

Page Settings use the same basic syntax to define page paths, but page routing and project settings do not match every pattern in exactly the same way. Differences are described below.

## Pattern syntax

Patterns are slash-separated URL path segments and must start with `/`. A segment can be a literal path name, a named parameter, an optional parameter, or a wildcard.

| Pattern | Meaning | Examples that match |
| --- | --- | --- |
| `/about` | Exact static path | `/about` |
| `/blog/:slug` | One required path segment named `slug` | `/blog/hello-world` |
| `/blog/:slug?` | One optional path segment named `slug` | `/blog`, `/blog/hello-world` |
| `/docs/*` | Any number of path segments after `/docs` | `/docs`, `/docs/setup`, `/docs/api/v1` |
| `/files/:path*` | Any number of path segments after `/files`, using the name `path` | `/files`, `/files/image.png`, `/files/a/b.txt` |
| `/*` | Any path on the site, including the home page | `/`, `/about`, `/blog/post` |
| `/` | The home page only | `/` |

Use `:name` for a single segment, `:name?` for one optional segment, and `:name*` for a wildcard that captures the remaining path. Parameter names use letters, numbers, and underscores. `*` and `:name*` must be the final segment.

For **Project settings**, patterns must start with `/`, cannot contain repeating slashes such as `//`, and cannot end with `/` except for the home page pattern `/`. For a page's home route, Page Settings uses an empty path instead of `/`.

## Matching behavior in Project settings

Project-level Authentication and Headers compare patterns against the URL pathname. The query string and fragment are not part of the match: `/docs?lang=en#start` is matched as `/docs`.

- Matching is case-sensitive: `/Docs` does not match `/docs`.
- A trailing slash is ignored for matching: `/about` matches both `/about` and `/about/`.
- A wildcard matches zero or more trailing segments. Therefore, `/docs/*` matches `/docs` as well as `/docs/setup`.
- A named wildcard works the same way for matching: `/files/:path*` matches `/files` and paths below it.
- An optional parameter matches either with or without that one segment: `/blog/:slug?` matches `/blog` and `/blog/post`, but not `/blog/post/comments`.
- A regular named parameter matches exactly one segment: `/blog/:slug` matches `/blog/post`, but not `/blog` or `/blog/post/comments`.
- A static path matches only that path: `/about` does not match `/about/team`.

When writing Authentication and Headers rules, use these examples to check the scope before publishing. A pattern such as `/*` is site-wide; `/` is only the home page.

## Difference from Page Settings routes

Page Settings use path patterns to select which page handles a URL. Project-level Authentication and Headers use patterns to decide whether a rule applies to the URL pathname. The syntax is shared, but wildcard behavior has one important difference:

- In **Project settings**, `/docs/*` matches `/docs` and all paths below it.
- As a **Page Settings** route, `/docs/*` matches paths below `/docs`, but not `/docs` itself.

Page routing can also capture and decode parameter values for use by dynamic pages. Authentication and Headers use patterns only to determine whether a rule matches; they do not expose parameter values.

For Page Settings fields and page routing behavior, see [Page settings](page-settings.md#path).

## Choose a pattern

Start with the narrowest path that covers the pages you intend to affect:

- Use an exact path such as `/campaigns/spring` to target one page.
- Use a named parameter such as `/blog/:slug` when one segment can vary.
- Use an optional parameter such as `/blog/:slug?` when the segment may be absent.
- Use a wildcard such as `/docs/*` when a path and its descendants should share a rule.
- Use `/*` only when the rule should apply across the whole site.

For example, an Authentication rule for `/private/*` protects `/private` and paths beneath it. A Headers rule for `/campaigns/:slug` applies to each campaign page with one path segment after `/campaigns`.
