const report = JSON.parse(
  document.querySelector("#visual-report-data").textContent
);

const createElement = (tag, options = {}) => {
  const element = document.createElement(tag);
  if (options.className !== undefined) {
    element.className = options.className;
  }
  if (options.text !== undefined) {
    element.textContent = options.text;
  }
  return element;
};

const revisions = document.querySelector("#revisions");
revisions.append(
  createElement("code", { text: report.baselineCommit }),
  " → ",
  createElement("code", { text: report.currentCommit }),
  ` in ${(report.durationMs / 1000).toFixed(1)}s`
);

const statuses = ["changed", "added", "removed", "error", "unchanged"];
const counts = Object.fromEntries(statuses.map((status) => [status, 0]));
for (const comparison of report.comparisons) {
  counts[comparison.status] += 1;
}
const summary = document.querySelector("#summary");
for (const status of statuses) {
  summary.append(
    createElement("span", { text: `${status}: ${counts[status]}` })
  );
}

const errors = document.querySelector("#errors");
for (const error of report.errors) {
  errors.append(createElement("pre", { text: error }));
}

const comparisonRoot = document.querySelector("#comparisons");
const important = report.comparisons.filter(
  ({ status }) => status !== "unchanged"
);
if (important.length === 0) {
  comparisonRoot.append(
    createElement("p", { text: "No visual differences detected." })
  );
}

const imageLabels = [
  ["baselinePath", "Baseline", "Baseline for"],
  ["currentPath", "Current", "Current rendering for"],
  ["diffPath", "Diff", "Visual difference for"],
  ["contextDiffPath", "Context diff", "Contextual visual difference for"],
];
for (const comparison of important) {
  const article = createElement("article", {
    className: `comparison ${comparison.status}`,
  });
  const header = createElement("header");
  const identity = createElement("div");
  identity.append(
    createElement("h2", {
      text: `${comparison.title} › ${comparison.name}`,
    }),
    createElement("code", { text: comparison.id })
  );
  const result = createElement("div");
  result.append(
    createElement("span", {
      className: "status",
      text: comparison.status,
    })
  );
  if (comparison.mismatchPercentage !== undefined) {
    result.append(
      createElement("span", {
        text: `${(comparison.differentPixels ?? 0).toLocaleString()} pixels · ${comparison.mismatchPercentage.toFixed(4)}%`,
      })
    );
  }
  header.append(identity, result);
  article.append(header);
  if (comparison.error !== undefined) {
    article.append(createElement("pre", { text: comparison.error }));
  }

  const changes = comparison.textAnalysis?.changes ?? [];
  if (changes.length > 0) {
    const list = createElement("ul", { className: "text-changes" });
    for (const change of changes) {
      const item = createElement("li");
      const label = createElement("strong", {
        text: change.kind.replaceAll("_", " "),
      });
      const text =
        change.text ?? change.currentText ?? change.baselineText ?? "";
      item.append(label, text === "" ? "" : `: ${text}`);
      list.append(item);
    }
    article.append(list);
  }

  const images = createElement("div", { className: "images" });
  for (const [path, label, altPrefix] of imageLabels) {
    if (comparison[path] === undefined) {
      continue;
    }
    const figure = createElement("figure");
    const image = createElement("img");
    image.src = comparison[path];
    image.alt = `${altPrefix} ${comparison.title} ${comparison.name}`;
    figure.append(createElement("figcaption", { text: label }), image);
    images.append(figure);
  }
  article.append(images);
  comparisonRoot.append(article);
}
