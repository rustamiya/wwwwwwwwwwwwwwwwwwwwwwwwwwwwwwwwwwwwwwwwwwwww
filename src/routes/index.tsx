import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Download, Gamepad2, Search, ShieldCheck } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { gamesQuery, type GameWithCover } from "@/lib/games";
import { GameDialog } from "@/components/GameDialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ViKiNG GAMES — تحميل ألعاب PS4" },
      {
        name: "description",
        content:
          "اضغط على غلاف أي لعبة PS4 لعرض روابط التحميل. مكتبة سريعة ومنظمة لألعاب بلايستيشن 4.",
      },
      { property: "og:title", content: "ViKiNG GAMES — تحميل ألعاب PS4" },
      {
        property: "og:description",
        content: "اضغط على غلاف أي لعبة PS4 لعرض روابط التحميل. مكتبة سريعة ومنظمة لألعاب بلايستيشن 4.",
      },
      { property: "og:url", content: "https://playstation-vault-share.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://playstation-vault-share.lovable.app/" }],
  }),
  component: Index,
});

function Index() {
  const { data: games, isLoading } = useQuery(gamesQuery);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<GameWithCover | null>(null);

  const filtered = (games ?? []).filter((g) =>
    g.title.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <span className="flex size-9 items-center justify-center rounded-lg bg-gradient-brand shadow-glow">
            <Gamepad2 className="size-5 text-primary-foreground" />
          </span>
          <span className="font-display text-lg font-bold tracking-wide">VIKING GAMES</span>
          <Link
            to="/admin"
            className="ms-auto inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ShieldCheck className="size-3.5" />
            لوحة التحكم
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24">
        <section className="py-12 sm:py-16">
          <Badge className="mb-4 bg-secondary text-secondary-foreground">
            مكتبة بلايستيشن 4
          </Badge>
          <h1 className="max-w-2xl text-4xl font-bold leading-[1.3] sm:text-6xl">
            اضغط على الغلاف{" "}
            <span className="text-gradient-brand">واحصل على روابط التحميل</span>
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            كل لعبة في المكتبة لها روابطها الخاصة — اللعبة الأساسية، الأجزاء، التحديثات
            والتصحيحات.
          </p>

          <div className="relative mt-8 max-w-md">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن لعبة…"
              className="h-12 rounded-xl bg-card ps-10 text-base"
              aria-label="ابحث عن لعبة"
            />
          </div>
        </section>

        <section aria-labelledby="library-heading">
          <h2 id="library-heading" className="sr-only">
            مكتبة الألعاب
          </h2>


          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <Download className="mx-auto mb-3 size-8 text-muted-foreground" />
              <p className="font-display text-lg font-semibold">
                {games?.length ? "لا توجد نتائج مطابقة للبحث" : "المكتبة فارغة حالياً"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {games?.length
                  ? "جرّب اسم لعبة آخر."
                  : "سجّل الدخول كمشرف لإضافة أول لعبة."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => setSelected(game)}
                  className="group overflow-hidden rounded-2xl border border-border bg-card text-start transition-all hover:-translate-y-1 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-surface-2">
                    {game.coverSrc ? (
                      <img
                        src={game.coverSrc}
                        alt={`غلاف لعبة ${game.title}`}
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <Gamepad2 className="size-10 text-muted-foreground" />
                      </div>
                    )}
                    <span className="absolute start-2 top-2 rounded-md bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur">
                      {game.platform}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="truncate font-display text-sm font-semibold">{game.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {[game.size, game.release_year].filter(Boolean).join(" · ") ||
                        "عرض روابط التحميل"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

      <GameDialog game={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
}
