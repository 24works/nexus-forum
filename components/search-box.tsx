"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button, Input } from "@/components/ui";

export function SearchBox({
  initial = "",
  large = false,
  placeholder = "Search threads…",
  autoFocus = false,
  boardFilter = "",
}: {
  initial?: string;
  large?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  boardFilter?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initial);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (boardFilter) params.set("board", boardFilter);
    router.push(params.toString() ? `/search?${params.toString()}` : "/search");
  };

  return (
    <form onSubmit={submit} className={large ? "w-full" : "w-full max-w-md"} role="search">
      <div className="relative flex items-center gap-2">
        <SearchBoxInput value={query} onChange={setQuery} autoFocus={autoFocus} />
        <Button type="submit" className="shrink-0">
          Search
        </Button>
      </div>
    </form>
  );
}

function SearchBoxInput({
  value,
  onChange,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search threads…"
        aria-label="Search"
        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
    </div>
  );
}