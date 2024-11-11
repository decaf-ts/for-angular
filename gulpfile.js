import gulp from "gulp";
const { src, dest, series } = gulp;
import run from "gulp-run-command";

function makeDocs() {
  const copyFiles = (source, destination) => {
    return function copyFiles() {
      return src(source + "/**/*", { base: source, encoding: false }).pipe(
        dest(destination),
      );
    };
  };

  function compileReadme() {
    return run.default("npx markdown-include ./mdCompile.json")();
  }

  function compileDocs() {
    return run.default(
      "npx jsdoc -c jsdocs.json -t ./node_modules/better-docs",
    )();
  }

  return series(
    compileReadme,
    compileDocs,
    series(
      ...[
        {
          src: "workdocs/assets",
          dest: "./docs/workdocs/assets",
        },
        {
          src: "workdocs/coverage",
          dest: "./docs/workdocs/coverage",
        },
      ].map((e) => copyFiles(e.src, e.dest)),
    ),
  );
}

export const docs = makeDocs();
