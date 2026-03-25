import { useEffect, useState } from "react";
import { BugReportsPanel } from "../admin/BugReportsPanel";
import { TenantSettingsPanel } from "../admin/TenantSettingsPanel";
import { UserSettingsPanel } from "../admin/UserSettingsPanel";
import { useAuth } from "../auth/AuthContext";
import { useTenants } from "../hooks/users";

export function AdminPage() {
  const { user, tenantName, tenantId } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const isTenantAdmin = user?.role === "tenant_admin";
  const { data: tenantData } = useTenants(isSuperAdmin || isTenantAdmin);
  const [selectedScope, setSelectedScope] = useState(
    isSuperAdmin ? "all" : tenantId || "",
  );

  useEffect(() => {
    if (!isSuperAdmin) {
      setSelectedScope(tenantId || "");
      return;
    }

    if (selectedScope === "all") {
      return;
    }

    const availableTenantIds =
      tenantData?.tenants.map((tenant) => tenant.id) || [];
    if (!availableTenantIds.includes(selectedScope)) {
      setSelectedScope("all");
    }
  }, [isSuperAdmin, selectedScope, tenantData?.tenants, tenantId]);

  const isAllTenantsView = isSuperAdmin && selectedScope === "all";
  const effectiveTenantId = isAllTenantsView
    ? null
    : isSuperAdmin
      ? selectedScope || tenantId
      : tenantId;
  return (
    <main className="min-h-[calc(100dvh-3rem)] px-6 py-8 text-ink">
      <section className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-[2rem] border border-line/80 bg-panel/90 shadow-panel backdrop-blur-sm">
        <div className="space-y-8 p-6 sm:p-8 md:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
                {isSuperAdmin ? "Super Admin Console" : "Tenant Admin Console"}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                {isSuperAdmin ? "Application Overview" : "Tenant Overview"}
              </h1>
              <p className="mt-2 text-sm text-ink-muted">
                {isSuperAdmin
                  ? "Start broad with all tenants, or narrow the page to one tenant when you need details."
                  : `Manage users, domains, and sign-in settings for ${tenantName || tenantId || "your tenant"}.`}
              </p>
            </div>

            {isSuperAdmin ? (
              <label className="min-w-[17rem] space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  Focus Tenant
                </span>
                <select
                  value={selectedScope}
                  onChange={(event: any) =>
                    setSelectedScope(String(event.target.value))
                  }
                  className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-lime focus:outline-none focus:ring-4 focus:ring-lime/20"
                >
                  <option value="all">All tenants</option>
                  {(tenantData?.tenants || []).map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name || tenant.id}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          <div className="space-y-6">
            {isSuperAdmin ? <BugReportsPanel /> : null}
            <TenantSettingsPanel
              selectedTenantId={effectiveTenantId || null}
              isAllTenantsView={isAllTenantsView}
              tenantOptions={tenantData?.tenants || []}
            />
            <UserSettingsPanel
              selectedTenantId={effectiveTenantId || null}
              isAllTenantsView={isAllTenantsView}
              tenantOptions={tenantData?.tenants || []}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
