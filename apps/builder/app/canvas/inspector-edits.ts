import { $inspectorLastInputTime, $props } from "~/shared/nano-states";
import { setInert } from "./shared/inert";

export const subscribeInspectorEdits = () => {
  const unsubscribeInputTime = $inspectorLastInputTime.listen(setInert);
  const unsubscribeProps = $props.listen(setInert);

  return () => {
    unsubscribeInputTime();
    unsubscribeProps();
  };
};
