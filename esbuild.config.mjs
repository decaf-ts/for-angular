module.exports = [
  {
    name: 'preserve-names-plugin',
    setup(build) {
      // Injeta keepNames nas opções iniciais do builder do esbuild
      build.initialOptions.keepNames = true;
      // build.initialOptions.fnNames = true;
    },
  },
];
