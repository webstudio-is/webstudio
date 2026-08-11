import { preview as startVitePreview } from "vite";
import { buildVisualStoryApp } from "./story-build";

export const startVisualStoryServer = async ({
  root,
  port,
  outputDirectory,
  storyFiles,
}: {
  root: string;
  port: number;
  outputDirectory: string;
  storyFiles: readonly string[];
}) => {
  await buildVisualStoryApp({ root, outputDirectory, storyFiles });
  const server = await startVitePreview({
    configFile: false,
    logLevel: "error",
    build: { outDir: outputDirectory },
    preview: {
      host: "127.0.0.1",
      port,
      strictPort: true,
    },
  });
  return {
    async close() {
      await server.close();
    },
  };
};

export const startVisualStoryServers = async (
  options: readonly Parameters<typeof startVisualStoryServer>[0][],
  startServer = startVisualStoryServer
) => {
  const results = await Promise.allSettled(options.map(startServer));
  const servers = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : []
  );
  const failure = results.find((result) => result.status === "rejected");
  if (failure !== undefined) {
    await Promise.allSettled(servers.map((server) => server.close()));
    throw failure.reason;
  }
  return servers;
};
