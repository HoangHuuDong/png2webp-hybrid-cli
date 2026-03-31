# png2webp-hybrid-cli

Convert PNG/JPG/JPEG images to WebP for frontend projects with a hybrid engine:
- Primary engine: Node.js (`sharp`)
- Fallback engine: Python (`Pillow`)

This is useful when FE builds contain many large image files and you need a quick CLI conversion flow.

## Install

```bash
npm install -g png2webp-hybrid-cli
```

or run without install:

```bash
npx png2webp-hybrid-cli --dir ./src/assets/images
```

## Usage

```bash
png2webp [options]
```

Options:

- `--dir <path>`: images directory (default `./assets/images`)
- `--replace`: remove original source image after successful convert (and also when `.webp` is newer)
- `--only`: convert only `image1.png` and `image2.png`
- `--quality <0-100>`: WebP quality (default `85`)
- `--engine <node|python|auto>`: conversion engine (default `auto`)
- `-h, --help`: show help

## Example commands

```bash
# Convert all PNG/JPG/JPEG recursively in React/Vite assets directory
png2webp --dir ./src/assets/images

# Convert only image1.png and image2.png
png2webp --dir ./src/assets/images --only

# Convert and delete source originals
png2webp --dir ./src/assets/images --replace

# Force Node engine
png2webp --dir ./src/assets/images --engine node

# Force Python engine
png2webp --dir ./src/assets/images --engine python
```

## Engine behavior

- `--engine node`: run Node engine only, fail if conversion has errors.
- `--engine python`: run Python engine only, requires `python3` and `Pillow`.
- `--engine auto`: try Node first, then fallback to Python if Node fails.

## Safe usage flow

To avoid accidental data loss, run in 2 steps:

```bash
# 1) Dry run (without replace)
npx png2webp-hybrid-cli@latest --dir ./src/assets/images

# 2) After reviewing results, run replace
npx png2webp-hybrid-cli@latest --dir ./src/assets/images --replace
```

## Python fallback requirements

Python fallback is only used when:
- You run `--engine python`, or
- You run `--engine auto` and Node engine fails.

Install dependencies:

```bash
python3 --version
pip3 install Pillow
```

## Exit codes

- `0`: successful conversion flow
- `1`: invalid args, missing dependencies, or conversion failure

## Release notes

### 1.0.0
- Initial public release
- Hybrid conversion engine (Node primary, Python fallback)
- Support for `--dir`, `--replace`, `--only`, `--quality`, and `--engine`
