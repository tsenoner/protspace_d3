// packages/core/.storybook/preview.ts

// Default export for Storybook preview configuration
export default {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

// If you need to export parameters separately for some reason (e.g. for type inference in stories)
// export const parameters = {
//   controls: {
//     matchers: {
//       color: /(background|color)$/i,
//       date: /Date$/i,
//     },
//   },
// };
