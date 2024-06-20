import { expect, test } from "@jest/globals";
import { expandShorthands } from "./shorthands";

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
    ["border-top-style", "initial"],
    ["border-top-color", "initial"],
  ]);
  expect(expandShorthands([["border-top", "red"]])).toEqual([
    ["border-top-width", "initial"],
    ["border-top-style", "initial"],
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
    ["border-top-left-radius", "5px"],
  ]);
  expect(expandShorthands([["border-radius", "1px 2px 3px 4px"]])).toEqual([
    ["border-top-left-radius", "1px"],
    ["border-top-right-radius", "2px"],
    ["border-bottom-right-radius", "3px"],
    ["border-top-left-radius", "4px"],
  ]);
  expect(expandShorthands([["border-radius", "5px / 3px"]])).toEqual([
    ["border-top-left-radius", "5px 3px"],
    ["border-top-right-radius", "5px 3px"],
    ["border-bottom-right-radius", "5px 3px"],
    ["border-top-left-radius", "5px 3px"],
  ]);
  expect(expandShorthands([["border-radius", "5px 2px / 3px 4px"]])).toEqual([
    ["border-top-left-radius", "5px 3px"],
    ["border-top-right-radius", "2px 4px"],
    ["border-bottom-right-radius", "5px 3px"],
    ["border-top-left-radius", "2px 4px"],
  ]);
});

test("expand outline", () => {
  expect(expandShorthands([["outline", "1px solid red"]])).toEqual([
    ["outline-width", "1px"],
    ["outline-style", "solid"],
    ["outline-color", "red"],
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
    ["font-width", "ultra-condensed"],
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
    ["font-width", "initial"],
    ["font-size", "1.2em"],
    ["line-height", "2"],
    ["font-family", '"Fira Sans",sans-serif'],
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

test("expand text-decoration", () => {
  expect(expandShorthands([["text-decoration", `underline`]])).toEqual([
    ["text-decoration-line", "underline"],
    ["text-decoration-style", "initial"],
    ["text-decoration-color", "initial"],
  ]);
  expect(expandShorthands([["text-decoration", `underline dotted`]])).toEqual([
    ["text-decoration-line", "underline"],
    ["text-decoration-style", "dotted"],
    ["text-decoration-color", "initial"],
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
  expect(expandShorthands([["flex", "initial"]])).toEqual([
    ["flex-grow", "0"],
    ["flex-shrink", "1"],
    ["flex-basis", "auto"],
  ]);
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

test("expand transition", () => {
  expect(
    expandShorthands([["transition", `margin-right 4s, color 1s`]])
  ).toEqual([
    ["transition-property", "margin-right,color"],
    ["transition-duration", "4s,1s"],
    ["transition-timing-function", "ease,ease"],
    ["transition-delay", "4s,1s"],
    ["transition-behavior", "normal,normal"],
  ]);
  expect(
    expandShorthands([["transition", `margin-right 4s ease-in-out 1s`]])
  ).toEqual([
    ["transition-property", "margin-right"],
    ["transition-duration", "4s"],
    ["transition-timing-function", "ease-in-out"],
    ["transition-delay", "4s"],
    ["transition-behavior", "normal"],
  ]);
  expect(
    expandShorthands([["transition", `display 4s allow-discrete`]])
  ).toEqual([
    ["transition-property", "display"],
    ["transition-duration", "4s"],
    ["transition-timing-function", "ease"],
    ["transition-delay", "4s"],
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

test.todo("container");
test.todo("contain-intrinsic-size");
test.todo("grid");
test.todo("grid-template");
test.todo("offset");
test.todo("scroll-margin");
test.todo("scroll-padding");
test.todo("scroll-timeline");

test.todo("white-space - not a shorthand in webflow");
test.todo("text-wrap - not a shorthand in webflow");

test.todo("all - can negatively affect build size");
test.todo("background - not used in webflow");
test.todo("background-position-x - we use shorthand");
test.todo("background-position-y - we use shorthand");
test.todo("translate - are these directly mappable to transform");
test.todo("rotate");
test.todo("scale");
