'use client';

import { FileText, Target, Zap, Shield, BarChart3, Users, CheckCircle2, Layout, Search, Layers } from 'lucide-react';

export default function FunctionalSpecPage() {
    const valueProps = [
        {
            title: 'Accelerate Cloud Migrations',
            text: 'Reduce the Assessment phase by 40-60%.',
            icon: Zap,
            color: 'text-orange-500'
        },
        {
            title: 'Deep Logic Extraction',
            text: 'Translate legacy SSIS/SQL into modern dbt.',
            icon: Search,
            color: 'text-blue-500'
        },
        {
            title: 'Impact Analysis',
            text: 'Zero-downtime visualization of change impact.',
            icon: Target,
            color: 'text-purple-500'
        },
        {
            title: 'Automate Documentation',
            text: 'Replace manual docs with AI-generated audits.',
            icon: FileText,
            color: 'text-green-500'
        }
    ];

    const features = [
        {
            title: 'Hierarchical Lineage Graph',
            desc: 'Complex packages rendered as nested containers with drill-down capability.',
            icon: Layers
        },
        {
            title: 'Persona-Based Perspectives',
            desc: 'Architect View for maps, Engineer View for circuit-level logic.',
            icon: Users
        },
        {
            title: 'Visual Impact Analysis',
            desc: 'Select any node to instantly see the downstream "blast radius".',
            icon: BarChart3
        },
        {
            title: 'AI-Powered Deep Metadata',
            desc: 'Senior Engineer summaries and field-level trace automation.',
            icon: Shield
        }
    ];

    return (
        <article className="prose prose-invert max-w-none">
            <header className="mb-16 border-b border-border/30 pb-12">
                <div className="flex items-center gap-4 text-secondary mb-6">
                    <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center border border-secondary/20">
                        <FileText size={24} />
                    </div>
                    <span className="text-sm font-bold uppercase tracking-widest font-mono">Core Spec // v3.2</span>
                </div>
                <h1 className="text-6xl font-display font-bold italic mb-6 tracking-tight">Functional Specification</h1>
                <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl">
                    Addressing "Data Knowledge Debt" by transforming opaque legacy systems into
                    interactive, navigable intelligence.
                </p>
            </header>

            <section className="mb-20">
                <h2 className="text-3xl font-display font-bold mb-10 flex items-center gap-3">
                    <Target className="text-primary" />
                    Business Value Proposition
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {valueProps.map((prop, i) => (
                        <div key={i} className="p-8 rounded-2xl bg-card/30 border border-border/30 hover:border-primary/40 transition-all group overflow-hidden relative">
                            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                            <prop.icon className={`mb-6 ${prop.color}`} size={32} />
                            <h3 className="text-xl font-bold mb-3">{prop.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">{prop.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mb-20">
                <h2 className="text-3xl font-display font-bold mb-10 flex items-center gap-3">
                    <Layout className="text-secondary" />
                    Key Platform Features
                </h2>
                <div className="space-y-4">
                    {features.map((feature, i) => (
                        <div key={i} className="flex items-center gap-6 p-6 rounded-2xl bg-muted/10 border border-border/20 hover:bg-muted/20 transition-all">
                            <div className="w-12 h-12 rounded-lg bg-background flex items-center justify-center border border-border/50 text-secondary shrink-0 shadow-sm">
                                <feature.icon size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold mb-1">{feature.title}</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed italic">{feature.desc}</p>
                            </div>
                            <div className="ml-auto hidden sm:block">
                                <CheckCircle2 size={16} className="text-green-500/50" />
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mb-20">
                <h2 className="text-3xl font-display font-bold mb-10">Target Audience</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { label: 'Architects', desc: 'Migration planning & impact analysis.' },
                        { label: 'Engineers', desc: 'Deconstruct pipelines & field-level audits.' },
                        { label: 'Governance', desc: 'Automated cataloging & auditable lineage.' }
                    ].map((role, i) => (
                        <div key={i} className="text-center p-6 rounded-xl border border-dashed border-border/50">
                            <span className="block font-bold text-primary mb-2 uppercase tracking-widest text-xs">{role.label}</span>
                            <p className="text-xs text-muted-foreground leading-relaxed">{role.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            <footer className="mt-32 pt-12 border-t border-border/30 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                <span>Generated by DiggerAI Functional Logic Engine v3.2</span>
            </footer>
        </article>
    );
}
