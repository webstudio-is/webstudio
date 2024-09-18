// For development purposes only
// Exists on saas worker
export const loader = async () => {
  const emptyGif = "R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

  return new Response(
    Uint8Array.from(atob(emptyGif), (c) => c.charCodeAt(0)).buffer,
    {
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "public, max-age=10",
      },
    }
  );
};
