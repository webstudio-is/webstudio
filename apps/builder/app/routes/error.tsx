import { type LoaderFunctionArgs, json } from "@remix-run/server-runtime";
import { useLoaderData } from "@remix-run/react";
import { Root } from "~/shared/remix/root";
import {
  getAuthorizationServerOrigin,
  isBuilderUrl,
} from "~/shared/router-utils/origins";
import { builderSessionStorage } from "~/services/builder-session.server";
import { sessionStorage } from "~/services/session.server";
import { authenticator } from "~/services/auth.server";
import { builderAuthenticator } from "~/services/builder-auth.server";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import {
  Toast,
  Text,
  TooltipProvider,
  Flex,
} from "@webstudio-is/design-system";

const SessionError = z.object({
  message: z.string(),
  description: z.string().optional(),
});

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const storage = isBuilderUrl(request.url)
    ? builderSessionStorage
    : sessionStorage;
  const sessionErrorKey = isBuilderUrl(request.url)
    ? builderAuthenticator.sessionErrorKey
    : authenticator.sessionErrorKey;

  const session = await storage.getSession(request.headers.get("Cookie"));

  const rawError = session.get(sessionErrorKey);

  const parsedError = SessionError.safeParse(rawError);

  const error = parsedError.success
    ? parsedError.data
    : {
        message: "Unknown error",
        description: fromError(parsedError.error).toString(),
      };

  return json(
    { error, origin: getAuthorizationServerOrigin(request.url) },
    // remove flash message from session
    {
      headers: {
        "Set-Cookie": await storage.commitSession(session),
      },
    }
  );
};

/**
 * @todo Implement the error page
 */
const Error = () => {
  const data = useLoaderData<typeof loader>();

  return (
    <TooltipProvider>
      <Flex
        css={{
          position: "fixed",
          inset: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Flex>
          <Toast
            variant={"error"}
            onCopy={() => {
              navigator.clipboard.writeText(
                `${data.error.message}\n${data.error.description}`
              );
            }}
            onClose={() => {
              window.location.href = data.origin;
            }}
          >
            <Text variant={"titles"}>{data.error.message}</Text>
            <Text>{data.error.description}</Text>
          </Toast>
        </Flex>
      </Flex>
    </TooltipProvider>
  );
};

export default () => {
  return <Root Outlet={Error} />;
};
