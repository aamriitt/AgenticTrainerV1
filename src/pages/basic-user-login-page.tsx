import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { AtlasLogo } from "@/components/branding/atlas-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";

/**
 * Basic "User" sign-in — read-only-ish access: Dashboard, Ask Atlas,
 * Conversation history, Knowledge graph. No Repository, no Upload Center.
 * Visually distinct (teal accent) from the SME's indigo/emerald theme.
 */
export function BasicUserLoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    login({ name: name.trim() || "Team Member", email: email.trim() || "user@company.com", role: "user" });
    toast({ title: `Welcome, ${name.trim() || "there"}!`, description: "Signed in to Agentic Trainer.", type: "success" });
    navigate("/");
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-teal-500/5 via-background to-cyan-500/5 px-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[380px] rounded-2xl border border-border bg-card p-8 shadow-lg"
      >
        <Link to="/login" className="mb-5 flex items-center gap-1.5 text-[11.5px] font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>

        <div className="mb-7 flex flex-col items-center text-center">
          <AtlasLogo variant="mark" size={44} className="mb-3" />
          <h1 className="text-lg font-extrabold">User sign-in</h1>
          <p className="mt-1 text-xs text-muted-foreground">Ask Atlas questions and browse conversation history.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Lee" className="focus-visible:ring-teal-500" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Work email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="focus-visible:ring-teal-500" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required placeholder="••••••••" className="focus-visible:ring-teal-500" />
          </div>
          <Button type="submit" className="mt-1 bg-teal-600 hover:bg-teal-600/90">Continue</Button>
        </form>

        <p className="mt-5 text-center text-[11px] text-muted-foreground">
          This account type doesn&apos;t include Knowledge Repository or Upload Center access.
        </p>
      </motion.div>
    </div>
  );
}
