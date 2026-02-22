
import { renderDiagram } from './src/diagram.js';
import { setSystemComponents } from './src/app_state.js';

// Mock DOM
global.document = {
    getElementById: (id) => {
        if (id === 'systemDiagramContainer') {
            return {
                innerHTML: '',
                set innerHTML(val) { this._html = val; },
                get innerHTML() { return this._html; }
            };
        }
        return null;
    }
};

// Mock Components
const mockComponents = [
    {
        id: 1, type: 'straightDuct', name: 'Lige rør',
        airflow: 1000, velocity: 5, pressureLoss: 10
    },
    {
        id: 2, type: 'tee_split', name: 'T-stykke',
        airflow: 500, velocity: 4, pressureLoss: 5,
        calculationDetails: {
            diagramData: {
                type: 'tee_split',
                chosenPath: 'straight',
                straight: { q: 500, d: 200 },
                branch: { q: 500, d: 160 }
            }
        }
    }
];

setSystemComponents(mockComponents);

// Run Render
renderDiagram();

// Check Output
const container = document.getElementById('systemDiagramContainer');
console.log("Generated SVG Length:", container.innerHTML.length);
if (container.innerHTML.includes('<svg') && container.innerHTML.includes('Start: 1000')) {
    console.log("Verification PASSED: SVG generated.");
    console.log("Partial SVG:", container.innerHTML.substring(0, 150) + "...");
} else {
    console.log("Verification FAILED: No SVG generated.");
}
