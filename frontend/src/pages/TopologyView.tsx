/**
 * Interactive Topology Graph - Knowledge Graph Visualization
 * Shows infrastructure dependencies and service relationships
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Network, Database, Server, Cloud, AlertCircle, CheckCircle,
  Cpu, HardDrive, Shield, Globe, Box, Zap, Layout as LayoutIcon, ZoomIn, ZoomOut, Maximize
} from 'lucide-react';
import Layout from '../components/common/Layout';

// --- Types ---

interface TopologyNode {
  node_id: string;
  name: string;
  type: string;
  status: string;
  metadata: Record<string, any>;
  dependencies: string[];
  resource_group?: string;
  location?: string;
  // Simulation properties
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface TopologyEdge {
  source: string;
  target: string;
  type: string;
}

interface GraphData {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

// --- Constants ---

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;
const NODE_RADIUS = 25;

// --- Helper Functions ---

const getNodeIcon = (type: string) => {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('database') || lowerType.includes('sql') || lowerType.includes('cosmos')) return Database;
  if (lowerType.includes('storage') || lowerType.includes('disk')) return HardDrive;
  if (lowerType.includes('network') || lowerType.includes('vnet') || lowerType.includes('ip')) return Network;
  if (lowerType.includes('vm') || lowerType.includes('compute')) return Cpu;
  if (lowerType.includes('kubernetes') || lowerType.includes('aks')) return Box;
  if (lowerType.includes('security') || lowerType.includes('keyvault')) return Shield;
  if (lowerType.includes('web') || lowerType.includes('app') || lowerType.includes('site')) return Globe;
  if (lowerType.includes('function') || lowerType.includes('logic')) return Zap;
  return Server;
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'healthy': return '#10b981'; // green-500
    case 'warning': return '#f59e0b'; // yellow-500
    case 'critical': return '#ef4444'; // red-500
    default: return '#94a3b8'; // slate-400
  }
};

export const TopologyView: React.FC = () => {
  // --- State ---
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 }); // Pan & Zoom
  const [isDragging, setIsDragging] = useState(false);
  const [dragSubject, setDragSubject] = useState<TopologyNode | null>(null);

  // Simulation state
  const [simulationNodes, setSimulationNodes] = useState<TopologyNode[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<number>();

  // --- Data Fetching ---

  useEffect(() => {
    fetchTopologyData();
    return () => cancelAnimationFrame(simulationRef.current!);
  }, []);

  const fetchTopologyData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch(`${API_BASE}/api/v1/topology/graph`, { headers });
      const data = await response.json();

      // Initialize positions randomly but centered
      const initializedNodes = data.nodes.map((node: TopologyNode) => ({
        ...node,
        x: CANVAS_WIDTH / 2 + (Math.random() - 0.5) * 200,
        y: CANVAS_HEIGHT / 2 + (Math.random() - 0.5) * 200,
        vx: 0,
        vy: 0
      }));

      setGraphData(data);
      setSimulationNodes(initializedNodes);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching topology:', error);
      setLoading(false);
    }
  };

  // --- Force Simulation Engine ---

  useEffect(() => {
    if (loading || simulationNodes.length === 0) return;

    const runSimulation = () => {
      setSimulationNodes(prevNodes => {
        const newNodes = [...prevNodes];
        const alpha = 0.1; // Simulation speed/decay

        // 1. Repulsion (Coulomb's Law-ish)
        for (let i = 0; i < newNodes.length; i++) {
          for (let j = i + 1; j < newNodes.length; j++) {
            const dx = newNodes[i].x! - newNodes[j].x!;
            const dy = newNodes[i].y! - newNodes[j].y!;
            let dist = Math.sqrt(dx * dx + dy * dy) || 1;

            if (dist < 300) { // Interaction radius
              const force = (3000 / (dist * dist)) * alpha; // Repulsion strength
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;

              newNodes[i].vx! += fx;
              newNodes[i].vy! += fy;
              newNodes[j].vx! -= fx;
              newNodes[j].vy! -= fy;
            }
          }
        }

        // 2. Attraction (Springs) along edges
        graphData.edges.forEach(edge => {
          const source = newNodes.find(n => n.node_id === edge.source);
          const target = newNodes.find(n => n.node_id === edge.target);

          if (source && target) {
            const dx = target.x! - source.x!;
            const dy = target.y! - source.y!;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            const targetDist = 150; // Desired edge length
            const force = (dist - targetDist) * 0.005 * alpha; // Spring constant

            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            source.vx! += fx;
            source.vy! += fy;
            target.vx! -= fx;
            target.vy! -= fy;
          }
        });

        // 3. Center Gravity (keep graph in view)
        newNodes.forEach(node => {
          const dx = CANVAS_WIDTH / 2 - node.x!;
          const dy = CANVAS_HEIGHT / 2 - node.y!;
          node.vx! += dx * 0.0005 * alpha;
          node.vy! += dy * 0.0005 * alpha;
        });

        // 4. Apply Velocity & Damping
        newNodes.forEach(node => {
          // Don't move dragged node
          if (dragSubject && node.node_id === dragSubject.node_id) return;

          node.vx! *= 0.9; // Friction
          node.vy! *= 0.9;

          // Speed limit
          const speed = Math.sqrt(node.vx! * node.vx! + node.vy! * node.vy!);
          if (speed > 5) {
            node.vx! = (node.vx! / speed) * 5;
            node.vy! = (node.vy! / speed) * 5;
          }

          node.x! += node.vx!;
          node.y! += node.vy!;
        });

        return newNodes;
      });

      simulationRef.current = requestAnimationFrame(runSimulation);
    };

    runSimulation();
    return () => cancelAnimationFrame(simulationRef.current!);
  }, [graphData.edges, dragSubject, loading]); // Re-run if edges change

  // --- Interaction Handlers ---

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleSensitivity = 0.001;
    const newScale = transform.k - e.deltaY * scaleSensitivity;
    const clampedScale = Math.min(Math.max(0.1, newScale), 4);

    setTransform(prev => ({
      ...prev,
      k: clampedScale
    }));
  };

  const handleMouseDown = (e: React.MouseEvent, node?: TopologyNode) => {
    if (node) {
      e.stopPropagation();
      setDragSubject(node);
    } else {
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragSubject) {
      // Dragging a node
      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const x = (e.clientX - rect.left - transform.x) / transform.k;
      const y = (e.clientY - rect.top - transform.y) / transform.k;

      setSimulationNodes(nodes => nodes.map(n =>
        n.node_id === dragSubject.node_id ? { ...n, x, y, vx: 0, vy: 0 } : n
      ));
    } else if (isDragging) {
      // Panning canvas
      setTransform(prev => ({
        ...prev,
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragSubject(null);
  };

  const handleZoomIn = () => setTransform(p => ({ ...p, k: Math.min(p.k * 1.2, 4) }));
  const handleZoomOut = () => setTransform(p => ({ ...p, k: Math.max(p.k / 1.2, 0.1) }));
  const handleResetView = () => setTransform({ x: 0, y: 0, k: 1 });

  // --- Render Helpers ---

  const renderEdges = () => {
    return graphData.edges.map((edge, i) => {
      const source = simulationNodes.find(n => n.node_id === edge.source);
      const target = simulationNodes.find(n => n.node_id === edge.target);
      if (!source || !target) return null;

      return (
        <line
          key={i}
          x1={source.x}
          y1={source.y}
          x2={target.x}
          y2={target.y}
          stroke="#cbd5e1"
          strokeWidth={1.5}
          opacity={0.6}
        />
      );
    });
  };

  const renderNodes = () => {
    return simulationNodes.map(node => {
      const isSelected = selectedNode?.node_id === node.node_id;
      const Icon = getNodeIcon(node.type);

      return (
        <g
          key={node.node_id}
          transform={`translate(${node.x},${node.y})`}
          onMouseDown={(e) => handleMouseDown(e, node)}
          onClick={(e) => { e.stopPropagation(); setSelectedNode(node); }}
          className="cursor-pointer transition-opacity duration-200 hover:opacity-80"
          style={{ cursor: dragSubject ? 'grabbing' : 'grab' }}
        >
          {/* Node Background */}
          <circle
            r={NODE_RADIUS}
            fill="white"
            stroke={isSelected ? '#2563eb' : getStatusColor(node.status)}
            strokeWidth={isSelected ? 3 : 2}
            className="shadow-sm"
          />

          {/* Icon */}
          <foreignObject x={-12} y={-12} width={24} height={24} className="pointer-events-none">
            <div className="flex items-center justify-center h-full w-full">
              <Icon size={16} color={getStatusColor(node.status)} />
            </div>
          </foreignObject>

          {/* Label (Only show on hover or if selected or zoomed in) */}
          {(isSelected || transform.k > 0.8) && (
            <text
              y={NODE_RADIUS + 15}
              textAnchor="middle"
              className="text-[10px] font-medium fill-gray-600 select-none pointer-events-none"
              style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}
            >
              {node.name.length > 20 ? node.name.substring(0, 18) + '...' : node.name}
            </text>
          )}
        </g>
      );
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex-1 relative overflow-hidden bg-slate-50 h-full w-full">
        {/* Toolbar */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 bg-white p-2 rounded-lg shadow-md border border-gray-200">
          <button onClick={fetchTopologyData} className="p-2 hover:bg-gray-100 rounded" title="Refresh Data">
            <LayoutIcon size={20} className="text-gray-600" />
          </button>
          <button onClick={handleZoomIn} className="p-2 hover:bg-gray-100 rounded" title="Zoom In">
            <ZoomIn size={20} className="text-gray-600" />
          </button>
          <button onClick={handleZoomOut} className="p-2 hover:bg-gray-100 rounded" title="Zoom Out">
            <ZoomOut size={20} className="text-gray-600" />
          </button>
          <button onClick={handleResetView} className="p-2 hover:bg-gray-100 rounded" title="Reset View">
            <Maximize size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Empty State */}
        {!loading && graphData.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
            <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg max-w-md pointer-events-auto">
              <Cloud className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No Resources Found</h3>
              <p className="text-gray-500 mt-2 mb-6">
                Connect your cloud provider to start visualizing your infrastructure.
              </p>
              <a
                href="/integrations"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Integrations
              </a>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute top-4 right-4 z-10 bg-white p-4 rounded-lg shadow-md border border-gray-200 max-w-xs">
          <h3 className="font-semibold text-sm text-gray-900 mb-2">Legend</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div> Healthy</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500"></div> Warning</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div> Critical</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-400"></div> Unknown</div>
          </div>
        </div>

        {/* Graph Canvas */}
        <div
          className="w-full h-full cursor-move"
          onMouseDown={(e) => handleMouseDown(e)}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
            className="w-full h-full"
          >
            <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
              {renderEdges()}
              {renderNodes()}
            </g>
          </svg>
        </div>

        {/* Details Panel (Overlay) */}
        {selectedNode && (
          <div className="absolute bottom-4 right-4 w-80 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col max-h-[50vh] animate-in slide-in-from-bottom-4">
            <div className="p-4 border-b border-gray-100 flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  {React.createElement(getNodeIcon(selectedNode.type), { size: 20, className: "text-blue-600" })}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 leading-tight">{selectedNode.name}</h3>
                  <span className="text-xs text-gray-500 capitalize">{selectedNode.type}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="p-4 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</span>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColor(selectedNode.status) }}></div>
                    <span className="text-sm font-medium capitalize text-gray-700">{selectedNode.status}</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Properties</span>
                  <div className="mt-1 grid grid-cols-1 gap-2">
                    <div className="bg-gray-50 p-2 rounded text-xs">
                      <span className="text-gray-500">Resource Group:</span>
                      <div className="font-medium text-gray-900 truncate">{selectedNode.resource_group}</div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded text-xs">
                      <span className="text-gray-500">Location:</span>
                      <div className="font-medium text-gray-900">{selectedNode.location}</div>
                    </div>
                  </div>
                </div>

                {Object.keys(selectedNode.metadata).length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Metadata</span>
                    <div className="mt-1 space-y-1">
                      {Object.entries(selectedNode.metadata).slice(0, 5).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                          <span className="text-gray-500">{key}:</span>
                          <span className="text-gray-900 font-medium truncate max-w-[150px]">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

