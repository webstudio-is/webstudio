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

For an MDX-backed article, use the query resource to select the Content Block's
source Asset, for example `post.data.id`. Inside the block, bind article fields
to the block's document parameter, not `post.data.properties.title` or other
equivalent query-result values. A query binding can display the correct value
without supporting Content-mode edits.

The MDX body is editable through its source mapping. Designer-created elements
outside that body, such as an article header, stay protected unless their text
or supported props have writable frontmatter bindings. Containment in the
Content Block alone is not enough. Use `update-text` with
`expressionBindingMode:"readwrite"` for a designed heading's text, and
`bind-props` with `binding.mode:"readwrite"` for a supported prop. These target
persistent designed instances, not MDX-generated instances.

Use direct paths for writable bindings, such as
`document.frontmatter.title`; property access is already safe. Adding `??`
fallbacks or formatting makes the expression read-only. Direct bindings through
loaded Markdown or MDX `$ref` values ending in `#frontmatter` save to the
referenced file, with its write permissions enforced. For example, editing
`document.frontmatter.author.name` updates the shared author file, affecting
every article using it while preserving the article's reference. JSON/body
references and resolved image metadata remain read-only.

### Keep editable values separate from formatting

When a field must be editable in Content mode, do not concatenate its value
with labels, units, or punctuation, or wrap it in a template literal, fallback,
or formatting call. Keep the value in its own text element with one direct
read-write binding. Put the fixed prefix and suffix in separate sibling text
elements. Do not mix literal and expression children in the value element.

For example, display reading time as three inline siblings: fixed `— `,
an element bound to `document.frontmatter.readingTime`, and fixed ` min read`.
Set `expressionBindingMode:"readwrite"` on the middle element with `update-text`.
The number remains editable while the surrounding wording stays protected.
Preserve spacing and the field's stored type. For dates, prefer a Date Time
component with its date prop bound directly and formatting configured separately.

Do not silently choose a read-only expression to achieve the requested display.
If a required transformation has no editable presentation, explain the limitation
and ask before making that field read-only. This does not extend the supported
write targets or override permissions.

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
