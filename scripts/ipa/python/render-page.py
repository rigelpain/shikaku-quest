"""
PDF の指定ページを PNG に描画する（図の目視確認用）。macOS Quartz を使う。

使い方:
  <venv>/bin/python3 -I scripts/ipa/python/render-page.py <pdf> <page> [<out.png>] [--scale 2.0]
"""
import os
import sys

import Quartz
from Foundation import NSURL


def render(pdf, page_no, out, scale):
    doc = Quartz.CGPDFDocumentCreateWithURL(NSURL.fileURLWithPath_(os.path.abspath(pdf)))
    page = Quartz.CGPDFDocumentGetPage(doc, page_no)
    box = Quartz.CGPDFPageGetBoxRect(page, Quartz.kCGPDFMediaBox)
    w, h = int(box.size.width * scale), int(box.size.height * scale)
    cs = Quartz.CGColorSpaceCreateDeviceRGB()
    ctx = Quartz.CGBitmapContextCreate(None, w, h, 8, w * 4, cs, Quartz.kCGImageAlphaPremultipliedLast)
    Quartz.CGContextSetRGBFillColor(ctx, 1, 1, 1, 1)
    Quartz.CGContextFillRect(ctx, Quartz.CGRectMake(0, 0, w, h))
    Quartz.CGContextScaleCTM(ctx, scale, scale)
    t = Quartz.CGPDFPageGetDrawingTransform(page, Quartz.kCGPDFMediaBox, Quartz.CGRectMake(0, 0, box.size.width, box.size.height), 0, True)
    Quartz.CGContextConcatCTM(ctx, t)
    Quartz.CGContextDrawPDFPage(ctx, page)
    img = Quartz.CGBitmapContextCreateImage(ctx)
    dest = Quartz.CGImageDestinationCreateWithURL(NSURL.fileURLWithPath_(os.path.abspath(out)), "public.png", 1, None)
    Quartz.CGImageDestinationAddImage(dest, img, None)
    Quartz.CGImageDestinationFinalize(dest)


def main(argv):
    scale = 2.0
    args = []
    i = 0
    while i < len(argv):
        if argv[i] == "--scale":
            scale = float(argv[i + 1])
            i += 2
        else:
            args.append(argv[i])
            i += 1
    if len(args) < 2:
        print(__doc__)
        return 2
    pdf, page = args[0], int(args[1])
    out = args[2] if len(args) > 2 else f"{os.path.splitext(os.path.basename(pdf))[0]}-p{page}.png"
    render(pdf, page, out, scale)
    print(out)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
