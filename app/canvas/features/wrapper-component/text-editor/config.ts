import { InstanceNode } from "./nodes/node-instance";

export const config = {
  namespace: "ComponentTextEditor",
  onError(error: Error) {
    throw error;
  },
  nodes: [InstanceNode],
};
