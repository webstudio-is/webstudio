import { Button, Flex, InputField, theme } from "@webstudio-is/design-system";
import { useState } from "react";
import { authPath } from "~/shared/router-utils";

export const SecretLogin = () => {
  const [show, setShow] = useState(false);
  if (show) {
    const action = authPath({ provider: "dev" });
    return (
      <Flex gap="2">
        <InputField
          name="secret"
          type="password"
          minLength={2}
          required
          autoFocus
          placeholder="Auth secret"
          css={{ flexGrow: 1 }}
          formAction={authPath({ provider: "dev" })}
          onKeyDown={(event) => {
            const form = event.currentTarget.form;
            if (event.key === "Enter" && form) {
              form.action = action;
              form.submit();
            }
          }}
        />
        <Button type="submit" formAction={action}>
          Login
        </Button>
      </Flex>
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
