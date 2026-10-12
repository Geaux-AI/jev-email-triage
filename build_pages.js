// Copies the static GitHub Pages version into docs/.
// Includes replay.json when a real Jev run has been recorded (node server.js with a key, then Start on All).
const fs = require("fs");
const path = require("path");

const out = path.join(__dirname, "docs");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const [from, to] of [["public/index.html", "index.html"], ["public/mock.js", "mock.js"], ["emails.json", "emails.json"], ["replay.json", "replay.json"]]) {
  if (fs.existsSync(path.join(__dirname, from))) fs.copyFileSync(path.join(__dirname, from), path.join(out, to));
}
fs.writeFileSync(path.join(out, ".nojekyll"), "");
const hasReplay = fs.existsSync(path.join(out, "replay.json"));
console.log(`Built docs/ (${hasReplay ? "replay of a real Jev run" : "mock mode, no replay.json yet"})`);
