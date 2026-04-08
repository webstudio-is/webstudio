import env from "~/env/env.server";

type UpdateSeatsResult =
  | { type: "success"; seats: number }
  | { type: "error"; error: string };

/**
 * Calls the payment worker's POST /seats/update endpoint to adjust the Stripe
 * subscription seat quantity. Stripe prorates immediately on seat additions.
 *
 * Returns null when the payment worker is not configured (dev/test environments).
 * Throws on network or unexpected errors.
 */
export const updateSeats = async ({
  userId,
  subscriptionId,
  newQuantity,
  minSeats,
  maxSeats,
}: {
  userId: string;
  subscriptionId: string;
  newQuantity: number;
  minSeats: number;
  maxSeats: number;
}): Promise<UpdateSeatsResult | null> => {
  if (!env.PAYMENT_WORKER_URL || !env.PAYMENT_WORKER_TOKEN) {
    return null;
  }

  const url = `${env.PAYMENT_WORKER_URL}/seats/update`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.PAYMENT_WORKER_TOKEN}`,
    },
    body: JSON.stringify({
      userId,
      subscriptionId,
      newQuantity,
      minSeats,
      maxSeats,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Payment worker /seats/update responded with ${response.status}`
    );
  }

  return (await response.json()) as UpdateSeatsResult;
};
