
import { getSystemComponents } from './app_state.js';


// State for diagram settings (persisted across renders)
let diagramSettings = {
    colorMode: 'default',
    labelMode: 'name',
    threshold: 0 // Will be auto-set if 0
};

function getColor(comp, mode, threshold) {
    if (mode === 'default') return '#00E4FF'; // Neon Blue

    // Logic specific to Pressure: Only Straight Ducts
    if (mode === 'pressure' && comp.type !== 'straightDuct') {
        return '#555'; // Grey for non-ducts in pressure mode
    }

    // Helper for gradient (Blue -> Green -> Red)
    const getGradientColor = (t) => {
        // t from 0 to 1
        // 0 = Blue (0, 0, 255)
        // 0.5 = Green (0, 255, 0)
        // 1 = Red (255, 0, 0)
        t = Math.max(0, Math.min(1, t));
        let r, g, b;
        if (t < 0.5) {
            // Blue to Green
            const p = t * 2;
            r = 0;
            g = Math.round(255 * p);
            b = Math.round(255 * (1 - p));
        } else {
            // Green to Red
            const p = (t - 0.5) * 2;
            r = Math.round(255 * p);
            g = Math.round(255 * (1 - p));
            b = 0;
        }
        return `rgb(${r}, ${g}, ${b})`;
    };

    let val = 0;
    let max = threshold || 1;

    if (mode === 'velocity') {
        val = comp.state?.velocity || 0;
        if (max === 0) max = 10; // Default fallback
    }
    else if (mode === 'pressure') {
        val = comp.state?.pressureLoss || 0;
        if (comp.type === 'straightDuct' && comp.state?.calculationDetails?.pressureDrop) {
            val = comp.state.calculationDetails.pressureDrop;
        } else {
            val = 0;
        }
        if (max === 0) max = 1; // Default fallback
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
        const tempMin = 5; // Fixed base for visualization
        if (max === 0) max = 30; // Default max temp
        if (max <= tempMin) max = tempMin + 1;

        const normalized = (val - tempMin) / (max - tempMin);
        return getTemperatureGradient(normalized);
    }

    return getGradientColor(val / max);
}

// Global update function to handle control changes without full re-creation if possible
window.updateDiagramSettings = () => {
    const colorMode = document.getElementById('diagramColorMode').value;
    const labelMode = document.getElementById('diagramLabelMode').value;
    const slider = document.getElementById('colorThresholdSlider');
    const threshold = parseFloat(slider.value);

    diagramSettings.colorMode = colorMode;
    diagramSettings.labelMode = labelMode;
    diagramSettings.threshold = threshold;

    // Update Slider Label
    document.getElementById('thresholdVal').textContent = threshold;

    // Identify Units
    let unit = '';
    if (colorMode === 'velocity') unit = 'm/s';
    else if (colorMode === 'pressure') unit = 'Pa/m';
    else if (colorMode === 'temperature') unit = '°C';
    document.getElementById('thresholdUnit').textContent = unit;

    // Show/Hide Slider
    const sliderContainer = document.getElementById('sliderContainer');
    if (colorMode === 'default') sliderContainer.classList.add('hidden');
    else sliderContainer.classList.remove('hidden');

    renderDiagram(true); // Re-render content only
};

export function renderDiagram(keepControls = false) {
    const container = document.getElementById('systemDiagramContainer');
    if (!container) return;

    const components = getSystemComponents();
    if (components.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#666;">Ingen komponenter at vise.</p>';
        return;
    }

    // Determine Max Values for Sliders if not set
    let maxV = 0;
    let maxP = 0;
    let maxT = 0;
    components.forEach(c => {
        let v = c.state?.velocity || 0;
        let pDrop = c.state?.calculationDetails?.pressureDrop || 0;
        let t = c.state?.temperature_in || 20;
        if (v > maxV) maxV = v;
        if (c.type === 'straightDuct' && pDrop > maxP) maxP = pDrop;
        if (t > maxT) maxT = t;
    });
    // Round up
    maxV = Math.ceil(maxV * 2) / 2;
    maxP = Math.ceil(maxP * 2) / 2;
    maxT = Math.ceil(maxT / 5) * 5;
    if (maxV === 0) maxV = 10;
    if (maxP === 0) maxP = 2;
    if (maxT === 0) maxT = 30;

    // If switching modes, update threshold defaults?
    // Start with a reasonable default if 0
    let currentMax = 10;
    if (diagramSettings.colorMode === 'velocity') currentMax = maxV;
    if (diagramSettings.colorMode === 'pressure') currentMax = maxP;
    if (diagramSettings.colorMode === 'temperature') currentMax = maxT;

    // Use user threshold if set and valid for current mode? 
    // It's tricky to share threshold between modes.
    // Let's reset threshold when mode changes? handled in UI by reading slider, but logic here needs to be robust.

    // If we re-render, we use settings.
    // If keepControls is true, we assume DOM controls match settings.

    // Generate Controls HTML
    const controlsHtml = `
    <style>
        .diagram-menu { transition: max-height 0.3s ease-out; overflow: hidden; max-height: 500px; display: flex; flex-direction: column; gap: 8px; margin-top: 5px; }
        .diagram-menu.minimized { max-height: 0px; margin-top: 0px; }
        .diagram-overlay-container { position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.8); padding: 10px; border-radius: 8px; color: #fff; z-index: 100; min-width: 160px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-size: 0.85rem; }
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
             
             <div id="sliderContainer" class="${diagramSettings.colorMode === 'default' ? 'hidden' : ''}">
                 <label style="font-size: 11px; display:block; margin-top:5px; margin-bottom:3px;">
                     Maks: <span id="thresholdVal">${diagramSettings.threshold || currentMax}</span> <span id="thresholdUnit">${diagramSettings.colorMode === 'velocity' ? 'm/s' : (diagramSettings.colorMode === 'pressure' ? 'Pa/m' : '°C')}</span>
                 </label>
                 <input type="range" id="colorThresholdSlider" 
                        min="0" 
                        max="${diagramSettings.colorMode === 'velocity' ? 10 : (diagramSettings.colorMode === 'pressure' ? 5 : 40)}" 
                        step="${diagramSettings.colorMode === 'temperature' ? 1 : 0.1}" 
                        value="${diagramSettings.threshold || currentMax}" 
                        style="width: 100%; accent-color: #00E4FF;"
                        oninput="document.getElementById('thresholdVal').textContent = this.value; window.updateDiagramSettings();">
             </div>
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

    let startAirflow = components[0].state?.airflow_in || components[0].airflow;
    svgContent += `
        <circle cx="${x}" cy="${y}" r="6" fill="#fff" />
        <text x="${x + 15}" y="${y + 5}" fill="#fff" font-size="12">Start: ${startAirflow ? Math.round(startAirflow) : '?'} m³/h</text>
    `;

    components.forEach((comp, index) => {
        const rad = currentAngle * Math.PI / 180;
        const dir = { x: Math.cos(rad), y: Math.sin(rad) };
        const perp = { x: -dir.y, y: dir.x }; // Perpendicular vector (Left relative to flow)

        const strokeColor = getColor(comp, diagramSettings.colorMode, diagramSettings.threshold || currentMax);

        // --- 1. Determine Component Visuals & Movement ---

        let moveDistance = gridStep;
        let turnAngle = 0; // Degrees to turn AFTER this component

        // Logic for turning
        let isBend = comp.type.startsWith('bend') || comp.type === 'transition_round_rect' || comp.type === 'transition_rect_round';
        if (isBend) {
            // Check angle (default 90)
            const bendAngle = comp.properties?.angle || 90;
            // Alternating Left/Right turns for zig-zag simulation if we don't have explicit direction
            // We use index to make it predictable: Even index bends turn right (+), Odd turns left (-)
            const turnDir = (index % 2 === 0) ? -1 : 1;
            turnAngle = bendAngle * turnDir;
            // Reduce move distance for bends to make them look like corners
            moveDistance = gridStep * 0.6;
        }
        else if (comp.type.includes('tee')) {
            const chosenPath = comp.state?.calculationDetails?.chosenPath || comp.properties?.path;
            const bendAngle = 90; // Default T branch angle
            if (chosenPath === 'branch' || chosenPath === 'path2') {
                const turnDir = (index % 2 === 0) ? -1 : 1;
                turnAngle = bendAngle * turnDir;
            }
        }

        // Calculate End Position along CURRENT trajectory (before the turn takes effect for the NEXT component)
        let nextX = x + (dir.x * moveDistance);
        let nextY = y + (dir.y * moveDistance);

        // Calculate visual width based on component physical dimensions
        let currentW = 12; // Default fallback half-width
        const dim = comp.state?.inletDimension || comp.state?.outletDimension?.outlet || comp.state?.outletDimension?.straight;
        if (dim && dim.d) currentW = dim.d / 20; // 250mm -> 12.5px
        else if (dim && dim.w) currentW = dim.w / 20;

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

            // Draw Fill for Color Mode
            icon += `<polygon points="${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}" fill="${volColor}" fill-opacity="${volOpacity}" stroke="${strokeColor}" stroke-width="2" />`;
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

                // Unused Branch (dashed)
                const branchTurn = (index % 2 === 0) ? -90 : 90;
                const branchRad = (currentAngle + branchTurn) * Math.PI / 180;
                const branchX = midX + (Math.cos(branchRad) * stubLen);
                const branchY = midY + (Math.sin(branchRad) * stubLen);

                icon += `<line x1="${midX}" y1="${midY}" x2="${branchX}" y2="${branchY}" stroke="${volColor}" stroke-width="${currentW * 2}" stroke-opacity="${volOpacity}" stroke-linecap="butt" />`;
                icon += `<line x1="${midX}" y1="${midY}" x2="${branchX}" y2="${branchY}" stroke="${branchColor}" stroke-width="2" stroke-dasharray="4"/>`;
            } else {
                // Active path: Branch. Unused path: Straight
                const branchRad = (currentAngle + turnAngle) * Math.PI / 180;
                nextX = midX + (Math.cos(branchRad) * stubLen);
                nextY = midY + (Math.sin(branchRad) * stubLen);

                // Active Branch
                icon += `<line x1="${midX}" y1="${midY}" x2="${nextX}" y2="${nextY}" stroke="${volColor}" stroke-width="${currentW * 2}" stroke-opacity="${volOpacity}" stroke-linecap="butt" />`;
                icon += `<line x1="${midX}" y1="${midY}" x2="${nextX}" y2="${nextY}" stroke="${strokeColor}" stroke-width="2" />`;

                // Unused Straight (dashed)
                const straightX = midX + (dir.x * stubLen);
                const straightY = midY + (dir.y * stubLen);

                icon += `<line x1="${midX}" y1="${midY}" x2="${straightX}" y2="${straightY}" stroke="${volColor}" stroke-width="${currentW * 2}" stroke-opacity="${volOpacity}" stroke-linecap="butt" />`;
                icon += `<line x1="${midX}" y1="${midY}" x2="${straightX}" y2="${straightY}" stroke="${branchColor}" stroke-width="2" stroke-dasharray="4"/>`;
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
