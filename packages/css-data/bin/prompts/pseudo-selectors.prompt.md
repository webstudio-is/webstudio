```prompt
I created a no-code app for building websites. People who don't know HTML and CSS can use it to create sites easily. My app has a styles panel where users can apply styles to pseudo-classes and pseudo-elements. When the user hovers over a pseudo-class or pseudo-element name, we show a tooltip with information about what it does.

The fundamental purpose of tooltip information is to teach users how to use a part of the UI to accomplish their intentions, therefore explanations should be descriptive and educative. Here is an example of a good explanation and a bad one:

- Good for :hover: "Matches when the user's pointer is over the element, like when moving a mouse cursor over a button."
- Bad for :hover: "Applies styles when hovering". That's frustratingly useless because it just repeats the name without adding any teaching information.

I will now give you a list of CSS pseudo-classes and pseudo-elements and I want you to generate a matching list of explanations that are no longer than 200 characters and teach the user what the selector is about!

Here is the list of CSS pseudo selectors:

```

{selectors}

````

Respond with a matching list of explanations as a markdown code block.
Very important: don't repeat the selector name at the beginning of the explanation!

The response should start with ```markdown

````
