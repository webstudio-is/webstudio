// I am running this migration manually over console,
// because we don't have an automated setup for migrations yet.
// This converts instance.style to instance.cssRules
const cursor = db.Tree.find();

const transform = (instance) => {
  if (instance.style) {
    instance.cssRules = [
      {
        breakpoint: "default",
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
  db.Tree.update({ _id: tree._id }, { $set: { root: tree.root } });
  printjson(tree._id.toString());
};

while (cursor.hasNext()) {
  migrate(cursor.next());
}
