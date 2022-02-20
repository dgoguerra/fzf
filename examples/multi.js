const { Fzf } = require("../src/index.js");

(async () => {
  const fzf = new Fzf().multi(2).result((line) => line.split(":").shift());

  try {
    const results = await fzf.run([
      "1:first",
      "2:second",
      "3:third",
      "4:fourth",
    ]);
    console.log({ results });
  } catch (e) {
    console.error(e.message);
  }
})();
