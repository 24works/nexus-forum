"use client";

/**
 * Client-side actions for the /admin dashboard: report resolution, user
 * moderation and board management. The dashboard page itself is a server
 * component; these islands call the admin APIs and refresh in place.
 */

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, PlusIcon, Undo2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export function ReportActions({ reportId, status }: { reportId: number; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (status !== "open") return null;

  const act = async (action: "resolve" | "dismiss") => {
    setBusy(true);
    try {
      const res = await api(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        json: { action },
      });
      if (res.ok) router.refresh();
      else toast.error(res.error ?? "Action failed.");
    } catch {
      toast.error("A network error occurred.");
    }
    setBusy(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button size="sm" variant="secondary" disabled={busy} onClick={() => act("resolve")}>
        <CheckIcon data-icon="inline-start" />
        Resolve
      </Button>
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => act("dismiss")}>
        <Undo2Icon data-icon="inline-start" />
        Dismiss
      </Button>
      {busy && <Spinner className="size-3.5 text-muted-foreground" />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export function UserActions({
  userId,
  status,
  role,
  viewerRole,
  isSelf,
}: {
  userId: number;
  status: string;
  role: string;
  viewerRole: "admin" | "moderator";
  isSelf: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [banReason, setBanReason] = useState("");

  // Moderators may only act on ordinary members; admins on anyone but
  // themselves (via this panel).
  const targetProtected = role !== "member" && viewerRole !== "admin";
  if (targetProtected || isSelf) return null;

  const act = async (json: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await api(`/api/admin/users/${userId}`, { method: "PATCH", json });
      if (res.ok) router.refresh();
      else toast.error(res.error ?? "Action failed.");
    } catch {
      toast.error("A network error occurred.");
    }
    setBusy(false);
  };

  const changeRole = (nextRole: string) => {
    void act({ action: "role", role: nextRole });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {status === "active" ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="destructive" disabled={busy}>
              Ban
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ban this user?</AlertDialogTitle>
              <AlertDialogDescription>
                The user will no longer be able to sign in or post.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Field>
              <FieldLabel htmlFor={`ban-reason-${userId}`}>Reason</FieldLabel>
              <Input
                id={`ban-reason-${userId}`}
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Shown to moderators in the audit log"
                maxLength={300}
              />
            </Field>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  void act({ action: "ban", reason: banReason });
                  setBanReason("");
                }}
              >
                Ban user
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => act({ action: "unban" })}>
          Unban
        </Button>
      )}
      {viewerRole === "admin" && (
        <Select value={role} onValueChange={changeRole} disabled={busy}>
          <SelectTrigger className="h-7 w-32 text-xs" aria-label="Change role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="moderator">Moderator</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      )}
      {busy && <Spinner className="size-3.5 text-muted-foreground" />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Boards
// ---------------------------------------------------------------------------

export function BoardCreateForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api("/api/admin/boards", {
        method: "POST",
        json: { name, slug, description, role: "everyone", position: 99 },
      });
      if (res.ok) {
        setName("");
        setSlug("");
        setDescription("");
        router.refresh();
      } else {
        setError(res.error ?? "Could not create the category.");
      }
    } catch {
      setError("A network error occurred.");
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="board-name">Name</FieldLabel>
            <Input
              id="board-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={60}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="board-slug">Slug</FieldLabel>
            <Input
              id="board-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              placeholder="my-category"
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="board-description">Description</FieldLabel>
          <Input
            id="board-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
          />
        </Field>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div>
          <Button type="submit" size="sm" disabled={busy}>
            {busy ? <Spinner data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}
            {busy ? "Creating…" : "Create category"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

export function BoardRowActions({
  boardId,
  isEnabled,
  role,
  position,
  name,
  description,
}: {
  boardId: number;
  isEnabled: boolean;
  role: string;
  position: number;
  name: string;
  description: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name, description, role, position: String(position) });

  const patch = async (json: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await api(`/api/admin/boards/${boardId}`, { method: "PATCH", json });
      if (res.ok) {
        router.refresh();
        return true;
      }
      setError(res.error ?? "Update failed.");
    } catch {
      setError("A network error occurred.");
    }
    setBusy(false);
    return false;
  };

  if (editing) {
    return (
      <div className="mt-2 w-full rounded-lg border p-3">
        <FieldGroup className="gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={`board-name-${boardId}`}>Name</FieldLabel>
              <Input
                id={`board-name-${boardId}`}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                maxLength={60}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`board-role-${boardId}`}>Visibility</FieldLabel>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger id={`board-role-${boardId}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="everyone">Everyone</SelectItem>
                    <SelectItem value="member">Signed-in members</SelectItem>
                    <SelectItem value="moderator">Moderators+</SelectItem>
                    <SelectItem value="admin">Admins only</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor={`board-description-${boardId}`}>Description</FieldLabel>
            <Input
              id={`board-description-${boardId}`}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={200}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`board-position-${boardId}`}>Position</FieldLabel>
            <Input
              id={`board-position-${boardId}`}
              type="number"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
            />
          </Field>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={busy}
              onClick={async () => {
                const ok = await patch({
                  name: form.name,
                  description: form.description,
                  role: form.role,
                  position: Number(form.position),
                });
                if (ok) setEditing(false);
              }}
            >
              Save
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </FieldGroup>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditing(true)}>
        Edit
      </Button>
      <Button size="sm" variant={isEnabled ? "ghost" : "secondary"} disabled={busy} onClick={() => patch({ is_enabled: !isEnabled })}>
        {isEnabled ? "Hide" : "Show"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
