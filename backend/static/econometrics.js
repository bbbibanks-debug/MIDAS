// ==========================================
// MIDAS REACTIVE FORECAST ENGINE
// ==========================================

// ==========================================
// GLOBAL STATE
// ==========================================

const MIDAS = {

    dataset: null,

    modelResults: null,

    statisticsResults: null,

    selectedTarget: null,

    selectedFeatures: [],

    selectedTemporal: null,

    forecastHorizon: 3
};

// ==========================================
// CHART
// ==========================================

let predictionChart = null;

// ==========================================
// INIT
// ==========================================

document.addEventListener(
    "DOMContentLoaded",

    initializeMIDAS
);

// ==========================================
// INITIALIZE
// ==========================================

function initializeMIDAS() {

    bindStaticEvents();

    loadAnalyticsHistory();
}

// ==========================================
// STATIC EVENTS
// ==========================================

function bindStaticEvents() {

    // ==========================================
    // UPLOAD
    // ==========================================

    const uploadButton =
        document.getElementById(
            "uploadButton"
        );

    if (uploadButton) {

        uploadButton.addEventListener(
            "click",
            uploadDataset
        );
    }

    // ==========================================
    // ANALYTICS
    // ==========================================

    document
        .querySelectorAll(
            ".analysis-button"
        )
        .forEach(button => {

            button.addEventListener(
                "click",

                async function () {

                    const variable =
                        document.getElementById(
                            "statisticsVariable"
                        )?.value;

                    if (!variable) {

                        alert(
                            "Selecione uma variável."
                        );

                        return;
                    }

                    const analysis =
                        this.dataset.analysis;

                    await runAnalysis(
                        variable,
                        analysis
                    );
                }
            );
        });
}

// ==========================================
// STATUS
// ==========================================

function setStatus(message) {

    const el =
        document.querySelector(
            ".status-live"
        );

    if (el) {

        el.innerText =
            `● ${message.toUpperCase()}`;
    }
}

// ==========================================
// FORMAT
// ==========================================

function formatNumber(value) {

    if (
        value === null
        ||
        value === undefined
        ||
        isNaN(value)
    ) {

        return "-";
    }

    return Number(value)
        .toLocaleString(
            "pt-BR",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4
            }
        );
}

// ==========================================
// SET TEXT
// ==========================================

function setText(id, value) {

    const el =
        document.getElementById(id);

    if (el) {

        el.innerText = value;
    }
}

// ==========================================
// UPLOAD
// ==========================================

async function uploadDataset() {

    const fileInput =
        document.getElementById(
            "fileInput"
        );

    if (
        !fileInput
        ||
        !fileInput.files[0]
    ) {

        alert(
            "Selecione uma planilha."
        );

        return;
    }

    const formData =
        new FormData();

    formData.append(
        "file",
        fileInput.files[0]
    );

    setStatus(
        "Carregando dataset"
    );

    try {

        const response =
            await fetch(
                "/upload",
                {
                    method: "POST",
                    body: formData
                }
            );

        const data =
            await response.json();

        console.log(
            "UPLOAD:",
            data
        );

        if (data.error) {

            setStatus(
                "Erro upload"
            );

            alert(data.error);

            return;
        }

        MIDAS.dataset = data;

        initializeState(data);

        updateSummary(data);

        populateStatisticsVariables();

        populateModelWorkspace();

        setStatus(
            "Dataset carregado"
        );

    } catch (error) {

        console.error(error);

        setStatus(
            "Falha operacional"
        );
    }
}

// ==========================================
// INITIALIZE STATE
// ==========================================

function initializeState(data) {

    MIDAS.selectedTarget =
        data.suggestions.target_variable;

    MIDAS.selectedFeatures =
        [...data.suggestions.features];

    MIDAS.selectedTemporal =
        data.suggestions.date_column;
}

// ==========================================
// SUMMARY
// ==========================================

function updateSummary(data) {

    setText(
        "summaryRows",
        data.dataset_info.rows
    );

    setText(
        "summaryColumns",
        data.dataset_info.columns
    );

    setText(
        "summaryNumeric",
        data.numeric_columns.length
    );

    setText(
        "summaryDatetime",
        data.possible_time_columns.length
    );
}

// ==========================================
// STATISTICS VARIABLES
// ==========================================

function populateStatisticsVariables() {

    const select =
        document.getElementById(
            "statisticsVariable"
        );

    if (!select) {

        return;
    }

    select.innerHTML = "";

    const option =
        document.createElement(
            "option"
        );

    option.value = "";

    option.textContent =
        "Selecione uma variável";

    select.appendChild(option);

    MIDAS.dataset.numeric_columns
        .forEach(col => {

            const el =
                document.createElement(
                    "option"
                );

            el.value = col;

            el.textContent = col;

            select.appendChild(el);
        });
}

// ==========================================
// MODEL WORKSPACE
// ==========================================

function populateModelWorkspace() {

    const container =
        document.getElementById(
            "modelConfig"
        );

    if (!container) {

        return;
    }

    container.innerHTML = `

        <div class="config-group">

            <label>
                Coluna Temporal
            </label>

            <select id="dateColumn"></select>

        </div>

        <div class="config-group">

            <label>
                Variável Alvo
            </label>

            <select id="targetVariable"></select>

        </div>

        <div class="config-group">

            <label>
                Forecast Horizon
            </label>

            <select id="forecastHorizon">

                <option value="1">
                    1 período
                </option>

                <option value="3" selected>
                    3 períodos
                </option>

                <option value="6">
                    6 períodos
                </option>

                <option value="12">
                    12 períodos
                </option>

                <option value="24">
                    24 períodos
                </option>

            </select>

        </div>

        <div class="config-group">

            <label>
                Variáveis Explicativas
            </label>

            <div
                class="features-grid"
                id="featuresGrid"
            ></div>

        </div>

        <button
            id="runModelButton"
            class="primary-button"
        >

            EXECUTAR MODELO

        </button>

        <button
            id="downloadButton"
            class="primary-button"
            style="margin-top:12px;"
        >

            DOWNLOAD RESULTADOS

        </button>

        <div
            id="modelResultsPanel"
        ></div>
    `;

    bindWorkspaceEvents();

    updateWorkspaceValues();
}

// ==========================================
// UPDATE WORKSPACE
// ==========================================

function updateWorkspaceValues() {

    updateTemporalSelect();

    updateTargetSelect();

    updateFeatures();

    renderModelResults();
}

// ==========================================
// TEMPORAL
// ==========================================

function updateTemporalSelect() {

    const select =
        document.getElementById(
            "dateColumn"
        );

    if (!select) {

        return;
    }

    select.innerHTML = "";

    MIDAS.dataset
        .possible_time_columns
        .forEach(col => {

            const option =
                document.createElement(
                    "option"
                );

            option.value = col;

            option.textContent = col;

            if (
                MIDAS.selectedTemporal === col
            ) {

                option.selected = true;
            }

            select.appendChild(option);
        });
}

// ==========================================
// TARGET
// ==========================================

function updateTargetSelect() {

    const select =
        document.getElementById(
            "targetVariable"
        );

    if (!select) {

        return;
    }

    select.innerHTML = "";

    MIDAS.dataset
        .numeric_columns
        .forEach(col => {

            const option =
                document.createElement(
                    "option"
                );

            option.value = col;

            option.textContent = col;

            if (
                MIDAS.selectedTarget === col
            ) {

                option.selected = true;
            }

            select.appendChild(option);
        });
}

// ==========================================
// FEATURES
// ==========================================

function updateFeatures() {

    const grid =
        document.getElementById(
            "featuresGrid"
        );

    if (!grid) {

        return;
    }

    grid.innerHTML = "";

    MIDAS.dataset
        .numeric_columns
        .forEach(col => {

            if (
                col === MIDAS.selectedTarget
            ) {

                return;
            }

            const label =
                document.createElement(
                    "label"
                );

            label.className =
                "feature-item";

            label.innerHTML = `

                <input
                    type="checkbox"
                    value="${col}"
                    ${MIDAS.selectedFeatures.includes(col) ? "checked" : ""}
                >

                ${col}
            `;

            grid.appendChild(label);
        });

    bindFeatureEvents();
}

// ==========================================
// WORKSPACE EVENTS
// ==========================================

function bindWorkspaceEvents() {

    // TARGET

    document
        .getElementById(
            "targetVariable"
        )
        ?.addEventListener(
            "change",

            function () {

                MIDAS.selectedTarget =
                    this.value;

                MIDAS.selectedFeatures =
                    MIDAS.dataset
                    .numeric_columns
                    .filter(

                        col =>
                        col !== MIDAS.selectedTarget
                    );

                updateFeatures();
            }
        );

    // TEMPORAL

    document
        .getElementById(
            "dateColumn"
        )
        ?.addEventListener(
            "change",

            function () {

                MIDAS.selectedTemporal =
                    this.value;
            }
        );

    // FORECAST

    document
        .getElementById(
            "forecastHorizon"
        )
        ?.addEventListener(
            "change",

            function () {

                MIDAS.forecastHorizon =
                    parseInt(this.value);
            }
        );

    // MODEL

    document
        .getElementById(
            "runModelButton"
        )
        ?.addEventListener(
            "click",
            runModel
        );

    // DOWNLOAD

    document
        .getElementById(
            "downloadButton"
        )
        ?.addEventListener(
            "click",

            function () {

                window.open(
                    "/download-predictions",
                    "_blank"
                );
            }
        );
}

// ==========================================
// FEATURES EVENTS
// ==========================================

function bindFeatureEvents() {

    document
        .querySelectorAll(
            "#featuresGrid input"
        )
        .forEach(box => {

            box.addEventListener(
                "change",

                function () {

                    MIDAS.selectedFeatures =
                        [];

                    document
                        .querySelectorAll(
                            "#featuresGrid input:checked"
                        )
                        .forEach(item => {

                            MIDAS.selectedFeatures
                                .push(
                                    item.value
                                );
                        });
                }
            );
        });
}

// ==========================================
// MODEL
// ==========================================

async function runModel() {

    if (
        MIDAS.selectedFeatures
        .length === 0
    ) {

        alert(
            "Selecione variáveis explicativas."
        );

        return;
    }

    setStatus(
        "Executando forecast"
    );

    try {

        const response =
            await fetch(
                "/run-model",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        date_column:
                            MIDAS.selectedTemporal,

                        target_variable:
                            MIDAS.selectedTarget,

                        features:
                            MIDAS.selectedFeatures,

                        forecast_horizon:
                            MIDAS.forecastHorizon
                    })
                }
            );

        const data =
            await response.json();

        console.log(
            "MODEL:",
            data
        );

        if (data.error) {

            setStatus(
                "Erro forecast"
            );

            alert(data.error);

            return;
        }

        MIDAS.modelResults =
            data.model_results;

        renderChart(
            data.model_results
        );

        renderModelResults();

        setStatus(
            "Forecast executado"
        );

    } catch (error) {

        console.error(error);

        setStatus(
            "Falha operacional"
        );
    }
}

// ==========================================
// CHART
// ==========================================

function renderChart(results) {

    const canvas =
        document.getElementById(
            "predictionChart"
        );

    if (
        !canvas
        ||
        !results
    ) {

        return;
    }

    const ctx =
        canvas.getContext("2d");

    if (predictionChart) {

        predictionChart.destroy();
    }

    const historicalLabels =
        [...results.time_values];

    const futureLabels =
        [...results.future_dates];

    const allLabels =
        historicalLabels.concat(
            futureLabels
        );

    const realSeries =
        [
            ...results.actual_values,

            ...Array(
                futureLabels.length
            ).fill(null)
        ];

    const predictedSeries =
        [
            ...results.predicted_values,

            ...Array(
                futureLabels.length
            ).fill(null)
        ];

    const forecastSeries =
        [
            ...Array(
                historicalLabels.length
            ).fill(null),

            ...results.future_predictions
        ];

    predictionChart =
        new Chart(
            ctx,
            {
                type: "line",

                data: {

                    labels:
                        allLabels,

                    datasets: [

                        {
                            label:
                                "Real",

                            data:
                                realSeries,

                            borderColor:
                                "#ff7b00",

                            borderWidth: 3
                        },

                        {
                            label:
                                "Predito",

                            data:
                                predictedSeries,

                            borderColor:
                                "#00c8ff",

                            borderWidth: 3
                        },

                        {
                            label:
                                "Forecast",

                            data:
                                forecastSeries,

                            borderColor:
                                "#39ff14",

                            borderWidth: 3,

                            borderDash:
                                [6, 6]
                        }
                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false
                }
            }
        );
}

// ==========================================
// MODEL RESULTS
// ==========================================

function renderModelResults() {

    const panel =
        document.getElementById(
            "modelResultsPanel"
        );

    if (
        !panel
        ||
        !MIDAS.modelResults
    ) {

        return;
    }

    const model =
        MIDAS.modelResults;

    let coefficients = "";

    Object.entries(
        model.coefficients
    ).forEach(([key, value]) => {

        coefficients += `

            <div class="coefficient-row">

                <div class="coef-name">

                    ${key}

                </div>

                <div class="coef-value">

                    ${formatNumber(value)}

                </div>

            </div>
        `;
    });

    let forecastPanel = "";

    if (
        model.future_predictions
    ) {

        forecastPanel = `

            <div class="coefficients-panel"
                 style="margin-top:18px;">

                <h3>
                    FORECAST
                </h3>

                ${model.future_predictions
                    .map((value, index) => `

                        <div class="coefficient-row">

                            <div class="coef-name">

                                ${model.future_dates[index]}

                            </div>

                            <div class="coef-value">

                                ${formatNumber(value)}

                            </div>

                        </div>

                    `).join("")}

            </div>
        `;
    }

    panel.innerHTML = `

        <div class="model-results-panel">

            <div class="results-grid">

                <div class="result-card">

                    <div class="result-label">
                        R²
                    </div>

                    <div class="result-value">

                        ${formatNumber(model.r2)}

                    </div>

                </div>

                <div class="result-card">

                    <div class="result-label">
                        RMSE
                    </div>

                    <div class="result-value">

                        ${formatNumber(model.rmse)}

                    </div>

                </div>

                <div class="result-card">

                    <div class="result-label">
                        MAE
                    </div>

                    <div class="result-value">

                        ${formatNumber(model.mae)}

                    </div>

                </div>

                <div class="result-card">

                    <div class="result-label">
                        FORECAST
                    </div>

                    <div class="result-value">

                        ${model.forecast_horizon}

                    </div>

                </div>

            </div>

            <div class="coefficients-panel">

                <h3>
                    COEFICIENTES
                </h3>

                ${coefficients}

            </div>

            ${forecastPanel}

        </div>
    `;
}

// ==========================================
// ANALYSIS
// ==========================================

async function runAnalysis(
    variable,
    analysis
) {

    setStatus(
        "Executando análise"
    );

    try {

        const response =
            await fetch(
                "/variable-analysis",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        variable:
                            variable,

                        analysis_type:
                            analysis
                    })
                }
            );

        const data =
            await response.json();

        console.log(
            "ANALYSIS:",
            data
        );

        if (data.error) {

            setStatus(
                "Erro análise"
            );

            alert(data.error);

            return;
        }

        renderStatistics(data);

        loadAnalyticsHistory();

        setStatus(
            "Análise concluída"
        );

    } catch (error) {

        console.error(error);

        setStatus(
            "Falha operacional"
        );
    }
}

// ==========================================
// STATISTICS
// ==========================================

function renderStatistics(data) {

    const container =
        document.getElementById(
            "statisticsResults"
        );

    if (!container) {

        return;
    }

    let html = `

        <div class="statistics-grid">
    `;

    Object.entries(
        data.results
    ).forEach(([key, value]) => {

        if (
            typeof value === "object"
        ) {

            value =
                JSON.stringify(value);
        }

        html += `

            <div class="stat-card">

                <div class="stat-title">

                    ${key
                        .replaceAll("_", " ")
                        .toUpperCase()}

                </div>

                <div class="stat-value">

                    ${formatNumber(value)}

                </div>

            </div>
        `;
    });

    html += `</div>`;

    if (
        data.insights
        &&
        data.insights.length > 0
    ) {

        html += `

            <div class="insights-container">
        `;

        data.insights.forEach(insight => {

            html += `

                <div class="
                    insight-card
                    insight-${insight.severity}
                ">

                    <div class="
                        insight-badge
                        badge-${insight.severity}
                    ">

                        ${insight.severity.toUpperCase()}

                    </div>

                    <div class="insight-title">

                        ${insight.title}

                    </div>

                    <div class="insight-message">

                        ${insight.message}

                    </div>

                </div>
            `;
        });

        html += `</div>`;
    }

    container.innerHTML = html;
}

// ==========================================
// HISTORY
// ==========================================

async function loadAnalyticsHistory() {

    try {

        const response =
            await fetch(
                "/analytics-history"
            );

        const data =
            await response.json();

        renderHistory(
            data.history || []
        );

    } catch (error) {

        console.error(error);
    }
}

// ==========================================
// RENDER HISTORY
// ==========================================

function renderHistory(history) {

    const container =
        document.getElementById(
            "analyticsHistory"
        );

    if (!container) {

        return;
    }

    if (history.length === 0) {

        container.innerHTML = `

            <div class="empty-state">

                Nenhuma análise registrada.

            </div>
        `;

        return;
    }

    let html = "";

    history.forEach(item => {

        let insight = "";

        if (
            item.insights
            &&
            item.insights.length > 0
        ) {

            insight =
                item.insights[0].message;
        }

        html += `

            <div class="history-item">

                <div class="history-time">

                    ${item.timestamp}

                </div>

                <div class="history-variable">

                    ${item.variable}

                </div>

                <div class="history-analysis">

                    ${item.analysis_type
                        .replaceAll("_", " ")
                        .toUpperCase()}

                </div>

                <div class="history-insight">

                    ${insight}

                </div>

            </div>
        `;
    });

    container.innerHTML = html;
}

