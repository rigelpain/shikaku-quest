"""
画像のみの PDF（AP 午前の問題冊子など）を macOS Vision フレームワークで OCR し、
ページ毎のテキストを JSON（string[]）として .cache/ipa/ocr/<basename>.pages.json に書き出す。

使い方:
  <venv>/bin/python3 -I scripts/ipa/python/ocr.py <pdf> [<pdf> ...] [--scale 3.0] [--out .cache/ipa/ocr]

出力の行順は、Vision の観測（行単位）を上から下、同じ高さなら左から右に並べたもの。
同じ行に複数の観測がある場合（「ア xxx イ yyy」の 2 列など）は空白で連結する。
"""
import json
import os
import sys
import time

import Quartz
import Vision
from Foundation import NSURL


def render_page(doc, page_no, scale):
    page = Quartz.CGPDFDocumentGetPage(doc, page_no)
    box = Quartz.CGPDFPageGetBoxRect(page, Quartz.kCGPDFMediaBox)
    w = int(box.size.width * scale)
    h = int(box.size.height * scale)
    cs = Quartz.CGColorSpaceCreateDeviceRGB()
    ctx = Quartz.CGBitmapContextCreate(None, w, h, 8, w * 4, cs, Quartz.kCGImageAlphaPremultipliedLast)
    Quartz.CGContextSetRGBFillColor(ctx, 1, 1, 1, 1)
    Quartz.CGContextFillRect(ctx, Quartz.CGRectMake(0, 0, w, h))
    Quartz.CGContextScaleCTM(ctx, scale, scale)
    # 回転（Rotate 属性）を考慮した変換
    transform = Quartz.CGPDFPageGetDrawingTransform(page, Quartz.kCGPDFMediaBox, Quartz.CGRectMake(0, 0, box.size.width, box.size.height), 0, True)
    Quartz.CGContextConcatCTM(ctx, transform)
    Quartz.CGContextDrawPDFPage(ctx, page)
    return Quartz.CGBitmapContextCreateImage(ctx)


def ocr_image(cg_image):
    request = Vision.VNRecognizeTextRequest.alloc().init()
    request.setRecognitionLevel_(Vision.VNRequestTextRecognitionLevelAccurate)
    request.setRecognitionLanguages_(["ja-JP", "en-US"])
    request.setUsesLanguageCorrection_(True)
    handler = Vision.VNImageRequestHandler.alloc().initWithCGImage_options_(cg_image, None)
    ok, err = handler.performRequests_error_([request], None)
    if not ok:
        raise RuntimeError(f"Vision error: {err}")
    obs = []
    for o in request.results() or []:
        cand = o.topCandidates_(1)
        if not cand:
            continue
        text = cand[0].string()
        bb = o.boundingBox()  # 正規化座標、原点は左下
        x = bb.origin.x
        y = bb.origin.y
        h = bb.size.height
        obs.append({"text": text, "x": x, "yc": y + h / 2, "h": h})
    return obs


def observations_to_lines(obs):
    """上から下へ。中心 y が近い（行高の 0.6 倍以内）観測は同じ行として x 順に並べる。"""
    obs = sorted(obs, key=lambda o: -o["yc"])
    lines = []
    cur = []
    for o in obs:
        if cur:
            ref = cur[0]
            tol = max(ref["h"], o["h"]) * 0.6
            if abs(ref["yc"] - o["yc"]) <= tol:
                cur.append(o)
                continue
            lines.append(cur)
        cur = [o]
    if cur:
        lines.append(cur)
    out = []
    for group in lines:
        group.sort(key=lambda o: o["x"])
        out.append(" ".join(o["text"] for o in group))
    return out


def main(argv):
    scale = 3.0
    out_dir = None
    pdfs = []
    i = 0
    while i < len(argv):
        a = argv[i]
        if a == "--scale":
            scale = float(argv[i + 1])
            i += 2
        elif a == "--out":
            out_dir = argv[i + 1]
            i += 2
        else:
            pdfs.append(a)
            i += 1
    if not pdfs:
        print(__doc__)
        return 2
    for pdf in pdfs:
        pdf = os.path.abspath(pdf)
        if out_dir is None:
            out_dir = os.path.join(os.path.dirname(os.path.dirname(pdf)), "ocr")
        os.makedirs(out_dir, exist_ok=True)
        dest = os.path.join(out_dir, os.path.basename(pdf).rsplit(".", 1)[0] + ".pages.json")
        url = NSURL.fileURLWithPath_(pdf)
        doc = Quartz.CGPDFDocumentCreateWithURL(url)
        n = Quartz.CGPDFDocumentGetNumberOfPages(doc)
        pages = []
        t0 = time.time()
        for p in range(1, n + 1):
            img = render_page(doc, p, scale)
            lines = observations_to_lines(ocr_image(img))
            pages.append("\n".join(lines))
            print(f"  {os.path.basename(pdf)} page {p}/{n} ({len(lines)} lines, {time.time() - t0:.0f}s)", flush=True)
        with open(dest, "w", encoding="utf-8") as f:
            json.dump(pages, f, ensure_ascii=False, indent=0)
        print(f"wrote {dest}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
