const textMap: Record<string, string> = {
  "Hana Sato": "佐藤 花",
  "Misaki Tanaka": "田中 美咲",
  "Ryo Suzuki": "鈴木 亮",
  "Tokyo Pharmacy University": "東京薬科大学",
  "Kitasato University": "北里大学",
  "Meiji Pharmaceutical University": "明治薬科大学",
  "High Motivation": "高志望度",
  "Event Attended": "イベント参加済み",
  "Practical P2-P3": "実習 2-3期",
  "Waiting Reply": "返信待ち",
  "Community pharmacy": "調剤薬局",
  "Hospital pharmacist also considered": "病院薬剤師も検討",
  "Drugstore pharmacist": "ドラッグストア薬剤師",
  "Tokyo / Kanagawa": "東京・神奈川",
  Saitama: "埼玉",
  Chiba: "千葉",
  "Career fair": "合同説明会",
  "LINE follow": "LINE追加",
  "Campus seminar": "学内セミナー",
  "I am interested in a store visit": "店舗見学に興味があります",
  "Send three store visit date options this week": "今週中に店舗見学の候補日を3つ送る",
  "Check visit date candidates by LINE on 2026-05-20": "2026年5月20日にLINEで見学候補日を確認する",
  "Send a light reminder because there is no reply": "返信がないため、軽めのリマインドを送る",
  "Ask about concerns before interview": "面談前の不安点を確認する",
  "Schedule next Zoom interview": "次回Zoom面談を設定する"
};

const kanaMap: Record<string, string> = {
  "Hana Sato": "サトウ ハナ",
  "SATO HANA": "サトウ ハナ",
  "Misaki Tanaka": "タナカ ミサキ",
  "TANAKA MISAKI": "タナカ ミサキ",
  "Ryo Suzuki": "スズキ リョウ",
  "SUZUKI RYO": "スズキ リョウ"
};

const statusMap: Record<string, string> = {
  active: "対応中",
  received: "受信済み",
  urgent: "至急対応",
  archived: "完了",
  inactive: "停止中"
};

export function localizeSampleText(value: string | null | undefined) {
  if (!value) return value;
  return textMap[value] ?? value;
}

export function localizeKanaText(value: string | null | undefined) {
  if (!value) return value;
  return kanaMap[value] ?? value;
}

export function localizeStatus(value: string | null | undefined) {
  if (!value) return value;
  return statusMap[value] ?? localizeSampleText(value) ?? value;
}
