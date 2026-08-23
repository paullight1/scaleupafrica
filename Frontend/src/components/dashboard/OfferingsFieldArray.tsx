import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Textarea } from "@shared/components/ui/textarea";
import type { ProfileFormValues } from "@/lib/validation/profile";

export function OfferingsFieldArray() {
  const { control, register, formState: { errors } } = useFormContext<ProfileFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "offerings" });
  return <div><div className="flex items-center justify-between gap-3"><div><Label>Products & services</Label><p className="mt-1 text-sm text-muted-foreground">Add what customers can buy or access, with an optional link.</p></div><Button type="button" variant="outline" size="sm" disabled={fields.length >= 10} onClick={() => append({ name: "", description: "", url: "" }, { shouldFocus: true })}><Plus className="h-4 w-4"/>Add</Button></div><div className="mt-4 space-y-4">{fields.map((field, index) => <div key={field.id} className="rounded-lg border border-border bg-surface-subtle p-4"><div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor={`offering-${index}-name`}>Name *</Label><Input id={`offering-${index}-name`} {...register(`offerings.${index}.name`)} maxLength={120}/>{errors.offerings?.[index]?.name && <p className="mt-1 text-sm text-destructive-strong">{errors.offerings[index]?.name?.message}</p>}</div><div><Label htmlFor={`offering-${index}-url`}>Optional link</Label><Input id={`offering-${index}-url`} {...register(`offerings.${index}.url`)} placeholder="https://..."/></div></div><div className="mt-4"><Label htmlFor={`offering-${index}-description`}>Description</Label><Textarea id={`offering-${index}-description`} {...register(`offerings.${index}.description`)} rows={3} maxLength={500}/></div><Button type="button" variant="ghost" size="sm" className="mt-2 text-destructive-strong" onClick={() => remove(index)}><Trash2 className="h-4 w-4"/>Remove</Button></div>)}</div></div>;
}
