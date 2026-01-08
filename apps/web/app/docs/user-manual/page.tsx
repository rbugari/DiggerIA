'use client';

import { Book, CheckCircle2, Info, Rocket, MousePointer2, Settings, Terminal, MessageSquare, Share2 } from 'lucide-react';

export default function UserManualPage() {
    const sections = [
        {
            id: 'get-started',
            icon: Rocket,
            title: '1. Getting Started: Creating a Solution',
            content: 'A Solution is a workspace dedicated to a specific codebase.',
            steps: [
                { label: 'Access the Dashboard', text: 'Click on "Solutions" in the main menu.' },
                { label: 'Add New', text: 'Click the "+ New Solution" button.' },
                { label: 'Configuration', text: 'Enter a descriptive name and provide the local folder path or Git URL.' },
                { label: 'Initialize', text: 'Click "Create" to begin the Ingestion Phase.' }
            ]
        },
        {
            id: 'planning',
            icon: Settings,
            title: '2. The Planning Phase (Review & Approve)',
            content: "DiggerAI doesn't just process everything—it builds a plan for you to review first.",
            steps: [
                { label: 'View Plan', text: 'Once ingestion is complete, click into the solution marked "Ready to Approve".' },
                { label: 'Review Items', text: 'Toggle files to include or exclude and see predicted time/token costs.' },
                { label: 'Approve', text: 'Click "Approve & Execute" once satisfied.' }
            ]
        },
        {
            id: 'graph',
            icon: MousePointer2,
            title: '3. Exploring the Knowledge Graph',
            content: 'Visualize data flows through your system with detailed perspectives.',
            subsections: [
                {
                    title: '3.1 Perspectives: Architect vs. Engineer',
                    text: 'Architect View simplifies to Tables/Databases, while Engineer View shows scripts and transformations.'
                },
                {
                    title: '3.2 Impact Analysis (The "Blast Radius")',
                    text: 'Enable Impact Mode and select a node to instantly highlight all downstream affected assets.'
                }
            ]
        },
        {
            id: 'ai-dive',
            icon: Terminal,
            title: '4. AI Deep Dive & Logic Translation',
            content: 'Deep dive into logic through AI interpretations.',
            items: [
                'AI Summary: Senior Engineer explanation for every node.',
                'Logic Translator: Translate obscure SSIS/SQL into dbt logic.'
            ]
        },
        {
            id: 'chat',
            icon: MessageSquare,
            title: '6. Chatting with your Graph',
            content: 'Ask natural language questions about your lineage.',
            examples: [
                "What tables are modified by the 'LoadDimCustomer' script?",
                "Show me the lineage for the SalesReporting view.",
                "Explain the business logic found in the Finance folder."
            ]
        }
    ];

    return (
        <article className="prose prose-invert max-w-none">
            <header className="mb-16 border-b border-border/30 pb-12">
                <div className="flex items-center gap-4 text-primary mb-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Book size={24} />
                    </div>
                    <span className="text-sm font-bold uppercase tracking-widest font-mono">Documentation // v3.2</span>
                </div>
                <h1 className="text-6xl font-display font-bold italic mb-6">User Manual</h1>
                <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl">
                    Everything you need to know to reverse-engineer your data ecosystem and explore
                    hidden logic with DiggerAI.
                </p>
            </header>

            <div className="space-y-20">
                {sections.map((section) => (
                    <section key={section.id} className="relative">
                        <div className="flex items-start gap-6">
                            <div className="mt-1 p-3 rounded-lg bg-card/40 border border-border/30 text-primary">
                                <section.icon size={24} />
                            </div>
                            <div className="flex-1 space-y-6">
                                <h2 className="text-3xl font-display font-bold mt-0">{section.title}</h2>
                                <p className="text-lg text-muted-foreground">{section.content}</p>

                                {section.steps && (
                                    <div className="grid gap-4 mt-6">
                                        {section.steps.map((step, i) => (
                                            <div key={i} className="flex gap-4 p-4 rounded-xl bg-card/20 border border-border/20 group hover:border-primary/30 transition-colors">
                                                <div className="text-primary font-mono font-bold">{i + 1}</div>
                                                <div>
                                                    <p className="font-bold text-sm mb-1">{step.label}</p>
                                                    <p className="text-sm text-muted-foreground">{step.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {section.subsections && (
                                    <div className="space-y-8 mt-8">
                                        {section.subsections.map((sub, i) => (
                                            <div key={i} className="p-6 rounded-2xl bg-secondary/5 border border-secondary/10 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full blur-3xl group-hover:bg-secondary/10 transition-colors" />
                                                <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                                                    <CheckCircle2 size={18} className="text-secondary" />
                                                    {sub.title}
                                                </h3>
                                                <p className="text-sm text-muted-foreground leading-relaxed italic">{sub.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {section.items && (
                                    <ul className="list-none p-0 space-y-3 mt-6">
                                        {section.items.map((item, i) => (
                                            <li key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                                                <div className="w-1 h-1 rounded-full bg-primary" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {section.examples && (
                                    <div className="mt-8 p-6 rounded-2xl bg-muted/20 border border-border/30">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-4">Example Directives</span>
                                        <div className="space-y-4">
                                            {section.examples.map((ex, i) => (
                                                <div key={i} className="flex items-center gap-4 font-mono text-xs bg-black/40 p-3 rounded border border-border/20">
                                                    <span className="text-primary">&gt;</span>
                                                    <span>{ex}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                ))}
            </div>

            <footer className="mt-32 pt-12 border-t border-border/30 flex items-center justify-between text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                <span>Generated by DiggerAI User Support Engine v3.2</span>
                <div className="flex gap-4">
                    <button className="hover:text-primary transition-colors flex items-center gap-1"><Share2 size={12} /> Share</button>
                    <button className="hover:text-primary transition-colors flex items-center gap-1"><Info size={12} /> Version Details</button>
                </div>
            </footer>
        </article>
    );
}
