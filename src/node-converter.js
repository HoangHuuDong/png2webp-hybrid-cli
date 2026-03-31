const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");

const DEFAULT_QUALITY = 85;
const ONLY_PNG_NAMES = ["image1.png", "image2.png"];

async function walkPngFiles(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkPngFiles(fullPath)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".png")) {
      out.push(fullPath);
    }
  }
  return out;
}

async function resolvePngFiles(imagesDir, only) {
  if (!only) return walkPngFiles(imagesDir);
  const checks = ONLY_PNG_NAMES.map((name) => path.join(imagesDir, name));
  const found = [];
  for (const filePath of checks) {
    try {
      await fs.access(filePath);
      found.push(filePath);
    } catch {
      console.log(`Not found: ${filePath}`);
    }
  }
  return found;
}

function formatKb(bytes) {
  return `${Math.floor(bytes / 1024)}KB`;
}

async function convertWithNode({
  imagesDir,
  replaceOriginal = false,
  only = false,
  quality = DEFAULT_QUALITY,
}) {
  const pngPaths = await resolvePngFiles(imagesDir, only);
  if (pngPaths.length === 0) {
    if (only) {
      console.log("No matching PNG files found.");
    } else {
      console.log(`No PNG files found in ${imagesDir}`);
    }
    return { converted: 0, skipped: 0, failed: 0 };
  }

  let converted = 0;
  let skipped = 0;
  let failed = 0;
  let totalBefore = 0;
  let totalAfter = 0;

  for (const pngPath of pngPaths) {
    const webpPath = pngPath.replace(/\.png$/i, ".webp");
    try {
      const pngStat = await fs.stat(pngPath);
      totalBefore += pngStat.size;

      try {
        const webpStat = await fs.stat(webpPath);
        if (webpStat.mtimeMs >= pngStat.mtimeMs) {
          skipped += 1;
          const rel = path.relative(imagesDir, pngPath);
          console.log(`Skip (WebP newer): ${rel}`);
          continue;
        }
      } catch {
        // No existing webp file, proceed convert.
      }

      await sharp(pngPath).webp({ quality }).toFile(webpPath);

      const webpStat = await fs.stat(webpPath);
      totalAfter += webpStat.size;
      const saved = pngStat.size - webpStat.size;
      const pct = pngStat.size ? (saved / pngStat.size) * 100 : 0;
      const rel = path.relative(imagesDir, pngPath);
      console.log(
        `OK ${rel} -> ${rel.replace(/\.png$/i, ".webp")} (${formatKb(
          pngStat.size
        )} -> ${formatKb(webpStat.size)}, -${pct.toFixed(0)}%)`
      );

      if (replaceOriginal) {
        await fs.unlink(pngPath);
        console.log(`Removed original ${rel}`);
      }
      converted += 1;
    } catch (err) {
      failed += 1;
      console.error(`Error ${pngPath}: ${err.message}`);
    }
  }

  const totalSaved = totalBefore - totalAfter;
  const totalPct = totalBefore ? (totalSaved / totalBefore) * 100 : 0;
  console.log(
    `Done. converted=${converted}, skipped=${skipped}, failed=${failed}, saved=${formatKb(
      Math.max(totalSaved, 0)
    )} (${totalPct.toFixed(0)}%)`
  );

  return { converted, skipped, failed };
}

module.exports = {
  DEFAULT_QUALITY,
  ONLY_PNG_NAMES,
  convertWithNode,
};
