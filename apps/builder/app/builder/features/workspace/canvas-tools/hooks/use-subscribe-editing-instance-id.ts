import { useSubscribe } from "~/shared/pubsub";
import { useTextEditingInstanceId } from "~/shared/nano-states";

export const useSubscribeTextEditingInstanceId = () => {
  const [, setInstanceId] = useTextEditingInstanceId();
  useSubscribe("textEditingInstanceId", setInstanceId);
};
