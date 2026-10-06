import fs from "fs";
import path from "path";

/**
 * Point fontconfig at the bundled fonts so sharp/librsvg can render logo text
 * on Render (which has almost no system fonts).
 */
export function ensureFontconfig(): void {
  const fontsDir = path.resolve(__dirname, "../../fonts");
  if (!fs.existsSync(fontsDir)) return;

  const confPath = path.join(fontsDir, "fonts.conf");
  if (!fs.existsSync(confPath)) {
    fs.writeFileSync(
      confPath,
      `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">
<fontconfig>
  <dir>${fontsDir}</dir>
  <cachedir>/tmp/shopmi-font-cache</cachedir>
  <config><rescan><int>30</int></rescan></config>
</fontconfig>
`
    );
  }
  process.env.FONTCONFIG_PATH = fontsDir;
  process.env.FONTCONFIG_FILE = confPath;
}
