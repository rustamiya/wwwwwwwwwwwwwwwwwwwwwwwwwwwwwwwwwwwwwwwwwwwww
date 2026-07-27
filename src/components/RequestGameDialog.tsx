import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const schema = z.object({
  title: z.string().trim().min(1, "اكتب اسم اللعبة").max(120, "اسم اللعبة طويل جداً"),
  contact: z.string().trim().max(200, "وسيلة التواصل طويلة جداً"),
  note: z.string().trim().max(1000, "الملاحظات طويلة جداً"),
});

export function RequestGameDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [contact, setContact] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ title, contact, note });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSending(true);
    const { error } = await supabase.from("game_requests").insert({
      title: parsed.data.title,
      contact: parsed.data.contact || null,
      note: parsed.data.note || null,
    });
    setSending(false);
    if (error) {
      toast.error("تعذّر إرسال الطلب، حاول مرة أخرى.");
      return;
    }
    toast.success("تم إرسال طلبك، سنضيف اللعبة قريباً بإذن الله.");
    setTitle("");
    setContact("");
    setNote("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-start">
          <DialogTitle className="font-display text-xl">اطلب لعبة</DialogTitle>
          <DialogDescription>
            لم تجد اللعبة في المكتبة؟ اكتب اسمها وسنحاول رفعها لك.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="req-title">اسم اللعبة</Label>
            <Input
              id="req-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: FIFA 24"
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="req-contact">وسيلة تواصل (اختياري)</Label>
            <Input
              id="req-contact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="تيليجرام أو بريد إلكتروني"
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="req-note">ملاحظات (اختياري)</Label>
            <Textarea
              id="req-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="الإصدار، اللغة، أي تفاصيل إضافية…"
              maxLength={1000}
            />
          </div>
          <Button type="submit" className="w-full" disabled={sending}>
            {sending ? (
              <Loader2 className="me-2 size-4 animate-spin" />
            ) : (
              <Send className="me-2 size-4" />
            )}
            إرسال الطلب
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
