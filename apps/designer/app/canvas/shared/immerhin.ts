import { allUserPropsContainer } from "@webstudio-is/sdk";
import store from "immerhin";
import {
  rootInstanceContainer,
  breakpointsContainer,
} from "apps/designer/app/shared/nano-states";

export const registerContainers = () => {
  store.register("breakpoints", breakpointsContainer);
  store.register("root", rootInstanceContainer);
  store.register("props", allUserPropsContainer);
};
