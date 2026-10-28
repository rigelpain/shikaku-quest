/** 擬似言語（IPA 記述形式）のインデントを復元する。PDF テキストでは先頭の空白が失われるため。 */

const OPEN_RES: Array<[RegExp, string]> = [
  [/^if\s*\(/, "if"],
  [/^for\s*\(/, "for"],
  [/^while\s*\(/, "while"],
  [/^do\b/, "do"],
];

export function indentPseudo(lines: string[], indentUnit = "  "): string[] {
  const out: string[] = [];
  const stack: string[] = [];
  let base = 0; // ○ 関数宣言の後は 1
  const pad = (level: number) => indentUnit.repeat(Math.max(0, level));
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      out.push("");
      continue;
    }
    if (/^[○〇]/.test(line)) {
      stack.length = 0;
      base = 1;
      out.push(line);
      continue;
    }
    if (/^大域\s*[:：]/.test(line)) {
      stack.length = 0;
      base = 0;
      out.push(line);
      continue;
    }
    if (/^(endif|endfor|endwhile)\b/.test(line)) {
      stack.pop();
      out.push(pad(base + stack.length) + line);
      continue;
    }
    if (/^(else|elseif)\b/.test(line)) {
      out.push(pad(base + stack.length - 1) + line);
      continue;
    }
    if (/^while\s*\(/.test(line) && stack[stack.length - 1] === "do") {
      stack.pop();
      out.push(pad(base + stack.length) + line);
      continue;
    }
    const open = OPEN_RES.find(([re]) => re.test(line));
    out.push(pad(base + stack.length) + line);
    if (open) stack.push(open[1]);
  }
  return out;
}
