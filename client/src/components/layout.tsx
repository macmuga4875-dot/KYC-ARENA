import { Button } from "@/components/ui/button";
import { Bell, LogOut, Menu, ShieldCheck } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth, useNotifications, logout as apiLogout, markNotificationsRead as apiMarkRead } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: authData } = useAuth();
  const { data: notifications = [] } = useNotifications();

  const role = authData?.user?.role;
  const currentUser = authData?.user?.username;
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = async () => {
    await apiLogout();
    queryClient.clear();
    setLocation("/");
  };

  const handleNotificationsOpen = async () => {
    if (unreadCount > 0) {
      await apiMarkRead();
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-xl px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-card border-r border-border">
              <div className="flex flex-col gap-6 mt-8">
                <div className="flex items-center gap-2 px-2">
                  <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
                    <ShieldCheck className="text-primary-foreground h-5 w-5" />
                  </div>
                  <span className="font-bold text-lg tracking-tight">KYC ARENA</span>
                </div>
                <nav className="flex flex-col gap-2">
                  {role === "admin" ? (
                    <>
                      <Link href="/admin">
                        <Button variant={location === "/admin" ? "secondary" : "ghost"} className="w-full justify-start">
                          Dashboard
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <Link href="/dashboard">
                      <Button variant={location === "/dashboard" ? "secondary" : "ghost"} className="w-full justify-start">
                        My Accounts
                      </Button>
                    </Link>
                  )}
                </nav>
                <div className="mt-auto">
                  <Button variant="destructive" className="w-full justify-start" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="hidden md:flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
              <ShieldCheck className="text-primary-foreground h-5 w-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">KYC ARENA</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" onClick={handleNotificationsOpen}>
                <Bell className="h-5 w-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-2 font-semibold border-b text-sm">Notifications</div>
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">No notifications</div>
              ) : (
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.map((n) => (
                    <DropdownMenuItem key={n.id} className="flex flex-col items-start p-3 cursor-default">
                      <span className={cn("text-sm", !n.read && "font-semibold")}>{n.message}</span>
                    </DropdownMenuItem>
                  ))}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-xs font-mono">
                  {currentUser?.substring(0, 2).toUpperCase()}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                {role?.toUpperCase()}
              </div>
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="flex-1 container max-w-2xl mx-auto p-4 pb-20">
        {children}
      </main>
    </div>
  );
}
