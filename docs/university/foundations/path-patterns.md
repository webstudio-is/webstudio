---
description: Define page paths and target project-level Authentication and HTTP response header rules.
---

# Path patterns

Webstudio uses path patterns to define page URLs and to target project-level **Authentication** and **HTTP response header** rules. These settings share named parameters, optional named parameters, and trailing wildcards. Page paths and project rules differ in which literal characters they accept.

Page settings and project-level rules validate and store paths separately, but use the same router for matching on published dynamic sites. Webstudio generates Remix routes from page paths and uses the underlying React Router matcher for Authentication and Headers rules. A static export has no app router; URL resolution depends on the hosting platform.

## Pattern syntax

Path patterns are slash-separated URL path segments. A segment can be a literal path name, a named parameter, an optional parameter, or a wildcard.

| Pattern | Meaning | Examples that match |
| --- | --- | --- |
| `/about` | Exact static path | `/about` |
| `/blog/:slug` | One required path segment named `slug` | `/blog/hello-world` |
| `/blog/:slug?` | One optional path segment named `slug` | `/blog`, `/blog/hello-world` |
| `/docs/*` | `/docs` and any number of path segments below it | `/docs`, `/docs/setup`, `/docs/api/v1` |
| `/files/:path*` | `/files` and any number of path segments below it | `/files`, `/files/image.png`, `/files/a/b.txt` |
| `/*` | Any path on the site, including the home page | `/`, `/about`, `/blog/post` |
| `/` | The home page only | `/` |

Use `:name` for a single segment, `:name?` for one optional segment, and `:name*` for a wildcard matching the remaining path. Parameter names use letters, numbers, and underscores. A parameter must occupy a complete segment; `*` and `:name*` must be the final segment. A literal segment cannot be optional: use `/:lang?/about` to make a segment optional, not `/en?/about`.

Non-root project rules and non-home page paths at the site root start with `/`. Neither accepts repeating slashes such as `//` or a trailing `/`. The project-rule pattern for the home page is `/`; [Page settings](page-settings.md#path) stores the home page path as an empty value. A page inside a folder can also have an empty local path to use that folder's URL. Wildcards must be the final segment.

**Page settings** accepts lowercase letters and digits with the path syntax shown above. It rejects uppercase letters and percent-encoded paths.

**Project settings** accepts a wider range of literal characters. Use `?` only for an optional named parameter. URL-encoded `:`, `*`, and `?` are literal characters, not pattern syntax. For example, `/%2A` matches only that encoded pathname, with the same hex-letter case; it does not match every page.

## Matching behavior in Project settings

Project-level Authentication and Headers compare patterns against the URL pathname. The query string and fragment are not part of the match: `/docs?lang=en#start` is matched as `/docs`.

- Matching is case-insensitive: `/Docs` also matches `/docs`.
- A trailing slash is ignored for matching: `/about` matches both `/about` and `/about/`.
- A wildcard matches zero or more trailing segments. Therefore, `/docs/*` matches `/docs` as well as `/docs/setup`.
- A named wildcard works the same way for matching: `/files/:path*` matches `/files` and paths below it.
- An optional parameter matches either with or without that one segment: `/blog/:slug?` matches `/blog` and `/blog/post`, but not `/blog/post/comments`.
- A regular named parameter matches exactly one segment: `/blog/:slug` matches `/blog/post`, but not `/blog` or `/blog/post/comments`.
- A static path matches only that path: `/about` does not match `/about/team`.

When writing Authentication and Headers rules, use these examples to check the scope before publishing. A pattern such as `/*` is site-wide; `/` is only the home page.

## Page paths on the published site

Page Settings paths become routes in the generated Remix app. For example, Webstudio maps a dynamic segment such as `:slug` to a Remix dynamic route and a trailing `*` to a Remix splat route. Builder navigation and project rules now use the same router matching behavior. A rule for `/docs/*` matches `/docs` and paths below it in both places.

Page routes can provide parameter values to dynamic pages. Authentication and Headers use their patterns only to decide whether a rule applies; they do not expose route parameters. If several rules match, Authentication uses the first matching rule, while Headers applies each matching rule in order. For static exports, the hosting platform determines how page paths resolve.

## Choose a pattern

Start with the narrowest path that covers the pages you intend to affect:

- Use an exact path such as `/campaigns/spring` to target one page.
- Use a named parameter such as `/blog/:slug` when one segment can vary.
- Use an optional parameter such as `/blog/:slug?` when the segment may be absent.
- Use a wildcard such as `/docs/*` when a path and its descendants should share a rule.
- Use `/*` only when the rule should apply across the whole site.

For example, an Authentication rule for `/private/*` protects `/private` and paths beneath it. A Headers rule for `/campaigns/:slug` applies to each campaign page with one path segment after `/campaigns`.
