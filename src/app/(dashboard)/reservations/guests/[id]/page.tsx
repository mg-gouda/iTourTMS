"use client";

import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_VARIANTS,
} from "@/lib/constants/reservations";
import { trpc } from "@/lib/trpc";

export default function GuestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: guest, isLoading } = trpc.reservations.guest.getById.useQuery({ id });

  const deleteMutation = trpc.reservations.guest.delete.useMutation({
    onSuccess: () => {
      utils.reservations.guest.list.invalidate();
      router.push("/reservations/guests");
    },
  });

  if (isLoading) {
    return (
      <div className="py-10 text-center text-muted-foreground">Loading...</div>
    );
  }

  if (!guest) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        Guest not found
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {guest.firstName} {guest.lastName}
            </h1>
            {guest.isVip && <Badge variant="default">VIP</Badge>}
          </div>
          <p className="text-muted-foreground">
            {guest.email ?? ""} {guest.phone ? `| ${guest.phone}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/reservations/guests/${id}/edit`)}
          >
            <Pencil className="mr-1 size-3.5" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-1 size-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow label="Nationality" value={guest.country?.name ?? guest.nationality} />
            <InfoRow label="Gender" value={guest.gender} />
            <InfoRow
              label="Date of Birth"
              value={guest.dateOfBirth ? format(new Date(guest.dateOfBirth), "dd MMM yyyy") : null}
            />
            <InfoRow label="Address" value={guest.address} />
            <InfoRow label="City" value={guest.city} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Travel Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow label="Passport No." value={guest.passportNo} />
            <InfoRow
              label="Passport Expiry"
              value={
                guest.passportExpiry
                  ? format(new Date(guest.passportExpiry), "dd MMM yyyy")
                  : null
              }
            />
            <InfoRow label="Mobile" value={guest.mobile} />
            <InfoRow label="Notes" value={guest.notes} />
          </CardContent>
        </Card>
      </div>

      {/* Booking History */}
      <Card>
        <CardHeader>
          <CardTitle>Booking History</CardTitle>
        </CardHeader>
        <CardContent>
          {guest.bookingGuests.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No bookings found for this guest.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking Code</TableHead>
                  <TableHead>Hotel</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guest.bookingGuests.map((bg) => (
                  <TableRow
                    key={bg.booking.id}
                    className="cursor-pointer"
                    onClick={() =>
                      router.push(`/reservations/bookings/${bg.booking.id}`)
                    }
                  >
                    <TableCell className="font-mono font-medium">
                      {bg.booking.code}
                    </TableCell>
                    <TableCell>{bg.booking.hotel.name}</TableCell>
                    <TableCell>
                      {format(new Date(bg.booking.checkIn), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      {format(new Date(bg.booking.checkOut), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          (BOOKING_STATUS_VARIANTS[bg.booking.status] as
                            | "default"
                            | "secondary"
                            | "outline"
                            | "destructive") ?? "secondary"
                        }
                      >
                        {BOOKING_STATUS_LABELS[bg.booking.status] ??
                          bg.booking.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Guest</DialogTitle>
            <DialogDescription>
              This will permanently delete {guest.firstName} {guest.lastName}.
              Guests with existing bookings cannot be deleted.
            </DialogDescription>
          </DialogHeader>
          {deleteMutation.error && (
            <p className="text-sm text-destructive">
              {deleteMutation.error.message}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate({ id })}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  );
}
