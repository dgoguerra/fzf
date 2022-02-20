const { Fzf } = require("./Fzf");

module.exports = (opts) => new Fzf(opts);

module.exports.Fzf = Fzf;
