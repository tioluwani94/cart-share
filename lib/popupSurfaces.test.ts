import fs from "node:fs";
import path from "node:path";

const sourceRoots = ["app", "components"];

function collectSourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(entryPath);
    return /\.(ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

describe("popup surfaces", () => {
  it("uses the shared bottom-sheet system instead of React Native Modal", () => {
    const modalImports = sourceRoots
      .flatMap(collectSourceFiles)
      .filter((filePath) => {
        const source = fs.readFileSync(filePath, "utf8");
        const reactNativeImports = source.matchAll(
          /import\s*{([^}]*)}\s*from\s*["']react-native["']/g,
        );

        return [...reactNativeImports].some((match) =>
          match[1]
            .split(",")
            .map((name) => name.trim())
            .includes("Modal"),
        );
      });

    expect(modalImports).toEqual([]);
  });
});
