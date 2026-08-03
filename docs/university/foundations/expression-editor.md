---
description: >-
  Create logical expressions directly in the UI, enabling conditional display,
  fallback values, concatenation, and more.
---

# ➕ Expression editor

<figure><img src="../../.gitbook/assets/webstudio-expression-editor.png" alt=""><figcaption></figcaption></figure>

Expression editor is available on every field when clicking the “+” button.

Most commonly used with [Resources](variables.md#resource), Expression editor has two primary features:

1. Binding (or “connecting”) external data to Webstudio fields. For example, connecting a blog’s featured image that exists in a headless CMS to the Image component in Webstudio.
2. Running logical expressions such as concatenating two or more values or conditionally displaying a section.

{% hint style="info" %}
Hint: Expand Expression editor to work within a larger window.
{% endhint %}

## Binding

Binding is when you “connect” or “map” various values to fields within Webstudio. For example, when creating a Dynamic Page for a blog, only one page exists in Webstudio, but the values within that page dynamically change based on the URL viewed. The dynamic aspect is enabled by _binding_ the various CMS fields to Webstudio components.

You will see [Variables](variables.md) within the Expression editor. You can click on the variable or type it in to bind its value to the field. But many times, the value you are looking for is a child within the variable.

Take, for example, the value of a custom Variable called CMS Data:

```json
{
  "title": "Hello World",
  "slug": "hello-world",
  "image": {
    "url": "<https://example.com/image.png>",
    "alt": "I'm an image"
  }
}
```

If you wanted to bind the title of the post to a header component, you need to do more than click on the “CMS Data” Variable. You need to “drill down” or access the children of the variable. This is simply done by typing a `.` after the Variable, which will show the children in the autocomplete (i.e., title, slug, and image). For the title, you would enter `CMS Data.title`, and the value “Hello World” would display. When viewing a different post, that post’s title would display.

For the image URL, you would type `CMS Data.image.url` .

## Expressions

Expression editor supports a simple subset of JavaScript, giving users a simple syntax without the footguns a complex programming language brings.

The following JavaScript expressions are supported:

- [Ternary operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Conditional_operator) – Useful for conditions such as “If the image is in my CMS, display it, otherwise hide it.” The actual expression for this would look something like `CMS Data.image ? true : false` and be bound to the “Show” field.
- [Template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals) – Useful for inserting dynamic values inside templated text. For example, if you wanted to have “Updated On \<insert dynamic data>”, it would look like `` `Updated On ${CMS Data.updatedOn}` ``. Note the Expression starts and ends with backticks, and the dynamic values are within `${}`.
- [Expressions and operators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Expressions_and_Operators) – Useful for concatenating two values (alternative solution to template literals). For example, `"Updated on " + CMS Data.updatedOn`.
- Safe string methods: [at](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/at), [split](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/split), [replace](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace), [slice](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/slice), [startsWith](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith), [endsWith](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith), [includes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes), [toLowerCase](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/toLowerCase), [toUpperCase](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/toUpperCase), [toLocaleLowerCase](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/toLocaleLowerCase), [toLocaleUpperCase](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/toLocaleUpperCase)
- Safe array methods: [at](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/at), [includes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes), [join](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/join), [slice](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice)

## Example expressions

### Schema

You can create a schema and bind your [CMS](cms.md) data to it. The schema can go in the head or body. Add an [HTML Embed](../core-components/html-embed.md), create a binding, and use the following expression. Be sure to change out the schema type and variables with your data.

```javascript
`<script type="application/ld+json">
    {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "${YOUR.CMS.TITLE}",
  "image": [
    "${YOUR.CMS.LOGO_URL}"
  ],
  "datePublished": "${YOUR.CMS.PUBLISHED_DATE}",
  "dateModified": "${YOUR.CMS.MODIFIED_DATE}",
  "author": [
    {
      "@type": "Person",
      "name": "${YOUR.CMS.AUTHOR_NAME}",
      "url": "${YOUR.CMS.AUTHOR_URL}"
    }
  ]
}
</script>`;
```

### Conditional collection items

Sometimes we need to conditionally hide some records in a [Collection](../core-components/collection.md) based on some context. For example, below a blog post we can have related blog posts, but we wouldn’t want to show the _current_ blog post in there. To do so, create an expression on the Show property in Settings.

We need to turn this statement into code: “If the current page’s slug is the same as the current collection’s slug, then don’t show this post.”

Here is the expression. Be sure to modify it with your variables.

```javascript
system.params.slug === collectionItem.slug ? false : true;
```

Again, be sure to change `slug` to your dynamic path parameter and `collectionItem.slug` to your Collection variable and its data.

This expression will now show “false” meaning “turn this off” if the related blog post is actually the same as the current blog post.

## Related

- [Data variables](variables.md) – Define and use data throughout your pages
- [CMS](cms.md) – Connect to external content management systems
- [Dynamic 404 handling](cms.md#handling-dynamic-404s) – Return 404 when CMS data is missing on a dynamic page
- [Collection](../core-components/collection.md) – Iterate over data to create dynamic lists
- [HTML Embed](../core-components/html-embed.md) – Embed custom HTML and scripts
