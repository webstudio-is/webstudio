# Content engine

The content engine compiles file-based Assets into a portable query database.
JSON and Markdown documents can reference other Assets without embedding their
complete source in that database.

## Document references

A reference is an object with exactly one `$ref` property whose value is a URI
reference:

```json
{
  "author": { "$ref": "./authors/ada.json" }
}
```

References can appear at any depth in a JSON document. In Markdown, references
can appear at any depth in YAML frontmatter:

```markdown
---
title: Building with Markdown
author:
  $ref: ./authors/ada.json
---

Article body.
```

An object with additional properties is ordinary content, not a reference.
The `$ref` spelling is familiar from JSON Schema, but this syntax does not
implement JSON Schema resolution, identifiers, anchors, or schema evaluation.

Reference paths use standard URI-reference resolution relative to the source
document. The fragment selects which representation of the target to insert:

| Reference                     | Selected target value                           |
| ----------------------------- | ----------------------------------------------- |
| `./author.json`               | Complete JSON value                             |
| `./author.json#/profile/name` | Value at the JSON Pointer `/profile/name`       |
| `./article.md`                | Original Markdown source, including frontmatter |
| `./article.md#body`           | Markdown body without frontmatter               |
| `./article.md#frontmatter`    | Markdown frontmatter as an object               |

JSON Pointer escaping follows RFC 6901. For example, `#/a~1b` selects the
property named `a/b`. JSON Pointer fragments apply only to JSON documents;
`#body` and `#frontmatter` apply only to Markdown documents.

Authored URLs identify Assets during compilation. They do not permit arbitrary
runtime network requests. Every target must match a document in the compiled
Asset catalog.

## Resolution behavior

At build time, the content engine:

1. Parses bounded JSON sources and Markdown frontmatter.
2. Resolves each static URI reference to a document identity and revision.
3. Rejects missing targets, duplicate identities, revision conflicts, and
   dependency cycles.
4. Stores the validated dependency graph with searchable metadata while source
   payloads remain in Asset storage.

At runtime, the server selects the roots returned by the Assets query and
computes their complete dependency closure before loading source data. It then
loads independent documents concurrently, loads shared storage content once,
validates revisions and payload limits, and assembles dependencies before their
consumers. A resolved value replaces its exact `{ "$ref": "..." }` marker.

Only properties selected by the Assets query are returned. Resolution cannot
expose an unselected property merely because it exists in a fetched document.
Whole-document and Markdown-body content selection continue to use the query's
content options.

Document source caches are revision-keyed, so content from one revision cannot
be combined silently with graph metadata from another revision. Resolution is
also bounded by document-count, per-document byte, aggregate-byte, and
concurrency limits. A missing document, invalid representation, stale revision,
limit violation, or cancellation fails the query instead of returning a
partially assembled graph.

Assets without a document graph keep the existing embedded-content behavior
and do not require migration.
