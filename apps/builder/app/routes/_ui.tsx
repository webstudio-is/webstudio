import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  type ClientLoaderFunctionArgs,
  type ShouldRevalidateFunction,
} from "@remix-run/react";
import designSystemGlobalCss from "@webstudio-is/design-system/global.css?url";
import {
  json,
  type LinksFunction,
  type LoaderFunctionArgs,
} from "@remix-run/server-runtime";
import { ErrorBoundary as ErrorBoundaryComponent } from "~/shared/error/error-boundary";
import { getCsrfTokenAndCookie } from "~/services/csrf-session.server";
import invariant from "tiny-invariant";
import {
  csrfToken as clientCsrfToken,
  updateCsrfToken,
} from "~/shared/csrf.client";
import {
  createPrivateNoStoreHeaders,
  privateNoStoreResponseHeaders,
} from "~/services/cache-control.server";
import { ColorSchemeController } from "~/shared/color-scheme-controller";
import {
  createColorSchemeBootstrapScript,
  parseColorSchemeCookie,
  type ColorSchemePreference,
} from "~/shared/color-scheme";

export const links: LinksFunction = () => {
  // `links` returns an array of objects whose
  // properties map to the `<link />` component props
  return [{ rel: "stylesheet", href: designSystemGlobalCss }];
};

const Document = (props: {
  children: React.ReactNode;
  colorScheme?: ColorSchemePreference;
}) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script
          dangerouslySetInnerHTML={{
            __html: createColorSchemeBootstrapScript(props.colorScheme),
          }}
        />
        <Meta />
        <Links />
      </head>
      <body>
        <ColorSchemeController />
        {props.children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const [csrfToken, setCookieValue] = await getCsrfTokenAndCookie(request);

  if (request.headers.get("sec-fetch-mode") !== "navigate") {
    return json(
      {
        csrfToken: "",
        colorScheme: parseColorSchemeCookie(request.headers.get("Cookie")),
      },
      { headers: privateNoStoreResponseHeaders }
    );
  }

  const headers = createPrivateNoStoreHeaders();

  if (setCookieValue !== undefined) {
    headers.set("Set-Cookie", setCookieValue);
  }

  return json(
    {
      csrfToken,
      colorScheme: parseColorSchemeCookie(request.headers.get("Cookie")),
    },
    {
      headers,
    }
  );
};

export const clientLoader = async ({
  serverLoader,
}: ClientLoaderFunctionArgs) => {
  const serverData = await serverLoader<typeof loader>();

  if (clientCsrfToken === undefined) {
    const { csrfToken } = serverData;
    invariant(csrfToken !== "", "CSRF token is empty");
    updateCsrfToken(csrfToken);
  }

  // Hide real CSRF token from window.__remixContext
  serverData.csrfToken = "";
  return serverData;
};

clientLoader.hydrate = true;

export const ErrorBoundary = () => {
  return (
    <Document>
      <ErrorBoundaryComponent />
    </Document>
  );
};

export default function Layout() {
  const { colorScheme } = useLoaderData<typeof loader>();
  return (
    <Document colorScheme={colorScheme}>
      <Outlet />
    </Document>
  );
}

export const shouldRevalidate: ShouldRevalidateFunction = () => {
  return false;
};
