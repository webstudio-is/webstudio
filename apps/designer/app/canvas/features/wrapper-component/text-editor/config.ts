import { InstanceNode } from "./nodes/node-instance";

export const config = {
  namespace: "WsTextEditor",
  onError(error: Error) {
    throw error;
  },
  nodes: [InstanceNode],
};
