const fs = require("fs");
const path = require("path");
const debug = require("debug")("fzf");
const { Readable } = require("stream");
const { spawn } = require("child_process");

const LOCAL_FZF_PATH = path.resolve(__dirname, "../lib/fzf");

function defaultFzfBin() {
  return fs.existsSync(LOCAL_FZF_PATH) ? LOCAL_FZF_PATH : "fzf";
}

class Fzf {
  constructor({ bin = null } = {}) {
    this._bin = bin || defaultFzfBin();
    this._multi = false;
    this._multiNum = null;
    this._previewCmd = null;
    this._previewOpts = {};
    this._extraArgs = [];
    this._result = (line) => line;
  }

  multi(num = null) {
    this._multi = true;
    this._multiNum = num;
    return this;
  }

  preview(cmd, opts = {}) {
    this._previewCmd = cmd;
    this._previewOpts = opts;
    return this;
  }

  arg(arg, val = null) {
    this._extraArgs.push(arg);
    if (val !== null) {
      this._extraArgs.push(val);
    }
    return this;
  }

  args(arr) {
    this._extraArgs = this._extraArgs.concat(arr);
    return this;
  }

  result(transform) {
    this._result = transform;
    return this;
  }

  run(input) {
    return new Promise((resolve, reject) => {
      const args = this._buildArgs();

      if (debug.enabled) {
        // Escape and concat args to a string, to log the equivalent bash
        // command that will be run.
        const escapedArgs = args
          .map((a) => (a.includes(" ") ? `'${a.replace(/'/g, "'\\''")}'` : a))
          .join(" ");
        debug(`running: ${this._bin} ${escapedArgs}`);
      }

      const proc = spawn(this._bin, args, {
        stdio: ["pipe", "pipe", "inherit"],
      });
      proc.stdout.setEncoding("utf-8");

      proc.stdout.on("readable", () => {
        const output = proc.stdout.read();
        if (!output) {
          return;
        }

        const results = output.split(/\r?\n/).reduce((acc, line) => {
          if (line) {
            acc.push(this._result(line.trim()));
          }
          return acc;
        }, []);

        resolve(this._multi ? results : results.shift());
      });

      proc.on("exit", (code) => {
        if (code !== 0) {
          reject(new Error(`fzf exited with error code ${code}`));
        }
      });

      // Pipe input into fzf. It may be a stram, or an array of strings
      const stream = Array.isArray(input)
        ? Readable.from(input.join("\n"))
        : input;
      stream.pipe(proc.stdin);
    });
  }

  _buildArgs() {
    const args = [];

    if (this._multi) {
      args.push("--multi");
      if (this._multiNum) {
        args.push(this._multiNum);
      }
    }

    if (this._previewCmd) {
      args.push("--preview", this._previewCmd);
      Object.keys(this._previewOpts).forEach((k) => {
        args.push(`--preview-${k}`, this._previewOpts[k]);
      });
    }

    return args.concat(this._extraArgs);
  }
}

module.exports = { Fzf };
