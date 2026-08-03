---
description: >-
  Content Block designates regions on the page where pre-styled instances can be
  inserted in Content mode.
icon: pen-to-square
---

# Content Block

[Content _mode_](../foundations/modes.md#content) enables editing existing content only inside Content Blocks. Content outside a Content Block is read-only for editors. Content Blocks also let editors add _new_ content.

Content Block enables adding new content — not just any content, but specifically inserting new instances predefined in Templates.

Designers can create a library of templates, from little cards to fully built sections, and editors can insert instances of these pre-styled templates and modify their content.

Next is a breakdown of Content Block by mode:

1. [Design mode](content-block.md#design-mode) ⬇️
2. [Content mode](content-block.md#content-mode) ⬇️

## Content Block in Design mode

Sometimes providing team members or clients the ability to edit existing content doesn’t help them accomplish everything they need.

Instead, they may want to add new content without asking you.

Content Block enables you to define regions on the site where editors can add instances of templates that you create.

Next is how to use it.

### Step 1: Add Content Block

Add the Content Block to the various regions you want editors to insert new content.

For example, you can add it to a place on the page where entirely new sections can be added, or you can add it within a section for them to add additional content to.

### Step 2: Add templates

Notice that the child of Content Block is Templates.&#x20;

Drag/build the various instances you want to provide editors here.

For example, your client wants to update the section under the hero with the latest promotion. Sometimes the promotion is for an event while other times it’s a product. You can create those two designs, add them to “Templates” within Editable Block, and your client can insert instances of the desired template and edit its content.

{% hint style="info" %}
Editors don’t have access to the Style Panel, so be sure to provide fully designed templates.
{% endhint %}

Every top-level instance within Templates will appear in Content mode like this:

<div><figure><img src="../../.gitbook/assets/templates-design-mode.png" alt="Templates in Design mode"><figcaption><p>Templates in Design mode</p></figcaption></figure> <figure><img src="../../.gitbook/assets/templates-content-mode.png" alt="Template in Content mode"><figcaption><p>Template in Content mode</p></figcaption></figure></div>

Each time they insert a template, its copy appears as a direct child of the Content Block, alongside any initial content. The Templates container remains protected source material.

### Step 3: Add an initial setup (optional)

Optionally, you can add instances as direct children of Content Block.

<figure><img src="../../.gitbook/assets/startingpoint-content-block.png" alt="" width="357"><figcaption><p>The "Feature" instances are provided as a starting point</p></figcaption></figure>

Doing so will provide an initial setup for editors.

Editors can delete direct children of the Content Block. They cannot delete the Templates container, templates, or nested instances independently.

## Content Block in Content mode

In [Content mode](../foundations/modes.md#content), you can edit existing content inside Content Blocks. But what if you want to add _new_ content?

You can within Editable Block — region(s) on the page the designer designates as a place you can add new content from building blocks to entire sections.

For example, on your homepage, you change out promotions. Sometimes they are events, and other times they are products. The designer can add the Editable Block to that section on your homepage and provide you with an “Events template” and “Products template”. You can then insert instances of each template, delete them, and change out their content. The design is fully provided for you.

Next is how to use it.

### Step 1: Locate the region you want to change

On the left-hand side, there is the navigator showing you the various Content Blocks on the page.

<figure><img src="../../.gitbook/assets/content-blocks-navigator.png" alt="Content Blocks in the navigator"><figcaption></figcaption></figure>

You can click on them to navigate to that part of the page.

### Step 2: Add template instances

Each Content Block can have a unique set of templates you can choose from.

On the canvas, hover where you want to insert, and the blue + button will appear. Click that, and you’ll see a list of templates provided by the designer.

<figure><img src="../../.gitbook/assets/templates-content-mode.png" alt=""><figcaption><p>Templates the designer provided</p></figcaption></figure>

Select the one you want, and it’ll insert an instance/copy of that template.

Click into it to make changes. See more about editing content in [Content mode](../foundations/modes.md#for-editors).

### Step 3: Delete instances

You can delete a direct child of the Content Block in one of two ways:

1. The blue + button will turn into a red delete button if you hold the option/alt key on your keyboard.
2. Select the instance in the navigator, and press delete/backspace on your keyboard.

   <figure><img src="../../.gitbook/assets/delete-instance-content-mode.gif" alt="plus button changing to delete when holding option/alt"><figcaption><p>Hold option/alt</p></figcaption></figure>

{% hint style="success" %}
You can’t delete the template itself, so you can always add it back.
{% endhint %}

Beyond adding new content, you can edit the existing content inside the Content Block. See [Content mode](../foundations/modes.md#content) for more information.

## Related

- [Slot](slot.md) – Reusable component slots
- [Modes](../foundations/modes.md) – Builder modes including Content mode
- [Collection](collection.md) – Iterate over dynamic data
