import { type Instance, useSubscribe } from "@webstudio-is/sdk";
import { useTextEditingInstanceId } from "~/shared/nano-states";

export const useSubscribeTextEditingInstanceId = () => {
  const [, setInstanceId] = useTextEditingInstanceId();
  useSubscribe<"textEditingInstanceId", Instance["id"] | undefined>(
    "textEditingInstanceId",
    setInstanceId
  );
};
