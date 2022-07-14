import { allUserPropsContainer } from "@webstudio-is/react-sdk";
import store from "immerhin";
import {
  rootInstanceContainer,
  breakpointsContainer,
} from "~/shared/nano-states";

export const registerContainers = () => {
  store.register("breakpoints", breakpointsContainer);
  store.register("root", rootInstanceContainer);
  store.register("props", allUserPropsContainer);
};
