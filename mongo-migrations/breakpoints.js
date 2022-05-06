// I am running this migration manually over console,
// because we don't have an automated setup for migrations yet.

// This converts instance.style to instance.cssRules
const migrateTree = () => {
  const transform = (instance) => {
    if (instance.style) {
      print(`migrating ${instance.id}`);
      instance.cssRules = [
        {
          breakpoint: ObjectId("626fc63909a681e2a912b5a4"),
          style: instance.style,
        },
      ];
      delete instance.style;
    }
    if (instance.children) {
      instance.children.forEach((child) => {
        transform(child);
      });
    }
  };

  const migrate = (tree) => {
    transform(tree.root);
    db.Tree.updateOne({ _id: tree._id }, { $set: { root: tree.root } });
    printjson(tree._id.toString());
  };

  const cursor = db.Tree.find({ "root.style": { $exists: true } });

  while (cursor.hasNext()) {
    migrate(cursor.next());
  }
};

const migrateBreakpoints = () => {
  const createBreakpoints = (projectId) => ({
    _id: projectId,
    values: [
      {
        label: "Mobile",
        minWidth: 0,
        id: ObjectId("626fc63909a681e2a912b5a4"),
      },
      {
        label: "Tablet",
        minWidth: 768,
        id: ObjectId("626fc63909a681e2a912b5a5"),
      },
      {
        label: "Laptop",
        minWidth: 1024,
        id: ObjectId("626fc63909a681e2a912b5a6"),
      },
      {
        label: "Desktop",
        minWidth: 1280,
        id: ObjectId("626fc63909a681e2a912b5a7"),
      },
    ],
  });

  const migrate = (project) => {
    print(`inserting for ${project._id}`);
    db.Breakpoints.insertOne(createBreakpoints(project._id));
  };

  const cursor = db.Project.find();

  while (cursor.hasNext()) {
    migrate(cursor.next());
  }
};

migrateBreakpoints();
migrateTree();
