import { LinksFunction, MetaFunction } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { useState } from "react";

import {
  Card,
  Flex,
  Heading,
  Button,
  __DEPRECATED__Text,
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
        <Flex direction="column" align="center" gap="3">
          <Heading size="2">Login</Heading>
          <Flex direction="column" gap="4" css={{ width: 300 }}>
            {errorMessage.length ? (
              <__DEPRECATED__Text css={{ textAlign: "center" }} variant="red">
                {errorMessage}
              </__DEPRECATED__Text>
            ) : null}
            <Flex gap="2" direction="column">
              <Form action="/auth/github" method="post">
                <LoginButton enabled={data.isGithubEnabled}>
                  <Flex gap="2" align="center">
                    <Flex css={{ width: 20, height: 20 }}>
                      <GithubIcon />
                    </Flex>
                    Login with GitHub
                  </Flex>
                </LoginButton>
              </Form>
              <Form action="/auth/google" method="post">
                <LoginButton enabled={data.isGoogleEnabled}>
                  <Flex gap="2" align="center">
                    <Flex css={{ width: 20, height: 20 }}>
                      <GoogleIcon />
                    </Flex>
                    Login with Google
                  </Flex>
                </LoginButton>
              </Form>
              {data.isDevLogin &&
                (isDevLoginOpen ? (
                  <Flex
                    as="form"
                    action="/auth/dev"
                    method="post"
                    css={{
                      flexDirection: "row",
                      gap: "$2",
                    }}
                  >
                    <TextField
                      size={2}
                      name="secret"
                      type="text"
                      minLength={2}
                      required
                      autoFocus
                      placeholder="Auth secret"
                      css={{ flexGrow: 1 }}
                    />
                    <Button size={2}>Login</Button>
                  </Flex>
                ) : (
                  <LoginButton
                    enabled={data.isDevLogin}
                    isDevLogin
                    onClick={() => openDevLogin(true)}
                  >
                    <Flex gap="2" align="center">
                      <Flex css={{ width: 20, height: 20 }}>
                        <CommitIcon />
                      </Flex>
                      Dev Login
                    </Flex>
                  </LoginButton>
                ))}
            </Flex>
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
};
