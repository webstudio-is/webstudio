export const themeDefaults = {
  fontSize: {
    xs: 10,
    s: 12,
    m: 14,
    l: 16,
    xl: 18,
    "2xl": 20,
    "3xl": 24,
    "4xl": 28,
  },
  spacing: {
    xs: 4,
    s: 8,
    m: 12,
    l: 16,
    xl: 20,
    "2xl": 24,
    "3xl": 28,
    "4xl": 32,
  },
  borderRadius: {
    xs: 2,
    s: 4,
    m: 6,
    l: 8,
    xl: 10,
    "2xl": 12,
    "3xl": 16,
    "4xl": 20,
  },
};

// Theme visualizer
// const styles = document.body.appendChild(document.createElement("style"));
// styles.innerHTML = `
// body { display: flex; gap: 20px }
// div {   width: 50px; height: 50px;}
// `

// const theme = {}

// let c = document.body.appendChild(document.createElement("section"));
// theme.colors.forEach((color) => {
//   const d = c.appendChild(document.createElement("div"));
//   d.style.backgroundColor = color.trim();
// });

// c = document.body.appendChild(document.createElement("section"));
// theme.text.forEach((color) => {
//   const d = c.appendChild(document.createElement("div"));
//   d.style.backgroundColor = color.trim();
// });

// c = document.body.appendChild(document.createElement("section"));
// theme.gradients.forEach((color) => {
//   const d = c.appendChild(document.createElement("div"));
//   d.style.backgroundImage = `linear-gradient(${color[0]}, ${color[1]})`;
// });
