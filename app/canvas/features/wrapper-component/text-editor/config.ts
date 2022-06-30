import { InstanceNode } from "./nodes/node-instance";

export const config = {
  namespace: "example",
  onError(error: Error) {
    throw error;
  },
  nodes: [InstanceNode],
};
