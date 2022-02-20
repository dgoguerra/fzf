const { Fzf } = require("../src/index.js");
const { spawn } = require("child_process");

const PREVIEW_CONTAINER_FORMAT = `
Id: {{.Id}}
Name: {{.Name}}
Status: {{.State.Status}}

Image: {{.Config.Image}}
Command: {{range .Config.Cmd}}{{printf "%q " .}}{{end}}
Entrypoint: {{range .Config.Entrypoint}}{{printf "%q " .}}{{end}}
Ports: 
{{- range $p, $conf := .NetworkSettings.Ports}}
  {{$p}} -> {{(index $conf 0).HostPort}}
{{- end}}
`;

function listContainers() {
  return spawn("docker", [
    "ps",
    "-a",
    "--format",
    "table{{.ID}}\t{{.Image}}\t{{.Status}}",
  ]).stdout;
}

(async () => {
  const fzf = new Fzf()
    .result((line) => line.split(" ").shift())
    .preview(`docker inspect --format='${PREVIEW_CONTAINER_FORMAT}' {1}`, {
      window: "right:40%",
    })
    // docker "table" format outputs tabs as (at least 2) spaces. Using "  " as
    // delimiter we can avoid considering the column name "CONTAINER ID" as
    // two columns.
    .arg("--delimiter", "  ")
    .arg("--with-nth", "2..")
    .arg("--header-lines", "1");

  try {
    const container = await fzf.run(listContainers());
    console.log({ container });
  } catch (e) {
    console.error(e.message);
  }
})();
