import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { useAuth } from "@shared/hooks/useAuth";

/**
 * Pillar C sign-out. Critical on shared Android devices (IMPROVEMENTS §1.2):
 * clears the query cache so the next user sees nothing of this account.
 */
export function SignOutCard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function handleSignOut() {
    await signOut();
    qc.clear();
    navigate("/");
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
      <h2 className="font-display text-lg font-semibold text-ink-strong">Sign out</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Signed in as {user?.email} on this device.
      </p>
      <Button variant="destructive" className="mt-4" onClick={handleSignOut}>
        <LogOut className="h-4 w-4" /> Sign out
      </Button>
    </div>
  );
}

export default SignOutCard;
