import ObjectId from "bson-objectid";
import { createCookie } from "@remix-run/node";

const userIdParser = createCookie("user-id", {
  maxAge: 604_800, // one week
});

export const ensureUserCookie = async (
  request: Request
): Promise<{ userId: string; headers?: { [key: string]: string } }> => {
  const cookieString = request.headers.get("Cookie");
  const userId = await userIdParser.parse(cookieString);
  if (userId !== null) return { userId };
  // We use a generated id temporarily as a way to demonstrate the designer
  // to a new user without a signup.
  const generatedUserId = ObjectId().toString();
  return {
    headers: {
      "Set-Cookie": await userIdParser.serialize(generatedUserId),
    },
    userId: userId || generatedUserId,
  };
};
