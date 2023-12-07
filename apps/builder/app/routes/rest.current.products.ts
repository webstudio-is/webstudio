import { json, redirect, type LoaderArgs } from "@remix-run/server-runtime";
import { findAuthenticatedUser } from "~/services/auth.server";
import { loginPath } from "~/shared/router-utils";
import { prisma } from "@webstudio-is/prisma-client";

/**
 * Created for ebugging purposes, to check that payments and products are working
 * Showing current user's checkouts with products.
 */
export const loader = async ({ request, params }: LoaderArgs) => {
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
