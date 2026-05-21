declare const process: {
  cwd: () => string;
};
declare const require: (moduleName: string) => unknown;

const { readdirSync, readFileSync, statSync } = require("fs") as {
  readdirSync: (path: string) => string[];
  readFileSync: (path: string, encoding: "utf8") => string;
  statSync: (path: string) => {
    isDirectory: () => boolean;
    isFile: () => boolean;
  };
};

type SourceLayer =
  | "application"
  | "screens"
  | "features"
  | "entities"
  | "shared";

type SourceOwner =
  | {
      layer: "app";
      segment: null;
      slice: null;
    }
  | {
      layer: SourceLayer;
      segment: string | null;
      slice: string | null;
    };

const allowedSliceSegments = new Set([
  "api",
  "assets",
  "config",
  "i18n",
  "lib",
  "model",
  "routes",
  "ui",
]);
const allowedSharedSegments = new Set([
  "api",
  "config",
  "i18n",
  "lib",
  "routes",
  "ui",
]);
const disallowedSegmentNames = new Set([
  "components",
  "constants",
  "helpers",
  "hooks",
  "types",
  "utils",
]);
const sourceFilePattern = /\.(ts|tsx)$/;
const sourceImportPattern =
  /\b(?:import|export)\s+(?:type\s+)?[\s\S]*?\s+from\s+["']~\/([^"']+)["']/g;
const bareImportPattern = /\bimport\s+["']~\/([^"']+)["']/g;
const requirePattern = /\brequire\(\s*["']~\/([^"']+)["']\s*\)/g;
const dynamicImportPattern = /\bimport\(\s*["']~\/([^"']+)["']\s*\)/g;
const wildcardExportPattern = /^\s*export\s+\*\s+from\s+["'][^"']+["'];/m;

function getWorkspacePath(relativePath: string): string {
  return `${process.cwd()}/${relativePath}`;
}

function listSourceFiles(relativePath: string): string[] {
  return readdirSync(getWorkspacePath(relativePath)).flatMap((entry) => {
    const entryPath = `${relativePath}/${entry}`;
    const entryStat = statSync(getWorkspacePath(entryPath));

    if (entryStat.isDirectory()) {
      return listSourceFiles(entryPath);
    }

    return sourceFilePattern.test(entryPath) ? [entryPath] : [];
  });
}

function listDirectories(relativePath: string): string[] {
  return readdirSync(getWorkspacePath(relativePath)).filter((entry) =>
    statSync(getWorkspacePath(`${relativePath}/${entry}`)).isDirectory()
  );
}

function listFiles(relativePath: string): string[] {
  return readdirSync(getWorkspacePath(relativePath)).filter((entry) =>
    statSync(getWorkspacePath(`${relativePath}/${entry}`)).isFile()
  );
}

function getEntityPublicApiFiles(): string[] {
  return listDirectories("src/entities").flatMap((slice) => {
    const slicePath = `src/entities/${slice}`;
    const rootFiles = listFiles(slicePath);
    const segmentDirectories = listDirectories(slicePath);

    return [
      `${slicePath}/index.ts`,
      ...(rootFiles.includes("testing.ts") ? [`${slicePath}/testing.ts`] : []),
      ...(segmentDirectories.includes("api")
        ? [`${slicePath}/api/index.ts`]
        : []),
    ];
  });
}

function getSourceOwner(relativePath: string): SourceOwner | null {
  const parts = relativePath.split("/");

  if (parts[0] === "app") {
    return {
      layer: "app",
      segment: null,
      slice: null,
    };
  }

  if (parts[0] !== "src") {
    return null;
  }

  const layer = parts[1] as SourceLayer | undefined;

  if (!layer || !isSourceLayer(layer)) {
    return null;
  }

  if (layer === "application" || layer === "shared") {
    return {
      layer,
      segment: parts[2] ?? null,
      slice: null,
    };
  }

  return {
    layer,
    segment: parts[3] ?? null,
    slice: parts[2] ?? null,
  };
}

function isSourceLayer(value: string): value is SourceLayer {
  return ["application", "screens", "features", "entities", "shared"].includes(
    value
  );
}

function collectAliasImports(source: string): string[] {
  const imports = new Set<string>();

  for (const pattern of [
    sourceImportPattern,
    bareImportPattern,
    requirePattern,
    dynamicImportPattern,
  ]) {
    pattern.lastIndex = 0;

    let match = pattern.exec(source);

    while (match) {
      imports.add(match[1]);
      match = pattern.exec(source);
    }
  }

  return [...imports];
}

function isSameSlice(source: SourceOwner, importPath: string): boolean {
  if (
    source.layer !== "screens" &&
    source.layer !== "features" &&
    source.layer !== "entities"
  ) {
    return false;
  }

  const parts = importPath.split("/");

  return parts[0] === source.layer && parts[1] === source.slice;
}

function isLayerImportAllowed({
  importPath,
  source,
  sourceLayer,
  targetLayer,
}: {
  importPath: string;
  source: SourceOwner;
  sourceLayer: SourceOwner["layer"];
  targetLayer: SourceLayer;
}): boolean {
  if (sourceLayer === "app") {
    return (
      ["application", "screens", "shared"].includes(targetLayer) ||
      importPath === "features/navigation"
    );
  }

  if (sourceLayer === "application") {
    return ["application", "features", "entities", "shared"].includes(
      targetLayer
    );
  }

  if (sourceLayer === "screens") {
    return [
      "application",
      "screens",
      "features",
      "entities",
      "shared",
    ].includes(targetLayer);
  }

  if (sourceLayer === "features") {
    return ["features", "entities", "shared"].includes(targetLayer);
  }

  if (sourceLayer === "entities") {
    return targetLayer === "shared" || isSameSlice(source, importPath);
  }

  return targetLayer === "shared";
}

function isPublicImportAllowed(
  source: SourceOwner,
  importPath: string
): boolean {
  const parts = importPath.split("/");
  const targetLayer = parts[0];

  if (!isSourceLayer(targetLayer)) {
    return true;
  }

  if (targetLayer === "shared") {
    return true;
  }

  if (isSameSlice(source, importPath)) {
    return true;
  }

  if (targetLayer === "application") {
    return parts.length === 2;
  }

  if (targetLayer === "screens" || targetLayer === "features") {
    return parts.length === 2;
  }

  if (targetLayer === "entities") {
    return (
      parts.length === 2 ||
      (parts.length === 3 && ["api", "testing"].includes(parts[2]))
    );
  }

  return true;
}

describe("FSD import rules", () => {
  it("cross-layer import는 현재 React Native FSD 방향을 따른다", () => {
    const violations = listSourceFiles("app")
      .concat(listSourceFiles("src"))
      .flatMap((file) => {
        const sourceOwner = getSourceOwner(file);

        if (!sourceOwner) {
          return [];
        }

        const source = readFileSync(getWorkspacePath(file), "utf8");

        return collectAliasImports(source)
          .flatMap((importPath) => {
            const targetLayer = importPath.split("/")[0];

            return isSourceLayer(targetLayer)
              ? [{ importPath, targetLayer }]
              : [];
          })
          .filter(
            ({ importPath, targetLayer }) =>
              !isLayerImportAllowed({
                importPath,
                source: sourceOwner,
                sourceLayer: sourceOwner.layer,
                targetLayer,
              })
          )
          .map(({ importPath }) => `${file} -> ~/${importPath}`);
      });

    expect(violations).toEqual([]);
  });

  it("외부 slice 호출자는 공개 진입점만 import한다", () => {
    const violations = listSourceFiles("app")
      .concat(listSourceFiles("src"))
      .flatMap((file) => {
        const sourceOwner = getSourceOwner(file);

        if (!sourceOwner) {
          return [];
        }

        const source = readFileSync(getWorkspacePath(file), "utf8");

        return collectAliasImports(source)
          .filter(
            (importPath) => !isPublicImportAllowed(sourceOwner, importPath)
          )
          .map((importPath) => `${file} -> ~/${importPath}`);
      });

    expect(violations).toEqual([]);
  });

  it("slice root에는 index와 명시적 testing public API만 둔다", () => {
    const violations = ["src/entities", "src/features", "src/screens"].flatMap(
      (layerPath) =>
        listDirectories(layerPath).flatMap((slice) => {
          const slicePath = `${layerPath}/${slice}`;
          const allowedRootFiles =
            layerPath === "src/entities"
              ? new Set(["index.ts", "testing.ts"])
              : new Set(["index.ts"]);

          const rootFiles = listFiles(slicePath);
          const missingIndex = rootFiles.includes("index.ts")
            ? []
            : [`${slicePath}/index.ts 누락`];
          const extraRootFiles = rootFiles
            .filter((file) => sourceFilePattern.test(file))
            .filter((file) => !allowedRootFiles.has(file))
            .map((file) => `${slicePath}/${file}`);

          return missingIndex.concat(extraRootFiles);
        })
    );

    expect(violations).toEqual([]);
  });

  it("entity 공개 진입점은 명시 export만 사용한다", () => {
    const violations = getEntityPublicApiFiles().filter((file) =>
      wildcardExportPattern.test(readFileSync(getWorkspacePath(file), "utf8"))
    );

    expect(violations).toEqual([]);
  });

  it("segment 이름은 목적 중심 이름만 사용한다", () => {
    const sliceSegmentViolations = [
      "src/entities",
      "src/features",
      "src/screens",
    ].flatMap((layerPath) =>
      listDirectories(layerPath).flatMap((slice) => {
        const slicePath = `${layerPath}/${slice}`;

        return listDirectories(slicePath)
          .filter(
            (segment) =>
              disallowedSegmentNames.has(segment) ||
              !allowedSliceSegments.has(segment)
          )
          .map((segment) => `${slicePath}/${segment}`);
      })
    );
    const sharedSegmentViolations = listDirectories("src/shared")
      .filter(
        (segment) =>
          disallowedSegmentNames.has(segment) ||
          !allowedSharedSegments.has(segment)
      )
      .map((segment) => `src/shared/${segment}`);

    expect(sliceSegmentViolations.concat(sharedSegmentViolations)).toEqual([]);
  });
});
