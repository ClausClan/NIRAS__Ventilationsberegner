import re

with open('src/ui.js', 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('export function renderSystem() {')
if start_idx == -1:
    print("Could not find start index")
    exit(1)

end_idx = content.find('// --- Modals ---')

new_render_system = """export function renderSystem() {
    const systemComponentsContainer = document.getElementById('systemComponentsContainer');
    const totalPressureDropContainer = document.getElementById('totalPressureDropContainer');
    
    // Default to empty array if stateManager is not ready
    const systemTree = window.stateManager ? window.stateManager.getSystemTree() : [];
    const flatComponents = window.stateManager ? window.stateManager.getSystemComponents() : [];

    systemComponentsContainer.innerHTML = '';
    totalPressureDropContainer.innerHTML = '';

    const airflowInput = document.getElementById('system_airflow');
    const systemTypeRadios = document.getElementsByName('systemFlowType');
    const systemTypeGroup = document.getElementById('globalSystemTypeGroup');

    if (flatComponents.length > 0) {
        airflowInput.disabled = true;
        systemTypeRadios.forEach(radio => radio.disabled = true);
        if (systemTypeGroup) systemTypeGroup.classList.add('disabled');
    } else {
        airflowInput.disabled = false;
        systemTypeRadios.forEach(radio => radio.disabled = false);
        if (systemTypeGroup) systemTypeGroup.classList.remove('disabled');
    }

    if (flatComponents.length === 0) {
        const selectedType = document.querySelector('input[name="systemFlowType"]:checked')?.value || 'splitting';
        let noteText = '';
        if (selectedType === 'splitting') {
            noteText = 'Systemet er tomt. Start ved anlægget og arbejd dig <strong>ud</strong> mod de yderste grene.';
        } else { // merging
            noteText = 'Systemet er tomt. Start ved den yderste gren og arbejd dig <strong>ind</strong> mod anlægget.';
        }
        systemComponentsContainer.innerHTML = `<p style="text-align:center; color: var(--text-muted-color);">${noteText}</p>`;
        return;
    }

    let globalCriticalPressureDrop = 0;

    function calculateCriticalPath(node) {
        if (!node || node.isIncluded === false) return 0;
        let pLoss = (node.state && node.state.pressureLoss) ? node.state.pressureLoss : 0;
        let maxChildLoss = 0;
        if (node.children) {
            Object.values(node.children).forEach(childArray => {
                childArray.forEach(child => {
                    let childLoss = calculateCriticalPath(child);
                    if (childLoss > maxChildLoss) maxChildLoss = childLoss;
                });
            });
        }
        return pLoss + maxChildLoss;
    }

    if (systemTree.length > 0) {
        globalCriticalPressureDrop = calculateCriticalPath(systemTree[0]);
    }

    function renderNode(c, depth, labelPath) {
        const state = c.state || {};
        const pressureLoss = state.pressureLoss || 0;
        const velocity = state.velocity || null;
        let airflowDisp = state.airflow_in || c.airflow || 0;
        let airflowText = `${formatLocalFloat(airflowDisp, 0)} m³/h`;

        if (c.type && c.type.startsWith('tee_')) {
            const data = state.calculationDetails || {};
            const props = c.properties || {};

            if (c.type === 'tee_sym' || c.type === 'tee_asym') {
                const chosenPath = data.chosenPath || props.path || 'straight';
                const pathStr = chosenPath === 'branch' ? 'Afgrening' : 'Ligeud';
                let q_in = airflowDisp;
                let q_out = state.airflow_out ? (state.airflow_out['outlet_' + chosenPath] || state.airflow_out['outlet']) : undefined;

                if (props.flowType === 'merging') {
                    q_in = (chosenPath === 'branch' ? props.q_branch : props.q_straight) || airflowDisp;
                    q_out = state.airflow_out ? state.airflow_out['outlet'] || airflowDisp : airflowDisp;
                }
                airflowText = `Ind: ${formatLocalFloat(q_in, 0)}<br>${pathStr}: ${formatLocalFloat(q_out || 0, 0)}`;
            } else if (c.type === 'tee_bullhead') {
                const chosenPath = data.chosenPath || props.path || 'path1';
                const pathStr = chosenPath === 'path2' ? 'Gren 2' : 'Gren 1';
                let q_out = state.airflow_out ? (state.airflow_out['outlet_' + chosenPath] || state.airflow_out['outlet']) : undefined;
                airflowText = `Ind: ${formatLocalFloat(airflowDisp, 0)}<br>${pathStr}: ${formatLocalFloat(q_out || 0, 0)}`;
            }
        }

        const velocityText = velocity ? `${formatLocalFloat(velocity, 2)} m/s` : 'N/A';
        const detailsButton = state.calculationDetails ? `<button class="details-btn" onclick="window.showSystemComponentDetails('${c.id}')">ⓘ</button>` : '';
        const deleteButton = `<button class="delete-btn" onclick="window.handleDeleteComponent('${c.id}')">&times;</button>`;

        const rowClass = c.isAutoGenerated ? 'auto-generated' : '';
        let warningHtml = '';
        if (c.properties && c.properties.isEstimated) {
            warningHtml = `<br><small style="color:var(--error-color);font-style:italic;">OBS: Estimeret tryktab</small>`;
            warningHtml += ` <button class="details-btn" style="font-size: 0.8rem; padding: 2px 4px;" onclick="window.requestCorrection('${c.id}')">[+Pa]</button>`;
        }

        let tempText = '-';
        if (state.temperature_in !== undefined && state.temperature_out && state.temperature_out['outlet'] !== undefined) {
            if (Math.abs(state.temperature_in - state.temperature_out['outlet']) > 0.05) {
                tempText = `${formatLocalFloat(state.temperature_in, 1)} → ${formatLocalFloat(state.temperature_out['outlet'], 1)} °C`;
            } else {
                tempText = `${formatLocalFloat(state.temperature_in, 1)} °C`;
            }
        }

        const paddingLeft = Math.max(0, depth * 25);
        const includeChecked = c.isIncluded !== false ? 'checked' : '';
        const opacity = c.isIncluded !== false ? '1' : '0.4';
        
        let pathLabelHtml = '';
        if (labelPath) {
            pathLabelHtml = `<div style="font-size:10px; color:#00E5FF; margin-bottom: 2px;">↳ ${labelPath}</div>`;
        }

        let rowHtml = `
            <tr class="${rowClass}" style="opacity: ${opacity};">
                <td style="padding-left: ${paddingLeft + 10}px;">
                    ${pathLabelHtml}
                    <div style="display:flex; align-items:center; gap: 8px;">
                        <input type="checkbox" ${includeChecked} onchange="window.toggleBranchIncluded('${c.id}', this.checked)" title="Medtag i beregning">
                        <div>
                            <strong>${c.name}</strong><br>
                            <small>${c.details || ''}</small>${warningHtml}
                        </div>
                    </div>
                </td>
                <td>${airflowText}</td>
                <td>${tempText}</td>
                <td>${velocityText}</td>
                <td>${formatLocalFloat(pressureLoss, 2)} Pa</td>
                <td>
                    <button class="details-btn edit-btn" style="background:none; border:none; cursor:pointer;" onclick="window.handleEditComponent('${c.id}')" title="Rediger">✏️</button>
                    ${detailsButton}
                    ${deleteButton}
                </td>
            </tr>
        `;

        if (c.children) {
            Object.keys(c.children).forEach(portName => {
                c.children[portName].forEach(child => {
                    let childLabel = '';
                    let childDepth = depth;
                    if (portName === 'outlet_branch' || portName === 'outlet_straight') {
                        childLabel = portName === 'outlet_branch' ? 'Afgrening' : 'Ligeud';
                        childDepth = depth + 1;
                    }
                    rowHtml += renderNode(child, childDepth, childLabel);
                });
            });
        }

        return rowHtml;
    }

    let tableRows = '';
    if (systemTree.length > 0) {
        systemTree.forEach(root => {
            tableRows += renderNode(root, 0, '');
        });
    }

    systemComponentsContainer.innerHTML = `
        <table class="fittings-table tree-table" style="border-spacing: 0; width: 100%;">
            <colgroup>
                <col style="width: 35%;">
                <col style="width: 15%;">
                <col style="width: 15%;">
                <col style="width: 10%;">
                <col style="width: 10%;">
                <col style="width: 15%;">
            </colgroup>
            <thead>
                <tr><th style="text-align:left; padding-left:10px;">Komponent</th><th>Luftmængde</th><th>Temp.</th><th>Hastighed</th><th>Tryktab</th><th>Handlinger</th></tr>
            </thead>
            <tbody>${tableRows}</tbody>
        </table>`;

    totalPressureDropContainer.innerHTML = `
        <div class="result-card">
            <h3>Samlet Systemtryktab (Kritisk Vej)</h3>
            <p class="highlight">${formatLocalFloat(globalCriticalPressureDrop, 2)} Pa</p>
        </div>`;
}

"""

new_content = content[:start_idx] + new_render_system + content[end_idx:]

with open('src/ui.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Rewrite successful")
