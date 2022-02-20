const fs = require("fs");
const path = require("path");
const https = require("https");
const debug = require("debug")("fzf");
const { spawn } = require("child_process");

function which(bin) {
  return new Promise((resolve) => {
    spawn("which", [bin]).on("exit", (code) => resolve(code === 0));
  });
}

function request(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (resp) => {
      if (resp.statusCode >= 400) {
        let msg = `GET ${url}: ${resp.statusCode} (${resp.statusMessage})`;
        reject(new Error(msg));
      } else {
        resolve(resp);
      }
    });
  });
}

function untar(tarPath) {
  return new Promise((resolve, reject) => {
    const proc = spawn("tar", ["-xvzf", tarPath], { cwd: __dirname });

    if (debug.enabled) {
      proc.stdout.on("data", (data) => debug(data.toString()));
      proc.stderr.on("data", (data) => debug(data.toString()));
    }

    proc.on("exit", (code) => {
      code === 0
        ? resolve()
        : reject(new Error(`fzf exited with error code ${code}`));
    });
  });
}

async function downloadFile(srcUrl, dstPath) {
  let resp = null;

  while (true) {
    resp = await request(srcUrl);
    if (
      resp.statusCode >= 300 &&
      resp.statusCode < 400 &&
      resp.headers.location
    ) {
      srcUrl = resp.headers.location;
    } else {
      break;
    }
  }

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dstPath);
    file.on("finish", resolve);
    file.on("error", reject);
    resp.pipe(file);
  });
}

(async () => {
  debug("checking if fzf is installed");
  if (await which("fzf")) {
    debug("fzf already in path, won't install a local version");
    return;
  }

  const archMaps = { x64: "amd64" };

  const version = process.env.NODEFZF_FZF_VERSION || "0.29.0";
  const arch =
    process.env.NODEFZF_ARCH || archMaps[process.arch] || process.arch;
  const platform = process.env.NODEFZF_PLATFORM || process.platform;

  const releaseUrl =
    process.env.NODEFZF_FZF_URL ||
    `https://github.com/junegunn/fzf/releases/download/${version}/fzf-${version}-${platform}_${arch}.tar.gz`;

  const tarPath = path.resolve(__dirname, path.basename(releaseUrl));
  const binPath = path.resolve(__dirname, "fzf");

  debug(`downloading fzf from ${releaseUrl}`);
  await downloadFile(releaseUrl, tarPath);

  debug(`extracting ${tarPath}`);
  await untar(tarPath);

  debug(`adding +x file mode to ${binPath}`);
  fs.chmodSync(binPath, 0o755);

  debug(`successfully installed fzf in ${binPath}`);
})();
