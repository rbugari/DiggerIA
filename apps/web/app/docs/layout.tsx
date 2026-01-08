'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Book, FileText, Cpu, ChevronRight, Home as HomeIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModeToggle } from '@/components/mode-toggle';

const docsNav = [
    {
        title: 'User Manual',
        href: '/docs/user-manual',
        icon: Book,
        description: 'Learn how to use DiggerAI'
    },
    {
        title: 'Functional Spec',
        href: '/docs/functional-spec',
        icon: FileText,
        description: 'System capabilities and value'
    },
    {
        title: 'Technical Architecture',
        href: '/docs/technical-architecture',
        icon: Cpu,
        description: 'Internal engine and data flow'
    }
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="flex min-h-screen bg-background">
            {/* Sidebar Navigation */}
            <aside className="w-80 border-r border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 h-screen overflow-y-auto z-20 hidden md:block">
                <div className="p-8">
                    <Link href="/" className="group flex items-center gap-3 mb-10">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <HomeIcon size={20} className="text-primary" />
                        </div>
                        <div>
                            <span className="text-xl font-display font-bold italic block">DiggerAI</span>
                            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Intelligence Repo</span>
                        </div>
                    </Link>

                    <nav className="space-y-2">
                        {docsNav.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex flex-col group p-4 rounded-xl transition-all border border-transparent",
                                        isActive
                                            ? "bg-primary/10 border-primary/20 text-primary shadow-sm"
                                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:border-border/50"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-3">
                                            <Icon size={18} className={cn("transition-colors", isActive ? "text-primary" : "group-hover:text-primary")} />
                                            <span className="font-bold text-sm tracking-tight">{item.title}</span>
                                        </div>
                                        {isActive && <ChevronRight size={14} className="animate-in slide-in-from-left-2 duration-300" />}
                                    </div>
                                    <span className="text-[10px] opacity-60 leading-relaxed pl-7">{item.description}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Footer info */}
                <div className="absolute bottom-8 left-8 right-8">
                    <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 mb-6">
                        <span className="text-[10px] font-bold text-primary uppercase block mb-1">System Status</span>
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            <span className="text-[10px] font-mono text-muted-foreground">v3.5.0-ALPHA // SECURE</span>
                        </div>
                    </div>
                    <ModeToggle />
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 relative">
                {/* Mobile Header */}
                <header className="md:hidden flex items-center justify-between p-4 border-b border-border/50 sticky top-0 bg-background/80 backdrop-blur-md z-30">
                    <Link href="/" className="text-lg font-display font-bold italic">DiggerAI</Link>
                    <ModeToggle />
                </header>

                <div className="max-w-4xl mx-auto px-6 py-12 md:px-12 md:py-20 animate-in fade-in duration-700">
                    {children}
                </div>

                {/* Background Gradients */}
                <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[140px] pointer-events-none -z-10" />
                <div className="fixed bottom-0 left-[20%] w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[140px] pointer-events-none -z-10" />
            </main>
        </div>
    );
}
