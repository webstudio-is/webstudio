import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export let migrateBreakpointsMin360 = async () => {
  const migrate = async (breakpoints) => {
    console.log(`updating breakpoints for ${breakpoints._id}`);
    let shouldUpdate = false;
    breakpoints.values.forEach((breakpoint) => {
      // Turned out we have minWidth partially as Long("1280") for e.g.
      if (Number(breakpoint.minWidth) === 0) {
        breakpoint.minWidth = 360;
        shouldUpdate = true;
      }
    });
    try {
      if (shouldUpdate === false) return;

      await prisma.Breakpoints.updateOne(
        { _id: breakpoints._id },
        { $set: { values: breakpoints.values } }
      );
    } catch (err) {
      console.log(err);
    }
  };

  const cursor = await prisma.Breakpoints.find({ "values.minWidth": 0 });

  while (cursor.hasNext()) {
    migrate(cursor.next());
  }
};
