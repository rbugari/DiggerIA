'use client';

import Link from 'next/link';
import { ArrowRight, Book, FileText, Cpu, Sparkles } from 'lucide-react';

export default function DocsHomePage() {
    const cards = [
        {
            title: 'User Manual',
            description: 'Step-by-step guide to using DiggerAI, from creating solutions to interpreting AI-translated logic.',
            href: '/docs/user-manual',
            icon: Book,
            color: 'text-orange-500',
            bg: 'bg-orange-500/10'
        },
        {
            title: 'Functional Spec',
            description: 'Understanding the core value, target audience, and key capabilities of the platform.',
            href: '/docs/functional-spec',
            icon: FileText,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10'
        },
        {
            title: 'Technical Arch',
            description: 'Deep dive into the engine, data strategy, and internal orchestration flows.',
            href: '/docs/technical-architecture',
            icon: Cpu,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10'
        }
    ];

    return (
        <div className="space-y-12">
            <header className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
                    <Sparkles size={14} /> Knowledge Repository
                </div>
                <h1 className="text-5xl font-display font-bold italic tracking-tight">Intelligence hub</h1>
                <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                    Complete technical and functional documentation for DiggerAI v3.5.
                    Use the cards below or the sidebar to explore the platform's core intelligence.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                {cards.map((card) => (
                    <Link
                        key={card.href}
                        href={card.href}
                        className="group glass-card p-8 rounded-2xl hover:neon-glow-orange transition-all duration-500 border border-border/50 flex flex-col h-full"
                    >
                        <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                            <card.icon className={card.color} size={24} />
                        </div>
                        <h2 className="text-2xl font-display font-bold mb-4 group-hover:text-primary transition-colors">{card.title}</h2>
                        <p className="text-muted-foreground text-sm leading-relaxed mb-8 flex-1">
                            {card.description}
                        </p>
                        <div className="flex items-center gap-2 text-primary font-bold text-sm">
                            Enter Section <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
