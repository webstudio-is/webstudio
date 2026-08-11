import { expect, test } from "vitest";
import {
  findContrastIssues,
  findCrossViewportGeometryIssues,
  findGeometryIssues,
  findImageIssues,
  findResourceIssues,
} from "./audit";

test("finds measurable layout, image, resource, and contrast issues", () => {
  expect(
    findGeometryIssues({
      total: 2,
      sampled: 2,
      truncated: false,
      elements: [
        {
          instanceId: "card",
          tagName: "article",
          x: 0,
          y: 0,
          width: 300,
          height: 200,
          visible: true,
          clippedX: true,
          clippedY: false,
          overlapsWith: ["badge"],
        },
        {
          instanceId: "badge",
          tagName: "div",
          x: 250,
          y: 0,
          width: 100,
          height: 40,
          visible: true,
          clippedX: false,
          clippedY: false,
          overlapsWith: ["card"],
        },
      ],
    }).map(({ kind }) => kind)
  ).toEqual(["clipped-content", "overlapping-elements"]);

  expect(
    findImageIssues({
      viewportHeight: 800,
      images: [
        {
          loading: "eager",
          complete: true,
          naturalWidth: 0,
          naturalHeight: 0,
          renderedWidth: 100,
          renderedHeight: 50,
          top: 900,
        },
        {
          loading: "lazy",
          complete: true,
          naturalWidth: 1000,
          naturalHeight: 800,
          renderedWidth: 200,
          renderedHeight: 150,
          top: 0,
        },
      ],
    }).map(({ kind }) => kind)
  ).toEqual(["broken-image", "oversized-image"]);

  expect(
    findResourceIssues([
      {
        pathname: "/fonts/brand.woff",
        initiatorType: "link",
        transferSize: 10,
        encodedBodySize: 8,
        decodedBodySize: 12,
        duration: 5,
        renderBlockingStatus: "blocking",
      },
    ]).map(({ kind }) => kind)
  ).toEqual(["render-blocking-resource", "legacy-font-format"]);

  expect(
    findContrastIssues([
      {
        instanceId: "copy",
        tagName: "p",
        foreground: "rgb(120, 120, 120)",
        background: "rgb(255, 255, 255)",
        ratio: 4.2,
        requiredRatio: 4.5,
        fontSize: 16,
        fontWeight: 400,
      },
    ])
  ).toHaveLength(1);
});

test("finds persistent hidden content and cross-viewport layout changes", () => {
  const createGeometry = (visible: boolean, x: number, width: number) => ({
    total: 1,
    sampled: 1,
    truncated: false,
    elements: [
      {
        instanceId: "navigation",
        tagName: "nav",
        x,
        y: 0,
        width,
        height: 100,
        visible,
        ...(visible ? {} : { hiddenReason: "display" as const }),
        clippedX: false,
        clippedY: false,
        overlapsWith: [],
      },
    ],
  });
  const mobile = {
    viewportWidth: 390,
    elementGeometry: createGeometry(false, 0, 0),
  };
  const desktop = {
    viewportWidth: 1440,
    elementGeometry: createGeometry(true, 900, 400),
  };
  const issues = findCrossViewportGeometryIssues([mobile, desktop]);

  expect(issues.get(desktop)?.map(({ kind }) => kind)).toEqual([
    "cross-viewport-layout-change",
  ]);
});
