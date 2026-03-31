#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  convertWithNode,
  DEFAULT_QUALITY,
  ONLY_PNG_NAMES,
} = require("../src/node-converter");

function printHelp() {
  console.log(`png2webp - Convert PNG/JPG/JPEG images to WebP

Usage:
  png2webp [options]

Options:
  --dir <path>          Images directory (default: ./assets/images)
  --replace             Delete original source file after successful conversion (also when WebP is newer)
  --only                Convert only: ${ONLY_PNG_NAMES.join(", ")}
  --quality <0-100>     WebP quality (default: ${DEFAULT_QUALITY})
  --engine <name>       node | python | auto (default: auto)
  -h, --help            Show help
`);
}

function parseArgs(argv) {
  const args = {
    dir: path.resolve(process.cwd(), "assets/images"),
    replace: false,
    only: false,
    quality: DEFAULT_QUALITY,
    engine: "auto",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--replace") {
      args.replace = true;
    } else if (token === "--only") {
      args.only = true;
    } else if (token === "--dir") {
      i += 1;
      args.dir = path.resolve(process.cwd(), argv[i] || "");
    } else if (token === "--quality") {
      i += 1;
      args.quality = Number(argv[i]);
    } else if (token === "--engine") {
      i += 1;
      args.engine = (argv[i] || "").toLowerCase();
    } else if (token === "-h" || token === "--help") {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }

  if (!Number.isFinite(args.quality) || args.quality < 0 || args.quality > 100) {
    throw new Error("Invalid --quality value, expected number from 0 to 100");
  }
  if (!["node", "python", "auto"].includes(args.engine)) {
    throw new Error("Invalid --engine value, expected: node | python | auto");
  }
  return args;
}

function validateDir(dir) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new Error(`Not a directory: ${dir}`);
  }
}

function hasPython3() {
  const check = spawnSync("python3", ["--version"], { stdio: "pipe" });
  return check.status === 0;
}

function hasPillow() {
  const check = spawnSync(
    "python3",
    ["-c", "from PIL import Image; print('ok')"],
    { stdio: "pipe" }
  );
  return check.status === 0;
}

function runPython(args) {
  if (!hasPython3()) {
    throw new Error("Python3 is required for Python engine. Install Python3 first.");
  }
  if (!hasPillow()) {
    throw new Error(
      "Pillow is missing. Install with: pip3 install Pillow (or pip install Pillow)"
    );
  }
  const scriptPath = path.join(__dirname, "../python/convert.py");
  const pyArgs = [scriptPath, "--dir", args.dir, "--quality", String(args.quality)];
  if (args.replace) pyArgs.push("--replace");
  if (args.only) pyArgs.push("--only");

  const result = spawnSync("python3", pyArgs, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`Python engine failed with exit code ${result.status}`);
  }
}

async function runNode(args) {
  const result = await convertWithNode({
    imagesDir: args.dir,
    replaceOriginal: args.replace,
    only: args.only,
    quality: args.quality,
  });
  if (result.failed > 0) {
    throw new Error(`Node engine had ${result.failed} failed file(s).`);
  }
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      process.exit(0);
    }
    validateDir(args.dir);

    console.log(`Converting PNG/JPG/JPEG -> WebP in ${args.dir} (quality=${args.quality})`);
    if (args.only) {
      console.log(`Converting only: ${ONLY_PNG_NAMES.join(", ")}`);
    }
    if (args.replace) {
      console.log("(originals will be deleted after convert)");
    }
    console.log(`Engine mode: ${args.engine}`);

    if (args.engine === "node") {
      await runNode(args);
      return;
    }
    if (args.engine === "python") {
      runPython(args);
      return;
    }

    try {
      await runNode(args);
    } catch (nodeErr) {
      console.warn(`Node engine failed: ${nodeErr.message}`);
      console.warn("Falling back to Python engine...");
      runPython(args);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
