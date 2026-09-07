import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/header";
import { currentUserRSC, resolveTheme, unreadCountRSC } from "@/lib/session-rsc";
import { forumName, forumTagline } from "@/lib/settings";

export const metadata: Metadata = {
  title: {
    default: forumName().concat(" · ", forumTagline()),
    template: `%s · ${forumName()}`,
  },
  description: forumTagline(),
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [user, unread, theme] = await Promise.all([currentUserRSC(), unreadCountRSC(), resolveTheme()]);

  return (
    <html lang="en" className={theme.themeClass === "dark" ? "dark" : undefined} suppressHydrationWarning>
      <head>
        <meta name="robots" content="index,follow" />
        {theme.isSystem && (
          // "System" theme: follow the OS preference before first paint.
          <script
            dangerouslySetInnerHTML={{
              __html:
                "if(matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.classList.add('dark')}",
            }}
          />
        )}
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <Header user={user} unread={unread} theme={theme.themeClass} />
        <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-6xl flex-col px-4 py-6 sm:px-6">
          <main className="flex-1">{children}</main>
          <footer className="mt-10 border-t border-slate-200 pt-5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p>
                © {new Date().getFullYear()} {forumName()} · Running on Cloudflare Workers
              </p>
              <nav className="flex gap-4">
                <a href="/stats" className="hover:underline">
                  Stats
                </a>
                <a href="/search" className="hover:underline">
                  Search
                </a>
                <a href="/admin" className="hover:underline">
                  Moderation
                </a>
              </nav>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}