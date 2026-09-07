import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PenSquare } from "lucide-react";
import { currentUserRSC } from "@/lib/session-rsc";
import { listBoards } from "@/lib/queries";
import { ThreadCreateForm } from "@/components/thread-create-form";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "New thread" };

export default async function NewThreadPage({
  searchParams,
}: {
  searchParams: Promise<{ board?: string }>;
}) {
  const user = await currentUserRSC();
  if (!user) redirect("/login?next=/threads/new");

  const [{ board }, boards] = await Promise.all([searchParams, listBoards(user)]);
  const initialBoard = Number(board) || undefined;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
          <PenSquare className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Start a new thread</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Share something with the community.</p>
        </div>
      </div>
      <Card>
        <ThreadCreateForm
          boards={boards.map((b) => ({ id: b.id, name: b.name }))}
          initialBoard={initialBoard}
        />
      </Card>
    </div>
  );
}