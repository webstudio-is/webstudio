import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// This converts instance.style to instance.cssRules
let migrateTree = async () => {
  const transform = (instance: any) => {
    if (instance.style) {
      console.log(`migrating ${instance.id}`);
      instance.cssRules = [
        {
          breakpoint: "626fc63909a681e2a912b5a4",
          style: instance.style,
        },
      ];
      delete instance.style;
    }
    if (instance.children) {
      instance.children.forEach((child: any) => {
        transform(child);
      });
    }
  };

  const migrate = async (tree: any) => {
    transform(tree.root);
    await prisma.Tree.updateOne(
      { _id: tree._id },
      { $set: { root: tree.root } }
    );
    console.log(`updating tree ${tree._id}`);
  };

  const cursor = await prisma.Tree.find({ "root.style": { $exists: true } });

  while (cursor.hasNext()) {
    migrate(cursor.next());
  }
};

let migrateBreakpoints = async () => {
  const createBreakpoints = (treeId: string) => ({
    _id: treeId,
    values: [
      {
        label: "Mobile",
        minWidth: 0,
      },
      {
        label: "Tablet",
        minWidth: 768,
      },
      {
        label: "Laptop",
        minWidth: 1024,
      },
      {
        label: "Desktop",
        minWidth: 1280,
      },
    ],
  });

  const migrate = async (project: any) => {
    console.log(`inserting breakpoints for ${project._id}`);
    try {
      await prisma.Breakpoints.insertOne(createBreakpoints(project.devTreeId));
    } catch (err) {
      console.log(err);
    }
    try {
      if (project.prodTreeId) {
        await prisma.Breakpoints.insertOne(
          createBreakpoints(project.prodTreeId)
        );
      }
    } catch (err) {
      console.log(err);
    }
  };

  const cursor = await prisma.Project.find();

  while (cursor.hasNext()) {
    migrate(cursor.next());
  }
};

export const migrateAllBreakpoints = async () => {
  await migrateBreakpoints();
  await migrateTree();
};
