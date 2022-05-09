// I am running this migration manually over console,
// because we don't have an automated setup for migrations yet.

let migrateBreakpoints = () => {
  const migrate = (project) => {
    print(`updating breakpoints for ${project._id}`);
    try {
      const breakpoint = db.Breakpoints.findOne({ _id: project._id });
      breakpoint._id = project.devTreeId;
      db.Breakpoints.insertOne(breakpoint);
      db.Breakpoints.remove({ _id: project._id }, true);
    } catch (err) {
      print(err);
    }
  };

  const cursor = db.Project.find();

  while (cursor.hasNext()) {
    migrate(cursor.next());
  }
};

migrateBreakpoints();
