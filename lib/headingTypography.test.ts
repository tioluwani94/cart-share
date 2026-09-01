import fs from "node:fs";
import path from "node:path";

const sourceRoots = ["app", "components"];

function collectSourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(entryPath);
    return /\.tsx$/.test(entry.name) ? [entryPath] : [];
  });
}

describe("heading typography", () => {
  it("maps the heading token to the preloaded Nunito Black face", () => {
    const tailwindSource = fs.readFileSync("tailwind.config.js", "utf8");

    expect(tailwindSource).toContain('heading: ["Nunito_900Black"]');
  });

  it("uses the heading token on bold heading-sized text", () => {
    const missingHeadingToken = sourceRoots
      .flatMap(collectSourceFiles)
      .flatMap((filePath) => {
        const source = fs.readFileSync(filePath, "utf8");

        return source
          .split("\n")
          .map((line, index) => ({ filePath, line, lineNumber: index + 1 }))
          .filter(({ line }) =>
            /(?:text-(?:xl|[2-7]xl).*font-bold|font-bold.*text-(?:xl|[2-7]xl))/.test(
              line,
            ),
          )
          .filter(({ line }) => !line.includes("font-heading"));
      });

    expect(missingHeadingToken).toEqual([]);
  });

  it("does not layer a synthetic bold weight over the Nunito heading face", () => {
    const syntheticHeadingWeights = sourceRoots
      .flatMap(collectSourceFiles)
      .flatMap((filePath) => {
        const source = fs.readFileSync(filePath, "utf8");

        return source
          .split("\n")
          .map((line, index) => ({ filePath, line, lineNumber: index + 1 }))
          .filter(({ line }) =>
            /(?:font-heading.*font-bold|font-bold.*font-heading)/.test(line),
          );
      });

    expect(syntheticHeadingWeights).toEqual([]);
  });
});
