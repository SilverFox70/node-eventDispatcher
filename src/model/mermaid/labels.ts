/** Keep delimiters inert even after Mermaid entity decoding; never emit HTML or directives. */
export function label(value: string): string {
  const inert: Record<string, string> = { '<': '＜', '>': '＞', '&': '＆', '%': '％', '#': '＃', '`': '｀' };
  return [...value.replace(/\r\n?|\n|\u2028|\u2029/g, ' ⏎ ')].map(char => {
    if (Object.hasOwn(inert, char)) return inert[char];
    if (/[\p{Cc}\p{Cf}]/u.test(char)) return ' ';
    if ('"[]{}\\|'.includes(char)) return `#${char.codePointAt(0)!};`;
    return char;
  }).join('');
}
