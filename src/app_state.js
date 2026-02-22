// --- State Management with Undo/Redo & Persistence ---

const STORAGE_KEY = 'niras_vent_current_project';

class StateManager {
    constructor() {
        this.resetState();
        this.history = [];
        this.future = [];
        this.maxHistory = 50;

        // Try to load from local storage on init
        this.loadFromStorage();
    }

    resetState() {
        this.state = {
            fittingsList: [],
            systemComponents: [], // Deprecated, but kept for UI compat temporarily during transition
            graph: {
                nodes: {}, // id -> component object
                edges: [], // { from: id, fromPort: 'outlet', to: id, toPort: 'inlet' }
            },
            ductResult: null,
            correctionTargetId: null,
            projectName: '',
            startAirflow: '1000',
            systemType: 'splitting',
            temperature: '20'
        };
    }

    importState(importedState) {
        this.resetState();
        if (!importedState) return;

        // Merge properties
        Object.assign(this.state, importedState);

        // Ensure graph structure exists (Backwards Compatibility for Pre-Phase-12 projects)
        if (!this.state.graph || !this.state.graph.nodes) {
            this.setSystemComponents(this.state.systemComponents || []);
        }

        this.history = [];
        this.future = [];
        this.persist();
        this.notifyChange();
    }

    // --- History Management ---

    saveState(actionDescription = 'State Change') {
        const stateClone = JSON.parse(JSON.stringify(this.state));
        this.history.push({ state: stateClone, description: actionDescription });
        if (this.history.length > this.maxHistory) this.history.shift();

        // Clear future on new action
        this.future = [];

        this.persist();
        this.notifyChange();
    }

    undo() {
        if (this.history.length === 0) return false;

        const currentState = JSON.parse(JSON.stringify(this.state));
        this.future.push(currentState);

        const previousEntry = this.history.pop();
        this.state = previousEntry.state;

        this.persist();
        this.notifyChange();
        return true;
    }

    redo() {
        if (this.future.length === 0) return false;

        const currentState = JSON.parse(JSON.stringify(this.state));
        this.saveToHistoryStack(currentState); // Move current to history without clearing future

        const nextState = this.future.pop();
        this.state = nextState;

        this.persist();
        this.notifyChange();
        return true;
    }

    // Helper to push to history without clearing future (used by redo)
    saveToHistoryStack(state) {
        this.history.push({ state: state, description: 'Redo' });
        if (this.history.length > this.maxHistory) this.history.shift();
    }

    // --- Persistence ---

    persist() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
            console.log('State saved:', this.state);
        } catch (e) {
            console.error("Failed to save to localStorage", e);
        }
    }

    loadFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                this.state = JSON.parse(stored);
                console.log('State loaded:', this.state);
            } else {
                console.log('No state found in localStorage');
            }
        } catch (e) {
            console.error("Failed to load from localStorage", e);
        }
    }

    // --- State Accessors & Mutators (Delegates) ---

    // Fittings
    getFittings() { return this.state.fittingsList; }
    addFitting(fitting) {
        this.saveState(`Added fitting ${fitting.name}`);
        this.state.fittingsList.push(fitting);
        this.persist();
    }
    removeFitting(id) {
        this.saveState(`Removed fitting ${id}`);
        this.state.fittingsList = this.state.fittingsList.filter(f => f.id !== id);
        // Remove paired components logic (e.g. Tee parts)
        if (this.state.fittingsList.find(f => f.id === id + 1 || f.id === id - 1)) {
            this.state.fittingsList = this.state.fittingsList.filter(f => f.id !== id + 1 && f.id !== id - 1);
        }
        this.persist();
    }
    resetFittings() {
        this.saveState('Reset fittings');
        this.state.fittingsList = [];
        this.persist();
    }

    // --- Graph-Based System Components ---
    getGraph() {
        if (!this.state.graph) {
            this.state.graph = { nodes: {}, edges: [] };
        }
        return this.state.graph;
    }

    addSystemComponent(comp, parentId = null, parentPort = 'outlet', targetPort = 'inlet') {
        if (!comp) {
            console.error('StateManager: addSystemComponent called with null component');
            return;
        }

        console.log('StateManager: addSystemComponent (Graph) called', comp.name, 'parentId:', parentId);
        this.saveState(`Added component ${comp.name}`);

        // Default to included in calculation
        if (comp.isIncluded === undefined) {
            comp.isIncluded = true;
        }

        const graph = this.getGraph();

        // Add the new node
        graph.nodes[comp.id] = comp;

        // Only create an edge if parentId is given AND it exists
        if (parentId && graph.nodes[parentId]) {
            graph.edges.push({
                from: parentId,
                fromPort: parentPort,
                to: comp.id,
                toPort: targetPort
            });
        }

        // Backward compatibility sync
        this.syncGraphToArray();
        this.persist();
    }

    removeSystemComponent(id) {
        this.saveState(`Removed component ${id}`);
        const graph = this.getGraph();

        // Remove node
        delete graph.nodes[id];

        // Remove connected edges
        graph.edges = graph.edges.filter(e => e.from !== id && e.to !== id);

        // Note: Removing a middle node leaves the graph disconnected.
        // A sophisticated system would reconnect them or delete downstream.
        // For now, we leave them disconnected, `recalculateSystem` must handle broken chains.

        this.syncGraphToArray();
        this.persist();
    }

    removeLastSystemComponent() {
        this.saveState('Removed last component');
        const graph = this.getGraph();
        const nodeIds = Object.keys(graph.nodes);
        if (nodeIds.length === 0) return;

        // Find a leaf node (no outgoing edges)
        const leafId = nodeIds.reverse().find(id => !graph.edges.find(e => e.from === id));
        if (leafId) {
            delete graph.nodes[leafId];
            graph.edges = graph.edges.filter(e => e.from !== leafId && e.to !== leafId);
        } else {
            // Fallback if no leaf found (e.g. cycle, which shouldn't happen)
            const lastId = nodeIds[nodeIds.length - 1];
            delete graph.nodes[lastId];
            graph.edges = graph.edges.filter(e => e.from !== lastId && e.to !== lastId);
        }

        this.syncGraphToArray();
        this.persist();
    }

    clearSystem() {
        this.saveState('Cleared system');
        this.state.graph = { nodes: {}, edges: [] };
        this.state.systemComponents = [];
        this.state.correctionTargetId = null;
        this.persist();
    }

    getSystemComponent(id) {
        return this.getGraph().nodes[id] || this.state.systemComponents.find(c => c.id === id);
    }

    updateSystemComponent(id, newData) {
        this.saveState(`Updated component ${newData.name}`);
        const graph = this.getGraph();
        if (graph.nodes[id]) {
            graph.nodes[id] = { ...graph.nodes[id], ...newData };
            this.syncGraphToArray();
            this.persist();
        } else {
            // Fallback for array
            const index = this.state.systemComponents.findIndex(c => c.id === id);
            if (index !== -1) {
                this.state.systemComponents[index] = { ...this.state.systemComponents[index], ...newData };
                this.persist();
            }
        }
    }

    // Temporary helper to keep the array synced for UI rendering until UI is fully graph-aware
    syncGraphToArray() {
        const graph = this.getGraph();
        const nodes = graph.nodes;
        const edges = graph.edges;

        let ordered = [];
        const visited = new Set();

        const traverse = (nodeId) => {
            if (!visited.has(nodeId) && nodes[nodeId]) {
                visited.add(nodeId);
                ordered.push(nodes[nodeId]);

                // Follow all outgoing edges
                const outgoingEdges = edges.filter(e => e.from === nodeId);
                // Prefer main 'outlet' first
                outgoingEdges.sort((a, b) => a.fromPort === 'outlet' ? -1 : 1).forEach(e => {
                    traverse(e.to);
                });
            }
        };

        // Find root nodes (no incoming edges)
        const rootNodes = Object.keys(nodes).filter(id => !edges.find(e => e.to === id));
        rootNodes.forEach(id => traverse(id));

        // Add any remaining disconnected stranded nodes
        for (const id in nodes) {
            if (!visited.has(id)) {
                traverse(id);
            }
        }

        this.state.systemComponents = ordered;
    }

    // Build a nested tree representation of the graph
    getSystemTree() {
        const graph = this.getGraph();
        const nodes = graph.nodes;
        const edges = graph.edges;
        const visited = new Set();

        const buildTree = (nodeId) => {
            if (visited.has(nodeId)) return null; // Avoid cycles
            const node = nodes[nodeId];
            if (!node) return null;

            visited.add(nodeId);
            const treeNode = { ...node, children: {} };

            // Find all outgoing edges from this node
            const outgoingEdges = edges.filter(e => e.from === nodeId);

            // For each edge, attach the child to the corresponding port
            outgoingEdges.forEach(edge => {
                const childTree = buildTree(edge.to);
                if (childTree) {
                    if (!treeNode.children[edge.fromPort]) {
                        treeNode.children[edge.fromPort] = [];
                    }
                    treeNode.children[edge.fromPort].push(childTree);
                }
            });

            return treeNode;
        };

        // Find root nodes (no incoming edges)
        const roots = Object.keys(nodes).filter(id => !edges.find(e => e.to === id));
        let treeRoots = roots.map(rootId => buildTree(rootId)).filter(Boolean);

        // Append any stranded nodes that were not reached as additional roots
        for (const id in nodes) {
            if (!visited.has(id)) {
                let strandedTree = buildTree(id);
                if (strandedTree) treeRoots.push(strandedTree);
            }
        }

        return treeRoots;
    }

    // System Components (Legacy array accessors) - keeping interface identical to not break UI instantly
    getSystemComponents() {
        if (!this.state.graph) this.state.graph = { nodes: {}, edges: [] };
        if (Object.keys(this.state.graph.nodes).length > 0 && this.state.systemComponents.length === 0) {
            this.syncGraphToArray();
        }
        return this.state.systemComponents;
    }

    setSystemComponents(comps) {
        this.saveState('Set system components');
        // Rebuild graph from array sequence
        this.state.graph = { nodes: {}, edges: [] };
        comps.forEach((c, index) => {
            this.state.graph.nodes[c.id] = c;
            if (index > 0) {
                this.state.graph.edges.push({
                    from: comps[index - 1].id,
                    fromPort: 'outlet',
                    to: c.id,
                    toPort: 'inlet'
                });
            }
        });
        this.state.systemComponents = comps;
        this.persist();
    }

    // Duct Result
    getDuctResult() { return this.state.ductResult; }
    setDuctResult(res) {
        // We typically don't undo/redo calculation results unless they impact global state?
        // Let's not save history for this temporary calculation result, but stick it in state.
        this.state.ductResult = res;
        // No persist needed for transient calculation result? Or maybe yes if we want to restore exact screen.
        // For now, let's keep it transient.
    }

    // Correction Target
    getCorrectionTargetId() { return this.state.correctionTargetId; }
    setCorrectionTargetId(id) {
        this.state.correctionTargetId = id;
        // No history save for UI selection state change? Or yes?
        // Usually selection changes shouldn't trigger undo stack pushes.
    }

    // Project Meta (New)
    setProjectParams(params) {
        // params: { projectName, startAirflow, systemType, temperature }
        // We only save history if meaningful change? 
        // For inputs, we might not want to save on every keypress. 
        // Let's assume this is called on specific actions or blur.
        Object.assign(this.state, params);
        this.persist();
    }

    notifyChange() {
        // Dispatch custom event for UI updates if needed
        window.dispatchEvent(new CustomEvent('stateChanged', { detail: this.state }));
    }
}

// Singleton Instance
export const stateManager = new StateManager();

// --- Exported Wrappers (Backward Compatibility) ---

export function getFittings() { return stateManager.getFittings(); }
export function addFitting(fitting) { stateManager.addFitting(fitting); }
export function removeFitting(id) { stateManager.removeFitting(id); }
export function resetFittings() { stateManager.resetFittings(); }

export function getSystemComponents() { return stateManager.getSystemComponents(); }
export function addSystemComponent(comp) {
    console.log('Wrapper: addSystemComponent called', comp);
    stateManager.addSystemComponent(comp);
}
export function removeLastSystemComponent() { stateManager.removeLastSystemComponent(); }
export function clearSystem() { stateManager.clearSystem(); }
export function setSystemComponents(comps) { stateManager.setSystemComponents(comps); }
export function getSystemComponent(id) { return stateManager.getSystemComponent(id); }
export function updateSystemComponent(id, newData) { stateManager.updateSystemComponent(id, newData); }
export function deleteSystemComponent(id) { stateManager.removeSystemComponent(id); }

export function getDuctResult() { return stateManager.getDuctResult(); }
export function setDuctResult(res) { stateManager.setDuctResult(res); }

export function getCorrectionTargetId() { return stateManager.getCorrectionTargetId(); }
export function setCorrectionTargetId(id) { stateManager.setCorrectionTargetId(id); }

// --- New Undo/Redo Exports ---
export const undo = () => stateManager.undo();
export const redo = () => stateManager.redo();
export const canUndo = () => stateManager.history.length > 0;
export const canRedo = () => stateManager.future.length > 0;

