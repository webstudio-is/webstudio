---
description: >-
  Design tokens enable the creation of consistent designs by packaging up
  multiple styles so that on any instance you add that Token, those styles will
  show up and stay in sync.
---

# 🖌️ Design tokens

{% embed url="https://youtu.be/O8XNB2_JfaQ" %}

## Why Tokens instead of classes? <a href="#introduction" id="introduction"></a>

If you’ve ever made a website with CSS or with Webflow, you’ve used “classes” to manage your website’s layout and visual styles. Sometimes we love classes. They give us a way to re-use styles which saves us valuable time. However, they have some limitations that make classes very frustrating to use in the context of visual development tools.

Scenario: You’re building a website with Webflow. You have two separate elements, a button, and a card, and you want to give them the same box shadow. Buttons and cards have unique styles so they each already have a unique class. What do you do?

- A: Manually configure the box shadow on the existing Button and Card classes individually. With this option you’re doing the same thing twice. It would save time if we could reuse the box shadow styles.
- B: Apply the Box Shadow class on top of the existing Button and Card classes, making a combo class. Now you can’t edit the styles on Button or Card without first removing the Box Shadow class. Don’t forget to re-apply it! And good luck managing the classes on a different breakpoint. To edit the Button or Card classes you must first remove the Box Shadow combo class, then Webflow will kick you back to the desktop breakpoint, then you select the intended breakpoint again, then make your style changes, then re-apply the combo class. Experienced Webflowers know the pain.

There’s a better way. It’s Design tokens.

## What are Design tokens? <a href="#what-are-design-tokens" id="what-are-design-tokens"></a>

Design tokens are everything that you wish classes would be - a way to reuse styles without limitations.

- **Mix-and-match Tokens freely**: You can apply as many Tokens as you want to an instance in any order. There is no combo class silliness and no limitations with breakpoints.
- **Universal format:** We didn’t invent Design tokens. There is an independent spec (by the [Design Tokens Community Group](https://design-tokens.github.io/community-group/format/)) that defines a data format for Tokens, meaning you can potentially import and export tokens between multiple apps. Soon you’ll be able to sync tokens between Webstudio and Figma through the [Tokens Studio for Figma](https://tokens.studio/) plugin!

## Import design tokens

Webstudio can import token data from the
[Design Tokens Community Group format](https://design-tokens.github.io/community-group/format/)
and Figma Variables API exports. Copy the JSON document, then paste it into the
Builder. Webstudio detects supported token documents and asks how to represent
them:

- **Design tokens** creates reusable style tokens for composite and
  unambiguous style values. Other primitive values become CSS variables.
- **CSS variables** imports the values as custom properties for use in
  individual styles.

The importer resolves aliases and supports Figma modes and DTCG composite
values such as borders, shadows, gradients, transitions, and typography. CLI
and MCP integrations can additionally select modes, import every mode with
qualified names, map token types to style properties, and apply a prefix or
breakpoint.

If an imported name conflicts with an existing token, choose how to continue:

- **Theirs** keeps the imported token under a name with a numeric suffix.
- **Ours** skips the incoming token and keeps the Project token.
- **Merge** writes incoming styles into the existing token, with incoming
  values taking priority.

Review imported tokens and CSS variables before applying them throughout the
Project, especially when the source contains multiple modes or aliases.

## How to use tokens <a href="#how-to-use-tokens-in-webstudio" id="how-to-use-tokens-in-webstudio"></a>

The workflow for styling Tokens in Webstudio is nearly the same as styling classes in Webflow, except better.

First, it's recommended to create [CSS variables](css-variables.md) to use within the Tokens.

You can style your site using Local or Tokens like this:

<table data-header-hidden><thead><tr><th></th><th></th><th data-hidden></th></tr></thead><tbody><tr><td><img src="../../.gitbook/assets/style-sources.png" alt="Style sources" data-size="original"></td><td>The top of the Style Panel contains Style Sources. Here is where you can add new Tokens, select existing ones, and switch to Local styling.</td><td>The top section of the Style Panel is our <a href="https://www.reddit.com/r/diablo4/comments/148kfyt/psa_consolescontrollerbeginners_users/">Style Sources Input</a>. This is where you’ll create, style, and arrange your tokens.<br><br>When you select a component's instance on the canvas, the tokens you see inside this input are <em>sources</em> of the <em>styles</em> on that instance.</td></tr><tr><td><img src="../../.gitbook/assets/convert-to-token.png" alt="Convert local to token" data-size="original"></td><td>Want to style something immediately without making a Token? Use the Local Style Source. Styles applied on Local only impact that instance, but you can easily convert styles from Local to a new Token.</td><td>Want to style something immediately without making a token? Go for it. All component instances in Webstudio have this Local style source by default. Styles applied on Local are unique to an instance and can’t be re-used, but you can easily convert styles from Local to a new token through the token menu.</td></tr><tr><td><img src="../../.gitbook/assets/new-token.png" alt="Adding a new token" data-size="original"></td><td>To make a new Token, click inside the Style Sources input, type a name, and hit enter.</td><td>To make a new token, click inside the Style Sources Input, type a name, and hit ENTER/RETURN.</td></tr><tr><td><img src="../../.gitbook/assets/tokens-added.png" alt="Switching tokens" data-size="original"></td><td>The Token you’re currently styling will be blue in the Style Sources input, while others are gray. Simply click on another style source to select it. Any styling you do will be applied to the current Token and reflected across all instances of that Token.</td><td><p>The token you’re currently styling will be blue in the Style Sources Input, while others are gray. Simply click on another style source to select it.</p><p>Any styling you do will be applied to the current token and reflected across all instances of that token.</p><p>When you add a style, the label for that property will turn blue to show that it is applied on the current token.</p></td></tr><tr><td><img src="../../.gitbook/assets/property-label-tooltip.png" alt="" data-size="original"></td><td><p>Hover the label for a helpful description of where the styles on this property come from.</p><p>In this case, we see that the width value that we just applied is coming from the Base breakpoint, the “new token” token on the Body instance. See <a href="anatomy-of-the-webstudio-builder.md#label-colors">Label Colors</a> to understand what the different colors mean.</p></td><td><p>Hover the label for a helpful description of where the styles on this property come from.</p><p>In this case we see that the width value that we just applied is coming from the Base breakpoint, the “new token” token, on the Body instance.</p></td></tr><tr><td><img src="../../.gitbook/assets/empty-circle.png" alt="" data-size="original"></td><td>A circle in the Token indicates that there are no styles applied to the Token. This will go away as soon as you apply a style. For Local, a dot is added to the center of the circle when styles are added.</td><td></td></tr></tbody></table>

## Exporting human-readable classes

By default, Tokens are converted to atomic styles, significantly reducing the amount of CSS, ultimately leading to a faster-loading website.

While the majority of users aren't concerned with how the classes are output and should use atomic styles, they can be optionally disabled.

See [Atomic CSS](project-settings.md#atomic-css) for more info.

## Advanced Token Techniques

### Token Composition

Combine multiple tokens to create flexible, modular designs:

1. **Base token**: Contains core styles (e.g., "card" with padding, background, border-radius)
2. **Modifier tokens**: Contains variations (e.g., "small" for smaller padding, "featured" for highlight border)

Apply both to an instance: The styles merge, with later tokens overriding earlier ones for conflicting properties.

**Example:** A card system

- "card" token: padding, background, border-radius
- "card-small" token: smaller padding
- "card-featured" token: accent border color

Apply "card" + "card-featured" for a featured card variant.

### Token Priority (Cascading)

When multiple tokens define the same property, **the rightmost token wins**:

```
[card] [small] [featured]
       ↑        ↑
       │        └── Takes priority for any shared properties
       └── Overrides card for any shared properties
```

This allows you to build up styles modularly while maintaining precise control.

### Local Overrides

To override token styles for a specific instance:

1. Apply your tokens
2. Drag **Local** to the end (rightmost position)
3. Add your override styles on Local

Since Local is rightmost, its styles take priority over the tokens.

### Resetting Values

To remove a style from a specific token or Local:

1. Select the token in Style Sources
2. Hover over the property label
3. Click the reset icon (or use Option+click on Mac)

This removes the property from that specific token, allowing inherited values to show through.

### Duplicating Tokens

Create variations from existing tokens:

1. Select the token in Style Sources
2. Open the token menu (three dots)
3. Choose **Duplicate**
4. Rename and modify the duplicate

This is faster than creating tokens from scratch when building design systems.

### Token Conflict Resolution

When pasting content from another project or copying between pages, Webstudio intelligently handles token conflicts:

**Automatic Resolution**

- If a pasted token has the same name AND same styles as an existing token, they're automatically merged
- This prevents duplicate tokens when copying similar components

**Numeric Suffix**

- If a pasted token has the same name but different styles, a numeric suffix is added (e.g., "Button" becomes "Button-1")
- This preserves both your existing styles and the pasted styles

**Find Duplicate Tokens**
Use Commands & search (⌘+K) and search for "duplicate tokens" to find tokens with identical styles but different names. This helps clean up your token library.

## Related

- [States and selectors](states-and-selectors.md) – Style hover, focus, active states and pseudo-elements
- [CSS variables](css-variables.md) – Define reusable style values to use within Tokens
- [Anatomy of the Webstudio builder](anatomy-of-the-webstudio-builder.md) – Learn about the Style Panel and Style Sources
- [Project settings](project-settings.md) – Configure atomic CSS output
- [Commands & search](commands-and-search.md) – Quickly manage and search Tokens
