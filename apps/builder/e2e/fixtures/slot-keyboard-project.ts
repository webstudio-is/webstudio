import { createSeededBuilderProject } from "./builder-project";

export type SeededSlotKeyboardProject = {
  projectId: string;
  builderToken: string;
};

const getBaseBreakpointId = (breakpoints: string) => {
  const parsedBreakpoints = JSON.parse(breakpoints) as Array<{
    id: string;
    minWidth?: number;
    maxWidth?: number;
  }>;
  return (
    parsedBreakpoints.find(
      (breakpoint) =>
        breakpoint.minWidth === undefined && breakpoint.maxWidth === undefined
    )?.id ??
    parsedBreakpoints.at(0)?.id ??
    "base"
  );
};

const createSlotKeyboardBuildData = ({
  pages,
  breakpoints,
}: {
  pages: string;
  breakpoints: string;
}) => {
  const rootInstanceId = "slot-keyboard-body";
  const wrapperId = "slot-keyboard-wrapper";
  const slotAId = "slot-keyboard-slot-a";
  const slotBId = "slot-keyboard-slot-b";
  const fragmentId = "slot-keyboard-fragment";
  const divId = "slot-keyboard-div";
  const headingId = "slot-keyboard-heading";
  const baseBreakpointId = getBaseBreakpointId(breakpoints);
  const wrapperStyleSourceId = "slot-keyboard-wrapper-style";
  const divStyleSourceId = "slot-keyboard-div-style";
  const headingStyleSourceId = "slot-keyboard-heading-style";

  const nextPages = JSON.parse(pages) as {
    homePageId: string;
    pages: Array<{ id: string; rootInstanceId: string }>;
  };
  const homePage = nextPages.pages.find(
    (page) => page.id === nextPages.homePageId
  );
  if (homePage === undefined) {
    throw new Error("Expected existing build to have a home page");
  }
  homePage.rootInstanceId = rootInstanceId;

  return {
    pages: JSON.stringify(nextPages),
    instances: JSON.stringify([
      {
        type: "instance",
        id: rootInstanceId,
        component: "ws:element",
        tag: "body",
        children: [{ type: "id", value: wrapperId }],
      },
      {
        type: "instance",
        id: wrapperId,
        component: "ws:element",
        tag: "main",
        label: "Slot Keyboard Wrapper",
        children: [
          { type: "id", value: slotAId },
          { type: "id", value: slotBId },
        ],
      },
      {
        type: "instance",
        id: slotAId,
        component: "Slot",
        label: "Slot A",
        children: [{ type: "id", value: fragmentId }],
      },
      {
        type: "instance",
        id: slotBId,
        component: "Slot",
        label: "Slot B",
        children: [{ type: "id", value: fragmentId }],
      },
      {
        type: "instance",
        id: fragmentId,
        component: "Fragment",
        children: [
          { type: "id", value: divId },
          { type: "id", value: headingId },
        ],
      },
      {
        type: "instance",
        id: divId,
        component: "ws:element",
        tag: "div",
        label: "Drop Div",
        children: [{ type: "text", value: "Drop zone" }],
      },
      {
        type: "instance",
        id: headingId,
        component: "ws:element",
        tag: "h1",
        label: "Slot Heading",
        children: [{ type: "text", value: "Slot heading" }],
      },
    ]),
    props: JSON.stringify([]),
    styleSources: JSON.stringify([
      { type: "local", id: wrapperStyleSourceId },
      { type: "local", id: divStyleSourceId },
      { type: "local", id: headingStyleSourceId },
    ]),
    styleSourceSelections: JSON.stringify([
      { instanceId: wrapperId, values: [wrapperStyleSourceId] },
      { instanceId: divId, values: [divStyleSourceId] },
      { instanceId: headingId, values: [headingStyleSourceId] },
    ]),
    styles: JSON.stringify([
      {
        styleSourceId: wrapperStyleSourceId,
        breakpointId: baseBreakpointId,
        property: "display",
        value: { type: "keyword", value: "grid" },
      },
      {
        styleSourceId: wrapperStyleSourceId,
        breakpointId: baseBreakpointId,
        property: "gap",
        value: { type: "unit", unit: "px", value: 32 },
      },
      {
        styleSourceId: divStyleSourceId,
        breakpointId: baseBreakpointId,
        property: "minHeight",
        value: { type: "unit", unit: "px", value: 120 },
      },
      {
        styleSourceId: divStyleSourceId,
        breakpointId: baseBreakpointId,
        property: "padding",
        value: { type: "unit", unit: "px", value: 24 },
      },
      {
        styleSourceId: headingStyleSourceId,
        breakpointId: baseBreakpointId,
        property: "marginTop",
        value: { type: "unit", unit: "px", value: 24 },
      },
    ]),
    dataSources: JSON.stringify([]),
    resources: JSON.stringify([]),
    marketplaceProduct: JSON.stringify({}),
  };
};

export const createSlotKeyboardProject = async ({
  email = "slot-keyboard-e2e@webstudio.test",
  title = "Slot Keyboard E2E",
  builderToken = "slot-keyboard-e2e-builder-token",
}: {
  email?: string;
  title?: string;
  builderToken?: string;
} = {}): Promise<SeededSlotKeyboardProject> => {
  return await createSeededBuilderProject({
    email,
    title,
    builderToken,
    createBuildUpdate: (build) =>
      createSlotKeyboardBuildData({
        pages: build.pages,
        breakpoints: build.breakpoints,
      }),
  });
};
