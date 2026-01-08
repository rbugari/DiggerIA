'use client';

import { Cpu, Server, Database, GitBranch, Box, Activity, ShieldCheck, RefreshCw, Terminal } from 'lucide-react';

export default function TechArchPage() {
    const components = [
        {
            title: 'Frontend (Next.js 14)',
            icon: Box,
            desc: 'React Flow engine with Dagre for hierarchical graph rendering. Client-side perspectives for Architect/Engineer views.'
        },
        {
            title: 'API Orchestrator (FastAPI)',
            icon: Server,
            desc: 'Main entry point for orchestration. CatalogManagement, GraphService, and PDF Reporting integration.'
        },
        {
            title: 'Background Worker',
            icon: Terminal,
            desc: 'Heavy lifting pipeline: Ingest, Plan, Execute, Persist, and Audit stages.'
        },
        {
            title: 'ActionRunner (AI)',
            icon: Activity,
            desc: 'Resilient wrapper for LLM interactions with retry logic and fallback chains (OpenRouter/OpenAI).'
        }
    ];

    return (
        <article className="prose prose-invert max-w-none">
            <header className="mb-16 border-b border-border/30 pb-12">
                <div className="flex items-center gap-4 text-purple-500 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                        <Cpu size={24} />
                    </div>
                    <span className="text-sm font-bold uppercase tracking-widest font-mono">System Engine // v3.2</span>
                </div>
                <h1 className="text-6xl font-display font-bold italic mb-6 tracking-tight">Technical Architecture</h1>
                <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl">
                    A decoupled, distributed system designed for scale, resilience, and high-performance
                    AI-driven data analysis.
                </p>
            </header>

            <section className="mb-20">
                <h2 className="text-3xl font-display font-bold mb-10">High-Level Overview</h2>
                <div className="p-8 rounded-3xl bg-black/40 border border-border/50 relative overflow-hidden">
                    {/* Simple representation of the mermaid diagram */}
                    <div className="flex flex-col items-center gap-8 relative z-10">
                        <div className="p-3 px-6 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-bold font-mono">User Browser</div>
                        <div className="w-px h-8 bg-gradient-to-b from-primary/30 to-secondary/30" />
                        <div className="p-4 px-8 rounded-xl border border-secondary/30 bg-secondary/5 text-secondary text-sm font-bold">Next.js Frontend</div>
                        <div className="w-px h-8 bg-gradient-to-b from-secondary/30 to-purple-500/30" />
                        <div className="p-4 px-10 rounded-xl border border-border bg-card/50 text-foreground text-sm font-bold shadow-xl">FastAPI Orchestrator</div>

                        <div className="grid grid-cols-2 gap-12 w-full mt-4">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                                    <Database size={16} className="text-blue-500" />
                                    <span className="text-[10px] font-mono">Supabase (PostgreSQL)</span>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                                    <GitBranch size={16} className="text-purple-500" />
                                    <span className="text-[10px] font-mono">Neo4j (Knowledge Graph)</span>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                                    <Terminal size={16} className="text-orange-500" />
                                    <span className="text-[10px] font-mono">Python Worker</span>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                                    <Activity size={16} className="text-green-500" />
                                    <span className="text-[10px] font-mono">LLM (OpenRouter/Groq)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[100px]" />
                </div>
            </section>

            <section className="mb-20">
                <h2 className="text-3xl font-display font-bold mb-10">Core Components</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {components.map((comp, i) => (
                        <div key={i} className="p-8 rounded-2xl bg-card/20 border border-border/30 hover:bg-card/30 transition-all flex flex-col">
                            <comp.icon className="text-primary mb-6" size={28} />
                            <h3 className="text-xl font-bold mb-4">{comp.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed flex-1">{comp.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mb-20">
                <h2 className="text-3xl font-display font-bold mb-10">Data Strategy</h2>
                <div className="space-y-6">
                    <div className="p-6 rounded-2xl bg-muted/10 border border-border/20">
                        <div className="flex items-center gap-3 mb-4">
                            <ShieldCheck size={20} className="text-blue-500" />
                            <h3 className="text-xl font-display font-bold">The Source of Truth (Supabase)</h3>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            All transactional and relational data is stored in Supabase. This includes the hierarchy,
                            extracted assets, and source code evidence linked for full auditability.
                        </p>
                    </div>
                    <div className="p-6 rounded-2xl bg-muted/10 border border-border/20">
                        <div className="flex items-center gap-3 mb-4">
                            <RefreshCw size={20} className="text-purple-500" />
                            <h3 className="text-xl font-display font-bold">The Visual Projection (Neo4j)</h3>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Neo4j is used purely for graph-based traversal and visualization. Data is synchronized
                            from Supabase after each extraction to ensure the high-performance graph view is always accurate.
                        </p>
                    </div>
                </div>
            </section>

            <footer className="mt-32 pt-12 border-t border-border/30 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                <span>Generated by DiggerAI Technical Documentation Engine v3.2</span>
            </footer>
        </article>
    );
}
