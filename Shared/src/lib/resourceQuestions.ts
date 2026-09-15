export type ResourceQuestionType = "text" | "select";

export type ResourceQuestion = {
  id: string;
  label: string;
  type: ResourceQuestionType;
  options: string[];
  required: boolean;
  enabled: boolean;
};

export type ResourceQuestionStats = {
  id: string;
  label: string;
  answers: Array<{ value: string; count: number }>;
};

type ResourceResponseRow = { metadata?: unknown };

export const DEFAULT_RESOURCE_QUESTIONS: ResourceQuestion[] = [
  { id: "company_name", label: "Company name", type: "text", options: [], required: true, enabled: true },
  {
    id: "employee_range",
    label: "Number of employees",
    type: "select",
    options: ["1–5", "6–10", "11–20", "21–50", "51–100", "101+"],
    required: true,
    enabled: true,
  },
  {
    id: "hear_about_us",
    label: "How did you hear about us?",
    type: "select",
    options: ["Instagram", "WhatsApp", "LinkedIn", "Email", "Through a friend"],
    required: true,
    enabled: true,
  },
  { id: "country", label: "Which country do you reside in?", type: "text", options: [], required: true, enabled: true },
];

export function normalizeResourceQuestions(value: unknown): ResourceQuestion[] {
  if (!Array.isArray(value)) return DEFAULT_RESOURCE_QUESTIONS.map((question) => ({ ...question, options: [...question.options] }));

  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const raw = candidate as Partial<ResourceQuestion>;
    const id = typeof raw.id === "string" ? raw.id.trim().slice(0, 80) : "";
    const label = typeof raw.label === "string" ? raw.label.trim().slice(0, 200) : "";
    const type: ResourceQuestionType = raw.type === "select" ? "select" : "text";
    const options = Array.isArray(raw.options)
      ? raw.options.filter((option): option is string => typeof option === "string").map((option) => option.trim()).filter(Boolean).slice(0, 30)
      : [];
    if (!id || !label || (type === "select" && options.length === 0)) return [];
    return [{ id, label, type, options, required: raw.required !== false, enabled: raw.enabled !== false }];
  });
}

export function enabledResourceQuestions(value: unknown): ResourceQuestion[] {
  return normalizeResourceQuestions(value).filter((question) => question.enabled);
}

export function buildResourceQuestionStats(questionsValue: unknown, rows: ResourceResponseRow[]) {
  const questions = enabledResourceQuestions(questionsValue);
  const counts = new Map<string, Map<string, number>>();
  for (const question of questions) counts.set(question.id, new Map());

  for (const row of rows) {
    if (!row.metadata || typeof row.metadata !== "object") continue;
    const answers = (row.metadata as { answers?: unknown }).answers;
    if (!answers || typeof answers !== "object") continue;
    for (const question of questions) {
      const value = (answers as Record<string, unknown>)[question.id];
      if (typeof value !== "string" || !value.trim()) continue;
      const questionCounts = counts.get(question.id)!;
      questionCounts.set(value.trim(), (questionCounts.get(value.trim()) ?? 0) + 1);
    }
  }

  return {
    totalResponses: rows.length,
    questions: questions.map<ResourceQuestionStats>((question) => ({
      id: question.id,
      label: question.label,
      answers: [...(counts.get(question.id)?.entries() ?? [])]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)),
    })),
  };
}
