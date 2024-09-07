export type SessionData = {
  userId: string;
  createdAt: number;
};

export const getSessionCookieNameVersion = () => {
  // IMPORTANT: If you see an error here, you need to increase the version number.
  // Explanation:
  // Changing the SessionData type will cause all existing user sessions to not work as expected.
  // There is no logic to validate or clean up sessions, so we avoid session migration issues by changing the session cookie name.
  // This ensures that old sessions are invalidated and new sessions are created with the updated structure.
  const obj: SessionData = { userId: "", createdAt: 0 };
  obj.userId = "";

  // IMPORTANT: Change version in the SaaS platform as well!
  // IMPORTANT: Changing the version will cause all users to be logged out.
  return "3";
};
