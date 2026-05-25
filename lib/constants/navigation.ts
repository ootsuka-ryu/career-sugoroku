import {
  Bell,
  Bot,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  FileText,
  Home,
  Import,
  LayoutGrid,
  MessageSquareText,
  MessageSquareWarning,
  Radio,
  Settings,
  Tags,
  Users,
  Wand2
} from "lucide-react";

export const navigationItems = [
  { title: "ダッシュボード", href: "/dashboard", icon: Home },
  { title: "今日やること", href: "/tasks", icon: CheckSquare },
  { title: "学生一覧", href: "/students", icon: Users },
  { title: "CSVインポート", href: "/students/import", icon: Import },
  { title: "チャット", href: "/chat", icon: MessageSquareText },
  { title: "返信なし", href: "/follow-ups", icon: MessageSquareWarning },
  { title: "配信作成", href: "/broadcasts", icon: Radio },
  { title: "イベント管理", href: "/events", icon: CalendarDays },
  { title: "アンケート", href: "/surveys", icon: ClipboardList },
  { title: "テンプレート文", href: "/message-templates", icon: FileText },
  { title: "タグ管理", href: "/tags", icon: Tags },
  { title: "自動応答", href: "/auto-replies", icon: Bot },
  { title: "リッチメニュー", href: "/rich-menus", icon: LayoutGrid },
  { title: "AI/録音", href: "/recordings", icon: Wand2 },
  { title: "通知", href: "/notifications", icon: Bell },
  { title: "設定", href: "/settings", icon: Settings }
] as const;
