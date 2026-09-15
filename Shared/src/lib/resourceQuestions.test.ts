import { describe, expect, it } from "vitest";
import { DEFAULT_RESOURCE_QUESTIONS, buildResourceQuestionStats, normalizeResourceQuestions } from "./resourceQuestions";

describe("resource questions", () => {
  it("provides the four enabled default questions", () => {
    expect(DEFAULT_RESOURCE_QUESTIONS).toHaveLength(4);
    expect(DEFAULT_RESOURCE_QUESTIONS.every((question) => question.enabled)).toBe(true);
    expect(DEFAULT_RESOURCE_QUESTIONS.map((question) => question.id)).toEqual([
      "company_name",
      "employee_range",
      "hear_about_us",
      "country",
    ]);
  });

  it("normalizes saved questions and drops invalid entries", () => {
    expect(normalizeResourceQuestions([
      { id: "custom", label: "What do you need?", type: "text", enabled: true },
      { id: "bad", label: "", type: "select", options: [] },
      null,
    ])).toEqual([
      { id: "custom", label: "What do you need?", type: "text", options: [], required: true, enabled: true },
    ]);
    expect(normalizeResourceQuestions([])).toEqual([]);
  });

  it("builds response counts without exposing respondent details", () => {
    const stats = buildResourceQuestionStats(DEFAULT_RESOURCE_QUESTIONS, [
      { metadata: { answers: { employee_range: "1–5", hear_about_us: "Instagram" } } },
      { metadata: { answers: { employee_range: "1–5", hear_about_us: "Instagram" } } },
      { metadata: { answers: { employee_range: "6–10" } } },
    ]);

    expect(stats.totalResponses).toBe(3);
    expect(stats.questions.find((question) => question.id === "employee_range")?.answers).toEqual([
      { value: "1–5", count: 2 },
      { value: "6–10", count: 1 },
    ]);
  });
});
