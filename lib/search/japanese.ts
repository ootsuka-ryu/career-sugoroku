const ROMAJI_TABLE: Array<[string, string]> = [
  ["kya", "きゃ"],
  ["kyu", "きゅ"],
  ["kyo", "きょ"],
  ["gya", "ぎゃ"],
  ["gyu", "ぎゅ"],
  ["gyo", "ぎょ"],
  ["sha", "しゃ"],
  ["shu", "しゅ"],
  ["sho", "しょ"],
  ["sya", "しゃ"],
  ["syu", "しゅ"],
  ["syo", "しょ"],
  ["ja", "じゃ"],
  ["ju", "じゅ"],
  ["jo", "じょ"],
  ["jya", "じゃ"],
  ["jyu", "じゅ"],
  ["jyo", "じょ"],
  ["cha", "ちゃ"],
  ["chu", "ちゅ"],
  ["cho", "ちょ"],
  ["tya", "ちゃ"],
  ["tyu", "ちゅ"],
  ["tyo", "ちょ"],
  ["nya", "にゃ"],
  ["nyu", "にゅ"],
  ["nyo", "にょ"],
  ["hya", "ひゃ"],
  ["hyu", "ひゅ"],
  ["hyo", "ひょ"],
  ["bya", "びゃ"],
  ["byu", "びゅ"],
  ["byo", "びょ"],
  ["pya", "ぴゃ"],
  ["pyu", "ぴゅ"],
  ["pyo", "ぴょ"],
  ["mya", "みゃ"],
  ["myu", "みゅ"],
  ["myo", "みょ"],
  ["rya", "りゃ"],
  ["ryu", "りゅ"],
  ["ryo", "りょ"],
  ["fa", "ふぁ"],
  ["fi", "ふぃ"],
  ["fe", "ふぇ"],
  ["fo", "ふぉ"],
  ["tsa", "つぁ"],
  ["tsi", "つぃ"],
  ["tse", "つぇ"],
  ["tso", "つぉ"],
  ["va", "ゔぁ"],
  ["vi", "ゔぃ"],
  ["vu", "ゔ"],
  ["ve", "ゔぇ"],
  ["vo", "ゔぉ"],
  ["shi", "し"],
  ["chi", "ち"],
  ["tsu", "つ"],
  ["fu", "ふ"],
  ["ji", "じ"],
  ["a", "あ"],
  ["i", "い"],
  ["u", "う"],
  ["e", "え"],
  ["o", "お"],
  ["ka", "か"],
  ["ki", "き"],
  ["ku", "く"],
  ["ke", "け"],
  ["ko", "こ"],
  ["ga", "が"],
  ["gi", "ぎ"],
  ["gu", "ぐ"],
  ["ge", "げ"],
  ["go", "ご"],
  ["sa", "さ"],
  ["si", "し"],
  ["su", "す"],
  ["se", "せ"],
  ["so", "そ"],
  ["za", "ざ"],
  ["zi", "じ"],
  ["zu", "ず"],
  ["ze", "ぜ"],
  ["zo", "ぞ"],
  ["ta", "た"],
  ["ti", "ち"],
  ["tu", "つ"],
  ["te", "て"],
  ["to", "と"],
  ["da", "だ"],
  ["di", "ぢ"],
  ["du", "づ"],
  ["de", "で"],
  ["do", "ど"],
  ["na", "な"],
  ["ni", "に"],
  ["nu", "ぬ"],
  ["ne", "ね"],
  ["no", "の"],
  ["ha", "は"],
  ["hi", "ひ"],
  ["hu", "ふ"],
  ["he", "へ"],
  ["ho", "ほ"],
  ["ba", "ば"],
  ["bi", "び"],
  ["bu", "ぶ"],
  ["be", "べ"],
  ["bo", "ぼ"],
  ["pa", "ぱ"],
  ["pi", "ぴ"],
  ["pu", "ぷ"],
  ["pe", "ぺ"],
  ["po", "ぽ"],
  ["ma", "ま"],
  ["mi", "み"],
  ["mu", "む"],
  ["me", "め"],
  ["mo", "も"],
  ["ya", "や"],
  ["yu", "ゆ"],
  ["yo", "よ"],
  ["ra", "ら"],
  ["ri", "り"],
  ["ru", "る"],
  ["re", "れ"],
  ["ro", "ろ"],
  ["wa", "わ"],
  ["wo", "を"],
  ["n", "ん"]
];

const SEARCH_STOP_WORDS =
  /話し?した人|話してた人|話した|話し|話題|について|のこと|の人|した人|人/g;

export function buildJapaneseSearchIndex(values: Array<string | null | undefined>) {
  return normalizeJapaneseSearchText(values.filter(Boolean).join(" "));
}

export function matchesJapaneseSearchQuery(index: string, rawQuery: string) {
  const query = normalizeJapaneseSearchText(rawQuery);
  if (!query) return true;
  if (index.includes(query)) return true;

  const romanQuery = normalizeJapaneseSearchText(romajiToHiragana(rawQuery));
  if (romanQuery && romanQuery !== query && index.includes(romanQuery)) return true;

  const tokens = splitJapaneseSearchTokens(rawQuery);
  return tokens.length > 0 && tokens.every((token) => index.includes(token));
}

export function normalizeJapaneseSearchText(value: string) {
  return toHiragana(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s　・.,、。-]/g, "");
}

function splitJapaneseSearchTokens(value: string) {
  const simplified = toHiragana(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(SEARCH_STOP_WORDS, " ");
  const matches = simplified.match(/[一-龯々〆ヵヶ]+|[ぁ-んー]+|[a-z0-9]+/g) ?? [];
  const tokens = new Set<string>();

  for (const match of matches) {
    const normalized = normalizeJapaneseSearchText(match);
    if (normalized.length >= 2) tokens.add(normalized);

    if (/^[a-z]+$/i.test(match)) {
      const hiragana = normalizeJapaneseSearchText(romajiToHiragana(match));
      if (hiragana.length >= 2 && hiragana !== normalized) tokens.add(hiragana);
    }
  }

  return Array.from(tokens);
}

function toHiragana(value: string) {
  return value.replace(/[ァ-ヶ]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0x60)
  );
}

function romajiToHiragana(value: string) {
  const input = value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  let output = "";
  let index = 0;

  while (index < input.length) {
    const current = input[index];
    const next = input[index + 1];

    if (
      current &&
      next &&
      current === next &&
      current !== "n" &&
      /[bcdfghjklmpqrstvwxyz]/.test(current)
    ) {
      output += "っ";
      index += 1;
      continue;
    }

    if (current === "n") {
      const lookahead = input[index + 1];
      if (!lookahead || !/[aiueoyn]/.test(lookahead)) {
        output += "ん";
        index += 1;
        continue;
      }
      if (lookahead === "n") {
        output += "ん";
        index += 1;
        continue;
      }
    }

    const match = ROMAJI_TABLE.find(([romaji]) => input.startsWith(romaji, index));
    if (match) {
      output += match[1];
      index += match[0].length;
      continue;
    }

    output += current ?? "";
    index += 1;
  }

  return output;
}
