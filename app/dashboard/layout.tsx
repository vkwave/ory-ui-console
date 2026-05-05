import { NavSidebar } from "@/components/nav-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-2 py-2 z-30 hidden lg:block">
        <NavSidebar />
      </aside>
      <div className="flex min-h-screen flex-1 flex-col lg:pl-72">
        <header className="sticky top-0 z-20 ">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <Sheet>
              <SheetTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    className="glass-control lg:hidden"
                    aria-label="Open navigation"
                  />
                }
              >
                <Menu />
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-80 border-r-0 bg-transparent p-0"
                showCloseButton={false}
              >
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <NavSidebar className="w-full rounded-none border-r-0" />
              </SheetContent>
            </Sheet>
            <div className="hidden text-sm text-muted-foreground lg:block">
              Manage Kratos, Hydra, and Keto from one console.
            </div>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
