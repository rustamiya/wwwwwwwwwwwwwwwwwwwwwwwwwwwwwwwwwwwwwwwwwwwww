import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Gamepad2, Loader2, LogOut, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { claimFirstAdmin } from "@/lib/admin.functions";
import { gamesQuery, fetchLinks, STORAGE_PREFIX, type GameWithCover } from "@/lib/games";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Manage games — ViKiNG GAMES" },
      { name: "description", content: "Upload PS4 games and manage their download links." },
      { property: "og:title", content: "Manage games — ViKiNG GAMES" },
      { property: "og:description", content: "Upload PS4 games and manage their download links." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type LinkDraft = { id?: string; label: string; url: string };

const gameSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  platform: z.string().trim().min(1).max(30),
  size: z.string().trim().max(30),
  release_year: z.string().trim().max(4),
  description: z.string().trim().max(2000),
});

const linkSchema = z.object({
  label: z.string().trim().min(1, "Every link needs a name").max(80),
  url: z.string().trim().url("Links must be valid URLs").max(2000),
});

function emptyForm() {
  return {
    title: "",
    platform: "PS4",
    size: "",
    release_year: "",
    description: "",
  };
}

function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const claim = useServerFn(claimFirstAdmin);

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [links, setLinks] = useState<LinkDraft[]>([{ label: "", url: "" }]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const { data: games, isLoading } = useQuery(gamesQuery);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (roles) {
        if (active) setIsAdmin(true);
        return;
      }
      try {
        const result = await claim({ data: undefined });
        if (active) setIsAdmin(!!result?.granted);
      } catch {
        if (active) setIsAdmin(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [claim]);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm());
    setLinks([{ label: "", url: "" }]);
    setCoverFile(null);
    setCoverPreview(null);
  }

  async function startEdit(game: GameWithCover) {
    setEditingId(game.id);
    setForm({
      title: game.title,
      platform: game.platform,
      size: game.size ?? "",
      release_year: game.release_year ? String(game.release_year) : "",
      description: game.description ?? "",
    });
    setCoverFile(null);
    setCoverPreview(game.coverSrc);
    const existing = await fetchLinks(game.id);
    setLinks(
      existing.length > 0
        ? existing.map((l) => ({ id: l.id, label: l.label, url: l.url }))
        : [{ label: "", url: "" }],
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const save = useMutation({
    mutationFn: async () => {
      const parsed = gameSchema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);

      const cleanLinks = links.filter((l) => l.label.trim() || l.url.trim());
      for (const link of cleanLinks) {
        const check = linkSchema.safeParse(link);
        if (!check.success) throw new Error(check.error.issues[0].message);
      }

      let coverValue: string | undefined;
      if (coverFile) {
        const ext = coverFile.name.split(".").pop() ?? "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("covers")
          .upload(path, coverFile, { contentType: coverFile.type });
        if (uploadError) throw uploadError;
        coverValue = `${STORAGE_PREFIX}${path}`;
      }

      const payload = {
        title: parsed.data.title,
        platform: parsed.data.platform,
        size: parsed.data.size || null,
        release_year: parsed.data.release_year ? Number(parsed.data.release_year) : null,
        description: parsed.data.description || null,
        ...(coverValue ? { cover_url: coverValue } : {}),
      };

      let gameId = editingId;
      if (editingId) {
        const { error } = await supabase.from("games").update(payload).eq("id", editingId);
        if (error) throw error;
        const { error: delError } = await supabase
          .from("game_links")
          .delete()
          .eq("game_id", editingId);
        if (delError) throw delError;
      } else {
        const { data, error } = await supabase.from("games").insert(payload).select("id").single();
        if (error) throw error;
        gameId = data.id;
      }

      if (gameId && cleanLinks.length > 0) {
        const { error } = await supabase.from("game_links").insert(
          cleanLinks.map((l, i) => ({
            game_id: gameId!,
            label: l.label.trim(),
            url: l.url.trim(),
            sort_order: i,
          })),
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Game updated" : "Game published");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["games"] });
      queryClient.invalidateQueries({ queryKey: ["game-links"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("games").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Game removed");
      queryClient.invalidateQueries({ queryKey: ["games"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isAdmin === false) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center" dir="ltr" lang="en">
        <div className="max-w-sm rounded-2xl border border-border bg-card p-8">
          <h1 className="font-display text-xl font-bold">Not an admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This account can't manage the library. Sign in with the admin account.
          </p>
          <Button className="mt-6 w-full" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" dir="ltr" lang="en">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-gradient-brand">
              <Gamepad2 className="size-5 text-primary-foreground" />
            </span>
            <span className="font-display text-lg font-bold tracking-wide">VIKING GAMES</span>
          </Link>
          <span className="rounded-md bg-secondary px-2 py-1 text-xs text-muted-foreground">
            Admin
          </span>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={signOut}>
            <LogOut className="mr-1.5 size-4" />
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-10 px-4 py-10">
        <section className="rounded-2xl border border-border bg-card p-6">
          <h1 className="font-display text-2xl font-bold">
            {editingId ? "Edit game" : "Add a game"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload the cover, then add as many named download links as you need.
          </p>

          <div className="mt-6 grid gap-6 md:grid-cols-[200px_1fr]">
            <div>
              <Label className="mb-2 block">Cover</Label>
              <label className="flex aspect-[3/4] cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-surface-2 transition-colors hover:border-ring">
                {coverPreview ? (
                  <img src={coverPreview} alt="Cover preview" className="size-full object-cover" />
                ) : (
                  <span className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                    <Upload className="size-6" />
                    Upload image
                  </span>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setCoverFile(file);
                    setCoverPreview(URL.createObjectURL(file));
                  }}
                />
              </label>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Game title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. PES 2026 Season Update"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="platform">Platform</Label>
                  <Input
                    id="platform"
                    value={form.platform}
                    onChange={(e) => setForm({ ...form, platform: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="size">Size</Label>
                  <Input
                    id="size"
                    value={form.size}
                    onChange={(e) => setForm({ ...form, size: e.target.value })}
                    placeholder="45 GB"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    inputMode="numeric"
                    value={form.release_year}
                    onChange={(e) => setForm({ ...form, release_year: e.target.value })}
                    placeholder="2026"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Region, language, install notes…"
                />
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between">
              <Label>Download links</Label>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setLinks([...links, { label: "", url: "" }])}
              >
                <Plus className="mr-1.5 size-4" />
                Add link
              </Button>
            </div>
            <div className="mt-3 space-y-3">
              {links.map((link, i) => (
                <div key={i} className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={link.label}
                    placeholder="Part 1"
                    className="sm:w-44"
                    onChange={(e) => {
                      const next = [...links];
                      next[i] = { ...next[i], label: e.target.value };
                      setLinks(next);
                    }}
                  />
                  <Input
                    value={link.url}
                    placeholder="https://…"
                    className="flex-1"
                    onChange={(e) => {
                      const next = [...links];
                      next[i] = { ...next[i], url: e.target.value };
                      setLinks(next);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove link"
                    onClick={() => setLinks(links.filter((_, idx) => idx !== i))}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editingId ? "Save changes" : "Publish game"}
            </Button>
            {editingId && (
              <Button variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </section>

        <RequestsSection />



        <section>
          <h2 className="font-display text-xl font-bold">Library</h2>
          <div className="mt-4 space-y-3">
            {isLoading ? (
              <>
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
              </>
            ) : (games ?? []).length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                No games yet — add your first one above.
              </p>
            ) : (
              games!.map((game) => (
                <div
                  key={game.id}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card p-3"
                >
                  <div className="h-16 w-12 shrink-0 overflow-hidden rounded-md bg-surface-2">
                    {game.coverSrc && (
                      <img
                        src={game.coverSrc}
                        alt={`${game.title} cover`}
                        className="size-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display font-semibold">{game.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[game.platform, game.size, game.release_year].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => startEdit(game)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${game.title}`}
                    onClick={() => remove.mutate(game.id)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
