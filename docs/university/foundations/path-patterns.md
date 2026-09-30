---
description: Write path patterns for project-level Authentication and HTTP response header rules.
---

# Project settings path patterns

Project-level **Authentication** and **HTTP response headers** use the same path pattern syntax and validator. Use these patterns to apply a rule to one page or a group of pages—for example, require a password for `/private/*` or apply a response header to `/docs/*`.

These are not the same implementation as Page Settings paths. Page Settings routes use `URLPattern`, which supports additional pattern forms and has different matching behavior. See [Page settings: Path](page-settings.md#path) for page route syntax and behavior.

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

## How Page Settings paths differ

Page Settings routes are parsed and matched separately using `URLPattern`. Their syntax supports forms that project settings do not, such as parameters embedded within a segment. Matching also differs for wildcards:

- A project setting pattern `/docs/*` matches `/docs` and paths below it.
- A Page Settings route `/docs/*` matches paths below `/docs`, but not `/docs` itself.

Page routing can capture and decode parameter values for dynamic pages. Authentication and Headers only use the pattern to determine whether a rule applies; parameter values are not exposed. Do not assume that a pattern that works in one settings area has the same meaning in the other.

## Choose a pattern

Start with the narrowest path that covers the pages you intend to affect:

- Use an exact path such as `/campaigns/spring` to target one page.
- Use a named parameter such as `/blog/:slug` when one segment can vary.
- Use an optional parameter such as `/blog/:slug?` when the segment may be absent.
- Use a wildcard such as `/docs/*` when a path and its descendants should share a rule.
- Use `/*` only when the rule should apply across the whole site.

For example, an Authentication rule for `/private/*` protects `/private` and paths beneath it. A Headers rule for `/campaigns/:slug` applies to each campaign page with one path segment after `/campaigns`.
