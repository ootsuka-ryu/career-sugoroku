const ROMAJI_TO_HIRAGANA: Array<[string, string]> = [
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

const KANA_TO_ROMAJI = [
  ...ROMAJI_TO_HIRAGANA
    .filter(([romaji]) => romaji !== "si" && romaji !== "ti" && romaji !== "tu" && romaji !== "hu" && romaji !== "zi")
    .sort((a, b) => b[1].length - a[1].length)
    .map(([romaji, kana]) => [kana, romaji] as const)
];

const SEARCH_STOP_WORDS =
  /話し?した人|話してた人|話した|話し|話題|について|のこと|の人|した人|人|探して|検索|学生|子/g;

const KANJI_READING_ALIASES: Array<[RegExp, string[]]> = [
  [/大塚\s*徳太郎/g, ["おおつかとくたろう", "ootsukatokutaro", "otsukatokutaro"]],
  [/大塚\s*渚/g, ["おおつかなぎさ", "ootsukanagisa", "otsukanagisa"]],
  [/伊藤\s*左友希/g, ["いとうさゆき", "itousayuki", "itosayuki"]],
  [/神田\s*樹/g, ["かんだいつき", "kandaitsuki"]],
  [/岩屋\s*伶/g, ["いわやりょう", "iwayaryo", "iwayaryou"]],
  [/木下\s*珠鈴/g, ["きのしたしゅりん", "kinoshitashurin"]],
  [/河久\s*元美/g, ["かわきゅうもとみ", "kawakyuumotomi", "kawakyumotomi"]],
  [/安田\s*光里/g, ["やすだひかり", "yasudahikari"]],
  [/田中\s*美咲/g, ["たなかみさき", "tanakamisaki"]],
  [/佐藤\s*花/g, ["さとうはな", "satouhana", "satohana"]],
  [/鈴木\s*亮/g, ["すずきりょう", "suzukiryo", "suzukiryou"]],
  [/大塚/g, ["おおつか", "ootsuka", "otsuka"]],
  [/神田/g, ["かんだ", "kanda"]],
  [/伊藤/g, ["いとう", "itou", "ito"]],
  [/岩屋/g, ["いわや", "iwaya"]],
  [/木下/g, ["きのした", "kinoshita"]],
  [/安田/g, ["やすだ", "yasuda"]],
  [/佐藤/g, ["さとう", "satou", "sato"]],
  [/鈴木/g, ["すずき", "suzuki"]],
  [/田中/g, ["たなか", "tanaka"]],
  [/中谷/g, ["なかたに", "nakatani"]],
  [/杉原/g, ["すぎはら", "sugihara"]],
  [/河久/g, ["かわきゅう", "kawakyu"]],
  [/高/g, ["こう", "kou", "taka"]],
  [/詩/g, ["し", "shi"]],
  [/奏/g, ["かな", "kana"]],
  [/渚/g, ["なぎさ", "nagisa"]],
  [/左友希/g, ["さゆき", "sayuki"]],
  [/徳太郎/g, ["とくたろう", "tokutaro"]],
  [/珠鈴/g, ["しゅりん", "shurin"]],
  [/樹/g, ["いつき", "itsuki"]],
  [/伶/g, ["りょう", "ryo", "ryou", "れい", "rei"]],
  [/元美/g, ["もとみ", "motomi"]],
  [/光里/g, ["ひかり", "hikari"]],
  [/美咲/g, ["みさき", "misaki"]],
  [/花/g, ["はな", "hana"]],
  [/亮/g, ["りょう", "ryo", "ryou"]]
];

const KANJI_READING_PARTS: Array<[string, string[]]> = [
  ["大塚", ["おおつか", "ootsuka", "otsuka"]],
  ["神田", ["かんだ", "kanda"]],
  ["伊藤", ["いとう", "itou", "ito"]],
  ["岩屋", ["いわや", "iwaya"]],
  ["木下", ["きのした", "kinoshita"]],
  ["安田", ["やすだ", "yasuda"]],
  ["佐藤", ["さとう", "satou", "sato"]],
  ["鈴木", ["すずき", "suzuki"]],
  ["田中", ["たなか", "tanaka"]],
  ["中谷", ["なかたに", "nakatani"]],
  ["杉原", ["すぎはら", "sugihara"]],
  ["河久", ["かわきゅう", "kawakyu"]],
  ["高", ["こう", "kou", "taka"]],
  ["詩", ["し", "shi"]],
  ["奏", ["かな", "kana"]],
  ["渚", ["なぎさ", "nagisa"]],
  ["左友希", ["さゆき", "sayuki"]],
  ["徳太郎", ["とくたろう", "tokutaro"]],
  ["珠鈴", ["しゅりん", "shurin"]],
  ["樹", ["いつき", "itsuki"]],
  ["伶", ["りょう", "ryo", "ryou", "れい", "rei"]],
  ["元美", ["もとみ", "motomi"]],
  ["光里", ["ひかり", "hikari"]],
  ["美咲", ["みさき", "misaki"]],
  ["花", ["はな", "hana"]],
  ["亮", ["りょう", "ryo", "ryou"]]
];

export function buildJapaneseSearchIndex(values: Array<string | null | undefined>) {
  const source = values.filter(Boolean).join(" ");
  const hiragana = normalizeJapaneseSearchText(source);
  const romaji = kanaToRomaji(toHiragana(normalizeBase(source)));
  const aliases = buildKanjiReadingAliases(source).join(" ");

  return Array.from(
    new Set([
      hiragana,
      stripSeparators(normalizeBase(source)),
      stripSeparators(toKatakana(toHiragana(normalizeBase(source)))),
      stripSeparators(romaji),
      normalizeJapaneseSearchText(aliases),
      stripSeparators(aliases)
    ].filter(Boolean))
  ).join(" ");
}

export function matchesJapaneseSearchQuery(index: string, rawQuery: string) {
  const tokens = splitJapaneseSearchTokens(rawQuery);
  if (tokens.length === 0) return true;

  return tokens.every((token) => {
    if (index.includes(token)) return true;
    const noSpace = stripSeparators(token);
    if (noSpace && index.includes(noSpace)) return true;
    return token.length >= 4 && hasNearToken(index, token);
  });
}

export function normalizeJapaneseSearchText(value: string) {
  return stripSeparators(toHiragana(normalizeBase(value)));
}

function splitJapaneseSearchTokens(value: string) {
  const simplified = normalizeBase(value).replace(SEARCH_STOP_WORDS, " ");
  const matches = simplified.match(/[一-龯々〆ヵヶ]+|[ぁ-んァ-ヶー]+|[a-z0-9]+/g) ?? [];
  const tokens = new Set<string>();

  const whole = normalizeJapaneseSearchText(simplified);
  if (whole.length >= 2) tokens.add(whole);
  const wholeRomaji = stripSeparators(kanaToRomaji(toHiragana(simplified)));
  if (wholeRomaji.length >= 2) tokens.add(wholeRomaji);

  for (const match of matches) {
    addTokenVariants(tokens, match);
  }

  for (const alias of buildKanjiReadingAliases(value)) {
    addTokenVariants(tokens, alias);
  }

  return Array.from(tokens).filter((token) => token.length >= 2);
}

function addTokenVariants(tokens: Set<string>, value: string) {
  const normalized = normalizeJapaneseSearchText(value);
  if (normalized.length >= 2) tokens.add(normalized);

  const romaji = stripSeparators(kanaToRomaji(toHiragana(normalizeBase(value))));
  if (romaji.length >= 2) tokens.add(romaji);

  if (/^[a-z0-9]+$/i.test(value)) {
    const hiragana = normalizeJapaneseSearchText(romajiToHiragana(value));
    if (hiragana.length >= 2) tokens.add(hiragana);
  }
}

function normalizeBase(value: string) {
  return value.normalize("NFKC").toLowerCase();
}

function stripSeparators(value: string) {
  return value.replace(/[\s　・･.,、。_\-‐‑‒–—―/\\|()[\]{}「」『』【】"'`~:：;；!?！？]/g, "");
}

function toHiragana(value: string) {
  return value.replace(/[ァ-ヶ]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0x60)
  );
}

function toKatakana(value: string) {
  return value.replace(/[ぁ-ゖ]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) + 0x60)
  );
}

function buildKanjiReadingAliases(value: string) {
  const aliases: string[] = [];
  for (const [pattern, readings] of KANJI_READING_ALIASES) {
    if (pattern.test(value)) aliases.push(...readings);
    pattern.lastIndex = 0;
  }
  aliases.push(...buildCompositeKanjiReadingAliases(value));
  return aliases;
}

function buildCompositeKanjiReadingAliases(value: string) {
  const compact = stripSeparators(normalizeBase(value));
  const matchedParts = KANJI_READING_PARTS
    .map(([kanji, readings]) => ({ kanji, readings, index: compact.indexOf(kanji) }))
    .filter((part) => part.index >= 0)
    .sort((a, b) => a.index - b.index || b.kanji.length - a.kanji.length);

  const aliases: string[] = [];
  for (let start = 0; start < matchedParts.length; start += 1) {
    for (let end = start + 1; end < matchedParts.length; end += 1) {
      const parts = matchedParts.slice(start, end + 1);
      const kanjiSequence = parts.map((part) => part.kanji).join("");
      if (!compact.includes(kanjiSequence)) continue;

      const readingGroups = parts.map((part) => part.readings.slice(0, 3));
      for (const reading of combineReadings(readingGroups)) {
        aliases.push(reading);
      }
    }
  }

  return aliases;
}

function combineReadings(groups: string[][]) {
  return groups.reduce<string[]>(
    (combinations, group) =>
      combinations.flatMap((prefix) => group.map((reading) => `${prefix}${reading}`)),
    [""]
  );
}

function romajiToHiragana(value: string) {
  const input = normalizeBase(value).replace(/[^a-z]/g, "");
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

    const match = ROMAJI_TO_HIRAGANA.find(([romaji]) => input.startsWith(romaji, index));
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

function kanaToRomaji(value: string) {
  const input = toHiragana(value);
  let output = "";
  let index = 0;
  let doubleNext = false;

  while (index < input.length) {
    const current = input[index];
    if (current === "っ") {
      doubleNext = true;
      index += 1;
      continue;
    }
    if (current === "ー") {
      output += output.match(/[aiueo]$/)?.[0] ?? "";
      index += 1;
      continue;
    }

    const match = KANA_TO_ROMAJI.find(([kana]) => input.startsWith(kana, index));
    if (match) {
      const romaji = match[1];
      output += doubleNext ? romaji[0] + romaji : romaji;
      doubleNext = false;
      index += match[0].length;
      continue;
    }

    output += current ?? "";
    doubleNext = false;
    index += 1;
  }

  return output;
}

function hasNearToken(index: string, token: string) {
  const terms = index.split(/\s+/).filter((term) => term.length >= token.length - 1);
  return terms.some((term) => {
    if (term.includes(token) || token.includes(term)) return true;
    return levenshteinDistance(term.slice(0, Math.max(token.length, 8)), token) <= 1;
  });
}

function levenshteinDistance(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[a.length][b.length];
}
