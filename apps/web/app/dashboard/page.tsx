'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Plus, Loader2, Trash2, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { ModeToggle } from '@/components/mode-toggle';

interface Solution {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const [stats, setStats] = useState<Record<string, any>>({});

  async function fetchSolutions() {
    const { data, error } = await supabase
      .from('solutions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching solutions:', error);
    } else {
      setSolutions(data || []);
      if (data) {
        data.forEach(sol => fetchStats(sol.id));
      }
    }
    setLoading(false);
  }

  async function fetchStats(solutionId: string) {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/solutions/${solutionId}/stats`);
      setStats(prev => ({ ...prev, [solutionId]: res.data }));
    } catch (e) {
      console.error(`Failed to fetch stats for ${solutionId}`, e);
    }
  }

  useEffect(() => {
    fetchSolutions();

    const interval = setInterval(() => {
      setSolutions(prev => {
        const hasProcessing = prev.some(s => s.status === 'PROCESSING' || s.status === 'QUEUED');
        if (hasProcessing) {
          prev.forEach(sol => fetchStats(sol.id));
          fetchSolutions();
        }
        return prev;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this solution?")) return;

    setProcessingId(id);
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/solutions/${id}`;
      await axios.delete(apiUrl);
      setSolutions(prev => prev.filter(s => s.id !== id));
      setStats(prev => {
        const newStats = { ...prev };
        delete newStats[id];
        return newStats;
      });
    } catch (error) {
      console.error("Delete failed", error);
      alert("Failed to delete solution. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReanalyze = async (id: string, mode: 'full' | 'update') => {
    if (mode === 'full') {
      if (!confirm("Are you sure? This will DELETE all existing data for this solution.")) return;
    }

    setProcessingId(id);
    setMenuOpen(null);
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/solutions/${id}/analyze`, {
        mode: mode
      });
      alert(`Analysis started in ${mode.toUpperCase()} mode. Status will update shortly.`);
      fetchSolutions();
    } catch (error) {
      console.error("Re-analyze failed", error);
      alert("Failed to restart analysis");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="p-10 bg-background min-h-screen relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-primary/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="flex items-center justify-between mb-10 relative z-10">
        <h1 className="text-4xl font-display font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent italic">Solutions</h1>
        <div className="flex items-center gap-4">
          <ModeToggle />
          <Link
            href="/solutions/new"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm font-bold"
          >
            <Plus size={16} />
            New Solution
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center mt-20">
          <Loader2 className="animate-spin text-muted-foreground" size={48} />
        </div>
      ) : solutions.length === 0 ? (
        <div className="text-center mt-20 text-muted-foreground">
          <p className="text-xl mb-4 font-medium">No solutions found.</p>
          <p>Create your first solution to start discovering your data lineage.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
          {solutions.map((sol) => (
            <div key={sol.id} className="glass-card p-8 rounded-2xl hover:neon-glow-orange transition-all duration-500 group relative">
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(menuOpen === sol.id ? null : sol.id)}
                    disabled={!!processingId}
                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-secondary rounded-md transition-colors"
                    title="Re-analyze Options"
                  >
                    <RefreshCw size={16} className={processingId === sol.id ? 'animate-spin' : ''} />
                  </button>

                  {menuOpen === sol.id && (
                    <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-md shadow-lg z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      <button
                        onClick={() => handleReanalyze(sol.id, 'update')}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors"
                      >
                        Incremental Update
                      </button>
                      <button
                        onClick={() => handleReanalyze(sol.id, 'full')}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-destructive hover:text-destructive-foreground transition-colors border-t border-border"
                      >
                        Full Reprocess (Clean)
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(sol.id)}
                  disabled={!!processingId}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <h2 className="text-2xl font-display font-bold mb-3 tracking-tight group-hover:text-primary transition-colors italic">{sol.name}</h2>

              <div className="flex items-center gap-2 mb-4">
                {stats[sol.id]?.active_job?.status === 'planning_ready' ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold border bg-primary/10 text-primary border-primary/30 animate-pulse">
                    Ready to Approve
                  </span>
                ) : (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold border
                    ${sol.status === 'READY' ? 'bg-green-500/10 text-green-500 border-green-500/30' :
                      sol.status === 'PROCESSING' ? 'bg-secondary/10 text-secondary border-secondary/30 shadow-[0_0_10px_rgba(161,84,255,0.1)]' :
                        'bg-muted text-muted-foreground border-border'}`}>
                    {sol.status}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {stats[sol.id]?.last_run ?
                    new Date(stats[sol.id].last_run).toLocaleString() :
                    new Date(sol.created_at).toLocaleDateString()}
                </span>
              </div>

              {/* Active Job Progress Section */}
              {((sol.status === 'PROCESSING' || sol.status === 'QUEUED') || (stats[sol.id]?.active_job?.status === 'planning_ready')) && stats[sol.id]?.active_job && (
                <div className="mb-4 bg-secondary/5 p-3 rounded-lg border border-secondary/20 backdrop-blur-sm">
                  <div className="flex justify-between text-xs font-bold text-secondary mb-1 uppercase tracking-wider">
                    <span>
                      {stats[sol.id].active_job.status === 'planning_ready' ? 'Evaluating Plan - Action Required' :
                        stats[sol.id].active_job.current_stage === 'planning' ? 'Generating Execution Plan...' :
                          sol.status === 'QUEUED' ? 'Waiting in queue...' : 'Analyzing...'}
                    </span>
                    <span>{stats[sol.id].active_job.progress_pct}%</span>
                  </div>

                  {/* Progress Bar or Action Button */}
                  {stats[sol.id].active_job.status === 'planning_ready' ? (
                    <div className="mt-2">
                      <Link
                        href={`/solutions/${sol.id}/plan`}
                        className="btn-pill w-full block text-center bg-primary text-primary-foreground text-xs font-bold py-2 shadow-lg neon-glow-orange"
                      >
                        Review Evolution Plan
                      </Link>
                    </div>
                  ) : (
                    <div className="w-full bg-secondary/20 rounded-full h-1.5 mb-2 overflow-hidden border border-secondary/10">
                      <div
                        className="bg-secondary h-1.5 rounded-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(161,84,255,0.5)]"
                        style={{ width: `${stats[sol.id].active_job.progress_pct}%` }}
                      ></div>
                    </div>
                  )}

                  {/* Detailed Stats */}
                  {stats[sol.id].active_job.error_details && stats[sol.id].active_job.error_details.total_files > 0 && (
                    <div className="text-[10px] text-muted-foreground/80 truncate font-mono">
                      {stats[sol.id].active_job.error_details.processed_files}/{stats[sol.id].active_job.error_details.total_files} files
                      {stats[sol.id].active_job.error_details.current_file && (
                        <span className="block truncate mt-0.5 opacity-75">
                          → {stats[sol.id].active_job.error_details.current_file}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Stats Section */}
              {sol.status === 'READY' && stats[sol.id] && (
                <div className="mb-4 grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="bg-muted/50 p-2 rounded border border-border/50">
                    <div className="font-bold text-foreground">{stats[sol.id].total_assets}</div>
                    <div className="text-xs text-muted-foreground">Assets</div>
                  </div>
                  <div className="bg-muted/50 p-2 rounded border border-border/50">
                    <div className="font-bold text-foreground">{stats[sol.id].total_edges}</div>
                    <div className="text-xs text-muted-foreground">Rels</div>
                  </div>
                  <div className="bg-muted/50 p-2 rounded border border-border/50">
                    <div className="font-bold text-foreground">{stats[sol.id].pipelines || 0}</div>
                    <div className="text-xs text-muted-foreground">Pipelines</div>
                  </div>
                </div>
              )}

              <Link
                href={`/solutions/${sol.id}`}
                prefetch={false}
                className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                View Graph &rarr;
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}