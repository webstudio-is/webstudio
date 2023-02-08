import type { Instance } from "./schema/instances";
import type { Prop } from "./schema/props";
import type { StyleSourceSelections } from "./schema/style-sources";

export type Tree = {
  id: string;
  projectId: string;
  buildId: string;
  root: Instance;
  props: [Prop["id"], Prop][];
  styleSourceSelections: StyleSourceSelections;
};
