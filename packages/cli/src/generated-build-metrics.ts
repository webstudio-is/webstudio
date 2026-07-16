import { gzip } from "node:zlib";
import { promisify } from "node:util";
import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";

const gzipAsync = promisify(gzip);
const compressibleExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".map",
  ".svg",
  ".txt",
  ".xml",
]);

type BuildFile = {
  path: string;
  bytes: number;
  gzipBytes: number;
  kind: "script" | "style" | "image" | "font" | "other";
};

const getFileKind = (path: string): BuildFile["kind"] => {
  const extension = extname(path).toLowerCase();
  if ([".js", ".mjs", ".cjs"].includes(extension)) {
    return "script";
  }
  if (extension === ".css") {
    return "style";
  }
  if (
    [".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"].includes(
      extension
    )
  ) {
    return "image";
  }
  if ([".eot", ".otf", ".ttf", ".woff", ".woff2"].includes(extension)) {
    return "font";
  }
  return "other";
};

const listFiles = async (root: string, directory = root): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        return listFiles(root, path);
      }
      return entry.isFile() ? [path] : [];
    })
  );
  return files.flat();
};

const summarizeFiles = (files: readonly BuildFile[]) => ({
  fileCount: files.length,
  bytes: files.reduce((total, file) => total + file.bytes, 0),
  gzipBytes: files.reduce((total, file) => total + file.gzipBytes, 0),
});

export const inspectGeneratedBuildMetrics = async (
  projectDirectory: string
) => {
  const buildDirectory = join(projectDirectory, "build");
  const paths = await listFiles(buildDirectory).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  );
  const files = await Promise.all(
    paths.map(async (path): Promise<BuildFile> => {
      const fileStat = await stat(path);
      const extension = extname(path).toLowerCase();
      const gzipBytes = compressibleExtensions.has(extension)
        ? (await gzipAsync(await readFile(path))).byteLength
        : fileStat.size;
      return {
        path: relative(buildDirectory, path).split(sep).join("/"),
        bytes: fileStat.size,
        gzipBytes,
        kind: getFileKind(path),
      };
    })
  );
  files.sort((left, right) => right.gzipBytes - left.gzipBytes);
  const client = files.filter((file) => file.path.startsWith("client/"));
  const server = files.filter((file) => file.path.startsWith("server/"));
  return {
    version: 1 as const,
    ...summarizeFiles(files),
    client: summarizeFiles(client),
    server: summarizeFiles(server),
    largestFiles: files.slice(0, 20),
  };
};
