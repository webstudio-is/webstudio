import { TooltipProvider } from "@radix-ui/react-tooltip";
import {
  AccessibleIcon,
  Box,
  css,
  Flex,
  globalCss,
  Text,
  theme,
} from "@webstudio-is/design-system";
import { GithubIcon, GoogleIcon, WebstudioIcon } from "@webstudio-is/icons";
import { LoginButton } from "./login-button";
import { Form } from "@remix-run/react";
import { authPath } from "~/shared/router-utils";
import { SecretLogin } from "./secret-login";

const globalStyles = globalCss({
  body: {
    margin: 0,
    background: theme.colors.backgroundPanel,
  },
});

const layoutStyle = css({
  display: "flex",
  height: "100vh",
  flexDirection: "column",
  "@tablet": {
    flexDirection: "row",
  },
});

const sidebarStyle = css({
  flexBasis: "35%",
  "@tablet": {
    background: `
      radial-gradient(65.88% 47.48% at 50% 50%, #FFFFFF 0%, rgba(255, 255, 255, 0) 100%),
      linear-gradient(0deg, rgba(255, 255, 255, 0) 49.46%, rgba(255, 255, 255, 0.33) 100%),
      linear-gradient(180deg, rgba(255, 174, 60, 0) 0%, rgba(230, 60, 254, 0.33) 100%),
      radial-gradient(211.58% 161.63% at 3.13% 100%, rgba(255, 174, 60, 0.3) 0%, rgba(227, 53, 255, 0) 100%),
      radial-gradient(107.1% 32.15% at 92.96% 5.04%, rgba(53, 255, 182, 0.2) 0%, rgba(74, 78, 250, 0.2) 100%), #EBFFFC;
    `,
  },
});

type LoginProps = {
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
    <Box className={layoutStyle()}>
      <Flex
        align="center"
        justify="center"
        as="aside"
        className={sidebarStyle()}
      >
        <a href="https://webstudio.is" aria-label="Go to webstudio.is">
          <AccessibleIcon label="Logo">
            <WebstudioIcon size="100" />
          </AccessibleIcon>
        </a>
      </Flex>
      <Flex
        align="center"
        direction="column"
        grow
        as="main"
        gap={6}
        css={{
          "@tablet": {
            justifyContent: "center",
          },
        }}
      >
        <Text variant="brandMediumTitle" color="main" as="h1">
          Sign In
        </Text>
        <Flex direction="column" gap="4">
          <TooltipProvider>
            <Flex gap="3" direction="column">
              <Form action={authPath({ provider: "google" })} method="post">
                <LoginButton
                  disabled={isGoogleEnabled === false}
                  icon={<GoogleIcon size={22} />}
                >
                  Sign in with Google
                </LoginButton>
              </Form>
              <Form action={authPath({ provider: "github" })} method="post">
                <LoginButton
                  disabled={isGithubEnabled === false}
                  icon={<GithubIcon size={22} />}
                >
                  Sign in with GitHub
                </LoginButton>
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
    </Box>
  );
};
