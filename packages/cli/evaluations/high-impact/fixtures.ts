export type EvaluationPage = {
  id: string;
  name: string;
  path: string;
  rootInstanceId: string;
};

export type EvaluationInstance = {
  id: string;
  component: string;
  tag?: string;
  label?: string;
  children: Array<
    | { type: "id"; value: string }
    | { type: "text"; value: string }
    | { type: "expression"; value: string }
  >;
};

export type EvaluationProp = {
  id: string;
  instanceId: string;
  name: string;
  type: string;
  value: unknown;
};

export type EvaluationStyle = {
  styleSourceId: string;
  breakpointId: string;
  property: string;
  value: unknown;
};

export type EvaluationProject = {
  pages: EvaluationPage[];
  instances: EvaluationInstance[];
  props: EvaluationProp[];
  dataSources: Array<Record<string, unknown>>;
  resources: Array<Record<string, unknown>>;
  breakpoints: Array<{
    id: string;
    label: string;
    minWidth?: number;
    maxWidth?: number;
  }>;
  styleSources: Array<
    { type: "token"; id: string; name: string } | { type: "local"; id: string }
  >;
  styleSourceSelections: Array<{ instanceId: string; values: string[] }>;
  styles: EvaluationStyle[];
};

export type HighImpactFixture = {
  id: "authenticated-page-v1" | "design-input-v1";
  objective: string;
  project: EvaluationProject;
};

const homePage: EvaluationPage = {
  id: "home",
  name: "Home",
  path: "",
  rootInstanceId: "home-root",
};

const emptyProject = (): EvaluationProject => ({
  pages: [homePage],
  instances: [
    {
      id: "home-root",
      component: "Body",
      tag: "body",
      children: [{ type: "id", value: "home-main" }],
    },
    {
      id: "home-main",
      component: "Box",
      tag: "main",
      children: [{ type: "text", value: "Northstar workspace" }],
    },
  ],
  props: [],
  dataSources: [],
  resources: [],
  breakpoints: [
    { id: "base", label: "Base" },
    { id: "tablet", label: "Tablet", maxWidth: 991 },
    { id: "mobile", label: "Mobile portrait", maxWidth: 479 },
  ],
  styleSources: [],
  styleSourceSelections: [],
  styles: [],
});

export const authenticatedPageFixture: HighImpactFixture = {
  id: "authenticated-page-v1",
  objective:
    "Add an editable /account page using the project's existing authentication convention. Cover signed-out, loading, signed-in, and failed-auth UI states, then audit and visually verify the states. Do not persist credentials or private session data.",
  project: {
    ...emptyProject(),
    resources: [
      {
        id: "supabase-session",
        name: "Supabase session via server",
        method: "get",
        url: '"/api/auth/session"',
        headers: [],
        searchParams: [],
      },
    ],
    dataSources: [
      {
        id: "supabase-session-data",
        type: "resource",
        name: "Supabase session",
        scopeInstanceId: "home-root",
        resourceId: "supabase-session",
      },
      {
        id: "auth-preview-state",
        type: "variable",
        name: "Auth preview state",
        scopeInstanceId: "home-root",
        value: { type: "string", value: "signed-out" },
      },
    ],
  },
};

export const designInputFixture: HighImpactFixture & {
  designReference: {
    desktop: Record<string, unknown>;
    mobile: Record<string, unknown>;
  };
} = {
  id: "design-input-v1",
  objective:
    "Build an editable /summer page from the supplied desktop and mobile design reference. Preserve and reuse the existing design system, implement responsive behavior with the project's breakpoints, then run rendered audit and inspect desktop/mobile screenshots.",
  project: {
    ...emptyProject(),
    styleSources: [
      { type: "token", id: "token-brand", name: "Brand / Coral" },
      { type: "token", id: "token-ink", name: "Text / Ink" },
      { type: "token", id: "token-heading", name: "Type / Heading" },
      { type: "local", id: "home-main-local" },
    ],
    styleSourceSelections: [
      {
        instanceId: "home-main",
        values: ["token-ink", "token-heading", "home-main-local"],
      },
    ],
    styles: [
      {
        styleSourceId: "token-brand",
        breakpointId: "base",
        property: "background-color",
        value: { type: "rgb", r: 238, g: 101, b: 82, alpha: 1 },
      },
      {
        styleSourceId: "token-ink",
        breakpointId: "base",
        property: "color",
        value: { type: "rgb", r: 30, g: 35, b: 41, alpha: 1 },
      },
      {
        styleSourceId: "token-heading",
        breakpointId: "base",
        property: "font-family",
        value: { type: "fontFamily", value: ["Manrope", "sans-serif"] },
      },
      {
        styleSourceId: "home-main-local",
        breakpointId: "base",
        property: "max-width",
        value: { type: "unit", unit: "px", value: 1200 },
      },
    ],
  },
  designReference: {
    desktop: {
      viewport: { width: 1440, height: 900 },
      structure: ["header", "main", "hero", "featured trips", "footer"],
      hero: {
        heading: "Find your latitude",
        alignment: "left",
        columns: 2,
      },
      featuredTrips: { columns: 3 },
    },
    mobile: {
      viewport: { width: 390, height: 844 },
      structure: ["header", "main", "hero", "featured trips", "footer"],
      hero: { alignment: "left", columns: 1 },
      featuredTrips: { columns: 1 },
      navigation: "collapsed",
    },
  },
};

export const highImpactFixtures = [
  authenticatedPageFixture,
  designInputFixture,
] as const;

export const validateHighImpactFixture = (fixture: HighImpactFixture) => {
  const failures: string[] = [];
  const instanceIds = new Set(
    fixture.project.instances.map((instance) => instance.id)
  );
  if (
    fixture.project.pages.some(
      (page) => instanceIds.has(page.rootInstanceId) === false
    )
  ) {
    failures.push(
      "Every fixture page must reference an existing root instance."
    );
  }
  if (
    fixture.project.breakpoints.some(
      (breakpoint) => breakpoint.id === "base"
    ) === false
  ) {
    failures.push("Every fixture must define a base breakpoint.");
  }
  if (fixture.id === "authenticated-page-v1") {
    const source = JSON.stringify(fixture.project).toLowerCase();
    if (
      source.includes("supabase") === false ||
      source.includes("/api/auth/session") === false
    ) {
      failures.push(
        "The auth fixture must expose its existing server-mediated Supabase convention."
      );
    }
  }
  if (fixture.id === "design-input-v1") {
    const designFixture = fixture as typeof designInputFixture;
    const desktopWidth = Number(
      (designFixture.designReference.desktop.viewport as { width?: unknown })
        .width
    );
    const mobileWidth = Number(
      (designFixture.designReference.mobile.viewport as { width?: unknown })
        .width
    );
    if (desktopWidth < 1200 || mobileWidth > 479) {
      failures.push(
        "The design fixture must include familiar desktop and mobile references."
      );
    }
    if (
      fixture.project.styleSources.some((source) => source.type === "token") ===
      false
    ) {
      failures.push(
        "The design fixture must include an existing design-token baseline."
      );
    }
  }
  return { valid: failures.length === 0, failures };
};
