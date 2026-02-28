"use client";

import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck, LogOut, Search, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { trpc } from "@/lib/trpc";

interface TopbarProps {
  title?: string;
  user?: {
    name: string | null;
    email: string;
    image?: string | null;
  };
}

export function Topbar({ title = "Dashboard", user }: TopbarProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: unreadCount } = trpc.notification.unreadCount.useQuery(
    undefined,
    { refetchInterval: 30_000 },
  );
  const { data: notifications } = trpc.notification.list.useQuery();
  const markReadMutation = trpc.notification.markRead.useMutation({
    onSuccess: () => {
      utils.notification.unreadCount.invalidate();
      utils.notification.list.invalidate();
    },
  });
  const markAllReadMutation = trpc.notification.markAllRead.useMutation({
    onSuccess: () => {
      utils.notification.unreadCount.invalidate();
      utils.notification.list.invalidate();
    },
  });

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-sm">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="h-8 w-64 rounded-lg bg-muted/50 pl-8 text-sm transition-colors duration-200 focus:bg-background"
          />
        </div>

        {/* Notifications bell */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="relative rounded-lg transition-colors duration-200 hover:bg-muted">
              <Bell className="h-4 w-4" />
              {(unreadCount ?? 0) > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unreadCount! > 9 ? "9+" : unreadCount}
                </span>
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <span className="text-sm font-semibold">Notifications</span>
              {(unreadCount ?? 0) > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto px-2 py-1 text-xs"
                  onClick={() => markAllReadMutation.mutate()}
                >
                  <CheckCheck className="mr-1 h-3 w-3" />
                  Mark all read
                </Button>
              )}
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              {!notifications || notifications.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  No notifications
                </p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={`flex w-full flex-col gap-0.5 border-b px-4 py-2.5 text-left transition-colors hover:bg-muted/50 ${
                      !n.read ? "bg-primary/5" : ""
                    }`}
                    onClick={() => {
                      if (!n.read) markReadMutation.mutate({ id: n.id });
                      if (n.link) router.push(n.link);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {!n.read && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                      <span className="text-xs font-medium leading-tight">
                        {n.title}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {n.message}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(n.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* User profile */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 px-2">
                <Avatar className="h-7 w-7">
                  {user.image && <AvatarImage src={user.image} alt={user.name ?? ""} />}
                  <AvatarFallback className="bg-primary/15 text-xs font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium md:inline-block">
                  {user.name ?? user.email}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
