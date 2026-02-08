
import { formatLocalFloat, parseLocalFloat } from './utils.js';
import { getFittings, getSystemComponents, getDuctResult, getSystemComponent } from './state.js';
import { STANDARD_ROUND_SIZES_MM, STANDARD_RECT_SIZES_MM, getAirProperties } from './physics.js';

// --- HTML Generators ---

export function getDimFormHtml() {
    return `
        <section>
            <h2>Kanaldimensionering</h2>
            <form id="ventilationForm">
                <div class="input-group"> <label for="dim_airflow">Luftmængde</label> <div class="input-unit-wrapper" data-unit="m³/h"><input type="text" id="dim_airflow" class="input-field" required></div> </div>
                <div class="control-group"> <label>Beregningstype</label> <div class="radio-group"> <input type="radio" id="modeCalculate" name="calculationMode" value="calculate" checked><label for="modeCalculate">Find Dimension</label> <input type="radio" id="modeAnalyze" name="calculationMode" value="analyze"><label for="modeAnalyze">Kendt Dimension</label> </div> </div>
                <div class="control-group"> <label>Kanalform</label> <div class="radio-group"> <input type="radio" id="ductRound" name="ductShape" value="round" checked><label for="ductRound">Cirkulær</label> <input type="radio" id="ductRectangular" name="ductShape" value="rectangular"><label for="ductRectangular">Rektangulær</label> </div> </div>
                <div id="calculateInputs">
                    <div class="input-group"><label for="constraintType">Grænse</label><select id="constraintType" class="input-field"><option value="velocity">Hastighed (m/s)</option><option value="pressure">Tryktab (Pa/m)</option></select></div>
                    <div class="input-group"><label for="constraintValue">Grænseværdi</label><div class="input-unit-wrapper" data-unit="m/s"><input type="text" id="constraintValue" class="input-field" step="any"></div></div>
                    <div id="aspectRatioInput" class="input-group" style="display: none;"><label for="aspectRatio">Sideforhold (A/B)</label><input type="text" id="aspectRatio" class="input-field" value="1,5" step="any"></div>
                </div>
                <div id="analyzeInputs" style="display: none;">
                    <div id="analyzeRound" class="input-group"><label for="diameter">Diameter</label><div class="input-unit-wrapper" data-unit="mm"><input type="text" id="diameter" class="input-field" list="diameter-list" placeholder="Vælg eller indtast"></div><datalist id="diameter-list"></datalist></div>
                    <div id="analyzeRectangular" class="input-field-group" style="display: none;">
                        <div class="input-group" style="width: 100%"><label for="sideA">Side A</label><div class="input-unit-wrapper" data-unit="mm"><input type="text" id="sideA" class="input-field" list="rect-list" placeholder="Vælg eller indtast"></div></div>
                        <div class="input-group" style="width: 100%"><label for="sideB">Side B</label><div class="input-unit-wrapper" data-unit="mm"><input type="text" id="sideB" class="input-field" list="rect-list" placeholder="Vælg eller indtast"></div></div>
                        <datalist id="rect-list"></datalist>
                    </div>
                </div>
                <button type="submit" class="button primary">Beregn Kanal</button>
            </form>
            <div id="dim_resultsContainer" class="results-container"></div>
        </section>`;
}

export function getFittingsFormHtml() {
    return `
        <section>
            <h2>Tryktab for Formstykker</h2>
            <form id="fittingsForm">
                <div class="input-group">
                    <label>Systemtype</label>
                    <div class="radio-group"> 
                        <input type="radio" id="fitTypeSupply" name="fitFlowType" value="splitting" checked><label for="fitTypeSupply">Indblæsning</label> 
                        <input type="radio" id="fitTypeExhaust" name="fitFlowType" value="merging"><label for="fitTypeExhaust">Udsugning</label> 
                    </div>
                </div>
                <div class="input-group">
                    <label for="fittingType">Vælg type formstykke</label>
                    <select id="fittingType" class="input-field">
                        </select>
                </div>
                <div id="fittingIllustrationContainer"></div>
                <div id="fittingInputsContainer"></div>
                <button type="submit" class="button primary">Beregn Formstykke</button>
            </form>
            <div id="fittings_resultsContainer" class="results-container"></div>
        </section>`;
}

export function getSystemFormHtml() {
    return `
        <section>
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--border-color); margin-bottom: 25px;">
                <h2 style="border: none; margin: 0; padding-bottom: 10px;">Systemberegning</h2>
                <div class="system-menu-container">
                    <button class="system-menu-btn" onclick="window.toggleSystemMenu()">&#8942;</button>
                    <div id="systemMenu" class="system-menu-dropdown hidden">
                        <a href="#" onclick="window.clearSystem(event)">Ny Beregning</a>
                        <a href="#" onclick="window.saveSystem(event)">Gem System...</a>
                        <a href="#" onclick="window.triggerFileLoad(event)">Hent System...</a>
                        <a href="#" onclick="window.printDocumentation(event)">Print Dokumentation...</a>
                    </div>
                </div>
            </div>

            <div class="input-group">
                <label for="projectName">Projektnavn</label>
                <input type="text" id="projectName" class="input-field" placeholder="f.eks. Ombygning af kontor, etage 3">
            </div>
            
            <div class="input-group">
                    <label>Systemtype</label>
                    <div id="globalSystemTypeGroup" class="radio-group"> 
                        <input type="radio" id="sysTypeSupply" name="systemFlowType" value="splitting" checked><label for="sysTypeSupply">Indblæsning</label> 
                        <input type="radio" id="sysTypeExhaust" name="systemFlowType" value="merging"><label for="sysTypeExhaust">Udsugning</label> 
                    </div>
            </div>
            
            <div class="input-group">
                    <label for="system_airflow">Start Luftmængde</label>
                    <div class="input-unit-wrapper" data-unit="m³/h"><input type="text" id="system_airflow" class="input-field" required></div>
            </div>
            
            <div id="systemComponentsContainer"></div>
            <div id="totalPressureDropContainer" class="results-container"></div>
            <h3 style="margin-top: 30px; border-top: 1px solid var(--border-color); padding-top: 30px;">Tilføj Komponent</h3>
            <form id="systemAddComponentForm">
                <div class="input-group">
                    <label for="systemComponentType">Komponenttype</label>
                    <select id="systemComponentType" class="input-field">
                        <option value="">-- Vælg type --</option>
                        <option value="straightDuct">Lige Kanal</option>
                        <option value="fitting">Formstykke</option>
                        <option value="manualLoss">Manuelt Tab</option>
                    </select>
                </div>
                <div id="systemComponentInputsContainer"></div>
            </form>
            <input type="file" id="fileLoader" style="display: none;" accept=".json">
        </section>
    `;
}

// --- Render Functions ---



export function renderDuctResult(data) {
    const dimResultsContainer = document.getElementById('dim_resultsContainer');
    if (!dimResultsContainer) return;

    let content = `<p><strong>Beregnet med Luftmængde (q):</strong> ${formatLocalFloat(data.airflow, 0)} m³/h</p>`;
    if (data.mode === 'calculate') {
        content += data.shape === 'round' ? `<p>Beregnet ideal-diameter: ${formatLocalFloat(data.idealDiameter, 1)} mm</p>` : `<p>Beregnet ideal-dimension: ${formatLocalFloat(data.idealSideA, 1)} x ${formatLocalFloat(data.idealSideB, 1)} mm</p>`;
        let comparisonRows = '';
        if (data.alternatives.smaller) { comparisonRows += `<tr><td>Ø${data.alternatives.smaller.dimension}</td><td>${formatLocalFloat(data.alternatives.smaller.velocity, 2)}</td><td>${formatLocalFloat(data.alternatives.smaller.pressureDrop, 2)}</td></tr>`; }
        comparisonRows += `<tr class="chosen-row"><td><strong>Ø${data.standardDiameter || (data.standardSideA + 'x' + data.standardSideB)}</strong></td><td><strong>${formatLocalFloat(data.velocity, 2)}</strong></td><td><strong>${formatLocalFloat(data.pressureDrop, 2)}</strong></td></tr>`;
        if (data.alternatives.larger) { comparisonRows += `<tr><td>Ø${data.alternatives.larger.dimension}</td><td>${formatLocalFloat(data.alternatives.larger.velocity, 2)}</td><td>${formatLocalFloat(data.alternatives.larger.pressureDrop, 2)}</td></tr>`; }
        content += `<table class="comparison-table"><thead><tr><th>Dimension</th><th>Hastighed (m/s)</th><th>Tryktab (Pa/m)</th></tr></thead><tbody>${comparisonRows}</tbody></table>`;
    } else {
        content += data.shape === 'round' ? `<p class="highlight"><strong>Analyseret Kanal:</strong> ${data.diameter} mm</p>` : `<p class="highlight"><strong>Analyseret Kanal:</strong> ${data.sideA} x ${data.sideB} mm</p>`;
        content += `<p><strong>Lufthastighed (v):</strong> ${formatLocalFloat(data.velocity, 2)} m/s</p><p><strong>Tryktab pr. meter (dp):</strong> ${formatLocalFloat(data.pressureDrop, 2)} Pa/m</p>`;
    }
    dimResultsContainer.innerHTML = `<div class="result-card"><h3>Resultat for Kanal <button class="details-btn" onclick='showDuctDetails()'>ⓘ</button></h3>${content}</div>`;
}

export function renderFittingsResult() {
    const fittingsResultsContainer = document.getElementById('fittings_resultsContainer');
    const fittingsList = getFittings();
    fittingsResultsContainer.innerHTML = '';
    if (fittingsList.length > 0) {
        const totalLoss = fittingsList.reduce((acc, item) => acc + item.pressureLoss, 0);

        let tableRows = fittingsList.map(item => {
            return `<tr><td>${item.name}<br><small>(${formatLocalFloat(item.airflow, 0)} m³/h)</small></td><td>${formatLocalFloat(item.pressureLoss, 2)} Pa</td><td><button class="details-btn" onclick='window.showFittingDetails(${item.id})'>ⓘ</button><button class="delete-btn" onclick="window.deleteFitting(${item.id})">&times;</button></td></tr>`
        }).join('');

        const summaryContent = `<div class="result-card"><h3>Samlet Tryktab</h3><table class="fittings-table"><thead><tr><th>Komponent</th><th>Tryktab</th><th></th></tr></thead><tbody>${tableRows}</tbody><tfoot><tr><td>Total</td><td>${formatLocalFloat(totalLoss, 2)} Pa</td><td></td></tr></tfoot></table><button onclick="window.resetFittings()" class="button secondary">Nulstil Liste</button></div>`;

        fittingsResultsContainer.innerHTML = summaryContent;
    }
}

export function renderSystem() {
    const systemComponentsContainer = document.getElementById('systemComponentsContainer');
    const totalPressureDropContainer = document.getElementById('totalPressureDropContainer');
    const systemComponents = getSystemComponents();

    systemComponentsContainer.innerHTML = '';
    totalPressureDropContainer.innerHTML = '';

    const airflowInput = document.getElementById('system_airflow');
    const systemTypeRadios = document.getElementsByName('systemFlowType');
    const systemTypeGroup = document.getElementById('globalSystemTypeGroup');

    if (systemComponents.length > 0) {
        airflowInput.disabled = true;
        systemTypeRadios.forEach(radio => radio.disabled = true);
        systemTypeGroup.classList.add('disabled');
    } else {
        airflowInput.disabled = false;
        systemTypeRadios.forEach(radio => radio.disabled = false);
        systemTypeGroup.classList.remove('disabled');
    }

    if (systemComponents.length === 0) {
        const selectedType = document.querySelector('input[name="systemFlowType"]:checked').value;
        let noteText = '';
        if (selectedType === 'splitting') {
            noteText = 'Systemet er tomt. Start ved anlægget og arbejd dig <strong>ud</strong> mod de yderste grene.';
        } else { // merging
            noteText = 'Systemet er tomt. Start ved den yderste gren og arbejd dig <strong>ind</strong> mod anlægget.';
        }
        systemComponentsContainer.innerHTML = `<p style="text-align:center; color: var(--text-muted-color);">${noteText}</p>`;
        return;
    }

    let totalPressureDrop = 0;
    const tableRows = systemComponents.map((c, index) => {
        totalPressureDrop += c.pressureLoss;
        const velocityText = c.velocity ? `${formatLocalFloat(c.velocity, 2)} m/s` : 'N/A';
        const detailsButton = c.calculationDetails ? `<button class="details-btn" onclick="window.showSystemComponentDetails(${c.id})">ⓘ</button>` : '';
        const deleteButton = (index === systemComponents.length - 1) ? `<button class="delete-btn" onclick="window.handleDeleteLastComponent()">&times;</button>` : '';

        const rowClass = c.isAutoGenerated ? 'auto-generated' : '';
        let warningHtml = '';
        if (c.isEstimated) {
            warningHtml = `<br><small style="color:var(--error-color);font-style:italic;">OBS: Estimeret tryktab</small>`;
            // Tilføj korrektionsknap
            warningHtml += ` <button class="details-btn" style="font-size: 0.8rem; padding: 2px 4px;" onclick="window.requestCorrection(${c.id})">[+Pa]</button>`;
        }

        return `
            <tr class="${rowClass}">
                <td>${c.name}<br><small>${c.details}</small>${warningHtml}</td>
                <td>${formatLocalFloat(c.airflow, 0)} m³/h</td>
                <td>${velocityText}</td>
                <td>${formatLocalFloat(c.pressureLoss, 2)} Pa</td>
                <td>${detailsButton}${deleteButton}</td>
            </tr>
        `;
    }).join('');

    systemComponentsContainer.innerHTML = `
        <table class="fittings-table">
            <thead>
                <tr><th>Komponent</th><th>Luftmængde</th><th>Hastighed</th><th>Tryktab</th><th></th></tr>
            </thead>
            <tbody>${tableRows}</tbody>
        </table>`;

    totalPressureDropContainer.innerHTML = `
        <div class="result-card">
            <h3>Samlet Systemtryktab</h3>
            <p class="highlight">${formatLocalFloat(totalPressureDrop, 2)} Pa</p>
        </div>`;
}

// --- Modals ---

export function showDuctDetails() {
    const ductResult = getDuctResult();
    const detailsModal = document.getElementById('detailsModal');
    const modalTitle = document.querySelector('#modalTitle');
    const modalBody = document.querySelector('#modalBody');

    if (!ductResult) return;

    const temp = parseLocalFloat(document.getElementById('temperature').value);
    const { RHO } = getAirProperties(temp);
    const D_hyd_int = ductResult.D_hyd_int;

    modalTitle.innerText = "Detaljer for Kanaldimensionering";

    let content = `<p><strong>Luftmængde (q):</strong> ${formatLocalFloat(ductResult.airflow, 0)} m³/h</p>`;
    content += `<p><strong>Hydraulisk Diameter (Dₕ, intern):</strong> ${formatLocalFloat(D_hyd_int, 4)} m</p>`;
    content += `<p><strong>Hastighed (v):</strong> ${formatLocalFloat(ductResult.velocity, 2)} m/s</p>`;
    content += `<p><strong>Reynolds Tal (Re):</strong> ${ductResult.reynolds.toExponential(2).replace('.', ',')}</p>`;
    content += `<p><strong>Friktionsfaktor (λ):</strong> ${formatLocalFloat(ductResult.lambda, 4)}</p>`;
    content += `<hr>`;
    content += `<p><strong>Tryktab (dp) =</strong> (λ / Dₕ) * (ρ/2) * v²</p>`;
    content += `<p><strong>dp =</strong> (${formatLocalFloat(ductResult.lambda, 4)} / ${formatLocalFloat(D_hyd_int, 4)}) * (${formatLocalFloat(RHO, 2)}/2) * ${formatLocalFloat(ductResult.velocity, 2)}² = <strong>${formatLocalFloat(ductResult.pressureDrop, 2)} Pa/m</strong></p>`;

    modalBody.innerHTML = content;
    detailsModal.style.display = 'flex';
}

export function showFittingDetails(id) {
    const fittingsList = getFittings();
    const item = fittingsList.find(f => f.id === id);
    const modalTitle = document.querySelector('#modalTitle');
    const modalBody = document.querySelector('#modalBody');
    const detailsModal = document.getElementById('detailsModal');

    if (!item) return;
    const { details, pressureLoss, name, airflow } = item;
    modalTitle.innerText = `Detaljer for ${name}`;
    modalBody.innerHTML = `<p><strong>Luftmængde (q):</strong> ${formatLocalFloat(airflow, 0)} m³/h</p><p><strong>Areal (A, intern):</strong> ${formatLocalFloat(details.A_m2, 5)} m²</p><p><strong>Hastighed (v):</strong> ${formatLocalFloat(details.v_ms, 2)} m/s</p><p><strong>Zeta-værdi (ζ):</strong> ${formatLocalFloat(details.zeta, 3)}</p><p><strong>Dynamisk Tryk (Pₐᵧₙ):</strong> ${formatLocalFloat(details.Pdyn_Pa, 2)} Pa</p><hr><p><strong>Tryktab (Δp) =</strong> ζ * Pₐᵧₙ</p><p><strong>Δp =</strong> ${formatLocalFloat(details.zeta, 3)} * ${formatLocalFloat(details.Pdyn_Pa, 2)} = <strong>${formatLocalFloat(pressureLoss, 2)} Pa</strong></p>`;
    detailsModal.style.display = 'flex';
}

export function showSystemComponentDetails(id) {
    const component = getSystemComponent(id);
    if (!component || !component.calculationDetails || Object.keys(component.calculationDetails).length === 0) return;

    const modalTitle = document.querySelector('#modalTitle');
    const modalBody = document.querySelector('#modalBody');
    const detailsModal = document.getElementById('detailsModal');
    const details = component.calculationDetails;

    modalTitle.innerText = `Detaljer for ${component.name}`;
    let html = `<p><strong>Luftmængde:</strong> ${formatLocalFloat(component.airflow, 0)} m³/h</p>`;

    if (component.velocity) html += `<p><strong>Hastighed:</strong> ${formatLocalFloat(component.velocity, 2)} m/s</p>`;

    if (component.type === 'straightDuct') {
        html += `<p><strong>Længde:</strong> ${formatLocalFloat(component.length, 2)} m</p>
                 <p><strong>Diameter/Dimension:</strong> ${details.dimension}</p>
                 <p><strong>Friktionsfaktor (f):</strong> ${formatLocalFloat(details.frictionFactor, 4)}</p>
                 <p><strong>Tryktab pr. m:</strong> ${formatLocalFloat(details.pressureDropPerMeter, 2)} Pa/m</p>
                 <p><strong>Total Tryktab:</strong> ${formatLocalFloat(component.pressureLoss, 2)} Pa</p>`;
    } else if (component.type === 'fitting') {
        if (details.zeta !== undefined) html += `<p><strong>Zeta (ζ):</strong> ${formatLocalFloat(details.zeta, 3)}</p>`;
        html += `<p><strong>Dynamisk Tryk:</strong> ${formatLocalFloat(details.Pdyn_Pa, 2)} Pa</p>
                 <p><strong>Total Tryktab:</strong> ${formatLocalFloat(component.pressureLoss, 2)} Pa</p>`;
        if (details.loss1) html += `<p><strong>Tab Gren 1:</strong> ${formatLocalFloat(details.loss1, 2)} Pa</p>`;
        if (details.loss2) html += `<p><strong>Tab Gren 2:</strong> ${formatLocalFloat(details.loss2, 2)} Pa</p>`;
    }

    modalBody.innerHTML = html;
    detailsModal.style.display = 'flex';
}

export function showHelpModal() {
    const helpModal = document.getElementById('helpModal');
    const detailsModal = document.getElementById('detailsModal');
    if (!helpModal) return;

    helpModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="modalTitleHelp">Formelgrundlag</h3>
                <span class="close-button">&times;</span>
            </div>
            <div id="modalBodyHelp" class="modal-body">
                <h4>Generelle Principper</h4>
                <p>Dette værktøj er designet til at assistere med kanalberegninger i henhold til anerkendte principper og normer som <strong>DS 447</strong>. Alle beregninger tager højde for standardiserede fysiske love for at sikre nøjagtighed.</p>
                <p><strong>Lufttemperatur:</strong> Luftens densitet (ρ) og kinematiske viskositet (ν) justeres dynamisk baseret på den indtastede temperatur. Dette sker via Ideal gasloven og Sutherlands formel for at afspejle virkelige forhold.</p>
                <p><strong>Godstykkelse:</strong> Der anvendes en standard kanalgodstykkelse på 0,5 mm. Alle indtastede dimensioner er ydre mål, og programmet omregner automatisk til indre mål for alle beregninger.</p>
                
                <hr>

                <h4>Kanaldimensionering (Lige Kanalstræk)</h4>
                <p>Tryktab i lige kanaler beregnes med <strong>Darcy-Weisbachs ligning</strong>:</p>
                <p><code>dp = (λ / Dₕ) * (ρ/2) * v²</code></p>
                <p>Her er de centrale elementer:</p>
                <ul>
                    <li><strong>Friktionsfaktor (λ):</strong> Denne findes ved en iterativ løsning (50 gentagelser) af <strong>Colebrook-Whites ligning</strong>. Ligningen tager højde for både kanalens ruhed (k) og luftstrømmens turbulens, beskrevet ved Reynolds' tal (Re).</li>
                    <li><strong>Hydraulisk Diameter (Dₕ):</strong> For <strong>cirkulære</strong> kanaler er Dₕ lig med den indre diameter. For <strong>rektangulære</strong> kanaler beregnes Dₕ som: <code>Dₕ = 2*a*b / (a+b)</code>.</li>
                </ul>
                
                <hr>

                <h4>Formstykker (Enkeltmodstande)</h4>
                <p>Tryktab i formstykker beregnes ud fra en tryktabskoefficient (Zeta, ζ), som er unik for hvert formstykkes geometri:</p>
                <p><code>Δp = ζ * (ρ/2) * v²</code></p>
                <p><strong>Bøjninger, Udvidelser & Indsnævringer:</strong> For disse komponenter findes ζ-værdien via <strong>lineær og bilinear interpolation</strong> i indbyggede datatabeller baseret på de indtastede geometriske forhold. (Se physics.js for tabeller).</p>
                <p><strong>T-stykker:</strong> ζ-værdien beregnes dynamisk for hver udgang (ligeud og afgrening) baseret på principperne om <strong>masse- og energibevarelse (Bernoullis ligning)</strong>. Formlerne tager højde for forholdet mellem luftmængder og arealer.</p>

                <hr>

                <h4>Systemberegning</h4>
                <p>Denne fane bygger et komplet kanalsystem ved at summere tryktabet for en serie af komponenter. Beregningen foregår sekventielt med følgende principper:</p>
                <ul>
                    <li><strong>Kumulativt Tryktab:</strong> Det samlede tryktab er summen af tryktabet for hver enkelt komponent i listen.</li>
                    <li><strong>Global Systemtype:</strong> Du definerer fra start, om hele systemet er <strong>Indblæsning</strong> (dele-flow) eller <strong>Udsugning</strong> (samle-flow). Denne indstilling låses, så snart den første komponent tilføjes, og bestemmer, hvordan T-stykker automatisk beregnes.</li>
                    <li><strong>Videreført Luftmængde:</strong> Luftmængden for en ny komponent arves altid fra den foregående komponents udgående luftmængde. Dette er især vigtigt efter T-stykker, hvor luftmængden kan ændre sig.</li>
                    <li><strong>Automatiske Overgange:</strong> Hvis du tilføjer en komponent med en indgangsdimension, der ikke matcher den forrige komponents udgangsdimension, indsætter programmet automatisk en "OBS"-linje med en beregnet indsnævring/udvidelse for at gøre opmærksom på det nødvendige tryktab.</li>
                </ul>
            </div>
        </div>`;

    const modalCloseHelp = helpModal.querySelector('.close-button');
    modalCloseHelp.onclick = () => { helpModal.style.display = "none"; };

    helpModal.style.display = 'flex';
}


// --- Helper UI Functions ---

export function updateFittingTypeOptions() {
    const flowTypeRadio = document.querySelector('input[name="fitFlowType"]:checked');
    const fittingSelect = document.getElementById('fittingType');
    if (!flowTypeRadio || !fittingSelect) return;

    const flowType = flowTypeRadio.value;
    const currentSelection = fittingSelect.value;

    let optionsHtml = `
        <option value="">-- Vælg type --</option>
        <optgroup label="Bøjninger">
            <option value="bend_circ">Bøjning, Cirkulær</option>
            <option value="bend_rect">Bøjning, Rektangulær</option>
        </optgroup>
        <optgroup label="Dimensionsændringer">
            <option value="expansion">Udvidelse, Cirkulær</option>
            <option value="contraction">Indsnævring, Cirkulær</option>
            <option value="expansion_rect">Udvidelse, Rektangulær</option>
            <option value="contraction_rect">Indsnævring, Rektangulær</option>
            <option value="transition_rect_round" ${flowType === 'splitting' ? '' : 'disabled hidden'}>Overgang, Firkant til Rund</option>
            <option value="transition_round_rect" ${flowType === 'merging' ? '' : 'disabled hidden'}>Overgang, Rund til Firkant</option>
    `;

    optionsHtml += `
        </optgroup>
        <optgroup label="T-stykker (Cirkulær)">
            <option value="tee_sym">T-stykke, Symmetrisk</option>
            <option value="tee_asym">T-stykke, Asymmetrisk</option>
            <option value="tee_bullhead">T-stykke (Dobbelt Afgrening)</option>
        </optgroup>
    `;

    fittingSelect.innerHTML = optionsHtml;
    fittingSelect.value = currentSelection;
}

export function renderFittingInputs() {
    const fittingTypeSelect = document.getElementById('fittingType');
    const type = fittingTypeSelect.value;
    const illustrationContainer = document.getElementById('fittingIllustrationContainer');
    const fittingInputsContainer = document.getElementById('fittingInputsContainer');

    illustrationContainer.innerHTML = '';
    fittingInputsContainer.innerHTML = '';
    if (!type) return;

    const roundOptions = STANDARD_ROUND_SIZES_MM.map(s => `<option value="${s}">${s} mm</option>`).join('');
    const rectOptions = STANDARD_RECT_SIZES_MM.map(s => `<option value="${s}">${s} mm</option>`).join('');
    let illustrationSvg = '';
    let inputsHtml = '';
    let commonAirflowInput = `<div class="input-group"><label for="fit_airflow">Luftmængde</label><div class="input-unit-wrapper" data-unit="m³/h"><input type="text" id="fit_airflow" class="input-field" required></div></div>`;

    if (type.startsWith('tee')) {
        const isBullhead = type === 'tee_bullhead';

        // SVGs omitted for brevity in this output, but should be here
        const splittingSvg = isBullhead
            ? `<img src="/icons/tee_bullhead_splitting.svg" alt="T-stykke Splitting" style="max-width:100%; height:auto;">`
            : `<img src="/icons/tee_splitting.svg" alt="T-stykke Splitting" style="max-width:100%; height:auto;">`;
        const mergingSvg = isBullhead
            ? `<img src="/icons/tee_bullhead_merging.svg" alt="T-stykke Merging" style="max-width:100%; height:auto;">`
            : `<img src="/icons/tee_merging.svg" alt="T-stykke Merging" style="max-width:100%; height:auto;">`;

        fittingInputsContainer.innerHTML = `
            <div class="input-group">
                <label>Flow Type</label> 
                <div class="radio-group"> 
                    <input type="radio" id="fitTeeFlowSplit" name="fitTeeFlowType" value="splitting" checked><label for="fitTeeFlowSplit">${isBullhead ? '1 ind, 2 ud' : 'Indblæsning'}</label> 
                    <input type="radio" id="fitTeeFlowMerge" name="fitTeeFlowType" value="merging"><label for="fitTeeFlowMerge">${isBullhead ? '2 ind, 1 ud' : 'Udsugning'}</label> 
                </div>
            </div>
            <div id="fitTeeSpecificInputs"></div>`;

        const updateTeeUI = () => {
            const flowType = document.querySelector('input[name="fitTeeFlowType"]:checked').value;
            const container = document.getElementById('fitTeeSpecificInputs');
            illustrationContainer.innerHTML = `<div class="illustration-container">${flowType === 'splitting' ? splittingSvg : mergingSvg}</div>`;

            const isSym = type === 'tee_sym';
            let teeInputsHtml = '';

            if (isBullhead) {
                if (flowType === 'splitting') {
                    teeInputsHtml = `<div class="sub-group"><label>Luftmængder</label><div class="input-field-group"><div class="input-group"><label for="q_in">q Ind</label><div class="input-unit-wrapper" data-unit="m³/h"><input type="text" id="q_in" class="input-field" required></div></div><div class="input-group"><label for="q_out1">q Ud 1</label><div class="input-unit-wrapper" data-unit="m³/h"><input type="text" id="q_out1" class="input-field" required></div></div><div class="input-group"><label for="q_out2">q Ud 2</label><div class="input-unit-wrapper" data-unit="m³/h"><input type="text" id="q_out2" class="input-field" required></div></div></div></div><div class="sub-group" id="teeDiameterInputs"><label>Diametre</label><div class="input-field-group"><div class="input-group"><label for="d_in">Ø Ind</label><select id="d_in" class="input-field">${roundOptions}</select></div><div class="input-group"><label for="d_out1">Ø Ud 1</label><select id="d_out1" class="input-field">${roundOptions}</select></div><div class="input-group"><label for="d_out2">Ø Ud 2</label><select id="d_out2" class="input-field">${roundOptions}</select></div></div></div>`;
                } else { // merging bullhead
                    teeInputsHtml = `<div class="sub-group"><label>Luftmængder</label><div class="input-field-group"><div class="input-group"><label for="q_in1">q Ind 1</label><div class="input-unit-wrapper" data-unit="m³/h"><input type="text" id="q_in1" class="input-field" required></div></div><div class="input-group"><label for="q_in2">q Ind 2</label><div class="input-unit-wrapper" data-unit="m³/h"><input type="text" id="q_in2" class="input-field" required></div></div></div></div><div class="sub-group" id="teeDiameterInputs"><label>Diametre</label><div class="input-field-group"><div class="input-group"><label for="d_in1">Ø Ind 1</label><select id="d_in1" class="input-field">${roundOptions}</select></div><div class="input-group"><label for="d_in2">Ø Ind 2</label><select id="d_in2" class="input-field">${roundOptions}</select></div><div class="input-group"><label for="d_common">Ø Ud</label><select id="d_common" class="input-field">${roundOptions}</select></div></div></div>`;
                }
            } else { // tee_sym or tee_asym
                const diameterInputs = isSym ? `<div class="input-group"><label>Diameter (alle grene)</label><select id="d_in" class="input-field">${roundOptions}</select></div>` : `<div class="input-field-group"><div class="input-group"><label id="label_d_in" for="d_in">Ø Ind/Ud</label><select id="d_in" class="input-field">${roundOptions}</select></div><div class="input-group"><label for="d_straight">Ø Ligeud</label><select id="d_straight" class="input-field">${roundOptions}</select></div><div class="input-group"><label for="d_branch">Ø Afgrening</label><select id="d_branch" class="input-field">${roundOptions}</select></div></div>`;
                if (flowType === 'splitting') {
                    teeInputsHtml = `<div class="sub-group"><label>Luftmængder</label><div class="input-field-group"><div class="input-group"><label for="q_in">q Ind</label><div class="input-unit-wrapper" data-unit="m³/h"><input type="text" id="q_in" class="input-field" required></div></div><div class="input-group"><label for="q_straight">q Ligeud</label><div class="input-unit-wrapper" data-unit="m³/h"><input type="text" id="q_straight" class="input-field" required></div></div><div class="input-group"><label for="q_branch">q Afgrening</label><div class="input-unit-wrapper" data-unit="m³/h"><input type="text" id="q_branch" class="input-field" required></div></div></div></div><div class="sub-group">${diameterInputs}</div>`;
                } else { // merging
                    teeInputsHtml = `<div class="sub-group"><label>Luftmængder</label><div class="input-field-group"><div class="input-group"><label for="q_straight">q Ligeud (Ind)</label><div class="input-unit-wrapper" data-unit="m³/h"><input type="text" id="q_straight" class="input-field" required></div></div><div class="input-group"><label for="q_branch">q Afgrening (Ind)</label><div class="input-unit-wrapper" data-unit="m³/h"><input type="text" id="q_branch" class="input-field" required></div></div></div></div><div class="sub-group">${diameterInputs}</div>`;
                }
            }
            container.innerHTML = teeInputsHtml;

            if (!isSym && !isBullhead) {
                const label = document.getElementById('label_d_in');
                if (label) label.innerText = (flowType === 'splitting' ? 'Ø Ind' : 'Ø Ud');
            }
        };

        document.getElementsByName('fitTeeFlowType').forEach(r => r.addEventListener('change', updateTeeUI));
        updateTeeUI();

    } else {
        switch (type) {
            case 'bend_circ':
                illustrationSvg = `<img src="/icons/bend_circ.svg" alt="Cirkulær Bøjning" style="max-width:100%; height:auto;">`;
                inputsHtml = commonAirflowInput + `
                    <div class="input-field-group">
                        <div class="input-group"><label for="d">Diameter (d)</label><select id="d" class="input-field">${roundOptions}</select></div>
                        <div class="input-group"><label for="angle">Vinkel (α)</label><input type="text" id="angle" class="input-field" value="90"></div>
                        <div class="input-group"><label for="radius">Radius (R)</label><div class="input-unit-wrapper" data-unit="mm"><input type="text" id="radius" class="input-field" value="100"></div></div>
                    </div>`;
                break;
            case 'bend_rect':
                illustrationSvg = `<img src="/icons/bend_rect.svg" alt="Rektangulær Bøjning" style="max-width:100%; height:auto;">`;
                inputsHtml = commonAirflowInput + `
                    <div class="input-field-group">
                        <div class="input-group"><label for="h">Højde (H)</label><select id="h" class="input-field">${rectOptions}</select></div>
                        <div class="input-group"><label for="w">Bredde (B)</label><select id="w" class="input-field">${rectOptions}</select></div>
                        <div class="input-group"><label for="angle">Vinkel (α)</label><input type="text" id="angle" class="input-field" value="90"></div>
                        <div class="input-group"><label for="radius">Radius (R)</label><div class="input-unit-wrapper" data-unit="mm"><input type="text" id="radius" class="input-field" value="100"></div></div>
                    </div>`;
                break;
            case 'expansion':
                illustrationSvg = `<img src="/icons/expansion.svg" alt="Expansion" style="max-width:100%; height:auto;">`;
                inputsHtml = commonAirflowInput + `
                    <div class="input-field-group">
                        <div class="input-group"><label for="d1">Diameter Ind (d₁)</label><select id="d1" class="input-field">${roundOptions}</select></div>
                        <div class="input-group"><label for="d2">Diameter Ud (d₂)</label><select id="d2" class="input-field">${roundOptions}</select></div>
                    </div>
                    <div class="input-group"><label>Definér geometri via:</label><div class="radio-group">
                        <input type="radio" id="geo_angle" name="geo_type" value="angle" checked><label for="geo_angle">Vinkel (α)</label>
                        <input type="radio" id="geo_length" name="geo_type" value="length"><label for="geo_length">Længde (L)</label>
                    </div></div>
                    <div id="geo_input_container"></div>`;
                break;
            case 'contraction':
                illustrationSvg = `<img src="/icons/contraction.svg" alt="Contraction" style="max-width:100%; height:auto;">`;
                inputsHtml = commonAirflowInput + `
                    <div class="input-field-group">
                        <div class="input-group"><label for="d1">Diameter Ind (d₁)</label><select id="d1" class="input-field">${roundOptions}</select></div>
                        <div class="input-group"><label for="d2">Diameter Ud (d₂)</label><select id="d2" class="input-field">${roundOptions}</select></div>
                    </div>
                    <div class="input-group"><label>Definér geometri via:</label><div class="radio-group">
                        <input type="radio" id="geo_angle" name="geo_type" value="angle" checked><label for="geo_angle">Vinkel (α)</label>
                        <input type="radio" id="geo_length" name="geo_type" value="length"><label for="geo_length">Længde (L)</label>
                    </div></div>
                    <div id="geo_input_container"></div>`;
                break;
            case 'expansion_rect':
                illustrationSvg = `<img src="/icons/expansion_rect.svg" alt="Rektangulær Expansion" style="max-width:100%; height:auto;">`;
                inputsHtml = commonAirflowInput + `
                    <div class="input-field-group">
                        <div class="input-group"><label for="h1">Højde Ind (H₁)</label><select id="h1" class="input-field">${rectOptions}</select></div>
                        <div class="input-group"><label for="w1">Bredde Ind (B₁)</label><select id="w1" class="input-field">${rectOptions}</select></div>
                    </div>
                    <div class="input-field-group">
                        <div class="input-group"><label for="h2">Højde Ud (H₂)</label><select id="h2" class="input-field">${rectOptions}</select></div>
                        <div class="input-group"><label for="w2">Bredde Ud (B₂)</label><select id="w2" class="input-field">${rectOptions}</select></div>
                    </div>
                    <div class="input-group"><label>Definér geometri via:</label><div class="radio-group">
                        <input type="radio" id="geo_angle" name="geo_type" value="angle" checked><label for="geo_angle">Vinkel (α)</label>
                        <input type="radio" id="geo_length" name="geo_type" value="length"><label for="geo_length">Længde (L)</label>
                    </div></div>
                    <div id="geo_input_container"></div>`;
                break;
            case 'contraction_rect':
                illustrationSvg = `<img src="/icons/contraction_rect.svg" alt="Rektangulær Contraction" style="max-width:100%; height:auto;">`;
                inputsHtml = commonAirflowInput + `
                    <div class="input-field-group">
                        <div class="input-group"><label for="h1">Højde Ind (H₁)</label><select id="h1" class="input-field">${rectOptions}</select></div>
                        <div class="input-group"><label for="w1">Bredde Ind (B₁)</label><select id="w1" class="input-field">${rectOptions}</select></div>
                    </div>
                    <div class="input-field-group">
                        <div class="input-group"><label for="h2">Højde Ud (H₂)</label><select id="h2" class="input-field">${rectOptions}</select></div>
                        <div class="input-group"><label for="w2">Bredde Ud (B₂)</label><select id="w2" class="input-field">${rectOptions}</select></div>
                    </div>
                    <div class="input-group"><label>Definér geometri via:</label><div class="radio-group">
                        <input type="radio" id="geo_angle" name="geo_type" value="angle" checked><label for="geo_angle">Vinkel (α)</label>
                        <input type="radio" id="geo_length" name="geo_type" value="length"><label for="geo_length">Længde (L)</label>
                    </div></div>
                    <div id="geo_input_container"></div>`;
                break;
            case 'transition_round_rect':
            case 'transition_rect_round':
                inputsHtml = commonAirflowInput + `
                    <div class="input-field-group">
                        <div class="input-group"><label for="d">Diameter (d)</label><input type="text" id="d" class="input-field" list="diameter-list"></div>
                    </div>
                    <div class="input-field-group">
                        <div class="input-group"><label for="h">Højde (H)</label><input type="text" id="h" class="input-field" list="rect-list"></div>
                        <div class="input-group"><label for="w">Bredde (B)</label><input type="text" id="w" class="input-field" list="rect-list"></div>
                    </div>
                    <div class="input-group"><label>Definér geometri via:</label><div class="radio-group">
                        <input type="radio" id="geo_angle" name="geo_type" value="angle" checked><label for="geo_angle">Vinkel (α)</label>
                        <input type="radio" id="geo_length" name="geo_type" value="length"><label for="geo_length">Længde (L)</label>
                    </div></div>
                    <div id="geo_input_container"></div>`;
                break;
        }
        if (illustrationSvg) illustrationContainer.innerHTML = `<div class="illustration-container">${illustrationSvg}</div>`;
        fittingInputsContainer.innerHTML = inputsHtml;

        const geoRadios = document.getElementsByName('geo_type');
        if (geoRadios.length > 0) {
            const updateGeoInput = () => {
                const geoType = document.querySelector('input[name="geo_type"]:checked').value;
                const container = document.getElementById('geo_input_container');
                if (geoType === 'angle') {
                    container.innerHTML = `<div class="input-group"><label for="angle">Vinkel (α)</label><div class="input-unit-wrapper" data-unit="°"><input type="text" id="angle" class="input-field" value="30"></div></div>`;
                } else {
                    container.innerHTML = `<div class="input-group"><label for="length">Længde (L)</label><div class="input-unit-wrapper" data-unit="mm"><input type="text" id="length" class="input-field" value="500"></div></div>`;
                }
            };
            geoRadios.forEach(radio => radio.addEventListener('change', updateGeoInput));
            updateGeoInput();
        }
    }
}

export function handleComponentTypeChange() {
    const systemComponentTypeSelect = document.getElementById('systemComponentType');
    const systemComponentInputsContainer = document.getElementById('systemComponentInputsContainer');
    const systemComponents = getSystemComponents();

    const type = systemComponentTypeSelect.value;
    systemComponentInputsContainer.innerHTML = ''; // Clear old inputs

    const lastComponent = systemComponents.length > 0 ? systemComponents[systemComponents.length - 1] : null;

    if (type === 'straightDuct') {
        const roundOptions = STANDARD_ROUND_SIZES_MM.map(s => `<option value="${s}">${s} mm</option>`).join('');
        const rectOptions = STANDARD_RECT_SIZES_MM.map(s => `<option value="${s}">${s} mm</option>`).join('');
        systemComponentInputsContainer.innerHTML = `
            <div class="input-group"><label for="ductLength">Længde</label><div class="input-unit-wrapper" data-unit="m"><input type="text" id="ductLength" class="input-field" required></div></div>
            <div class="input-group"><label>Kanalform</label><div class="radio-group"><input type="radio" id="sysDuctRound" name="sysDuctShape" value="round" checked><label for="sysDuctRound">Cirkulær</label><input type="radio" id="sysDuctRect" name="sysDuctShape" value="rectangular"><label for="sysDuctRect">Rektangulær</label></div></div>
            <div id="sysDuctInputsContainer"></div>
            <button type="submit" class="button primary">Tilføj til System</button>`;

        const renderDuctInputs = () => {
            const shape = document.querySelector('input[name="sysDuctShape"]:checked').value;
            const container = document.getElementById('sysDuctInputsContainer');
            if (shape === 'round') {
                container.innerHTML = `<div class="input-group"><label for="ductDiameter">Diameter</label><select id="ductDiameter" class="input-field">${roundOptions}</select></div>`;
                // Forudfyld diameter
                if (lastComponent && lastComponent.outletDimension && lastComponent.outletDimension.shape === 'round') {
                    document.getElementById('ductDiameter').value = lastComponent.outletDimension.d;
                }
            } else {
                container.innerHTML = `<div class="input-field-group"><div class="input-group"><label for="ductSideA">Side A</label><select id="ductSideA" class="input-field">${rectOptions}</select></div><div class="input-group"><label for="ductSideB">Side B</label><select id="ductSideB" class="input-field">${rectOptions}</select></div></div>`;
                // Forudfyld rektangulære sider
                if (lastComponent && lastComponent.outletDimension && lastComponent.outletDimension.shape === 'rect') {
                    document.getElementById('ductSideA').value = lastComponent.outletDimension.h;
                    document.getElementById('ductSideB').value = lastComponent.outletDimension.w;
                }
            }
        };

        document.getElementsByName('sysDuctShape').forEach(r => r.addEventListener('change', renderDuctInputs));
        renderDuctInputs();

    } else if (type === 'fitting') {
        systemComponentInputsContainer.innerHTML = `
            <div class="input-group"><label for="systemFittingType">Vælg type formstykke</label><select id="systemFittingType" class="input-field">
                <option value="">-- Vælg type --</option>
                <optgroup label="Bøjninger"><option value="bend_circ">Bøjning, Cirkulær</option><option value="bend_rect">Bøjning, Rektangulær</option></optgroup>
                <optgroup label="Dimensionsændringer"><option value="expansion">Udvidelse</option><option value="contraction">Indsnævring</option></optgroup>
                <optgroup label="T-stykker (Cirkulær)"><option value="tee_sym">T-stykke, Symmetrisk</option><option value="tee_asym">T-stykke, Asymmetrisk</option><option value="tee_bullhead">T-stykke (Dobbelt Afgrening)</option></optgroup>
            </select></div>
            <div id="systemFittingInputsContainer"></div>`;

        document.getElementById('systemFittingType').addEventListener('change', renderSystemFittingInputs);

    } else if (type === 'manualLoss') {
        systemComponentInputsContainer.innerHTML = `
            <div class="input-group"><label for="manualPressureLoss">Tryktab</label><div class="input-unit-wrapper" data-unit="Pa"><input type="text" id="manualPressureLoss" class="input-field" required></div></div>
            <div class="input-group"><label for="manualDescription">Beskrivelse</label><input type="text" id="manualDescription" class="input-field" placeholder="f.eks. Spjæld, Rist, Filter"></div>
            <button type="submit" class="button primary">Tilføj til System</button>`;
    }
}

export function renderSystemFittingInputs() {
    const fittingType = document.getElementById('systemFittingType').value;
    const container = document.getElementById('systemFittingInputsContainer');
    const systemComponents = getSystemComponents();

    container.innerHTML = '';
    if (!fittingType) return;

    const lastComponent = systemComponents.length > 0 ? systemComponents[systemComponents.length - 1] : null;
    const roundOptions = STANDARD_ROUND_SIZES_MM.map(s => `<option value="${s}">${s} mm</option>`).join('');
    const rectOptions = STANDARD_RECT_SIZES_MM.map(s => `<option value="${s}">${s} mm</option>`).join('');
    let inputsHtml = '';

    switch (fittingType) {
        case 'bend_circ':
            inputsHtml = `
                <div class="input-field-group">
                    <div class="input-group"><label for="sys_d">Diameter (d)</label><select id="sys_d" class="input-field">${roundOptions}</select></div>
                    <div class="input-group"><label for="sys_angle">Vinkel (α)</label><input type="text" id="sys_angle" class="input-field" value="90"></div>
                    <div class="input-group"><label for="sys_rd">R/d ratio</label><input type="text" id="sys_rd" class="input-field" value="1.0"></div>
                </div>`;
            break;
        case 'bend_rect':
            inputsHtml = `
                <div class="input-field-group">
                    <div class="input-group"><label for="sys_h">Højde (H)</label><select id="sys_h" class="input-field">${rectOptions}</select></div>
                    <div class="input-group"><label for="sys_w">Bredde (B)</label><select id="sys_w" class="input-field">${rectOptions}</select></div>
                    <div class="input-group"><label for="sys_angle_r">Vinkel (α)</label><input type="text" id="sys_angle_r" class="input-field" value="90"></div>
                    <div class="input-group"><label for="sys_rh">R/H ratio</label><input type="text" id="sys_rh" class="input-field" value="1.0"></div>
                </div>`;
            break;
        case 'expansion':
        case 'contraction':
            inputsHtml = `
                <div class="input-field-group">
                    <div class="input-group"><label for="sys_d1">Diameter Ind (d₁)</label><select id="sys_d1" class="input-field">${roundOptions}</select></div>
                    <div class="input-group"><label for="sys_d2">Diameter Ud (d₂)</label><select id="sys_d2" class="input-field">${roundOptions}</select></div>
                    <div class="input-group"><label for="sys_angle_dim">Vinkel (α)</label><input type="text" id="sys_angle_dim" class="input-field" value="30"></div>
                </div>`;
            break;
        case 'tee_sym':
        case 'tee_asym':
            inputsHtml = `
                <div class="input-group">
                    <label>Flow Type</label> 
                    <div class="radio-group"> 
                        <input type="radio" id="sysTeeFlowSplit" name="sysTeeFlowType" value="splitting" checked><label for="sysTeeFlowSplit">Indblæsning</label> 
                        <input type="radio" id="sysTeeFlowMerge" name="sysTeeFlowType" value="merging"><label for="sysTeeFlowMerge">Udsugning</label> 
                    </div>
                </div>
                <div id="teeSpecificInputs"></div>`;

            setTimeout(() => {
                const teeFlowTypeRadios = document.getElementsByName('sysTeeFlowType');
                if (teeFlowTypeRadios.length > 0) {
                    const renderTeeInputs = () => {
                        const flowType = document.querySelector('input[name="sysTeeFlowType"]:checked').value;
                        const teeContainer = document.getElementById('teeSpecificInputs');
                        const isSym = fittingType === 'tee_sym';

                        const diameterInputs = isSym ?
                            `<div class="input-group"><label>Diameter (alle grene)</label><select id="sys_tee_d_in" class="input-field">${roundOptions}</select></div>` :
                            `<div class="input-field-group">
                                <div class="input-group"><label for="sys_tee_d_in">Ø Ind/Ud</label><select id="sys_tee_d_in" class="input-field">${roundOptions}</select></div>
                                <div class="input-group"><label for="sys_tee_d_straight">Ø Ligeud</label><select id="sys_tee_d_straight" class="input-field">${roundOptions}</select></div>
                                <div class="input-group"><label for="sys_tee_d_branch">Ø Afgrening</label><select id="sys_tee_d_branch" class="input-field">${roundOptions}</select></div>
                            </div>`;

                        if (flowType === 'splitting') {
                            teeContainer.innerHTML = `
                                <div class="sub-group">
                                    <label>Luftmængder (q Ind arves fra system)</label>
                                    <div class="input-field-group">
                                        <div class="input-group"><label for="sys_tee_q_straight">q Ligeud</label><div class="input-unit-wrapper" data-unit="m³/h"><input type="text" id="sys_tee_q_straight" class="input-field"></div></div>
                                        <div class="input-group"><label for="sys_tee_q_branch">q Afgrening</label><div class="input-unit-wrapper" data-unit="m³/h"><input type="text" id="sys_tee_q_branch" class="input-field"></div></div>
                                    </div>
                                </div>
                                <div class="sub-group">${diameterInputs}</div>
                                <div class="sub-group">
                                    <label>Hvilken gren fortsætter systemet med?</label>
                                    <div class="radio-group"> 
                                        <input type="radio" id="sysTeePathStraight" name="sysTeePath" value="straight" checked><label for="sysTeePathStraight">Ligeud</label> 
                                        <input type="radio" id="sysTeePathBranch" name="sysTeePath" value="branch"><label for="sysTeePathBranch">Afgrening</label> 
                                    </div>
                                </div>
                            `;
                        } else { // merging
                            teeContainer.innerHTML = `
                                 <div class="sub-group">
                                    <label>Luftmængder (q Ud bliver ny system-luftmængde)</label>
                                    <div class="input-field-group">
                                        <div class="input-group"><label for="sys_tee_q_straight">q Ligeud (Ind)</label><div class="input-unit-wrapper" data-unit="m³/h"><input type="text" id="sys_tee_q_straight" class="input-field"></div></div>
                                        <div class="input-group"><label for="sys_tee_q_branch">q Afgrening (Ind)</label><div class="input-unit-wrapper" data-unit="m³/h"><input type="text" id="sys_tee_q_branch" class="input-field"></div></div>
                                    </div>
                                </div>
                                <div class="sub-group">${diameterInputs}</div>
                                 <div class="sub-group">
                                    <label>Hvilket indløbs tryktab skal medregnes?</label>
                                    <div class="radio-group"> 
                                        <input type="radio" id="sysTeePathStraight" name="sysTeePath" value="straight" checked><label for="sysTeePathStraight">Ligeud</label> 
                                        <input type="radio" id="sysTeePathBranch" name="sysTeePath" value="branch"><label for="sysTeePathBranch">Afgrening</label> 
                                    </div>
                                </div>
                            `;
                        }
                    };
                    teeFlowTypeRadios.forEach(r => r.addEventListener('change', renderTeeInputs));
                    renderTeeInputs();
                }
            }, 0);
            break;
        case 'tee_bullhead':
            inputsHtml = `
                <div class="sub-group">
                    <label>Luftmængder (q Ind arves fra system)</label>
                    <div class="input-field-group">
                        <div class="input-group"><label for="sys_tee_q_out1">q Ud 1</label><div class="input-unit-wrapper" data-unit="m³/h"><input type="text" id="sys_tee_q_out1" class="input-field"></div></div>
                        <div class="input-group"><label for="sys_tee_q_out2">q Ud 2</label><div class="input-unit-wrapper" data-unit="m³/h"><input type="text" id="sys_tee_q_out2" class="input-field"></div></div>
                    </div>
                </div>
                <div class="sub-group">
                    <label>Diametre</label>
                     <div class="input-field-group">
                        <div class="input-group"><label for="sys_tee_d_in">Ø Ind</label><select id="sys_tee_d_in" class="input-field">${roundOptions}</select></div>
                        <div class="input-group"><label for="sys_tee_d_out1">Ø Ud 1</label><select id="sys_tee_d_out1" class="input-field">${roundOptions}</select></div>
                        <div class="input-group"><label for="sys_tee_d_out2">Ø Ud 2</label><select id="sys_tee_d_out2" class="input-field">${roundOptions}</select></div>
                    </div>
                </div>
                <div class="sub-group">
                    <label>Hvilken gren fortsætter systemet med?</label>
                    <div class="radio-group"> 
                        <input type="radio" id="sysTeePath1" name="sysTeePath" value="path1" checked><label for="sysTeePath1">Gren 1</label> 
                        <input type="radio" id="sysTeePath2" name="sysTeePath" value="path2"><label for="sysTeePath2">Gren 2</label> 
                    </div>
                </div>`;
            break;
    }

    if (inputsHtml) {
        container.innerHTML = inputsHtml + `<button type="submit" class="button primary">Tilføj til System</button>`;
    }

    // Forudfyld felter efter at HTML er indsat
    if (lastComponent && lastComponent.outletDimension) {
        const lastDim = lastComponent.outletDimension;
        if (lastDim.shape === 'round') {
            ['sys_d', 'sys_d1', 'sys_tee_d_in'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = lastDim.d;
            });
        } else if (lastDim.shape === 'rect') {
            const elH = document.getElementById('sys_h');
            const elW = document.getElementById('sys_w');
            if (elH) elH.value = lastDim.h;
            if (elW) elW.value = lastDim.w;
        }
    }
}

export function toggleSystemMenu() {
    const menu = document.getElementById('systemMenu');
    menu.classList.toggle('hidden');
}

export function printDocumentation(event) {
    if (event) event.preventDefault();
    document.getElementById('systemMenu').classList.add('hidden');
    window.print();
}

// --- Dynamic UI Updates ---

export function updateDimUI() {
    const mode = document.querySelector('input[name="calculationMode"]:checked').value;
    const shape = document.querySelector('input[name="ductShape"]:checked').value;

    const calculateInputs = document.getElementById('calculateInputs');
    const analyzeInputs = document.getElementById('analyzeInputs');
    const aspectRatioInput = document.getElementById('aspectRatioInput');
    const analyzeRound = document.getElementById('analyzeRound');
    const analyzeRectangular = document.getElementById('analyzeRectangular');

    if (calculateInputs) calculateInputs.style.display = mode === 'calculate' ? 'block' : 'none';
    if (analyzeInputs) analyzeInputs.style.display = mode === 'analyze' ? 'block' : 'none';
    if (aspectRatioInput) aspectRatioInput.style.display = (mode === 'calculate' && shape === 'rectangular') ? 'block' : 'none';
    if (analyzeRound) analyzeRound.style.display = (mode === 'analyze' && shape === 'round') ? 'block' : 'none';
    if (analyzeRectangular) analyzeRectangular.style.display = (mode === 'analyze' && shape === 'rectangular') ? 'flex' : 'none';
}

export function updateConstraintDefaults() {
    const constraintTypeSelect = document.getElementById('constraintType');
    const constraintValueInput = document.getElementById('constraintValue');
    const unitWrapper = constraintValueInput.parentElement;

    if (constraintTypeSelect.value === 'velocity') {
        // Only update if value is the default processing one to avoid overwriting user input too aggressively, 
        // or just set it as the user expects from the old app (always reset).
        // The old app always reset it:
        constraintValueInput.value = '5';
        unitWrapper.dataset.unit = 'm/s';
    } else { // pressure
        constraintValueInput.value = '0,5';
        unitWrapper.dataset.unit = 'Pa/m';
    }
}

export function populateDatalists() {
    const diameterList = document.getElementById('diameter-list');
    const rectList = document.getElementById('rect-list');

    if (diameterList) {
        diameterList.innerHTML = '';
        STANDARD_ROUND_SIZES_MM.forEach(size => {
            const option = document.createElement('option');
            option.value = size;
            diameterList.appendChild(option);
        });
    }

    if (rectList) {
        rectList.innerHTML = '';
        STANDARD_RECT_SIZES_MM.forEach(size => {
            const option = document.createElement('option');
            option.value = size;
            rectList.appendChild(option);
        });
    }
}

