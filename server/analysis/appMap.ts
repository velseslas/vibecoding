import { logger } from '../logger';

export interface MapNode {
  id: string;
  type: 'FILE' | 'IMPORT' | 'COMPONENT' | 'SERVICE' | 'API' | 'DATA_MODEL';
  name: string;
  metadata?: Record<string, any>;
}

export interface MapEdge {
  fromId: string;
  toId: string;
  relation: 'IMPORTS' | 'RENDERS' | 'CALLS' | 'PERSISTS' | 'DEPENDS_ON';
}

export interface ApplicationGraph {
  nodes: MapNode[];
  edges: MapEdge[];
}

export class ApplicationMapService {
  /**
   * Constructs a bidirectional dependency graph from the project's actual files
   */
  public buildMap(files: Array<{ name: string; content?: string }>, rawHtml?: string): ApplicationGraph {
    const nodes: MapNode[] = [];
    const edges: MapEdge[] = [];
    const nodeMap = new Map<string, MapNode>();

    const addNode = (node: MapNode) => {
      if (!nodeMap.has(node.id)) {
        nodeMap.set(node.id, node);
        nodes.push(node);
      }
    };

    // 1. Files as top-level nodes
    for (const f of files) {
      const fileNode: MapNode = {
        id: `file:${f.name}`,
        type: 'FILE',
        name: f.name,
      };
      addNode(fileNode);

      const content = f.content || '';

      // 2. Discover Imports
      const importRegex = /import\s+.*?from\s+['"](.*?)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const importTarget = match[1];
        const importNode: MapNode = {
          id: `import:${importTarget}`,
          type: 'IMPORT',
          name: importTarget,
        };
        addNode(importNode);
        edges.push({
          fromId: fileNode.id,
          toId: importNode.id,
          relation: 'IMPORTS',
        });
      }

      // 3. Discover LocalStorage models
      if (content.includes('localStorage')) {
        const modelNode: MapNode = {
          id: 'model:local_storage_db',
          type: 'DATA_MODEL',
          name: 'LocalStorage Store',
        };
        addNode(modelNode);
        edges.push({
          fromId: fileNode.id,
          toId: modelNode.id,
          relation: 'PERSISTS',
        });
      }

      // 4. Discover API Calls
      const apiRegex = /fetch\(['"`](\/api\/[a-zA-Z0-9_\-\/]+)['"`]/g;
      while ((match = apiRegex.exec(content)) !== null) {
        const endpoint = match[1];
        const apiNode: MapNode = {
          id: `api:${endpoint}`,
          type: 'API',
          name: endpoint,
        };
        addNode(apiNode);
        edges.push({
          fromId: fileNode.id,
          toId: apiNode.id,
          relation: 'CALLS',
        });
      }
    }

    // 5. Parse Components from HTML
    const html = rawHtml || files.find((f) => f.name.endsWith('.html'))?.content || '';
    const componentRegex = /id="([a-zA-Z0-9_-]+)"/g;
    let match;
    while ((match = componentRegex.exec(html)) !== null) {
      const compId = match[1];
      if (compId !== 'root' && compId !== 'vibecode-preview-bridge') {
        const compNode: MapNode = {
          id: `comp:${compId}`,
          type: 'COMPONENT',
          name: compId,
        };
        addNode(compNode);
        edges.push({
          fromId: 'file:index.html',
          toId: compNode.id,
          relation: 'RENDERS',
        });
      }
    }

    return { nodes, edges };
  }

  /**
   * Identifies all files directly or indirectly impacted by modifying a given file
   */
  public getImpactedFiles(graph: ApplicationGraph, targetFileName: string): string[] {
    const targetId = `file:${targetFileName}`;
    const impacted = new Set<string>([targetFileName]);

    // Reverse lookup: Who imports or depends on this file?
    for (const edge of graph.edges) {
      if (edge.toId === targetId && edge.fromId.startsWith('file:')) {
        impacted.add(edge.fromId.replace('file:', ''));
      }
    }

    return Array.from(impacted);
  }

  /**
   * Identifies which components call a specific API endpoint
   */
  public getComponentsCallingApi(graph: ApplicationGraph, apiPath: string): string[] {
    const apiId = `api:${apiPath}`;
    const callingFiles = graph.edges
      .filter((e) => e.toId === apiId && e.relation === 'CALLS')
      .map((e) => e.fromId);

    return callingFiles;
  }

  /**
   * Identifies which features depend on a specific service / library
   */
  public getFeaturesDependingOnService(graph: ApplicationGraph, serviceName: string): string[] {
    const depending = graph.edges
      .filter((e) => e.toId.includes(serviceName.toLowerCase()))
      .map((e) => e.fromId);

    return depending;
  }
}

export const appMapService = new ApplicationMapService();
