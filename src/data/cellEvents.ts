import type { GameEvent } from "@/types/game";

/**
 * マス固有イベント定義
 * REST / BRANCH マスはゲームロジック側で処理されるためここでは省略。
 * 未定義マスは getRandomEvent() にフォールバックする。
 */
export const CELL_EVENTS: Record<number, GameEvent> = {

  // ────────────────────────────────────────────────
  // 01 就活・選考編  (0–12)
  // ────────────────────────────────────────────────

  // 0: START — イベントなし

  1: {
    id: "c01", stage: "selection",
    title: "会社説明会に参加した",
    description: "企業の理念や薬剤師の仕事内容を初めて本格的に学んだ。\n知識ポイント +1",
    emoji: "🏫",
    delta: { knowledge: 1 },
  },

  2: {
    id: "c02", stage: "selection",
    title: "エントリーシート提出",
    description: "深夜まで書き続けたES。どんなアピールをするか選んで！",
    emoji: "📝",
    choices: [
      {
        id: "a", label: "実績・数字でアピール",
        description: "具体的な数字を盛り込んだ内容が刺さった。計画力+2",
        delta: { planning: 2 }, stepBonus: 0, emoji: "📊",
      },
      {
        id: "b", label: "想いと熱意を伝える",
        description: "真心が伝わり人事担当者の心に残った。信頼+2",
        delta: { trust: 2 }, stepBonus: 0, emoji: "❤️",
      },
    ],
  },

  3: {
    id: "c03", stage: "selection",
    title: "書類選考 通過！",
    description: "封筒の中の「通過」の文字。震える手で開いた。\n満足度 +1",
    emoji: "📨",
    delta: { satisfaction: 1 },
  },

  4: {
    id: "c04", stage: "selection",
    title: "一次面接",
    description: "初の本番面接。どう自分を見せるか選んで！",
    emoji: "🎙️",
    choices: [
      {
        id: "a", label: "笑顔と明るさで勝負",
        description: "雰囲気の良さが評価された。接客力+2",
        delta: { hospitality: 2 }, stepBonus: 0, emoji: "😊",
      },
      {
        id: "b", label: "薬学知識で実力を示す",
        description: "専門性の高さをアピール。知識+2",
        delta: { knowledge: 2 }, stepBonus: 0, emoji: "🔬",
      },
    ],
  },

  5: {
    id: "c05", stage: "selection",
    title: "グループディスカッション",
    description: "選考のGD。チームの中でどう動く？",
    emoji: "🗣️",
    choices: [
      {
        id: "a", label: "リーダーを買って出る",
        description: "強引でも結果をまとめた。リーダーシップ+2",
        delta: { leadership: 2 }, stepBonus: 0, emoji: "⭐",
      },
      {
        id: "b", label: "全員の意見をまとめる役",
        description: "場をまとめて評価アップ。計画力+1 信頼+1",
        delta: { planning: 1, trust: 1 }, stepBonus: 0, emoji: "📝",
      },
    ],
  },

  6: {
    id: "c06", stage: "selection",
    title: "薬局店舗見学",
    description: "実際の店舗を見学。薬剤師の仕事を肌で感じた。\n知識+1 接客力+1",
    emoji: "🏥",
    delta: { knowledge: 1, hospitality: 1 },
  },

  // 7: REST — 二次面接（ボーナス処理済み）

  8: {
    id: "c08", stage: "selection",
    title: "最終面接の前夜",
    description: "明日はいよいよ最終面接。夜の過ごし方を選んで！",
    emoji: "🌙",
    choices: [
      {
        id: "a", label: "深夜まで猛準備",
        description: "徹底的に準備して自信満々。知識+2",
        delta: { knowledge: 2 }, stepBonus: 0, emoji: "📚",
      },
      {
        id: "b", label: "早く寝てベストコンディション",
        description: "笑顔と落ち着きが好印象。信頼+1 満足度+1",
        delta: { trust: 1, satisfaction: 1 }, stepBonus: 0, emoji: "😴",
      },
    ],
  },

  9: {
    id: "c09", stage: "selection",
    title: "内定の電話が来た！🎉",
    description: "「採用が決定しました」——震えが止まらなかった。\n成長ポイント +3・満足度 +2",
    emoji: "📞",
    delta: { knowledge: 1, trust: 1, hospitality: 1, satisfaction: 2 },
  },

  // 10: BRANCH — 内定式（分岐処理済み）

  11: {
    id: "c11", stage: "selection",
    title: "内定承諾書を提出",
    description: "これで正式に仲間になった。\n親からお祝いで所持金 +100万円！",
    emoji: "✍️",
    delta: { satisfaction: 1, money: 1 },
  },

  12: {
    id: "c12", stage: "selection",
    title: "卒業旅行！✈️",
    description: "友人たちと最後の学生旅行へ。最高の思い出ができた！\n満足度+2／旅費で所持金 -50万円",
    emoji: "✈️",
    delta: { satisfaction: 2, money: -1 },
  },

  // ────────────────────────────────────────────────
  // 02 内定者期間編  (13–24)
  // ────────────────────────────────────────────────

  13: {
    id: "c13", stage: "offer",
    title: "内定者研修スタート",
    description: "入社前研修の初日。同期と顔合わせ。\n知識 +2・成長ポイント UP！",
    emoji: "📋",
    delta: { knowledge: 2 },
  },

  14: {
    id: "c14", stage: "offer",
    title: "先輩社員訪問",
    description: "OB訪問で現場のリアルを聞いた。\n知識+1 信頼+1",
    emoji: "🤝",
    delta: { knowledge: 1, trust: 1 },
  },

  // 15: REST — 業界研修（ボーナス処理済み）

  16: {
    id: "c16", stage: "offer",
    title: "勉強会に参加",
    description: "国試対策勉強会。どう臨む？",
    emoji: "📚",
    choices: [
      {
        id: "a", label: "毎日図書館で猛勉強",
        description: "知識が爆増！知識 +3",
        delta: { knowledge: 3, satisfaction: -1 }, stepBonus: 0, emoji: "🔥",
      },
      {
        id: "b", label: "アプリとAIで効率学習",
        description: "スマートに攻略。知識+2 計画力+1",
        delta: { knowledge: 2, planning: 1 }, stepBonus: 0, emoji: "🤖",
      },
    ],
  },

  17: {
    id: "c17", stage: "offer",
    title: "薬局見学ツアー",
    description: "複数店舗を巡って業務の全体像をつかんだ。\n知識+1 接客力+1",
    emoji: "🚌",
    delta: { knowledge: 1, hospitality: 1 },
  },

  18: {
    id: "c18", stage: "offer",
    title: "国家試験 本番！",
    description: "6年間の集大成。試験室に入る直前——どうする？",
    emoji: "📝",
    choices: [
      {
        id: "a", label: "深呼吸して冷静に臨む",
        description: "実力を発揮！知識+2 満足度+2",
        delta: { knowledge: 2, satisfaction: 2 }, stepBonus: 0, emoji: "🧘",
      },
      {
        id: "b", label: "直前まで参考書を確認",
        description: "最後の確認が効いた。知識+3",
        delta: { knowledge: 3 }, stepBonus: 0, emoji: "📖",
      },
    ],
  },

  19: {
    id: "c19", stage: "offer",
    title: "国家試験 合格発表！🎊",
    description: "番号を見つけた瞬間、涙があふれた——。\n成長ポイント +3 ／ 合格祝いで所持金 +100万円！",
    emoji: "🎓",
    delta: { knowledge: 1, trust: 1, satisfaction: 3, money: 2 },
  },

  20: {
    id: "c20", stage: "offer",
    title: "一人暮らしの準備",
    description: "新生活に向けて家具・家電を揃える。\n所持金 -100万円（引越し費用）",
    emoji: "📦",
    delta: { money: -2, satisfaction: 1 },
  },

  21: {
    id: "c21", stage: "offer",
    title: "💒 結婚イベント",
    description: "学生時代からのパートナーとの未来を選ぶ時！",
    emoji: "💒",
    choices: [
      {
        id: "a", label: "入社前に入籍する",
        description: "二人で新しい生活をスタート！\n満足度+3／式の費用で所持金 -200万円",
        delta: { satisfaction: 3, money: -3 }, stepBonus: 0, emoji: "💍",
      },
      {
        id: "b", label: "仕事が落ち着いてから考える",
        description: "今は仕事に集中。信頼+1",
        delta: { trust: 1 }, stepBonus: 0, emoji: "🤔",
      },
    ],
  },

  22: {
    id: "c22", stage: "offer",
    title: "制服・白衣が届いた",
    description: "真っ白な白衣を羽織った瞬間、薬剤師になった実感が湧いた。\n満足度 +1",
    emoji: "🥼",
    delta: { satisfaction: 1 },
  },

  23: {
    id: "c23", stage: "offer",
    title: "ロッカー・デスク整理",
    description: "配属店舗のロッカーを整理して、いよいよ準備が整った。\n計画力 +1",
    emoji: "🗄️",
    delta: { planning: 1 },
  },

  24: {
    id: "c24", stage: "offer",
    title: "入社前集合研修",
    description: "全国の同期が集まる研修。何を学ぶかで伸び方が変わる！",
    emoji: "🏢",
    choices: [
      {
        id: "a", label: "接客・コミュニケーションを重点学習",
        description: "患者対応力が急上昇。接客力+3",
        delta: { hospitality: 3 }, stepBonus: 0, emoji: "💬",
      },
      {
        id: "b", label: "薬学・医療知識を深掘り",
        description: "専門性がアップ。知識+3",
        delta: { knowledge: 3 }, stepBonus: 0, emoji: "💊",
      },
    ],
  },

  // ────────────────────────────────────────────────
  // 03 新入社員編  (25–38)
  // ────────────────────────────────────────────────

  25: {
    id: "c25", stage: "year1",
    title: "入社式 🎉",
    description: "スーツに身を包んで、いよいよ社会人へ。辞令が読み上げられた。\n満足度 +2",
    emoji: "🌸",
    delta: { satisfaction: 2 },
  },

  26: {
    id: "c26", stage: "year1",
    title: "OJT開始",
    description: "先輩の隣でひたすら見て学ぶ日々。何から覚える？",
    emoji: "👀",
    choices: [
      {
        id: "a", label: "接客の流れを優先して覚える",
        description: "患者対応が素早く身についた。接客力+2",
        delta: { hospitality: 2 }, stepBonus: 0, emoji: "🤝",
      },
      {
        id: "b", label: "調剤・システム操作を先に習得",
        description: "業務効率が上がった。知識+1 計画力+1",
        delta: { knowledge: 1, planning: 1 }, stepBonus: 0, emoji: "💻",
      },
    ],
  },

  27: {
    id: "c27", stage: "year1",
    title: "初めての服薬指導",
    description: "ついに患者さんの前に一人で立った。どう伝える？",
    emoji: "💊",
    choices: [
      {
        id: "a", label: "マニュアル通り丁寧に説明",
        description: "正確に伝えられた。信頼+1",
        delta: { trust: 1 }, stepBonus: 0, emoji: "📋",
      },
      {
        id: "b", label: "相手のペースに合わせてわかりやすく",
        description: "笑顔で帰られた。接客力+2 信頼+1",
        delta: { hospitality: 2, trust: 1 }, stepBonus: 0, emoji: "😊",
      },
    ],
  },

  28: {
    id: "c28", stage: "year1",
    title: "OTC担当になった",
    description: "市販薬コーナーを任された。難しい相談が来た……どうする？",
    emoji: "🧴",
    choices: [
      {
        id: "a", label: "その場で調べて即答",
        description: "機転が利いた。知識+2",
        delta: { knowledge: 2 }, stepBonus: 0, emoji: "🔍",
      },
      {
        id: "b", label: "先輩に同席してもらう",
        description: "チームで解決。信頼+1",
        delta: { trust: 1 }, stepBonus: 0, emoji: "🤝",
      },
    ],
  },

  29: {
    id: "c29", stage: "year1",
    title: "薬歴記録が山積み",
    description: "毎日の記録業務が追いつかない。どう乗り越える？",
    emoji: "📋",
    choices: [
      {
        id: "a", label: "残業して全部終わらせる",
        description: "完璧に仕上げたが消耗した。計画力+1／満足度-1",
        delta: { planning: 1, satisfaction: -1 }, stepBonus: 0, emoji: "😓",
      },
      {
        id: "b", label: "音声入力・テンプレートで効率化",
        description: "先輩にも褒められた。計画力+2",
        delta: { planning: 2 }, stepBonus: 0, emoji: "🤖",
      },
    ],
  },

  30: {
    id: "c30", stage: "year1",
    title: "調剤実習週間",
    description: "ひたすら調剤をこなす一週間。正確さが身についた。\n知識 +2",
    emoji: "⚗️",
    delta: { knowledge: 2 },
  },

  31: {
    id: "c31", stage: "year1",
    title: "レジ・受付応対",
    description: "「ありがとう」と言われると嬉しい。地道な積み重ねが信頼を作る。\n接客力 +1",
    emoji: "💳",
    delta: { hospitality: 1 },
  },

  // 32: REST — 在宅同行（ボーナス処理済み）

  // 33: BRANCH — 地域連携（分岐処理済み）

  34: {
    id: "c34", stage: "year1",
    title: "棚卸し作業",
    description: "閉店後に全商品をカウントする大仕事。丁寧さが光る。\n計画力+1 所持金+5000円（残業代）",
    emoji: "📦",
    delta: { planning: 1, money: 1 },
  },

  35: {
    id: "c35", stage: "year1",
    title: "先輩に悩みを相談した",
    description: "「なんでも聞いてね」——その言葉に救われた。\n信頼 +2・満足度 +1",
    emoji: "☕",
    delta: { trust: 2, satisfaction: 1 },
  },

  36: {
    id: "c36", stage: "year1",
    title: "チームミーティング",
    description: "店舗の課題を全員で話し合った。意見を出せた？",
    emoji: "💬",
    choices: [
      {
        id: "a", label: "積極的に改善案を発言",
        description: "存在感アップ。リーダーシップ+2",
        delta: { leadership: 2 }, stepBonus: 0, emoji: "💡",
      },
      {
        id: "b", label: "メモを取りながら傾聴",
        description: "全体像が見えた。計画力+1",
        delta: { planning: 1 }, stepBonus: 0, emoji: "📝",
      },
    ],
  },

  37: {
    id: "c37", stage: "year1",
    title: "患者さんから「ありがとう」",
    description: "「あなたに相談して本当に良かった」——その言葉が全てだった。\n成長ポイント +3！信頼+2 満足度+2",
    emoji: "😊",
    delta: { trust: 2, satisfaction: 2, knowledge: 1 },
  },

  38: {
    id: "c38", stage: "year1",
    title: "1年目修了！昇給発表 💰",
    description: "1年間の成果が評価された。\n所持金 +200万円（昇給）・成長ポイント +3！",
    emoji: "🎊",
    delta: { money: 3, satisfaction: 2, knowledge: 1 },
  },

  // ────────────────────────────────────────────────
  // 04 成長・挑戦編  (39–51)
  // ────────────────────────────────────────────────

  39: {
    id: "c39", stage: "year2",
    title: "後輩の指導担当に",
    description: "新卒が配属。どんな先輩になる？",
    emoji: "👨‍🏫",
    choices: [
      {
        id: "a", label: "積極的にサポートする",
        description: "自分の理解も深まった。リーダーシップ+2",
        delta: { leadership: 2 }, stepBonus: 0, emoji: "🌱",
      },
      {
        id: "b", label: "マニュアルを一緒に作る",
        description: "仕組みで育てる発想。計画力+2",
        delta: { planning: 2 }, stepBonus: 0, emoji: "📊",
      },
    ],
  },

  40: {
    id: "c40", stage: "year2",
    title: "採用イベントに協力",
    description: "学生向け説明会のスタッフに。どう関わる？",
    emoji: "🎓",
    choices: [
      {
        id: "a", label: "メイン担当として全力で動く",
        description: "学生の反応がダイレクト。計画力+2 リーダーシップ+1",
        delta: { planning: 2, leadership: 1 }, stepBonus: 0, emoji: "🚀",
      },
      {
        id: "b", label: "サポートとして無理なく参加",
        description: "採用の面白さに気づいた。接客力+1",
        delta: { hospitality: 1 }, stepBonus: 0, emoji: "🤝",
      },
    ],
  },

  41: {
    id: "c41", stage: "year2",
    title: "業務改善提案",
    description: "店舗の課題を発見。提案書を出す！",
    emoji: "💡",
    choices: [
      {
        id: "a", label: "提案書を作って店長に提出",
        description: "一部採用された！計画力+2 所持金+5000円（奨励金）",
        delta: { planning: 2, money: 1 }, stepBonus: 0, emoji: "📄",
      },
      {
        id: "b", label: "チームで話し合いながら動く",
        description: "みんなの力で改善。リーダーシップ+1 信頼+1",
        delta: { leadership: 1, trust: 1 }, stepBonus: 0, emoji: "💬",
      },
    ],
  },

  // 42: REST — 資格取得（ボーナス処理済み）

  43: {
    id: "c43", stage: "year2",
    title: "学会発表に挑戦 🎤",
    description: "臨床データをまとめて発表。緊張したが達成感は最高！\n知識+2 信頼+1 成長ポイント+3！",
    emoji: "🎤",
    delta: { knowledge: 3, trust: 1 },
  },

  44: {
    id: "c44", stage: "year2",
    title: "社内優秀社員表彰 🏅",
    description: "頑張りが会社に認められた！\n所持金 +100万円（ボーナス）・満足度+2",
    emoji: "🏅",
    delta: { satisfaction: 2, money: 3 },
  },

  45: {
    id: "c45", stage: "year2",
    title: "🚀 プロジェクト参加イベント",
    description: "本部から「新しい薬局サービス企画チーム」への参加打診が来た！",
    emoji: "🚀",
    choices: [
      {
        id: "a", label: "積極的に参加する",
        description: "AI処方支援・DX化をリード。計画力+3 知識+2",
        delta: { planning: 3, knowledge: 2 }, stepBonus: 0, emoji: "💡",
      },
      {
        id: "b", label: "現場業務を優先して断る",
        description: "患者さんとの信頼を積み上げた。信頼+2 接客力+1",
        delta: { trust: 2, hospitality: 1 }, stepBonus: 0, emoji: "🏥",
      },
    ],
  },

  46: {
    id: "c46", stage: "year2",
    title: "エリア合同研修",
    description: "近隣店舗の薬剤師と合同研修。刺激を受けた。\n知識+2 満足度+1",
    emoji: "🏫",
    delta: { knowledge: 2, satisfaction: 1 },
  },

  47: {
    id: "c47", stage: "year2",
    title: "海外薬局視察研修 🌍",
    description: "欧州の先進薬局を1週間視察。世界が広がった！\n知識+3／旅費で所持金 -100万円",
    emoji: "✈️",
    delta: { knowledge: 3, money: -2 },
  },

  48: {
    id: "c48", stage: "year2",
    title: "年次評価面談",
    description: "上司からの評価が出た。結果はいかに…",
    emoji: "📊",
    choices: [
      {
        id: "a", label: "「期待以上」の評価！",
        description: "全力で取り組んだ成果。所持金+100万円 満足度+2",
        delta: { money: 2, satisfaction: 2 }, stepBonus: 0, emoji: "⭐",
      },
      {
        id: "b", label: "「もう一息」との評価…",
        description: "次こそリベンジを誓った。計画力+1",
        delta: { planning: 1, satisfaction: -1 }, stepBonus: 0, emoji: "💪",
      },
    ],
  },

  49: {
    id: "c49", stage: "year2",
    title: "昇格打診が来た！",
    description: "上司から「シニア薬剤師に昇格しないか」と。どうする？",
    emoji: "📈",
    choices: [
      {
        id: "a", label: "喜んで受け入れる",
        description: "責任と見返りが増した。所持金+200万円 リーダーシップ+2",
        delta: { money: 3, leadership: 2 }, stepBonus: 0, emoji: "🏆",
      },
      {
        id: "b", label: "もう少し現場を積んでから",
        description: "着実に力をつけた。知識+2",
        delta: { knowledge: 2 }, stepBonus: 0, emoji: "📚",
      },
    ],
  },

  // 50: REST — 専門薬剤師認定（ボーナス処理済み）

  51: {
    id: "c51", stage: "year2",
    title: "🏠 マイホーム購入イベント",
    description: "家族が増えてきた。住宅ローンを組んで一軒家を買う？",
    emoji: "🏠",
    choices: [
      {
        id: "a", label: "思い切って一軒家を購入！",
        description: "夢のマイホーム実現。満足度+3／所持金 -300万円（頭金）",
        delta: { satisfaction: 3, money: -4 }, stepBonus: 0, emoji: "🔑",
      },
      {
        id: "b", label: "まだ賃貸で様子を見る",
        description: "貯蓄を続けながら慎重に。所持金+1（節約）",
        delta: { money: 1, planning: 1 }, stepBonus: 0, emoji: "💰",
      },
    ],
  },

  // ────────────────────────────────────────────────
  // 05 店長・キャリア分岐編  (52–64)
  // ────────────────────────────────────────────────

  // 52: BRANCH — 店長候補（分岐処理済み）

  53: {
    id: "c53", stage: "year3plus",
    title: "店長就任！ 🎊",
    description: "辞令が出た。「お前に任せる」——その言葉の重さ。\n所持金 +200万円（昇給）・リーダーシップ+3",
    emoji: "👔",
    delta: { leadership: 3, money: 4, satisfaction: 2 },
  },

  54: {
    id: "c54", stage: "year3plus",
    title: "スタッフ面談",
    description: "スタッフ一人一人と個別面談。どんな店長になる？",
    emoji: "🗂️",
    choices: [
      {
        id: "a", label: "目標と課題を一緒に設定する",
        description: "スタッフが自発的に動き出した。リーダーシップ+2 信頼+1",
        delta: { leadership: 2, trust: 1 }, stepBonus: 0, emoji: "🎯",
      },
      {
        id: "b", label: "悩みを聞いてサポートする",
        description: "職場の雰囲気が明るくなった。信頼+2 満足度+1",
        delta: { trust: 2, satisfaction: 1 }, stepBonus: 0, emoji: "💬",
      },
    ],
  },

  55: {
    id: "c55", stage: "year3plus",
    title: "年間目標の設定",
    description: "店舗の数値目標・育成目標を設定した。\n計画力 +2",
    emoji: "🎯",
    delta: { planning: 2 },
  },

  56: {
    id: "c56", stage: "year3plus",
    title: "売上目標 達成！💰",
    description: "チーム全員で掴んだ結果。上司から褒められた！\n所持金 +200万円（インセンティブ）・満足度+2",
    emoji: "📈",
    delta: { money: 4, satisfaction: 2 },
  },

  57: {
    id: "c57", stage: "year3plus",
    title: "地域医療への貢献",
    description: "医師・介護士との連携が深まり、地域から頼られるようになった。\n信頼 +3・成長ポイント +3！",
    emoji: "🤝",
    delta: { trust: 3, knowledge: 1, satisfaction: 1 },
  },

  58: {
    id: "c58", stage: "year3plus",
    title: "社長賞 受賞！🏆",
    description: "全国の社員の前で表彰された。涙が出そうになった。\n所持金 +100万円・満足度+3・成長ポイント+3！",
    emoji: "🏆",
    delta: { satisfaction: 3, money: 3, trust: 1 },
  },

  59: {
    id: "c59", stage: "year3plus",
    title: "🏢 店舗異動イベント",
    description: "本部から辞令。「来月から新店舗の立ち上げを頼みたい」——どうする？",
    emoji: "🏢",
    choices: [
      {
        id: "a", label: "新天地で挑戦を受け入れる",
        description: "新しい店舗で全力スタート。リーダーシップ+3 所持金+200万円（手当）",
        delta: { leadership: 3, money: 3 }, stepBonus: 0, emoji: "🚀",
      },
      {
        id: "b", label: "今の店舗で経験を積む",
        description: "チームの絆が深まった。信頼+2 満足度+1",
        delta: { trust: 2, satisfaction: 1 }, stepBonus: 0, emoji: "🏠",
      },
    ],
  },

  60: {
    id: "c60", stage: "year3plus",
    title: "新規事業の立案",
    description: "「薬局の新しいサービスを企画してほしい」——大きなチャンス！",
    emoji: "💼",
    choices: [
      {
        id: "a", label: "在宅医療×デジタルサービス",
        description: "患者×ITの融合で社内評価急上昇。計画力+3 知識+2",
        delta: { planning: 3, knowledge: 2 }, stepBonus: 0, emoji: "🤖",
      },
      {
        id: "b", label: "地域コミュニティ健康支援",
        description: "地域から絶大な信頼を得た。信頼+3 満足度+2",
        delta: { trust: 3, satisfaction: 2 }, stepBonus: 0, emoji: "🌍",
      },
    ],
  },

  61: {
    id: "c61", stage: "year3plus",
    title: "全国プロジェクト参加",
    description: "全国規模のプロジェクトチームに選ばれた。\nリーダーシップ+3 所持金+100万円（プロジェクト手当）",
    emoji: "🌐",
    delta: { leadership: 3, money: 2 },
  },

  62: {
    id: "c62", stage: "year3plus",
    title: "DX全社推進リーダーへ",
    description: "全国100店舗のシステム改革を率いる。\n知識+3 計画力+3・成長ポイント大幅UP！",
    emoji: "💻",
    delta: { knowledge: 3, planning: 3 },
  },

  63: {
    id: "c63", stage: "year3plus",
    title: "専門職・認定薬剤師就任",
    description: "薬剤師として最高レベルのキャリアに到達！\n満足度+3 所持金+200万円 成長ポイント+3！",
    emoji: "⭐",
    delta: { satisfaction: 3, money: 4, knowledge: 1, trust: 1 },
  },

  // 64: GOAL — ResultScreen が処理
};
