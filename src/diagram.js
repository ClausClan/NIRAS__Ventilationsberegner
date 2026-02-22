
import { getSystemComponents } from './app_state.js';


// State for diagram settings (persisted across renders)
let diagramSettings = {
    colorMode: 'default',
    labelMode: 'name',
    threshold: 0 // Will be auto-set if 0
};

function getColor(comp, mode, min, max) {
    if (mode === 'default') return '#00E4FF'; // Neon Blue

    // Logic specific to Pressure: Only Straight Ducts
    if (mode === 'pressure' && comp.type !== 'straightDuct') {
        return '#555'; // Grey for non-ducts in pressure mode
    }

    // Helper for gradient (Blue -> Green -> Red)
    const getGradientColor = (t) => {
        t = Math.max(0, Math.min(1, t));
        let r, g, b;
        if (t < 0.5) {
            const p = t * 2;
            r = 0;
            g = Math.round(255 * p);
            b = Math.round(255 * (1 - p));
        } else {
            const p = (t - 0.5) * 2;
            r = Math.round(255 * p);
            g = Math.round(255 * (1 - p));
            b = 0;
        }
        return `rgb(${r}, ${g}, ${b})`;
    };

    let val = 0;

    if (mode === 'velocity') {
        val = comp.state?.velocity || 0;
    }
    else if (mode === 'pressure') {
        val = comp.state?.pressureLoss || 0;
        if (comp.type === 'straightDuct' && comp.state?.calculationDetails?.pressureDrop) {
            val = comp.state.calculationDetails.pressureDrop;
        } else {
            val = 0;
        }
    }

    if (mode === 'temperature') {
        const getTemperatureGradient = (t) => {
            t = Math.max(0, Math.min(1, t));
            let r, g, b;
            if (t < 0.33) {
                const p = t / 0.33;
                r = 0; g = Math.round(150 * p); b = 255;
            } else if (t < 0.66) {
                const p = (t - 0.33) / 0.33;
                r = Math.round(255 * p); g = Math.round(150 + 105 * p); b = Math.round(255 * (1 - p));
            } else {
                const p = (t - 0.66) / 0.34;
                r = 255; g = Math.round(255 * (1 - p)); b = 0;
            }
            return `rgb(${r}, ${g}, ${b})`;
        };

        val = comp.state?.temperature_out?.outlet || comp.state?.temperature_out?.outlet_straight || comp.state?.temperature_in || 20;

        let range = max - min;
        if (range <= 0) range = 1;
        const normalized = (val - min) / range;
        return getTemperatureGradient(normalized);
    }

    let range = max - min;
    if (range <= 0) range = 1;
    const normalized = (val - min) / range;
    return getGradientColor(normalized);
}

// Global update function to handle control changes without full re-creation if possible
window.updateDiagramSettings = () => {
    const colorMode = document.getElementById('diagramColorMode').value;
    const labelMode = document.getElementById('diagramLabelMode').value;

    diagramSettings.colorMode = colorMode;
    diagramSettings.labelMode = labelMode;

    // Identify Units and Re-render
    renderDiagram(true);
};

export function renderDiagram(keepControls = false) {
    const container = document.getElementById('systemDiagramContainer');
    if (!container) return;

    const components = getSystemComponents();
    if (components.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#666;">Ingen komponenter at vise.</p>';
        return;
    }

    // Determine Min/Max Values for Legend
    let maxV = -Infinity, minV = Infinity;
    let maxP = -Infinity, minP = Infinity;
    let maxT = -Infinity, minT = Infinity;

    components.forEach((c) => {
        let v = c.state?.velocity || 0;
        let pDrop = c.type === 'straightDuct' ? (c.state?.calculationDetails?.pressureDrop || 0) : 0;
        let t_in = c.state?.temperature_in !== undefined ? c.state.temperature_in : 20;
        let t_out = c.state?.temperature_out?.outlet || c.state?.temperature_out?.outlet_straight || t_in;

        if (v > maxV) maxV = v;
        if (v < minV) minV = v;

        if (c.type === 'straightDuct') {
            if (pDrop > maxP) maxP = pDrop;
            if (pDrop < minP) minP = pDrop;
        }

        if (t_in > maxT) maxT = t_in;
        if (t_in < minT) minT = t_in;
        if (t_out > maxT) maxT = t_out;
        if (t_out < minT) minT = t_out;
    });

    if (maxV === -Infinity) { maxV = 10; minV = 0; }
    if (maxP === -Infinity) { maxP = 2; minP = 0; }
    if (maxT === -Infinity) { maxT = 30; minT = 5; }

    let currentMin = 0;
    let currentMax = 10;
    let legendLabel = '';
    let gradientCss = '';

    if (diagramSettings.colorMode === 'velocity') {
        currentMin = minV; currentMax = maxV;
        legendLabel = 'Hastighed (m/s)';
        gradientCss = 'linear-gradient(to right, rgb(0,0,255), rgb(0,255,0), rgb(255,0,0))';
    } else if (diagramSettings.colorMode === 'pressure') {
        currentMin = minP; currentMax = maxP;
        legendLabel = 'Tryktab (Pa/m)';
        gradientCss = 'linear-gradient(to right, rgb(0,0,255), rgb(0,255,0), rgb(255,0,0))';
    } else if (diagramSettings.colorMode === 'temperature') {
        currentMin = minT; currentMax = maxT;
        legendLabel = 'Temperatur (°C)';
        gradientCss = 'linear-gradient(to right, rgb(0,0,255), rgb(0,150,255), rgb(255,255,0), rgb(255,0,0))';
    }

    if (currentMax === currentMin) currentMax = currentMin + 1; // Prevent zero-width range calculation issues

    const formatVal = (val) => Number.isInteger(val) ? val.toString() : val.toFixed(2);

    // Generate Controls HTML
    const controlsHtml = `
    <style>
        .diagram-menu { transition: max-height 0.3s ease-out; overflow: hidden; max-height: 500px; display: flex; flex-direction: column; gap: 8px; margin-top: 5px; }
        .diagram-menu.minimized { max-height: 0px; margin-top: 0px; }
        .diagram-overlay-container { position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.8); padding: 10px; border-radius: 8px; color: #fff; z-index: 100; min-width: 170px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-size: 0.85rem; }
        .diagram-legend-container { position: absolute; bottom: 20px; left: 20px; background: rgba(0,0,0,0.8); padding: 10px 15px; border-radius: 8px; color: #fff; z-index: 100; min-width: 200px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-size: 0.85rem; }
        .legend-bar { height: 12px; width: 100%; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); }
    </style>
    <div id="diagramOverlayControls" class="diagram-overlay-container">
         <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="document.getElementById('diagramMenuContent').classList.toggle('minimized'); this.querySelector('span').textContent = document.getElementById('diagramMenuContent').classList.contains('minimized') ? '▼' : '▲';">
            <strong style="font-size:13px;">Visning</strong>
            <span style="font-size: 10px;">▲</span>
         </div>
         <div id="diagramMenuContent" class="diagram-menu">
             <select id="diagramColorMode" class="input-field" style="width: 100%; padding: 2px; font-size: 0.85rem;" onchange="window.updateDiagramSettings()">
                <option value="default" ${diagramSettings.colorMode === 'default' ? 'selected' : ''}>Farve: Standard</option>
                <option value="velocity" ${diagramSettings.colorMode === 'velocity' ? 'selected' : ''}>Farve: Hastighed</option>
                <option value="pressure" ${diagramSettings.colorMode === 'pressure' ? 'selected' : ''}>Farve: Tryktab (Pa/m)</option>
                <option value="temperature" ${diagramSettings.colorMode === 'temperature' ? 'selected' : ''}>Farve: Temperatur (°C)</option>
             </select>
             <select id="diagramLabelMode" class="input-field" style="width: 100%; padding: 2px; font-size: 0.85rem;" onchange="window.updateDiagramSettings()">
                <option value="name" ${diagramSettings.labelMode === 'name' ? 'selected' : ''}>Tekst: Navn</option>
                <option value="detailed" ${diagramSettings.labelMode === 'detailed' ? 'selected' : ''}>Tekst: Detaljer</option>
                <option value="compact" ${diagramSettings.labelMode === 'compact' ? 'selected' : ''}>Tekst: Kompakt</option>
             </select>
             
             <button class="button" style="width: 100%; font-size: 0.8rem; padding: 2px;" onclick="window.resetDiagramZoom()">Zoom Alle</button>
         </div>
    </div>
    
    <div id="diagramLegend" class="diagram-legend-container ${diagramSettings.colorMode === 'default' ? 'hidden' : ''}">
         <strong style="font-size: 12px; display:block; margin-bottom: 8px; text-align: center;">${legendLabel}</strong>
         <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
             <span style="font-size: 12px; font-variant-numeric: tabular-nums;">${formatVal(currentMin)}</span>
             <div class="legend-bar" style="background: ${gradientCss}; flex-grow: 1;"></div>
             <span style="font-size: 12px; font-variant-numeric: tabular-nums;">${formatVal(currentMax)}</span>
         </div>
    </div>
    `;

    // --- Configuration ---
    const gridStep = 80;
    const branchColor = '#555';
    const strokeWidth = 5; // Thicker for better visibility of colors

    // Limits for viewBox
    let minX = 0, maxX = 0, minY = 0, maxY = 0;

    // --- Cursor State ---
    // Instead of fixed 4 directions, we use an angle in degrees. 
    // 0 = Right, 90 = Down, 180 = Left, 270 = Up. Start going Down.
    let currentAngle = 90;
    let x = 100;
    let y = 60; // Start with some padding

    let svgContent = '';

    // Helper to update bounds
    const updateBounds = (cx, cy) => {
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
    };
    updateBounds(x, y);

    const drawFlowIndicator = (cx, cy, offsetDx, offsetDy, pointDx, pointDy, flow, isTempMode = false, temp = null) => {
        const size = 8;
        const dist = 30; // Distance from duct end increased slightly for wider text

        const ax = cx + offsetDx * dist;
        const ay = cy + offsetDy * dist;

        const tipX = ax + pointDx * size;
        const tipY = ay + pointDy * size;
        const backX = ax - pointDx * size;
        const backY = ay - pointDy * size;

        const pDx = -pointDy;
        const pDy = pointDx;

        const leftX = backX + pDx * size;
        const leftY = backY + pDy * size;
        const rightX = backX - pDx * size;
        const rightY = backY - pDy * size;

        const lx = ax + offsetDx * 25;
        const ly = ay + offsetDy * 25;

        let text = `${Math.round(flow)} m³/h`;
        if (isTempMode && temp !== null) {
            text = `${temp.toFixed(1)}°C | ` + text;
        }

        return `
            <polygon points="${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}" fill="#00E5FF" />
            <text x="${lx}" y="${ly}" fill="#00E5FF" font-size="12" font-weight="bold" text-anchor="middle" dominant-baseline="middle" text-shadow="0px 0px 4px #000">${text}</text>
        `;
    };

    let startAirflow = components[0].state?.airflow_in || components[0].airflow;
    svgContent += `
        <circle cx="${x}" cy="${y}" r="6" fill="#fff" />
        <text x="${x + 15}" y="${y + 5}" fill="#fff" font-size="12">Start</text>
    `;

    // Global Start Arrow (Air enters system at index 0)
    const initRad = currentAngle * Math.PI / 180;
    const initDir = { x: Math.cos(initRad), y: Math.sin(initRad) };
    const isTempMode = diagramSettings.colorMode === 'temperature';
    if (startAirflow) {
        let startTemp = components[0].state?.temperature_in !== undefined ? components[0].state.temperature_in : 20;
        svgContent += drawFlowIndicator(x, y, -initDir.x, -initDir.y, initDir.x, initDir.y, startAirflow, isTempMode, startTemp);
    }

    components.forEach((comp, index) => {
        const rad = currentAngle * Math.PI / 180;
        const dir = { x: Math.cos(rad), y: Math.sin(rad) };
        const perp = { x: -dir.y, y: dir.x }; // Perpendicular vector (Left relative to flow)

        const strokeColor = getColor(comp, diagramSettings.colorMode, currentMin, currentMax);

        // Calculate visual width based on component physical dimensions
        let currentW = 12; // Default fallback half-width
        const dim = comp.state?.inletDimension || comp.state?.outletDimension?.outlet || comp.state?.outletDimension?.straight;
        if (dim && dim.d) currentW = dim.d / 20; // Scale: 250mm -> 12.5px half-width -> 25px total -> 100 pixels per meter
        else if (dim && dim.w) currentW = dim.w / 20;

        // --- 1. Determine Component Visuals & Movement ---

        const PIXELS_PER_METER = 100;
        let moveDistance = gridStep;
        let turnAngle = 0; // Degrees to turn AFTER this component

        // Logic for turning and scaling lengths
        let isBend = comp.type.startsWith('bend') || comp.type === 'transition_round_rect' || comp.type === 'transition_rect_round';
        if (isBend) {
            const bendAngle = comp.properties?.angle || 90;
            const turnDir = (index % 2 === 0) ? -1 : 1;
            turnAngle = bendAngle * turnDir;
            moveDistance = Math.max(60, currentW * 3); // Base curve size on width
        }
        else if (comp.type.includes('tee')) {
            const chosenPath = comp.state?.calculationDetails?.chosenPath || comp.properties?.path;
            const bendAngle = 90;
            if (chosenPath === 'branch' || chosenPath === 'path2') {
                const turnDir = (index % 2 === 0) ? -1 : 1;
                turnAngle = bendAngle * turnDir;
            }
            moveDistance = Math.max(80, currentW * 4); // T-pieces are relatively large
        }
        else if (comp.type === 'straightDuct') {
            const length_m = comp.properties?.length || 1;
            moveDistance = Math.max(40, length_m * PIXELS_PER_METER); // True scale relative to 100px/m
        }
        else {
            moveDistance = Math.max(80, currentW * 3); // Default for other fittings
        }

        // Calculate End Position along CURRENT trajectory (before the turn takes effect for the NEXT component)
        let nextX = x + (dir.x * moveDistance);
        let nextY = y + (dir.y * moveDistance);

        // --- 2. Draw Connection ---

        let icon = '';
        let label = '';
        let showDetails = diagramSettings.labelMode === 'detailed';
        let showCompact = diagramSettings.labelMode === 'compact';
        let labelOffset = Math.max(18, currentW + 5);

        // Label position
        let labelX = x + ((nextX - x) / 2) + (perp.x * labelOffset);
        let labelY = y + ((nextY - y) / 2) + (perp.y * labelOffset);
        let textAnchor = 'end';

        // If flow is roughly horizontal, center text above it
        if (Math.abs(dir.x) > 0.5) {
            textAnchor = 'middle';
            labelY -= (currentW + 5);
        }

        const volColor = strokeColor;
        const volOpacity = "0.2";

        // Draw Logic based on Type
        if (comp.type === 'straightDuct') {
            const w = currentW;
            const p1 = { x: x + perp.x * w, y: y + perp.y * w };
            const p2 = { x: nextX + perp.x * w, y: nextY + perp.y * w };
            const p3 = { x: nextX - perp.x * w, y: nextY - perp.y * w };
            const p4 = { x: x - perp.x * w, y: y - perp.y * w };

            let currentStrokeColor = strokeColor;
            let currentFillColor = volColor;
            let currentFillOpacity = volOpacity;
            let defsHtml = '';

            // Apply SVG Linear Gradient if in temperature mode
            if (diagramSettings.colorMode === 'temperature') {
                const t_in = comp.state?.temperature_in !== undefined ? comp.state.temperature_in : 20;
                const t_out = comp.state?.temperature_out?.outlet !== undefined ? comp.state.temperature_out.outlet : t_in;

                const colorStart = getColor({ state: { temperature_in: t_in } }, 'temperature', currentMin, currentMax);
                const colorEnd = getColor({ state: { temperature_in: t_out } }, 'temperature', currentMin, currentMax);

                const gradId = `grad_${comp.id || index}`;
                defsHtml = `<linearGradient id="${gradId}" x1="${x}" y1="${y}" x2="${nextX}" y2="${nextY}" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="${colorStart}" />
                    <stop offset="100%" stop-color="${colorEnd}" />
                </linearGradient>`;

                icon += defsHtml;
                currentStrokeColor = `url(#${gradId})`;
                currentFillColor = `url(#${gradId})`;
                currentFillOpacity = "0.5"; // Slightly more opaque to see gradient better
            }

            // Draw Fill for Color Mode
            icon += `<polygon points="${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}" fill="${currentFillColor}" fill-opacity="${currentFillOpacity}" stroke="${currentStrokeColor}" stroke-width="2" />`;
            label = `Lige Kanal`;
        }
        else if (isBend) {
            // Draw a bezier curve to simulate the bend
            // Control point extends from current direction
            const cpDistance = moveDistance * 0.5;
            const cpX = x + (dir.x * cpDistance);
            const cpY = y + (dir.y * cpDistance);

            // To make a smooth curve, the endpoint needs to shift based on the new angle
            const newRad = (currentAngle + turnAngle) * Math.PI / 180;
            const newDir = { x: Math.cos(newRad), y: Math.sin(newRad) };

            // Recalculate nextX, nextY for bends to actually represent a curve exiting at the new angle
            nextX = cpX + (newDir.x * cpDistance);
            nextY = cpY + (newDir.y * cpDistance);

            // Volume
            icon += `<path d="M${x},${y} Q${cpX},${cpY} ${nextX},${nextY}" fill="none" stroke="${volColor}" stroke-width="${currentW * 2}" stroke-opacity="${volOpacity}" stroke-linecap="butt" />`;
            // Centerline
            icon += `<path d="M${x},${y} Q${cpX},${cpY} ${nextX},${nextY}" fill="none" stroke="${strokeColor}" stroke-width="2" />`;
            label = `Bøjning`;
        }
        else if (comp.type.includes('tee')) {
            const stubLen = moveDistance * 0.5;
            const midX = x + (dir.x * stubLen);
            const midY = y + (dir.y * stubLen);

            // Draw inlet to mid
            icon += `<line x1="${x}" y1="${y}" x2="${midX}" y2="${midY}" stroke="${volColor}" stroke-width="${currentW * 2}" stroke-opacity="${volOpacity}" stroke-linecap="butt" />`;
            icon += `<line x1="${x}" y1="${y}" x2="${midX}" y2="${midY}" stroke="${strokeColor}" stroke-width="2" />`;

            if (turnAngle === 0) {
                // Active path: Straight. Unused path: Branch
                nextX = midX + (dir.x * stubLen);
                nextY = midY + (dir.y * stubLen);

                // Active Straight
                icon += `<line x1="${midX}" y1="${midY}" x2="${nextX}" y2="${nextY}" stroke="${volColor}" stroke-width="${currentW * 2}" stroke-opacity="${volOpacity}" stroke-linecap="butt" />`;
                icon += `<line x1="${midX}" y1="${midY}" x2="${nextX}" y2="${nextY}" stroke="${strokeColor}" stroke-width="2" />`;

                const branchTurn = (index % 2 === 0) ? -90 : 90;
                const branchRad = (currentAngle + branchTurn) * Math.PI / 180;
                const bDx = Math.cos(branchRad);
                const bDy = Math.sin(branchRad);
                const branchX = midX + (bDx * stubLen);
                const branchY = midY + (bDy * stubLen);

                icon += `<line x1="${midX}" y1="${midY}" x2="${branchX}" y2="${branchY}" stroke="${volColor}" stroke-width="${currentW * 2}" stroke-opacity="${volOpacity}" stroke-linecap="butt" />`;
                icon += `<line x1="${midX}" y1="${midY}" x2="${branchX}" y2="${branchY}" stroke="${branchColor}" stroke-width="2" stroke-dasharray="4"/>`;

                // Draw Arrow for unused branch
                if (comp.properties?.q_branch) {
                    const isMerging = window.appState ? window.appState.systemType === 'merging' : false; // Fallback, we should just read from comp
                    const flowType = comp.properties.flowType || (window.appState ? window.appState.systemType : 'splitting');
                    const branchTemp = comp.state?.temperature_out?.outlet_branch !== undefined ? comp.state.temperature_out.outlet_branch : (comp.state?.temperature_in || 20);
                    if (flowType === 'splitting') {
                        icon += drawFlowIndicator(branchX, branchY, bDx, bDy, bDx, bDy, comp.properties.q_branch, isTempMode, branchTemp);
                    } else {
                        icon += drawFlowIndicator(branchX, branchY, bDx, bDy, -bDx, -bDy, comp.properties.q_branch, isTempMode, branchTemp);
                    }
                }
            } else {
                // Active path: Branch. Unused path: Straight
                const branchRad = (currentAngle + turnAngle) * Math.PI / 180;
                nextX = midX + (Math.cos(branchRad) * stubLen);
                nextY = midY + (Math.sin(branchRad) * stubLen);

                // Active Branch
                icon += `<line x1="${midX}" y1="${midY}" x2="${nextX}" y2="${nextY}" stroke="${volColor}" stroke-width="${currentW * 2}" stroke-opacity="${volOpacity}" stroke-linecap="butt" />`;
                icon += `<line x1="${midX}" y1="${midY}" x2="${nextX}" y2="${nextY}" stroke="${strokeColor}" stroke-width="2" />`;

                // Unused Straight (dashed)
                const sDx = dir.x;
                const sDy = dir.y;
                const straightX = midX + (sDx * stubLen);
                const straightY = midY + (sDy * stubLen);

                icon += `<line x1="${midX}" y1="${midY}" x2="${straightX}" y2="${straightY}" stroke="${volColor}" stroke-width="${currentW * 2}" stroke-opacity="${volOpacity}" stroke-linecap="butt" />`;
                icon += `<line x1="${midX}" y1="${midY}" x2="${straightX}" y2="${straightY}" stroke="${branchColor}" stroke-width="2" stroke-dasharray="4"/>`;

                // Draw Arrow for unused straight
                if (comp.properties?.q_straight) {
                    const flowType = comp.properties.flowType || (window.appState ? window.appState.systemType : 'splitting');
                    const straightTemp = comp.state?.temperature_out?.outlet_straight !== undefined ? comp.state.temperature_out.outlet_straight : (comp.state?.temperature_in || 20);
                    if (flowType === 'splitting') {
                        icon += drawFlowIndicator(straightX, straightY, sDx, sDy, sDx, sDy, comp.properties.q_straight, isTempMode, straightTemp);
                    } else {
                        icon += drawFlowIndicator(straightX, straightY, sDx, sDy, -sDx, -sDy, comp.properties.q_straight, isTempMode, straightTemp);
                    }
                }
            }
            label = `T - stykke`;
        }
        else if (comp.type.includes('expansion') || comp.type.includes('contraction') || comp.type.includes('transition')) {
            const w1 = 15; // Inlet width
            const w2 = 25; // Outlet width
            const isExpansion = comp.type.includes('expansion') || comp.type.includes('transition'); // Simplify

            const wa = isExpansion ? w1 : w2;
            const wb = isExpansion ? w2 : w1;

            const p1 = { x: x + perp.x * wa, y: y + perp.y * wa };
            const p4 = { x: x - perp.x * wa, y: y - perp.y * wa };
            const p2 = { x: nextX + perp.x * wb, y: nextY + perp.y * wb };
            const p3 = { x: nextX - perp.x * wb, y: nextY - perp.y * wb };

            icon += `<polygon points="${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}" fill="${strokeColor}" fill-opacity="0.2" stroke="${strokeColor}" stroke-width="2" />`;
            label = comp.type.includes('expansion') ? 'Udvidelse' : 'Indsnævring';
        }
        else {
            icon += `<line x1="${x}" y1="${y}" x2="${nextX}" y2="${nextY}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`;
            label = comp.name.split(' ')[0];
        }

        // Construct Label HTML
        let displayedLabel = label;
        if (diagramSettings.labelMode !== 'name') {
            // Velocity / Pressure info
            const v = comp.state?.velocity ? `${Math.round(comp.state.velocity * 100) / 100} m / s` : '';
            const p = comp.state?.pressureLoss ? `${Math.round(comp.state.pressureLoss)} Pa` : '';

            if (showCompact) {
                displayedLabel = `${v} | ${p} `;
            } else if (showDetails) {
                displayedLabel = `${label} (${v}, ${p})`;
            }
        }

        // Add info Text
        icon += `<text x="${labelX}" y="${labelY}" text-anchor="${textAnchor}" fill="#ccc" font-size="10">${displayedLabel}</text>`;

        // Add Node Dot at end
        icon += `<circle cx="${nextX}" cy="${nextY}" r="4" fill="#16213E" stroke="${strokeColor}" stroke-width="2" />`;

        // Global End Arrow (Air leaves system at last component)
        if (index === components.length - 1) {
            let endFlow = comp.state?.airflow_out?.outlet || comp.state?.airflow_out?.outlet_straight || comp.state?.airflow_out?.outlet_branch || comp.airflow || 0;

            // Re-calculate the final direction because Bends change it before the END of their own drawing
            let finalRad = currentAngle * Math.PI / 180;
            if (isBend || comp.type.includes('tee')) {
                finalRad = (currentAngle + turnAngle) * Math.PI / 180;
            }
            const fDx = Math.cos(finalRad);
            const fDy = Math.sin(finalRad);

            if (endFlow) {
                const endTemp = comp.state?.temperature_out?.outlet || comp.state?.temperature_out?.outlet_straight || comp.state?.temperature_in || 20;
                icon += drawFlowIndicator(nextX, nextY, fDx, fDy, fDx, fDy, endFlow, isTempMode, endTemp);
                updateBounds(nextX + fDx * 50, nextY + fDy * 50); // Expand bounds for arrow
            }
        }

        svgContent += icon;

        // Apply Turn
        currentAngle = (currentAngle + turnAngle + 360) % 360;

        // Update Global Cursor
        x = nextX;
        y = nextY;
        updateBounds(x, y);
    });

    // Padding
    const p = 60;
    const vbX = minX - p;
    const vbY = minY - p;
    const vbW = (maxX - minX) + p * 2;
    const vbH = (maxY - minY) + p * 2;

    const svgHtml = `
        <svg id="mainDiagramSvg" width="100%" height="100%" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" xmlns="http://www.w3.org/2000/svg" style="max-height: 600px; touch-action: none; cursor: grab;">
            <style>
                text { font-family: 'Inter', sans-serif; pointer-events: none; text-shadow: 0px 0px 3px rgba(0,0,0,0.8); }
            </style>
            <g id="diagramContent">
                ${svgContent}
            </g>
        </svg>
    `;

    let controlsDiv = document.getElementById('diagramOverlayControls');
    let svgContainer = document.getElementById('diagramSvgContainer');

    if (!controlsDiv || !svgContainer) {
        // First Time Setup
        container.style.position = 'relative';
        container.innerHTML = controlsHtml + `<div id="diagramSvgContainer" style="width:100%; height:100%; border: 1px solid #333; overflow:hidden;">${svgHtml}</div>`;
    } else {
        // Update SVG Only
        svgContainer.innerHTML = svgHtml;
    }

    // Attach Pan & Zoom
    setupZoomPan(vbX, vbY, vbW, vbH);
}

// --- Zoom & Pan Implementation ---
let currentZoom = { x: 0, y: 0, scale: 1 };
let baseViewBox = { x: 0, y: 0, w: 1000, h: 1000 };

window.resetDiagramZoom = () => {
    currentZoom = { x: 0, y: 0, scale: 1 };
    applyZoom();
};

function applyZoom() {
    const g = document.getElementById('diagramContent');
    const svg = document.getElementById('mainDiagramSvg');
    if (g && svg) {
        g.setAttribute('transform', `translate(${currentZoom.x}, ${currentZoom.y}) scale(${currentZoom.scale})`);
    }
}

function setupZoomPan(vbX, vbY, vbW, vbH) {
    baseViewBox = { x: vbX, y: vbY, w: vbW, h: vbH };
    const svg = document.getElementById('mainDiagramSvg');
    if (!svg) return;

    let isPanning = false;
    let startPoint = { x: 0, y: 0 };

    // We apply initial pan/zoom if previously set, otherwise use viewBox framing
    // Actually, if we use viewBox to set the initial framing, scale 1 is exactly what we want.
    applyZoom();

    svg.addEventListener('mousedown', (e) => {
        isPanning = true;
        svg.style.cursor = 'grabbing';
        startPoint = { x: e.clientX - currentZoom.x, y: e.clientY - currentZoom.y };
    });

    window.addEventListener('mouseup', () => {
        isPanning = false;
        if (svg) svg.style.cursor = 'grab';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        currentZoom.x = e.clientX - startPoint.x;
        currentZoom.y = e.clientY - startPoint.y;
        applyZoom();
    });

    svg.addEventListener('wheel', (e) => {
        e.preventDefault();

        // Calculate zoom focus point
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());

        // Scaling factor
        const zoomIntensity = 0.1;
        const wheel = e.deltaY < 0 ? 1 : -1;

        const oldScale = currentZoom.scale;
        const zoomFac = Math.exp(wheel * zoomIntensity);
        currentZoom.scale *= zoomFac;

        // Limit scale
        currentZoom.scale = Math.max(0.1, Math.min(10, currentZoom.scale));

        // Offset to zoom into mouse
        const scaleChange = currentZoom.scale / oldScale;
        currentZoom.x = svgP.x - (svgP.x - currentZoom.x) * scaleChange;
        currentZoom.y = svgP.y - (svgP.y - currentZoom.y) * scaleChange;

        applyZoom();
    }, { passive: false });
}

export function toggleDiagramView() {
    const tableContainer = document.getElementById('systemComponentsContainer');
    const diagramContainer = document.getElementById('systemDiagramContainer');
    const toggleBtn = document.getElementById('toggleViewBtn');
    const controls = document.getElementById('diagramControls');

    if (diagramContainer.classList.contains('hidden')) {
        // Show Diagram
        diagramContainer.classList.remove('hidden');
        if (controls) controls.classList.remove('hidden');
        tableContainer.classList.add('hidden');
        toggleBtn.textContent = 'Vis Tabel';
        renderDiagram();
    } else {
        // Show Table
        diagramContainer.classList.add('hidden');
        if (controls) controls.classList.add('hidden');
        tableContainer.classList.remove('hidden');
        toggleBtn.textContent = 'Vis Diagram';
    }

}
