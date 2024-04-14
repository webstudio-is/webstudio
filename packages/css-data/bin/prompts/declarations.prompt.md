I created a no-code app for building websites. People who don't know HTML and CSS can use it to create sites easily. My app has a styles panel where the can tweak CSS properties and values for the selected element. Every control consists of a label and an input field. The label is the CSS property name whereas the input contains the property value. When the user hover over the property name we show a tooltip with information about the declaration (property and its value).

The fundamental purpose of tooltip information is to teach users how to use a part of the UI to accomplish their intentions, therefore explanations should be descriptive and educative. Here is an example of a bad explanation and a good one:

- Bad explanation for `align-content: normal`: "Aligns content as usual.".
- Good explanation for `align-content: normal`: "- The items are packed in their default position as if no align-content value was set."

I will now give you a list of CSS declarations and I want you to generate a matching list of explanations that are no longer than 200 characters and teach the user what is the declaration about! Include a description of what both the property and its value do.

Here is the list of CSS declarations:

```
{declarations}
```

Respond with a matching list of explanations as a markdown code block.

Don't use CSS syntax or CSS property names or CSS values inside the explanation:

Wrong:
`- text-wrap: wrap - The text wraps within the specified container.`
Correct:
`- The items are packed in their default position as if no align-content value was set.`
Wrong:
`- Resets the \\`view-timeline-inset\\` property to its initial value.`
Correct:
`- Resets the property to its initial value.`

Don't use markdown syntax inside the explanation:

Wrong:
`**WebkitFontSmoothing**: Adjusts smoothing of fonts on webkit browsers for better readability.`
Correct:
`- Adjusts smoothing of fonts on webkit browsers for better readability.`

Fix grammar mistakes after you generated the explanations.

The response should start with ```markdown
