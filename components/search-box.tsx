"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";

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
      <InputGroup className={large ? "h-11 rounded-xl bg-background" : "bg-background"}>
        <InputGroupAddon>
          <InputGroupText>
            <SearchIcon />
          </InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label="Search"
        />
        <InputGroupAddon align="inline-end">
          <Button type="submit" size="sm">
            Search
          </Button>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
