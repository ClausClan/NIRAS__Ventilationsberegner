import { getSystemComponents } from './app_state.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let diagramSettings = {
    colorMode: 'default',
    labelMode: 'name',
    threshold: 0
};

// Global update function
window.updateDiagramSettings = () => {
    const colorMode = document.getElementById('diagramColorMode').value;
    const labelMode = document.getElementById('diagramLabelMode').value;
    diagramSettings.colorMode = colorMode;
    diagramSettings.labelMode = labelMode;
    renderDiagram(true);
};

// Colors
function getColorByValue(val, mode, min, max) {
    if (mode === 'default') return 0x00E4FF; // Neon Blue Hex

    let range = max - min;
    if (range <= 0) range = 1;
    let t = Math.max(0, Math.min(1, (val - min) / range));

    // Temperature (Blue -> Green -> Yellow -> Red)
    if (mode === 'temperature') {
        let r, g, b;
        if (t < 0.33) {
            const p = t / 0.33;
            r = 0; g = 150 * p; b = 255;
        } else if (t < 0.66) {
            const p = (t - 0.33) / 0.33;
            r = 255 * p; g = 150 + 105 * p; b = 255 * (1 - p);
        } else {
            const p = (t - 0.66) / 0.34;
            r = 255; g = 255 * (1 - p); b = 0;
        }
        return new THREE.Color(r / 255, g / 255, b / 255).getHex();
    }

    // Default Gradient (Blue -> Green -> Red)
    let r, g, b;
    if (t < 0.5) {
        const p = t * 2;
        r = 0; g = p; b = 1 - p;
    } else {
        const p = (t - 0.5) * 2;
        r = p; g = 1 - p; b = 0;
    }
    return new THREE.Color(r, g, b).getHex();
}

function getColor(comp, mode, min, max) {
    let val = 0;
    if (mode === 'velocity') val = comp.state?.velocity || 0;
    else if (mode === 'pressure') val = comp.type === 'straightDuct' ? (comp.state?.calculationDetails?.pressureDrop || 0) : 0;
    else if (mode === 'temperature') val = comp.state?.temperature_out?.outlet || comp.state?.temperature_out?.outlet_straight || comp.state?.temperature_in || 20;

    return getColorByValue(val, mode, min, max);
}

// Global 3D States
let scene, camera, renderer, controls;
let labelsMap = new Map(); // Keep track of HTML labels

// --- Toggle Diagram View ---
export function toggleDiagramView() {
    const container = document.getElementById('systemDiagramContainer');
    const tableContainer = document.getElementById('systemComponentsContainer');
    const totalPressureDropContainer = document.getElementById('totalPressureDropContainer');
    const toggleBtn = document.getElementById('toggleViewBtn');
    const diagControls = document.getElementById('diagramControls');

    // Toggle active state on the diagram container
    container.classList.toggle('active');

    if (container.classList.contains('active')) {
        if (tableContainer) tableContainer.style.display = 'none';
        if (totalPressureDropContainer) totalPressureDropContainer.style.display = 'none';
        container.style.display = 'block';
        toggleBtn.innerHTML = '<i class="fas fa-list"></i> Vis Tabel';
        if (diagControls) diagControls.classList.remove('hidden');
        renderDiagram();
    } else {
        if (tableContainer) tableContainer.style.display = 'block';
        if (totalPressureDropContainer) totalPressureDropContainer.style.display = 'block';
        container.style.display = 'none';
        toggleBtn.innerHTML = '<i class="fas fa-project-diagram"></i> Vis Diagram';
        if (diagControls) diagControls.classList.add('hidden');
    }
}

export function renderDiagram(keepControls = false) {
    const container = document.getElementById('systemDiagramContainer');
    if (!container) return;

    const components = getSystemComponents();
    if (components.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#666;">Ingen komponenter at vise i 3D.</p>';
        return;
    }

    // --- 1. Init Three.js Environment ---
    let webglContainer = document.getElementById('diagramWebglContainer');

    // Inject HTML layout if first time
    if (!webglContainer || !renderer) {
        container.style.position = 'relative';
        container.innerHTML = `
            <div id="diagramOverlayControls" class="diagram-overlay-container" style="position:absolute; top:10px; right:10px; z-index:100; background:rgba(0,0,0,0.8); padding:10px; border-radius:8px; color:white;">
                 <select id="diagramColorMode" class="input-field" style="width:100%;font-size:0.8rem;" onchange="window.updateDiagramSettings()">
                    <option value="default" ${diagramSettings.colorMode === 'default' ? 'selected' : ''}>Farve: Standard</option>
                    <option value="velocity" ${diagramSettings.colorMode === 'velocity' ? 'selected' : ''}>Farve: Hastighed</option>
                    <option value="pressure" ${diagramSettings.colorMode === 'pressure' ? 'selected' : ''}>Farve: Tryktab</option>
                    <option value="temperature" ${diagramSettings.colorMode === 'temperature' ? 'selected' : ''}>Farve: Temperatur</option>
                 </select>
                 <select id="diagramLabelMode" class="input-field" style="width:100%;font-size:0.8rem; margin-top:5px;" onchange="window.updateDiagramSettings()">
                    <option value="name" ${diagramSettings.labelMode === 'name' ? 'selected' : ''}>Tekst: Navn</option>
                    <option value="detailed" ${diagramSettings.labelMode === 'detailed' ? 'selected' : ''}>Tekst: Detaljer</option>
                    <option value="none" ${diagramSettings.labelMode === 'none' ? 'selected' : ''}>Tekst: Skjul</option>
                 </select>
            </div>
            <div id="diagramWebglContainer" style="width:100%; height:100%; min-height: 500px; background:#111;"></div>
            <div id="diagramLabels" style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:50;"></div>
        `;
        webglContainer = document.getElementById('diagramWebglContainer');

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a24);

        camera = new THREE.PerspectiveCamera(45, webglContainer.clientWidth / webglContainer.clientHeight, 0.1, 10000);
        camera.position.set(0, 0, 800);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(webglContainer.clientWidth, webglContainer.clientHeight);
        webglContainer.appendChild(renderer.domElement);

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(1, 1, 1);
        scene.add(dirLight);

        // Animation Loop
        const animate = function () {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
            updateLabels();
        };
        animate();

        // Resize handler
        window.addEventListener('resize', () => {
            if (webglContainer) {
                camera.aspect = webglContainer.clientWidth / webglContainer.clientHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(webglContainer.clientWidth, webglContainer.clientHeight);
            }
        });
    }

    // --- 2. Clear Scene & Data ---
    // Remove old meshes
    for (let i = scene.children.length - 1; i >= 0; i--) {
        let obj = scene.children[i];
        if (obj.type === "Mesh" || obj.type === "Line" || obj.type === "Group") {
            scene.remove(obj);
        }
    }

    const labelsContainer = document.getElementById('diagramLabels');
    labelsContainer.innerHTML = '';
    labelsMap.clear();

    // Determine Min/Max
    let maxV = -Infinity, minV = Infinity, maxP = -Infinity, minP = Infinity, maxT = -Infinity, minT = Infinity;
    components.forEach(c => {
        let v = c.state?.velocity || 0;
        let pDrop = c.type === 'straightDuct' ? (c.state?.calculationDetails?.pressureDrop || 0) : 0;
        let t_in = c.state?.temperature_in !== undefined ? c.state.temperature_in : 20;
        let t_out = c.state?.temperature_out?.outlet || c.state?.temperature_out?.outlet_straight || t_in;
        if (v > maxV) maxV = v; if (v < minV) minV = v;
        if (pDrop > maxP) maxP = pDrop; if (pDrop < minP) minP = pDrop;
        if (t_in > maxT) maxT = t_in; if (t_in < minT) minT = t_in;
        if (t_out > maxT) maxT = t_out; if (t_out < minT) minT = t_out;
    });
    if (maxV === -Infinity) { maxV = 10; minV = 0; }
    if (maxP === -Infinity) { maxP = 2; minP = 0; }
    if (maxT === -Infinity) { maxT = 30; minT = 5; }
    let currentMin = diagramSettings.colorMode === 'velocity' ? minV : (diagramSettings.colorMode === 'pressure' ? minP : minT);
    let currentMax = diagramSettings.colorMode === 'velocity' ? maxV : (diagramSettings.colorMode === 'pressure' ? maxP : maxT);

    // --- 3. Recursive 3D Drawing ---
    const materialCache = {};

    // Generate a 256x1 gradient texture
    const createGradientTexture = (colorHexStart, colorHexEnd) => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 256, 0);
        gradient.addColorStop(0, `#${colorHexStart.toString(16).padStart(6, '0')}`);
        gradient.addColorStop(1, `#${colorHexEnd.toString(16).padStart(6, '0')}`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 1);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    };

    const getMaterial = (comp, isIncluded) => {
        const mode = diagramSettings.colorMode;

        let colorHexStart = 0x777777;
        let colorHexEnd = 0x777777;
        let useGradient = false;

        if (isIncluded) {
            colorHexStart = getColor(comp, mode, currentMin, currentMax);
            colorHexEnd = colorHexStart;

            if (mode === 'temperature' && comp.state?.temperature_in !== undefined) {
                const tIn = comp.state.temperature_in;
                const tOut = comp.state.temperature_out?.outlet || comp.state.temperature_out?.outlet_straight || tIn;

                // Only create gradient if there is an actual temperature delta
                if (Math.abs(tIn - tOut) > 0.01) {
                    colorHexStart = getColorByValue(tIn, mode, currentMin, currentMax);
                    colorHexEnd = getColorByValue(tOut, mode, currentMin, currentMax);
                    useGradient = true;
                }
            }
        }

        const key = `${colorHexStart}_${colorHexEnd}_${isIncluded}_${useGradient}`;
        if (!materialCache[key]) {
            const matParams = {
                transparent: !isIncluded,
                opacity: isIncluded ? 1.0 : 0.2,
                roughness: 0.3,
                metalness: 0.1
            };

            if (useGradient) {
                matParams.map = createGradientTexture(colorHexStart, colorHexEnd);
                matParams.color = 0xffffff; // White base so texture shows
            } else {
                matParams.color = colorHexStart;
            }

            materialCache[key] = new THREE.MeshStandardMaterial(matParams);
        }
        return materialCache[key];
    };

    let bendCounter = 0;
    const PIXELS_PER_METER = 100;

    // Limits
    let bMin = new THREE.Vector3(Infinity, Infinity, Infinity);
    let bMax = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

    function drawTree3D(comp, currentPos, currentDir, upDir) {
        if (!comp) return;

        const isIncluded = comp.isIncluded !== false;
        const colorHex = isIncluded ? getColor(comp, diagramSettings.colorMode, currentMin, currentMax) : 0x777777;
        const baseMaterial = getMaterial(comp, isIncluded);

        // Clone material if we need a gradient so UV orientation doesn't break other geometries
        let material = baseMaterial;
        if (baseMaterial.map) {
            material = baseMaterial.clone();
            material.map = baseMaterial.map.clone();
            if (comp.type === 'straightDuct' || comp.type.includes('transition') || comp.type === 'expansion' || comp.type === 'contraction' || comp.type.includes('tee')) {
                // Cylinders map UVs along Y (which we rotate to X/Z), so we rotate the texture 90deg
                material.map.rotation = Math.PI / 2;
                material.map.center.set(0.5, 0.5);
            } else if (comp.type.startsWith('bend')) {
                // TubeGeometry maps U along the length, V around the circumference
                material.map.rotation = 0;
            }
            material.map.needsUpdate = true;
        }

        // Basic dimensions
        let diameterMm = 200; // default
        const dim = comp.state?.inletDimension || comp.state?.outletDimension?.outlet || comp.state?.outletDimension?.straight;
        if (dim && dim.d) diameterMm = dim.d;
        else if (dim && dim.w) diameterMm = dim.w; // simplified for rect
        const radius3D = (diameterMm / 1000) * PIXELS_PER_METER / 2;

        let moveDist = 60; // default length
        let nextDir = currentDir.clone();
        let nextUp = upDir ? upDir.clone() : new THREE.Vector3(0, 1, 0);
        let nextPos = currentPos.clone();
        let branchDir = null; // for T-pieces
        let branchUp = null;
        let midWay = currentPos.clone();

        // Component type logic
        if (comp.type === 'straightDuct') {
            const len_m = comp.properties?.length || 1;
            moveDist = (len_m * PIXELS_PER_METER);

            const geometry = new THREE.CylinderGeometry(radius3D, radius3D, moveDist, 16);
            geometry.translate(0, moveDist / 2, 0);
            geometry.rotateX(Math.PI / 2);

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.copy(currentPos);
            mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), currentDir);
            scene.add(mesh);

            nextPos.add(currentDir.clone().multiplyScalar(moveDist));
            midWay.copy(currentPos).add(currentDir.clone().multiplyScalar(moveDist / 2));
        }
        else if (comp.type.startsWith('bend')) {
            bendCounter++;
            const angleDeg = comp.properties?.angle || 90;
            const turnRad = THREE.MathUtils.degToRad(angleDeg);

            const orientation = comp.properties?.orientation || 'Left';
            const rightDir = currentDir.clone().cross(nextUp).normalize();
            let axis = nextUp.clone();
            let turnSign = 1;

            if (orientation === 'Left') { axis = nextUp.clone(); turnSign = 1; }
            else if (orientation === 'Right') { axis = nextUp.clone(); turnSign = -1; }
            else if (orientation === 'Up') { axis = rightDir.clone(); turnSign = 1; }
            else if (orientation === 'Down') { axis = rightDir.clone(); turnSign = -1; }

            nextDir.applyAxisAngle(axis, turnRad * turnSign).normalize();
            nextUp.applyAxisAngle(axis, turnRad * turnSign).normalize();

            const R = (comp.properties?.rd || comp.properties?.rh || 1.0) * (diameterMm / 1000) * PIXELS_PER_METER;
            const cornerDist = R * Math.tan(turnRad / 2);

            const cornerPos = currentPos.clone().add(currentDir.clone().multiplyScalar(cornerDist));
            nextPos = cornerPos.clone().add(nextDir.clone().multiplyScalar(cornerDist));

            const curve = new THREE.QuadraticBezierCurve3(currentPos, cornerPos, nextPos);
            const geometry = new THREE.TubeGeometry(curve, 20, radius3D, 16, false);
            const mesh = new THREE.Mesh(geometry, material);
            scene.add(mesh);

            midWay.copy(curve.getPoint(0.5));
            moveDist = cornerDist * 2; // For bounding box approximation
        }
        else if (comp.type.includes('transition') || comp.type === 'expansion' || comp.type === 'contraction') {
            const d1 = comp.properties?.d1 || diameterMm;
            const d2 = comp.properties?.d2 || diameterMm;
            const r1 = (d1 / 1000) * PIXELS_PER_METER / 2;
            const r2 = (d2 / 1000) * PIXELS_PER_METER / 2;
            const angleDeg = comp.properties?.angle || 30;

            const deltaR = Math.abs(r1 - r2);
            moveDist = (deltaR / Math.tan(THREE.MathUtils.degToRad(angleDeg / 2))) || 40;

            const geometry = new THREE.CylinderGeometry(r2, r1, moveDist, 16);
            geometry.translate(0, moveDist / 2, 0);
            geometry.rotateX(Math.PI / 2);

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.copy(currentPos);
            mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), currentDir);
            scene.add(mesh);

            nextPos.add(currentDir.clone().multiplyScalar(moveDist));
            midWay.copy(currentPos).add(currentDir.clone().multiplyScalar(moveDist / 2));
        }
        else if (comp.type.includes('tee')) {
            const orientation = comp.properties?.orientation || 'Left';
            const rightDir = currentDir.clone().cross(nextUp).normalize();
            let axis = nextUp.clone();
            let turnSign = 1;

            if (orientation === 'Left') { axis = nextUp.clone(); turnSign = 1; }
            else if (orientation === 'Right') { axis = nextUp.clone(); turnSign = -1; }
            else if (orientation === 'Up') { axis = rightDir.clone(); turnSign = 1; }
            else if (orientation === 'Down') { axis = rightDir.clone(); turnSign = -1; }

            const branchTurn = THREE.MathUtils.degToRad(90);
            branchDir = currentDir.clone().applyAxisAngle(axis, branchTurn * turnSign).normalize();
            branchUp = nextUp.clone().applyAxisAngle(axis, branchTurn * turnSign).normalize();

            moveDist = Math.max(radius3D * 4, 60);
            const stubLen = moveDist / 2;
            const branchRadius = ((comp.properties?.d_branch || diameterMm) / 1000) * PIXELS_PER_METER / 2;

            // Main stub
            const gS = new THREE.CylinderGeometry(radius3D, radius3D, moveDist, 16);
            gS.translate(0, moveDist / 2, 0);
            gS.rotateX(Math.PI / 2);
            const meshS = new THREE.Mesh(gS, material);
            meshS.position.copy(currentPos);
            meshS.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), currentDir);
            scene.add(meshS);

            // Branch stub
            const midPos = currentPos.clone().add(currentDir.clone().multiplyScalar(stubLen));
            const gB = new THREE.CylinderGeometry(branchRadius, branchRadius, stubLen, 16);
            gB.translate(0, stubLen / 2, 0);
            gB.rotateX(Math.PI / 2);
            const meshB = new THREE.Mesh(gB, material);
            meshB.position.copy(midPos);
            meshB.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), branchDir);
            scene.add(meshB);

            nextPos.add(currentDir.clone().multiplyScalar(moveDist));
            midWay.copy(midPos);
        }
        else {
            // Default generic box
            moveDist = Math.max(radius3D * 2, 40);
            const g = new THREE.BoxGeometry(radius3D * 2, radius3D * 2, moveDist);
            g.translate(0, 0, moveDist / 2);
            const m = new THREE.Mesh(g, material);
            m.position.copy(currentPos);
            m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), currentDir);
            scene.add(m);

            nextPos.add(currentDir.clone().multiplyScalar(moveDist));
            midWay.copy(currentPos).add(currentDir.clone().multiplyScalar(moveDist / 2));
        }

        // --- Positions & Labels ---
        if (diagramSettings.labelMode !== 'none') {
            let txt = comp.name.split(' ')[0];
            if (diagramSettings.labelMode === 'detailed') {
                const press = Math.round(comp.state?.pressureLoss || 0);
                const vel = (comp.state?.velocity || 0).toFixed(1);
                const flow = Math.round(comp.state?.airflow_in || 0);
                txt += ` (${flow}m³/h, ${vel}m/s, ${press}Pa)`;
            }
            if (!isIncluded) txt += " (Deaktiveret)";

            const div = document.createElement('div');
            div.className = 'diagram-label';
            div.style.position = 'absolute';
            div.style.color = '#fff';
            div.style.textShadow = '0 0 3px #000';
            div.style.fontSize = '11px';
            div.style.pointerEvents = 'none';
            div.innerText = txt;
            labelsContainer.appendChild(div);
            labelsMap.set(div, midWay); // Save 3D pos
        }

        // Bounding Box Logic
        bMin.min(currentPos); bMin.min(nextPos);
        bMax.max(currentPos); bMax.max(nextPos);

        const drawOpenEnd = (pos, dir) => {
            const arrowLength = 50;
            const arrowHelper = new THREE.ArrowHelper(dir, pos, arrowLength, 0x00E4FF, 15, 10);
            scene.add(arrowHelper);

            const outFlow = comp.state?.airflow_out?.outlet || comp.state?.airflow_out?.outlet_straight || comp.state?.airflow_out?.outlet_branch || comp.state?.airflow_in || 0;
            const flow = Math.round(outFlow);
            const temp = comp.state?.temperature_out?.outlet || comp.state?.temperature_out?.outlet_straight || comp.state?.temperature_in || 20;

            const div = document.createElement('div');
            div.className = 'diagram-label end-label';
            div.style.position = 'absolute';
            div.style.color = '#00E4FF';
            div.style.fontWeight = 'bold';
            div.style.background = 'rgba(0,0,0,0.6)';
            div.style.padding = '2px 6px';
            div.style.borderRadius = '4px';
            div.style.border = '1px solid #00E4FF';
            div.style.fontSize = '11px';
            div.style.pointerEvents = 'none';
            div.style.whiteSpace = 'pre';
            div.innerText = `${flow} m³/h\n${temp.toFixed(1)} °C`;
            labelsContainer.appendChild(div);
            labelsMap.set(div, pos.clone().add(dir.clone().multiplyScalar(arrowLength + 5)));
        };

        // --- Recurse ---
        if (comp.type.includes('tee')) {
            const midPos = currentPos.clone().add(currentDir.clone().multiplyScalar(moveDist / 2));
            const branchStart = midPos.clone().add(branchDir.clone().multiplyScalar(moveDist / 2));

            // Straight
            const sc = comp.children && ((comp.children.outlet_straight && comp.children.outlet_straight[0]) || (comp.children.outlet_path1 && comp.children.outlet_path1[0]));
            if (sc) drawTree3D(sc, nextPos, nextDir, nextUp);
            else drawOpenEnd(nextPos, nextDir);

            // Branch
            const bc = comp.children && ((comp.children.outlet_branch && comp.children.outlet_branch[0]) || (comp.children.outlet_path2 && comp.children.outlet_path2[0]));
            if (bc) drawTree3D(bc, branchStart, branchDir, branchUp);
            else drawOpenEnd(branchStart, branchDir);
        } else {
            const c = comp.children && comp.children.outlet && comp.children.outlet[0];
            if (c) drawTree3D(c, nextPos, nextDir, nextUp);
            else drawOpenEnd(nextPos, nextDir);
        }
    }

    // Start drawing
    const systemTree = window.stateManager ? window.stateManager.getSystemTree() : [];
    if (systemTree.length > 0) {
        const startPos = new THREE.Vector3(0, 0, 0);
        const startDir = new THREE.Vector3(1, 0, 0);
        const startUp = new THREE.Vector3(0, 1, 0);

        // Draw initial inlet arrow
        const arrowHelper = new THREE.ArrowHelper(startDir, new THREE.Vector3(-60, 0, 0), 60, 0x00E4FF, 15, 10);
        scene.add(arrowHelper);

        const flow = Math.round(systemTree[0].state?.airflow_in || 0);
        const temp = systemTree[0].state?.temperature_in || 20;

        const div = document.createElement('div');
        div.className = 'diagram-label end-label';
        div.style.position = 'absolute';
        div.style.color = '#00E4FF';
        div.style.fontWeight = 'bold';
        div.style.background = 'rgba(0,0,0,0.6)';
        div.style.padding = '2px 6px';
        div.style.borderRadius = '4px';
        div.style.border = '1px solid #00E4FF';
        div.style.fontSize = '11px';
        div.style.pointerEvents = 'none';
        div.style.whiteSpace = 'pre';
        div.innerText = `Indtag\n${flow} m³/h\n${temp.toFixed(1)} °C`;
        labelsContainer.appendChild(div);
        labelsMap.set(div, new THREE.Vector3(-75, 0, 0));

        drawTree3D(systemTree[0], startPos, startDir, startUp);
    }

    // --- 4. Camera Auto-Fit ---
    if (!keepControls) {
        if (bMin.x !== Infinity) {
            const center = bMin.clone().add(bMax).multiplyScalar(0.5);
            const size = bMax.clone().sub(bMin);
            const maxDim = Math.max(size.x, size.y, size.z, 200);

            controls.target.copy(center);
            camera.position.set(center.x, center.y + maxDim, center.z + maxDim);
            camera.lookAt(center);
        }
    }
}

// Attach label updater to animation loop
function updateLabels() {
    if (!camera || !renderer) return;
    const canvas = renderer.domElement;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;

    labelsMap.forEach((pos3D, element) => {
        const v = pos3D.clone();
        v.project(camera);

        // Frustum culling (hide if behind camera)
        if (v.z > 1) {
            element.style.display = 'none';
            return;
        }
        element.style.display = 'block';

        const x = (v.x * .5 + .5) * cw;
        const y = (v.y * -.5 + .5) * ch;

        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
        element.style.transform = `translate(-50%, -100%)`; // above line
    });
}

// --- Interaction ---
export function zoomAllDiagram() {
    if (!camera || !controls || !scene) return;

    // Create an empty bounding box
    const box = new THREE.Box3();

    // Expand bounding box to include all meshes in the scene
    scene.traverse((child) => {
        if (child.isMesh) {
            box.expandByObject(child);
        }
    });

    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 20); // enforce a minimum zoom distance

    // Zoom out using a multiplier
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));

    // Apply an isometric-like angle offset
    camera.position.set(center.x + cameraZ * 0.8, center.y + cameraZ * 1.0, center.z + cameraZ * 0.8);
    controls.target.copy(center);

    camera.lookAt(center);
    controls.update();
}
window.zoomAllDiagram = zoomAllDiagram;
