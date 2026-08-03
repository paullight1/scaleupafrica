import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LayoutDashboard, UserRound, Compass, ShieldCheck, LogOut } from "lucide-react";
import { useAuth } from "@shared/hooks/useAuth";
import { useRole } from "@shared/hooks/useRole";
import { mapAuthError } from "@/lib/authErrors";
import { DEFAULT_AUTHED_ROUTE } from "@shared/lib/routes";
import { adminUrl } from "@shared/lib/crossApp";
import { Avatar, AvatarFallback, AvatarImage } from "@shared/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";

function initialsFor(name: string | undefined, email: string | undefined): string {
  const source = (name || "").trim() || (email || "").split("@")[0] || "";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const letters =
    parts.length >= 2
      ? parts[0][0] + parts[1][0]
      : source.slice(0, 2);
  return (letters || "SA").toUpperCase();
}

/** Avatar dropdown — the app's global sign-out call site (IMPROVEMENTS §1.2). */
export function UserMenu() {
  const { user, signOut } = useAuth();
  const { isStaff } = useRole();
  const navigate = useNavigate();

  if (!user) return null;

  const meta = user.user_metadata ?? {};
  const fullName: string | undefined = meta.full_name || meta.name;
  const avatarUrl: string | undefined = meta.avatar_url || meta.picture;
  const displayName = fullName || user.email || "Account";

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out.");
      navigate("/");
    } catch (err) {
      const { message } = mapAuthError(err);
      toast.error(message);
    }
  };

  const showDashboard = DEFAULT_AUTHED_ROUTE === "/dashboard";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
      >
        <Avatar className="h-8 w-8">
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
            {initialsFor(fullName, user.email ?? undefined)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-50 w-56">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
          {displayName}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {showDashboard && (
          <DropdownMenuItem asChild>
            <Link to="/dashboard">
              <LayoutDashboard className="mr-2 h-4 w-4" /> My dashboard
            </Link>
          </DropdownMenuItem>
        )}
        {/* TODO(plan-04): retarget to /directory/:slug once public profiles ship. */}
        <DropdownMenuItem asChild>
          <Link to="/dashboard/profile/edit">
            <UserRound className="mr-2 h-4 w-4" /> My profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/dashboard/funding">
            <Compass className="mr-2 h-4 w-4" /> Funding
          </Link>
        </DropdownMenuItem>
        {isStaff && (
          <DropdownMenuItem asChild>
            {/* Real document navigation — /admin is the other bundle, not a route here. */}
            <a href={adminUrl()}>
              <ShieldCheck className="mr-2 h-4 w-4" /> Admin panel
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={handleSignOut}
          className="text-destructive-strong focus:text-destructive-strong"
        >
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserMenu;
