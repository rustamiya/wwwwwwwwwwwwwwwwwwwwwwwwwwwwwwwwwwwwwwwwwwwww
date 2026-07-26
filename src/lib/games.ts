import { supabase } from "@/integrations/supabase/client";

export const STORAGE_PREFIX = "storage:";

export type Game = {
  id: string;
  title: string;
  cover_url: string | null;
  platform: string;
  description: string | null;
  size: string | null;
  release_year: number | null;
  created_at: string;
};

export type GameLink = {
  id: string;
  game_id: string;
  label: string;
  url: string;
  sort_order: number;
};

export type GameWithCover = Game & { coverSrc: string | null };

/**
 * Covers live in a private bucket, so storage-backed covers are resolved into
 * short-lived signed URLs. Plain http(s) covers are used as-is.
 */
export async function resolveCovers(games: Game[]): Promise<GameWithCover[]> {
  const paths = games
    .map((g) => g.cover_url)
    .filter((u): u is string => !!u && u.startsWith(STORAGE_PREFIX))
    .map((u) => u.slice(STORAGE_PREFIX.length));

  const signed = new Map<string, string>();
  if (paths.length > 0) {
    const { data } = await supabase.storage.from("covers").createSignedUrls(paths, 60 * 60 * 6);
    data?.forEach((entry) => {
      if (entry.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl);
    });
  }

  return games.map((g) => {
    if (!g.cover_url) return { ...g, coverSrc: null };
    if (g.cover_url.startsWith(STORAGE_PREFIX)) {
      return { ...g, coverSrc: signed.get(g.cover_url.slice(STORAGE_PREFIX.length)) ?? null };
    }
    return { ...g, coverSrc: g.cover_url };
  });
}

export async function fetchGames(): Promise<GameWithCover[]> {
  const { data, error } = await supabase
    .from("games")
    .select("id, title, cover_url, platform, description, size, release_year, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return resolveCovers((data ?? []) as Game[]);
}

export async function fetchLinks(gameId: string): Promise<GameLink[]> {
  const { data, error } = await supabase
    .from("game_links")
    .select("id, game_id, label, url, sort_order")
    .eq("game_id", gameId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as GameLink[];
}

export const gamesQuery = {
  queryKey: ["games"] as const,
  queryFn: fetchGames,
};

export const linksQuery = (gameId: string) => ({
  queryKey: ["game-links", gameId] as const,
  queryFn: () => fetchLinks(gameId),
});
