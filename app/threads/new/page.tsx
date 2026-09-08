import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PenSquareIcon } from "lucide-react";
import { currentUserRSC } from "@/lib/session-rsc";
import { listBoards } from "@/lib/queries";
import { ThreadCreateForm } from "@/components/thread-create-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "New thread" };

export default async function NewThreadPage({
  searchParams,
}: {
  searchParams: Promise<{ board?: string }>;
}) {
  const user = await currentUserRSC();
  const [{ board }, boards] = await Promise.all([searchParams, listBoards(user)]);
  if (!user) {
    // Preserve the preselected board across the login round-trip.
    const next = board ? `/threads/new?board=${board}` : "/threads/new";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  const initialBoard = Number(board) || undefined;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-foreground">
          <PenSquareIcon className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Start a new thread</h1>
          <p className="text-sm text-muted-foreground">Share something with the community.</p>
        </div>
      </div>
      <Card>
        <CardContent>
          <ThreadCreateForm
            boards={boards.map((b) => ({ id: b.id, name: b.name }))}
            initialBoard={initialBoard}
          />
        </CardContent>
      </Card>
    </div>
  );
}
