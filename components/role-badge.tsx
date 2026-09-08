import { Badge } from "@/components/ui/badge";
import { Role } from "@/lib/types";

export function RoleBadge({ role }: { role: Role }) {
  const label = role === "admin" ? "Admin" : role === "moderator" ? "Mod" : "Member";
  return (
    <Badge variant={role === "admin" ? "default" : role === "moderator" ? "secondary" : "outline"}>{label}</Badge>
  );
}
