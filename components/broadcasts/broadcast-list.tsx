"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Play, Send } from "lucide-react";
import {
  sendBroadcastNow,
  sendTestBroadcast,
  type BroadcastActionState
} from "@/app/(dashboard)/broadcasts/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { getStaffDisplayName } from "@/lib/staff/display";
import type { StaffSummary } from "@/lib/students/types";

type BroadcastItem = {
  id: string;
  title: string;
  status: string;
  approval_status?: string | null;
  precheck_jsonb?: unknown;
  body_jsonb: unknown;
  target_mode: string;
  estimated_recipients: number;
  sent_count: number;
  failed_count: number;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  staff: StaffSummary | null;
};

const initialState: BroadcastActionState = {
  ok: false,
  message: ""
};

export function BroadcastList({
  broadcasts,
  staffUsers
}: {
  broadcasts: BroadcastItem[];
  staffUsers: StaffSummary[];
}) {
  const [sendState, sendAction] = useFormState(sendBroadcastNow, initialState);
  const [testState, testAction] = useFormState(sendTestBroadcast, initialState);
  const visibleState = sendState.message ? sendState : testState;

  return (
    <div className="space-y-3">
      {visibleState.message ? (
        <p
          className={
            visibleState.ok
              ? "rounded-md bg-accent/10 px-3 py-2 text-sm text-accent"
              : "rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
        >
          {visibleState.message}
        </p>
      ) : null}
      <div className="rounded-lg border">
        <Table className="min-w-[980px] table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[15rem] whitespace-nowrap">タイトル</TableHead>
              <TableHead className="w-[7rem] whitespace-nowrap">形式</TableHead>
              <TableHead className="w-[9rem] whitespace-nowrap">状態</TableHead>
              <TableHead className="w-[9rem] whitespace-nowrap">対象</TableHead>
              <TableHead className="w-[11rem] whitespace-nowrap">予約/送信</TableHead>
              <TableHead className="w-[8rem] whitespace-nowrap">作成者</TableHead>
              <TableHead className="w-[22rem] whitespace-nowrap">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {broadcasts.length > 0 ? (
              broadcasts.map((broadcast) => (
                <TableRow key={broadcast.id}>
                  <TableCell className="font-medium">{broadcast.title}</TableCell>
                  <TableCell className="whitespace-nowrap">{getBroadcastKind(broadcast.body_jsonb)}</TableCell>
                  <TableCell className="align-top">
                    <Badge variant={broadcast.status === "sent" ? "accent" : "secondary"}>
                      {getStatusLabel(broadcast.status)}
                    </Badge>
                    {getPrecheckWarnings(broadcast.precheck_jsonb).length > 0 ? (
                      <div className="mt-2 space-y-1 text-xs text-amber-700">
                        {getPrecheckWarnings(broadcast.precheck_jsonb).map((warning) => (
                          <p key={warning}>警告: {warning}</p>
                        ))}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {broadcast.sent_count > 0
                      ? `${broadcast.sent_count}件送信`
                      : `${broadcast.estimated_recipients}名見込み`}
                    {broadcast.failed_count > 0 ? ` / 失敗${broadcast.failed_count}` : ""}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <p>{formatDateTime(broadcast.scheduled_at)}</p>
                    <p className="text-xs text-muted-foreground">
                      sent {formatDateTime(broadcast.sent_at)}
                    </p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {broadcast.staff ? getStaffDisplayName(broadcast.staff) : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <form action={sendAction}>
                        <input
                          name="broadcast_id"
                          type="hidden"
                          value={broadcast.id}
                        />
                        <input
                          name="confirmed"
                          type="hidden"
                          value={getPrecheckWarnings(broadcast.precheck_jsonb).length > 0 ? "yes" : ""}
                        />
                        <ActionButton
                          disabled={broadcast.status === "sent"}
                          icon="play"
                          label="今すぐ送信"
                        />
                      </form>
                      <form action={testAction} className="flex gap-2">
                        <input
                          name="broadcast_id"
                          type="hidden"
                          value={broadcast.id}
                        />
                        <select
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                          name="staff_id"
                        >
                          {staffUsers.map((staff) => (
                            <option key={staff.id} value={staff.id}>
                              {getStaffDisplayName(staff)}
                            </option>
                          ))}
                        </select>
                        <ActionButton icon="send" label="テスト" />
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell className="h-24 text-center text-muted-foreground" colSpan={7}>
                  配信はまだありません。
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  icon,
  disabled = false
}: {
  label: string;
  icon: "play" | "send";
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const Icon = icon === "play" ? Play : Send;

  return (
    <Button disabled={pending || disabled} size="sm" type="submit" variant="outline">
      <Icon className="mr-2 h-4 w-4" />
      {pending ? "処理中..." : label}
    </Button>
  );
}

function getBroadcastKind(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "-";
  const kind = (body as Record<string, unknown>).kind;
  if (kind === "grid_flex") return "グリッドFlex";
  if (kind === "text") return "テキスト";
  return String(kind ?? "-");
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: "下書き",
    scheduled: "予約中",
    sending: "送信中",
    sent: "送信済み",
    failed: "失敗",
    cancelled: "取消"
  };
  return labels[status] ?? status;
}

function getPrecheckWarnings(value: unknown) {
  if (!value || typeof value !== "object") return [];
  const warnings = (value as { warnings?: unknown }).warnings;
  return Array.isArray(warnings) ? warnings.map(String) : [];
}
