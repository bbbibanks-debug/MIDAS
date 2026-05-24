// ==========================================
// MIDAS REACTIVE MODEL ENGINE
// ==========================================

// ==========================================
// GLOBAL STATE
// ==========================================

const MIDAS_STATE = {

    dataset: null,

    selectedTarget: null,

    selectedFeatures: [],

    selectedTemporal: null,

    modelResults: null,

    statisticsResults: null
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

    function () {

        initializeMIDAS();
    }
);

// ==========================================
// INITIALIZE
// ==========================================

function initializeMIDAS() {

    initializeUpload();

    initializeAnalyticsButtons();

    initializeDownloadButton();

    loadAnalyticsHistory();
}

// ==========================================
// FORMAT NUMBER
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

function initializeUpload() {

    const button =
        document.getElementById(
            "uploadButton"
        );

    if (!button) {

        return;
    }

    button.addEventListener(
        "click",
        uploadDataset
    );
}

// ==========================================
// UPLOAD DATASET
// ==========================================

async function uploadDataset() {

    const fileInput =
        document.getElementById(
            "fileInput"
        );

    if (
        !fileInput
        ||
        !fileInput.files
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

    showSystemStatus(
        "Carregando dataset..."
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

            showSystemStatus(
                "Erro no upload."
            );

            alert(data.error);

            return;
        }

        MIDAS_STATE.dataset = data;

        initializeDatasetState(data);

        updateSummaryRibbon(data);

        populateStatisticsVariable(data);

        renderModelWorkspace();

        showSystemStatus(
            "Dataset carregado."
        );

    } catch (error) {

        console.error(error);

        showSystemStatus(
            "Falha operacional."
        );

        alert(
            "Erro ao carregar dataset."
        );
    }
}

// ==========================================
// INITIALIZE STATE
// ==========================================

function initializeDatasetState(data) {

    const suggestions =
        data.suggestions || {};

    MIDAS_STATE.selectedTarget =
        suggestions.target_variable;

    MIDAS_STATE.selectedFeatures =
        suggestions.features || [];

    MIDAS_STATE.selectedTemporal =
        suggestions.date_column;
}

// ==========================================
// SUMMARY
// ==========================================

function updateSummaryRibbon(data) {

    if (!data.dataset_info) {

        return;
    }

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
// MODEL WORKSPACE
// ==========================================

function renderModelWorkspace() {

    const container =
        document.getElementById(
            "modelConfig"
        );

    if (
        !container
        ||
        !MIDAS_STATE.dataset
    ) {

        return;
    }

    const data =
        MIDAS_STATE.dataset;

    const numeric =
        data.numeric_columns || [];

    const temporal =
        data.possible_time_columns || [];

    // ==========================================
    // TEMPORAL
    // ==========================================

    let temporalOptions = "";

    temporal.forEach(col => {

        temporalOptions += `

            <option
                value="${col}"
                ${MIDAS_STATE.selectedTemporal === col ? "selected" : ""}
            >

                ${col}

            </option>
        `;
    });

    // ==========================================
    // TARGET
    // ==========================================

    let targetOptions = "";

    numeric.forEach(col => {

        targetOptions += `

            <option
                value="${col}"
                ${MIDAS_STATE.selectedTarget === col ? "selected" : ""}
            >

                ${col}

            </option>
        `;
    });

    // ==========================================
    // FEATURES
    // ==========================================

    let featureOptions = "";

    numeric.forEach(col => {

        if (
            col !== MIDAS_STATE.selectedTarget
        ) {

            featureOptions += `

                <label class="feature-item">

                    <input
                        type="checkbox"
                        value="${col}"
                        ${MIDAS_STATE.selectedFeatures.includes(col) ? "checked" : ""}
                    >

                    ${col}

                </label>
            `;
        }
    });

    // ==========================================
    // MODEL RESULTS
    // ==========================================

    let resultsPanel = "";

    if (MIDAS_STATE.modelResults) {

        const model =
            MIDAS_STATE.modelResults;

        resultsPanel = `

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
                            OBSERVAÇÕES
                        </div>

                        <div class="result-value">

                            ${model.observations}

                        </div>

                    </div>

                </div>

                <div class="coefficients-panel">

                    <h3>
                        COEFICIENTES
                    </h3>

                    ${renderCoefficients(model.coefficients)}

                </div>

            </div>
        `;
    }

    // ==========================================
    // FINAL
    // ==========================================

    container.innerHTML = `

        <div class="config-group">

            <label>
                Coluna Temporal
            </label>

            <select id="dateColumn">

                ${temporalOptions}

            </select>

        </div>

        <div class="config-group">

            <label>
                Variável Alvo
            </label>

            <select id="targetVariable">

                ${targetOptions}

            </select>

        </div>

        <div class="config-group">

            <label>
                Variáveis Explicativas
            </label>

            <div class="features-grid">

                ${featureOptions}

            </div>

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

        ${resultsPanel}
    `;

    initializeReactiveControls();
}

// ==========================================
// COEFFICIENTS
// ==========================================

function renderCoefficients(coefficients) {

    if (!coefficients) {

        return "";
    }

    let html = "";

    Object.entries(
        coefficients
    ).forEach(([key, value]) => {

        html += `

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

    return html;
}

// ==========================================
// REACTIVE CONTROLS
// ==========================================

function initializeReactiveControls() {

    const targetSelect =
        document.getElementById(
            "targetVariable"
        );

    if (targetSelect) {

        targetSelect.addEventListener(
            "change",

            function () {

                MIDAS_STATE.selectedTarget =
                    this.value;

                recalculateFeatures();

                renderModelWorkspace();
            }
        );
    }

    const dateSelect =
        document.getElementById(
            "dateColumn"
        );

    if (dateSelect) {

        dateSelect.addEventListener(
            "change",

            function () {

                MIDAS_STATE.selectedTemporal =
                    this.value;
            }
        );
    }

    const checkboxes =
        document.querySelectorAll(
            ".features-grid input"
        );

    checkboxes.forEach(box => {

        box.addEventListener(
            "change",

            function () {

                updateFeaturesState();
            }
        );
    });

    const runButton =
        document.getElementById(
            "runModelButton"
        );

    if (runButton) {

        runButton.addEventListener(
            "click",
            runModel
        );
    }

    initializeDownloadButton();
}

// ==========================================
// RECALCULATE FEATURES
// ==========================================

function recalculateFeatures() {

    const numeric =
        MIDAS_STATE.dataset
        .numeric_columns;

    MIDAS_STATE.selectedFeatures =
        numeric.filter(

            col =>
            col !== MIDAS_STATE.selectedTarget
        );
}

// ==========================================
// UPDATE FEATURES
// ==========================================

function updateFeaturesState() {

    const checked =
        document.querySelectorAll(
            ".features-grid input:checked"
        );

    MIDAS_STATE.selectedFeatures = [];

    checked.forEach(item => {

        MIDAS_STATE.selectedFeatures.push(
            item.value
        );
    });
}

// ==========================================
// RUN MODEL
// ==========================================

async function runModel() {

    if (!MIDAS_STATE.dataset) {

        alert(
            "Carregue um dataset."
        );

        return;
    }

    if (
        MIDAS_STATE.selectedFeatures
        .length === 0
    ) {

        alert(
            "Selecione variáveis explicativas."
        );

        return;
    }

    showSystemStatus(
        "Executando modelo..."
    );

    const payload = {

        date_column:
            MIDAS_STATE.selectedTemporal,

        target_variable:
            MIDAS_STATE.selectedTarget,

        features:
            MIDAS_STATE.selectedFeatures
    };

    console.log(
        "MODEL PAYLOAD:",
        payload
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

                    body: JSON.stringify(
                        payload
                    )
                }
            );

        const data =
            await response.json();

        console.log(
            "MODEL RESPONSE:",
            data
        );

        if (data.error) {

            showSystemStatus(
                "Erro operacional."
            );

            alert(data.error);

            return;
        }

        MIDAS_STATE.modelResults =
            data.model_results;

        renderModelWorkspace();

        renderPredictionChart(
            data.model_results
        );

        showSystemStatus(
            "Modelo executado."
        );

    } catch (error) {

        console.error(error);

        showSystemStatus(
            "Falha operacional."
        );

        alert(
            "Erro ao executar modelo."
        );
    }
}

// ==========================================
// CHART
// ==========================================

function renderPredictionChart(results) {

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

    predictionChart =
        new Chart(
            ctx,
            {
                type: "line",

                data: {

                    labels:
                        results.time_values,

                    datasets: [

                        {
                            label:
                                "Real",

                            data:
                                results.actual_values,

                            borderColor:
                                "#ff6b00",

                            borderWidth: 3
                        },

                        {
                            label:
                                "Predito",

                            data:
                                results.predicted_values,

                            borderColor:
                                "#00a3ff",

                            borderWidth: 3
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
// STATISTICS
// ==========================================

function populateStatisticsVariable(data) {

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

    data.numeric_columns.forEach(col => {

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
// ANALYTICS
// ==========================================

function initializeAnalyticsButtons() {

    const buttons =
        document.querySelectorAll(
            ".analysis-button"
        );

    buttons.forEach(button => {

        button.addEventListener(
            "click",

            async function () {

                if (!MIDAS_STATE.dataset) {

                    alert(
                        "Carregue um dataset."
                    );

                    return;
                }

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
// RUN ANALYSIS
// ==========================================

async function runAnalysis(
    variable,
    analysis
) {

    showSystemStatus(
        "Executando análise..."
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

            showSystemStatus(
                "Erro na análise."
            );

            alert(data.error);

            return;
        }

        MIDAS_STATE.statisticsResults =
            data;

        renderStatistics(data);

        loadAnalyticsHistory();

        showSystemStatus(
            "Análise concluída."
        );

    } catch (error) {

        console.error(error);

        showSystemStatus(
            "Falha operacional."
        );

        alert(
            "Erro na análise."
        );
    }
}

// ==========================================
// RENDER STATISTICS
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
// DOWNLOAD
// ==========================================

function initializeDownloadButton() {

    const button =
        document.getElementById(
            "downloadButton"
        );

    if (!button) {

        return;
    }

    button.addEventListener(
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

// ==========================================
// STATUS
// ==========================================

function showSystemStatus(message) {

    const status =
        document.querySelector(
            ".status-live"
        );

    if (status) {

        status.innerText =
            `● ${message.toUpperCase()}`;
    }
}
