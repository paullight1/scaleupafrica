// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ProfileDiscoveryDialog } from "./ProfileDiscoveryDialog";

it("collects a named other discovery source without blocking dismissal", () => {
  const onSave = vi.fn(); const onSkip = vi.fn();
  render(<ProfileDiscoveryDialog open pending={false} onSave={onSave} onSkip={onSkip}/>);
  expect(screen.getByRole("dialog", { name: /how did you hear/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("radio", { name: "Other" }));
  fireEvent.change(screen.getByLabelText(/where did you hear/i), { target: { value: "Partner network" } });
  fireEvent.click(screen.getByRole("button", { name: /save answer/i }));
  expect(onSave).toHaveBeenCalledWith("other", "Partner network");
  fireEvent.click(screen.getByRole("button", { name: /not now/i }));
  expect(onSkip).toHaveBeenCalledOnce();
});
