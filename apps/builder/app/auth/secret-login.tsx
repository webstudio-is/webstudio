import { Button, Flex, InputField, theme } from "@webstudio-is/design-system";
import { useState } from "react";
import { authPath } from "~/shared/router-utils";

export const SecretLogin = () => {
  const [show, setShow] = useState(false);
  if (show) {
    return (
      <form
        method="post"
        action={authPath({ provider: "dev" })}
        style={{ display: "contents" }}
      >
        <Flex gap="2">
          <InputField
            name="secret"
            type="text"
            minLength={2}
            required
            autoFocus
            placeholder="Auth secret"
            css={{ flexGrow: 1 }}
          />
          <Button type="submit">Login</Button>
        </Flex>
      </form>
    );
  }

  return (
    <Button
      onClick={() => setShow(true)}
      color="neutral"
      css={{ height: theme.spacing[15] }}
    >
      Login with Secret
    </Button>
  );
};
