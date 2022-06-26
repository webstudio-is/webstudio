import { InstanceNode } from "./nodes/node-instance";
import { darkTheme } from "./themes/dark";

export const config = {
  namespace: "example",
  theme: darkTheme,
  onError(error: Error) {
    throw error;
  },
  nodes: [InstanceNode],
};
