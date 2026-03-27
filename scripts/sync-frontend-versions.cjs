const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const rootPackagePath = path.join(rootDir, "package.json");
const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, "utf8"));
const sharedVersion = rootPackage.version;

const packagePaths = [
  path.join(rootDir, "apps/web/package.json"),
  path.join(rootDir, "apps/desktop/package.json"),
  path.join(rootDir, "apps/desktop/renderer/package.json"),
  path.join(rootDir, "packages/app/package.json"),
];

for (const packagePath of packagePaths) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  if (packageJson.version === sharedVersion) {
    continue;
  }

  packageJson.version = sharedVersion;
  fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
}
