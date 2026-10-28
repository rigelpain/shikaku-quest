"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Home, Award, Swords, BookOpen, NotebookPen, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { IsoLogo } from "@/components/iso/iso-cubes";

const NAV = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/certs", label: "資格", icon: Award },
  { href: "/practice", label: "演習", icon: Swords },
  { href: "/texts", label: "テキスト", icon: BookOpen },
  { href: "/log", label: "記録", icon: NotebookPen },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh w-full">
      {/* PC・タブレット: 左のレール。md で幅4.5rem、lg でラベル付き */}
      <aside className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex md:w-[4.5rem] lg:w-56">
        <Link
          href="/"
          className="flex h-16 items-center justify-center gap-2.5 border-b border-sidebar-border px-3 font-display text-lg lg:justify-start lg:px-5 lg:text-xl"
        >
          <IsoLogo className="h-8 w-auto shrink-0" />
          <span className="hidden lg:inline">資格クエスト</span>
          <span className="sr-only">資格クエスト ホーム</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1 p-2 lg:p-3" aria-label="メイン">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                  "justify-center lg:justify-start",
                  active
                    ? "bg-sidebar-accent font-bold text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                <span className="hidden lg:inline">{label}</span>
                <span className="sr-only lg:hidden">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-2 lg:p-3">
          <Link
            href="/settings"
            aria-current={isActive(pathname, "/settings") ? "page" : undefined}
            className={cn(
              "flex items-center justify-center gap-3 rounded-md px-3 py-2.5 text-sm lg:justify-start",
              isActive(pathname, "/settings")
                ? "bg-sidebar-accent font-bold text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
            )}
          >
            <Settings className="size-5 shrink-0" aria-hidden />
            <span className="hidden lg:inline">設定</span>
            <span className="sr-only lg:hidden">設定</span>
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* スマホ: 上のバー */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur md:hidden">
          <Link href="/" className="flex items-center gap-2 font-display text-lg">
            <IsoLogo className="h-6 w-auto" />
            資格クエスト
          </Link>
          <Link
            href="/settings"
            className="rounded-md p-2 text-muted-foreground hover:bg-muted"
            aria-label="設定"
          >
            <Settings className="size-5" aria-hidden />
          </Link>
        </header>

        <main className="page flex-1 py-5 pb-[calc(5rem+env(safe-area-inset-bottom))] md:py-8 md:pb-10">
          {children}
        </main>

        {/* スマホ: 下のタブバー */}
        <nav
          className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
          aria-label="メイン"
        >
          <ul className="grid grid-cols-5">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-16 flex-col items-center justify-center gap-1 text-[0.7rem]",
                      active ? "font-bold text-primary" : "text-muted-foreground",
                    )}
                  >
                    <Icon className={cn("size-5", active && "stroke-[2.5]")} aria-hidden />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
