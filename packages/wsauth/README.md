# `@webstudio-is/wsauth`

`wsauth` is Webstudio's generic authentication package.

It owns shared authentication types, validators, route matching, build-time
resource generation, and runtime enforcement helpers used by Builder-generated
sites. The package is intentionally structured around auth methods so Webstudio
can add methods beyond Basic Auth without changing the route auth model.

The first implemented method is HTTP Basic Auth. The first implemented
configuration format is the text-based `.wsauth` route auth file.

The package intentionally does not depend on Builder, Remix, React Router, or
Zod. Framework-specific packages can use the validator functions from this
package inside their own schemas.

## Goals

- Provide shared generic auth primitives for Webstudio.
- Provide a small manually editable auth file format for Basic Auth routes.
- Keep route protection portable across generated runtimes.
- Allow Builder-generated auth rules and manually written auth rules to share
  one parser and validator.
- Keep auth extensible so new auth methods can be added after `basic`.
- Keep authentication checks independent from page rendering data.

## Current Scope

Implemented now:

- HTTP Basic Auth validation and runtime enforcement.
- The `.wsauth` version 1 text format for route-level auth configuration.
- Build-time helpers for merging existing `.wsauth`, project auth text, and
  generated page auth.

Expected future scope:

- Additional auth methods beyond Basic Auth.
- Additional text syntax or non-text configuration sources as needed.

## File Name

The canonical file name is:

```txt
.wsauth
```

Generated Webstudio projects may create this file at build time. If it already
exists, generated routes can be merged into it without duplicating existing
routes.

Generated routes are written inside an ignored comment-delimited block:

```txt
# webstudio-auth-generated-start
# Webstudio generated auth pages. Move routes outside this block to manage them manually.
/private admin:secret
# webstudio-auth-generated-end
```

Build tools replace that block on each build. Routes outside the generated
block are treated as manually managed and have priority over generated routes
with the same exact route string.

## Format Version

This document specifies `.wsauth` version 1.

Version 1 has no explicit version header. The absence of a version header means
version 1.

Future versions should remain line-oriented when possible. If incompatible
syntax becomes necessary, it should be introduced with an explicit directive
line.

## File Encoding

- Files must be UTF-8 text.
- Lines may use LF or CRLF endings.
- A parser must process the file line by line.

## Line Types

There are three line types:

1. Blank lines
2. Comment lines
3. Route auth lines

### Blank Lines

A blank line is a line that is empty after trimming leading and trailing
whitespace.

Blank lines are ignored.

### Comment Lines

A comment line is a line whose first non-whitespace character is `#`.

Examples:

```txt
# My protected pages
    # Indented comments are also comments
```

Comment lines are ignored.

Version 1 does not define inline comments. This is intentional: future auth
methods may need characters such as `#` inside auth expressions.

### Route Auth Lines

A route auth line contains exactly two fields separated by whitespace:

```txt
<route> <auth-expression>
```

Examples:

```txt
/my/page me:idiot
/bla/* bla:blubb
/users/:id admin:secret
```

Leading and trailing whitespace around the line is ignored. One or more
whitespace characters may separate the two fields.

Additional fields are invalid in version 1.

## Routes

The route field identifies which request path should require auth.

Routes use the same subset of path pattern syntax Webstudio uses for pages:

- Static segment: `/about`
- Named parameter: `/blog/:slug`
- Optional named parameter: `/blog/:slug?`
- Wildcard: `/docs/*`
- Named wildcard: `/docs/:path*`

### Route Rules

- A route must start with `/`.
- A route must not contain whitespace.
- A route must not contain repeating `/`.
- A route must not end with `/`, except the root route `/`.
- `*` and `:name*` are splat/wildcard segments and must be the final segment.
- Named parameters use `:name`, `:name?`, or `:name*`.
- Parameter names must contain word characters only, matching `\w+`.

### Route Matching

Matching is performed against `URL.pathname`.

Before matching:

- Empty pathnames are normalized to `/`.
- A trailing slash is removed from non-root pathnames.

Examples:

```txt
/about          matches /about and /about/
/about          does not match /about/team
/blog/:slug     matches /blog/hello
/blog/:slug?    matches /blog and /blog/hello
/docs/*         matches /docs, /docs/api, and /docs/api/v1
/docs/:path*    matches /docs, /docs/api, and /docs/api/v1
```

When multiple routes match a pathname, consumers should use the first matching
route. Merge logic in this package preserves the first entry for duplicate route
strings.

## Auth Expressions

The second field is an auth expression.

Version 1 supports one auth method:

- `basic`

The unprefixed expression:

```txt
login:password
```

is parsed as Basic Auth.

This unprefixed form is intentionally kept short because Basic Auth is expected
to be the common manually edited case.

### Basic Auth Expression

Syntax:

```txt
<login>:<password>
```

Examples:

```txt
/private admin:secret
/team alice:correct-horse-battery-staple
```

Rules:

- The first `:` separates login from password.
- Login is required.
- Password is required.
- Login must not contain `:`.
- Login must not contain whitespace.
- Password must not contain whitespace.
- Password may contain `:` after the first separator.

The colon rule follows HTTP Basic Auth's `user-id ":" password` credential
structure from RFC 7617.

## Extensibility

Internally, parsed rules are structured by auth method:

```ts
type WsAuthRoute = {
  route: string;
  auth: {
    method: "basic";
    login: string;
    password: string;
    credentials: string;
  };
};
```

Future auth methods should add new `auth.method` variants rather than changing
the route model.

Future text syntax can add method-prefixed auth expressions while preserving the
version 1 Basic Auth shorthand. For example, a future version could define:

```txt
/private basic:admin:secret
/private remote:my-auth-provider
```

Those examples are reserved for future versions and are not valid version 1
syntax unless explicitly implemented.

## Merge Semantics

When multiple sources provide `.wsauth` rules, merge order matters.

The package keeps the first rule for each exact route string and drops later
duplicates.

Recommended build merge order:

1. Existing root `.wsauth`
2. Project-level `.wsauth` text from Webstudio project settings
3. Page-level auth generated by Webstudio page settings

With that order, manual root `.wsauth` entries are authoritative.

## Package Contract

The package exposes generic helpers for these responsibilities:

- Parse and serialize `.wsauth` version 1 text.
- Validate Basic Auth credentials without depending on Zod.
- Merge multiple auth sources using the merge order described above.
- Generate route auth resources for published apps without doing filesystem IO.
- Match request paths against auth routes.
- Enforce Basic Auth with standard Fetch API `Request` and `Response` objects.

Validation results expose structured issues that schema validators can map into
their own error formats:

```ts
{
  issues: [
    { path: ["login"], message: "Login can't contain whitespace" }
  ],
  errors: {
    login: ["Login can't contain whitespace"]
  }
}
```

The `errors` field is a grouped convenience shape for UI display.

Build-time resource generation returns the data needed by callers without
assuming a framework or filesystem:

```ts
{
  routes: WsAuthRoute[];
  content: string;
  module: string;
}
```

The `content` field is the `.wsauth` text to write. When an existing root
`.wsauth` is provided, comments, blank lines, route order, and manually managed
routes outside the generated block are preserved. The generated block is
replaced with the current project and page auth routes that are not overridden
manually. The `module` field is framework-neutral TypeScript module content
that exports `authRoutes`.

At runtime, protected requests without valid credentials receive:

```ts
new Response("Authentication required", {
  status: 401,
  headers: {
    "WWW-Authenticate": 'Basic realm="Webstudio"',
    "Cache-Control": "private, no-store",
  },
});
```
