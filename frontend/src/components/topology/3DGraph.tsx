import React, { useRef, useEffect } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { TopologyNode, TopologyEdge } from '../../pages/TopologyView';

interface GraphData {
    nodes: TopologyNode[];
    edges: TopologyEdge[];
}

interface Topology3DProps {
    data: GraphData;
    onNodeClick: (node: TopologyNode) => void;
}

const getStatusColor = (status: string | null | undefined) => {
    switch ((status || 'unknown').toLowerCase()) {
        case 'healthy': return '#10b981'; // green-500
        case 'warning': return '#f59e0b'; // yellow-500
        case 'critical': return '#ef4444'; // red-500
        default: return '#94a3b8'; // slate-400
    }
};

const Topology3D: React.FC<Topology3DProps> = ({ data, onNodeClick }) => {
    const fgRef = useRef<any>();

    useEffect(() => {
        // Adjust camera distance on load
        if (fgRef.current) {
            fgRef.current.d3Force('charge').strength(-120);
        }
    }, []);

    return (
        <div className="w-full h-full bg-slate-900 rounded-lg overflow-hidden shadow-inner">
            <ForceGraph3D
                ref={fgRef}
                graphData={data}
                nodeLabel="name"
                nodeColor={(node: any) => getStatusColor(node.status)}
                nodeResolution={16}
                nodeVal={(node: any) => {
                    // Size based on type importance (heuristic)
                    const type = (node.type || '').toLowerCase();
                    if (type.includes('vm') || type.includes('database')) return 5;
                    if (type.includes('app')) return 4;
                    return 2;
                }}
                linkColor={() => '#475569'} // slate-600
                linkWidth={1}
                linkOpacity={0.5}
                onNodeClick={(node: any) => onNodeClick(node as TopologyNode)}
                backgroundColor="#0f172a" // slate-900
                controlType="orbit"
                showNavInfo={true}
                nodeThreeObjectExtend={true}
            />
        </div>
    );
};

export default Topology3D;
