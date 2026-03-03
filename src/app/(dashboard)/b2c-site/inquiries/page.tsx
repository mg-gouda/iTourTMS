"use client";

import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Mail, MailOpen, Reply, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  READ: "bg-gray-100 text-gray-700",
  REPLIED: "bg-green-100 text-green-700",
  ARCHIVED: "bg-yellow-100 text-yellow-700",
};

export default function InquiriesPage() {
  const { data: inquiries, isLoading } = trpc.b2cSite.contactInquiry.list.useQuery();
  const utils = trpc.useUtils();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);

  const markReadMutation = trpc.b2cSite.contactInquiry.markRead.useMutation({
    onSuccess: () => utils.b2cSite.contactInquiry.list.invalidate(),
  });
  const replyMutation = trpc.b2cSite.contactInquiry.reply.useMutation({
    onSuccess: () => {
      toast.success("Reply sent");
      utils.b2cSite.contactInquiry.list.invalidate();
      setReplyDialogOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.b2cSite.contactInquiry.delete.useMutation({
    onSuccess: () => {
      toast.success("Inquiry deleted");
      utils.b2cSite.contactInquiry.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const openReply = (id: string) => {
    setSelectedId(id);
    setReplyText("");
    setReplyDialogOpen(true);
  };

  const newCount = inquiries?.filter((i) => i.status === "NEW").length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Contact Inquiries
            {newCount > 0 && (
              <Badge className="ml-2" variant="destructive">{newCount} new</Badge>
            )}
          </h1>
          <p className="text-muted-foreground">Messages from the contact form</p>
        </div>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : !inquiries?.length ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No inquiries yet.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {inquiries.map((inq) => (
            <Card key={inq.id} className={`p-4 ${inq.status === "NEW" ? "border-blue-200 bg-blue-50/30" : ""}`}>
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    {inq.status === "NEW" ? <Mail className="h-4 w-4 text-blue-500" /> : <MailOpen className="h-4 w-4 text-muted-foreground" />}
                    <span className="font-medium">{inq.name}</span>
                    <span className="text-sm text-muted-foreground">&lt;{inq.email}&gt;</span>
                    <Badge className={`text-xs ${STATUS_COLORS[inq.status] || ""}`} variant="outline">
                      {inq.status}
                    </Badge>
                  </div>
                  {inq.subject && <p className="mb-1 text-sm font-medium">{inq.subject}</p>}
                  <p className="text-sm text-muted-foreground">{inq.message}</p>
                  {inq.reply && (
                    <div className="mt-2 rounded bg-green-50 p-2 text-sm">
                      <span className="font-medium text-green-700">Reply: </span>
                      {inq.reply}
                    </div>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {format(new Date(inq.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    {inq.phone && <span> &middot; {inq.phone}</span>}
                  </p>
                </div>
                <div className="flex gap-1">
                  {inq.status === "NEW" && (
                    <Button variant="ghost" size="icon" title="Mark as read" onClick={() => markReadMutation.mutate({ id: inq.id })}>
                      <MailOpen className="h-4 w-4" />
                    </Button>
                  )}
                  {inq.status !== "REPLIED" && (
                    <Button variant="ghost" size="icon" title="Reply" onClick={() => openReply(inq.id)}>
                      <Reply className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate({ id: inq.id }); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reply to Inquiry</DialogTitle></DialogHeader>
          <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={5} placeholder="Type your reply..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => { if (selectedId && replyText) replyMutation.mutate({ id: selectedId, reply: replyText }); }}
              disabled={!replyText || replyMutation.isPending}
            >
              {replyMutation.isPending ? "Sending..." : "Send Reply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
