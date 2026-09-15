import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { normalizeResourceQuestions, type ResourceQuestion } from "@shared/lib/resourceQuestions";
import { Button } from "@shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@shared/components/ui/dialog";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { Switch } from "@shared/components/ui/switch";
import { Textarea } from "@shared/components/ui/textarea";

function questionId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `question-${Date.now()}`;
}

function cloneQuestions(questions: ResourceQuestion[]) {
  return normalizeResourceQuestions(questions).map((question) => ({ ...question, options: [...question.options] }));
}

export function ResourceQuestionsEditor({
  open,
  onOpenChange,
  questions,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: ResourceQuestion[];
  onSave: (questions: ResourceQuestion[]) => void;
}) {
  const [draft, setDraft] = useState<ResourceQuestion[]>(cloneQuestions(questions));

  useEffect(() => {
    if (open) setDraft(cloneQuestions(questions));
  }, [open, questions]);

  const update = (index: number, patch: Partial<ResourceQuestion>) => {
    setDraft((current) => current.map((question, itemIndex) => itemIndex === index ? { ...question, ...patch } : question));
  };

  const addQuestion = () => {
    setDraft((current) => [...current, { id: questionId(), label: "", type: "text", options: [], required: false, enabled: true }]);
  };

  const removeQuestion = (index: number) => {
    setDraft((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const save = () => {
    const cleaned = normalizeResourceQuestions(draft);
    onSave(cleaned);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Additional questions</DialogTitle>
          <DialogDescription>Ask a few questions before a reader accesses this resource. You can edit, disable, remove, or add questions.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {draft.map((question, index) => (
            <div key={question.id} className="rounded-xl border border-border bg-surface-subtle/60 p-4">
              <div className="flex items-start gap-3">
                <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
                  <div className="space-y-1.5">
                    <Label htmlFor={`resource-question-${index}`}>Question label</Label>
                    <Input id={`resource-question-${index}`} aria-label="Question label" value={question.label} onChange={(event) => update(index, { label: event.target.value })} placeholder="What would you like to know?" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`resource-question-type-${index}`}>Answer type</Label>
                    <Select value={question.type} onValueChange={(type: ResourceQuestion["type"]) => update(index, { type, options: type === "select" ? question.options : [] })}>
                      <SelectTrigger id={`resource-question-type-${index}`}><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="text">Short answer</SelectItem><SelectItem value="select">Choose one</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove question ${index + 1}`} onClick={() => removeQuestion(index)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              {question.type === "select" && <div className="mt-3 space-y-1.5"><Label htmlFor={`resource-question-options-${index}`}>Options</Label><Textarea id={`resource-question-options-${index}`} value={question.options.join("\n")} onChange={(event) => update(index, { options: event.target.value.split("\n").map((option) => option.trim()).filter(Boolean) })} placeholder="One option per line" rows={3} /></div>}
              <div className="mt-3 flex flex-wrap items-center gap-5">
                <label className="flex items-center gap-2 text-sm text-muted-foreground"><Switch checked={question.enabled} onCheckedChange={(enabled) => update(index, { enabled })} aria-label={`Enable question ${index + 1}`} />Enabled</label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground"><Switch checked={question.required} onCheckedChange={(required) => update(index, { required })} aria-label={`Require question ${index + 1}`} />Required</label>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addQuestion}><Plus className="h-4 w-4" />Add question</Button>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={save}>Save questions</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
