'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef
} from '@tanstack/react-table';
import { Loader2, Search, Filter, Database, FileText, Activity, Table, Code, Box, Layers } from 'lucide-react';
import Link from 'next/link';

// Color Mapping (Matches Graph View)
const NODE_COLORS: Record<string, { bg: string, border: string, text: string }> = {
  'PIPELINE': { bg: 'var(--node-pipeline-bg)', border: 'var(--node-pipeline-border)', text: 'var(--node-text)' },
  'PROCESS': { bg: 'var(--node-pipeline-bg)', border: 'var(--node-pipeline-border)', text: 'var(--node-text)' },
  'ACTIVITY': { bg: 'var(--node-pipeline-bg)', border: 'var(--node-pipeline-border)', text: 'var(--node-text)' },
  'TASK': { bg: 'var(--node-pipeline-bg)', border: 'var(--node-pipeline-border)', text: 'var(--node-text)' },
  'SCRIPT': { bg: 'var(--node-script-bg)', border: 'var(--node-script-border)', text: 'var(--node-text)' },
  'PROCEDURE': { bg: 'var(--node-script-bg)', border: 'var(--node-script-border)', text: 'var(--node-text)' },
  'CODE': { bg: 'var(--node-script-bg)', border: 'var(--node-script-border)', text: 'var(--node-text)' },
  'FILE': { bg: 'var(--node-script-bg)', border: 'var(--node-script-border)', text: 'var(--node-text)' },
  'DOC': { bg: 'var(--node-script-bg)', border: 'var(--node-script-border)', text: 'var(--node-text)' },
  'TABLE': { bg: 'var(--node-table-bg)', border: 'var(--node-table-border)', text: 'var(--node-text)' },
  'VIEW': { bg: 'var(--node-table-bg)', border: 'var(--node-table-border)', text: 'var(--node-text)' },
  'TRANSFORM': { bg: 'var(--node-table-bg)', border: 'var(--node-table-border)', text: 'var(--node-text)' },
  'DATABASE': { bg: 'var(--node-db-bg)', border: 'var(--node-db-border)', text: 'var(--node-text)' },
  'PACKAGE': { bg: 'var(--node-package-bg)', border: 'var(--node-package-border)', text: 'var(--node-text)' },
  'CONTAINER': { bg: 'var(--node-package-bg)', border: 'var(--node-package-border)', text: 'var(--node-text)' },
  'DEFAULT': { bg: 'var(--node-default-bg)', border: 'var(--node-default-border)', text: 'var(--node-text)' }
};

interface CatalogPageProps {
  params: {
    id: string;
  };
}

export default function CatalogPage({ params }: CatalogPageProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 50,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [details, setDetails] = useState<any>(null);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const [assetsRes, statsRes] = await Promise.all([
        axios.get(`${apiUrl}/solutions/${params.id}/assets`, {
          params: {
            type: filterType,
            search: search,
            limit: pagination.pageSize,
            offset: pagination.pageIndex * pagination.pageSize
          }
        }),
        axios.get(`${apiUrl}/solutions/${params.id}/stats`)
      ]);

      setData(assetsRes.data.data || []);
      setTotalCount(assetsRes.data.count || 0);

      if (statsRes.data.asset_types) {
        setAvailableTypes(Object.keys(statsRes.data.asset_types).sort());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [filterType, search, pagination.pageIndex, pagination.pageSize]);

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'asset_type',
      header: 'Type',
      cell: info => {
        const val = (info.getValue() as string).toUpperCase();
        const colors = NODE_COLORS[val] || NODE_COLORS['DEFAULT'];

        let Icon = FileText;
        if (['TABLE', 'VIEW', 'DATABASE'].includes(val)) Icon = Table;
        if (['PIPELINE', 'PROCESS', 'ACTIVITY', 'TASK', 'TRANSFORM'].includes(val)) Icon = Activity;
        if (['SCRIPT', 'PROCEDURE', 'CODE'].includes(val)) Icon = Code;
        if (['PACKAGE', 'CONTAINER', 'BOX'].includes(val)) Icon = Box;
        if (['FILE', 'DOC', 'SINK', 'SOURCE'].includes(val)) Icon = FileText;

        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border"
            style={{
              backgroundColor: colors.bg,
              borderColor: colors.border,
              color: colors.text
            }}
          >
            <Icon size={12} />
            {val}
          </span>
        );
      }
    },
    {
      accessorKey: 'name_display',
      header: 'Name',
      cell: info => <span className="font-semibold text-foreground">{info.getValue() as string}</span>
    },
    {
      accessorKey: 'system',
      header: 'System',
      cell: info => (
        <span className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
          {info.getValue() as string || 'N/A'}
        </span>
      )
    },
    {
      accessorKey: 'created_at',
      header: 'Discovered',
      cell: info => <span className="text-muted-foreground text-xs">{new Date(info.getValue() as string).toLocaleDateString()}</span>
    }
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalCount / pagination.pageSize),
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
  });

  const handleRowClick = async (asset: any) => {
    setSelectedAsset(asset);
    setDetailsLoading(true);
    setDetails(null);
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/assets/${asset.asset_id}/details`);
      setDetails(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Main Content: Table */}
      <div className={`flex-1 p-6 overflow-hidden flex flex-col ${selectedAsset ? 'w-2/3' : 'w-full'}`}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Link href={`/solutions/${params.id}`} className="text-gray-500 hover:text-gray-900">&larr; Back to Graph</Link>
            <h1 className="text-2xl font-bold">Asset Catalog</h1>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search assets..."
                className="pl-9 h-9 w-[200px] lg:w-[300px] rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="h-9 rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none"
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setPagination(prev => ({ ...prev, pageIndex: 0 }));
              }}
            >
              <option value="ALL">All Types</option>
              {availableTypes.map(type => (
                <option key={type} value={type}>{type.charAt(0) + type.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="border border-border/50 rounded-xl flex-1 overflow-auto bg-card/30 backdrop-blur-sm shadow-2xl relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 pointer-events-none" />
          <table className="w-full text-sm text-left relative z-10">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50 sticky top-0 backdrop-blur-md">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="px-6 py-3 font-medium">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-10">
                    <Loader2 className="animate-spin inline mr-2" /> Loading...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-10 text-gray-500">
                    No assets found.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => {
                  const assetType = (row.original.asset_type || 'DEFAULT').toUpperCase();
                  const colors = NODE_COLORS[assetType] || NODE_COLORS['DEFAULT'];

                  return (
                    <tr
                      key={row.id}
                      onClick={() => handleRowClick(row.original)}
                      className={`border-b border-border/20 hover:bg-primary/5 dark:hover:bg-primary/10 cursor-pointer transition-all duration-200 group/row ${selectedAsset?.asset_id === row.original.asset_id ? 'bg-primary/10 dark:bg-primary/20 shadow-[inset_0_0_10px_rgba(255,107,0,0.05)]' : ''}`}
                      style={{ borderLeft: `4px solid ${colors.border}` }}
                    >
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-6 py-4 whitespace-nowrap group-hover/row:translate-x-1 transition-transform">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-end gap-2 py-4">
          <span className="text-sm text-gray-500">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <button
            className="border rounded px-2 py-1 text-sm disabled:opacity-50"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </button>
          <button
            className="border rounded px-2 py-1 text-sm disabled:opacity-50"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </button>
        </div>
      </div>

      {/* Side Panel: Details */}
      {selectedAsset && (
        <div className="w-1/3 border-l border-border/50 bg-card/60 backdrop-blur-xl overflow-y-auto p-6 shadow-[-20px_0_30px_rgba(0,0,0,0.3)] z-10 animate-in slide-in-from-right duration-300">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent break-words w-full">{selectedAsset.name_display}</h2>
            <button onClick={() => setSelectedAsset(null)} className="text-muted-foreground hover:text-foreground transition-colors text-2xl">
              &times;
            </button>
          </div>

          {detailsLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
          ) : details ? (
            <div className="space-y-6">
              {/* Attributes */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 opacity-70">Attributes</h3>
                <div className="bg-card/40 border border-border/30 p-4 rounded-lg text-sm space-y-2 group/attr relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 opacity-0 group-hover/attr:opacity-100 transition-opacity" />
                  <div className="flex justify-between relative z-10">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-mono text-primary">{selectedAsset.asset_type}</span>
                  </div>
                  <div className="flex justify-between relative z-10">
                    <span className="text-muted-foreground">System:</span>
                    <span className="font-mono text-secondary">{selectedAsset.system || 'Unknown'}</span>
                  </div>
                  {/* Dynamic Tags */}
                  {selectedAsset.tags && Object.entries(selectedAsset.tags).map(([k, v]) => (
                    <div key={k} className="flex justify-between relative z-10">
                      <span className="text-muted-foreground capitalize">{k}:</span>
                      <span className="font-medium truncate max-w-[200px]" title={String(v)}>{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Relationships */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Relationships</h3>

                {details.outgoing_edges?.length > 0 && (
                  <div className="mb-6">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2 block">Outgoing (Depends On / Writes To)</span>
                    <ul className="space-y-2">
                      {details.outgoing_edges.map((edge: any) => (
                        <li key={edge.edge_id} className="text-sm border border-border/20 p-3 rounded-lg bg-card/20 hover:border-primary/50 transition-all flex justify-between items-center group">
                          <div className="flex items-center gap-2">
                            <span className="text-primary text-xs font-mono opacity-50">--[{edge.edge_type}]--&gt;</span>
                            <span className="font-medium group-hover:text-primary transition-colors">{edge.to_asset.name_display}</span>
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${edge.confidence > 0.7 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {Math.round(edge.confidence * 100)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {details.incoming_edges?.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-2 block">Incoming (Used By)</span>
                    <ul className="space-y-2">
                      {details.incoming_edges.map((edge: any) => (
                        <li key={edge.edge_id} className="text-sm border border-border/20 p-3 rounded-lg bg-card/20 hover:border-secondary/50 transition-all flex justify-between items-center group">
                          <div className="flex items-center gap-2">
                            <span className="font-medium group-hover:text-secondary transition-colors">{edge.from_asset.name_display}</span>
                            <span className="text-secondary text-xs font-mono opacity-50">--[{edge.edge_type}]--&gt;</span>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${edge.confidence > 0.7 ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'}`}>
                            {Math.round(edge.confidence * 100)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(!details.outgoing_edges?.length && !details.incoming_edges?.length) && (
                  <p className="text-sm text-gray-400 italic">No relationships found.</p>
                )}
              </div>

              {/* Evidence */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Evidence & Lineage</h3>
                {details.evidences?.length > 0 ? (
                  <div className="space-y-4">
                    {details.evidences.map((item: any) => (
                      <div key={item.evidence.evidence_id} className="border border-border/30 rounded-lg p-4 bg-card/40 relative overflow-hidden group/ev transition-all hover:border-primary/30">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] font-bold font-mono bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full uppercase">{item.evidence.kind}</span>
                          <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[150px]">{item.evidence.file_path.split('/').pop()}</span>
                        </div>
                        {item.evidence.snippet && (
                          <pre className="text-[11px] overflow-x-auto bg-black/40 border border-white/5 p-3 rounded-md text-green-400 font-mono leading-relaxed whitespace-pre-wrap selection:bg-primary/30">
                            {item.evidence.snippet}
                          </pre>
                        )}
                        {item.evidence.locator && (
                          <div className="mt-2 text-[10px] text-muted-foreground font-mono opacity-50">
                            Line Range: {item.evidence.locator.line_start} — {item.evidence.locator.line_end}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No direct evidence snippets linked.</p>
                )}
              </div>

            </div>
          ) : (
            <p className="text-red-500">Failed to load details.</p>
          )}
        </div>
      )}
    </div>
  );
}