/**
 * @summary This is a poor example of a cli
 * @description will stop in 60 seconds
 *
 * @namespace cli
 * @memberOf module:ts-workspace
 */

let counter = 60;
console.log(`This is a poor example of a cli. will stop in ${60} seconds`,);

function iterator() {
  setTimeout(() => {
    if (!--counter) process.exit(1,);
    console.log(counter,);
    iterator();
  }, 1000,);
}

iterator();
