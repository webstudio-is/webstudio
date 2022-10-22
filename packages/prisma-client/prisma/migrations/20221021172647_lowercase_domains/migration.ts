import { PrismaClient, Project } from "./client";

export default () => {
  const client = new PrismaClient({
    // Uncomment to see the queries in console as the migration runs
    // log: ["query", "info", "warn", "error"],
  });
  return client.$transaction(
    async (prisma) => {
      const projects = await prisma.project.findMany();

      const projectsByDomain = new Map<string, Project>();

      for (const project of projects) {
        const domain = project.domain.toLowerCase();
        if (projectsByDomain.has(domain) === false) {
          projectsByDomain.set(domain, project);
        } else {
          let suffix = 1;
          while (projectsByDomain.has(`${domain}${suffix}`)) {
            suffix++;
          }
          projectsByDomain.set(`${domain}${suffix}`, project);
        }
      }

      for (const [domain, project] of projectsByDomain) {
        await prisma.project.update({
          where: { id: project.id },
          data: { domain },
        });
      }
    },
    { timeout: 1000 * 60 }
  );
};
