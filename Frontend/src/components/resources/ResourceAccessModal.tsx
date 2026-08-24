import { ArrowRight, BookOpen, Lock } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@shared/components/ui/dialog";

export function ResourceAccessModal({ open, onOpenChange, title, onSignIn, onCreateAccount }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; onSignIn: () => void; onCreateAccount: () => void;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md overflow-hidden p-0">
      <div className="bg-navy p-6 text-white"><div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-navy"><Lock className="h-5 w-5" /></div><DialogHeader><DialogTitle className="text-left text-2xl text-white">Unlock this playbook</DialogTitle><DialogDescription className="text-left text-white/70">Sign in to access {title} and the rest of Cresciva’s founder resources.</DialogDescription></DialogHeader></div>
      <div className="space-y-4 p-6"><div className="flex gap-3 rounded-lg bg-surface-subtle p-4 text-sm text-foreground"><BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary-dark" /><span>Create a free account to save your progress and discover practical funding tools.</span></div><Button className="w-full" size="lg" onClick={onSignIn}>Sign in to continue <ArrowRight className="h-4 w-4" /></Button><Button variant="outline" className="w-full" size="lg" onClick={onCreateAccount}>Create a free account</Button></div>
    </DialogContent>
  </Dialog>;
}
