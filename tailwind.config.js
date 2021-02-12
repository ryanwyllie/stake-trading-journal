const defaultTheme = require("tailwindcss/defaultTheme");
const colours = require("tailwindcss/colors");

module.exports = {
  darkMode: false,
  theme: {
    fontFamily: {
      body: ['"Noto Sans"', ...defaultTheme.fontFamily.sans],
      heading: ['"Poppins"', ...defaultTheme.fontFamily.sans],
    },
    extend: {
      colors: {
        black: "#0F1317",
        teal: colours.teal,
        cyan: colours.cyan,
      },
      opacity: {
        10: ".1",
        20: ".2",
        30: ".3",
        40: ".4",
        60: ".6",
        70: ".7",
        80: ".8",
        90: ".9",
      },
    },
  },
  variants: {
    transitionProperty: [
      "responsive",
      "hover",
      "focus",
      "active",
      "group-hover",
    ],
    backgroundColor: [
      "responsive",
      "hover",
      "focus",
      "active",
      "group-hover",
      "focus-within",
    ],
    textColor: [
      "responsive",
      "hover",
      "focus",
      "active",
      "group-hover",
      "focus-within",
    ],
    opacity: [
      "responsive",
      "hover",
      "focus",
      "active",
      "group-hover",
      "group-focus",
    ],
    borderColor: [
      "responsive",
      "hover",
      "focus",
      "active",
      "group-hover",
      "focus-within",
    ],
    ringWidth: ["hover", "focus"],
    ringColor: ["hover", "focus"],
  },
  purge: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  plugins: [],
};
