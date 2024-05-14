import { test, expect } from "@jest/globals";
import { calcCanvasWidth } from "./calc-canvas-width";

const breakpoints = [
  { id: "0", label: "Base" },
  { id: "1", label: "Tablet", maxWidth: 991 },
  { id: "2", label: "Mobile landscape", maxWidth: 767 },
  { id: "3", label: "Mobile portrait", maxWidth: 479 },
  { id: "4", label: "Large", minWidth: 1280 },
  { id: "5", label: "Extra Large", minWidth: 1440 },
];

test("base default - using maximum available workspace while not entering any of the breakpoints", () => {
  const workspaceWidth = 1000;
  expect(
    calcCanvasWidth(breakpoints, breakpoints[0], workspaceWidth)
  ).toStrictEqual(workspaceWidth);
});

test("base while workspace is small", () => {
  expect(calcCanvasWidth(breakpoints, breakpoints[0], 500)).toStrictEqual(992);
});

test("base and min-width only", () => {
  const workspaceWidth = 1000;

  const breakpoints = [
    { id: "0", label: "Base" },
    { id: "4", label: "Large", minWidth: 1280 },
    { id: "5", label: "Extra Large", minWidth: 1440 },
  ];
  expect(
    calcCanvasWidth(breakpoints, breakpoints[0], workspaceWidth)
  ).toStrictEqual(workspaceWidth);
});

test("base and max-width only", () => {
  const workspaceWidth = 1000;

  const breakpoints = [
    { id: "0", label: "Base" },
    { id: "1", label: "Tablet", maxWidth: 991 },
    { id: "2", label: "Mobile landscape", maxWidth: 767 },
    { id: "3", label: "Mobile portrait", maxWidth: 479 },
  ];
  expect(
    calcCanvasWidth(breakpoints, breakpoints[0], workspaceWidth)
  ).toStrictEqual(workspaceWidth);
});

test("base only", () => {
  const workspaceWidth = 1000;
  const breakpoints = [{ id: "0", label: "Base" }];
  expect(
    calcCanvasWidth(breakpoints, breakpoints[0], workspaceWidth)
  ).toStrictEqual(workspaceWidth);
});

test("tablet", () => {
  const workspaceWidth = 1000;
  expect(
    calcCanvasWidth(breakpoints, breakpoints[1], workspaceWidth)
  ).toStrictEqual(768);
});
test("mobile landscape", () => {
  const workspaceWidth = 1000;
  expect(
    calcCanvasWidth(breakpoints, breakpoints[2], workspaceWidth)
  ).toStrictEqual(480);
});
test("mobile portrait", () => {
  const workspaceWidth = 1000;
  expect(
    calcCanvasWidth(breakpoints, breakpoints[3], workspaceWidth)
  ).toStrictEqual(320);
});
test("large", () => {
  const workspaceWidth = 1000;
  expect(
    calcCanvasWidth(breakpoints, breakpoints[4], workspaceWidth)
  ).toStrictEqual(1280);
});
test("extra large", () => {
  const workspaceWidth = 1000;
  expect(
    calcCanvasWidth(breakpoints, breakpoints[5], workspaceWidth)
  ).toStrictEqual(1440);
});

test("0 min-width", () => {
  const workspaceWidth = 1000;
  const breakpoints = [{ id: "0", label: "x", minWidth: 0 }];
  expect(
    calcCanvasWidth(breakpoints, breakpoints[0], workspaceWidth)
  ).toStrictEqual(320);
});

test("low min-width", () => {
  const workspaceWidth = 1000;
  const breakpoints = [{ id: "0", label: "x", minWidth: 123 }];
  expect(
    calcCanvasWidth(breakpoints, breakpoints[0], workspaceWidth)
  ).toStrictEqual(123);
});

test("no previous max-width", () => {
  const workspaceWidth = 1000;
  const breakpoints = [{ id: "0", label: "x", maxWidth: 100 }];
  expect(
    calcCanvasWidth(breakpoints, breakpoints[0], workspaceWidth)
  ).toStrictEqual(320);
});
