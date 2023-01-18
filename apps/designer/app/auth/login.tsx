import { LinksFunction, MetaFunction } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { Flex, Button, Text, TextField } from "@webstudio-is/design-system";
// eslint-disable-next-line import/no-internal-modules
import interFont from "@fontsource/inter/index.css";
import { GithubIcon, CommitIcon, GoogleIcon } from "@webstudio-is/icons";
import { LoginButton } from "./login-button";
import loginStyles from "./login.css";
import { authPath } from "~/shared/router-utils";
import { theme } from "@webstudio-is/design-system";

export const links: LinksFunction = () => {
  return [
    {
      rel: "stylesheet",
      href: interFont,
    },
    {
      rel: "stylesheet",
      href: loginStyles,
    },
  ];
};

export const meta: MetaFunction = () => {
  return { title: "Webstudio Login" };
};

export const Login = ({ errorMessage }: { errorMessage: string }) => {
  const [isDevLoginOpen, openDevLogin] = useState(false);
  const data = useLoaderData();

  return (
    <Flex
      css={{ height: "100vh" }}
      direction="column"
      align="center"
      justify="center"
    >
      <Flex direction="column" align="center" gap="3">
        <Flex direction="column" gap="4">
          {errorMessage.length ? (
            <Text align="center" color="error">
              {errorMessage}
            </Text>
          ) : null}
          <Flex gap="2" direction="column">
            <Form action={authPath({ provider: "github" })} method="post">
              <LoginButton
                disabled={data.isGithubEnabled === false}
                icon={<GithubIcon />}
              >
                Login with GitHub
              </LoginButton>
            </Form>
            <Form action={authPath({ provider: "google" })} method="post">
              <LoginButton
                disabled={data.isGoogleEnabled === false}
                icon={<GoogleIcon />}
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
                  icon={<CommitIcon />}
                >
                  Dev Login
                </LoginButton>
              ))}
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
};
