import { expect, test } from "vitest";
import { expandShorthands } from "./shorthands";

test("ignore all shorthand to not bloat webstudio data", () => {
  expect(
    expandShorthands([
      ["all", "initial"],
      ["color", "red"],
    ])
  ).toEqual([["color", "red"]]);
});

test("expand border", () => {
  expect(expandShorthands([["border", "1px solid red"]])).toEqual([
    ["border-top-width", "1px"],
    ["border-right-width", "1px"],
    ["border-bottom-width", "1px"],
    ["border-left-width", "1px"],
    ["border-top-style", "solid"],
    ["border-right-style", "solid"],
    ["border-bottom-style", "solid"],
    ["border-left-style", "solid"],
    ["border-top-color", "red"],
    ["border-right-color", "red"],
    ["border-bottom-color", "red"],
    ["border-left-color", "red"],
  ]);
  // logical
  expect(expandShorthands([["border-inline", "1px solid red"]])).toEqual([
    ["border-inline-start-width", "1px"],
    ["border-inline-end-width", "1px"],
    ["border-inline-start-style", "solid"],
    ["border-inline-end-style", "solid"],
    ["border-inline-start-color", "red"],
    ["border-inline-end-color", "red"],
  ]);
  expect(expandShorthands([["border-block", "1px solid red"]])).toEqual([
    ["border-block-start-width", "1px"],
    ["border-block-end-width", "1px"],
    ["border-block-start-style", "solid"],
    ["border-block-end-style", "solid"],
    ["border-block-start-color", "red"],
    ["border-block-end-color", "red"],
  ]);
});

test("expand border with css-wide keywords", () => {
  expect(expandShorthands([["border", "INHERIT"]])).toEqual([
    ["border-top-width", "INHERIT"],
    ["border-right-width", "INHERIT"],
    ["border-bottom-width", "INHERIT"],
    ["border-left-width", "INHERIT"],
    ["border-top-style", "INHERIT"],
    ["border-right-style", "INHERIT"],
    ["border-bottom-style", "INHERIT"],
    ["border-left-style", "INHERIT"],
    ["border-top-color", "INHERIT"],
    ["border-right-color", "INHERIT"],
    ["border-bottom-color", "INHERIT"],
    ["border-left-color", "INHERIT"],
  ]);
});

test("expand border edges", () => {
  expect(expandShorthands([["border-top", "1px solid red"]])).toEqual([
    ["border-top-width", "1px"],
    ["border-top-style", "solid"],
    ["border-top-color", "red"],
  ]);
  expect(expandShorthands([["border-right", "1px solid red"]])).toEqual([
    ["border-right-width", "1px"],
    ["border-right-style", "solid"],
    ["border-right-color", "red"],
  ]);
  expect(expandShorthands([["border-bottom", "1px solid red"]])).toEqual([
    ["border-bottom-width", "1px"],
    ["border-bottom-style", "solid"],
    ["border-bottom-color", "red"],
  ]);
  expect(expandShorthands([["border-left", "1px solid red"]])).toEqual([
    ["border-left-width", "1px"],
    ["border-left-style", "solid"],
    ["border-left-color", "red"],
  ]);
  // logical
  expect(expandShorthands([["border-inline-start", "1px solid red"]])).toEqual([
    ["border-inline-start-width", "1px"],
    ["border-inline-start-style", "solid"],
    ["border-inline-start-color", "red"],
  ]);
  expect(expandShorthands([["border-inline-end", "1px solid red"]])).toEqual([
    ["border-inline-end-width", "1px"],
    ["border-inline-end-style", "solid"],
    ["border-inline-end-color", "red"],
  ]);
  expect(expandShorthands([["border-block-start", "1px solid red"]])).toEqual([
    ["border-block-start-width", "1px"],
    ["border-block-start-style", "solid"],
    ["border-block-start-color", "red"],
  ]);
  expect(expandShorthands([["border-block-end", "1px solid red"]])).toEqual([
    ["border-block-end-width", "1px"],
    ["border-block-end-style", "solid"],
    ["border-block-end-color", "red"],
  ]);
  // omit values
  expect(expandShorthands([["border-top", "1px"]])).toEqual([
    ["border-top-width", "1px"],
    ["border-top-style", "none"],
    ["border-top-color", "currentcolor"],
  ]);
  expect(expandShorthands([["border-top", "red"]])).toEqual([
    ["border-top-width", "medium"],
    ["border-top-style", "none"],
    ["border-top-color", "red"],
  ]);
});

test("expand border types", () => {
  expect(expandShorthands([["border-width", "1px"]])).toEqual([
    ["border-top-width", "1px"],
    ["border-right-width", "1px"],
    ["border-bottom-width", "1px"],
    ["border-left-width", "1px"],
  ]);
  expect(expandShorthands([["border-style", "solid"]])).toEqual([
    ["border-top-style", "solid"],
    ["border-right-style", "solid"],
    ["border-bottom-style", "solid"],
    ["border-left-style", "solid"],
  ]);
  expect(expandShorthands([["border-color", "red"]])).toEqual([
    ["border-top-color", "red"],
    ["border-right-color", "red"],
    ["border-bottom-color", "red"],
    ["border-left-color", "red"],
  ]);
  // logical
  expect(expandShorthands([["border-inline-width", "1px"]])).toEqual([
    ["border-inline-start-width", "1px"],
    ["border-inline-end-width", "1px"],
  ]);
  expect(expandShorthands([["border-block-width", "1px"]])).toEqual([
    ["border-block-start-width", "1px"],
    ["border-block-end-width", "1px"],
  ]);
  expect(expandShorthands([["border-inline-style", "solid"]])).toEqual([
    ["border-inline-start-style", "solid"],
    ["border-inline-end-style", "solid"],
  ]);
  expect(expandShorthands([["border-block-style", "solid"]])).toEqual([
    ["border-block-start-style", "solid"],
    ["border-block-end-style", "solid"],
  ]);
  expect(expandShorthands([["border-inline-color", "red"]])).toEqual([
    ["border-inline-start-color", "red"],
    ["border-inline-end-color", "red"],
  ]);
  expect(expandShorthands([["border-block-color", "red"]])).toEqual([
    ["border-block-start-color", "red"],
    ["border-block-end-color", "red"],
  ]);
});

test("expand border-radius", () => {
  expect(expandShorthands([["border-radius", "5px"]])).toEqual([
    ["border-top-left-radius", "5px"],
    ["border-top-right-radius", "5px"],
    ["border-bottom-right-radius", "5px"],
    ["border-bottom-left-radius", "5px"],
  ]);
  expect(expandShorthands([["border-radius", "1px 2px 3px 4px"]])).toEqual([
    ["border-top-left-radius", "1px"],
    ["border-top-right-radius", "2px"],
    ["border-bottom-right-radius", "3px"],
    ["border-bottom-left-radius", "4px"],
  ]);
  expect(expandShorthands([["border-radius", "5px / 3px"]])).toEqual([
    ["border-top-left-radius", "5px 3px"],
    ["border-top-right-radius", "5px 3px"],
    ["border-bottom-right-radius", "5px 3px"],
    ["border-bottom-left-radius", "5px 3px"],
  ]);
  expect(expandShorthands([["border-radius", "5px 2px / 3px 4px"]])).toEqual([
    ["border-top-left-radius", "5px 3px"],
    ["border-top-right-radius", "2px 4px"],
    ["border-bottom-right-radius", "5px 3px"],
    ["border-bottom-left-radius", "2px 4px"],
  ]);
});

test("expand border-radius with css-wide keywords", () => {
  expect(expandShorthands([["border-radius", "inherit"]])).toEqual([
    ["border-top-left-radius", "inherit"],
    ["border-top-right-radius", "inherit"],
    ["border-bottom-right-radius", "inherit"],
    ["border-bottom-left-radius", "inherit"],
  ]);
});

test("expand outline", () => {
  expect(expandShorthands([["outline", "1px solid red"]])).toEqual([
    ["outline-width", "1px"],
    ["outline-style", "solid"],
    ["outline-color", "red"],
  ]);
  expect(expandShorthands([["outline", "1px solid"]])).toEqual([
    ["outline-width", "1px"],
    ["outline-style", "solid"],
    ["outline-color", "currentcolor"],
  ]);
});

test("expand outline with css-wide keywords", () => {
  expect(expandShorthands([["outline", "inherit"]])).toEqual([
    ["outline-width", "inherit"],
    ["outline-style", "inherit"],
    ["outline-color", "inherit"],
  ]);
});

test("expand margin/padding", () => {
  expect(expandShorthands([["margin", "5px"]])).toEqual([
    ["margin-top", "5px"],
    ["margin-right", "5px"],
    ["margin-bottom", "5px"],
    ["margin-left", "5px"],
  ]);
  expect(expandShorthands([["margin", "1px 2px"]])).toEqual([
    ["margin-top", "1px"],
    ["margin-right", "2px"],
    ["margin-bottom", "1px"],
    ["margin-left", "2px"],
  ]);
  expect(expandShorthands([["margin", "1px 2px 3px"]])).toEqual([
    ["margin-top", "1px"],
    ["margin-right", "2px"],
    ["margin-bottom", "3px"],
    ["margin-left", "2px"],
  ]);
  expect(expandShorthands([["margin", "1px 2px 3px 4px"]])).toEqual([
    ["margin-top", "1px"],
    ["margin-right", "2px"],
    ["margin-bottom", "3px"],
    ["margin-left", "4px"],
  ]);
  expect(expandShorthands([["padding", "5px"]])).toEqual([
    ["padding-top", "5px"],
    ["padding-right", "5px"],
    ["padding-bottom", "5px"],
    ["padding-left", "5px"],
  ]);
  // logical
  expect(expandShorthands([["margin-inline", "5px"]])).toEqual([
    ["margin-inline-start", "5px"],
    ["margin-inline-end", "5px"],
  ]);
  expect(expandShorthands([["margin-inline", "1px 2px"]])).toEqual([
    ["margin-inline-start", "1px"],
    ["margin-inline-end", "2px"],
  ]);
  expect(expandShorthands([["margin-block", "5px"]])).toEqual([
    ["margin-block-start", "5px"],
    ["margin-block-end", "5px"],
  ]);
  expect(expandShorthands([["margin-block", "1px 2px"]])).toEqual([
    ["margin-block-start", "1px"],
    ["margin-block-end", "2px"],
  ]);
});

test("expand margin/padding with css-wide keywords", () => {
  expect(expandShorthands([["margin", "inherit"]])).toEqual([
    ["margin-top", "inherit"],
    ["margin-right", "inherit"],
    ["margin-bottom", "inherit"],
    ["margin-left", "inherit"],
  ]);
  expect(expandShorthands([["padding", "inherit"]])).toEqual([
    ["padding-top", "inherit"],
    ["padding-right", "inherit"],
    ["padding-bottom", "inherit"],
    ["padding-left", "inherit"],
  ]);
});

test("expand inset", () => {
  expect(expandShorthands([["inset", "5px"]])).toEqual([
    ["top", "5px"],
    ["right", "5px"],
    ["bottom", "5px"],
    ["left", "5px"],
  ]);
  expect(expandShorthands([["inset", "1px 2px"]])).toEqual([
    ["top", "1px"],
    ["right", "2px"],
    ["bottom", "1px"],
    ["left", "2px"],
  ]);
  expect(expandShorthands([["inset", "1px 2px 3px"]])).toEqual([
    ["top", "1px"],
    ["right", "2px"],
    ["bottom", "3px"],
    ["left", "2px"],
  ]);
  expect(expandShorthands([["inset", "1px 2px 3px 4px"]])).toEqual([
    ["top", "1px"],
    ["right", "2px"],
    ["bottom", "3px"],
    ["left", "4px"],
  ]);
  // logical
  expect(expandShorthands([["inset-inline", "5px"]])).toEqual([
    ["inset-inline-start", "5px"],
    ["inset-inline-end", "5px"],
  ]);
  expect(expandShorthands([["inset-inline", "1px 2px"]])).toEqual([
    ["inset-inline-start", "1px"],
    ["inset-inline-end", "2px"],
  ]);
  expect(expandShorthands([["inset-block", "5px"]])).toEqual([
    ["inset-block-start", "5px"],
    ["inset-block-end", "5px"],
  ]);
  expect(expandShorthands([["inset-block", "1px 2px"]])).toEqual([
    ["inset-block-start", "1px"],
    ["inset-block-end", "2px"],
  ]);
});

test("expand inset with css-wide keywords", () => {
  expect(expandShorthands([["inset", "inherit"]])).toEqual([
    ["top", "inherit"],
    ["right", "inherit"],
    ["bottom", "inherit"],
    ["left", "inherit"],
  ]);
});

test("expand gap and grid-gap", () => {
  expect(expandShorthands([["gap", "5px"]])).toEqual([
    ["row-gap", "5px"],
    ["column-gap", "5px"],
  ]);
  expect(expandShorthands([["gap", "1px 2px"]])).toEqual([
    ["row-gap", "1px"],
    ["column-gap", "2px"],
  ]);
  expect(expandShorthands([["grid-gap", "5px"]])).toEqual([
    ["row-gap", "5px"],
    ["column-gap", "5px"],
  ]);
  // remove grid- prefix
  expect(expandShorthands([["grid-row-gap", "5px"]])).toEqual([
    ["row-gap", "5px"],
  ]);
  expect(expandShorthands([["grid-column-gap", "5px"]])).toEqual([
    ["column-gap", "5px"],
  ]);
});

test("expand gap with css-wide keywords", () => {
  expect(expandShorthands([["gap", "inherit"]])).toEqual([
    ["row-gap", "inherit"],
    ["column-gap", "inherit"],
  ]);
});

test("expand border-image", () => {
  expect(
    expandShorthands([
      [
        "border-image",
        `url("/images/border.png") 27 23 / 50px 30px / 1rem round space`,
      ],
    ])
  ).toEqual([
    ["border-image-source", "url(/images/border.png)"],
    ["border-image-slice", "27 23"],
    ["border-image-width", "50px 30px"],
    ["border-image-outset", "1rem"],
    ["border-image-repeat", "round space"],
  ]);
  // shuffled
  expect(
    expandShorthands([
      [
        "border-image",
        `round space url("/images/border.png") 27 23 / 50px 30px / 1rem`,
      ],
    ])
  ).toEqual([
    ["border-image-source", "url(/images/border.png)"],
    ["border-image-slice", "27 23"],
    ["border-image-width", "50px 30px"],
    ["border-image-outset", "1rem"],
    ["border-image-repeat", "round space"],
  ]);
  // invalid extra nodes and missing syntaxes
  // can lead to infinite loop
  expect(
    expandShorthands([
      [
        "border-image",
        `url("/images/border.png") 27 23 / 50px 30px / 1rem unknown keywords`,
      ],
    ])
  ).toEqual([
    ["border-image-source", "url(/images/border.png)"],
    ["border-image-slice", "27 23"],
    ["border-image-width", "50px 30px"],
    ["border-image-outset", "1rem"],
    ["border-image-repeat", "initial"],
  ]);
  // omitted types should be initial
  expect(
    expandShorthands([["border-image", `linear-gradient(red, blue) 27`]])
  ).toEqual([
    ["border-image-source", "linear-gradient(red,blue)"],
    ["border-image-slice", "27"],
    ["border-image-width", "initial"],
    ["border-image-outset", "initial"],
    ["border-image-repeat", "initial"],
  ]);
});

test("expand border-image with css-wide keywords", () => {
  expect(expandShorthands([["border-image", `inherit`]])).toEqual([
    ["border-image-source", "inherit"],
    ["border-image-slice", "inherit"],
    ["border-image-width", "inherit"],
    ["border-image-outset", "inherit"],
    ["border-image-repeat", "inherit"],
  ]);
});

test("expand place properties", () => {
  expect(
    expandShorthands([
      ["place-content", "center"],
      ["place-items", "center"],
      ["place-self", "center"],
    ])
  ).toEqual([
    ["align-content", "center"],
    ["justify-content", "center"],
    ["align-items", "center"],
    ["justify-items", "center"],
    ["align-self", "center"],
    ["justify-self", "center"],
  ]);
  expect(
    expandShorthands([
      ["place-content", "start end"],
      ["place-items", "start end"],
      ["place-self", "start end"],
    ])
  ).toEqual([
    ["align-content", "start"],
    ["justify-content", "end"],
    ["align-items", "start"],
    ["justify-items", "end"],
    ["align-self", "start"],
    ["justify-self", "end"],
  ]);
});

test("expand place properties with css-wide keywords", () => {
  expect(
    expandShorthands([
      ["place-content", "inherit"],
      ["place-items", "inherit"],
      ["place-self", "inherit"],
    ])
  ).toEqual([
    ["align-content", "inherit"],
    ["justify-content", "inherit"],
    ["align-items", "inherit"],
    ["justify-items", "inherit"],
    ["align-self", "inherit"],
    ["justify-self", "inherit"],
  ]);
});

test("expand font", () => {
  expect(
    expandShorthands([
      [
        "font",
        `ultra-condensed small-caps bold italic 1.2em "Fira Sans", sans-serif`,
      ],
    ])
  ).toEqual([
    ["font-style", "italic"],
    ["font-variant-caps", "small-caps"],
    ["font-weight", "bold"],
    ["font-stretch", "ultra-condensed"],
    ["font-size", "1.2em"],
    ["line-height", "initial"],
    ["font-family", '"Fira Sans",sans-serif'],
  ]);
  expect(
    expandShorthands([["font", `1.2em/2 "Fira Sans", sans-serif`]])
  ).toEqual([
    ["font-style", "initial"],
    ["font-variant-caps", "initial"],
    ["font-weight", "initial"],
    ["font-stretch", "initial"],
    ["font-size", "1.2em"],
    ["line-height", "2"],
    ["font-family", '"Fira Sans",sans-serif'],
  ]);
});

test("expand font with css-wide keywords", () => {
  expect(expandShorthands([["font", `inherit`]])).toEqual([
    ["font-style", "inherit"],
    ["font-variant-caps", "inherit"],
    ["font-weight", "inherit"],
    ["font-stretch", "inherit"],
    ["font-size", "inherit"],
    ["line-height", "inherit"],
    ["font-family", "inherit"],
  ]);
});

test("expand font-synthesis", () => {
  expect(expandShorthands([["font-synthesis", `none`]])).toEqual([
    ["font-synthesis-weight", "none"],
    ["font-synthesis-style", "none"],
    ["font-synthesis-small-caps", "none"],
    ["font-synthesis-position", "none"],
  ]);
  expect(expandShorthands([["font-synthesis", `style`]])).toEqual([
    ["font-synthesis-weight", "none"],
    ["font-synthesis-style", "auto"],
    ["font-synthesis-small-caps", "none"],
    ["font-synthesis-position", "none"],
  ]);
  expect(
    expandShorthands([["font-synthesis", `style small-caps weight position`]])
  ).toEqual([
    ["font-synthesis-weight", "auto"],
    ["font-synthesis-style", "auto"],
    ["font-synthesis-small-caps", "auto"],
    ["font-synthesis-position", "auto"],
  ]);
});

test("expand font-synthesis with css-wide keywords", () => {
  expect(expandShorthands([["font-synthesis", `inherit`]])).toEqual([
    ["font-synthesis-weight", "inherit"],
    ["font-synthesis-style", "inherit"],
    ["font-synthesis-small-caps", "inherit"],
    ["font-synthesis-position", "inherit"],
  ]);
});

test("expand font-variant", () => {
  expect(expandShorthands([["font-variant", `normal`]])).toEqual([
    ["font-variant-ligatures", "normal"],
    ["font-variant-caps", "normal"],
    ["font-variant-alternates", "normal"],
    ["font-variant-numeric", "normal"],
    ["font-variant-east-asian", "normal"],
    ["font-variant-position", "normal"],
    ["font-variant-emoji", "normal"],
  ]);
  expect(expandShorthands([["font-variant", `none`]])).toEqual([
    ["font-variant-ligatures", "none"],
    ["font-variant-caps", "normal"],
    ["font-variant-alternates", "normal"],
    ["font-variant-numeric", "normal"],
    ["font-variant-east-asian", "normal"],
    ["font-variant-position", "normal"],
    ["font-variant-emoji", "normal"],
  ]);
  expect(
    expandShorthands([["font-variant", `common-ligatures small-caps`]])
  ).toEqual([
    ["font-variant-ligatures", "common-ligatures"],
    ["font-variant-caps", "small-caps"],
    ["font-variant-alternates", "normal"],
    ["font-variant-numeric", "normal"],
    ["font-variant-east-asian", "normal"],
    ["font-variant-position", "normal"],
    ["font-variant-emoji", "normal"],
  ]);
});

test("expand font-variant with css-wide keywords", () => {
  expect(expandShorthands([["font-variant", `inherit`]])).toEqual([
    ["font-variant-ligatures", "inherit"],
    ["font-variant-caps", "inherit"],
    ["font-variant-alternates", "inherit"],
    ["font-variant-numeric", "inherit"],
    ["font-variant-east-asian", "inherit"],
    ["font-variant-position", "inherit"],
    ["font-variant-emoji", "inherit"],
  ]);
});

test("expand text-decoration", () => {
  expect(expandShorthands([["text-decoration", `underline`]])).toEqual([
    ["text-decoration-line", "underline"],
    ["text-decoration-style", "solid"],
    ["text-decoration-color", "currentcolor"],
  ]);
  expect(expandShorthands([["text-decoration", `underline dotted`]])).toEqual([
    ["text-decoration-line", "underline"],
    ["text-decoration-style", "dotted"],
    ["text-decoration-color", "currentcolor"],
  ]);
  expect(
    expandShorthands([["text-decoration", `green wavy underline`]])
  ).toEqual([
    ["text-decoration-line", "underline"],
    ["text-decoration-style", "wavy"],
    ["text-decoration-color", "green"],
  ]);
});

test("expand text-emphasis", () => {
  expect(
    expandShorthands([["text-emphasis", "filled double-circle #ffb703"]])
  ).toEqual([
    ["text-emphasis-style", "filled double-circle"],
    ["text-emphasis-color", "#ffb703"],
  ]);
  expect(expandShorthands([["text-emphasis", "none"]])).toEqual([
    ["text-emphasis-style", "none"],
    ["text-emphasis-color", "initial"],
  ]);
});

test("expand flex", () => {
  expect(expandShorthands([["flex", "auto"]])).toEqual([
    ["flex-grow", "1"],
    ["flex-shrink", "1"],
    ["flex-basis", "auto"],
  ]);
  expect(expandShorthands([["flex", "none"]])).toEqual([
    ["flex-grow", "0"],
    ["flex-shrink", "0"],
    ["flex-basis", "auto"],
  ]);
  expect(expandShorthands([["flex", "10px"]])).toEqual([
    ["flex-grow", "1"],
    ["flex-shrink", "1"],
    ["flex-basis", "10px"],
  ]);
  expect(expandShorthands([["flex", "2"]])).toEqual([
    ["flex-grow", "2"],
    ["flex-shrink", "1"],
    ["flex-basis", "0"],
  ]);
  expect(expandShorthands([["flex", "2 3"]])).toEqual([
    ["flex-grow", "2"],
    ["flex-shrink", "3"],
    ["flex-basis", "0"],
  ]);
});

test("expand flex with css-wide keywords", () => {
  expect(expandShorthands([["flex", "inherit"]])).toEqual([
    ["flex-grow", "inherit"],
    ["flex-shrink", "inherit"],
    ["flex-basis", "inherit"],
  ]);
});

test("expand flex-flow", () => {
  expect(expandShorthands([["flex-flow", "row"]])).toEqual([
    ["flex-direction", "row"],
    ["flex-wrap", "initial"],
  ]);
  expect(expandShorthands([["flex-flow", "nowrap"]])).toEqual([
    ["flex-direction", "initial"],
    ["flex-wrap", "nowrap"],
  ]);
  expect(expandShorthands([["flex-flow", "row nowrap"]])).toEqual([
    ["flex-direction", "row"],
    ["flex-wrap", "nowrap"],
  ]);
});

test("expand columns", () => {
  expect(expandShorthands([["columns", "4 20px"]])).toEqual([
    ["column-width", "20px"],
    ["column-count", "4"],
  ]);
  expect(expandShorthands([["columns", "4"]])).toEqual([
    ["column-width", "initial"],
    ["column-count", "4"],
  ]);
  expect(expandShorthands([["columns", "20px"]])).toEqual([
    ["column-width", "20px"],
    ["column-count", "initial"],
  ]);
});

test("expand column-rule", () => {
  expect(expandShorthands([["column-rule", "thick inset blue"]])).toEqual([
    ["column-rule-width", "thick"],
    ["column-rule-style", "inset"],
    ["column-rule-color", "blue"],
  ]);
});

test("expand list-style", () => {
  expect(
    expandShorthands([
      ["list-style", `lower-roman url("img/shape.png") outside`],
    ])
  ).toEqual([
    ["list-style-position", "outside"],
    ["list-style-image", "url(img/shape.png)"],
    ["list-style-type", "lower-roman"],
  ]);
  expect(expandShorthands([["list-style", `square`]])).toEqual([
    ["list-style-position", "initial"],
    ["list-style-image", "initial"],
    ["list-style-type", "square"],
  ]);
});

test("expand animation", () => {
  expect(
    expandShorthands([
      ["animation", `3s ease-in 1s 2 reverse both paused slidein`],
    ])
  ).toEqual([
    ["animation-duration", "3s"],
    ["animation-timing-function", "ease-in"],
    ["animation-delay", "1s"],
    ["animation-iteration-count", "2"],
    ["animation-direction", "reverse"],
    ["animation-fill-mode", "both"],
    ["animation-play-state", "paused"],
    ["animation-name", "slidein"],
    ["animation-timeline", "auto"],
    ["animation-range-start", "normal"],
    ["animation-range-end", "normal"],
  ]);
  expect(
    expandShorthands([
      ["animation", `3s linear slidein, 3s ease-out 5s slideout`],
    ])
  ).toEqual([
    ["animation-duration", "3s,3s"],
    ["animation-timing-function", "linear,ease-out"],
    ["animation-delay", "0s,5s"],
    ["animation-iteration-count", "1,1"],
    ["animation-direction", "normal,normal"],
    ["animation-fill-mode", "none,none"],
    ["animation-play-state", "running,running"],
    ["animation-name", "slidein,slideout"],
    ["animation-timeline", "auto"],
    ["animation-range-start", "normal"],
    ["animation-range-end", "normal"],
  ]);
});

test("expand animation with css-wide keywords", () => {
  expect(expandShorthands([["animation", `inherit`]])).toEqual([
    ["animation-duration", "inherit"],
    ["animation-timing-function", "inherit"],
    ["animation-delay", "inherit"],
    ["animation-iteration-count", "inherit"],
    ["animation-direction", "inherit"],
    ["animation-fill-mode", "inherit"],
    ["animation-play-state", "inherit"],
    ["animation-name", "inherit"],
    ["animation-timeline", "inherit"],
    ["animation-range-start", "inherit"],
    ["animation-range-end", "inherit"],
  ]);
});

test("expand animation-range", () => {
  expect(expandShorthands([["animation-range", "normal"]])).toEqual([
    ["animation-range-start", "normal"],
    ["animation-range-end", "normal"],
  ]);
  expect(expandShorthands([["animation-range", "100px"]])).toEqual([
    ["animation-range-start", "100px"],
    ["animation-range-end", "normal"],
  ]);
  expect(expandShorthands([["animation-range", "entry 10% exit"]])).toEqual([
    ["animation-range-start", "entry 10%"],
    ["animation-range-end", "exit"],
  ]);
  expect(expandShorthands([["animation-range", "100px, 200px 50px"]])).toEqual([
    ["animation-range-start", "100px,200px"],
    ["animation-range-end", "normal,50px"],
  ]);
});

test("expand view-timeline", () => {
  expect(expandShorthands([["view-timeline", `none`]])).toEqual([
    ["view-timeline-name", "none"],
    ["view-timeline-axis", "block"],
    ["view-timeline-inset", "auto"],
  ]);
  expect(expandShorthands([["view-timeline", `none inline 200px`]])).toEqual([
    ["view-timeline-name", "none"],
    ["view-timeline-axis", "inline"],
    ["view-timeline-inset", "200px"],
  ]);
  expect(
    expandShorthands([["view-timeline", `--custom_name_for_timeline inline`]])
  ).toEqual([
    ["view-timeline-name", "--custom_name_for_timeline"],
    ["view-timeline-axis", "inline"],
    ["view-timeline-inset", "auto"],
  ]);
  expect(
    expandShorthands([["view-timeline", `none inline, --custom y`]])
  ).toEqual([
    ["view-timeline-name", "none,--custom"],
    ["view-timeline-axis", "inline,y"],
    ["view-timeline-inset", "auto,auto"],
  ]);
});

test("expand transition", () => {
  expect(
    expandShorthands([["transition", `margin-right 4s ease-in-out 1s`]])
  ).toEqual([
    ["transition-property", "margin-right"],
    ["transition-duration", "4s"],
    ["transition-timing-function", "ease-in-out"],
    ["transition-delay", "1s"],
    ["transition-behavior", "normal"],
  ]);
  expect(
    expandShorthands([["transition", `margin-right 4s, color 1s`]])
  ).toEqual([
    ["transition-property", "margin-right,color"],
    ["transition-duration", "4s,1s"],
    ["transition-timing-function", "ease,ease"],
    ["transition-delay", "0s,0s"],
    ["transition-behavior", "normal,normal"],
  ]);
  expect(
    expandShorthands([["transition", `display 4s allow-discrete`]])
  ).toEqual([
    ["transition-property", "display"],
    ["transition-duration", "4s"],
    ["transition-timing-function", "ease"],
    ["transition-delay", "0s"],
    ["transition-behavior", "allow-discrete"],
  ]);
});

test("expand mask", () => {
  expect(expandShorthands([["mask", `none`]])).toEqual([
    ["mask-image", "none"],
    ["mask-position", "0% 0%"],
    ["mask-size", "auto"],
    ["mask-repeat", "repeat"],
    ["mask-origin", "border-box"],
    ["mask-clip", "border-box"],
    ["mask-composite", "add"],
    ["mask-mode", "match-source"],
  ]);
  expect(expandShorthands([["mask", `url(mask.png)`]])).toEqual([
    ["mask-image", "url(mask.png)"],
    ["mask-position", "0% 0%"],
    ["mask-size", "auto"],
    ["mask-repeat", "repeat"],
    ["mask-origin", "border-box"],
    ["mask-clip", "border-box"],
    ["mask-composite", "add"],
    ["mask-mode", "match-source"],
  ]);
  expect(
    expandShorthands([["mask", `url(masks.svg#star) 0 0/50px 50px`]])
  ).toEqual([
    ["mask-image", "url(masks.svg#star)"],
    ["mask-position", "0 0"],
    ["mask-size", "50px 50px"],
    ["mask-repeat", "repeat"],
    ["mask-origin", "border-box"],
    ["mask-clip", "border-box"],
    ["mask-composite", "add"],
    ["mask-mode", "match-source"],
  ]);
  expect(
    expandShorthands([
      [
        "mask",
        `url(masks.svg#star) left / 16px repeat-y, url(masks.svg#circle) right / 16px repeat-y`,
      ],
    ])
  ).toEqual([
    ["mask-image", "url(masks.svg#star),url(masks.svg#circle)"],
    ["mask-position", "left,right"],
    ["mask-size", "16px,16px"],
    ["mask-repeat", "repeat-y,repeat-y"],
    ["mask-origin", "border-box,border-box"],
    ["mask-clip", "border-box,border-box"],
    ["mask-composite", "add,add"],
    ["mask-mode", "match-source,match-source"],
  ]);
});

test("expand mask-border", () => {
  expect(
    expandShorthands([["mask-border", `url("border-mask.png") 25`]])
  ).toEqual([
    ["mask-border-source", "url(border-mask.png)"],
    ["mask-border-slice", "25"],
    ["mask-border-width", "initial"],
    ["mask-border-outset", "initial"],
    ["mask-border-repeat", "initial"],
    ["mask-border-mode", "initial"],
  ]);
  expect(
    expandShorthands([
      ["mask-border", `url("border-mask.png") 25 / 35px / 12px space alpha`],
    ])
  ).toEqual([
    ["mask-border-source", "url(border-mask.png)"],
    ["mask-border-slice", "25"],
    ["mask-border-width", "35px"],
    ["mask-border-outset", "12px"],
    ["mask-border-repeat", "space"],
    ["mask-border-mode", "alpha"],
  ]);
});

test("expand grid-area", () => {
  expect(expandShorthands([["grid-area", "a / b / c / d"]])).toEqual([
    ["grid-row-start", "a"],
    ["grid-column-start", "b"],
    ["grid-row-end", "c"],
    ["grid-column-end", "d"],
  ]);
  expect(expandShorthands([["grid-area", "a / b / c"]])).toEqual([
    ["grid-row-start", "a"],
    ["grid-column-start", "b"],
    ["grid-row-end", "c"],
    ["grid-column-end", "auto"],
  ]);
  expect(expandShorthands([["grid-area", "a / b"]])).toEqual([
    ["grid-row-start", "a"],
    ["grid-column-start", "b"],
    ["grid-row-end", "auto"],
    ["grid-column-end", "auto"],
  ]);
  expect(expandShorthands([["grid-area", "a"]])).toEqual([
    ["grid-row-start", "a"],
    ["grid-column-start", "auto"],
    ["grid-row-end", "auto"],
    ["grid-column-end", "auto"],
  ]);
});

test("expand grid-row and grid-column", () => {
  expect(
    expandShorthands([
      ["grid-row", "1"],
      ["grid-column", "1"],
    ])
  ).toEqual([
    ["grid-row-start", "1"],
    ["grid-row-end", "auto"],
    ["grid-column-start", "1"],
    ["grid-column-end", "auto"],
  ]);
  expect(
    expandShorthands([
      ["grid-row", "1 / 2"],
      ["grid-column", "3 / 4"],
    ])
  ).toEqual([
    ["grid-row-start", "1"],
    ["grid-row-end", "2"],
    ["grid-column-start", "3"],
    ["grid-column-end", "4"],
  ]);
});

test("expand overflow", () => {
  expect(expandShorthands([["overflow", "hidden"]])).toEqual([
    ["overflow-x", "hidden"],
    ["overflow-y", "hidden"],
  ]);
  expect(expandShorthands([["overflow", "hidden auto"]])).toEqual([
    ["overflow-x", "hidden"],
    ["overflow-y", "auto"],
  ]);
});

test("expand offset", () => {
  expect(
    expandShorthands([["offset", `path("M 100 100 L 300 100 L 200 300 z")`]])
  ).toEqual([
    ["offset-position", "normal"],
    ["offset-path", 'path("M 100 100 L 300 100 L 200 300 z")'],
    ["offset-distance", "0"],
    ["offset-rotate", "auto"],
    ["offset-anchor", "auto"],
  ]);
  expect(
    expandShorthands([["offset", `url(arc.svg) 30deg / 50px 100px`]])
  ).toEqual([
    ["offset-position", "normal"],
    ["offset-path", "url(arc.svg)"],
    ["offset-distance", "0"],
    ["offset-rotate", "30deg"],
    ["offset-anchor", "50px 100px"],
  ]);
  expect(expandShorthands([["offset", `url(circle.svg) 40%`]])).toEqual([
    ["offset-position", "normal"],
    ["offset-path", "url(circle.svg)"],
    ["offset-distance", "40%"],
    ["offset-rotate", "auto"],
    ["offset-anchor", "auto"],
  ]);
});

test("expand scroll-timeline", () => {
  expect(expandShorthands([["scroll-timeline", `none`]])).toEqual([
    ["scroll-timeline-name", "none"],
    ["scroll-timeline-axis", "block"],
  ]);
  expect(expandShorthands([["scroll-timeline", `none inline`]])).toEqual([
    ["scroll-timeline-name", "none"],
    ["scroll-timeline-axis", "inline"],
  ]);
  expect(
    expandShorthands([["scroll-timeline", `--custom_name_for_timeline inline`]])
  ).toEqual([
    ["scroll-timeline-name", "--custom_name_for_timeline"],
    ["scroll-timeline-axis", "inline"],
  ]);
  expect(
    expandShorthands([["scroll-timeline", `none inline, --custom y`]])
  ).toEqual([
    ["scroll-timeline-name", "none,--custom"],
    ["scroll-timeline-axis", "inline,y"],
  ]);
});

test("expand scroll-margin/scroll-padding", () => {
  expect(expandShorthands([["scroll-margin", "10px"]])).toEqual([
    ["scroll-margin-top", "10px"],
    ["scroll-margin-right", "10px"],
    ["scroll-margin-bottom", "10px"],
    ["scroll-margin-left", "10px"],
  ]);
  expect(expandShorthands([["scroll-margin-block", "10px"]])).toEqual([
    ["scroll-margin-block-start", "10px"],
    ["scroll-margin-block-end", "10px"],
  ]);
  expect(expandShorthands([["scroll-margin-inline", "10px"]])).toEqual([
    ["scroll-margin-inline-start", "10px"],
    ["scroll-margin-inline-end", "10px"],
  ]);
  expect(expandShorthands([["scroll-padding", "10px"]])).toEqual([
    ["scroll-padding-top", "10px"],
    ["scroll-padding-right", "10px"],
    ["scroll-padding-bottom", "10px"],
    ["scroll-padding-left", "10px"],
  ]);
  expect(expandShorthands([["scroll-padding-block", "10px"]])).toEqual([
    ["scroll-padding-block-start", "10px"],
    ["scroll-padding-block-end", "10px"],
  ]);
  expect(expandShorthands([["scroll-padding-inline", "10px"]])).toEqual([
    ["scroll-padding-inline-start", "10px"],
    ["scroll-padding-inline-end", "10px"],
  ]);
});

test("expand grid-template", () => {
  expect(expandShorthands([["grid-template", `none`]])).toEqual([
    ["grid-template-areas", "none"],
    ["grid-template-rows", "none"],
    ["grid-template-columns", "none"],
  ]);
  expect(expandShorthands([["grid-template", `100px 1fr / 50px 1fr`]])).toEqual(
    [
      ["grid-template-areas", "none"],
      ["grid-template-rows", "100px 1fr"],
      ["grid-template-columns", "50px 1fr"],
    ]
  );
  expect(
    expandShorthands([
      [
        "grid-template",
        `
        [header-top] "a a a" [header-bottom]
        [main-top] "b b b" 1fr [main-bottom]
        / auto 1fr auto
        `,
      ],
    ])
  ).toEqual([
    ["grid-template-areas", `"a a a""b b b"`],
    [
      "grid-template-rows",
      "[header-top][header-bottom][main-top]1fr[main-bottom]",
    ],
    ["grid-template-columns", "auto 1fr auto"],
  ]);
});

test("expand grid", () => {
  expect(expandShorthands([["grid", `none`]])).toEqual([
    ["grid-template-areas", "none"],
    ["grid-template-rows", "none"],
    ["grid-template-columns", "none"],
    ["grid-auto-flow.", "row"],
    ["grid-auto-rows", "auto"],
    ["grid-auto-columns", "auto"],
  ]);
  expect(expandShorthands([["grid", `100px 1fr / 50px 1fr`]])).toEqual([
    ["grid-template-areas", "none"],
    ["grid-template-rows", "100px 1fr"],
    ["grid-template-columns", "50px 1fr"],
    ["grid-auto-flow.", "row"],
    ["grid-auto-rows", "auto"],
    ["grid-auto-columns", "auto"],
  ]);
  expect(expandShorthands([["grid", `200px / auto-flow`]])).toEqual([
    ["grid-template-areas", "none"],
    ["grid-template-rows", "200px"],
    ["grid-template-columns", "none"],
    ["grid-auto-flow.", "column"],
    ["grid-auto-rows", "auto"],
    ["grid-auto-columns", "auto"],
  ]);
  expect(expandShorthands([["grid", `auto-flow dense / 30%`]])).toEqual([
    ["grid-template-areas", "none"],
    ["grid-template-rows", "none"],
    ["grid-template-columns", "30%"],
    ["grid-auto-flow.", "row dense"],
    ["grid-auto-rows", "auto"],
    ["grid-auto-columns", "auto"],
  ]);
});

test("expand container", () => {
  expect(expandShorthands([["container", "my-layout"]])).toEqual([
    ["container-name", "my-layout"],
    ["container-type", "normal"],
  ]);
  expect(expandShorthands([["container", "my-layout / size"]])).toEqual([
    ["container-name", "my-layout"],
    ["container-type", "size"],
  ]);
});

test("expand contain-intrinsic-size", () => {
  expect(expandShorthands([["contain-intrinsic-size", "auto 300px"]])).toEqual([
    ["contain-intrinsic-width", "auto 300px"],
    ["contain-intrinsic-height", "auto 300px"],
  ]);
  expect(expandShorthands([["contain-intrinsic-size", "1000px"]])).toEqual([
    ["contain-intrinsic-width", "1000px"],
    ["contain-intrinsic-height", "1000px"],
  ]);
  expect(
    expandShorthands([["contain-intrinsic-size", "1000px 1.5em"]])
  ).toEqual([
    ["contain-intrinsic-width", "1000px"],
    ["contain-intrinsic-height", "1.5em"],
  ]);
  expect(
    expandShorthands([["contain-intrinsic-size", "auto 300px auto 4rem"]])
  ).toEqual([
    ["contain-intrinsic-width", "auto 300px"],
    ["contain-intrinsic-height", "auto 4rem"],
  ]);
});

test("expand white-space", () => {
  expect(expandShorthands([["white-space", "normal"]])).toEqual([
    ["white-space-collapse", "collapse"],
    ["text-wrap-mode", "wrap"],
  ]);
  expect(expandShorthands([["white-space", "pre"]])).toEqual([
    ["white-space-collapse", "preserve"],
    ["text-wrap-mode", "nowrap"],
  ]);
  expect(expandShorthands([["white-space", "pre-wrap"]])).toEqual([
    ["white-space-collapse", "preserve"],
    ["text-wrap-mode", "wrap"],
  ]);
  expect(expandShorthands([["white-space", "pre-line"]])).toEqual([
    ["white-space-collapse", "preserve-breaks"],
    ["text-wrap-mode", "wrap"],
  ]);
  // white-space-collapse values
  expect(expandShorthands([["white-space", "collapse"]])).toEqual([
    ["white-space-collapse", "collapse"],
    ["text-wrap-mode", "wrap"],
  ]);
  expect(expandShorthands([["white-space", "preserve"]])).toEqual([
    ["white-space-collapse", "preserve"],
    ["text-wrap-mode", "wrap"],
  ]);
  expect(expandShorthands([["white-space", "preserve-breaks"]])).toEqual([
    ["white-space-collapse", "preserve-breaks"],
    ["text-wrap-mode", "wrap"],
  ]);
  expect(expandShorthands([["white-space", "preserve-spaces"]])).toEqual([
    ["white-space-collapse", "preserve-spaces"],
    ["text-wrap-mode", "wrap"],
  ]);
  expect(expandShorthands([["white-space", "break-spaces"]])).toEqual([
    ["white-space-collapse", "break-spaces"],
    ["text-wrap-mode", "wrap"],
  ]);
  // text-wrap-mode values
  expect(expandShorthands([["white-space", "wrap"]])).toEqual([
    ["white-space-collapse", "collapse"],
    ["text-wrap-mode", "wrap"],
  ]);
  expect(expandShorthands([["white-space", "nowrap"]])).toEqual([
    ["white-space-collapse", "collapse"],
    ["text-wrap-mode", "nowrap"],
  ]);
});

test("expand text-wrap", () => {
  // text-wrap-mode values
  expect(expandShorthands([["text-wrap", "wrap"]])).toEqual([
    ["text-wrap-mode", "wrap"],
    ["text-wrap-style", "auto"],
  ]);
  expect(expandShorthands([["text-wrap", "nowrap"]])).toEqual([
    ["text-wrap-mode", "nowrap"],
    ["text-wrap-style", "auto"],
  ]);
  // text-wrap-style values
  expect(expandShorthands([["text-wrap", "balance"]])).toEqual([
    ["text-wrap-mode", "wrap"],
    ["text-wrap-style", "balance"],
  ]);
  expect(expandShorthands([["text-wrap", "stable"]])).toEqual([
    ["text-wrap-mode", "wrap"],
    ["text-wrap-style", "stable"],
  ]);
  expect(expandShorthands([["text-wrap", "pretty"]])).toEqual([
    ["text-wrap-mode", "wrap"],
    ["text-wrap-style", "pretty"],
  ]);
});

test("expand background-position", () => {
  expect(expandShorthands([["background-position", "initial"]])).toEqual([
    ["background-position-x", "initial"],
    ["background-position-y", "initial"],
  ]);
  expect(expandShorthands([["background-position", "0"]])).toEqual([
    ["background-position-x", "0"],
    ["background-position-y", "center"],
  ]);
  expect(expandShorthands([["background-position", "top left"]])).toEqual([
    ["background-position-x", "left"],
    ["background-position-y", "top"],
  ]);
  expect(expandShorthands([["background-position", "right bottom"]])).toEqual([
    ["background-position-x", "right"],
    ["background-position-y", "bottom"],
  ]);
  expect(expandShorthands([["background-position", "25% 75%"]])).toEqual([
    ["background-position-x", "25%"],
    ["background-position-y", "75%"],
  ]);
  expect(
    expandShorthands([["background-position", "bottom 10px right"]])
  ).toEqual([
    ["background-position-x", "right"],
    ["background-position-y", "bottom 10px"],
  ]);
  expect(
    expandShorthands([["background-position", "center right 10px"]])
  ).toEqual([
    ["background-position-x", "right 10px"],
    ["background-position-y", "center"],
  ]);
  expect(
    expandShorthands([["background-position", "center bottom 10px"]])
  ).toEqual([
    ["background-position-x", "center"],
    ["background-position-y", "bottom 10px"],
  ]);
  expect(expandShorthands([["background-position", "top right 10px"]])).toEqual(
    [
      ["background-position-x", "right 10px"],
      ["background-position-y", "top"],
    ]
  );
  expect(
    expandShorthands([["background-position", "bottom 10px right 20px"]])
  ).toEqual([
    ["background-position-x", "right 20px"],
    ["background-position-y", "bottom 10px"],
  ]);
  expect(expandShorthands([["background-position", "0 10px, center"]])).toEqual(
    [
      ["background-position-x", "0,center"],
      ["background-position-y", "10px,center"],
    ]
  );
});

test("expand background", () => {
  expect(expandShorthands([["background", `none`]])).toEqual([
    ["background-image", "none"],
    ["background-position-x", "0%"],
    ["background-position-y", "0%"],
    ["background-size", "auto auto"],
    ["background-repeat", "repeat"],
    ["background-attachment", "scroll"],
    ["background-origin", "padding-box"],
    ["background-clip", "border-box"],
    ["background-color", "transparent"],
  ]);
  expect(expandShorthands([["background", `green`]])).toEqual([
    ["background-image", "none"],
    ["background-position-x", "0%"],
    ["background-position-y", "0%"],
    ["background-size", "auto auto"],
    ["background-repeat", "repeat"],
    ["background-attachment", "scroll"],
    ["background-origin", "padding-box"],
    ["background-clip", "border-box"],
    ["background-color", "green"],
  ]);
  expect(expandShorthands([["background", `transparent`]])).toEqual([
    ["background-image", "none"],
    ["background-position-x", "0%"],
    ["background-position-y", "0%"],
    ["background-size", "auto auto"],
    ["background-repeat", "repeat"],
    ["background-attachment", "scroll"],
    ["background-origin", "padding-box"],
    ["background-clip", "border-box"],
    ["background-color", "transparent"],
  ]);
  expect(
    expandShorthands([["background", `url("test.jpg") repeat-y`]])
  ).toEqual([
    ["background-image", "url(test.jpg)"],
    ["background-position-x", "0%"],
    ["background-position-y", "0%"],
    ["background-size", "auto auto"],
    ["background-repeat", "repeat-y"],
    ["background-attachment", "scroll"],
    ["background-origin", "padding-box"],
    ["background-clip", "border-box"],
    ["background-color", "transparent"],
  ]);
  expect(expandShorthands([["background", `border-box red`]])).toEqual([
    ["background-image", "none"],
    ["background-position-x", "0%"],
    ["background-position-y", "0%"],
    ["background-size", "auto auto"],
    ["background-repeat", "repeat"],
    ["background-attachment", "scroll"],
    ["background-origin", "border-box"],
    ["background-clip", "border-box"],
    ["background-color", "red"],
  ]);
  expect(
    expandShorthands([
      ["background", `no-repeat center/80% url("../img/image.png")`],
    ])
  ).toEqual([
    ["background-image", "url(../img/image.png)"],
    ["background-position-x", "center"],
    ["background-position-y", "center"],
    ["background-size", "80%"],
    ["background-repeat", "no-repeat"],
    ["background-attachment", "scroll"],
    ["background-origin", "padding-box"],
    ["background-clip", "border-box"],
    ["background-color", "transparent"],
  ]);
  expect(
    expandShorthands([
      [
        "background",
        `repeat scroll 0% 0% / auto padding-box border-box none transparent`,
      ],
    ])
  ).toEqual([
    ["background-image", "none"],
    ["background-position-x", "0%"],
    ["background-position-y", "0%"],
    ["background-size", "auto"],
    ["background-repeat", "repeat"],
    ["background-attachment", "scroll"],
    ["background-origin", "padding-box"],
    ["background-clip", "border-box"],
    ["background-color", "transparent"],
  ]);
});

test("expand caret", () => {
  expect(expandShorthands([["caret", "red"]])).toEqual([
    ["caret-color", "red"],
    ["caret-shape", "auto"],
  ]);
  expect(expandShorthands([["caret", "block"]])).toEqual([
    ["caret-color", "auto"],
    ["caret-shape", "block"],
  ]);
  expect(expandShorthands([["caret", "block red"]])).toEqual([
    ["caret-color", "red"],
    ["caret-shape", "block"],
  ]);
});

test("expand overscroll-behavior", () => {
  expect(expandShorthands([["overscroll-behavior", "auto"]])).toEqual([
    ["overscroll-behavior-x", "auto"],
    ["overscroll-behavior-y", "auto"],
  ]);
  expect(expandShorthands([["overscroll-behavior", "contain"]])).toEqual([
    ["overscroll-behavior-x", "contain"],
    ["overscroll-behavior-y", "contain"],
  ]);
  expect(expandShorthands([["overscroll-behavior", "contain none"]])).toEqual([
    ["overscroll-behavior-x", "contain"],
    ["overscroll-behavior-y", "none"],
  ]);
});

test("expand position-try", () => {
  expect(expandShorthands([["position-try", "none"]])).toEqual([
    ["position-try-order", "normal"],
    ["position-try-options", "none"],
  ]);
  expect(expandShorthands([["position-try", "most-width none"]])).toEqual([
    ["position-try-order", "most-width"],
    ["position-try-options", "none"],
  ]);
  expect(expandShorthands([["position-try", "--dashed-ident"]])).toEqual([
    ["position-try-order", "normal"],
    ["position-try-options", "--dashed-ident"],
  ]);
});

test("replace empty value with unset", () => {
  expect(expandShorthands([["color", ""]])).toEqual([["color", "unset"]]);
  expect(expandShorthands([["transition", ""]])).toEqual([
    ["transition-property", "unset"],
    ["transition-duration", "unset"],
    ["transition-timing-function", "unset"],
    ["transition-delay", "unset"],
    ["transition-behavior", "unset"],
  ]);
});

test("does not fail on empty value", () => {
  expect(() => expandShorthands([["transition", ""]])).not.toThrow();
  expect(() => expandShorthands([["border", ""]])).not.toThrow();
  expect(() => expandShorthands([["font", ""]])).not.toThrow();
  expect(() => expandShorthands([["font-synthesis", ""]])).not.toThrow();
  expect(() => expandShorthands([["font-variant", ""]])).not.toThrow();
  expect(() => expandShorthands([["text-decoration", ""]])).not.toThrow();
  expect(() => expandShorthands([["text-emphasis", ""]])).not.toThrow();
  expect(() => expandShorthands([["border-width", ""]])).not.toThrow();
  expect(() => expandShorthands([["border-style", ""]])).not.toThrow();
  expect(() => expandShorthands([["border-color", ""]])).not.toThrow();
  expect(() => expandShorthands([["border-inline-width", ""]])).not.toThrow();
  expect(() => expandShorthands([["border-inline-style", ""]])).not.toThrow();
  expect(() => expandShorthands([["border-inline-color", ""]])).not.toThrow();
  expect(() => expandShorthands([["border-block-width", ""]])).not.toThrow();
  expect(() => expandShorthands([["border-block-style", ""]])).not.toThrow();
  expect(() => expandShorthands([["border-block-color", ""]])).not.toThrow();
  expect(() => expandShorthands([["border-radius", ""]])).not.toThrow();
  expect(() => expandShorthands([["border-image", ""]])).not.toThrow();
  expect(() => expandShorthands([["outline", ""]])).not.toThrow();
  expect(() => expandShorthands([["mask", ""]])).not.toThrow();
  expect(() => expandShorthands([["mask-border", ""]])).not.toThrow();
  expect(() => expandShorthands([["margin", ""]])).not.toThrow();
  expect(() => expandShorthands([["padding", ""]])).not.toThrow();
  expect(() => expandShorthands([["margin-inline", ""]])).not.toThrow();
  expect(() => expandShorthands([["margin-block", ""]])).not.toThrow();
  expect(() => expandShorthands([["padding-inline", ""]])).not.toThrow();
  expect(() => expandShorthands([["padding-block", ""]])).not.toThrow();
  expect(() => expandShorthands([["inset", ""]])).not.toThrow();
  expect(() => expandShorthands([["inset-inline", ""]])).not.toThrow();
  expect(() => expandShorthands([["inset-block", ""]])).not.toThrow();
  expect(() => expandShorthands([["gap", ""]])).not.toThrow();
  expect(() => expandShorthands([["grid-gap", ""]])).not.toThrow();
  expect(() => expandShorthands([["grid-row-gap", ""]])).not.toThrow();
  expect(() => expandShorthands([["grid-column-gap", ""]])).not.toThrow();
  expect(() => expandShorthands([["grid-area", ""]])).not.toThrow();
  expect(() => expandShorthands([["grid-row", ""]])).not.toThrow();
  expect(() => expandShorthands([["grid-column", ""]])).not.toThrow();
  expect(() => expandShorthands([["grid-template", ""]])).not.toThrow();
  expect(() => expandShorthands([["grid", ""]])).not.toThrow();
  expect(() => expandShorthands([["flex", ""]])).not.toThrow();
  expect(() => expandShorthands([["flex-flow", ""]])).not.toThrow();
  expect(() => expandShorthands([["place-content", ""]])).not.toThrow();
  expect(() => expandShorthands([["place-items", ""]])).not.toThrow();
  expect(() => expandShorthands([["place-self", ""]])).not.toThrow();
  expect(() => expandShorthands([["columns", ""]])).not.toThrow();
  expect(() => expandShorthands([["column-rule", ""]])).not.toThrow();
  expect(() => expandShorthands([["list-style", ""]])).not.toThrow();
  expect(() => expandShorthands([["animation", ""]])).not.toThrow();
  expect(() => expandShorthands([["animation-range", ""]])).not.toThrow();
  expect(() => expandShorthands([["transition", ""]])).not.toThrow();
  expect(() => expandShorthands([["offset", ""]])).not.toThrow();
  expect(() => expandShorthands([["scroll-timeline", ""]])).not.toThrow();
  expect(() => expandShorthands([["view-timeline", ""]])).not.toThrow();
  expect(() => expandShorthands([["scroll-margin", ""]])).not.toThrow();
  expect(() => expandShorthands([["scroll-padding", ""]])).not.toThrow();
  expect(() => expandShorthands([["scroll-margin-inline", ""]])).not.toThrow();
  expect(() => expandShorthands([["scroll-margin-block", ""]])).not.toThrow();
  expect(() => expandShorthands([["scroll-padding-inline", ""]])).not.toThrow();
  expect(() => expandShorthands([["scroll-padding-block", ""]])).not.toThrow();
  expect(() => expandShorthands([["overflow", ""]])).not.toThrow();
  expect(() => expandShorthands([["container", ""]])).not.toThrow();
  expect(() =>
    expandShorthands([["contain-intrinsic-size", ""]])
  ).not.toThrow();
  expect(() => expandShorthands([["white-space", ""]])).not.toThrow();
  expect(() => expandShorthands([["text-wrap", ""]])).not.toThrow();
  expect(() => expandShorthands([["caret", ""]])).not.toThrow();
  expect(() => expandShorthands([["background-position", ""]])).not.toThrow();
  expect(() => expandShorthands([["background", ""]])).not.toThrow();
  expect(() => expandShorthands([["overscroll-behavior", ""]])).not.toThrow();
  expect(() => expandShorthands([["position-try", ""]])).not.toThrow();
});
