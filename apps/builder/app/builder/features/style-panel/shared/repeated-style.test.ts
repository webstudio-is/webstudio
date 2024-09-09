import { beforeEach, expect, test } from "@jest/globals";
import {
  addRepeatedStyleItem,
  deleteRepeatedStyleItem,
  editRepeatedStyleItem,
  swapRepeatedStyleItems,
  toggleRepeatedStyleItem,
} from "./repeated-style";
import { createComputedStyleDeclStore } from "./model";
import { parseCssFragment } from "./parse-css-fragment";
import {
  $breakpoints,
  $selectedBreakpointId,
  $selectedInstanceSelector,
  $styles,
} from "~/shared/nano-states";
import { registerContainers } from "~/shared/sync";

registerContainers();

beforeEach(() => {
  $breakpoints.set(new Map([["base", { id: "base", label: "" }]]));
  $selectedBreakpointId.set("base");
  $selectedInstanceSelector.set(["box"]);
  $styles.set(new Map());
});

test("add layer to repeated style", () => {
  const $transitionProperty =
    createComputedStyleDeclStore("transitionProperty");
  addRepeatedStyleItem(
    [$transitionProperty.get()],
    parseCssFragment("opacity", "transitionProperty")
  );
  addRepeatedStyleItem(
    [$transitionProperty.get()],
    parseCssFragment("transform", "transitionProperty")
  );
  expect($transitionProperty.get().cascadedValue).toEqual({
    type: "layers",
    value: [
      { type: "unparsed", value: "opacity" },
      { type: "unparsed", value: "transform" },
    ],
  });
});

test("add tuple to repeated style", () => {
  const $filter = createComputedStyleDeclStore("filter");
  addRepeatedStyleItem(
    [$filter.get()],
    parseCssFragment("blur(5px)", "filter")
  );
  addRepeatedStyleItem(
    [$filter.get()],
    parseCssFragment("brightness(0.5)", "filter")
  );
  expect($filter.get().cascadedValue).toEqual({
    type: "tuple",
    value: [
      {
        type: "function",
        name: "blur",
        args: {
          type: "tuple",
          value: [{ type: "unit", unit: "px", value: 5 }],
        },
      },
      {
        type: "function",
        name: "brightness",
        args: {
          type: "tuple",
          value: [{ type: "unit", unit: "number", value: 0.5 }],
        },
      },
    ],
  });
});

test("edit layer in repeated style", () => {
  const $transitionProperty =
    createComputedStyleDeclStore("transitionProperty");
  addRepeatedStyleItem(
    [$transitionProperty.get()],
    parseCssFragment("opacity", "transitionProperty")
  );
  addRepeatedStyleItem(
    [$transitionProperty.get()],
    parseCssFragment("transform", "transitionProperty")
  );
  editRepeatedStyleItem(
    [$transitionProperty.get()],
    1,
    parseCssFragment("width", "transitionProperty")
  );
  expect($transitionProperty.get().cascadedValue).toEqual({
    type: "layers",
    value: [
      { type: "unparsed", value: "opacity" },
      { type: "unparsed", value: "width" },
    ],
  });
});

test("edit tuple in repeated style", () => {
  const $filter = createComputedStyleDeclStore("filter");
  addRepeatedStyleItem(
    [$filter.get()],
    parseCssFragment("blur(5px)", "filter")
  );
  addRepeatedStyleItem(
    [$filter.get()],
    parseCssFragment("brightness(0.5)", "filter")
  );
  editRepeatedStyleItem(
    [$filter.get()],
    1,
    parseCssFragment("contrast(200%)", "filter")
  );
  expect($filter.get().cascadedValue).toEqual({
    type: "tuple",
    value: [
      {
        type: "function",
        name: "blur",
        args: {
          type: "tuple",
          value: [{ type: "unit", unit: "px", value: 5 }],
        },
      },
      {
        type: "function",
        name: "contrast",
        args: {
          type: "tuple",
          value: [{ type: "unit", unit: "%", value: 200 }],
        },
      },
    ],
  });
});

test("delete layer from repeated style", () => {
  const $transitionProperty =
    createComputedStyleDeclStore("transitionProperty");
  addRepeatedStyleItem(
    [$transitionProperty.get()],
    parseCssFragment("opacity", "transitionProperty")
  );
  addRepeatedStyleItem(
    [$transitionProperty.get()],
    parseCssFragment("transform", "transitionProperty")
  );
  deleteRepeatedStyleItem([$transitionProperty.get()], 0);
  expect($transitionProperty.get().cascadedValue).toEqual({
    type: "layers",
    value: [{ type: "unparsed", value: "transform" }],
  });
});

test("delete value without layers from repeated style", () => {
  const $transitionProperty =
    createComputedStyleDeclStore("transitionProperty");
  addRepeatedStyleItem(
    [$transitionProperty.get()],
    parseCssFragment("opacity", "transitionProperty")
  );
  expect($transitionProperty.get().source.name).toEqual("local");
  deleteRepeatedStyleItem([$transitionProperty.get()], 0);
  expect($transitionProperty.get().source.name).toEqual("default");
  expect($transitionProperty.get().cascadedValue).toEqual({
    type: "keyword",
    value: "all",
  });
});

test("delete tuple from repeated style", () => {
  const $filter = createComputedStyleDeclStore("filter");
  addRepeatedStyleItem(
    [$filter.get()],
    parseCssFragment("blur(5px)", "filter")
  );
  addRepeatedStyleItem(
    [$filter.get()],
    parseCssFragment("brightness(0.5)", "filter")
  );
  deleteRepeatedStyleItem([$filter.get()], 0);
  expect($filter.get().cascadedValue).toEqual({
    type: "tuple",
    value: [
      {
        type: "function",
        name: "brightness",
        args: {
          type: "tuple",
          value: [{ type: "unit", unit: "number", value: 0.5 }],
        },
      },
    ],
  });
});

test("toggle layer in repeated style", () => {
  const $transitionProperty =
    createComputedStyleDeclStore("transitionProperty");
  addRepeatedStyleItem(
    [$transitionProperty.get()],
    parseCssFragment("opacity", "transitionProperty")
  );
  addRepeatedStyleItem(
    [$transitionProperty.get()],
    parseCssFragment("transform", "transitionProperty")
  );
  toggleRepeatedStyleItem([$transitionProperty.get()], 0);
  expect($transitionProperty.get().cascadedValue).toEqual({
    type: "layers",
    value: [
      { type: "unparsed", value: "opacity", hidden: true },
      { type: "unparsed", value: "transform" },
    ],
  });
  toggleRepeatedStyleItem([$transitionProperty.get()], 0);
  expect($transitionProperty.get().cascadedValue).toEqual({
    type: "layers",
    value: [
      { type: "unparsed", value: "opacity", hidden: false },
      { type: "unparsed", value: "transform" },
    ],
  });
});

test("toggle tuple in repeated style", () => {
  const $filter = createComputedStyleDeclStore("filter");
  addRepeatedStyleItem(
    [$filter.get()],
    parseCssFragment("blur(5px)", "filter")
  );
  addRepeatedStyleItem(
    [$filter.get()],
    parseCssFragment("brightness(0.5)", "filter")
  );
  toggleRepeatedStyleItem([$filter.get()], 0);
  expect($filter.get().cascadedValue).toEqual({
    type: "tuple",
    value: [
      {
        type: "function",
        name: "blur",
        args: {
          type: "tuple",
          value: [{ type: "unit", unit: "px", value: 5 }],
        },
        hidden: true,
      },
      {
        type: "function",
        name: "brightness",
        args: {
          type: "tuple",
          value: [{ type: "unit", unit: "number", value: 0.5 }],
        },
      },
    ],
  });
  toggleRepeatedStyleItem([$filter.get()], 0);
  expect($filter.get().cascadedValue).toEqual({
    type: "tuple",
    value: [
      {
        type: "function",
        name: "blur",
        args: {
          type: "tuple",
          value: [{ type: "unit", unit: "px", value: 5 }],
        },
        hidden: false,
      },
      {
        type: "function",
        name: "brightness",
        args: {
          type: "tuple",
          value: [{ type: "unit", unit: "number", value: 0.5 }],
        },
      },
    ],
  });
});

test("swap layers in repeated style", () => {
  const $transitionProperty =
    createComputedStyleDeclStore("transitionProperty");
  addRepeatedStyleItem(
    [$transitionProperty.get()],
    parseCssFragment("opacity", "transitionProperty")
  );
  addRepeatedStyleItem(
    [$transitionProperty.get()],
    parseCssFragment("transform", "transitionProperty")
  );
  swapRepeatedStyleItems([$transitionProperty.get()], 0, 1);
  expect($transitionProperty.get().cascadedValue).toEqual({
    type: "layers",
    value: [
      { type: "unparsed", value: "transform" },
      { type: "unparsed", value: "opacity" },
    ],
  });
});

test("add tuple items in repeated style", () => {
  const $filter = createComputedStyleDeclStore("filter");
  addRepeatedStyleItem(
    [$filter.get()],
    parseCssFragment("blur(5px)", "filter")
  );
  addRepeatedStyleItem(
    [$filter.get()],
    parseCssFragment("brightness(0.5)", "filter")
  );
  swapRepeatedStyleItems([$filter.get()], 0, 1);
  expect($filter.get().cascadedValue).toEqual({
    type: "tuple",
    value: [
      {
        type: "function",
        name: "brightness",
        args: {
          type: "tuple",
          value: [{ type: "unit", unit: "number", value: 0.5 }],
        },
      },
      {
        type: "function",
        name: "blur",
        args: {
          type: "tuple",
          value: [{ type: "unit", unit: "px", value: 5 }],
        },
      },
    ],
  });
});
