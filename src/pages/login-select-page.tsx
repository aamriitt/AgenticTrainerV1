import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MessagesSquare, ShieldCheck, Users, ArrowRight } from "lucide-react";
import { AtlasLogo } from "@/components/branding/atlas-logo";

/** Entry point for signing in — three distinct doors, each with its own themed sign-in screen. */
export function LoginSelectPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-atlas-indigo/5 via-background to-atlas-emerald/5 px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-9 flex flex-col items-center text-center"
      >
        <AtlasLogo variant="mark" size={48} className="mb-4" />
        <h1 className="text-xl font-extrabold tracking-tight">Welcome to Agentic Trainer</h1>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">Choose how you'd like to sign in.</p>
      </motion.div>

      <div className="grid w-full max-w-[980px] grid-cols-1 gap-5 sm:grid-cols-3">
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          whileHover={{ y: -3 }}
          onClick={() => navigate("/login/sme")}
          className="group flex flex-col items-start rounded-2xl border border-border bg-card p-7 text-left shadow-sm transition-all hover:border-primary/50 hover:shadow-lg"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-atlas-indigo to-atlas-emerald text-white shadow-md">
            <MessagesSquare className="h-6 w-6" />
          </div>
          <h2 className="text-base font-extrabold text-foreground">SME sign-in</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            Upload and tag knowledge, manage the repository, and ask Atlas questions.
          </p>
          <span className="mt-5 flex items-center gap-1.5 text-xs font-bold text-primary">
            Continue <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.09 }}
          whileHover={{ y: -3 }}
          onClick={() => navigate("/login/user")}
          className="group flex flex-col items-start rounded-2xl border border-border bg-card p-7 text-left shadow-sm transition-all hover:border-teal-500/50 hover:shadow-lg"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-md">
            <Users className="h-6 w-6" />
          </div>
          <h2 className="text-base font-extrabold text-foreground">User sign-in</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            Ask Atlas questions and browse conversation history — no repository or upload access.
          </p>
          <span className="mt-5 flex items-center gap-1.5 text-xs font-bold text-teal-600">
            Continue <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.13 }}
          whileHover={{ y: -3 }}
          onClick={() => navigate("/login/admin")}
          className="group flex flex-col items-start rounded-2xl border border-slate-800 bg-slate-950 p-7 text-left shadow-sm transition-all hover:border-slate-600 hover:shadow-lg hover:shadow-slate-950/30"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-emerald-400 shadow-md ring-1 ring-slate-700">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h2 className="text-base font-extrabold text-white">Admin console sign-in</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-400">
            Manage team access, model configuration, agents, pipeline, and analytics.
          </p>
          <span className="mt-5 flex items-center gap-1.5 text-xs font-bold text-emerald-400">
            Continue <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </motion.button>
      </div>
    </div>
  );
}
