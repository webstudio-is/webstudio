import { InstanceNode } from "./nodes/instance";
import { darkTheme } from "./themes/dark";

export const config = {
  theme: darkTheme,
  onError(error) {
    throw error;
  },
  nodes: [InstanceNode],
};
