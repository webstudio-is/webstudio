import { useEffect, useState } from "react";
import type { Project } from "@webstudio-is/project";
import { $instanceSelectionUpdate } from "~/shared/nano-states/instance-selection";
import type { WritableAtom } from "nanostores";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  getStyleDeclKey,
  type Instance,
  type StyleDecl,
} from "@webstudio-is/sdk";
import * as metas from "@webstudio-is/sdk-components-react/metas";
import { cssVar } from "@webstudio-is/design-system";
import {
  $instances,
  $project,
  $pages,
  $breakpoints,
  $styleSources,
  $styleSourceSelections,
  $styles,
} from "~/shared/sync/data-stores";
import {
  $registeredComponentMetas,
  $selectedPageId,
  $selectedBreakpointId,
  $allSelectedInstanceSelectors,
  $selectedInstanceRenderState,
  $canvasIframeState,
  $authPermit,
  $builderMode,
  selectInstance,
} from "~/shared/nano-states";
import { registerContainers } from "~/shared/sync/sync-stores";
import {
  $activeInspectorPanel,
  $dataLoadingState,
  $activeSidebarPanel,
  setActiveSidebarPanel,
} from "./shared/nano-states";
import { $settings } from "./shared/client-settings";
import { Inspector } from "./inspector";
import { SidebarLeft } from "./sidebar-left/sidebar-left";
import { Footer } from "./features/footer/footer";

registerContainers();
export default { title: "Builder/Panels", component: Inspector };
const preserve = <T,>(store: WritableAtom<T>) => {
  const previous = store.get();
  return () => store.set(previous);
};
type View =
  | "style"
  | "settings"
  | "empty"
  | "multiple"
  | "notMounted"
  | "advanced"
  | "focus"
  | "list"
  | "content"
  | "components"
  | "assets"
  | "sidebar"
  | "footer";
const PanelStory = ({ view }: { view: View }) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const previousSidebar = $activeSidebarPanel.get();
    const restore = [
      preserve($dataLoadingState),
      preserve($canvasIframeState),
      preserve($project),
      preserve($instances),
      preserve($pages),
      preserve($breakpoints),
      preserve($styleSources),
      preserve($styleSourceSelections),
      preserve($styles),
      preserve($registeredComponentMetas),
      preserve($selectedPageId),
      preserve($selectedBreakpointId),
      preserve($allSelectedInstanceSelectors),
      preserve($instanceSelectionUpdate),
      preserve($selectedInstanceRenderState),
      preserve($authPermit),
      preserve($builderMode),
      preserve($activeInspectorPanel),
      () => setActiveSidebarPanel(previousSidebar),
      preserve($settings),
    ];
    const pages = createDefaultPages({ rootInstanceId: "body" });
    const instances: Instance[] = [
      {
        type: "instance",
        id: "body",
        component: "Body",
        children: [{ type: "id", value: "box" }],
      },
      {
        type: "instance",
        id: "box",
        component: view === "list" ? "List" : "Box",
        children: [{ type: "id", value: "text" }],
      },
      {
        type: "instance",
        id: "text",
        component: "Text",
        children: [{ type: "text", value: "Example" }],
      },
    ];
    $registeredComponentMetas.set(new Map(Object.entries(metas)));
    $instances.set(
      new Map(instances.map((instance) => [instance.id, instance]))
    );
    $pages.set(pages);
    $selectedPageId.set(pages.homePageId);
    $breakpoints.set(new Map([["base", { id: "base", label: "Base" }]]));
    $selectedBreakpointId.set("base");
    $styleSources.set(new Map([["local", { id: "local", type: "local" }]]));
    $styleSourceSelections.set(
      new Map([["box", { instanceId: "box", values: ["local"] }]])
    );
    const declarations: StyleDecl[] = [
      {
        breakpointId: "base",
        styleSourceId: "local",
        property: "paddingTop",
        value: { type: "unit", value: 24, unit: "px" },
      },
    ];
    $styles.set(
      new Map(declarations.map((value) => [getStyleDeclKey(value), value]))
    );
    $project.set({ id: "panel-story", title: "Example" } as Project);
    $authPermit.set("own");
    $builderMode.set(view === "content" ? "content" : "design");
    $settings.set({
      ...$settings.get(),
      stylePanelMode:
        view === "advanced" || view === "focus" ? view : "default",
    });
    $activeInspectorPanel.set(
      view === "settings" || view === "content" ? "settings" : "style"
    );
    setActiveSidebarPanel(
      view === "components" || view === "assets" ? view : "none"
    );
    selectInstance(["box", "body"]);
    if (view === "empty") {
      $allSelectedInstanceSelectors.set([]);
    }
    if (view === "multiple") {
      $allSelectedInstanceSelectors.set([
        ["box", "body"],
        ["text", "box", "body"],
      ]);
    }
    $selectedInstanceRenderState.set(
      view === "notMounted" ? "notMounted" : "mounted"
    );
    $dataLoadingState.set("loaded");
    $canvasIframeState.set("ready");
    setReady(true);
    return () => {
      setReady(false);
      for (const reset of restore) {
        reset();
      }
    };
  }, [view]);
  if (!ready) {
    return;
  }
  if (view === "footer") {
    return <Footer />;
  }
  if (view === "sidebar" || view === "components" || view === "assets") {
    return (
      <div style={{ display: "flex", width: 40, height: 800 }}>
        <SidebarLeft publish={() => {}} />
      </div>
    );
  }
  return (
    <div
      style={{
        width: 280,
        height: 850,
        display: "flex",
        flexDirection: "column",
        background: cssVar("--background-primary"),
      }}
    >
      <Inspector navigatorLayout="undocked" />
    </div>
  );
};
export const Style = () => <PanelStory view="style" />;
export const Settings = () => <PanelStory view="settings" />;
export const Empty = () => <PanelStory view="empty" />;
export const Multiple = () => <PanelStory view="multiple" />;
export const NotMounted = () => <PanelStory view="notMounted" />;
export const Advanced = () => <PanelStory view="advanced" />;
export const FocusMode = () => <PanelStory view="focus" />;
export const ListItem = () => <PanelStory view="list" />;
export const ContentMode = () => <PanelStory view="content" />;
export const Components = () => <PanelStory view="components" />;
export const Assets = () => <PanelStory view="assets" />;
export const Sidebar = () => <PanelStory view="sidebar" />;
export const Breadcrumbs = () => <PanelStory view="footer" />;
