export { useSubscribe } from "@webstudio-is/sdk";

export const publish = <Type, Payload = undefined>(action: {
  type: Type;
  payload?: Payload;
}) => {
  window.parent.postMessage(action, "*");
  window.postMessage(action, "*");
};
