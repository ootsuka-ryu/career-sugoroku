"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { BellPlus, Send, Tag } from "lucide-react";
import {
  addFollowUpTag,
  sendReminder,
  type FollowUpActionState
} from "@/app/(dashboard)/follow-ups/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { localizeSampleText } from "@/lib/display/localize";
import { daysSince, formatDateTime } from "@/lib/format";

type TagOption = {
  id: string;
  name: string;
  color: string | null;
};

type FollowUpStudent = {
  id: string;
  display_name: string | null;
  real_name: string | null;
  university: string | null;
  grade: string | null;
  motivation_level: number | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  ai_next_action: string | null;
  line_user_id: string | null;
  tags: TagOption[];
};

const initialState: FollowUpActionState = {
  ok: false,
  message: ""
};

export function FollowUpBoard({
  students,
  tags
}: {
  students: FollowUpStudent[];
  tags: TagOption[];
}) {
  const [threshold, setThreshold] = useState(3);
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const days = daysSince(student.last_outbound_at);
      return days !== null && days >= threshold;
    });
  }, [students, threshold]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {[3, 7, 14].map((days) => (
          <Button
            key={days}
            onClick={() => setThreshold(days)}
            type="button"
            variant={threshold === days ? "default" : "outline"}
          >
            {days}日以上
          </Button>
        ))}
        <p className="text-sm text-muted-foreground">
          {filteredStudents.length}名を表示中
        </p>
      </div>

      {filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            条件に合う学生はいません。
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredStudents.map((student) => (
            <FollowUpCard key={student.id} student={student} tags={tags} />
          ))}
        </div>
      )}
    </div>
  );
}

function FollowUpCard({
  student,
  tags
}: {
  student: FollowUpStudent;
  tags: TagOption[];
}) {
  const [reminderState, reminderAction] = useFormState(
    sendReminder,
    initialState
  );
  const [tagState, tagAction] = useFormState(addFollowUpTag, initialState);
  const studentName =
    localizeSampleText(student.real_name) ||
    localizeSampleText(student.display_name) ||
    "名前未設定";
  const defaultText = `${studentName}さん、こんにちは。\n先日お送りしたご案内について、もしご興味があればお気軽にご返信ください。ご都合に合わせて個別にご案内します。`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <BellPlus className="h-5 w-5 text-primary" />
          {studentName}
          <Badge variant="outline">
            {daysSince(student.last_outbound_at) ?? "-"}日返信なし
          </Badge>
          {student.motivation_level ? (
            <Badge variant="accent">志望度 {student.motivation_level}</Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <p>{localizeSampleText(student.university) || "大学未登録"} / {student.grade || "学年未登録"}</p>
          <p>LINE ID: {student.line_user_id ? "あり" : "なし"}</p>
          <p>最終受信: {formatDateTime(student.last_inbound_at)}</p>
          <p>最終送信: {formatDateTime(student.last_outbound_at)}</p>
        </div>

        {student.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {student.tags.map((tag) => (
              <Badge key={tag.id} variant="secondary">
                {localizeSampleText(tag.name)}
              </Badge>
            ))}
          </div>
        ) : null}

        {student.ai_next_action ? (
          <div className="rounded-md bg-secondary/50 p-3 text-sm">
            <p className="font-medium">AI提案</p>
            <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
              {student.ai_next_action}
            </p>
          </div>
        ) : null}

        <form action={reminderAction} className="space-y-2">
          <input name="student_id" type="hidden" value={student.id} />
          <Textarea defaultValue={defaultText} name="text" rows={4} />
          <div className="flex flex-wrap items-center gap-2">
            <SubmitButton icon="send" label="リマインダー送信" />
            <Button asChild size="sm" variant="outline">
              <Link href={`/students/${student.id}`}>詳細を見る</Link>
            </Button>
            {reminderState.message ? (
              <p className="text-sm text-muted-foreground">
                {reminderState.message}
              </p>
            ) : null}
          </div>
        </form>

        <form action={tagAction} className="flex flex-wrap items-center gap-2">
          <input name="student_id" type="hidden" value={student.id} />
          <select
            className="h-9 min-w-44 rounded-md border border-input bg-background px-3 text-sm"
            name="tag_id"
            required
          >
            <option value="">タグを選択</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {localizeSampleText(tag.name)}
              </option>
            ))}
          </select>
          <SubmitButton icon="tag" label="タグ付け" />
          {tagState.message ? (
            <p className="text-sm text-muted-foreground">{tagState.message}</p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

function SubmitButton({
  icon,
  label
}: {
  icon: "send" | "tag";
  label: string;
}) {
  const { pending } = useFormStatus();
  const Icon = icon === "send" ? Send : Tag;

  return (
    <Button disabled={pending} size="sm" type="submit">
      <Icon className="mr-2 h-4 w-4" />
      {pending ? "処理中" : label}
    </Button>
  );
}
