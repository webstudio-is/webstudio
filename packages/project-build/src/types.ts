import type { Instance } from "./schema/instances";
import type { Props } from "./schema/props";
import type { Styles } from "./schema/styles";

export type Tree = {
  id: string;
  projectId: string;
  buildId: string;
  root: Instance;
  props: Props;
  styles: Styles;
};
