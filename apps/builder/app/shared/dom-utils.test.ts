/**
 * @vitest-environment jsdom
 */

import { test, expect, beforeEach } from "vitest";
import {
  getAllElementsByInstanceSelector,
  getVisibleElementsByInstanceSelector,
} from "./dom-utils";

beforeEach(() => {
  document.body.innerHTML = `
  <div data-ws-selector="box,body">
    <select data-ws-selector="select,box,body">
      <option data-ws-selector="option,select,box,body">test</option>
    </select>
    <div style="display:fixed;" data-ws-selector="box-fixed,body"></div>
    <div style="display:none;" data-ws-selector="box-none,body"></div>
  </div>`;

  document.body.setAttribute("data-ws-selector", "body");
});

test("Select body element", () => {
  expect(getVisibleElementsByInstanceSelector(["body"])).toEqual([
    document.body,
  ]);
});

test("getVisibleElementsByInstanceSelector selects select element", () => {
  expect(
    getVisibleElementsByInstanceSelector(["option", "select", "box", "body"])
  ).toEqual([document.querySelector("select")]);
});

test("getAllElementsByInstanceSelector selects option element", () => {
  expect(
    getAllElementsByInstanceSelector(["option", "select", "box", "body"])
  ).toEqual([document.querySelector("option")]);
});

test("getVisibleElementsByInstanceSelector selects parent of box-none element", () => {
  expect(getVisibleElementsByInstanceSelector(["box-none", "body"])).toEqual([
    document.querySelector("[data-ws-selector='box,body']"),
  ]);
});

test("getAllElementsByInstanceSelector selects box-none element", () => {
  expect(getAllElementsByInstanceSelector(["box-none", "body"])).toEqual([
    document.querySelector("[data-ws-selector='box-none,body']"),
  ]);
});
