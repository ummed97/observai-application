declare module 'react-force-graph-3d' {
    import { Component } from 'react';

    export interface ForceGraph3DProps {
        graphData?: {
            nodes: any[];
            edges: any[];
        };
        width?: number;
        height?: number;
        backgroundColor?: string;
        showNavInfo?: boolean;
        nodeRelSize?: number;
        nodeId?: string;
        nodeLabel?: string | ((node: any) => string);
        nodeColor?: string | ((node: any) => string);
        nodeAutoColorBy?: string | ((node: any) => string);
        nodeOpacity?: number;
        nodeResolution?: number;
        nodeThreeObject?: any | ((node: any) => any);
        nodeThreeObjectExtend?: boolean | ((node: any) => boolean);
        nodeVal?: number | ((node: any) => number);
        linkColor?: string | ((link: any) => string);
        linkAutoColorBy?: string | ((link: any) => string);
        linkWidth?: number | ((link: any) => number);
        linkOpacity?: number;
        linkDirectionalArrowLength?: number | ((link: any) => number);
        linkDirectionalArrowRelPos?: number | ((link: any) => number);
        linkDirectionalArrowResolution?: number;
        linkDirectionalParticles?: number | ((link: any) => number);
        linkDirectionalParticleSpeed?: number | ((link: any) => number);
        linkDirectionalParticleWidth?: number | ((link: any) => number);
        linkDirectionalParticleResolution?: number;
        onNodeClick?: (node: any, event: any) => void;
        onNodeRightClick?: (node: any, event: any) => void;
        onNodeHover?: (node: any, prevNode: any) => void;
        onNodeDrag?: (node: any, translate: any) => void;
        onNodeDragEnd?: (node: any, translate: any) => void;
        onLinkClick?: (link: any, event: any) => void;
        onLinkRightClick?: (link: any, event: any) => void;
        onLinkHover?: (link: any, prevLink: any) => void;
        onBackgroundClick?: (event: any) => void;
        onBackgroundRightClick?: (event: any) => void;
        enablePointerInteraction?: boolean;
        enableNodeDrag?: boolean;
        enableNavigationControls?: boolean;
        controlType?: 'trackball' | 'orbit' | 'fly';
        rendererConfig?: any;
        extraRenderers?: any[];
        ref?: any;
    }

    export default class ForceGraph3D extends Component<ForceGraph3DProps> {
        d3Force(forceName: string, forceFn?: any): any;
        cameraPosition(position: { x?: number; y?: number; z?: number }, lookAt?: { x?: number; y?: number; z?: number }, transitionMs?: number): any;
    }
}
