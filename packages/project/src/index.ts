export * from "./shared/schema";
export type { Project } from "./db/project";
export type { ProjectRouter } from "./trpc/project-router";
export { validateProjectDomain } from "./db/project-domain";
