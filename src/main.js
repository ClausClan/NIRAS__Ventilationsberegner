// Main application logic - Cache Bust 1
import { parseLocalFloat, getInternalDim, formatLocalFloat } from './utils.js';
import * as physics from './physics.js';
import * as ui from './ui.js';
import {
    getDimFormHtml, getFittingsFormHtml, getProjectModalHtml, getSystemFormHtml,
    renderDuctResult, renderFittingsResult, renderSystem,
    showDuctDetails, showFittingDetails, showSystemComponentDetails, showHelpModal,
    updateFittingTypeOptions, renderFittingInputs, handleComponentTypeChange, renderSystemFittingInputs,
    toggleSystemMenu, printDocumentation, updateDimUI, updateConstraintDefaults, populateDatalists, showConfirm, updateUndoRedoUI, showSaveStatus,
    showEditForm
} from './ui.js';

import {
    addSystemComponent, deleteSystemComponent,
    undo, redo,
    updateSystemComponent, stateManager, removeFitting, resetFittings, getSystemComponents, removeLastSystemComponent, clearSystem, setSystemComponents, getSystemComponent, canUndo, canRedo, addFitting, getCorrectionTargetId, setCorrectionTargetId, setDuctResult
} from './app_state.js';
import { projectManager } from './projects.js';
import { toggleDiagramView, renderDiagram } from './diagram.js';

window.toggleDiagramView = toggleDiagramView;
window.renderDiagram = renderDiagram;

// --- Global Scope for UI interactions ---
window.toggleSystemMenu = ui.toggleSystemMenu;
window.printDocumentation = ui.printDocumentation;
window.showDuctDetails = ui.showDuctDetails;
window.showFittingDetails = ui.showFittingDetails;
window.showSystemComponentDetails = ui.showSystemComponentDetails;
window.showHelpModal = ui.showHelpModal;
window.showConfirm = ui.showConfirm;
window.deleteFitting = removeFitting;
window.resetFittings = () => { resetFittings(); ui.renderFittingsResult(); };

// --- Undo/Redo Logic ---
function handleUndo() {
    if (undo()) {
        ui.renderSystem();
        ui.handleComponentTypeChange();
        ui.updateUndoRedoUI(canUndo(), canRedo());
    }
}

function handleRedo() {
    if (redo()) {
        ui.renderSystem();
        ui.handleComponentTypeChange();
        ui.updateUndoRedoUI(canUndo(), canRedo());
    }
}

// Listen for state changes to update UI (Autosave indicator & Buttons)
window.addEventListener('stateChanged', () => {
    ui.updateUndoRedoUI(canUndo(), canRedo());
    ui.showSaveStatus('Gemt', 'saved');

    // Update Global Inputs from State (for Load/Undo/Redo)
    const state = stateManager.state;
    if (state.projectName) document.getElementById('projectName').value = state.projectName;
    if (state.startAirflow) document.getElementById('system_airflow').value = state.startAirflow;
    if (state.systemType) {
        const radio = document.querySelector(`input[name="systemFlowType"][value="${state.systemType}"]`);
        if (radio) radio.checked = true;
    }
});

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'Z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
    }
});

// Wrapper for deleteFitting to update UI
// Wrapper for deleteFitting to update UI
window.deleteFitting = (id) => {
    removeFitting(id);
    ui.renderFittingsResult();
};

window.handleDeleteLastComponent = () => {
    removeLastSystemComponent();
    ui.renderSystem();
    ui.handleComponentTypeChange(); // Update inputs (e.g. valid options based on new last component)
};

window.handleDeleteComponent = (id) => {
    showConfirm("Er du sikker på, at du vil slette denne komponent? Dette kan påvirke efterfølgende beregninger.", () => {
        deleteSystemComponent(id);
        recalculateSystem(); // Recalculate transitions after deletion
        updateUndoRedoUI(canUndo(), canRedo()); // Antager undo er mulig efter slet
        showSaveStatus('Ændringer gemt');
    });
};

window.handleEditComponent = (id) => {
    showEditForm(id);
};

window.handleUpdateComponent = (id) => {
    const component = getSystemComponent(id);
    if (!component) return;

    const suffix = '_edit';
    let newData = null;

    if (component.type === 'straightDuct') {
        newData = getDuctData(suffix);
    } else if (component.type === 'manualLoss') {
        const name = document.getElementById('manualDescription' + suffix).value;
        const pressureLoss = parseLocalFloat(document.getElementById('manualPressureLoss' + suffix).value);
        newData = {
            type: 'manualLoss',
            name,
            properties: { pressureLoss },
            state: {}
        };
    } else {
        // Fittings
        newData = getFittingData(suffix, component.type);
    }

    if (newData) {
        // Preserve ID
        newData.id = id;

        // Preserve the topological properties from original component
        // which haven't been touched by simple edit yet (we are linear right now)
        newData.inputs = component.inputs;
        newData.outputs = component.outputs;

        updateSystemComponent(id, newData); // Update in state
        ui.showSaveStatus('Komponent opdateret');
        recalculateSystem(); // Trigger full recalculation and transition update
    }
};

// Event Handlers for Global Actions (using showConfirm)
window.clearSystem = (event) => {
    if (event) event.preventDefault();
    showConfirm('Er du sikker på, at du vil starte en ny beregning? Alle data vil gå tabt.', () => {
        clearSystem();
        document.getElementById('projectName').value = '';
        ui.renderSystem();
        ui.handleComponentTypeChange();
    });
};

window.saveSystem = (event) => {
    if (event) event.preventDefault();
    const systemComponents = getSystemComponents();
    const data = {
        projectName: document.getElementById('projectName').value,
        startAirflow: document.getElementById('system_airflow').value,
        systemType: document.querySelector('input[name="systemFlowType"]:checked').value,
        components: systemComponents,
        timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ventilations_system_${data.projectName || 'unnamed'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    ui.toggleSystemMenu();
};

window.triggerFileLoad = (event) => {
    if (event) event.preventDefault();
    document.getElementById('fileLoader').click();
    ui.toggleSystemMenu();
};

window.requestCorrection = (id) => {
    setCorrectionTargetId(id);
    document.getElementById('systemComponentType').value = 'manualLoss';
    ui.handleComponentTypeChange();
    document.getElementById('systemComponentType').scrollIntoView({ behavior: 'smooth' });
    // Highlight inputs
    setTimeout(() => {
        document.getElementById('manualLossName').value = "Korrektion";
        document.getElementById('manualLossName').focus();
    }, 100);
};

// --- Event Handlers ---

function handleDuctCalculation(event) {
    event.preventDefault();
    const dimResultsContainer = document.getElementById('dim_resultsContainer');
    dimResultsContainer.innerHTML = '';
    try {
        const temp = parseLocalFloat(document.getElementById('temperature').value);
        if (isNaN(temp)) throw new Error("Ugyldig temperatur.");
        const { RHO, NU } = physics.getAirProperties(temp);
        const airflow_m3h = parseLocalFloat(document.getElementById('dim_airflow').value);
        if (isNaN(airflow_m3h) || airflow_m3h <= 0) throw new Error("Ugyldig luftmængde.");
        const Q = airflow_m3h / 3600;
        const mode = document.querySelector('input[name="calculationMode"]:checked').value;
        const shape = document.querySelector('input[name="ductShape"]:checked').value;

        let result;
        if (mode === 'calculate') {
            const constraintType = document.getElementById('constraintType').value;
            const constraintValue = parseLocalFloat(document.getElementById('constraintValue').value);
            const aspectRatio = parseLocalFloat(document.getElementById('aspectRatio').value);
            result = physics.calculateDimensions(Q, shape, airflow_m3h, RHO, NU, constraintType, constraintValue, aspectRatio);
        } else {
            const diameter = parseLocalFloat(document.getElementById('diameter').value);
            const sideA = parseLocalFloat(document.getElementById('sideA').value);
            const sideB = parseLocalFloat(document.getElementById('sideB').value);
            result = physics.analyzeDuct(Q, shape, airflow_m3h, RHO, NU, diameter, sideA, sideB);
        }

        setDuctResult(result);
        ui.renderDuctResult(result);
    } catch (error) {
        dimResultsContainer.innerHTML = `<div class="error-message">Fejl: ${error.message}</div>`;
    }
}

function handleFittingCalculation(event) {
    event.preventDefault();
    const fittingsResultsContainer = document.getElementById('fittings_resultsContainer');
    fittingsResultsContainer.innerHTML = '';
    try {
        const temp = parseLocalFloat(document.getElementById('temperature').value);
        if (isNaN(temp)) throw new Error("Ugyldig temperatur.");
        const { RHO, NU } = physics.getAirProperties(temp);
        const type = document.getElementById('fittingType').value;
        const globalFlowType = document.querySelector('input[name="fitFlowType"]:checked').value;

        if (type.startsWith('tee')) {
            const isBullhead = type === 'tee_bullhead';
            const isSym = type === 'tee_sym';

            if (isBullhead) {
                const flowType = document.querySelector('input[name="fitTeeFlowType"]:checked').value;
                if (flowType === 'splitting') {
                    const q_in = parseLocalFloat(document.getElementById('q_in').value), q_out1 = parseLocalFloat(document.getElementById('q_out1').value), q_out2 = parseLocalFloat(document.getElementById('q_out2').value);
                    if (Math.abs(q_in - (q_out1 + q_out2)) > 1) throw new Error("Luftmængderne stemmer ikke overens (Ind ≈ Ud 1 + Ud 2).");
                    const d_in = parseLocalFloat(document.getElementById('d_in').value), d_out1 = parseLocalFloat(document.getElementById('d_out1').value), d_out2 = parseLocalFloat(document.getElementById('d_out2').value);
                    if (isNaN(d_in) || isNaN(d_out1) || isNaN(d_out2)) throw new Error("Ugyldige diametre.");
                    const results = physics.calculateBullheadTeeLoss({ q_in, q_out1, q_out2 }, { d_in, d_out1, d_out2 }, RHO);
                    addFitting({ id: Date.now(), name: `Dobbelt Afgr. (Ud 1)`, airflow: q_out1, pressureLoss: results.loss1, details: results.details1, type: 'tee' });
                    addFitting({ id: Date.now() + 1, name: `Dobbelt Afgr. (Ud 2)`, airflow: q_out2, pressureLoss: results.loss2, details: results.details2, type: 'tee' });
                } else { // merging
                    const q_in1 = parseLocalFloat(document.getElementById('q_in1').value), q_in2 = parseLocalFloat(document.getElementById('q_in2').value);
                    const d_common = parseLocalFloat(document.getElementById('d_common').value), d_in1 = parseLocalFloat(document.getElementById('d_in1').value), d_in2 = parseLocalFloat(document.getElementById('d_in2').value);
                    const results = physics.calculateConvergingBullheadTeeLoss({ q_in1, q_in2 }, { d_in1, d_in2, d_common }, RHO);
                    addFitting({ id: Date.now(), name: `Dobbelt Afgr. (Ind 1)`, airflow: q_in1, pressureLoss: results.loss1, details: results.details1, type: 'tee' });
                    addFitting({ id: Date.now() + 1, name: `Dobbelt Afgr. (Ind 2)`, airflow: q_in2, pressureLoss: results.loss2, details: results.details2, type: 'tee' });
                }
            } else { // Standard Tees
                const flowType = document.querySelector('input[name="fitTeeFlowType"]:checked').value;
                if (flowType === 'splitting') {
                    const q_in = parseLocalFloat(document.getElementById('q_in').value), q_straight = parseLocalFloat(document.getElementById('q_straight').value), q_branch = parseLocalFloat(document.getElementById('q_branch').value);
                    if (Math.abs(q_in - (q_straight + q_branch)) > 1) throw new Error("Luftmængderne stemmer ikke overens (Ind ≈ Ligeud + Afgrening).");
                    const d_in = parseLocalFloat(document.getElementById('d_in').value);
                    const d_straight = isSym ? d_in : parseLocalFloat(document.getElementById('d_straight').value);
                    const d_branch = isSym ? d_in : parseLocalFloat(document.getElementById('d_branch').value);
                    const results = physics.calculateTeePressureLoss({ q_in, q_straight, q_branch }, { d_in, d_straight, d_branch }, RHO);
                    const name_base = isSym ? `T-stykke Sym. Ø${d_in}` : `T-stykke Asym.`;
                    addFitting({ id: Date.now(), name: `${name_base} (Ligeud)`, airflow: q_straight, pressureLoss: results.loss_straight, details: results.details_straight, type: 'tee' });
                    addFitting({ id: Date.now() + 1, name: `${name_base} (Afgrening)`, airflow: q_branch, pressureLoss: results.loss_branch, details: results.details_branch, type: 'tee' });
                } else { // merging
                    const q_straight = parseLocalFloat(document.getElementById('q_straight').value), q_branch = parseLocalFloat(document.getElementById('q_branch').value);
                    const d_common = parseLocalFloat(document.getElementById('d_in').value);
                    const d_straight = isSym ? d_common : parseLocalFloat(document.getElementById('d_straight').value);
                    const d_branch = isSym ? d_common : parseLocalFloat(document.getElementById('d_branch').value);
                    const results = physics.calculateConvergingTeePressureLoss({ q_straight, q_branch }, { d_common, d_straight, d_branch }, RHO);
                    const name_base = isSym ? `T-stykke Udsugning Sym. Ø${d_common}` : `T-stykke Udsugning Asym.`;
                    addFitting({ id: Date.now(), name: `${name_base} (fra Ligeud)`, airflow: q_straight, pressureLoss: results.loss_straight, details: results.details_straight, type: 'tee' });
                    addFitting({ id: Date.now() + 1, name: `${name_base} (fra Afgrening)`, airflow: q_branch, pressureLoss: results.loss_branch, details: results.details_branch, type: 'tee' });
                }
            }
        } else {
            // Standard Fittings
            const q_m3h = parseLocalFloat(document.getElementById('fit_airflow').value);
            if (isNaN(q_m3h) || q_m3h <= 0) throw new Error("Ugyldig luftmængde.");
            const Q = q_m3h / 3600;
            let name, zeta, A, v, d_hyd, Pdyn_Pa, loss, details = {};

            switch (type) {
                case 'bend_circ': {
                    const d = parseLocalFloat(document.getElementById('d').value);
                    const angle = parseLocalFloat(document.getElementById('angle').value);
                    const radius = parseLocalFloat(document.getElementById('radius').value);
                    if (isNaN(d) || isNaN(radius) || d <= 0) throw new Error("Ugyldig diameter eller radius.");
                    const rd_ratio = radius / d;
                    const rd_key = rd_ratio < 1.25 ? "rd1_0" : "rd1_5";
                    zeta = physics.interpolateValue(angle, d, physics.CIRCULAR_BEND_ZETA[rd_key]);
                    d_hyd = getInternalDim(d) / 1000;
                    A = Math.PI * (d_hyd / 2) ** 2;
                    v = Q / A;
                    name = `Bøjning Cirk. Ø${d} (R=${radius}mm)`;
                    break;
                }
                case 'bend_rect': {
                    const h = parseLocalFloat(document.getElementById('h').value);
                    const w = parseLocalFloat(document.getElementById('w').value);
                    const angle_r = parseLocalFloat(document.getElementById('angle').value);
                    const radius = parseLocalFloat(document.getElementById('radius').value);
                    const rh_ratio = radius / h;
                    const hw_ratio = h / w;
                    const zeta_base = physics.interpolateValue(hw_ratio, rh_ratio, physics.RECTANGULAR_BEND_ZETA.mainTable);
                    const k_factor = physics.interpolateValue(angle_r, null, physics.RECTANGULAR_BEND_ZETA.kFactor);
                    zeta = zeta_base * k_factor;
                    let h_int = getInternalDim(h) / 1000, w_int = getInternalDim(w) / 1000;
                    d_hyd = (2 * h_int * w_int) / (h_int + w_int);
                    A = Math.PI * (d_hyd / 2) ** 2;
                    v = Q / A;
                    name = `Bøjning Rekt. ${h}x${w} (R=${radius}mm)`;
                    break;
                }
                // ... Add other cases (expansion, contraction, transitions) similar to original handleFittingCalculation
                case 'expansion':
                case 'contraction': {
                    const isExpansion = type === 'expansion';
                    const d1 = parseLocalFloat(document.getElementById('d1').value);
                    const d2 = parseLocalFloat(document.getElementById('d2').value);
                    let angle;
                    const geoType = document.querySelector('input[name="geo_type"]:checked').value;
                    if (geoType === 'angle') {
                        angle = parseLocalFloat(document.getElementById('angle').value);
                    } else {
                        const length = parseLocalFloat(document.getElementById('length').value);
                        const radiusDiff = Math.abs(d1 - d2) / 2;
                        angle = 2 * (Math.atan(radiusDiff / length) * (180 / Math.PI));
                    }
                    const A1 = Math.PI * (getInternalDim(d1) / 2000) ** 2, A2 = Math.PI * (getInternalDim(d2) / 2000) ** 2;
                    const area_ratio = A2 / A1;
                    const zeta_table = isExpansion ? physics.EXPANSION_ZETA : physics.CONTRACTION_ZETA;
                    zeta = physics.interpolateValue(angle, area_ratio, zeta_table);
                    A = isExpansion ? A1 : A2;
                    v = Q / A;
                    name = `${isExpansion ? 'Udvidelse' : 'Indsnævring'} Cirk. Ø${d1} -> Ø${d2}`;
                    break;
                }
                case 'expansion_rect':
                case 'contraction_rect': {
                    const isExpansion = type === 'expansion_rect';
                    const h1 = parseLocalFloat(document.getElementById('h1').value), w1 = parseLocalFloat(document.getElementById('w1').value);
                    const h2 = parseLocalFloat(document.getElementById('h2').value), w2 = parseLocalFloat(document.getElementById('w2').value);
                    let angle;
                    const geoType = document.querySelector('input[name="geo_type"]:checked').value;
                    if (geoType === 'angle') {
                        angle = parseLocalFloat(document.getElementById('angle').value);
                    } else {
                        const length = parseLocalFloat(document.getElementById('length').value);
                        const hDiff = Math.abs(h1 - h2) / 2;
                        const wDiff = Math.abs(w1 - w2) / 2;
                        const angleH = 2 * (Math.atan(hDiff / length) * (180 / Math.PI));
                        const angleW = 2 * (Math.atan(wDiff / length) * (180 / Math.PI));
                        angle = Math.max(angleH, angleW);
                    }
                    const A1 = (getInternalDim(h1) / 1000) * (getInternalDim(w1) / 1000);
                    const A2 = (getInternalDim(h2) / 1000) * (getInternalDim(w2) / 1000);
                    const area_ratio = A2 / A1;
                    const zeta_table = isExpansion ? physics.RECT_EXPANSION_ZETA : physics.RECT_CONTRACTION_ZETA;
                    zeta = physics.interpolateValue(angle, area_ratio, zeta_table);
                    A = isExpansion ? A1 : A2;
                    v = Q / A;
                    name = `${isExpansion ? 'Udvidelse' : 'Indsnævring'} Rekt. ${h1}x${w1} -> ${h2}x${w2}`;
                    break;
                }
                case 'transition_round_rect':
                case 'transition_rect_round': {
                    const d = parseLocalFloat(document.getElementById('d').value);
                    const h = parseLocalFloat(document.getElementById('h').value);
                    const w = parseLocalFloat(document.getElementById('w').value);
                    const A_round = Math.PI * (getInternalDim(d) / 2000) ** 2;
                    const A_rect = (getInternalDim(h) / 1000) * (getInternalDim(w) / 1000);
                    const A1 = (type === 'transition_round_rect') ? A_round : A_rect;
                    const A2 = (type === 'transition_round_rect') ? A_rect : A_round;
                    const isExpansion = A2 > A1;
                    const area_ratio = A1 / A2;
                    let angle;
                    const geoType = document.querySelector('input[name="geo_type"]:checked').value;
                    if (geoType === 'angle') {
                        angle = parseLocalFloat(document.getElementById('angle').value);
                    } else {
                        const length = parseLocalFloat(document.getElementById('length').value);
                        const d_eq_rect = (2 * (getInternalDim(h) / 1000) * (getInternalDim(w) / 1000)) / ((getInternalDim(h) / 1000) + (getInternalDim(w) / 1000));
                        const d_eq_circ = getInternalDim(d) / 1000;
                        const radiusDiff = Math.abs(d_eq_circ - d_eq_rect) / 2;
                        angle = 2 * (Math.atan(radiusDiff / (length / 1000)) * (180 / Math.PI));
                    }
                    let zeta_table;
                    if (type === 'transition_rect_round' && globalFlowType === 'splitting') zeta_table = physics.RECT_TO_ROUND_SUPPLY_ZETA;
                    else if (type === 'transition_round_rect' && globalFlowType === 'merging') zeta_table = physics.ROUND_TO_RECT_EXHAUST_ZETA;
                    else throw new Error(`Data mangler for denne specifikke kombination (${type}, ${globalFlowType}).`);
                    zeta = physics.interpolateValue(angle, area_ratio, zeta_table);
                    A = isExpansion ? A1 : A2;
                    v = Q / A;
                    name = (type === 'transition_round_rect') ? `Overgang Ø${d} -> ${h}x${w}` : `Overgang ${h}x${w} -> Ø${d}`;
                    break;
                }
            }

            Pdyn_Pa = (RHO / 2) * v ** 2;
            loss = zeta * Pdyn_Pa;
            details = { zeta, Pdyn_Pa, A_m2: A, v_ms: v };
            addFitting({ id: Date.now(), name, airflow: q_m3h, pressureLoss: loss, details, type: 'standard' });
        }
        ui.renderFittingsResult();
    } catch (error) {
        fittingsResultsContainer.innerHTML = `<div class="error-message">Fejl: ${error.message}</div>`;
    }
}

// Helper to create a transition component
function createTransitionComponent(lastOutlet, newInlet, airflow, globalFlowType, previousComponent) {
    if (!lastOutlet || !newInlet) return null;

    let needsTransition = false;

    if (lastOutlet.shape === 'round' && newInlet.shape === 'round') {
        if (lastOutlet.d !== newInlet.d) needsTransition = true;
    } else if (lastOutlet.shape === 'rect' && newInlet.shape === 'rect') {
        if (lastOutlet.h !== newInlet.h || lastOutlet.w !== newInlet.w) needsTransition = true;
    } else if (lastOutlet.shape !== newInlet.shape) {
        needsTransition = true;
    }

    if (!needsTransition) return null;

    // Calc Properties
    const temp = parseLocalFloat(document.getElementById('temperature').value);
    const { RHO, NU } = physics.getAirProperties(temp);
    const Q = airflow / 3600;

    let A1, A2, d1, d2, h1, w1, h2, w2, type, name, details;
    let isEstimated = false;
    const angle = 30; // Standard 30 grader

    if (lastOutlet.shape === 'round') { A1 = Math.PI * (getInternalDim(lastOutlet.d) / 2000) ** 2; d1 = lastOutlet.d; }
    else { A1 = (getInternalDim(lastOutlet.h) / 1000) * (getInternalDim(lastOutlet.w) / 1000); h1 = lastOutlet.h; w1 = lastOutlet.w; }
    if (newInlet.shape === 'round') { A2 = Math.PI * (getInternalDim(newInlet.d) / 2000) ** 2; d2 = newInlet.d; }
    else { A2 = (getInternalDim(newInlet.h) / 1000) * (getInternalDim(newInlet.w) / 1000); h2 = newInlet.h; w2 = newInlet.w; }

    const isExpansion = A2 > A1;
    const area_ratio = A1 / A2;
    let zeta_table;

    // Logic to choose table based on types
    if (lastOutlet.shape === 'round' && newInlet.shape === 'rect') {
        type = 'transition_round_rect'; name = 'OBS: Overgang (auto)'; details = `fra Ø${d1} til ${h2}x${w2}`;
        if (globalFlowType === 'merging') zeta_table = physics.ROUND_TO_RECT_EXHAUST_ZETA;
        else { zeta_table = isExpansion ? physics.EXPANSION_ZETA : physics.CONTRACTION_ZETA; isEstimated = true; }
    } else if (lastOutlet.shape === 'rect' && newInlet.shape === 'round') {
        type = 'transition_rect_round'; name = 'OBS: Overgang (auto)'; details = `fra ${h1}x${w1} til Ø${d2}`;
        if (globalFlowType === 'splitting') zeta_table = physics.RECT_TO_ROUND_SUPPLY_ZETA;
        else { zeta_table = isExpansion ? physics.EXPANSION_ZETA : physics.CONTRACTION_ZETA; isEstimated = true; }
    } else if (lastOutlet.shape === 'round' && newInlet.shape === 'round') {
        type = isExpansion ? 'expansion' : 'contraction';
        zeta_table = isExpansion ? physics.EXPANSION_ZETA : physics.CONTRACTION_ZETA;
        name = isExpansion ? 'OBS: Udvidelse (auto)' : 'OBS: Indsnævring (auto)'; details = `fra Ø${d1} til Ø${d2}`;
    } else { // rect to rect
        type = isExpansion ? 'expansion_rect' : 'contraction_rect';
        zeta_table = isExpansion ? physics.RECT_EXPANSION_ZETA : physics.RECT_CONTRACTION_ZETA;
        name = isExpansion ? 'OBS: Udvidelse (auto)' : 'OBS: Indsnævring (auto)'; details = `fra ${h1}x${w1} til ${h2}x${w2}`;
    }

    if (isEstimated) details += ' (Estimeret)';

    const zeta = physics.interpolateValue(angle, area_ratio, zeta_table);
    const A_ref = isExpansion ? A1 : A2;
    const v = Q / A_ref;
    const Pdyn_Pa = (RHO / 2) * v ** 2;
    const pressureLoss = zeta * Pdyn_Pa;

    // Generate unique ID
    const uniqueId = 'transition_' + Date.now() + Math.floor(Math.random() * 1000);

    const transitionComponent = {
        id: uniqueId,
        type: type,
        name: name,
        details: details,
        isAutoGenerated: true,
        properties: {
            angle,
            area_ratio,
            isEstimated,
            inletShape: lastOutlet.shape,
            outletShape: newInlet.shape
        },
        state: {
            airflow_in: airflow,
            airflow_out: { 'outlet': airflow },
            velocity: v,
            pressureLoss: pressureLoss,
            zeta: zeta,
            calculationDetails: { Q_m3s: Q, A_m2: A_ref, v_ms: v, zeta: zeta, Pdyn_Pa: Pdyn_Pa, type: type, angle: angle },
            outletDimension: { 'outlet': newInlet },
            inletDimension: lastOutlet
        }
    };

    return transitionComponent;
}

// Helper to read inputs and create component object
function createComponentFromInputs(suffix = '', previousComponent = null) {
    const s = (id) => {
        const el = document.getElementById(id + suffix);
        return el ? el.value : '';
    };
    const f = (id) => parseLocalFloat(s(id));
    const radio = (name) => {
        const el = document.querySelector(`input[name="${name}${suffix}"]:checked`);
        return el ? el.value : null;
    };

    // Determine type - for Add it's from the main select, for Edit we need to infer or pass it?
    // For now, assume if suffix is empty, we use main select.
    // If suffix is '_edit', we might need to look at what's rendered. 
    // BUT 'systemComponentType' ID is not suffixed in the main view.
    // In ShowEditForm, we don't render a generic type selector, we render the specific form.
    // So we need to look for specific hidden fields or infer from what inputs are present?
    // OR we pass the type in.

    // Let's assume we read the type from the context.
    // If we are in Edit mode, the type is fixed (mostly).
    // Let's try to detect type from presence of inputs if possible, or pass it.
    // Actually, passing type is cleaner. But `handleAddComponent` reads it from DOM.

    let componentType = s('systemComponentType');
    // If undefined (e.g. edit mode might not have this input), we need another way.
    // In edit mode, we can trust the 'Update' handler to know the type or find it.

    // Let's defer type detection to the caller or improve this later.
    // For now, let's assume we are calling this from handleAddComponent context mostly.

    // WAIT. Reuse is hard if structure differs.
    // In `showEditForm`, we render `renderSystemDuctInputs`. 
    // That creates `ductLength_edit`, `sysDuctShape_edit` etc.
    // It DOES NOT create `systemComponentType_edit`.

    // So I should pass type to this function.
    return { s, f, radio }; // Returning helpers for now to refactor iteratively
}

// ... Refactoring implies I replace the big chunk in handleAddComponent.
// I will start by refactoring handleAddComponent to use these helpers inside itself first?
// No, that's waste.

function getDuctData(suffix) {
    const elLength = document.getElementById('ductLength' + suffix);
    if (!elLength) return null; // Not duct inputs

    const length = parseLocalFloat(elLength.value);
    const shape = document.querySelector(`input[name="sysDuctShape${suffix}"]:checked`).value;

    let properties = { type: 'straightDuct', shape, length };
    let name, details;

    if (shape === 'round') {
        const diameter = parseLocalFloat(document.getElementById('ductDiameter' + suffix).value);
        properties.diameter = diameter;
        properties.d = diameter; // Ensure alias
        name = `Lige Kanal Ø${diameter}`; details = `${length}m`;
    } else {
        const sideA = parseLocalFloat(document.getElementById('ductSideA' + suffix).value);
        const sideB = parseLocalFloat(document.getElementById('ductSideB' + suffix).value);
        properties.sideA = sideA;
        properties.sideB = sideB;
        properties.h = sideA; // Ensure alias
        properties.w = sideB; // Ensure alias
        name = `Lige Kanal ${sideA}x${sideB}`; details = `${length}m`;
    }

    // Termodynamik & Isolering
    const elAmbient = document.getElementById('ductAmbient' + suffix);
    if (elAmbient && elAmbient.value !== '') properties.ambientTemp = parseLocalFloat(elAmbient.value);

    const elIsoThick = document.getElementById('ductIsoThick' + suffix);
    if (elIsoThick && elIsoThick.value !== '') properties.isoThick = parseLocalFloat(elIsoThick.value);

    const elIsoLambda = document.getElementById('ductIsoLambda' + suffix);
    if (elIsoLambda && elIsoLambda.value !== '') properties.isoLambda = parseLocalFloat(elIsoLambda.value);

    return {
        type: properties.type,
        name,
        details,
        properties,
        // state will be populated by recalculateSystem
        state: {}
    };
}

function getFittingData(suffix, typeOverride = null) {
    const typeSelect = document.getElementById('systemFittingType' + suffix);
    const fittingType = typeOverride || (typeSelect ? typeSelect.value : null);

    if (!fittingType) return null;

    let name, details, properties = { type: fittingType };

    const s = (id) => document.getElementById(id + suffix).value;
    const f = (id) => parseLocalFloat(s(id));
    const radio = (n) => {
        const el = document.querySelector(`input[name="${n}${suffix}"]:checked`);
        return el ? el.value : null;
    };

    switch (fittingType) {
        case 'bend_circ': {
            properties.d = f('sys_d');
            properties.angle = f('sys_angle');
            properties.rd = f('sys_rd');
            name = `Bøjning Cirk. Ø${properties.d}`;
            details = `${properties.angle}° R=${properties.rd * properties.d}mm`;
            break;
        }
        case 'bend_rect': {
            properties.h = f('sys_h');
            properties.w = f('sys_w');
            properties.angle = f('sys_angle_r');
            properties.rh = f('sys_rh');
            name = `Bøjning Rekt. ${properties.h}x${properties.w}`;
            details = `${properties.angle}°`;
            break;
        }
        case 'expansion':
        case 'contraction': {
            const isExpansion = fittingType === 'expansion';
            properties.d1 = f('sys_d1');
            properties.d2 = f('sys_d2');
            properties.angle = f('sys_angle_dim');
            name = isExpansion ? `Udvidelse Ø${properties.d1} -> Ø${properties.d2}` : `Indsnævring Ø${properties.d1} -> Ø${properties.d2}`;
            details = `${properties.angle}°`;
            break;
        }
        case 'tee_sym':
        case 'tee_asym':
        case 'tee_bullhead': {
            const isSym = fittingType === 'tee_sym';
            const isBullhead = fittingType === 'tee_bullhead';

            if (isBullhead) {
                properties.path = radio('sysTeePath'); // path1 or path2
                properties.q_out1 = f('sys_tee_q_out1');
                properties.q_out2 = f('sys_tee_q_out2');
                properties.d_in = f('sys_tee_d_in');
                properties.d_out1 = f('sys_tee_d_out1');
                properties.d_out2 = f('sys_tee_d_out2');

                name = properties.path === 'path1' ? `Dobbelt T (Gren 1)` : `Dobbelt T (Gren 2)`;
                details = `Ø${properties.d_in} -> Ø${properties.d_out1}/Ø${properties.d_out2}`;
            } else {
                properties.flowType = radio('sysTeeFlowType');
                properties.path = radio('sysTeePath'); // straight or branch
                properties.d_in = f('sys_tee_d_in');
                properties.d_straight = isSym ? properties.d_in : f('sys_tee_d_straight');
                properties.d_branch = isSym ? properties.d_in : f('sys_tee_d_branch');

                if (properties.flowType === 'splitting') {
                    properties.q_straight = f('sys_tee_q_straight');
                    properties.q_branch = f('sys_tee_q_branch');
                    name = properties.path === 'straight' ? `T-stykke (Ligeud)` : `T-stykke (Afgrening)`;
                } else { // Merging
                    properties.q_straight = f('sys_tee_q_straight');
                    properties.q_branch = f('sys_tee_q_branch');
                    name = properties.path === 'straight' ? `T-stykke (fra Ligeud)` : `T-stykke (fra Afgrening)`;
                }
            }
            break;
        }
    }

    if (!name && fittingType) return null;

    // Termodynamik & Isolering
    const elAmbient = document.getElementById('sys_ambient' + suffix);
    if (elAmbient && elAmbient.value !== '') properties.ambientTemp = parseLocalFloat(elAmbient.value);

    const elIsoThick = document.getElementById('sys_isoThick' + suffix);
    if (elIsoThick && elIsoThick.value !== '') properties.isoThick = parseLocalFloat(elIsoThick.value);

    const elIsoLambda = document.getElementById('sys_isoLambda' + suffix);
    if (elIsoLambda && elIsoLambda.value !== '') properties.isoLambda = parseLocalFloat(elIsoLambda.value);

    return {
        type: fittingType,
        name,
        details,
        properties,
        state: {} // Populated by physics engine
    };
}


// Function to recalculate the entire system chain based on Graph Topology
function recalculateSystem() {
    const graph = stateManager.getGraph();
    // Filter out auto-generated components to get the "user intent" list
    // In a pure graph, we'd traverse and remove transition nodes first
    const userComponents = Object.values(graph.nodes)
        .filter(c => !c.isAutoGenerated)
        // Rough topological sort for now (linear)
        .sort((a, b) => {
            // VERY naive sort based on ID for now to maintain order
            return a.id.localeCompare(b.id);
        });

    // Reset graph to rebuild with transitions
    stateManager.clearSystem();

    // Safety check for UI elements
    const flowTypeEl = document.querySelector('input[name="systemFlowType"]:checked');
    const globalFlowType = flowTypeEl ? flowTypeEl.value : 'splitting'; // Default

    const startAirflowEl = document.getElementById('system_airflow');
    const startAirflow = startAirflowEl ? parseLocalFloat(startAirflowEl.value) : 1000;

    const tempEl = document.getElementById('temperature');
    const temp = tempEl ? parseLocalFloat(tempEl.value) : 20;

    const ambEl = document.getElementById('ambient_temperature');
    const globalAmbient = ambEl ? parseLocalFloat(ambEl.value) : 20;

    const { RHO, NU } = physics.getAirProperties(temp);

    let currentAirflow = startAirflow;
    let currentTemp = temp;
    let lastOutlet = null;
    let lastNodeId = null;

    userComponents.forEach((component, index) => {
        let incomingFlow = currentAirflow;
        let incomingTemp = currentTemp;

        let newCalc = {};

        const q_m = incomingFlow * RHO / 3600; // kg/s
        const p = component.properties;
        const compAmbient = p.ambientTemp !== undefined ? p.ambientTemp : globalAmbient;
        const isoThick = p.isoThick ? p.isoThick / 1000 : 0; // standard to meters
        const isoLambda = p.isoLambda || 0.037;

        let t_out_val = incomingTemp;
        let q_loss_val = 0;

        // --- 1. Calculate Component Physics based on properties and incoming flow ---
        if (component.type === 'straightDuct') {
            const Q = incomingFlow / 3600;
            let performance, inletDim, outletDim, perimeter;

            if (p.shape === 'round') {
                inletDim = outletDim = { shape: 'round', d: p.diameter };
                performance = physics.getPerformance(Q, p.diameter / 1000, { shape: 'round', a: p.diameter }, RHO, NU);
                perimeter = Math.PI * (p.diameter / 1000);
            } else {
                inletDim = outletDim = { shape: 'rect', h: p.sideA, w: p.sideB };
                performance = physics.getPerformance(Q, 0, { shape: 'rect', a: p.sideA, b: p.sideB }, RHO, NU);
                perimeter = 2 * ((p.sideA / 1000) + (p.sideB / 1000));
            }

            const thermo = physics.calculateTemperatureDrop(incomingTemp, compAmbient, p.length, perimeter, q_m, isoThick, isoLambda);
            t_out_val = thermo.t_out;
            q_loss_val = thermo.q_loss;

            newCalc = {
                airflow_in: incomingFlow,
                airflow_out: { 'outlet': incomingFlow },
                velocity: performance.velocity,
                pressureLoss: performance.pressureDrop * p.length,
                zeta: null,
                inletDimension: inletDim,
                outletDimension: { 'outlet': outletDim },
                calculationDetails: performance,
                temperature_in: incomingTemp,
                temperature_out: { 'outlet': t_out_val },
                heatLoss: q_loss_val
            };
        } else if (component.type === 'manualLoss') {
            const inletDim = lastOutlet || { shape: 'round', d: 0 };
            newCalc = {
                airflow_in: incomingFlow,
                airflow_out: { 'outlet': incomingFlow },
                velocity: null,
                pressureLoss: p.pressureLoss,
                zeta: null,
                inletDimension: inletDim,
                outletDimension: { 'outlet': inletDim },
                calculationDetails: null,
                temperature_in: incomingTemp,
                temperature_out: { 'outlet': t_out_val },
                heatLoss: 0
            };
        } else {
            // Fittings - assume negligible heat loss due to short length for now
            const Q = incomingFlow / 3600;
            let inletDim, outletDim, v, zeta = 0, Pdyn_Pa = 0, A = 0, pressureLoss = 0, airflow_out = {}, temp_out = {};
            let calculationDetails = {};

            if (p.type === 'bend_circ') {
                inletDim = outletDim = { shape: 'round', d: p.d };
                const rd_key = p.rd < 1.25 ? "rd1_0" : "rd1_5";
                zeta = physics.interpolateValue(p.angle, p.d, physics.CIRCULAR_BEND_ZETA[rd_key]);
                A = Math.PI * (getInternalDim(p.d) / 2000) ** 2;
                v = Q / A;
                Pdyn_Pa = (RHO / 2) * v ** 2;
                pressureLoss = zeta * Pdyn_Pa;
                airflow_out = { 'outlet': incomingFlow };
                temp_out = { 'outlet': incomingTemp };
                calculationDetails = { A_m2: A, v_ms: v, zeta, Pdyn_Pa };
            } else if (p.type === 'bend_rect') {
                inletDim = outletDim = { shape: 'rect', h: p.h, w: p.w };
                const hw_ratio = p.h / p.w;
                const zeta_base = physics.interpolateValue(hw_ratio, p.rh, physics.RECTANGULAR_BEND_ZETA.mainTable);
                const k_factor = physics.interpolateValue(p.angle, null, physics.RECTANGULAR_BEND_ZETA.kFactor);
                zeta = zeta_base * k_factor;
                let h_int = getInternalDim(p.h) / 1000, w_int = getInternalDim(p.w) / 1000;
                A = h_int * w_int;
                v = Q / A;
                Pdyn_Pa = (RHO / 2) * v ** 2;
                pressureLoss = zeta * Pdyn_Pa;
                airflow_out = { 'outlet': incomingFlow };
                temp_out = { 'outlet': incomingTemp };
                calculationDetails = { A_m2: A, v_ms: v, zeta, Pdyn_Pa };
            } else if (p.type === 'expansion' || p.type === 'contraction') {
                const isExpansion = p.type === 'expansion';
                inletDim = { shape: 'round', d: p.d1 };
                outletDim = { shape: 'round', d: p.d2 };
                const A1 = Math.PI * (getInternalDim(p.d1) / 2000) ** 2;
                const A2 = Math.PI * (getInternalDim(p.d2) / 2000) ** 2;
                const area_ratio = A2 / A1;
                const zeta_table = isExpansion ? physics.EXPANSION_ZETA : physics.CONTRACTION_ZETA;
                zeta = physics.interpolateValue(p.angle, area_ratio, zeta_table);
                A = isExpansion ? A1 : A2;
                v = Q / A;
                Pdyn_Pa = (RHO / 2) * v ** 2;
                pressureLoss = zeta * Pdyn_Pa;
                airflow_out = { 'outlet': incomingFlow };
                temp_out = { 'outlet': incomingTemp };
                calculationDetails = { A_m2: A, v_ms: v, zeta, Pdyn_Pa };
            } else if (p.type === 'tee_sym' || p.type === 'tee_asym') {
                inletDim = { shape: 'round', d: p.d_in };
                if (p.flowType === 'splitting') {
                    const results = physics.calculateTeePressureLoss({ q_in: incomingFlow, q_straight: p.q_straight, q_branch: p.q_branch }, { d_in: p.d_in, d_straight: p.d_straight, d_branch: p.d_branch }, RHO);
                    if (p.path === 'straight') {
                        pressureLoss = results.loss_straight;
                        outletDim = { shape: 'round', d: p.d_straight };
                        airflow_out = { 'outlet_straight': p.q_straight, 'outlet_branch': p.q_branch, 'outlet': p.q_straight };
                        temp_out = { 'outlet_straight': incomingTemp, 'outlet_branch': incomingTemp, 'outlet': incomingTemp };
                        calculationDetails = results.details_straight;
                    } else {
                        pressureLoss = results.loss_branch;
                        outletDim = { shape: 'round', d: p.d_branch };
                        airflow_out = { 'outlet_straight': p.q_straight, 'outlet_branch': p.q_branch, 'outlet': p.q_branch };
                        temp_out = { 'outlet_straight': incomingTemp, 'outlet_branch': incomingTemp, 'outlet': incomingTemp };
                        calculationDetails = results.details_branch;
                    }
                } else { // Merging
                    const results = physics.calculateConvergingTeePressureLoss({ q_straight: p.q_straight, q_branch: p.q_branch }, { d_common: p.d_in, d_straight: p.d_straight, d_branch: p.d_branch }, RHO);
                    if (p.path === 'straight') {
                        pressureLoss = results.loss_straight;
                        calculationDetails = results.details_straight;
                        inletDim = { shape: 'round', d: p.d_straight };
                    } else {
                        pressureLoss = results.loss_branch;
                        calculationDetails = results.details_branch;
                        inletDim = { shape: 'round', d: p.d_branch };
                    }
                    outletDim = { shape: 'round', d: p.d_in };
                    airflow_out = { 'outlet': results.q_out };
                    temp_out = { 'outlet': incomingTemp }; // Linear assumption: branches didn't cool differently yet
                }
                v = calculationDetails.v_ms || 0;
            }

            newCalc = {
                airflow_in: incomingFlow,
                airflow_out: airflow_out,
                velocity: v,
                pressureLoss: pressureLoss,
                zeta: zeta,
                inletDimension: inletDim,
                outletDimension: { 'outlet': outletDim },
                calculationDetails: calculationDetails,
                temperature_in: incomingTemp,
                temperature_out: temp_out,
                heatLoss: 0
            };
        }

        // Apply calculated state
        component.state = newCalc;

        // --- 2. Check and Insert Transitions ---
        if (index > 0 && lastOutlet) {
            const transition = createTransitionComponent(lastOutlet, component.state.inletDimension, incomingFlow, globalFlowType, null);
            if (transition) {
                stateManager.addSystemComponent(transition, lastNodeId);
                lastNodeId = transition.id;
            }
        }

        // --- 3. Add the recalculated user component back to the graph ---
        stateManager.addSystemComponent(component, lastNodeId, 'outlet', 'inlet');
        lastNodeId = component.id;

        // --- 4. Update tracking variables for next iteration ---
        if (component.state.outletDimension && component.state.outletDimension['outlet']) {
            lastOutlet = component.state.outletDimension['outlet'];
        }
        if (component.state.airflow_out && component.state.airflow_out['outlet']) {
            currentAirflow = component.state.airflow_out['outlet'];
        }
        if (component.state.temperature_out && component.state.temperature_out['outlet'] !== undefined) {
            currentTemp = component.state.temperature_out['outlet'];
        }
    });

    ui.renderSystem();
    ui.handleComponentTypeChange();
}
window.recalculateSystem = recalculateSystem;

// Exposed handler for Add button
function handleAddSystemComponent(event) {
    if (event) event.preventDefault();
    handleAddComponent(event);
}
window.handleAddSystemComponent = handleAddSystemComponent;

function handleAddComponent(event) {
    if (event) event.preventDefault();
    const type = document.getElementById('systemComponentType').value;

    // We need starting conditions. 
    // Usually: from global input OR from last component
    const temp = parseLocalFloat(document.getElementById('temperature').value);
    if (isNaN(temp)) return alert("Ugyldig temperatur.");

    let currentAirflow = parseLocalFloat(document.getElementById('system_airflow').value);
    if (isNaN(currentAirflow) || currentAirflow <= 0) return alert("Ugyldig start luftmængde.");

    const systemComponents = getSystemComponents();
    let previousComponent = systemComponents.length > 0 ? systemComponents[systemComponents.length - 1] : null;

    if (previousComponent && previousComponent.state && previousComponent.state.airflow_out) {
        // Just take the first output airflow for now in the linear builder
        currentAirflow = Object.values(previousComponent.state.airflow_out)[0] || currentAirflow;
    } else if (previousComponent && previousComponent.airflow) {
        currentAirflow = previousComponent.airflow;
    }

    let component = null;

    if (type === 'straightDuct') {
        component = getDuctData('');
    } else if (type === 'fitting') {
        component = getFittingData('');
    } else if (type === 'manualLoss') {
        const name = document.getElementById('manualLossName').value || 'Manuel Komponent';
        const pressureLoss = parseLocalFloat(document.getElementById('manualLossValue').value);
        if (isNaN(pressureLoss)) {
            alert("Ugyldigt tryktab!");
            return;
        }
        component = {
            type: 'manualLoss',
            name: name,
            properties: { pressureLoss },
            state: {}
        };
    }

    if (component) {
        component.id = 'node_' + Date.now();
        // The old code had a currentAirflow tracking, but graph nodes shouldn't hardcode it. 
        // We will store currentAirflow in state so recalculateSystem has a starting point if it's the first node.
        if (!previousComponent) {
            component.state.airflow_in = currentAirflow;
        }

        const correctionTargetId = getCorrectionTargetId();

        if (correctionTargetId) {
            // For now, correction is just injecting after target. We need to handle this in Graph.
            // Let's just append linearly for now and clear target.
            stateManager.addSystemComponent(component, correctionTargetId);
            setCorrectionTargetId(null);
        } else {
            stateManager.addSystemComponent(component);
        }

        recalculateSystem();
        ui.showSaveStatus('Komponent tilføjet');
        updateUndoRedoUI(canUndo(), canRedo());

        // Scroll to bottom
        setTimeout(() => {
            const list = document.getElementById('systemComponentsList');
            if (list) list.scrollTop = list.scrollHeight;
        }, 100);
    }
}

// --- Initialization ---

async function initializeApp() {
    // Inject HTML
    document.getElementById('dimensioning').innerHTML = ui.getDimFormHtml();
    document.getElementById('fittings').innerHTML = ui.getFittingsFormHtml();
    document.getElementById('system').innerHTML = ui.getSystemFormHtml();

    // Event Listeners
    document.getElementById('ventilationForm').addEventListener('submit', handleDuctCalculation);
    document.getElementById('fittingsForm').addEventListener('submit', handleFittingCalculation);
    document.getElementById('fittingType').addEventListener('change', ui.renderFittingInputs);

    // Dynamic UI Listeners for Duct Dimensioning
    document.getElementsByName('calculationMode').forEach(r => r.addEventListener('change', ui.updateDimUI));
    document.getElementsByName('ductShape').forEach(r => r.addEventListener('change', ui.updateDimUI));
    document.getElementById('constraintType').addEventListener('change', ui.updateConstraintDefaults);


    // System tab listeners
    document.getElementById('systemComponentType').addEventListener('change', ui.handleComponentTypeChange);
    document.getElementById('systemAddComponentForm').addEventListener('submit', handleAddComponent);
    document.getElementById('fileLoader').addEventListener('change', window.loadSystem);

    // --- Project Management UI ---

    // Inject Modal
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = ui.getProjectModalHtml();
    document.body.appendChild(modalContainer.firstElementChild);

    const projectModal = document.getElementById('projectModal');
    const projectListContainer = document.getElementById('projectList');

    // Open Modal
    const openProjectModal = (mode) => {
        console.log('openProjectModal called', mode);
        try {
            renderProjectList();
            projectModal.classList.remove('hidden');
            window.toggleSystemMenu(); // Close menu
        } catch (e) {
            console.error('Error in openProjectModal:', e);
        }
    };

    const saveProjectAs = () => {
        window.toggleSystemMenu(); // Close menu
        let currentName = document.getElementById('projectName').value;
        const name = prompt("Indtast projektnavn:", currentName);
        if (name) {
            try {
                if (projectManager.projectExists(name)) {
                    showConfirm(`Projektet "${name}" findes allerede. Vil du overskrive det?`, () => {
                        try {
                            projectManager.updateProject(name);
                            document.getElementById('projectName').value = name;
                            renderProjectList();
                            alert(`Projekt "${name}" gemt.`);
                        } catch (err) {
                            alert('Fejl: ' + err.message);
                        }
                    });
                } else {
                    projectManager.createProject(name);
                    document.getElementById('projectName').value = name;
                    renderProjectList();
                    alert(`Projekt "${name}" gemt.`);
                }
            } catch (err) {
                alert('Fejl: ' + err.message);
            }
        }
    };

    // Attach listeners to menu buttons
    document.getElementById('btnMenuNew').addEventListener('click', (e) => {
        e.stopPropagation();
        window.toggleSystemMenu(); // Close menu first
        window.clearSystem();
    });
    document.getElementById('btnMenuLoad').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openProjectModal('load');
    });
    document.getElementById('btnMenuSaveAs').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        saveProjectAs();
    });
    document.getElementById('btnMenuSaveFile').addEventListener('click', (e) => {
        e.stopPropagation();
        window.saveSystem(e);
    });
    document.getElementById('btnMenuLoadFile').addEventListener('click', (e) => {
        e.stopPropagation();
        window.triggerFileLoad(e);
    });
    document.getElementById('btnMenuPrint').addEventListener('click', (e) => {
        e.stopPropagation();
        window.printDocumentation(e);
    });

    // Remove old listener if it existed (garbage collection handles it, just removing the code block)
    /* 
    const btnOpenProject = document.getElementById('btnOpenProjectModal');
    if (btnOpenProject) { ... } 
    */

    // Close Modal (click outside)
    window.addEventListener('click', (e) => {
        if (e.target === projectModal) {
            console.log('[DEBUG] Window click outside modal detected. Closing modal.');
            projectModal.classList.add('hidden');
        }
    });

    // Render Project List
    function renderProjectList() {
        console.log('renderProjectList called');
        if (!projectListContainer) {
            console.error('projectListContainer is missing!');
            return;
        }
        const projects = projectManager.listProjects();
        console.log('Projects found:', projects);
        projectListContainer.innerHTML = '';

        if (projects.length === 0) {
            projectListContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted-color);">Ingen gemte projekter.</p>';
            return;
        }

        projects.forEach(proj => {
            const el = document.createElement('div');
            el.className = 'project-item';
            const dateStr = new Date(proj.timestamp).toLocaleString('da-DK');
            el.innerHTML = `
                <div class="project-info">
                    <h3>${proj.name}</h3>
                    <p>Gemt: ${dateStr}</p>
                </div>
                <div class="project-actions">
                    <button class="project-btn load" data-name="${proj.name}" title="Hent">📂</button>
                    <button class="project-btn delete" data-name="${proj.name}" title="Slet">🗑️</button>
                </div>
            `;
            projectListContainer.appendChild(el);
        });

        // Add listeners to buttons
        projectListContainer.querySelectorAll('.load').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Stop bubbling
                const name = e.currentTarget.dataset.name;
                console.log(`[DEBUG] Load button clicked for: ${name}`);

                showConfirm(`Vil du hente projektet "${name}"? Nuværende ikke-gemte ændringer vil gå tabt.`, () => {
                    console.log('[DEBUG] User confirmed Load.');
                    try {
                        projectManager.loadProject(name);
                        projectModal.classList.add('hidden');
                        ui.renderSystem();
                        ui.handleComponentTypeChange();
                        // Update Project Name Input
                        document.getElementById('projectName').value = name;
                        alert(`Projekt "${name}" hentet.`);
                    } catch (err) {
                        console.error('[DEBUG] Error loading project:', err);
                        alert('Fejl: ' + err.message);
                    }
                });
            });
        });

        projectListContainer.querySelectorAll('.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const name = e.currentTarget.dataset.name;
                console.log(`[DEBUG] Delete button clicked for: ${name}`);

                showConfirm(`Er du sikker på, at du vil slette projektet "${name}"?`, () => {
                    console.log('[DEBUG] User confirmed Delete.');
                    projectManager.deleteProject(name);
                    renderProjectList();
                });
            });
        });
    }

    // New Project (Inside Modal)
    document.getElementById('btnNewProject').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('[DEBUG] New Project button (modal) clicked');

        showConfirm('Er du sikker på, at du vil starte et nyt projekt?', () => {
            console.log('[DEBUG] User confirmed New Project.');
            clearSystem();
            document.getElementById('projectName').value = '';
            ui.renderSystem();
            ui.handleComponentTypeChange();
            projectModal.classList.add('hidden');
        });
    });

    // Save Project As (Inside Modal)
    document.getElementById('btnSaveProjectAs').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('[DEBUG] Save As button (modal) clicked');

        saveProjectAs();
    });


    // Initial renders
    ui.populateDatalists();
    ui.updateDimUI();
    ui.updateConstraintDefaults();
    ui.updateFittingTypeOptions();
    ui.handleComponentTypeChange();

    // Tabs logic (simple version)
    const tabs = document.querySelectorAll('.tab-link');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab-link').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.remove('hidden');
        });
    });

    // Theme Switch Logic
    const themeToggle = document.getElementById('themeToggle');
    // Function to set theme
    const setTheme = (isDark) => {
        if (isDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            themeToggle.checked = true;
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
            themeToggle.checked = false;
        }
    };

    // Load saved theme or default to dark (Future Vibe)
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme === 'dark');

    themeToggle.addEventListener('change', (e) => {
        setTheme(e.target.checked);
    });

    // Help Button
    document.getElementById('helpButton').addEventListener('click', () => {
        ui.showHelpModal();
    });

    // Undo/Redo Buttons
    const undoBtn = document.getElementById('undoButton');
    const redoBtn = document.getElementById('redoButton');
    if (undoBtn) undoBtn.addEventListener('click', handleUndo);
    if (redoBtn) redoBtn.addEventListener('click', handleRedo);

    // Initial Undo/Redo UI State
    // Initial Undo/Redo UI State
    ui.updateUndoRedoUI(canUndo(), canRedo());

}

// Load system implementation
window.loadSystem = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            document.getElementById('projectName').value = data.projectName || '';

            if (data.state) {
                // New graph-based format
                stateManager.state = data.state;
                stateManager.persist();

                // Keep UI form fields in sync with loaded data
                document.getElementById('system_airflow').value = stateManager.state.startAirflow || '';
                const radios = document.getElementsByName('systemFlowType');
                radios.forEach(r => { if (r.value === stateManager.state.systemType) r.checked = true; });

                ui.renderSystem();
            } else {
                // Legacy array-based format
                document.getElementById('system_airflow').value = data.startAirflow || '';
                const radios = document.getElementsByName('systemFlowType');
                radios.forEach(r => { if (r.value === data.systemType) r.checked = true; });

                setSystemComponents(data.components || []);
                ui.renderSystem();
            }
            ui.toggleSystemMenu();
        } catch (error) {
            alert('Fejl ved indlæsning af fil: ' + error.message);
        }
    };
    reader.readAsText(file);
};

window.triggerFileLoad = () => {
    window.toggleSystemMenu(); // Close menu
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = window.loadSystem;
    input.click();
};

window.saveSystem = () => {
    window.toggleSystemMenu(); // Close menu
    const projectName = document.getElementById('projectName').value || 'ventilation_projekt';
    const dataToSave = {
        projectName: projectName,
        state: stateManager.state // Save entire graph and system state
    };
    const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}_data.json`;
    a.click();
    URL.revokeObjectURL(url);
};

document.addEventListener('DOMContentLoaded', initializeApp);


// Unregister Service Worker (if any exists from previous versions) to prevent caching issues
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (let registration of registrations) {
            registration.unregister();
            console.log('Service Worker unregistered');
        }
    });
}
