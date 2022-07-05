import { LinksFunction, MetaFunction } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import {
  Button,
  Card,
  Flex,
  Heading,
  Text,
  TextField,
} from "~/shared/design-system";
import interStyles from "~/shared/font-faces/inter.css";

import { GoogleIcon, GithubIcon, CommitIcon } from "~/shared/icons";
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
  const [isDevLogin, setIsDevLogin] = useState(false);
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
            <Text css={{ textAlign: "center" }} variant="red">
              {errorMessage}
            </Text>
          ) : null}
          <Flex gap="2" direction="column" align="center">
            <Form action="/auth/github" method="post">
              <Button
                size={3}
                type="submit"
                disabled={data.isGithubEnabled === false}
              >
                <Flex gap="1">
                  <GithubIcon width="20" />
                  Login with GitHub
                </Flex>
              </Button>
            </Form>
            <Form action="/auth/google" method="post">
              <Button
                size={3}
                type="submit"
                disabled={data.isGoogleEnabled === false}
              >
                <Flex gap="1">
                  <GoogleIcon width="20" />
                  Login with Google
                </Flex>
              </Button>
            </Form>
            {data.isDevLogin && (
              <>
                {isDevLogin ? (
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
                  <Button
                    onClick={() => setIsDevLogin(true)}
                    size={3}
                    css={{ width: "100%" }}
                  >
                    <Flex gap="1" align="center">
                      <CommitIcon width="20" />
                      Dev Login
                    </Flex>
                  </Button>
                )}
              </>
            )}
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
};
