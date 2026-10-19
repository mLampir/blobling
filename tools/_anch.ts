import { faceAnchor } from "../core/src/sprites";
import { readSheets } from "../pi/src/assets";
const sheets = readSheets();
for (const [name, s] of Object.entries(sheets)) {
  if (!name.endsWith("_body")) continue;
  const out: string[] = [];
  for (const tag of ["idle", "squash", "stretch", "flat", "sleep", "lookout_left", "lookout_right", "walk", "flutter", "shine", "toss_low", "toss_high"]) {
    if (!s.has(tag)) continue;
    for (let t = 0; t < 4; t += 0.05) out.push(JSON.stringify(faceAnchor(s.frame(tag, t)[0], s.faceTop, s.faceCenter, s.faceShift)));
  }
  console.log(name, out.join(""));
}
