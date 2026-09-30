---
description: Write path patterns for project-level Authentication and HTTP response header rules.
---

# Project settings path patterns

Project-level **Authentication** and **HTTP response headers** use the same path pattern syntax and validator. Use these patterns to apply a rule to one page or a group of pages—for example, require a password for `/private/*` or apply a response header to `/docs/*`.

Page Settings paths are handled separately from these project-level rules. On the published dynamic site, Webstudio generates Remix route modules from page paths, and Remix's router selects the page for each request. A static export has no app router; URL resolution depends on the hosting platform. See [Page settings: Path](page-settings.md#path) for the path syntax used when defining pages.

## Pattern syntax

Project settings patterns are slash-separated URL path segments. A segment can be a literal path name, a named parameter, an optional parameter, or a wildcard.

| Pattern | Meaning | Examples that match |
| --- | --- | --- |
| `/about` | Exact static path | `/about` |
| `/blog/:slug` | One required path segment named `slug` | `/blog/hello-world` |
| `/blog/:slug?` | One optional path segment named `slug` | `/blog`, `/blog/hello-world` |
| `/docs/*` | `/docs` and any number of path segments below it | `/docs`, `/docs/setup`, `/docs/api/v1` |
| `/files/:path*` | `/files` and any number of path segments below it | `/files`, `/files/image.png`, `/files/a/b.txt` |
| `/*` | Any path on the site, including the home page | `/`, `/about`, `/blog/post` |
| `/` | The home page only | `/` |

Use `:name` for a single segment, `:name?` for one optional segment, and `:name*` for a wildcard matching the remaining path. Parameter names use letters, numbers, and underscores. A parameter must occupy a complete segment; `*` and `:name*` must be the final segment.

For **Project settings**, patterns must start with `/`, cannot contain repeating slashes such as `//`, and cannot end with `/` except for the home page pattern `/`.

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

## Page paths on the published site

Page Settings paths become routes in the generated Remix app. For example, Webstudio maps a dynamic segment such as `:slug` to a Remix dynamic route and a trailing `*` to a Remix splat route. The published app's page selection is handled by Remix's router, not by the matcher used for Authentication and Headers rules. In that app, `/docs/*` matches `/docs` and paths below it; that base-path behavior is also true for Project settings rules.

Page routes can provide parameter values to dynamic pages. Authentication and Headers use their patterns only to decide whether a rule applies; they do not expose route parameters. While the syntax overlaps, these are separate routing systems. For static exports, the hosting platform determines how page paths resolve.

## Choose a pattern

Start with the narrowest path that covers the pages you intend to affect:

- Use an exact path such as `/campaigns/spring` to target one page.
- Use a named parameter such as `/blog/:slug` when one segment can vary.
- Use an optional parameter such as `/blog/:slug?` when the segment may be absent.
- Use a wildcard such as `/docs/*` when a path and its descendants should share a rule.
- Use `/*` only when the rule should apply across the whole site.

For example, an Authentication rule for `/private/*` protects `/private` and paths beneath it. A Headers rule for `/campaigns/:slug` applies to each campaign page with one path segment after `/campaigns`.
