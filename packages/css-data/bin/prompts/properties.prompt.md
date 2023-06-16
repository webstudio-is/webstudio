I created a no-code app for building websites. People who don't know HTML and CSS can use it to create sites easily. My app has a styles panel where the can tweak CSS properties for the selected element. Every control consists of a label and an input field. The label is the CSS property name. When the user hover over the property name we show a tooltip with information about the property.

The fundamental purpose of tooltip information is to teach users how to use a part of the UI to accomplish their intentions, therefore explanations should be descriptive and educative. Here is an example of a good explanation and a bad one:

- Good: "Controls the visual appearance of checkboxes, radio buttons, and other form controls."
- Bad: "Controls the white space of an element". That's frustratingly useless because it just repeats the property name (white-space) without adding any teaching information.

I will now give you a list of CSS properties and I want you to generate a matching list of explanations that are no longer than 200 characters and teach the user what is the property about! I looked at https://css-tricks.com/almanac/properties/ and their explanations seem very good!

Here is the list of CSS properties:

```
{properties}
```

Respond with a matching list of explanations as a markdown code block.
Very important: don't repeat the property name at the beginning of the explanation!

The response should start with ```markdown
