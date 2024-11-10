import type { WsComponentMeta } from "@webstudio-is/react-sdk";
import { toast } from "@webstudio-is/design-system";
import { $registeredComponentMetas } from "~/shared/nano-states";
import {
  findClosestInsertable,
  getComponentTemplateData,
  insertTemplateData,
} from "~/shared/instance-utils";

const formatInsertionError = (component: string, meta: WsComponentMeta) => {
  const or = new Intl.ListFormat("en", {
    type: "disjunction",
  });
  const and = new Intl.ListFormat("en", {
    type: "conjunction",
  });
  const messages: string[] = [];
  if (meta.requiredAncestors) {
    const listString = or.format(meta.requiredAncestors);
    messages.push(`can be added only inside of ${listString}`);
  }
  if (meta.invalidAncestors) {
    const listString = and.format(meta.invalidAncestors);
    messages.push(`cannot be added inside of ${listString}`);
  }
  return `${component} ${and.format(messages)}`;
};

// Insert a component depending on currently selected instance.
// Used for 1-click insert from the components panel.
export const insert = (component: string) => {
  const fragment = getComponentTemplateData(component);
  if (fragment === undefined) {
    return;
  }
  const insertable = findClosestInsertable(fragment);
  if (insertable === undefined) {
    const metas = $registeredComponentMetas.get();
    const meta = metas.get(component);
    if (meta) {
      toast.error(formatInsertionError(component, meta));
    }
    return;
  }
  insertTemplateData(fragment, insertable);
};
