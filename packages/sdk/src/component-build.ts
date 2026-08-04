import type { Instances } from "./schema/instances";
import type { Props } from "./schema/props";
import type { WsComponentMeta } from "./schema/component-meta";
import type { Scope } from "./scope";

export type ComponentBuildImport = {
  source: string;
  imported?: string;
  local: string;
};

export type ComponentBuildContribution = {
  imports: ComponentBuildImport[];
  declarations: string[];
};

export type ComponentBuildHook = {
  component: string;
  build: (context: {
    instances: Instances;
    props: Props;
    meta: WsComponentMeta | undefined;
    scope: Scope;
  }) =>
    | ComponentBuildContribution
    | undefined
    | Promise<ComponentBuildContribution | undefined>;
};
