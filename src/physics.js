import { getInternalDim } from './utils.js';

// --- CONSTANTS ---
export const K_ROUGHNESS = 0.00015;
export const WALL_THICKNESS_MM = 0.5;

export const STANDARD_ROUND_SIZES_MM = [63, 80, 100, 125, 160, 200, 250, 315, 355, 400, 460, 500, 630, 710, 800, 1000, 1250, 1400, 1500, 1600, 2000];
export const STANDARD_RECT_SIZES_MM = (() => { let arr = []; for (let i = 100; i <= 450; i += 50) arr.push(i); for (let i = 500; i <= 2000; i += 100) arr.push(i); return arr; })();

export const CIRCULAR_BEND_ZETA = { "rd1_0": { "45": { "75": 0.20, "100": 0.17, "125": 0.14, "150": 0.11, "200": 0.11, "250": 0.11 }, "90": { "75": 0.44, "100": 0.37, "125": 0.30, "150": 0.25, "200": 0.24, "250": 0.24 } }, "rd1_5": { "45": { "75": 0.18, "100": 0.13, "125": 0.10, "150": 0.08, "200": 0.07, "250": 0.07 }, "90": { "75": 0.30, "100": 0.21, "125": 0.16, "150": 0.14, "200": 0.11, "250": 0.11 } } };
export const RECTANGULAR_BEND_ZETA = { mainTable: { "0.25": { "0.5": 1.53, "0.75": 0.57, "1": 0.27, "1.5": 0.22, "2": 0.20 }, "0.50": { "0.5": 1.38, "0.75": 0.52, "1": 0.25, "1.5": 0.20, "2": 0.18 }, "0.75": { "0.5": 1.29, "0.75": 0.48, "1": 0.23, "1.5": 0.19, "2": 0.16 }, "1.00": { "0.5": 1.18, "0.75": 0.44, "1": 0.21, "1.5": 0.17, "2": 0.15 }, "2.00": { "0.5": 1.06, "0.75": 0.40, "1": 0.19, "1.5": 0.15, "2": 0.14 }, "3.00": { "0.5": 1.00, "0.75": 0.39, "1": 0.18, "1.5": 0.14, "2": 0.13 }, "4.00": { "0.5": 1.00, "0.75": 0.39, "1": 0.18, "1.5": 0.14, "2": 0.13 }, "5.00": { "0.5": 1.06, "0.75": 0.40, "1": 0.19, "1.5": 0.15, "2": 0.14 }, "6.00": { "0.5": 1.12, "0.75": 0.42, "1": 0.20, "1.5": 0.16, "2": 0.14 }, "7.00": { "0.5": 1.16, "0.75": 0.43, "1": 0.21, "1.5": 0.17, "2": 0.15 }, "8.00": { "0.5": 1.18, "0.75": 0.44, "1": 0.21, "1.5": 0.17, "2": 0.15 } }, kFactor: { "30": 0.45, "45": 0.60, "60": 0.78, "90": 1.00, "180": 1.40 } };
export const EXPANSION_ZETA = { "10": { "2": 0.11, "4": 0.16, "10": 0.21, "16": 0.21 }, "20": { "2": 0.13, "4": 0.22, "10": 0.28, "16": 0.29 }, "30": { "2": 0.19, "4": 0.30, "10": 0.38, "16": 0.38 }, "40": { "2": 0.32, "4": 0.46, "10": 0.59, "16": 0.60 }, "45": { "2": 0.33, "4": 0.61, "10": 0.76, "16": 0.84 }, "60": { "2": 0.33, "4": 0.68, "10": 0.80, "16": 0.88 }, "90": { "2": 0.32, "4": 0.64, "10": 0.83, "16": 0.88 }, "120": { "2": 0.31, "4": 0.63, "10": 0.84, "16": 0.88 }, "150": { "2": 0.30, "4": 0.62, "10": 0.83, "16": 0.88 }, "180": { "2": 0.30, "4": 0.62, "10": 0.83, "16": 0.88 } };
export const CONTRACTION_ZETA = { "10": { "0.1": 0.05, "0.17": 0.05, "0.25": 0.05, "0.5": 0.05 }, "15": { "0.1": 0.05, "0.17": 0.04, "0.25": 0.04, "0.5": 0.05 }, "30": { "0.1": 0.05, "0.17": 0.04, "0.25": 0.04, "0.5": 0.05 }, "45": { "0.1": 0.05, "0.17": 0.04, "0.25": 0.04, "0.5": 0.05 }, "60": { "0.1": 0.07, "0.17": 0.06, "0.25": 0.06, "0.5": 0.06 }, "75": { "0.1": 0.08, "0.17": 0.07, "0.25": 0.07, "0.5": 0.06 }, "90": { "0.1": 0.19, "0.17": 0.18, "0.25": 0.17, "0.5": 0.12 }, "120": { "0.1": 0.29, "0.17": 0.28, "0.25": 0.27, "0.5": 0.18 }, "150": { "0.1": 0.37, "0.17": 0.36, "0.25": 0.35, "0.5": 0.24 }, "180": { "0.1": 0.43, "0.17": 0.42, "0.25": 0.41, "0.5": 0.26 } };
export const RECT_EXPANSION_ZETA = { "10": { "2": 0.11, "4": 0.16, "10": 0.21, "16": 0.21 }, "20": { "2": 0.13, "4": 0.22, "10": 0.28, "16": 0.29 }, "30": { "2": 0.19, "4": 0.30, "10": 0.38, "16": 0.38 }, "40": { "2": 0.32, "4": 0.46, "10": 0.59, "16": 0.60 }, "45": { "2": 0.33, "4": 0.61, "10": 0.76, "16": 0.84 }, "60": { "2": 0.33, "4": 0.68, "10": 0.80, "16": 0.88 }, "90": { "2": 0.32, "4": 0.64, "10": 0.83, "16": 0.88 }, "120": { "2": 0.31, "4": 0.63, "10": 0.84, "16": 0.88 }, "150": { "2": 0.30, "4": 0.62, "10": 0.83, "16": 0.88 }, "180": { "2": 0.30, "4": 0.62, "10": 0.83, "16": 0.88 } };
export const RECT_CONTRACTION_ZETA = { "10": { "0.1": 0.05, "0.17": 0.05, "0.25": 0.05, "0.5": 0.05 }, "15": { "0.1": 0.05, "0.17": 0.04, "0.25": 0.04, "0.5": 0.05 }, "30": { "0.1": 0.05, "0.17": 0.04, "0.25": 0.04, "0.5": 0.05 }, "45": { "0.1": 0.05, "0.17": 0.04, "0.25": 0.04, "0.5": 0.05 }, "60": { "0.1": 0.07, "0.17": 0.06, "0.25": 0.06, "0.5": 0.06 }, "75": { "0.1": 0.08, "0.17": 0.07, "0.25": 0.07, "0.5": 0.06 }, "90": { "0.1": 0.19, "0.17": 0.18, "0.25": 0.17, "0.5": 0.12 }, "120": { "0.1": 0.29, "0.17": 0.28, "0.25": 0.27, "0.5": 0.18 }, "150": { "0.1": 0.37, "0.17": 0.36, "0.25": 0.35, "0.5": 0.24 }, "180": { "0.1": 0.43, "0.17": 0.42, "0.25": 0.41, "0.5": 0.26 } };
export const RECT_TO_ROUND_SUPPLY_ZETA = {
    "0.1": { "0": 0, "3": 0.12, "5": 0.09, "10": 0.05, "15": 0.05, "20": 0.05, "30": 0.05, "45": 0.06, "60": 0.08, "90": 0.19, "120": 0.29, "150": 0.37, "180": 0.43 },
    "0.167": { "0": 0, "3": 0.11, "5": 0.08, "10": 0.05, "15": 0.05, "20": 0.05, "30": 0.05, "45": 0.06, "60": 0.07, "90": 0.19, "120": 0.28, "150": 0.37, "180": 0.42 },
    "0.25": { "0": 0, "3": 0.10, "5": 0.07, "10": 0.05, "15": 0.05, "20": 0.05, "30": 0.05, "45": 0.06, "60": 0.07, "90": 0.17, "120": 0.27, "150": 0.35, "180": 0.41 },
    "0.5": { "0": 0, "3": 0.08, "5": 0.07, "10": 0.06, "15": 0.07, "20": 0.06, "30": 0.05, "45": 0.06, "60": 0.07, "90": 0.13, "120": 0.19, "150": 0.23, "180": 0.24 },
    "1": { "0": 0, "3": 0, "5": 0, "10": 0, "15": 0, "20": 0, "30": 0, "45": 0, "60": 0, "90": 0, "120": 0, "150": 0, "180": 0 },
    "2": { "0": 0, "3": 0.57, "5": 0.55, "10": 0.61, "15": 0.87, "20": 1.0, "30": 1.3, "45": 1.3, "60": 1.3, "90": 1.3, "120": 1.28, "150": 1.24, "180": 1.2 },
    "4": { "0": 0, "3": 2.6, "5": 2.84, "10": 3.92, "15": 5.72, "20": 7.2, "30": 8.32, "45": 9.28, "60": 9.92, "90": 10.24, "120": 10.24, "150": 10.24, "180": 10.24 },
    "6": { "0": 0, "3": 6.57, "5": 6.75, "10": 10.62, "15": 15.84, "20": 18.9, "30": 22.5, "45": 25.74, "60": 27.9, "90": 28.44, "120": 28.44, "150": 28.35, "180": 28.26 },
    "10": { "0": 0, "3": 17.25, "5": 18.75, "10": 30, "15": 45, "20": 53, "30": 63.5, "45": 75, "60": 84, "90": 89, "120": 89, "150": 88.5, "180": 88 },
    "16": { "0": 0, "3": 42.75, "5": 48.13, "10": 77.57, "15": 116.74, "20": 136.45, "30": 164.1, "45": 196.86, "60": 224.26, "90": 241.92, "120": 241.92, "150": 240.38, "180": 238.59 }
};

export const ROUND_TO_RECT_EXHAUST_ZETA = {
    "0.063": { "0": 0, "3": 0.17, "5": 0.19, "10": 0.3, "15": 0.46, "20": 0.53, "30": 0.64, "45": 0.77, "60": 0.88, "90": 0.95, "120": 0.95, "150": 0.94, "180": 0.93 },
    "0.1": { "0": 0, "3": 0.17, "5": 0.19, "10": 0.3, "15": 0.45, "20": 0.53, "30": 0.64, "45": 0.75, "60": 0.84, "90": 0.89, "120": 0.89, "150": 0.89, "180": 0.88 },
    "0.167": { "0": 0, "3": 0.18, "5": 0.19, "10": 0.3, "15": 0.44, "20": 0.53, "30": 0.63, "45": 0.72, "60": 0.78, "90": 0.79, "120": 0.79, "150": 0.79, "180": 0.79 },
    "0.25": { "0": 0, "3": 0.16, "5": 0.18, "10": 0.25, "15": 0.36, "20": 0.45, "30": 0.52, "45": 0.58, "60": 0.62, "90": 0.64, "120": 0.64, "150": 0.64, "180": 0.64 },
    "0.5": { "0": 0, "3": 0.14, "5": 0.14, "10": 0.15, "15": 0.22, "20": 0.25, "30": 0.3, "45": 0.33, "60": 0.33, "90": 0.33, "120": 0.32, "150": 0.31, "180": 0.3 },
    "1": { "0": 0, "3": 0, "5": 0, "10": 0, "15": 0, "20": 0, "30": 0, "45": 0, "60": 0, "90": 0, "120": 0, "150": 0, "180": 0 },
    "2": { "0": 0, "3": 0.3, "5": 0.27, "10": 0.26, "15": 0.28, "20": 0.25, "30": 0.19, "45": 0.23, "60": 0.27, "90": 0.52, "120": 0.75, "150": 0.91, "180": 0.95 },
    "4": { "0": 0, "3": 1.6, "5": 1.14, "10": 0.84, "15": 0.85, "20": 0.86, "30": 0.76, "45": 0.9, "60": 1.09, "90": 2.78, "120": 4.3, "150": 5.65, "180": 6.55 },
    "6": { "0": 0, "3": 3.89, "5": 3.04, "10": 1.84, "15": 1.77, "20": 1.78, "30": 1.73, "45": 2.18, "60": 2.67, "90": 6.67, "120": 10.07, "150": 13.09, "180": 15.18 },
    "10": { "0": 0, "3": 11.8, "5": 9.31, "10": 5.4, "15": 5.18, "20": 5.15, "30": 5.05, "45": 6.44, "60": 7.94, "90": 19.06, "120": 28.55, "150": 36.75, "180": 42.75 }
};

// --- FUNCTIONS ---

export function getAirProperties(tempCelsius) {
    const T_kelvin = tempCelsius + 273.15;
    const RHO = 101325 / (287.058 * T_kelvin);
    const mu = (1.458e-6 * Math.pow(T_kelvin, 1.5)) / (T_kelvin + 110.4);
    const NU = mu / RHO;
    return { RHO, NU };
}

export function calculateFrictionFactor(hydraulicDiameter, velocity, NU) {
    const Re = (velocity * hydraulicDiameter) / NU;
    if (Re < 2300) return 64 / Re;
    let lambda = 0.02; const term1 = K_ROUGHNESS / (3.7 * hydraulicDiameter);
    for (let i = 0; i < 50; i++) { let f_inv = -2 * Math.log10(term1 + (2.51 / (Re * Math.sqrt(lambda)))); lambda = 1 / (f_inv * f_inv); }
    return lambda;
}

export function getPerformance(Q, D_hyd_ext, area_ext, RHO, NU) {
    const d_int_mm = getInternalDim(area_ext.a || D_hyd_ext * 1000);
    const a_int_mm = getInternalDim(area_ext.a);
    const b_int_mm = getInternalDim(area_ext.b);
    const D_hyd_int = area_ext.shape === 'round' ? d_int_mm / 1000 : (2 * (a_int_mm / 1000) * (b_int_mm / 1000)) / ((a_int_mm / 1000) + (b_int_mm / 1000));
    const area_int = area_ext.shape === 'round' ? Math.PI * (D_hyd_int / 2) ** 2 : (a_int_mm / 1000) * (b_int_mm / 1000);
    if (area_int <= 0) throw new Error("Kanalens indre dimension er nul eller negativ pga. godstykkelse.");
    const velocity = Q / area_int;
    const lambda = calculateFrictionFactor(D_hyd_int, velocity, NU);
    const pressureDrop = (lambda / D_hyd_int) * (RHO / 2) * velocity ** 2;
    const reynolds = (velocity * D_hyd_int) / NU;
    return { velocity, pressureDrop, lambda, reynolds, D_hyd_int };
}

export function calculateDimensions(Q, shape, airflow_m3h, RHO, NU, constraint, value, aspectRatio = 1.5) {
    if (isNaN(value) || value <= 0) throw new Error("Ugyldig grænseværdi.");
    let result = { mode: 'calculate', shape, airflow: airflow_m3h, alternatives: {} };
    if (shape === 'round') {
        let ideal_d_ext_m;
        if (constraint === 'velocity') { const A_int = Q / value; const d_int_m = Math.sqrt(4 * A_int / Math.PI); ideal_d_ext_m = d_int_m + (2 * WALL_THICKNESS_MM / 1000); }
        else { let D_ext = 0.1; for (let i = 0; i < 10; i++) { const D_int = getInternalDim(D_ext * 1000) / 1000; if (D_int <= 0) { D_ext *= 1.1; continue; } const A_int = Math.PI * (D_int / 2) ** 2, v = Q / A_int; const lambda = calculateFrictionFactor(D_int, v, NU); const dp = (lambda / D_int) * (RHO / 2) * v ** 2; D_ext *= Math.pow(dp / value, 0.2); } ideal_d_ext_m = D_ext; }
        const chosenIndex = STANDARD_ROUND_SIZES_MM.findIndex(s => s >= ideal_d_ext_m * 1000);
        const std_d_mm = STANDARD_ROUND_SIZES_MM[chosenIndex] || STANDARD_ROUND_SIZES_MM[STANDARD_ROUND_SIZES_MM.length - 1];
        const perf_chosen = getPerformance(Q, std_d_mm / 1000, { shape: 'round' }, RHO, NU);
        result = { ...result, idealDiameter: ideal_d_ext_m * 1000, standardDiameter: std_d_mm, ...perf_chosen };
        if (chosenIndex > 0) { const smaller_d_mm = STANDARD_ROUND_SIZES_MM[chosenIndex - 1]; result.alternatives.smaller = { dimension: smaller_d_mm, ...getPerformance(Q, smaller_d_mm / 1000, { shape: 'round' }, RHO, NU) }; }
        if (chosenIndex > -1 && chosenIndex < STANDARD_ROUND_SIZES_MM.length - 1) { const larger_d_mm = STANDARD_ROUND_SIZES_MM[chosenIndex + 1]; result.alternatives.larger = { dimension: larger_d_mm, ...getPerformance(Q, larger_d_mm / 1000, { shape: 'round' }, RHO, NU) }; }
    } else {
        const ratio = aspectRatio;
        if (isNaN(ratio) || ratio <= 0) throw new Error("Ugyldigt sideforhold.");
        let ideal_a_ext_m, ideal_b_ext_m;
        if (constraint === 'velocity') { const A_int = Q / value; const b_int_m = Math.sqrt(A_int / ratio); const a_int_m = b_int_m * ratio; ideal_a_ext_m = a_int_m + 2 * WALL_THICKNESS_MM / 1000; ideal_b_ext_m = b_int_m + 2 * WALL_THICKNESS_MM / 1000; }
        else { let A_ext = Q / 5; for (let i = 0; i < 10; i++) { let a_ext_m = Math.sqrt(A_ext * ratio), b_ext_m = a_ext_m / ratio; const a_int_m = getInternalDim(a_ext_m * 1000) / 1000, b_int_m = getInternalDim(b_ext_m * 1000) / 1000; if (a_int_m <= 0 || b_int_m <= 0) { A_ext *= 1.1; continue; } const D_hyd_int = (2 * a_int_m * b_int_m) / (a_int_m + b_int_m); const A_int = a_int_m * b_int_m; const v = Q / A_int; const lambda = calculateFrictionFactor(D_hyd_int, v, NU); const dp = (lambda / D_hyd_int) * (RHO / 2) * v ** 2; A_ext *= Math.pow(dp / value, 0.4); } ideal_b_ext_m = Math.sqrt(A_ext / ratio); ideal_a_ext_m = ideal_b_ext_m * ratio; }
        const std_a_mm = STANDARD_RECT_SIZES_MM.find(s => s >= ideal_a_ext_m * 1000) || 2000;
        const std_b_mm = STANDARD_RECT_SIZES_MM.find(s => s >= ideal_b_ext_m * 1000) || 2000;
        const perf = getPerformance(Q, 0, { shape: 'rect', a: std_a_mm, b: std_b_mm }, RHO, NU);
        result = { ...result, idealSideA: ideal_a_ext_m * 1000, idealSideB: ideal_b_ext_m * 1000, standardSideA: std_a_mm, standardSideB: std_b_mm, ...perf };
    }
    return result;
}

export function analyzeDuct(Q, shape, airflow_m3h, RHO, NU, diameter, sideA, sideB) {
    let params;
    if (shape === 'round') { const d = diameter; if (isNaN(d) || d <= 0) throw new Error("Ugyldig diameter."); params = { mode: 'analyze', shape, airflow: airflow_m3h, diameter: d, sideA: 0, sideB: 0 }; return { ...params, ...getPerformance(Q, d / 1000, { shape: 'round' }, RHO, NU) }; }
    else { const a = sideA, b = sideB; if (isNaN(a) || isNaN(b) || a <= 0 || b <= 0) throw new Error("Ugyldige dimensioner."); const a_m = a / 1000, b_m = b / 1000; const D_hyd = (2 * a_m * b_m) / (a_m + b_m); params = { mode: 'analyze', shape, airflow: airflow_m3h, diameter: 0, sideA: a, sideB: b, D_hyd, area: { shape: 'rect', a: a, b: b } }; return { ...params, ...getPerformance(Q, D_hyd, { shape: 'rect', a: a, b: b }, RHO, NU) }; }
}

export function calculateTeePressureLoss(flows, diams, RHO) {
    const Q_c = flows.q_in / 3600, Q_s = flows.q_straight / 3600, Q_b = flows.q_branch / 3600;
    const d_c_int = getInternalDim(diams.d_in), d_s_int = getInternalDim(diams.d_straight), d_b_int = getInternalDim(diams.d_branch);
    const A_c = Math.PI * (d_c_int / 2000) ** 2, A_s = Math.PI * (d_s_int / 2000) ** 2, A_b = Math.PI * (d_b_int / 2000) ** 2;
    const v_c = Q_c / A_c, v_s = Q_s / A_s, v_b = Q_b / A_b;
    const C_s = 1.0 - (Q_s / Q_c) ** 2 * (1 - (A_s / A_c) ** 2);
    const C_b = (1.0 + (v_b / v_c) ** 2) - 2 * (v_s / v_c) ** 2 * (A_s / A_c) * (Q_s / Q_c);
    const dynamicPressureIn = (RHO / 2) * v_c ** 2;
    const details_straight = { Q_m3s: Q_s, A_m2: A_s, v_ms: v_s, zeta: C_s, Pdyn_Pa: dynamicPressureIn };
    const details_branch = { Q_m3s: Q_b, A_m2: A_b, v_ms: v_b, zeta: C_b, Pdyn_Pa: dynamicPressureIn };
    return { loss_straight: C_s * dynamicPressureIn, loss_branch: C_b * dynamicPressureIn, details_straight, details_branch };
}

export function calculateConvergingTeePressureLoss(flows, diams, RHO) {
    // Merging flow: q_straight + q_branch = q_out
    const Q_s = flows.q_straight / 3600, Q_b = flows.q_branch / 3600;
    const Q_c = Q_s + Q_b; // Common outlet flow

    const d_s_int = getInternalDim(diams.d_straight), d_b_int = getInternalDim(diams.d_branch), d_c_int = getInternalDim(diams.d_common);
    const A_s = Math.PI * (d_s_int / 2000) ** 2, A_b = Math.PI * (d_b_int / 2000) ** 2, A_c = Math.PI * (d_c_int / 2000) ** 2;
    const v_s = Q_s / A_s, v_b = Q_b / A_b, v_c = Q_c / A_c;

    // Loss coefficients for converging flow (based on ASHRAE fundamentals)
    const C_sc = (v_s / v_c) ** 2 - 2 * (v_s / v_c) + 1;
    const C_bc = (v_b / v_c) ** 2 - 2 * (v_b / v_c) + 1;

    const dynamicPressureOut = (RHO / 2) * v_c ** 2;
    const loss_straight = C_sc * dynamicPressureOut;
    const loss_branch = C_bc * dynamicPressureOut;

    const details_straight = { type: 'tee_merge', chosenPath: 'Ligeud', A_m2: A_s, v_ms: v_s, zeta: C_sc, Pdyn_Pa: dynamicPressureOut };
    const details_branch = { type: 'tee_merge', chosenPath: 'Afgrening', A_m2: A_b, v_ms: v_b, zeta: C_bc, Pdyn_Pa: dynamicPressureOut };

    return { loss_straight, loss_branch, details_straight, details_branch, q_out: Q_c * 3600 };
}

export function calculateBullheadTeeLoss(flows, diams, RHO) {
    const Q_c = flows.q_in / 3600, Q_1 = flows.q_out1 / 3600, Q_2 = flows.q_out2 / 3600;
    const d_c_int = getInternalDim(diams.d_in), d_1_int = getInternalDim(diams.d_out1), d_2_int = getInternalDim(diams.d_out2);
    const A_c = Math.PI * (d_c_int / 2000) ** 2, A_1 = Math.PI * (d_1_int / 2000) ** 2, A_2 = Math.PI * (d_2_int / 2000) ** 2;
    const v_c = Q_c / A_c, v_1 = Q_1 / A_1, v_2 = Q_2 / A_2;
    const C_1 = 1.0 + (v_1 / v_c) ** 2;
    const C_2 = 1.0 + (v_2 / v_c) ** 2;
    const dynamicPressureIn = (RHO / 2) * v_c ** 2;
    const details1 = { Q_m3s: Q_1, A_m2: A_1, v_ms: v_1, zeta: C_1, Pdyn_Pa: dynamicPressureIn };
    const details2 = { Q_m3s: Q_2, A_m2: A_2, v_ms: v_2, zeta: C_2, Pdyn_Pa: dynamicPressureIn };
    return { loss1: C_1 * dynamicPressureIn, loss2: C_2 * dynamicPressureIn, details1, details2 };
}

export function calculateConvergingBullheadTeeLoss(flows, diams, RHO) {
    // Merging flow: q_in1 + q_in2 = q_out
    const Q_1 = flows.q_in1 / 3600, Q_2 = flows.q_in2 / 3600;
    const Q_c = Q_1 + Q_2; // Common outlet flow

    const d_1_int = getInternalDim(diams.d_in1), d_2_int = getInternalDim(diams.d_in2), d_c_int = getInternalDim(diams.d_common);
    const A_1 = Math.PI * (d_1_int / 2000) ** 2, A_2 = Math.PI * (d_2_int / 2000) ** 2, A_c = Math.PI * (d_c_int / 2000) ** 2;
    const v_1 = Q_1 / A_1, v_2 = Q_2 / A_2, v_c = Q_c / A_c;

    // Loss coefficients for converging bullhead flow
    const C_1c = 0.4 * (1 - (Q_1 / Q_c)) ** 2;
    const C_2c = 0.4 * (1 - (Q_2 / Q_c)) ** 2;

    const dynamicPressureOut = (RHO / 2) * v_c ** 2;
    const loss1 = C_1c * dynamicPressureOut;
    const loss2 = C_2c * dynamicPressureOut;

    const details1 = { type: 'tee_bullhead_merge', A_m2: A_1, v_ms: v_1, zeta: C_1c, Pdyn_Pa: dynamicPressureOut };
    const details2 = { type: 'tee_bullhead_merge', A_m2: A_2, v_ms: v_2, zeta: C_2c, Pdyn_Pa: dynamicPressureOut };

    return { loss1, loss2, details1, details2 };
}

export function getSurroundingKeys(val, keys) {
    const sortedKeys = keys.map(Number).sort((a, b) => a - b);

    if (val <= sortedKeys[0]) return [sortedKeys[0], sortedKeys[0]];
    if (val >= sortedKeys[sortedKeys.length - 1]) {
        const lastKey = sortedKeys[sortedKeys.length - 1];
        return [lastKey, lastKey];
    }

    for (let i = 0; i < sortedKeys.length - 1; i++) {
        if (val >= sortedKeys[i] && val <= sortedKeys[i + 1]) {
            return [sortedKeys[i], sortedKeys[i + 1]];
        }
    }
    return [sortedKeys[0], sortedKeys[sortedKeys.length - 1]]; // Fallback
}

export function interpolateValue(x, y, table) {
    const lerp = (v0, v1, t) => v0 * (1 - t) + v1 * t;

    const xAllKeys_str = Object.keys(table);
    const [x1_num, x2_num] = getSurroundingKeys(x, xAllKeys_str);

    const x1_key_str = xAllKeys_str.find(k => parseFloat(k) === x1_num);
    const x2_key_str = xAllKeys_str.find(k => parseFloat(k) === x2_num);

    if (y === null) { // 1D interpolation
        const y1 = table[x1_key_str];
        const y2 = table[x2_key_str];
        if (x1_num === x2_num) return y1;
        const t = (x - x1_num) / (x2_num - x1_num);
        return lerp(y1, y2, t);
    }

    // 2D Bilinear interpolation
    const yAllKeys_str = Object.keys(table[x1_key_str]);
    const [y1_num, y2_num] = getSurroundingKeys(y, yAllKeys_str);

    const y1_key_str = yAllKeys_str.find(k => parseFloat(k) === y1_num);
    const y2_key_str = yAllKeys_str.find(k => parseFloat(k) === y2_num);

    const q11 = table[x1_key_str][y1_key_str];
    const q12 = table[x1_key_str][y2_key_str];
    const q21 = table[x2_key_str][y1_key_str];
    const q22 = table[x2_key_str][y2_key_str];

    if (x1_num === x2_num && y1_num === y2_num) return q11;

    if (x1_num === x2_num) { // Interpolate on Y axis only
        if (y1_num === y2_num) return q11;
        const ty = (y - y1_num) / (y2_num - y1_num);
        return lerp(q11, q12, ty);
    }
    if (y1_num === y2_num) { // Interpolate on X axis only
        const tx = (x - x1_num) / (x2_num - x1_num);
        return lerp(q11, q21, tx);
    }

    const tx = (x - x1_num) / (x2_num - x1_num);
    const ty = (y - y1_num) / (y2_num - y1_num);

    const r1 = lerp(q11, q21, tx);
    const r2 = lerp(q12, q22, tx);

    return lerp(r1, r2, ty);
}

/**
 * Calculates the specific heat capacity of humid air.
 * @param {number} t_C - Air temperature [°C]
 * @param {number} RH_pct - Relative humidity [%]
 * @returns {number} Specific heat capacity [J/(kg*K)]
 */
export function calculateHeatCapacity(t_C, RH_pct = 50) {
    // 1. Saturation vapor pressure (Magnus-Tetens formula)
    const p_ws_hPa = 6.112 * Math.exp((17.67 * t_C) / (t_C + 243.5));
    const p_ws_Pa = p_ws_hPa * 100;

    // 2. Partial pressure of water vapor
    const p_w_Pa = (RH_pct / 100) * p_ws_Pa;

    // 3. Atmospheric pressure
    const p_atm = 101325; // 1 atm

    // 4. Humidity ratio (x) [kg water / kg dry air]
    const x = 0.62198 * (p_w_Pa / (p_atm - p_w_Pa));

    // 5. Specific heat capacities [J/(kg*K)]
    const cp_dry = 1006;
    const cp_vapor = 1840;

    // 6. Specific heat capacity of the humid mixture
    const g = x / (1 + x);
    return (1 - g) * cp_dry + g * cp_vapor;
}

/**
 * Calculates the temperature of air leaving a duct segment.
 * @param {number} t_in - Inlet temperature [°C]
 * @param {number} t_amb - Ambient temperature [°C]
 * @param {number} L - Length of the duct segment [m]
 * @param {number} perimeter - Perimeter of the duct exposed to ambient [m]
 * @param {number} q_m - Mass flow rate of air [kg/s]
 * @param {number} isoThick_m - Insulation thickness [m] (0 if uninsulated)
 * @param {number} isoLambda - Insulation thermal conductivity [W/mK]
 * @param {number} RH_pct - Relative humidity [%]
 * @returns {object} { t_out: number, U: number, q_loss: number }
 */
export function calculateTemperatureDrop(t_in, t_amb, L, perimeter, q_m, isoThick_m = 0, isoLambda = 0.037, RH_pct = 50) {
    if (L <= 0 || q_m <= 0) return { t_out: t_in, U: 0, q_loss: 0 };

    // Specific heat capacity of air [J/(kg*K)]
    const cp = calculateHeatCapacity(t_in, RH_pct);

    // Surface heat transfer coefficients [m²K/W] 
    // Typical values for indoor/ducts: R_si + R_se ~ 0.17
    const R_si_se = 0.17;

    // Thermal resistance of the insulation layer
    const R_iso = isoThick_m > 0 && isoLambda > 0 ? (isoThick_m / isoLambda) : 0;

    // Overall heat transfer coefficient U [W/(m²K)]
    const U = 1.0 / (R_si_se + R_iso);

    // Calculate outlet temperature using the exponential cooling equation
    const exponent = -(U * perimeter * L) / (q_m * cp);
    const t_out = t_amb + (t_in - t_amb) * Math.exp(exponent);

    // Total heat loss to ambient [W]
    const q_loss = q_m * cp * (t_in - t_out);

    return { t_out, U, q_loss };
}

/**
 * Compares two dimension objects for equality.
 * Handles both round {shape: 'round', d: 250} and rectangular {shape: 'rectangular', w: 300, h: 200}
 */
export function areDimensionsEqual(dim1, dim2) {
    if (!dim1 || !dim2) return false;
    if (dim1.shape !== dim2.shape) return false;

    if (dim1.shape === 'round') {
        return parseFloat(dim1.d) === parseFloat(dim2.d);
    } else if (dim1.shape === 'rectangular') {
        // Allow for rotated rectangular ducts (wxh == hxw) optionally, 
        // but for transitioning strict check is usually safer.
        return (parseFloat(dim1.w) === parseFloat(dim2.w) && parseFloat(dim1.h) === parseFloat(dim2.h)) ||
            (parseFloat(dim1.w) === parseFloat(dim2.h) && parseFloat(dim1.h) === parseFloat(dim2.w));
    }
    return false;
}
