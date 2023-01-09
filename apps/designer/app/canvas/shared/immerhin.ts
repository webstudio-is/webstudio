import { allUserPropsContainer } from "@webstudio-is/react-sdk";
import store from "immerhin";
import {
  rootInstanceContainer,
  breakpointsContainer,
  designTokensContainer,
  stylesContainer,
} from "~/shared/nano-states";

export const registerContainers = () => {
  store.register("breakpoints", breakpointsContainer);
  store.register("root", rootInstanceContainer);
  store.register("styles", stylesContainer);
  store.register("props", allUserPropsContainer);
  store.register("designTokens", designTokensContainer);
};
