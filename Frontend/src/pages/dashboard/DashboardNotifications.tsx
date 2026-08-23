import { NotificationPrefsCard } from "@/components/dashboard/NotificationPrefsCard";
import { FundingNotificationPreferences } from "@/components/funding/FundingNotificationPreferences";

export function DashboardNotifications() {
  return (
    <section aria-labelledby="notifications-heading">
      <div className="mb-5 md:mb-6">
        <h2 id="notifications-heading" className="font-display text-2xl font-semibold text-ink-strong">Notifications</h2>
        <p className="mt-1 text-sm text-muted-foreground">Choose which updates reach your inbox.</p>
      </div>
      <div className="grid gap-5 2xl:grid-cols-2">
        <NotificationPrefsCard />
        <FundingNotificationPreferences />
      </div>
    </section>
  );
}

export default DashboardNotifications;
