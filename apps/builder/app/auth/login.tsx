import {
  AccessibleIcon,
  Box,
  Button,
  css,
  Flex,
  globalCss,
  Text,
  TextField,
  theme,
} from "@webstudio-is/design-system";
import {
  CommitIcon,
  GithubIcon,
  GoogleIcon,
  WebstudioIcon,
} from "@webstudio-is/icons";
// eslint-disable-next-line import/no-internal-modules
import interFont from "@fontsource/inter/variable.css";
// eslint-disable-next-line import/no-internal-modules
import manropeVariableFont from "@fontsource/manrope/variable.css";
import { LoginButton } from "./login-button";
import { Form, useLoaderData } from "@remix-run/react";
import { authPath } from "~/shared/router-utils";
import { useState } from "react";

export const links = () => [
  { rel: "stylesheet", href: interFont },
  { rel: "stylesheet", href: manropeVariableFont },
];

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

export const Login = ({ errorMessage }: { errorMessage: string }) => {
  globalStyles();
  const [isDevLoginOpen, openDevLogin] = useState(false);
  const data = useLoaderData();
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
            <WebstudioIcon width="112" height="84" />
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
        <Text variant="bigTitle" color="main" as="h1">
          Sign in
        </Text>
        <Flex direction="column" gap="4">
          <Flex gap="3" direction="column">
            <Form action={authPath({ provider: "github" })} method="post">
              <LoginButton
                disabled={data.isGithubEnabled === false}
                icon={<GithubIcon size={22} />}
              >
                Login with GitHub
              </LoginButton>
            </Form>
            <Form action={authPath({ provider: "google" })} method="post">
              <LoginButton
                disabled={data.isGoogleEnabled === false}
                icon={<GoogleIcon size={22} />}
              >
                Login with Google
              </LoginButton>
            </Form>
            {data.isDevLogin &&
              (isDevLoginOpen ? (
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
              ) : (
                <LoginButton
                  disabled={data.isDevLogin === false}
                  isDevLogin
                  onClick={() => openDevLogin(true)}
                  icon={<CommitIcon size={22} />}
                >
                  Login with Secret
                </LoginButton>
              ))}
          </Flex>
          {errorMessage.length ? (
            <Text align="center" color="destructive">
              {errorMessage}
            </Text>
          ) : null}
        </Flex>
      </Flex>
    </Box>
  );
};
