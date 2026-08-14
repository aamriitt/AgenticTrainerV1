import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, Lock } from "lucide-react";
import { AtlasLogoMark } from "@/components/branding/atlas-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";

/** Admin console sign-in — JWT auth with admin role enforced by the API. */
export function AdminLoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("admin@company.com");
  const [password, setPassword] = useState("Admin123!");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await login({ email: email.trim(), password });
      toast({ title: "Admin console unlocked", description: "Signed in with elevated access.", type: "success" });
      navigate("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign-in failed";
      toast({ title: "Admin sign-in failed", description: message, type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-slate-950 px-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(210 40% 96%) 1px, transparent 1px), linear-gradient(90deg, hsl(210 40% 96%) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[560px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-[400px] rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-sm"
      >
        <Link to="/login" className="mb-5 flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-500 hover:text-slate-300">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>

        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 ring-1 ring-slate-700">
            <ShieldCheck className="h-7 w-7 text-emerald-400" />
          </div>
          <h1 className="text-lg font-extrabold text-white">Admin console</h1>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            <AtlasLogoMark tone="white" size={13} /> Demo: admin@company.com / Admin123!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-email" className="text-slate-300">Admin email</Label>
            <Input
              id="admin-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@company.com"
              className="border-slate-700 bg-slate-800/60 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-password" className="flex items-center gap-1.5 text-slate-300">
              <Lock className="h-3 w-3" /> Password
            </Label>
            <Input
              id="admin-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="border-slate-700 bg-slate-800/60 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500"
            />
          </div>
          <Button type="submit" disabled={busy} className="mt-1 bg-emerald-500 text-slate-950 hover:bg-emerald-400">
            {busy ? "Unlocking…" : "Unlock admin console"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
