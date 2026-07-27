import { useQuery } from "@tanstack/react-query";
import { Download, ExternalLink, Gamepad2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { linksQuery, type GameWithCover } from "@/lib/games";

export function GameDialog({
  game,
  onOpenChange,
}: {
  game: GameWithCover | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: links, isLoading } = useQuery({
    ...linksQuery(game?.id ?? ""),
    enabled: !!game,
  });

  return (
    <Dialog open={!!game} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-popover sm:max-w-lg">
        {game && (
          <>
            <DialogHeader>
              <div className="flex gap-4">
                <div className="h-32 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                  {game.coverSrc ? (
                    <img
                      src={game.coverSrc}
                      alt={`غلاف لعبة ${game.title}`}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <Gamepad2 className="size-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 text-start">
                  <DialogTitle className="font-display text-xl leading-tight">
                    {game.title}
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-xs uppercase tracking-wider">
                    {[game.platform, game.size, game.release_year].filter(Boolean).join(" · ")}
                  </DialogDescription>
                  {game.description && (
                    <p className="mt-2 line-clamp-4 text-sm text-muted-foreground">
                      {game.description}
                    </p>
                  )}
                </div>
              </div>
            </DialogHeader>

            <div className="mt-2 space-y-2">
              <p className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                روابط التحميل
              </p>

              {isLoading ? (
                <>
                  <Skeleton className="h-12 rounded-xl" />
                  <Skeleton className="h-12 rounded-xl" />
                </>
              ) : !links || links.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  لم تتم إضافة أي روابط لهذه اللعبة بعد.
                </p>
              ) : (
                links.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-ring hover:bg-secondary"
                  >
                    <Download className="size-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {link.label}
                    </span>
                    <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                  </a>
                ))
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
