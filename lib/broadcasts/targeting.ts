import type { BroadcastBody } from "@/lib/broadcasts/flex";

export type TargetableStudent = {
  id: string;
  line_user_id: string | null;
  student_tags?: Array<{
    tag_id: string;
  }>;
};

export type BroadcastTargeting = {
  targetTagIds: string[];
  excludedTagIds: string[];
  targetMode: "and" | "or";
};

export function filterBroadcastTargets(
  students: TargetableStudent[],
  targeting: BroadcastTargeting
) {
  return students.filter((student) => {
    const studentTagIds = (student.student_tags ?? []).map((tag) => tag.tag_id);

    if (
      targeting.excludedTagIds.length > 0 &&
      targeting.excludedTagIds.some((tagId) => studentTagIds.includes(tagId))
    ) {
      return false;
    }

    if (targeting.targetTagIds.length === 0) {
      return true;
    }

    if (targeting.targetMode === "and") {
      return targeting.targetTagIds.every((tagId) => studentTagIds.includes(tagId));
    }

    return targeting.targetTagIds.some((tagId) => studentTagIds.includes(tagId));
  });
}

export function parseBroadcastBody(value: unknown): BroadcastBody | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const body = value as Record<string, unknown>;
  if (body.kind === "text" && typeof body.text === "string") {
    return {
      kind: "text",
      text: body.text
    };
  }

  if (body.kind === "grid_flex") {
    return body as BroadcastBody;
  }

  return null;
}

export function parseJsonArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
