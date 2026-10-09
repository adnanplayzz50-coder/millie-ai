import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { UIProvider } from "@/lib/ui-store";
import { AppSidebar } from "@/components/AppSidebar";
import { CustomizePanel } from "@/components/CustomizePanel";
import { CommandPalette } from "@/components/CommandPalette";
import { WakeWordListener } from "@/components/WakeWord";
import { LogoMark } from "@/components/Logo";

export const Route = createFileRoute("/_app")({
  ssr: false,
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [user, loading, navigate]);

  if (loading || !user)
    return (
      <div className="grid min-h-dvh place-items-center">
        <LogoMark className="size-12 animate-pulse" />
      </div>
    );

  return (
    <UIProvider>
      <div className="flex h-dvh overflow-hidden">
        <AppSidebar />
        <main className="flex min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
      <CustomizePanel />
      <CommandPalette />
      <WakeWordListener />
    </UIProvider>
  );
}
