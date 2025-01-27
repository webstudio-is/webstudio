import { TooltipProvider } from "@radix-ui/react-tooltip";
import {
  Button,
  Flex,
  globalCss,
  rawTheme,
  Text,
  theme,
} from "@webstudio-is/design-system";
import { GithubIcon, GoogleIcon, WebstudioIcon } from "@webstudio-is/icons";
import { Form } from "@remix-run/react";
import { authPath } from "~/shared/router-utils";
import { SecretLogin } from "./secret-login";

const globalStyles = globalCss({
  body: {
    margin: 0,
    overflow: "hidden",
  },
});

export type LoginProps = {
  errorMessage?: string;
  isGithubEnabled?: boolean;
  isGoogleEnabled?: boolean;
  isSecretLoginEnabled?: boolean;
};

export const Login = ({
  errorMessage,
  isGithubEnabled,
  isGoogleEnabled,
  isSecretLoginEnabled,
}: LoginProps) => {
  globalStyles();
  return (
    <Flex
      align="center"
      justify="center"
      css={{
        height: "100vh",
        background: theme.colors.brandBackgroundDashboard,
      }}
    >
      <Flex
        direction="column"
        align="center"
        gap="6"
        css={{
          width: theme.spacing[35],
          minWidth: theme.spacing[20],
          padding: theme.spacing[17],
          borderRadius: theme.spacing[5],
          [`@media (min-width: ${rawTheme.spacing[35]})`]: {
            backgroundColor: `rgba(255, 255, 255, 0.5)`,
          },
        }}
      >
        <WebstudioIcon size={48} />
        <Text variant="brandSectionTitle" as="h1" align="center">
          Welcome to Webstudio
        </Text>

        <TooltipProvider>
          <Flex direction="column" gap="3" css={{ width: "100%" }}>
            <Form method="post" style={{ display: "contents" }}>
              <Button
                disabled={isGoogleEnabled === false}
                prefix={<GoogleIcon size={22} />}
                color="primary"
                css={{ height: theme.spacing[15] }}
                formAction={authPath({ provider: "google" })}
              >
                Sign in with Google
              </Button>
              <Button
                disabled={isGithubEnabled === false}
                prefix={<GithubIcon size={22} fill="currentColor" />}
                color="ghost"
                css={{
                  border: `1px solid ${theme.colors.borderDark}`,
                  height: theme.spacing[15],
                }}
                formAction={authPath({ provider: "github" })}
              >
                Sign in with GitHub
              </Button>
            </Form>
            {isSecretLoginEnabled && <SecretLogin />}
          </Flex>
        </TooltipProvider>
        {errorMessage ? (
          <Text align="center" color="destructive">
            {errorMessage}
          </Text>
        ) : null}
      </Flex>
    </Flex>
  );
};
