from pathlib import Path
from typing import List, Optional
import argparse
import sys

SCRIPT_DIR = Path(__file__).resolve().parent
IMAGES_DIR = SCRIPT_DIR.parent / "assets" / "images"
WEBP_QUALITY = 85
ONLY_PNG_NAMES = ["image1.png", "image2.png"]


def convert_png_to_webp(
    images_dir: Path,
    replace_original: bool = False,
    only_files: Optional[List[str]] = None,
    quality: int = WEBP_QUALITY,
) -> int:
    if only_files:
        pngs = []
        for name in only_files:
            p = images_dir / name
            if p.exists():
                pngs.append(p)
            else:
                print(f"Not found: {p}")
        if not pngs:
            print("No matching PNG files found.")
            return 0
    else:
        pngs = list(images_dir.rglob("*.png"))
        if not pngs:
            print(f"No PNG files found in {images_dir}")
            return 0

    try:
        from PIL import Image
    except ImportError:
        print("Install Pillow: pip install Pillow")
        return 1

    failed = 0
    converted = 0
    skipped = 0
    total_before = 0
    total_after = 0
    increased_files: List[str] = []

    for png_path in pngs:
        webp_path = png_path.with_suffix(".webp")
        try:
            png_stat = png_path.stat()
            total_before += png_stat.st_size

            if webp_path.exists() and webp_path.stat().st_mtime >= png_stat.st_mtime:
                skipped += 1
                print(f"Skip (WebP newer): {png_path.relative_to(images_dir)}")
                continue

            img = Image.open(png_path)
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGBA")
            elif img.mode != "RGB":
                img = img.convert("RGB")

            img.save(webp_path, "WEBP", quality=quality)

            webp_stat = webp_path.stat()
            total_after += webp_stat.st_size
            delta_bytes = webp_stat.st_size - png_stat.st_size
            delta_pct = (delta_bytes / png_stat.st_size * 100) if png_stat.st_size else 0
            rel = png_path.relative_to(images_dir)
            if delta_bytes > 0:
                increased_files.append(str(rel))
            print(
                f"OK {rel} -> {rel.with_suffix('.webp')} "
                f"({png_stat.st_size // 1024}KB -> {webp_stat.st_size // 1024}KB, "
                f"{'+' if delta_pct >= 0 else ''}{delta_pct:.0f}%)"
            )
            if replace_original:
                png_path.unlink()
                print(f"Removed original {rel}")
            converted += 1
        except Exception as e:
            failed += 1
            print(f"Error {png_path}: {e}")

    total_delta = total_after - total_before
    total_pct = (total_delta / total_before * 100) if total_before else 0
    print(
        f"Done. converted={converted}, skipped={skipped}, failed={failed}, "
        f"total={'+' if total_delta >= 0 else ''}{abs(total_delta) // 1024}KB "
        f"({'+' if total_pct >= 0 else ''}{total_pct:.0f}%)"
    )
    if increased_files:
        print(
            "Note: cac file anh "
            + ", ".join(increased_files)
            + " sau khi chuyen doi sang .webp co dau hieu tang size "
            + "(do anh .png da toi uu tot hon roi, luu y nen dung .png tot hon dung .webp)."
        )
    return 1 if failed > 0 else 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert PNG to WebP in assets/images")
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Delete original PNG after successful convert",
    )
    parser.add_argument(
        "--dir",
        type=Path,
        default=IMAGES_DIR,
        help=f"Images directory (default: {IMAGES_DIR})",
    )
    parser.add_argument(
        "--only",
        action="store_true",
        help=f"Convert only 2 files: {', '.join(ONLY_PNG_NAMES)}",
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=WEBP_QUALITY,
        help=f"WebP quality (0-100, default: {WEBP_QUALITY})",
    )
    args = parser.parse_args()

    if not args.dir.is_dir():
        print(f"Not a directory: {args.dir}")
        sys.exit(1)
    if args.quality < 0 or args.quality > 100:
        print("Invalid quality. Use 0-100.")
        sys.exit(1)

    only_files = ONLY_PNG_NAMES if args.only else None
    if only_files:
        print(f"Converting only: {', '.join(only_files)} -> WebP (quality={args.quality})")
    else:
        print(f"Converting PNG -> WebP in {args.dir} (quality={args.quality})")
    if args.replace:
        print("(originals will be deleted after convert)")

    exit_code = convert_png_to_webp(
        args.dir,
        replace_original=args.replace,
        only_files=only_files,
        quality=args.quality,
    )
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
