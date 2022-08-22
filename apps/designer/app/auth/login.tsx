import { LinksFunction, MetaFunction } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { useState } from "react";

import {
  Card,
  Flex,
  Heading,
  TextLegacy,
  TextField,
} from "@webstudio-is/design-system";
import interStyles from "~/shared/font-faces/inter.css";

import { GithubIcon, CommitIcon, GoogleIcon } from "@webstudio-is/icons";
import { LoginButton } from "./components/login-button";
import loginStyles from "./login.css";

export const links: LinksFunction = () => {
  return [
    {
      rel: "stylesheet",
      href: interStyles,
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
      <Card size={2}>
        <Flex direction="column" gap="4" align="center">
          <Heading size="2">Login</Heading>
          {errorMessage.length ? (
            <TextLegacy css={{ textAlign: "center" }} variant="red">
              {errorMessage}
            </TextLegacy>
          ) : null}
          <Flex gap="2" direction="column" align="center">
            <Form action="/auth/github" method="post">
              <LoginButton enabled={data.isGithubEnabled}>
                <Flex gap="1">
                  <GithubIcon width="20" />
                  Login with GitHub
                </Flex>
              </LoginButton>
            </Form>
            <Form action="/auth/google" method="post">
              <LoginButton enabled={data.isGoogleEnabled}>
                <Flex gap="1">
                  <GoogleIcon width="20" />
                  Login with Google
                </Flex>
              </LoginButton>
            </Form>
            {data.isDevLogin && (
              <>
                {isDevLoginOpen ? (
                  <Form action="/auth/dev" method="post">
                    <TextField
                      size={2}
                      css={{ width: "100%", flexGrow: 1 }}
                      name="secret"
                      type="text"
                      minLength={2}
                      required
                      autoFocus
                      placeholder="Place your auth secret here"
                    />
                  </Form>
                ) : (
                  <LoginButton
                    enabled={data.isDevLogin}
                    isDevLogin
                    onClick={() => openDevLogin(true)}
                  >
                    <Flex gap="1" align="center">
                      <CommitIcon width="20" />
                      Dev Login
                    </Flex>
                  </LoginButton>
                )}
              </>
            )}
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
};
