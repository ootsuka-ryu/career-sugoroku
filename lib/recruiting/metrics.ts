import {
  emptyRecruitingMetricCounts,
  type RecruitingMetricCounts
} from "@/lib/recruiting/funnel";

export function calculateRecruitingMetrics(rows: any[]): RecruitingMetricCounts {
  const counts = emptyRecruitingMetricCounts();

  for (const row of rows) {
    const tags = extractTagNames(row);
    const text = [
      row.manual_next_action,
      row.ai_next_action,
      row.status,
      row.motivation_rank,
      ...tags
    ]
      .filter(Boolean)
      .join(" ");

    if (row.funnel_entry ?? true) counts.entry += 1;
    if (row.funnel_pool ?? Boolean(row.last_inbound_at || row.last_outbound_at)) counts.pool += 1;
    if (row.funnel_next ?? /ネクスト|Zoom|ZOOM|食事会|交流会|セミナー|インターン|薬剤師インタビュー|選考会/.test(text)) counts.next += 1;
    if (row.funnel_is ?? /姫路|ツアー|オンラインイベント|H&B|会社説明会|説明会|インターン|IS/.test(text)) counts.is += 1;
    if (row.funnel_pharmacist_interview ?? /薬剤師インタビュー|インタビュー/.test(text)) counts.interview += 1;
    if (row.funnel_selection ?? /選考会|選考|専願|併願/.test(text)) counts.selection += 1;
    if (row.funnel_offer ?? /内定出し|内定通知/.test(text)) counts.offer += 1;
    if (row.funnel_offer_accepted ?? /内定内諾|内諾/.test(text)) counts.offerAccepted += 1;
    if (row.funnel_hired ?? /入社/.test(text)) counts.hired += 1;
  }

  return counts;
}

function extractTagNames(row: any) {
  return (row.student_tags ?? [])
    .map((relation: any) => relation.tags?.name)
    .filter(Boolean) as string[];
}
