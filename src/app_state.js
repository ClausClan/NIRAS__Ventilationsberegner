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
            systemComponents: [],
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

    // System Components
    getSystemComponents() { return this.state.systemComponents; }
    addSystemComponent(comp) {
        console.log('StateManager: addSystemComponent called', comp);
        this.saveState(`Added component ${comp.name}`);
        if (!this.state.systemComponents) this.state.systemComponents = [];
        this.state.systemComponents.push(comp);
        this.persist();
    }
    removeLastSystemComponent() {
        this.saveState('Removed last component');
        this.state.systemComponents.pop();
        this.persist();
    }
    clearSystem() {
        this.saveState('Cleared system');
        this.state.systemComponents = [];
        this.state.correctionTargetId = null;
        this.persist();
    }
    setSystemComponents(comps) {
        this.saveState('Set system components');
        this.state.systemComponents = comps;
        this.persist();
    }
    getSystemComponent(id) {
        return this.state.systemComponents.find(c => c.id === id);
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

export function getDuctResult() { return stateManager.getDuctResult(); }
export function setDuctResult(res) { stateManager.setDuctResult(res); }

export function getCorrectionTargetId() { return stateManager.getCorrectionTargetId(); }
export function setCorrectionTargetId(id) { stateManager.setCorrectionTargetId(id); }

// --- New Undo/Redo Exports ---
export const undo = () => stateManager.undo();
export const redo = () => stateManager.redo();
export const canUndo = () => stateManager.history.length > 0;
export const canRedo = () => stateManager.future.length > 0;

