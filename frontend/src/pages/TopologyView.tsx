/**
 * Interactive Topology Graph - Knowledge Graph Visualization
 * Shows infrastructure dependencies and service relationships
 */
import React, { useState, useEffect, useRef } from 'react';
import { Network, Database, Server, Cloud, AlertCircle, CheckCircle } from 'lucide-react';
import Header from '../components/common/Header';
import Sidebar from '../components/common/Sidebar';

interface TopologyNode {
  node_id: string;
  name: string;
  type: string;
  status: string;
  metadata: Record<string, any>;
  dependencies: string[];
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

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const TopologyView: React.FC = () => {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('');
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const email = localStorage.getItem('user_email');
    if (email) setUserEmail(email);
    fetchTopologyData();
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

      setGraphData(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching topology:', error);
      setLoading(false);
    }
  };

  const getNodeIcon = (type: string) => {
    const iconMap: Record<string, any> = {
      'service': Server,
      'database': Database,
      'network': Network,
      'cloud': Cloud
    };
    return iconMap[type] || Server;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'healthy': 'text-green-600 bg-green-100',
      'warning': 'text-yellow-600 bg-yellow-100',
      'critical': 'text-red-600 bg-red-100',
      'unknown': 'text-gray-600 bg-gray-100'
    };
    return colorMap[status] || colorMap['unknown'];
  };

  const calculateNodePosition = (index: number, total: number, width: number, height: number) => {
    const radius = Math.min(width, height) * 0.35;
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;

    return {
      x: width / 2 + radius * Math.cos(angle),
      y: height / 2 + radius * Math.sin(angle)
    };
  };

  const renderGraph = () => {
    if (!svgRef.current) return null;

    const width = 800;
    const height = 600;
    const nodePositions = new Map<string, { x: number; y: number }>();

    // Calculate positions for all nodes
    graphData.nodes.forEach((node, index) => {
      const pos = calculateNodePosition(index, graphData.nodes.length, width, height);
      nodePositions.set(node.node_id, pos);
    });

    return (
      <svg ref={svgRef} width={width} height={height} className="border border-gray-300 rounded-lg bg-white">
        {/* Draw edges */}
        <g>
          {graphData.edges.map((edge, index) => {
            const sourcePos = nodePositions.get(edge.source);
            const targetPos = nodePositions.get(edge.target);

            if (!sourcePos || !targetPos) return null;

            return (
              <line
                key={index}
                x1={sourcePos.x}
                y1={sourcePos.y}
                x2={targetPos.x}
                y2={targetPos.y}
                stroke="#94a3b8"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
            );
          })}
        </g>

        {/* Arrow marker definition */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#94a3b8" />
          </marker>
        </defs>

        {/* Draw nodes */}
        <g>
          {graphData.nodes.map((node) => {
            const pos = nodePositions.get(node.node_id);
            if (!pos) return null;

            const isSelected = selectedNode?.node_id === node.node_id;

            return (
              <g
                key={node.node_id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => setSelectedNode(node)}
                className="cursor-pointer"
              >
                {/* Node circle */}
                <circle
                  r={isSelected ? 35 : 30}
                  fill={node.status === 'healthy' ? '#10b981' :
                    node.status === 'warning' ? '#f59e0b' : '#ef4444'}
                  stroke={isSelected ? '#1e40af' : '#ffffff'}
                  strokeWidth={isSelected ? 3 : 2}
                  className="transition-all duration-200"
                />

                {/* Node label */}
                <text
                  y={50}
                  textAnchor="middle"
                  className="text-xs font-medium fill-gray-700"
                >
                  {node.name}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 overflow-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Infrastructure Topology</h1>
            <p className="text-gray-600 mt-1">Interactive knowledge graph of service dependencies</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Topology Graph */}
            <div className="lg:col-span-3 bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Service Dependency Graph</h2>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-gray-600">Healthy</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-gray-600">Warning</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-gray-600">Critical</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                {renderGraph()}
              </div>
            </div>

            {/* Node Details Panel */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Node Details</h2>

              {selectedNode ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      {React.createElement(getNodeIcon(selectedNode.type), {
                        className: "w-8 h-8 text-blue-600"
                      })}
                      <h3 className="text-lg font-semibold text-gray-900">{selectedNode.name}</h3>
                    </div>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getStatusColor(selectedNode.status)}`}>
                      {selectedNode.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Information</h4>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="text-gray-600">Type:</dt>
                        <dd className="font-medium text-gray-900 capitalize">{selectedNode.type}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-600">Node ID:</dt>
                        <dd className="font-mono text-xs text-gray-900">{selectedNode.node_id}</dd>
                      </div>
                    </dl>
                  </div>

                  {selectedNode.dependencies.length > 0 && (
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="font-medium text-gray-900 mb-2">Dependencies ({selectedNode.dependencies.length})</h4>
                      <div className="space-y-1">
                        {selectedNode.dependencies.map((depId, index) => {
                          const depNode = graphData.nodes.find(n => n.node_id === depId);
                          return (
                            <div
                              key={index}
                              className="text-sm text-gray-600 hover:text-blue-600 cursor-pointer"
                              onClick={() => depNode && setSelectedNode(depNode)}
                            >
                              {depNode?.name || depId}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {Object.keys(selectedNode.metadata).length > 0 && (
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="font-medium text-gray-900 mb-2">Metadata</h4>
                      <dl className="space-y-1 text-sm">
                        {Object.entries(selectedNode.metadata).map(([key, value]) => (
                          <div key={key}>
                            <dt className="text-gray-600">{key}:</dt>
                            <dd className="font-medium text-gray-900">{String(value)}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Select a node to view details</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
