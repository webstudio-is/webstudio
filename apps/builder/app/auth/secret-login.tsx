import { Button, Flex, TextField, theme } from "@webstudio-is/design-system";
import { CommitIcon } from "@webstudio-is/icons";
import { useState } from "react";
import { authPath } from "~/shared/router-utils";
import { LoginButton } from "./login-button";

export const SecretLogin = () => {
  const [isSecretLoginOpen, setIsSecretLoginOpen] = useState(false);
  if (isSecretLoginOpen) {
    return (
      <Flex
        as="form"
        action={authPath({ provider: "dev" })}
        method="post"
        css={{
          width: "fit-content",
          flexDirection: "row",
          gap: theme.spacing[5],
        }}
      >
        <TextField
          name="secret"
          type="text"
          minLength={2}
          required
          autoFocus
          placeholder="Auth secret"
          css={{ flexGrow: 1 }}
        />
        <Button>Login</Button>
      </Flex>
    );
  }

  return (
    <LoginButton
      isSecretLogin
      onClick={() => setIsSecretLoginOpen(true)}
      icon={<CommitIcon size={22} />}
    >
      Login with Secret
    </LoginButton>
  );
};
