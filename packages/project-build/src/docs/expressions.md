# Webstudio Expressions

Use an expression only when a value must be computed at runtime from scoped
data. Use direct text and direct prop values for fixed content.

## Source Format

Expression-capable MCP fields receive JavaScript expression source as a JSON
string. Send one expression, without a `return` statement or surrounding
function. For example:

```json
{ "binding": { "type": "expression", "value": "post.title ?? \"Untitled\"" } }
```

Inside that string, use readable JavaScript syntax rather than serialized JSON.
For object expressions, leave identifier property names unquoted, for example
`{ query: queryText, variables: { slug: system.params.slug } }`. Quote a property
name only when JavaScript requires it, such as `{ "published-at": date }`. Do
not pass a JSON-stringified object as an expression.

Do not send a fixed prop string as an expression. Use `update-props` with
`type:"string"`. Page metadata and resource URLs accept plain fixed strings and
normalize them for storage. Expression-only resource headers, search parameters,
and bodies accept `{ "type": "literal", "value": "fixed text" }` when the
value is not dynamic.

## Read and read-write bindings

Expression bindings use `mode:"read"` by default. Use `mode:"readwrite"` only
for an exact direct path into the frontmatter of an MDX source connected to the
containing Content Block, for example:

```json
{
  "binding": {
    "type": "expression",
    "value": "document.frontmatter.title",
    "mode": "readwrite"
  }
}
```

This lets Content mode save a direct edit back to that frontmatter field.
Computed expressions, including fallbacks and concatenation, are always
read-only. The mutation is rejected when the expression is not a direct path or
does not belong to a connected Content Block document. Use the variable name
returned by `inspect-instance`; do not assume it is `document`.

## Scope

- Data variables are available on their scope instance and descendants.
- An inner variable with the same name masks the outer variable.
- A scoped resource result is a variable. Read its payload from its result
  wrapper, usually `resourceName.data`; APIs may nest the desired value deeper.
- Collection creates internal `collectionItem` and `collectionItemKey`
  parameters. They are available only to that Collection's descendants.
  Preserve those generated parameters and do not reuse encoded parameter ids
  copied from another Collection.
- Array Collection iteration exposes the current item. Object iteration exposes
  the current key and value.
- The built-in `system` context is available only where supplied by the runtime.
  Its documented fields are `system.origin`, `system.pathname`, `system.params`,
  and `system.search`. There is no `system.path`.
- Actions expose only their declared arguments, such as `event`, plus data that
  is in scope.

Read `list-variables`, `list-resources`, `inspect-instance`, and existing
bindings before writing an expression. Do not guess identifier names. Syntax is
validated when a mutation is submitted. A valid expression that references an
identifier unavailable in that scope is accepted with a structured warning
containing the field path, source range, affected record, and remediation.

## Supported Syntax

Expressions support literals, arrays, objects, property and index access, unary
and arithmetic operators, comparisons, logical operators, nullish coalescing,
ternaries, and template literals.

Webstudio automatically makes property and index access safe when an
intermediate value is missing. Write direct access such as `post.author.name`.
Use nullish coalescing when the expression needs a fallback value.

Supported string methods:

{{allowedStringMethods}}

Supported array methods:

{{allowedArrayMethods}}

Other values support `toString`. Arbitrary global functions and arbitrary
method calls are not supported.

## Unsupported Syntax

Do not use statements, declarations, functions, arrow functions, classes,
`new`, `this`, `await`, imports, tagged templates, sequence expressions,
increment/decrement, or destructuring assignment. Assignment is allowed only
inside actions. Use an explicit assignment there rather than `++` or `--`.

## Common Examples

- Text: `post.title ?? "Untitled"`
- Prop: `post.url`
- Nested API array for Collection: `posts.data.items`
- Resource URL: `"https://api.example.com/posts?tag=" + filters.tag`
- Header: `"Bearer " + auth.token`
- Search parameter: `String(filters.page ?? 1)` is not supported because global
  function calls are forbidden; use `(filters.page ?? 1).toString()` instead.
- Resource body: `{ query: queryText, variables: { slug: system.params.slug } }`
- Conditional: `featured ? "Featured" : "Standard"`
- Nested access with a fallback: `post.author.name ?? "Unknown author"`

## Collections

Whenever an array or object should render repeated UI, call `insert-collection`
with the complete iterable and one repeated-item JSX root. Do not pass the
response wrapper or one indexed item. The command creates the Collection and
its private item parameters atomically, then renders the item root once per
entry. Bind descendants with expressions such as `collectionItem.name`; for
object iteration, `collectionItemKey` contains the current key. Wrap multiple
repeated siblings in one lowercase HTML root such as `<div>`.

## Verification

Inspect every returned expression warning. Correct warnings that indicate a
misspelled or unavailable variable, then run `verify-bindings` for persisted
syntax, scope, and reference integrity. A warning does not roll back the
mutation, and successful static verification does not prove runtime data has
the expected shape. `verify-bindings` never executes external resources or
resolves rendered values. Preview representative data, empty/null data, and
Collection item counts; use `audit` for relevant structural findings.
