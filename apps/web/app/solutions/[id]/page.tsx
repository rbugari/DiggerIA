'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, RefreshCw, X, FileText, Database, Table, Download, ArrowRightLeft, LayoutGrid, Network, Filter, Settings, Map, ArrowDown, ArrowRight, Focus, Minimize2, CircleDot, Code, Sparkles, Terminal } from 'lucide-react';
import ReactFlow, {
    Node,
    Edge,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    MarkerType,
    useReactFlow,
    ReactFlowProvider,
    MiniMap,
    Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { DeepTransformNode, DeepTableNode, PackageGroupNode } from '@/components/CustomNodes';

// Define Node Types outside component
const nodeTypes = {
    deepTransform: DeepTransformNode,
    deepTable: DeepTableNode,
    packageGroup: PackageGroupNode,
};

import axios from 'axios';
import dagre from 'dagre';
import { useTheme } from 'next-themes';
import { ChatAssistant } from '@/components/ChatAssistant';
import CatalogPage from './catalog/page';
import { ModeToggle } from '@/components/mode-toggle';
import { cn } from '@/lib/utils';
import { MessageSquare } from 'lucide-react';

interface PageProps {
    params: {
        id: string;
    };
}

// ... (getLayoutedElements function remains the same) ...

// Color Mapping using CSS Variables
const NODE_COLORS: Record<string, { bg: string, border: string }> = {
    'PIPELINE': { bg: 'var(--node-pipeline-bg)', border: 'var(--node-pipeline-border)' },
    'PROCESS': { bg: 'var(--node-pipeline-bg)', border: 'var(--node-pipeline-border)' },
    'SCRIPT': { bg: 'var(--node-script-bg)', border: 'var(--node-script-border)' },
    'FILE': { bg: 'var(--node-script-bg)', border: 'var(--node-script-border)' },
    'TABLE': { bg: 'var(--node-table-bg)', border: 'var(--node-table-border)' },
    'VIEW': { bg: 'var(--node-table-bg)', border: 'var(--node-table-border)' },
    'DATABASE': { bg: 'var(--node-db-bg)', border: 'var(--node-db-border)' },
    'PACKAGE': { bg: 'var(--node-package-bg)', border: 'var(--node-package-border)' },
    'CONTAINER': { bg: 'rgba(100, 116, 139, 0.05)', border: 'var(--border)' },
    'DEFAULT': { bg: 'var(--node-default-bg)', border: 'var(--node-default-border)' }
};

const getCircularLayout = (nodes: Node[], edges: Edge[]) => {
    const centerX = 0;
    const centerY = 0;
    const radius = Math.max(nodes.length * 30, 300); // Dynamic radius based on node count
    const angleStep = (2 * Math.PI) / nodes.length;

    const layoutedNodes = nodes.map((node, index) => {
        const angle = index * angleStep;
        return {
            ...node,
            position: {
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle),
            },
        };
    });

    return { nodes: layoutedNodes, edges };
};

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
    if (direction === 'CIRCULAR') {
        return getCircularLayout(nodes, edges);
    }

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    // Standard sizes
    const nodeWidth = 220;
    const nodeHeight = 80;
    const groupWidth = 600;  // Default for packages
    const groupHeight = 400;

    dagreGraph.setGraph({ rankdir: direction });

    // 1. Add nodes to Dagre
    nodes.forEach((node) => {
        const isGroup = node.type === 'group';
        dagreGraph.setNode(node.id, {
            width: isGroup ? groupWidth : nodeWidth,
            height: isGroup ? groupHeight : nodeHeight
        });
    });

    // 2. Add edges to Dagre
    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    // 3. Map Dagre positions back to React Flow
    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        const isGroup = node.type === 'group';

        node.targetPosition = direction === 'LR' ? Position.Left : Position.Top;
        node.sourcePosition = direction === 'LR' ? Position.Right : Position.Bottom;

        let x = nodeWithPosition.x - (isGroup ? groupWidth : nodeWidth) / 2;
        let y = nodeWithPosition.y - (isGroup ? groupHeight : nodeHeight) / 2;

        // If it's a nested node (child of a package)
        if (node.parentNode) {
            const parentNode = dagreGraph.node(node.parentNode);
            if (parentNode) {
                // React Flow expects child positions to be relative to the parent's top-left corner
                const parentX = parentNode.x - groupWidth / 2;
                const parentY = parentNode.y - groupHeight / 2;
                x = x - parentX;
                y = y - parentY;
            }
        }

        node.position = { x, y };

        return node;
    });

    return { nodes: layoutedNodes, edges };
};



function GraphContent({ id, solution }: { id: string, solution: any }) {
    const { theme } = useTheme();
    const [graphLoading, setGraphLoading] = useState(true);
    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [nodeTypesFilter, setNodeTypesFilter] = useState<Record<string, boolean>>({
        'TABLE': true,
        'VIEW': true,
        'PIPELINE': true,
        'PROCESS': true,
        'SCRIPT': true,
        'FILE': true,
        'DATABASE': true,
        'PACKAGE': true
    });

    // Raw Graph Data (Store full graph to allow filtering/restoring)
    const [rawGraph, setRawGraph] = useState<{ nodes: Node[], edges: Edge[] }>({ nodes: [], edges: [] });

    // ReactFlow State
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const { fitView } = useReactFlow();

    // Layout Controls
    const [layoutDirection, setLayoutDirection] = useState<'LR' | 'TB' | 'CIRCULAR'>('LR');
    const [showMinimap, setShowMinimap] = useState(true);
    const [perspective, setPerspective] = useState<'ARCHITECT' | 'ENGINEER'>('ENGINEER');
    const [impactMode, setImpactMode] = useState(false);
    const [impactNodes, setImpactNodes] = useState<Set<string>>(new Set());
    const [focusPackageId, setFocusPackageId] = useState<string | null>(null);
    const [isSwitchingPerspective, setIsSwitchingPerspective] = useState(false);

    // Logic Translation State
    const [translations, setTranslations] = useState<Record<string, { sql: string, explanation: string }>>({});
    const [isTranslating, setIsTranslating] = useState<string | null>(null);

    const handleTranslate = async (columnName: string, expression: string) => {
        if (!selectedNode) return;
        const key = `${selectedNode.id}-${columnName}`;
        setIsTranslating(key);
        try {
            const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/solutions/${id}/translate-logic`, {
                column_name: columnName,
                expression_raw: expression,
                node_name: selectedNode.data.label || selectedNode.id,
                source_system: "SSIS"
            });
            setTranslations(prev => ({
                ...prev,
                [key]: res.data
            }));
        } catch (err) {
            console.error("Translation failed:", err);
        } finally {
            setIsTranslating(null);
        }
    };

    const handleDownloadReport = async () => {
        try {
            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/solutions/${id}/report`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `DiggerAI_Report_${solution.name.replace(/\s+/g, '_')}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error downloading report:", error);
            alert("Failed to download report. Please check if the backend is running and the solution is valid.");
        }
    };

    // 1. Fetch Graph Data
    const fetchGraph = useCallback(async () => {
        setGraphLoading(true);
        try {
            const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/solutions/${id}/graph`;
            const response = await axios.get(apiUrl);
            const { nodes: rawNodes, edges: rawEdges } = response.data;

            // Sort nodes so parents come before children
            const sortedRawNodes = [...rawNodes].sort((a, b) => {
                if (a.data?.parentId && !b.data?.parentId) return 1;
                if (!a.data?.parentId && b.data?.parentId) return -1;
                return 0;
            });

            // Transform nodes for ReactFlow (Initial processing)
            const initialNodes: Node[] = sortedRawNodes.map((n: any) => {
                const normalizedType = (n.data.type || 'FILE').toUpperCase();
                n.data.type = normalizedType;

                const colors = NODE_COLORS[normalizedType] || NODE_COLORS['DEFAULT'];

                // Choose Node Type
                let type = 'default'; // ReactFlow default
                if (normalizedType === 'TRANSFORM') type = 'deepTransform';
                if (['SOURCE', 'SINK', 'TABLE', 'VIEW'].includes(normalizedType)) type = 'deepTable';
                if (normalizedType === 'CONTAINER' || normalizedType === 'PACKAGE') type = 'packageGroup';

                return {
                    id: n.id,
                    type: type, // Use our custom type
                    position: { x: 0, y: 0 },
                    parentNode: n.data.parentId,
                    extent: n.data.parentId ? 'parent' : undefined,
                    data: { ...n.data, fullData: n, label: n.data.label || n.data.name || n.id }, // Correctly prioritize labels
                    style: type === 'packageGroup' ? {
                        width: 600,
                        height: 400,
                        background: 'transparent',
                        border: 'none',
                    } : (type === 'default' ? {
                        background: colors.bg,
                        border: `2px solid ${colors.border}`,
                        borderRadius: '8px',
                        padding: '12px',
                        width: 220,
                        fontSize: '12px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        color: '#000',
                        fontWeight: '500'
                    } : undefined), // Custom nodes handle their own style
                };
            });

            const initialEdges: Edge[] = rawEdges.map((e: any) => ({
                id: e.id,
                source: e.source,
                target: e.target,
                label: e.label,
                type: 'smoothstep',
                markerEnd: { type: MarkerType.ArrowClosed },
                animated: true,
                style: { stroke: '#64748b', strokeWidth: 1.5 }
            }));

            setRawGraph({ nodes: initialNodes, edges: initialEdges });

        } catch (error) {
            console.error("Error fetching graph:", error);
            alert("Failed to load graph data. Check console for details.");
        } finally {
            setGraphLoading(false);
        }
    }, [id]);

    // 2. Process & Filter Graph (Runs when raw data, filters, focus, or layout changes)
    useEffect(() => {
        if (rawGraph.nodes.length === 0) return;

        let filteredNodes = rawGraph.nodes;
        let filteredEdges = rawGraph.edges;

        // A. Apply Perspective Filtering
        if (perspective === 'ARCHITECT') {
            // Architect persona should ONLY see high-level data assets
            // Technical processes, scripts, and transformations are considered "Engineer Detail"
            const technicalAndProcessTypes = [
                'TRANSFORM', 'SCRIPT', 'FILE', 'SOURCE', 'SINK',
                'PIPELINE', 'PROCESS', 'PACKAGE', 'CONTAINER', 'TASK'
            ];
            filteredNodes = filteredNodes.filter(n => !technicalAndProcessTypes.includes(n.data.type));

            // Sync Edges
            const nodeIds = new Set(filteredNodes.map(n => n.id));
            filteredEdges = filteredEdges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
        }

        // B. Apply Type Filters
        filteredNodes = filteredNodes.filter(n => {
            const type = n.data.type;
            if (nodeTypesFilter[type] !== undefined) return nodeTypesFilter[type];
            return true;
        });

        // B. Apply Focus Mode (Lineage Isolation)
        if (focusNodeId) {
            const connectedNodeIds = new Set<string>();
            const visitedEdges = new Set<string>();

            // Add center node
            connectedNodeIds.add(focusNodeId);

            // Helper for traversal
            const traverse = (nodeId: string, direction: 'upstream' | 'downstream') => {
                const queue = [nodeId];
                while (queue.length > 0) {
                    const currentId = queue.shift()!;

                    // Find connected edges
                    const relevantEdges = rawGraph.edges.filter(e => {
                        if (visitedEdges.has(e.id)) return false;
                        if (direction === 'upstream') return e.target === currentId;
                        if (direction === 'downstream') return e.source === currentId;
                        return false;
                    });

                    relevantEdges.forEach(e => {
                        visitedEdges.add(e.id);
                        const nextNodeId = direction === 'upstream' ? e.source : e.target;
                        if (!connectedNodeIds.has(nextNodeId)) {
                            connectedNodeIds.add(nextNodeId);
                            queue.push(nextNodeId);
                        }
                    });
                }
            };

            // Run traversal both ways
            traverse(focusNodeId, 'upstream');
            traverse(focusNodeId, 'downstream');

            // Filter nodes to only connected ones
            filteredNodes = filteredNodes.filter(n => connectedNodeIds.has(n.id));
        }

        const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
        filteredEdges = rawGraph.edges.filter(e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));

        // C.5 Apply Package Focus Filtering
        if (focusPackageId) {
            const packageId = focusPackageId;
            const packageChildrenIds = new Set<string>();
            packageChildrenIds.add(packageId);

            // Find all nodes that have this package as their parent (direct or indirect depends on nested property setup)
            // Current setup assumes 'parentNode' is set on children. 
            // We can also check parentId in n.data
            rawGraph.nodes.forEach(n => {
                if (n.parentNode === packageId || n.data.parentId === packageId) {
                    packageChildrenIds.add(n.id);
                }
            });

            filteredNodes = filteredNodes.filter(n => packageChildrenIds.has(n.id));
            filteredEdges = filteredEdges.filter(e => packageChildrenIds.has(e.source) && packageChildrenIds.has(e.target));
        }

        // D. Safety Check: If parentNode is not in filtered list, remove the reference to prevent crash
        filteredNodes = filteredNodes.map(node => {
            if (node.parentNode && !filteredNodeIds.has(node.parentNode)) {
                return { ...node, parentNode: undefined, extent: undefined };
            }
            return node;
        });

        // E. Apply Layout
        let { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            filteredNodes,
            filteredEdges,
            layoutDirection
        );

        // F. Apply Impact Visuals
        if (impactMode && impactNodes.size > 0) {
            layoutedNodes = layoutedNodes.map(node => {
                const isImpacted = impactNodes.has(node.id);
                return {
                    ...node,
                    style: {
                        ...node.style,
                        opacity: isImpacted ? 1 : 0.2,
                        filter: isImpacted ? 'none' : 'grayscale(100%) brightness(0.8)',
                    }
                };
            });

            layoutedEdges = layoutedEdges.map(edge => {
                const isImpacted = impactNodes.has(edge.source) && impactNodes.has(edge.target);
                return {
                    ...edge,
                    style: {
                        ...edge.style,
                        opacity: isImpacted ? 1 : 0.1,
                        stroke: isImpacted ? 'var(--primary)' : '#64748b',
                        strokeWidth: isImpacted ? 3 : 1.5,
                    },
                    animated: isImpacted
                };
            });
        }

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);

        // Fit View
        setTimeout(() => {
            window.requestAnimationFrame(() => fitView());
        }, 100);

    }, [rawGraph, nodeTypesFilter, focusNodeId, layoutDirection, fitView, setNodes, setEdges, impactMode, impactNodes, focusPackageId, perspective]);

    const nodeCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        nodes.forEach(n => {
            const type = n.data.type;
            if (type) counts[type] = (counts[type] || 0) + 1;
        });
        return counts;
    }, [nodes]);

    useEffect(() => {
        fetchGraph();
    }, [fetchGraph]);


    const onNodeClick = (_: React.MouseEvent, rfNode: Node) => {
        setSelectedNode(rfNode.data.fullData);

        // Detect Package / Group click for Focus Mode
        if (rfNode.type === 'packageGroup') {
            setFocusPackageId(rfNode.id);
            setImpactNodes(new Set()); // Clear impact if we enter focus
            return;
        }

        if (impactMode) {
            const affected = new Set<string>();
            const queue = [rfNode.id];
            affected.add(rfNode.id);

            while (queue.length > 0) {
                const currentId = queue.shift()!;
                const downstream = edges
                    .filter(e => e.source === currentId)
                    .map(e => e.target);

                downstream.forEach(targetId => {
                    if (!affected.has(targetId)) {
                        affected.add(targetId);
                        queue.push(targetId);
                    }
                });
            }
            setImpactNodes(affected);
        } else {
            setImpactNodes(new Set());
        }
    };

    // Calculate Upstream and Downstream nodes for the selected node
    const nodeDependencies = useMemo(() => {
        if (!selectedNode) return { inputs: [], outputs: [] };

        const inputs = edges
            .filter(e => e.target === selectedNode.id)
            .map(e => {
                const sourceNode = nodes.find(n => n.id === e.source);
                return sourceNode ? { ...sourceNode.data.fullData, label: e.label || 'Input' } : null;
            })
            .filter(Boolean);

        const outputs = edges
            .filter(e => e.source === selectedNode.id)
            .map(e => {
                const targetNode = nodes.find(n => n.id === e.target);
                return targetNode ? { ...targetNode.data.fullData, label: e.label || 'Output' } : null;
            })
            .filter(Boolean);

        return { inputs, outputs };
    }, [selectedNode, edges, nodes]);

    const handleExportCSV = () => {
        if (nodes.length === 0) return;

        // CSV Headers
        const headers = ['ID', 'Type', 'Label', 'Schema', 'Summary'];

        // CSV Rows
        const rows = nodes.map(n => {
            const d = n.data.fullData.data;
            // Escape quotes and handle newlines
            const summary = (d.summary || '').replace(/"/g, '""');
            return [
                `"${n.id}"`,
                `"${d.type}"`,
                `"${d.label}"`,
                `"${d.schema || ''}"`,
                `"${summary}"`
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `solution_${solution.name.replace(/\s+/g, '_')}_export.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex-1 bg-muted/20 relative flex overflow-hidden">
            {/* Filters Panel - Absolute Top Left */}
            <div className="absolute top-4 left-4 z-10 bg-card/60 backdrop-blur-xl p-3 rounded-xl shadow-2xl border border-border/50 neon-glow-purple">
                <div className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em] mb-3 px-1 flex items-center gap-2">
                    <Filter size={14} className="text-secondary" /> Filter Assets
                </div>
                <div className="space-y-1">
                    {Object.keys(nodeTypesFilter).map(type => {
                        const colors = NODE_COLORS[type] || NODE_COLORS['DEFAULT'];
                        return (
                            <label key={type} className="flex items-center gap-2 px-2 py-1 hover:bg-muted/50 rounded cursor-pointer text-xs transition-colors">
                                <input
                                    type="checkbox"
                                    checked={nodeTypesFilter[type]}
                                    onChange={(e) => setNodeTypesFilter(prev => ({ ...prev, [type]: e.target.checked }))}
                                    className="rounded border-input text-primary focus:ring-primary"
                                />
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.border }}></span>
                                <span className="font-medium text-foreground flex-1">{type}</span>
                                <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1 rounded">{nodeCounts[type] || 0}</span>
                            </label>
                        )
                    })}
                </div>
            </div>

            {/* View Controls - Top Right */}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
                <div className="bg-card/60 backdrop-blur-xl p-1.5 rounded-xl shadow-2xl border border-border/50 flex items-center gap-1 neon-glow-orange">
                    {/* Perspective Selector */}
                    <div className="flex items-center gap-2 mr-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-2">Perspective:</span>
                        <div className="flex bg-background/40 backdrop-blur-sm rounded-lg p-1 border border-border/30">
                            <button
                                onClick={() => {
                                    setPerspective('ARCHITECT');
                                    setIsSwitchingPerspective(true);
                                    setTimeout(() => setIsSwitchingPerspective(false), 500);
                                }}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1 rounded-[4px] text-[10px] font-bold transition-all uppercase tracking-wider",
                                    perspective === 'ARCHITECT'
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "hover:bg-background text-muted-foreground"
                                )}
                                title="Architect View: High-level overview hiding technical details like transforms and scripts."
                            >
                                <LayoutGrid size={12} />
                                Architect
                            </button>
                            <button
                                onClick={() => {
                                    setPerspective('ENGINEER');
                                    setIsSwitchingPerspective(true);
                                    setTimeout(() => setIsSwitchingPerspective(false), 500);
                                }}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1 rounded-[4px] text-[10px] font-bold transition-all uppercase tracking-wider",
                                    perspective === 'ENGINEER'
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "hover:bg-background text-muted-foreground"
                                )}
                                title="Engineer View: Detailed view showing all transformations and data artifacts."
                            >
                                <Settings size={12} />
                                Engineer
                            </button>
                        </div>
                        <button
                            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                            title="Views Guide:&#10;• Architect: High-level business view. Shows only tables and main pipelines.&#10;• Engineer: Deep-dive view. Shows all technical transforms, scripts and files."
                        >
                            <Sparkles size={14} className="text-primary/60" />
                        </button>
                    </div>

                    <div className="h-4 w-px bg-border mx-1" />

                    {focusNodeId && (
                        <button
                            onClick={() => setFocusNodeId(null)}
                            className="p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center gap-1.5 mr-2 transition-colors"
                            title="Clear specific lineage isolation and show all nodes"
                        >
                            <Minimize2 size={16} /> <span className="text-[10px] font-bold uppercase tracking-tight">Show All</span>
                        </button>
                    )}
                    <button
                        onClick={() => setLayoutDirection('LR')}
                        className={`p-1.5 rounded hover:bg-muted transition-colors ${layoutDirection === 'LR' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
                        title="Horizontal Layout"
                    >
                        <ArrowRight size={16} />
                    </button>
                    <button
                        onClick={() => setLayoutDirection('TB')}
                        className={`p-1.5 rounded hover:bg-muted transition-colors ${layoutDirection === 'TB' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
                        title="Vertical Layout"
                    >
                        <ArrowDown size={16} />
                    </button>
                    <button
                        onClick={() => setLayoutDirection('CIRCULAR')}
                        className={`p-1.5 rounded hover:bg-muted transition-colors ${layoutDirection === 'CIRCULAR' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
                        title="Circular Layout"
                    >
                        <CircleDot size={16} />
                    </button>

                    <div className="w-px h-4 bg-border mx-1"></div>

                    {/* Impact Mode Toggle */}
                    <button
                        onClick={() => {
                            const newMode = !impactMode;
                            setImpactMode(newMode);
                            if (!newMode) setImpactNodes(new Set());
                        }}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded transition-all",
                            impactMode
                                ? "bg-orange-500 text-white shadow-sm hover:bg-orange-600"
                                : "hover:bg-primary/10 text-muted-foreground hover:text-primary"
                        )}
                        title="Impact Analysis Mode: Select a node to see all downstream affected assets."
                    >
                        <Sparkles size={16} className={impactMode ? "animate-pulse" : ""} />
                        <span className="text-[10px] font-bold uppercase tracking-tight">Impact Mode</span>
                    </button>

                    {focusPackageId && (
                        <>
                            <div className="w-px h-4 bg-border mx-1"></div>
                            <button
                                onClick={() => setFocusPackageId(null)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-500 text-white shadow-sm hover:bg-blue-600 transition-all animate-in fade-in slide-in-from-right-2"
                                title="Return to Global View"
                            >
                                <X size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-tight">Reset Focus</span>
                            </button>
                        </>
                    )}

                    <div className="w-px h-4 bg-border mx-1"></div>
                    <button
                        onClick={() => setShowMinimap(!showMinimap)}
                        className={`p-1.5 rounded hover:bg-muted transition-colors ${showMinimap ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
                        title="Toggle Minimap"
                    >
                        <Map size={16} />
                    </button>
                    <div className="w-px h-4 bg-border mx-1"></div>
                    <button
                        onClick={handleDownloadReport}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-primary/10 hover:text-primary text-muted-foreground transition-all"
                        title="Download professional PDF summary with assets and lineage"
                    >
                        <FileText size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-tight">PDF Report</span>
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-primary/10 hover:text-primary text-muted-foreground transition-all"
                        title="Export filtered nodes and metadata to CSV"
                    >
                        <Download size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-tight">Export CSV</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 h-full bg-[color:var(--graph-bg)] transition-colors duration-300 relative">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={onNodeClick}
                    nodeTypes={nodeTypes}
                    // fitView // Handled manually on load
                    className="bg-muted/10"
                >
                    <Background />
                    <Controls />
                    {showMinimap && <MiniMap />}
                </ReactFlow>

                {/* Perspective Switching Overlay */}
                {isSwitchingPerspective && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/40 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-card p-6 rounded-2xl shadow-2xl border border-primary/20 flex flex-col items-center gap-4 scale-in-center">
                            <div className="relative">
                                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
                                <div className="p-4 rounded-full bg-primary text-white relative">
                                    <RefreshCw size={24} className="animate-spin" />
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="font-black text-xs uppercase tracking-[0.2em] text-primary">Actualizando Vista</div>
                                <div className="text-[10px] text-muted-foreground mt-1 font-bold">{perspective} MODE</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Side Panel */}
            {selectedNode && (
                <div className="w-96 border-l border-border bg-card overflow-y-auto shadow-xl z-20 absolute right-0 top-0 bottom-0 transition-transform transform translate-x-0">
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <span className="text-xs font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-1 rounded">
                                    {selectedNode.data.type}
                                </span>
                                <h2 className="text-xl font-bold mt-2 break-words text-foreground">{selectedNode.data.label}</h2>
                            </div>
                            <button
                                onClick={() => setSelectedNode(null)}
                                className="text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Action Bar */}
                        <div className="flex gap-2 mb-6">
                            <button
                                onClick={() => {
                                    setFocusNodeId(selectedNode.id);
                                    // setSelectedNode(null); // Optional: close panel if preferred
                                }}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors border
                                ${focusNodeId === selectedNode.id
                                        ? 'bg-primary/10 border-primary/20 text-primary'
                                        : 'bg-card border-border hover:bg-muted text-muted-foreground hover:text-foreground'}`}
                            >
                                <Focus size={16} />
                                {focusNodeId === selectedNode.id ? 'Focused' : 'Isolate Lineage'}
                            </button>
                            <button className="flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Coming soon">
                                <Download size={16} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Summary Section */}
                            {selectedNode.data.summary && (
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                                        <FileText size={16} /> AI Summary
                                    </h3>
                                    <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground leading-relaxed">
                                        {selectedNode.data.summary}
                                    </div>
                                </div>
                            )}

                            {/* Transformation Logic Section */}
                            {selectedNode.data.transformations && selectedNode.data.transformations.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                        <Terminal size={16} /> Transformation Logic
                                    </h3>
                                    <div className="space-y-4">
                                        {selectedNode.data.transformations.map((trans: any, idx: number) => {
                                            const transKey = `${selectedNode.id}-${trans.column}`;
                                            const translation = translations[transKey];
                                            const loading = isTranslating === transKey;

                                            return (
                                                <div key={idx} className="bg-muted/30 border border-border rounded-lg p-3 overflow-hidden">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs font-mono font-bold text-primary">{trans.column}</span>
                                                        <button
                                                            onClick={() => handleTranslate(trans.column, trans.expression)}
                                                            disabled={loading}
                                                            className="flex items-center gap-1.5 px-2 py-1 bg-primary text-primary-foreground rounded text-[10px] font-bold hover:bg-primary/90 disabled:opacity-50 transition-all uppercase tracking-tight"
                                                        >
                                                            {loading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                                                            {translation ? 'Re-Translate' : 'AI Translate to SQL'}
                                                        </button>
                                                    </div>

                                                    <div className="relative group">
                                                        <code className="block text-[10px] font-mono bg-background/50 p-2 rounded border border-border/50 text-muted-foreground break-all max-h-24 overflow-y-auto">
                                                            {trans.expression}
                                                        </code>
                                                    </div>

                                                    {translation && (
                                                        <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                                                            <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                                                                <Code size={12} /> Translated SQL / dbt
                                                            </div>
                                                            <pre className="bg-emerald-500/5 border border-emerald-500/20 p-2 rounded text-[11px] font-mono text-emerald-600 dark:text-emerald-400 overflow-x-auto">
                                                                {translation.sql}
                                                            </pre>
                                                            {translation.explanation && (
                                                                <p className="text-[10px] text-muted-foreground italic leading-tight">
                                                                    {translation.explanation}
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Metadata Section */}
                            <div>
                                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                                    <Database size={16} /> Metadata
                                </h3>
                                <div className="border border-border rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                        <tbody>
                                            <tr className="border-b border-border">
                                                <td className="bg-muted/30 px-3 py-2 text-muted-foreground font-medium w-1/3">ID</td>
                                                <td className="px-3 py-2 font-mono text-xs break-all text-foreground">{selectedNode.id}</td>
                                            </tr>
                                            {selectedNode.data.schema && (
                                                <tr className="border-b border-border">
                                                    <td className="bg-muted/30 px-3 py-2 text-muted-foreground font-medium">Schema</td>
                                                    <td className="px-3 py-2 text-foreground">{selectedNode.data.schema}</td>
                                                </tr>
                                            )}
                                            {/* Display Columns if available */}
                                            {selectedNode.data.columns && Array.isArray(selectedNode.data.columns) && selectedNode.data.columns.length > 0 ? (
                                                <tr>
                                                    <td className="bg-muted/30 px-3 py-2 text-muted-foreground font-medium align-top">Columns</td>
                                                    <td className="px-3 py-2">
                                                        <ul className="list-disc list-inside text-xs space-y-1 text-muted-foreground">
                                                            {selectedNode.data.columns.map((col: any, i: number) => (
                                                                <li key={i} className="break-words">{col}</li>
                                                            ))}
                                                        </ul>
                                                    </td>
                                                </tr>
                                            ) : (
                                                /* Fallback for tables without detected columns */
                                                (selectedNode.data.type === 'TABLE' || selectedNode.data.type === 'DATABASE') && (
                                                    <tr>
                                                        <td className="bg-muted/30 px-3 py-2 text-muted-foreground font-medium align-top">Columns</td>
                                                        <td className="px-3 py-2 text-xs text-muted-foreground italic">
                                                            No columns detected in code analysis.
                                                        </td>
                                                    </tr>
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Dependencies Section (New) */}
                            {(nodeDependencies.inputs.length > 0 || nodeDependencies.outputs.length > 0) && (
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                                        <ArrowRightLeft size={16} /> Connections
                                    </h3>
                                    <div className="space-y-4">
                                        {/* Inputs */}
                                        {nodeDependencies.inputs.length > 0 && (
                                            <div>
                                                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Input From (Upstream)</h4>
                                                <div className="space-y-2">
                                                    {nodeDependencies.inputs.map((node: any, idx: number) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => setSelectedNode(node)}
                                                            className="w-full bg-card border border-border rounded p-2 text-sm hover:bg-accent hover:border-primary/50 flex justify-between items-center group cursor-pointer transition-all text-left"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-2 h-2 rounded-full bg-blue-400 group-hover:scale-125 transition-transform"></span>
                                                                <span className="font-medium text-foreground group-hover:text-primary">{node.data.label}</span>
                                                            </div>
                                                            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded group-hover:bg-background">{node.data.type}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Outputs */}
                                        {nodeDependencies.outputs.length > 0 && (
                                            <div>
                                                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Output To (Downstream)</h4>
                                                <div className="space-y-2">
                                                    {nodeDependencies.outputs.map((node: any, idx: number) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => setSelectedNode(node)}
                                                            className="w-full bg-card border border-border rounded p-2 text-sm hover:bg-accent hover:border-green-500/50 flex justify-between items-center group cursor-pointer transition-all text-left"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-2 h-2 rounded-full bg-green-400 group-hover:scale-125 transition-transform"></span>
                                                                <span className="font-medium text-foreground group-hover:text-green-600 dark:group-hover:text-green-400">{node.data.label}</span>
                                                            </div>
                                                            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded group-hover:bg-background">{node.data.type}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <ChatAssistant solutionId={id} isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
        </div>
    );
}

export default function SolutionDetailPage({ params }: PageProps) {
    const { id } = params;
    const [solution, setSolution] = useState<any>(null);
    const [activeJob, setActiveJob] = useState<any>(null); // New state for active job
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'graph' | 'catalog'>('graph');
    const router = useRouter(); // For navigation

    const fetchSolution = useCallback(async () => {
        // 1. Fetch Solution Details
        const { data: solutionData, error } = await supabase
            .from('solutions')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching solution:', error);
        } else {
            setSolution(solutionData);
        }

        // 2. Fetch Active Job (for Planning Status)
        try {
            const statsRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/solutions/${id}/stats`);
            setActiveJob(statsRes.data.active_job);
        } catch (e) {
            console.error("Error fetching stats:", e);
        }

        setLoading(false);
    }, [id]);

    useEffect(() => {
        fetchSolution();

        // Polling for status updates if processing or planning
        const interval = setInterval(() => {
            if (solution?.status === 'PROCESSING' || activeJob?.status === 'planning_ready') {
                fetchSolution();
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [fetchSolution, solution?.status, activeJob?.status]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="animate-spin" size={48} />
            </div>
        );
    }

    if (!solution) {
        return <div className="p-8">Solution not found</div>;
    }

    // --- PLANNING INTERCEPTION ---
    // If the active job is in 'planning_ready' state, show the Planning Banner/Redirect
    if (activeJob && activeJob.status === 'planning_ready') {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-background text-foreground p-8">
                <div className="max-w-md w-full bg-card border border-border rounded-lg shadow-lg p-6 text-center">
                    <div className="bg-primary/10 text-primary p-3 rounded-full w-fit mx-auto mb-4">
                        <FileText size={32} />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Execution Plan Ready</h1>
                    <p className="text-muted-foreground mb-6">
                        A new execution plan has been generated for this solution.
                        Please review and approve the files to be processed.
                    </p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => router.push(`/solutions/${id}/plan`)}
                            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-2 rounded-md font-medium transition-colors"
                        >
                            Review Plan
                        </button>
                        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
                            Return to Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Define status display logic
    const getStatusBadge = () => {
        if (activeJob && activeJob.status === 'planning_ready') {
            return <span className="px-2 py-0.5 rounded-full font-medium border bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800">Ready to Approve</span>;
        }

        if (solution.status === 'PROCESSING' || solution.status === 'QUEUED') {
            // Check active job for more detail
            if (activeJob) {
                if (activeJob.status === 'queued') return <span className="px-2 py-0.5 rounded-full font-medium border bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800">Queued</span>;

                // If running, check stage
                if (activeJob.current_stage === 'planning') {
                    return <span className="px-2 py-0.5 rounded-full font-medium border bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 flex items-center gap-1">
                        <Loader2 className="animate-spin" size={12} /> Generating Plan...
                    </span>;
                }

                // We should probably assume 'Evaluating Plan' if not ready yet but running
                return <span className="px-2 py-0.5 rounded-full font-medium border bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 flex items-center gap-1">
                    <Loader2 className="animate-spin" size={12} /> Analyzing...
                </span>;
            }
            return <span className="px-2 py-0.5 rounded-full font-medium border bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">Processing</span>;
        }

        if (solution.status === 'READY') {
            return <span className="px-2 py-0.5 rounded-full font-medium border bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">Ready</span>;
        }

        return <span className="px-2 py-0.5 rounded-full font-medium border bg-secondary text-secondary-foreground border-border">{solution.status}</span>;
    };

    return (
        <div className="h-screen flex flex-col bg-background text-foreground">
            {/* Header */}
            <div className="p-4 border-b border-border bg-background/95 backdrop-blur flex justify-between items-center z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="font-bold text-lg tracking-tight">{solution.name}</h1>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {getStatusBadge()}
                            <span>{new Date(solution.created_at).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* View Switcher */}
                <div className="flex items-center gap-2">
                    <ModeToggle />
                    <div className="flex bg-muted p-1 rounded-md">
                        <button
                            onClick={() => setViewMode('graph')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all ${viewMode === 'graph' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <Network size={16} /> Graph
                        </button>
                        <button
                            onClick={() => setViewMode('catalog')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all ${viewMode === 'catalog' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <LayoutGrid size={16} /> Catalog
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            {viewMode === 'graph' ? (
                <ReactFlowProvider>
                    <GraphContent id={id} solution={solution} />
                </ReactFlowProvider>
            ) : (
                <div className="flex-1 overflow-hidden bg-background">
                    <CatalogPage params={{ id }} />
                </div>
            )}
        </div>
    );
}