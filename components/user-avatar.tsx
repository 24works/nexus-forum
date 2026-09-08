import { avatarDataUri } from "@/lib/avatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * Deterministic SVG avatar for a username, rendered through the shadcn
 * Avatar so the initials fallback covers load failures.
 */
export function UserAvatar({
  name,
  className,
  size = "default",
}: {
  name: string;
  className?: string;
  size?: "default" | "sm" | "lg" | number;
}) {
  // Numeric sizes map onto the closest named variant so rows stay aligned.
  const variant = typeof size === "number" ? (size >= 40 ? "lg" : size <= 20 ? "sm" : "default") : size;
  return (
    <Avatar size={variant} className={cn(className)}>
      <AvatarImage src={avatarDataUri(name, 96)} alt={name} loading="lazy" decoding="async" />
      <AvatarFallback>{name.slice(0, 2).toUpperCase() || "?"}</AvatarFallback>
    </Avatar>
  );
}
