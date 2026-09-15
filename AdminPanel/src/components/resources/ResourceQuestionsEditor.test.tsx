// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_RESOURCE_QUESTIONS } from "@shared/lib/resourceQuestions";
import { ResourceQuestionsEditor } from "./ResourceQuestionsEditor";

describe("ResourceQuestionsEditor", () => {
  it("lets an admin add a question and save the edited set", () => {
    const onSave = vi.fn();
    render(
      <ResourceQuestionsEditor
        open
        onOpenChange={vi.fn()}
        questions={DEFAULT_RESOURCE_QUESTIONS}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add question" }));
    expect(screen.getAllByLabelText("Question label")).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: "Save questions" }));
    expect(onSave).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ id: "company_name" }),
    ]));
  });
});
