import { json, type LoaderFunctionArgs } from "@remix-run/server-runtime";
import { findAuthenticatedUser } from "~/services/auth.server";
import { loginPath } from "~/shared/router-utils";
import { prisma } from "@webstudio-is/prisma-client";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { redirect } from "~/services/no-store-redirect";
import { checkCsrf } from "~/services/csrf-session.server";
import { allowedDestinations } from "~/services/destinations.server";

/**
 * Created for ebugging purposes, to check that payments and products are working
 * Showing current user's checkouts with products.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  preventCrossOriginCookie(request);
  allowedDestinations(request, ["document", "empty"]);
  await checkCsrf(request);

  const user = await findAuthenticatedUser(request);

  if (user === null) {
    const url = new URL(request.url);
    throw redirect(
      loginPath({
        returnTo: `${url.pathname}?${url.searchParams.toString()}`,
      })
    );
  }

  const userCheckoutsWithProducts = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,

      username: true,
      products: {
        select: {
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              features: true,
              meta: true,
              images: true,
            },
          },
        },
      },
      checkout: {
        select: {
          eventId: true,
          createdAt: true,

          product: {
            select: {
              id: true,
              name: true,
              description: true,
              features: true,
              meta: true,
              images: true,
            },
          },
        },
      },
    },
  });

  return json(userCheckoutsWithProducts);
};
