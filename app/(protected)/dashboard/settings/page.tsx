import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { DashboardHeader } from "@/components/dashboard/header";
import { AccountSettingsTabs } from "@/components/dashboard/account-settings-tabs";

export const metadata = constructMetadata({
  title: "Account Settings – Progressly",
  description: "Manage your account settings.",
});

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user?.id) redirect("/login");

  return (
    <div className="space-y-6">
      <DashboardHeader
        heading="Account Settings"
        text="Manage your account preferences and security."
      />
      <AccountSettingsTabs
        user={{
          id: user.id,
          name: user.name || null,
          email: user.email || null
        }}
      />
    </div>
  );
}
