"""
PDF の指定ページを PNG に描画する。macOS Quartz を使う。
図の目視確認のほか、figures.ts が問題の図画像（public/data/figures/*.png）を作るのにも使う。

使い方:
  <venv>/bin/python3 -I scripts/ipa/python/render-page.py <pdf> <page> [<out.png>] [--scale 2.0 | --width 1200] [--gray] [--levels 16]

  --scale   PDF のポイント数に対する倍率（既定 2.0）
  --width   出力の横幅（px）。指定すると --scale より優先
  --gray    8bit グレースケールで書き出す（RGB よりファイルサイズが半分ほどになる）
  --levels  グレースケールを N 階調（2〜16）に落とし、4bit の PNG を自前で書く（--gray を含む）。
            スキャン PDF の背景ノイズが消え、ファイルサイズが 1/3 ほどになる。黒点 30 / 白点 240 でレベル補正する
"""
import os
import struct
import sys
import zlib

import Quartz
from Foundation import NSURL


# --levels のレベル補正: この値以下を黒、以上を白にする（スキャンの薄いノイズを飛ばす）
BLACK_POINT = 30
WHITE_POINT = 240


def write_png_gray4(path, w, h, pixels, levels):
    """8bit グレー画素（行パディングなし）を levels 階調に落とし、4bit グレースケール PNG を書く（外部ライブラリ不要）。"""
    if not 2 <= levels <= 16:
        raise SystemExit("--levels は 2〜16")
    top = levels - 1
    lut = bytearray(256)
    for v in range(256):
        x = (v - BLACK_POINT) / (WHITE_POINT - BLACK_POINT)
        x = 0.0 if x < 0 else 1.0 if x > 1 else x
        # 4bit PNG は 0..15 がそのまま明度になるので、levels 階調を 0..15 に広げて置く
        lut[v] = round(round(x * top) * 15 / top)
    q = bytes(pixels).translate(bytes(lut))
    rows = bytearray()
    for y in range(h):
        row = q[y * w : (y + 1) * w]
        if w % 2:
            row += b"\x00"
        rows.append(0)  # フィルタ: None
        rows += bytes((row[i] << 4) | row[i + 1] for i in range(0, len(row), 2))

    def chunk(kind, body):
        return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 4, 0, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(rows), 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


def render(pdf, page_no, out, scale=2.0, width=None, gray=False, levels=None):
    doc = Quartz.CGPDFDocumentCreateWithURL(NSURL.fileURLWithPath_(os.path.abspath(pdf)))
    if doc is None:
        raise SystemExit(f"cannot open PDF: {pdf}")
    count = Quartz.CGPDFDocumentGetNumberOfPages(doc)
    if not 1 <= page_no <= count:
        raise SystemExit(f"page {page_no} out of range (1..{count}): {pdf}")
    page = Quartz.CGPDFDocumentGetPage(doc, page_no)
    box = Quartz.CGPDFPageGetBoxRect(page, Quartz.kCGPDFMediaBox)
    if width:
        scale = width / box.size.width
    w, h = int(round(box.size.width * scale)), int(round(box.size.height * scale))
    if levels:
        gray = True
    if gray:
        cs = Quartz.CGColorSpaceCreateDeviceGray()
        ctx = Quartz.CGBitmapContextCreate(None, w, h, 8, w, cs, Quartz.kCGImageAlphaNone)
    else:
        cs = Quartz.CGColorSpaceCreateDeviceRGB()
        ctx = Quartz.CGBitmapContextCreate(None, w, h, 8, w * 4, cs, Quartz.kCGImageAlphaPremultipliedLast)
    Quartz.CGContextSetGrayFillColor(ctx, 1, 1)
    Quartz.CGContextFillRect(ctx, Quartz.CGRectMake(0, 0, w, h))
    Quartz.CGContextSetInterpolationQuality(ctx, Quartz.kCGInterpolationHigh)
    Quartz.CGContextScaleCTM(ctx, scale, scale)
    t = Quartz.CGPDFPageGetDrawingTransform(page, Quartz.kCGPDFMediaBox, Quartz.CGRectMake(0, 0, box.size.width, box.size.height), 0, True)
    Quartz.CGContextConcatCTM(ctx, t)
    Quartz.CGContextDrawPDFPage(ctx, page)
    img = Quartz.CGBitmapContextCreateImage(ctx)
    if levels:
        pixels = Quartz.CGDataProviderCopyData(Quartz.CGImageGetDataProvider(img))
        write_png_gray4(os.path.abspath(out), w, h, pixels, levels)
        return w, h
    dest = Quartz.CGImageDestinationCreateWithURL(NSURL.fileURLWithPath_(os.path.abspath(out)), "public.png", 1, None)
    Quartz.CGImageDestinationAddImage(dest, img, None)
    if not Quartz.CGImageDestinationFinalize(dest):
        raise SystemExit(f"cannot write PNG: {out}")
    return w, h


def main(argv):
    scale = 2.0
    width = None
    gray = False
    levels = None
    args = []
    i = 0
    while i < len(argv):
        if argv[i] == "--scale":
            scale = float(argv[i + 1])
            i += 2
        elif argv[i] == "--width":
            width = int(argv[i + 1])
            i += 2
        elif argv[i] == "--gray":
            gray = True
            i += 1
        elif argv[i] == "--levels":
            levels = int(argv[i + 1])
            i += 2
        else:
            args.append(argv[i])
            i += 1
    if len(args) < 2:
        print(__doc__)
        return 2
    pdf, page = args[0], int(args[1])
    out = args[2] if len(args) > 2 else f"{os.path.splitext(os.path.basename(pdf))[0]}-p{page}.png"
    w, h = render(pdf, page, out, scale=scale, width=width, gray=gray, levels=levels)
    print(f"{out}\t{w}x{h}\t{os.path.getsize(out)} bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
