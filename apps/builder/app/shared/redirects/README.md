# Redirect Parsers

Import redirects from popular formats (CSV, JSON, Netlify `_redirects`, Apache `.htaccess`) into Webstudio.

## Webstudio Redirect Format

Webstudio stores redirects with this schema:

```typescript
type PageRedirect = {
  old: string; // Source path (must start with /, cannot end with /)
  new: string; // Target path or URL
  status?: "301" | "302"; // Optional, defaults to 301
};
```

### Path Requirements

| Requirement         | Valid              | Invalid                |
| ------------------- | ------------------ | ---------------------- |
| Must start with `/` | `/about`           | `about`                |
| Cannot end with `/` | `/about`           | `/about/`              |
| No double slashes   | `/a/b/c`           | `/a//b`                |
| Allowed chars       | `a-zA-Z0-9-_/:?.*` | `<>{}`                 |
| Reserved paths      | `/home`            | `/s/...`, `/build/...` |

### Slash Normalization

The parser **strips trailing slashes** from source paths to match Webstudio's requirements:

```
Input:  /old-path/  →  Output: /old-path
Input:  /old-path   →  Output: /old-path
```

Target paths preserve their original form (Webstudio allows trailing slashes in targets).

---

## Supported Formats

### 1. CSV

**Platforms:** Shopify, HubSpot, WordPress (Redirection plugin), manual exports

#### Column Name Variations

| Source Column   | Target Column | Status Column |
| --------------- | ------------- | ------------- |
| `source`        | `target`      | `status`      |
| `from`          | `to`          | `code`        |
| `old`           | `new`         | `statuscode`  |
| `redirect from` | `redirect to` |               |
| `original url`  | `target url`  |               |
| `original url`  | `destination` |               |

#### Shopify Format

```csv
Redirect from,Redirect to
/old-product,/new-product
/old-collection,/new-collection
```

- No status column (all redirects are 301)

#### HubSpot Format

```csv
Original URL,Target URL
/old-landing,/new-landing
/old-blog-post,/blog/new-post
```

- No status column (all redirects are 301)

#### Generic Format

```csv
source,target,status
/page1,/newpage1,301
/page2,/newpage2,302
/page3,/newpage3,permanent
/page4,/newpage4,temporary
```

---

### 2. JSON

**Platforms:** Vercel, Next.js, WordPress (Redirection plugin), custom exports

#### Vercel / Next.js Format

```json
{
  "redirects": [
    {
      "source": "/old-page",
      "destination": "/new-page",
      "permanent": true
    },
    {
      "source": "/temp-redirect",
      "destination": "/landing",
      "permanent": false
    }
  ]
}
```

#### Next.js with statusCode

```json
{
  "redirects": [
    {
      "source": "/old-page",
      "destination": "/new-page",
      "statusCode": 301
    }
  ]
}
```

#### Generic Array Format

```json
[
  { "from": "/old", "to": "/new", "status": 301 },
  { "source": "/a", "target": "/b", "code": 302 },
  { "old": "/x", "new": "/y" }
]
```

#### Key Name Variations

| Source Keys | Target Keys   | Status Keys        |
| ----------- | ------------- | ------------------ |
| `source`    | `destination` | `statusCode`       |
| `from`      | `target`      | `status`           |
| `old`       | `to`          | `code`             |
|             | `new`         | `permanent` (bool) |

---

### 3. Netlify `_redirects`

**Platform:** Netlify

#### Format

```
# Comment
/source /destination [status]
```

#### Examples

```
# Basic redirects
/old /new 301
/temp /landing 302

# No status (defaults to 301)
/about-us /about

# External URLs
/github https://github.com/example 301

# Force redirect (! is ignored)
/override /new 301!
```

---

### 4. Apache `.htaccess`

**Platforms:** Apache, cPanel, traditional hosting

#### Supported Directives

```apache
Redirect 301 /old-page /new-page
Redirect 302 /temp-page /landing
Redirect permanent /legacy /modern
Redirect temp /maintenance /coming-soon
Redirect /simple /destination  # defaults to 302
```

#### Case Insensitive

```apache
redirect 301 /lowercase /target
REDIRECT 301 /uppercase /target
```

---

## Status Code Handling

### Supported Codes

| Code | Meaning                     | Webstudio               |
| ---- | --------------------------- | ----------------------- |
| 301  | Permanent redirect          | ✅ `"301"`              |
| 302  | Temporary redirect          | ✅ `"302"`              |
| 307  | Temporary (preserve method) | ⚠️ Converted to `"302"` |
| 308  | Permanent (preserve method) | ⚠️ Converted to `"301"` |

### Text Status Values

| Text                      | Converted To |
| ------------------------- | ------------ |
| `permanent`               | `"301"`      |
| `temporary`               | `"302"`      |
| `true` (permanent field)  | `"301"`      |
| `false` (permanent field) | `"302"`      |

### Skipped Codes

| Code  | Reason                             |
| ----- | ---------------------------------- |
| 200   | Rewrite (proxy without URL change) |
| 404   | Not found                          |
| Other | Invalid redirect status            |

---

## Unsupported Features

These patterns are **skipped with a warning** (not imported):

### Dynamic Placeholders

```
/blog/:slug → /posts/:slug
/news/:year/:month/:slug → /archive/:year-:month-:slug
```

### Splat Wildcards

```
/docs/* → /documentation/:splat
/old/* → /new/*
```

### Conditions

```
# Netlify
/ /en 302 Country=us
/admin /login 302 Role=admin

# Vercel/Next.js
{
  "source": "/",
  "has": [{ "type": "header", "key": "x-country", "value": "DE" }],
  "destination": "/de"
}
```

### Query Parameter Matching

```
/store id=:id → /products/:id
```

### Apache Regex Rules

```apache
RedirectMatch ^/blog/(.*)$ /posts/$1
RewriteRule ^old/(.*)$ /new/$1 [R=301,L]
```

---

## User Documentation

_This section contains user-friendly copy for the Import dialog and help content._

### Supported File Formats

**CSV** — Spreadsheet exports from Shopify, HubSpot, WordPress, or any custom CSV with columns for source path, target path, and optional status code.

**JSON** — Configuration exports from Vercel, Next.js, or any JSON array of redirect objects.

**Netlify \_redirects** — The `_redirects` file format used by Netlify hosting.

**Apache .htaccess** — Redirect directives from Apache server configuration files.

### How It Works

1. Upload or paste your redirect file
2. We automatically detect the format
3. Review the parsed redirects before importing
4. Choose to add to or replace your existing redirects

### Supported Routing Patterns

Webstudio supports these path patterns in redirects:

| Pattern    | Example   | Matches                               |
| ---------- | --------- | ------------------------------------- |
| Exact path | `/about`  | Only `/about`                         |
| Wildcard   | `/blog/*` | `/blog/post`, `/blog/2024/post`, etc. |
| Segment    | `/:slug`  | `/anything` (single segment)          |
| Optional   | `/:id?`   | `/` or `/123`                         |

**Important:** Captured values (like `:slug`) cannot be inserted into the destination path. The destination is always a fixed path or URL.

### What Gets Imported

✅ **Imported:**

- Simple path-to-path redirects (`/old` → `/new`)
- Redirects to external URLs (`/github` → `https://github.com/...`)
- 301 (permanent) and 302 (temporary) status codes
- 307 and 308 status codes (converted to 302 and 301)

### What Gets Skipped

⚠️ **Skipped (with explanation):**

- Dynamic placeholders like `/blog/:slug` → `/posts/:slug`
- Wildcard substitutions like `/old/*` → `/new/*`
- Conditional redirects (country, header, cookie-based)
- Query parameter matching
- Regex-based rules (Apache RewriteRule, RedirectMatch)
- Rewrites (status 200) and "not found" rules (status 404)

### Limitations vs. Other Platforms

Webstudio redirects are designed for simplicity and performance. Some advanced features from other platforms are not supported:

| Feature                  | Netlify | Vercel | Apache | Webstudio |
| ------------------------ | ------- | ------ | ------ | --------- |
| Simple redirects         | ✅      | ✅     | ✅     | ✅        |
| External URLs            | ✅      | ✅     | ✅     | ✅        |
| Wildcard source          | ✅      | ✅     | ✅     | ✅        |
| Wildcard substitution    | ✅      | ✅     | ✅     | ❌        |
| Regex patterns           | ❌      | ❌     | ✅     | ❌        |
| Header/cookie conditions | ✅      | ✅     | ✅     | ❌        |
| Geo/country conditions   | ✅      | ✅     | ❌     | ❌        |
| Query string matching    | ✅      | ✅     | ✅     | ❌        |
| Rewrites (proxy)         | ✅      | ✅     | ✅     | ❌        |

### Status Codes Explained

| Code | Name      | When to Use                                          |
| ---- | --------- | ---------------------------------------------------- |
| 301  | Permanent | Page has moved forever. SEO transfers to new URL.    |
| 302  | Temporary | Page is temporarily elsewhere. SEO stays at old URL. |

---

## Auto-Detection Priority

The parser detects formats in this order:

1. **JSON** - Content starts with `[` or `{`
2. **CSV** - First line contains known column headers
3. **htaccess** - Any line starts with `Redirect` (case-insensitive)
4. **Netlify** - Lines match pattern `/path /path [status]`

---

## UI Plan

### Location

Add an "Import" button next to the "Redirects" title in `section-redirects.tsx`.

```
┌─────────────────────────────────────────────────────────────┐
│  Redirects  ℹ️                              [Import]        │
│  Redirect old URLs to new ones...                           │
└─────────────────────────────────────────────────────────────┘
```

### Import Dialog

When clicking "Import", open a dialog with:

```
┌─────────────────────────────────────────────────────────────┐
│  Import Redirects                                      [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Paste or drop a file containing redirects.                 │
│  Supports: CSV, JSON, Netlify _redirects, Apache .htaccess  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │     [Upload File]  or drag & drop here              │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ── OR ──                                                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Paste content here...                               │    │
│  │                                                     │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│                                          [Cancel] [Parse]   │
└─────────────────────────────────────────────────────────────┘
```

### Preview State

After parsing, show a preview before importing:

```
┌─────────────────────────────────────────────────────────────┐
│  Import Redirects                                      [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✓ Found 47 redirects                                       │
│  ⚠ 3 lines skipped (see below)                              │
│                                                             │
│  Preview:                                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  /old-page        301  →  /new-page                 │    │
│  │  /about-us        301  →  /about                    │    │
│  │  /blog/post-1     302  →  /posts/1                  │    │
│  │  ... (44 more)                                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Skipped:                                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Line 5: /docs/* → wildcard patterns not supported  │    │
│  │  Line 8: /:slug → placeholders not supported        │    │
│  │  Line 12: missing target path                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ○ Add to existing redirects                                │
│  ○ Replace all redirects                                    │
│                                                             │
│                                        [Back] [Import 47]   │
└─────────────────────────────────────────────────────────────┘
```

### Conflict Handling

If importing redirects that already exist:

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠ 5 redirects have the same source path as existing ones  │
│                                                             │
│  ○ Skip duplicates (import 42 new)                          │
│  ○ Overwrite existing (update 5, import 42 new)             │
└─────────────────────────────────────────────────────────────┘
```

### Component Structure

```
section-redirects.tsx
├── ImportButton                    # Opens the dialog
└── ImportRedirectsDialog           # The dialog component
    ├── InputStep                   # File upload / paste textarea
    │   ├── DropZone               # Drag & drop file area
    │   ├── FileInput              # Hidden file input
    │   └── TextArea               # Paste content
    ├── PreviewStep                 # Shows parsed results
    │   ├── SuccessSummary         # "Found X redirects"
    │   ├── RedirectPreviewList    # Scrollable list of redirects
    │   ├── SkippedList            # Collapsed/expandable skipped items
    │   └── MergeOptions           # Radio: add vs replace
    └── useImportRedirects          # Hook managing dialog state
```

### State Machine

```
                    ┌──────────┐
                    │  CLOSED  │
                    └────┬─────┘
                         │ open
                         ▼
                    ┌──────────┐
              ┌─────│  INPUT   │◄────────┐
              │     └────┬─────┘         │
              │          │ parse         │ back
              │          ▼               │
              │     ┌──────────┐         │
              │     │ PARSING  │         │
              │     └────┬─────┘         │
              │          │               │
              │     ┌────┴────┐          │
              │     ▼         ▼          │
              │ ┌───────┐ ┌─────────┐    │
              │ │ ERROR │ │ PREVIEW │────┘
              │ └───┬───┘ └────┬────┘
              │     │          │ import
              │     │          ▼
              │     │     ┌──────────┐
              │     │     │ IMPORTED │
              │     │     └────┬─────┘
              │     │          │
              └─────┴──────────┘
                         │ close
                         ▼
                    ┌──────────┐
                    │  CLOSED  │
                    └──────────┘
```

### Design System Components

From `@webstudio-is/design-system`:

- `Dialog`, `DialogContent`, `DialogTitle`, `DialogClose`
- `Button`, `Text`, `Flex`, `Grid`, `Box`
- `TextArea` (for paste input)
- `RadioGroup` (for merge options)
- `ScrollArea` (for preview list)
- `PanelBanner` (for warnings/errors)

### Acceptance Criteria

1. **File Upload**: Accept `.csv`, `.json`, `.txt`, `.htaccess` files
2. **Drag & Drop**: Support dropping files onto the dialog
3. **Paste**: Support pasting content directly
4. **Auto-detect**: Automatically detect format from content
5. **Preview**: Show parsed redirects before importing
6. **Skipped Feedback**: Show why lines were skipped with line numbers
7. **Merge Options**: Let user choose add vs replace
8. **Duplicate Handling**: Detect and handle conflicts with existing redirects
9. **Validation**: Run Webstudio's `OldPagePath` validation on import
10. **Toast Feedback**: Show success/error toast after import
