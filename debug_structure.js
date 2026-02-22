
import { stateManager } from './src/app_state.js';
import { addSystemComponent } from './src/app_state.js';

// Mock data based on ui.js/physics.js logic
const straight = {
    type: 'straightDuct',
    name: 'Lige rør',
    airflow: 1000,
    length: 5,
    pressureLoss: 10,
    calculationDetails: { dimension: 200, velocity: 5 }
};

const tee = {
    type: 'tee_sym',
    name: 'T-stykke',
    airflow: 1000,
    pressureLoss: 5,
    details: 'Splitting: 500/500',
    calculationDetails: {
        type: 'tee_split',
        chosenPath: 'straight',
        mainAirflow: 1000,
        branchAirflow: 500,
        straightAirflow: 500
    }
};

addSystemComponent(straight);
addSystemComponent(tee);

console.log(JSON.stringify(stateManager.getSystemComponents(), null, 2));
