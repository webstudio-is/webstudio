import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export let migratePublishedBreakpoints = async () => {
  const migrate = async (project) => {
    console.log(`updating breakpoints for ${project._id}`);
    try {
      const breakpoint = await prisma.Breakpoints.findOne({ _id: project._id });
      if (breakpoint === null) return;
      breakpoint._id = project.devTreeId;
      await prisma.Breakpoints.insertOne(breakpoint);
      await prisma.Breakpoints.remove({ _id: project._id }, true);
    } catch (err) {
      console.log(err);
    }
  };

  const cursor = await prisma.Project.find();

  while (cursor.hasNext()) {
    migrate(cursor.next());
  }
};
