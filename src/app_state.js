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
        console.log('StateManager: addSystemComponent (Graph) called', comp.name);
        this.saveState(`Added component ${comp.name}`);

        const graph = this.getGraph();
        graph.nodes[comp.id] = comp;

        // If no parentId is provided, and we have existing nodes, we try to append to the "last" one for linear compat.
        if (!parentId && Object.keys(graph.nodes).length > 1) {
            // Find a node that has no outgoing edges from its main outlet
            const targetParentId = Object.keys(graph.nodes).find(id => {
                const node = graph.nodes[id];
                return id !== comp.id && !graph.edges.find(e => e.from === id && e.fromPort === 'outlet');
            });
            if (targetParentId) {
                parentId = targetParentId;
            }
        }

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
        let currentId = null;

        // Find start node (no incoming edges)
        const startNodes = Object.keys(nodes).filter(id => !edges.find(e => e.to === id));

        // If multiple starts, just pick the first one for the linear array representation.
        // Ideally there's only one start node connected to the main topological path.
        if (startNodes.length > 0) {
            currentId = startNodes[0];
        } else if (Object.keys(nodes).length > 0) {
            currentId = Object.keys(nodes)[0]; // Fallback
        }

        while (currentId && nodes[currentId]) {
            ordered.push(nodes[currentId]);
            // Follow the 'outlet' edge to simulate linear path
            const nextEdge = edges.find(e => e.from === currentId && e.fromPort === 'outlet');
            currentId = nextEdge ? nextEdge.to : null;

            // Prevent infinite loops safely
            if (ordered.length > Object.keys(nodes).length) break;
        }

        // Add any remaining nodes that aren't on the main path just so they exist in the array
        const mainPathIds = new Set(ordered.map(n => n.id));
        for (const id in nodes) {
            if (!mainPathIds.has(id)) {
                ordered.push(nodes[id]);
            }
        }

        this.state.systemComponents = ordered;
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

