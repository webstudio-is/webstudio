import type { Instance } from "./schema/instances";
import type { Prop } from "./schema/props";
import type { StyleSourceSelection } from "./schema/style-source-selections";

export type Tree = {
  id: string;
  projectId: string;
  buildId: string;
  root: Instance;
  props: [Prop["id"], Prop][];
  styleSourceSelections: [Instance["id"], StyleSourceSelection][];
};
