/** @type {import('tailwindcss').Config} */

// Every colour, face, radius and measure comes from the fleet's shared preset,
// which maps each utility onto a CSS variable owned by @bitbaum/design-tokens
// (the design SSOT for OrangeCat, Loki and Solon). Nothing visual is defined
// here: a colour or a font added below belongs in the token package instead.
module.exports = {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Tailwind loads this as CommonJS
  presets: [require("@bitbaum/design-tokens/tailwind-preset")],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
};
