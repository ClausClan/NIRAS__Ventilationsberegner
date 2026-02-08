
let fittingsList = [];
let systemComponents = [];
let ductResult = null;
let correctionTargetId = null;

// --- Fittings ---
export function getFittings() { return fittingsList; }
export function addFitting(fitting) { fittingsList.push(fitting); }
export function removeFitting(id) {
    fittingsList = fittingsList.filter(f => f.id !== id);
    // Logic to removing paired components (like T-pieces)
    if (fittingsList.find(f => f.id === id + 1 || f.id === id - 1)) {
        fittingsList = fittingsList.filter(f => f.id !== id + 1 && f.id !== id - 1);
    }
}
export function resetFittings() { fittingsList = []; }

// --- System Components ---
export function getSystemComponents() { return systemComponents; }
export function addSystemComponent(comp) { systemComponents.push(comp); }
export function removeLastSystemComponent() { systemComponents.pop(); }
export function clearSystem() { systemComponents = []; correctionTargetId = null; }
export function setSystemComponents(comps) { systemComponents = comps; }
export function getSystemComponent(id) { return systemComponents.find(c => c.id === id); }

// --- Duct Result ---
export function getDuctResult() { return ductResult; }
export function setDuctResult(res) { ductResult = res; }

// --- Correction Target ---
export function getCorrectionTargetId() { return correctionTargetId; }
export function setCorrectionTargetId(id) { correctionTargetId = id; }
