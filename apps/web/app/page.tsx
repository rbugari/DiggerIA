import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-background relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="text-center max-w-3xl relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <Sparkles size={14} /> Next Gen Legacy Discovery
        </div>

        <h1 className="text-7xl font-display font-bold tracking-tight mb-8">
          Digger<span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">AI</span>
        </h1>

        <p className="text-xl text-muted-foreground mb-12 leading-relaxed">
          The ultimate command center for Data Lineage & Engineering.
          Discover, map, and optimize your legacy pipelines with futuristic speed.
        </p>

        <div className="flex gap-6 justify-center">
          <Link
            href="/dashboard"
            className="btn-pill bg-primary text-primary-foreground flex items-center gap-2 neon-glow-orange group"
          >
            Launch Console <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/docs"
            className="btn-pill bg-card/60 backdrop-blur-md border border-border/50 text-foreground hover:bg-card/80 transition-all flex items-center gap-2"
          >
            Intelligence Repo
          </Link>
        </div>
      </div>

      {/* Bottom status line */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground/50 uppercase tracking-[0.3em]">
          <span>System Online</span>
          <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
          <span>v3.5.0-ALPHA</span>
        </div>
      </div>
    </main>
  );
}