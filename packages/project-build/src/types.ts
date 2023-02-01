import type { Instance } from "./schema/instances";
import type { Props } from "./schema/props";
import type { StyleSourceSelections } from "./schema/style-sources";

export type Tree = {
  id: string;
  projectId: string;
  buildId: string;
  root: Instance;
  props: Props;
  styleSourceSelections: StyleSourceSelections;
};
