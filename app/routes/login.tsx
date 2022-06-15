import { Links, LiveReload, Meta, Scripts } from "@remix-run/react";
import {
  LinksFunction,
  LoaderFunction,
  MetaFunction,
  redirect,
} from "@remix-run/node";
import { CriticalCss } from "@webstudio-is/sdk";
import { darkTheme } from "~/shared/design-system";
import { Form } from "@remix-run/react";
import { Button, Card, Flex, Heading } from "~/shared/design-system";
import interStyles from "~/shared/font-faces/inter.css";

import { GoogleIcon, GithubIcon } from "~/shared/icons";
import { authenticator } from "~/services/auth.server";
import config from "~/config";

export const links: LinksFunction = () => {
  return [
    {
      rel: "stylesheet",
      href: interStyles,
    },
  ];
};

export const meta: MetaFunction = () => {
  return { title: "Webstudio Login" };
};

const RootDesignerRoute = () => {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
        <CriticalCss />
      </head>
      <body className={darkTheme}>
        <Flex
          css={{ height: "100vh" }}
          direction="column"
          align="center"
          justify="center"
        >
          <Card
            css={{ width: "$10", padding: "$5", zoom: 1.4 }}
            variant="active"
          >
            <Flex direction="column" gap="2" align="center">
              <Heading>Login</Heading>

              <Flex gap="2" direction="column" align="center">
                <Form action="/auth/github" method="post">
                  <Button type="submit">
                    <Flex gap="1">
                      <GithubIcon width="16" />
                      Login with GitHub
                    </Flex>
                  </Button>
                </Form>
                <Form action="/auth/google" method="post">
                  <Button type="submit">
                    <Flex gap="1">
                      <GoogleIcon width="16" color="white" />
                      Login with Google
                    </Flex>
                  </Button>
                </Form>
              </Flex>
            </Flex>
          </Card>
        </Flex>
        <Scripts />
        {process.env.NODE_ENV === "development" && <LiveReload />}
      </body>
    </html>
  );
};

export const loader: LoaderFunction = async ({ request }) => {
  const user = await authenticator.isAuthenticated(request);
  if (user) {
    return redirect(config.dashboardPath);
  }

  return {};
};

export default RootDesignerRoute;
