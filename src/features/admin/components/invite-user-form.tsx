import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "@/services/admin.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useState } from "react";

const inviteSchema = z.object({
  name: z.string().min(2, "Enter the person's full name"),
  email: z.string().email("Enter a valid work email"),
  role: z.enum(["knowledge_admin", "sme_contributor", "viewer"]),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

const ROLE_OPTIONS: Array<{ value: InviteFormValues["role"]; label: string }> = [
  { value: "sme_contributor", label: "SME contributor" },
  { value: "knowledge_admin", label: "Knowledge admin" },
  { value: "viewer", label: "Viewer" },
];

export function InviteUserForm() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: "sme_contributor" },
  });

  const inviteMutation = useMutation({
    mutationFn: adminService.inviteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      reset();
      setOpen(false);
    },
  });

  const onSubmit = (values: InviteFormValues) => inviteMutation.mutate(values);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-3.5 w-3.5" /> Invite user</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a workspace member</DialogTitle>
          <DialogDescription>They&apos;ll receive an email invite to join Agentic Trainer and Atlas.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" placeholder="Jordan Lee" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Work email</Label>
            <Input id="email" type="email" placeholder="jordan.lee@company.com" {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              {...register("role")}
              className="h-9 rounded-lg border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <Button type="submit" disabled={isSubmitting || inviteMutation.isPending} className="mt-1">
            {inviteMutation.isPending ? "Sending invite…" : "Send invite"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
