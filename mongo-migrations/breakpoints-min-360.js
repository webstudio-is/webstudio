// I am running this migration manually over console,
// because we don't have an automated setup for migrations yet.

let migrateBreakpoints = () => {
  const migrate = (breakpoints) => {
    print(`updating breakpoints for ${breakpoints._id}`);
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

      db.Breakpoints.updateOne(
        { _id: breakpoints._id },
        { $set: { values: breakpoints.values } }
      );
    } catch (err) {
      print(err);
    }
  };

  const cursor = db.Breakpoints.find({ "values.minWidth": 0 });

  while (cursor.hasNext()) {
    migrate(cursor.next());
  }
};

migrateBreakpoints();
