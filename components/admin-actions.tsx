"use client";

/**
 * Client-side actions for the /admin dashboard: report resolution, user
 * moderation and board management. The dashboard page itself is a server
 * component; these islands call the admin APIs and refresh in place.
 */

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Undo2, Plus } from "lucide-react";
import { Button, Input, Select } from "@/components/ui";
import { api } from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export function ReportActions({ reportId, status }: { reportId: number; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== "open") return null;

  const act = async (action: "resolve" | "dismiss") => {
    setBusy(true);
    setError(null);
    try {
      const res = await api(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        json: { action },
      });
      if (res.ok) router.refresh();
      else setError(res.error ?? "Action failed.");
    } catch {
      setError("A network error occurred.");
    }
    setBusy(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="success" disabled={busy} onClick={() => act("resolve")}>
        <Check className="size-3.5" /> Resolve
      </Button>
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => act("dismiss")}>
        <Undo2 className="size-3.5" /> Dismiss
      </Button>
      {error && <span className="text-xs text-rose-600 dark:text-rose-400">{error}</span>}
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
  const [error, setError] = useState<string | null>(null);

  // Moderators may only act on ordinary members; admins on anyone but
  // themselves (via this panel).
  const targetProtected = role !== "member" && viewerRole !== "admin";
  if (targetProtected || isSelf) return null;

  const act = async (json: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await api(`/api/admin/users/${userId}`, { method: "PATCH", json });
      if (res.ok) router.refresh();
      else setError(res.error ?? "Action failed.");
    } catch {
      setError("A network error occurred.");
    }
    setBusy(false);
  };

  const ban = () => {
    const reason = window.prompt("Reason for banning this user?");
    if (reason === null) return;
    void act({ action: "ban", reason });
  };

  const changeRole = (nextRole: string) => {
    if (!window.confirm(`Change this user's role to "${nextRole}"?`)) return;
    void act({ action: "role", role: nextRole });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "active" ? (
        <Button size="sm" variant="danger" disabled={busy} onClick={ban}>
          Ban
        </Button>
      ) : (
        <Button size="sm" variant="success" disabled={busy} onClick={() => act({ action: "unban" })}>
          Unban
        </Button>
      )}
      {viewerRole === "admin" && (
        <Select
          aria-label="Change role"
          value={role}
          disabled={busy}
          onChange={(e) => changeRole(e.target.value)}
          className="w-32"
        >
          <option value="member">Member</option>
          <option value="moderator">Moderator</option>
          <option value="admin">Admin</option>
        </Select>
      )}
      {error && <span className="text-xs text-rose-600 dark:text-rose-400">{error}</span>}
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
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={60} />
        <Input
          label="Slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())}
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          placeholder="my-category"
        />
      </div>
      <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} />
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      <div>
        <Button type="submit" size="sm" disabled={busy}>
          <Plus className="size-3.5" /> {busy ? "Creating…" : "Create category"}
        </Button>
      </div>
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
      <div className="mt-2 flex w-full flex-col gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            maxLength={60}
          />
          <Select
            label="Visibility"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="everyone">Everyone</option>
            <option value="member">Signed-in members</option>
            <option value="moderator">Moderators+</option>
            <option value="admin">Admins only</option>
          </Select>
        </div>
        <Input
          label="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          maxLength={200}
        />
        <Input
          label="Position"
          type="number"
          value={form.position}
          onChange={(e) => setForm({ ...form, position: e.target.value })}
        />
        {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
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
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditing(true)}>
        Edit
      </Button>
      <Button
        size="sm"
        variant={isEnabled ? "ghost" : "success"}
        disabled={busy}
        onClick={() => patch({ is_enabled: !isEnabled })}
      >
        {isEnabled ? "Hide" : "Show"}
      </Button>
      {error && <span className="text-xs text-rose-600 dark:text-rose-400">{error}</span>}
    </div>
  );
}
