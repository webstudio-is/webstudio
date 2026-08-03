---
description: Display quotations with the Blockquote component in Webstudio.
---

# 💬 Blockquote

> See [MDN: \<blockquote\>](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/blockquote)

{% embed url="https://www.youtube.com/watch?v=reVman0DMWM" %}

The Blockquote Component is used to highlight quoted content on a webpage, enhancing its impact and readability. You can use it in your Webstudio project to emphasize text that has been taken directly from another source, such as quotes, excerpts, or references.

---

### How to use the Blockquote Component

The "Blockquote" component can be found in Components > Text, and you can place it on your canvas by dragging and dropping it or clicking it in the Components panel. To edit the content of your Blockquote instance, simply double-click it.

Once the component is placed on your canvas, you can customize its appearance using the Style panel on the right. You can also create a design token for this styling. This allows you to apply consistent styling on multiple blockquotes across your project by reusing the same design token for each instance.

For more on Design tokens in Webstudio, refer to [this guide](../foundations/design-tokens.md).

### Styling a Blockquote

By default, Blockquote components include padding on the left and right, along with a left border. You can customize these in the Style panel:

- **Border**: Adjust the border width and color under Border settings to match your brand
- **Padding**: Modify the default padding to adjust spacing around your quote text

When using a Cite tag inside your blockquote, you may want to change its display property from "inline" to "block" to position the citation on its own line below the quote.

---

### How to attribute a Blockquote

It is a good practice to attribute the quoted text you use in a blockquote with the source's title, author, publication, URL, or any relevant information that identifies where the quote came from. This maintains transparency and credibility in your content. It also allows readers to verify the accuracy of the information and fosters ethical use of others' words.

You can add an attribution or citation by using the “Cite” property in your Blockquote instance settings or with the “Cite” Tag from a Text component.

#### Using the "Cite" Property

<figure><img src="../../.gitbook/assets/blockquote-cite-property.avif" alt=""><figcaption></figcaption></figure>

If you want to include a URL link as a citation:

1. Choose your blockquote instance in the canvas or the Navigator.
2. Go to Settings > Properties on the right.
3. Add the URL in the "Cite" property.

Please note that this value will not be visible to the end-user.

#### Using the “Cite” Tag

<figure><img src="../../.gitbook/assets/blockquote-cite-tag.avif" alt=""><figcaption></figcaption></figure>

If you want to include a Name/Title as a citation alongside your Blockquote:

1. Add a Text component to your Blockquote instance by dragging and dropping it or clicking it in the Components panel.
2. After positioning it correctly, go to Settings and select Tag > Cite.
3. Double-click the "Cite" instance on your canvas to edit it and add your citation.

Please note that this value will appear as italicized text to the end-user.

## Related

- [Paragraph](paragraph.md) – Standard text paragraphs
- [Text](text.md) – Inline text styling
- [Heading](heading.md) – Section headings
