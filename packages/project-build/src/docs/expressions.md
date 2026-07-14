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

Do not send a fixed prop string as an expression. Use `update-props` with
`type:"string"`. Page metadata and resource URLs accept plain fixed strings and
normalize them for storage. Expression-only resource headers, search parameters,
and bodies accept `{ "type": "literal", "value": "fixed text" }` when the
value is not dynamic.

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
validated when a mutation is submitted, but an identifier that is unavailable
at the final render scope may require preview verification to detect.

## Supported Syntax

Expressions support literals, arrays, objects, property and index access,
optional chaining, unary and arithmetic operators, comparisons, logical
operators, nullish coalescing, ternaries, and template literals.

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
- Safe nested access: `post.author?.name ?? "Unknown author"`

## Collections

Whenever an array or object should render repeated UI, insert `ws:collection`
with `insert-component` and bind its `data` prop to the complete iterable. Do
not bind the response wrapper or one indexed item. Collection renders its child
structure once per entry. Bind descendants with expressions such as
`collectionItem.name`; for object iteration, `collectionItemKey` contains the
current key. See `components.get {"component":"ws:collection"}` for the
complete workflow.

## Verification

After changing expressions, preview the affected page and verify representative
data, empty/null data, and Collection item counts. Use `audit` for relevant
structural findings, but do not treat a successful syntax parse as proof that
runtime data has the expected shape.
