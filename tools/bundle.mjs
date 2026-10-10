// What goes to the Pi: the same files for npm run deploy and for the release package.
//
// dist/pi is the server as one file, dist/app/app.js the script of the pet page. The TypeScript
// sources stay behind: without them the setup on the Pi takes the files as they are and compiles
// nothing. So do the app's projects for the stores.

export const BUNDLE_FILES = ["app", "pi", "dist/pi", "dist/app/app.js", "systemd", "setup.sh", "requirements.txt",
  "config.example.ini", "README.md", "LICENSE"];

/** tar arguments that leave out what the Pi does not need. */
export const BUNDLE_EXCLUDES = ["--exclude", "__pycache__", "--exclude", "pi/src", "--exclude", "pi/test",
  "--exclude", "app/src", "--exclude", "app/android", "--exclude", "app/ios", "--exclude", "app/native",
  "--exclude", "app/tsconfig.json"];
