import { Button, Flex, InputField, theme } from "@webstudio-is/design-system";
import { useState } from "react";
import { authPath } from "~/shared/router-utils";

type SecretLoginProps = {
  devPlanNames?: string[];
};

export const SecretLogin = ({ devPlanNames }: SecretLoginProps) => {
  const [show, setShow] = useState(false);
  if (show) {
    return (
      <form
        method="post"
        action={authPath({ provider: "dev" })}
        style={{ display: "contents" }}
      >
        <Flex gap="2" direction="column">
          <InputField
            name="secret"
            type="text"
            minLength={2}
            required
            autoFocus
            placeholder="Auth secret"
          />
          <InputField
            name="email"
            type="email"
            placeholder="Email (optional)"
          />
          <select name="devPlan">
            <option value="">Default plan</option>
            {devPlanNames?.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
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
