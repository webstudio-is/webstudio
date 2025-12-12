import { Button, Kbd } from "@webstudio-is/design-system";
import { $commandContent } from "../command-state";

export const BackButton = () => {
  return (
    <Button
      tabIndex={-1}
      color="ghost"
      onClick={() => {
        $commandContent.set(undefined);
      }}
    >
      <Kbd value={["backspace"]} /> Back
    </Button>
  );
};
