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

/** Team-member sign-in — the everyday Agentic Trainer workspace entry point. */
export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("Amrit K.");
  const [email, setEmail] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    login({ name: name.trim() || "Team Member", email: email.trim() || "member@company.com", role: "user" });
    toast({ title: `Welcome back, ${name.trim() || "there"}!`, description: "Signed in to Agentic Trainer.", type: "success" });
    navigate("/");
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-atlas-indigo/5 via-background to-atlas-emerald/5 px-4">
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
          <h1 className="text-lg font-extrabold">Sign in to Agentic Trainer</h1>
          <p className="mt-1 text-xs text-muted-foreground">Atlas is ready to help your team find answers.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Lee" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Work email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required placeholder="••••••••" />
          </div>
          <Button type="submit" className="mt-1">Continue</Button>
        </form>

        <p className="mt-5 text-center text-[11px] text-muted-foreground">Enterprise SSO also available via your identity provider.</p>
      </motion.div>
    </div>
  );
}
