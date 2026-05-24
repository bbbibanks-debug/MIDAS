// ==========================================
// MIDAS STABLE OPERATIONAL ENGINE
// ==========================================

let uploadedData = null;

let predictionChart = null;

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
                maximumFractionDigits: 2
            }
        );
}

// ==========================================
// SMA
// ==========================================

function calculateSMA(values, period = 5) {

    let sma = [];

    for (let i = 0; i < values.length; i++) {

        if (i < period - 1) {

            sma.push(null);

            continue;
        }

        const subset =
            values.slice(
                i - period + 1,
                i + 1
            );

        const avg =
            subset.reduce(
                (a, b) => a + b,
                0
            ) / period;

        sma.push(avg);
    }

    return sma;
}

// ==========================================
// EMA
// ==========================================

function calculateEMA(values, period = 5) {

    let ema = [];

    const multiplier =
        2 / (period + 1);

    let previousEMA =
        values[0];

    ema.push(previousEMA);

    for (let i = 1; i < values.length; i++) {

        let currentEMA = (

            (
                values[i]
                - previousEMA
            )

            * multiplier

        ) + previousEMA;

        ema.push(currentEMA);

        previousEMA = currentEMA;
    }

    return ema;
}

// ==========================================
// UPLOAD
// ==========================================

async function uploadFile() {

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

        if (data.error) {

            alert(data.error);

            return;
        }

        uploadedData = data;

        updateSummary(data);

        renderModelConfig(data);

        populateStatisticsVariable(data);

        activateAnalyticsButtons();

        loadAnalyticsHistory();

        alert(
            "Dataset carregado com sucesso."
        );

    } catch (error) {

        console.error(error);

        alert(
            "Erro ao carregar dataset."
        );
    }
}

// ==========================================
// SUMMARY
// ==========================================

function updateSummary(data) {

    const rows =
        document.getElementById(
            "summaryRows"
        );

    const cols =
        document.getElementById(
            "summaryColumns"
        );

    const numeric =
        document.getElementById(
            "summaryNumeric"
        );

    const temporal =
        document.getElementById(
            "summaryDatetime"
        );

    if (rows) {

        rows.innerText =
            data.dataset_info.rows;
    }

    if (cols) {

        cols.innerText =
            data.dataset_info.columns;
    }

    if (numeric) {

        numeric.innerText =
            data.numeric_columns.length;
    }

    if (temporal) {

        temporal.innerText =
            data.possible_time_columns.length;
    }
}

// ==========================================
// MODEL CONFIG
// ==========================================

function renderModelConfig(data) {

    const container =
        document.getElementById(
            "modelConfig"
        );

    if (!container) {

        return;
    }

    const numericColumns =
        data.numeric_columns || [];

    const timeColumns =
        data.possible_time_columns || [];

    // ==========================================
    // FALLBACK
    // ==========================================

    let temporalOptions = "";

    if (timeColumns.length === 0) {

        temporalOptions = `

            <option value="index">
                Índice Temporal
            </option>
        `;
    }

    else {

        timeColumns.forEach(col => {

            temporalOptions += `

                <option value="${col}">
                    ${col}
                </option>
            `;
        });
    }

    // ==========================================
    // TARGET
    // ==========================================

    let targetOptions = "";

    numericColumns.forEach((col, index) => {

        targetOptions += `

            <option
                value="${col}"
                ${index === 0 ? "selected" : ""}
            >
                ${col}
            </option>
        `;
    });

    // ==========================================
    // FEATURES
    // ==========================================

    let featureOptions = "";

    numericColumns.forEach((col, index) => {

        if (index > 0) {

            featureOptions += `

                <label class="feature-item">

                    <input
                        type="checkbox"
                        value="${col}"
                        checked
                    >

                    ${col}

                </label>
            `;
        }
    });

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
    `;

    // ==========================================
    // BUTTON EVENT
    // ==========================================

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
}

// ==========================================
// STATISTICS VARIABLE
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

    const defaultOption =
        document.createElement(
            "option"
        );

    defaultOption.value = "";

    defaultOption.textContent =
        "Selecione uma variável";

    select.appendChild(
        defaultOption
    );

    data.numeric_columns.forEach(col => {

        const option =
            document.createElement(
                "option"
            );

        option.value = col;

        option.textContent = col;

        select.appendChild(option);
    });
}

// ==========================================
// RUN MODEL
// ==========================================

async function runModel() {

    try {

        const targetVariable =
            document.getElementById(
                "targetVariable"
            )?.value;

        const dateColumn =
            document.getElementById(
                "dateColumn"
            )?.value;

        if (!targetVariable) {

            alert(
                "Selecione uma variável alvo."
            );

            return;
        }

        const checkedFeatures =
            document.querySelectorAll(
                ".features-grid input:checked"
            );

        let features = [];

        checkedFeatures.forEach(item => {

            features.push(
                item.value
            );
        });

        // ==========================================
        // FALLBACK
        // ==========================================

        if (features.length === 0) {

            const available =
                uploadedData.numeric_columns
                .filter(
                    col =>
                    col !== targetVariable
                );

            if (available.length > 0) {

                features.push(
                    available[0]
                );
            }
        }

        if (features.length === 0) {

            alert(
                "Dataset precisa de pelo menos duas variáveis numéricas."
            );

            return;
        }

        const payload = {

            date_column:
                dateColumn || "index",

            target_variable:
                targetVariable,

            features:
                features
        };

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

        if (data.error) {

            alert(data.error);

            return;
        }

        renderChart(
            data.model_results
        );

    } catch (error) {

        console.error(error);

        alert(
            "Erro ao executar modelo."
        );
    }
}

// ==========================================
// CHART
// ==========================================

function renderChart(results) {

    if (
        !results
        ||
        !results.actual_values
    ) {

        return;
    }

    const canvas =
        document.getElementById(
            "predictionChart"
        );

    if (!canvas) {

        return;
    }

    const ctx =
        canvas.getContext("2d");

    if (predictionChart) {

        predictionChart.destroy();
    }

    const actual =
        results.actual_values;

    const predicted =
        results.predicted_values;

    const sma =
        calculateSMA(actual);

    const ema =
        calculateEMA(actual);

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
                                actual,

                            borderColor:
                                "#ff6b00",

                            borderWidth: 3
                        },

                        {
                            label:
                                "Predito",

                            data:
                                predicted,

                            borderColor:
                                "#00a3ff",

                            borderWidth: 3
                        },

                        {
                            label:
                                "SMA",

                            data:
                                sma,

                            borderColor:
                                "#39ff14",

                            borderWidth: 2,

                            borderDash: [5, 5]
                        },

                        {
                            label:
                                "EMA",

                            data:
                                ema,

                            borderColor:
                                "#ffd700",

                            borderWidth: 2
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
// ANALYTICS BUTTONS
// ==========================================

function activateAnalyticsButtons() {

    const buttons =
        document.querySelectorAll(
            ".analysis-button"
        );

    buttons.forEach(button => {

        button.addEventListener(
            "click",

            async function () {

                const select =
                    document.getElementById(
                        "statisticsVariable"
                    );

                if (!select) {

                    return;
                }

                const variable =
                    select.value;

                if (!variable) {

                    alert(
                        "Selecione uma variável."
                    );

                    return;
                }

                let analysisType = "";

                const text =
                    this.innerText;

                if (
                    text.includes(
                        "TENDÊNCIA"
                    )
                ) {

                    analysisType =
                        "central_tendency";
                }

                else if (
                    text.includes(
                        "DISPERSÃO"
                    )
                ) {

                    analysisType =
                        "dispersion";
                }

                else if (
                    text.includes(
                        "POSIÇÃO"
                    )
                ) {

                    analysisType =
                        "position";
                }

                else if (
                    text.includes(
                        "FORMA"
                    )
                ) {

                    analysisType =
                        "shape";
                }

                else if (
                    text.includes(
                        "TEMPORAL"
                    )
                ) {

                    analysisType =
                        "temporal";
                }

                await runVariableAnalysis(
                    variable,
                    analysisType
                );
            }
        );
    });
}

// ==========================================
// VARIABLE ANALYSIS
// ==========================================

async function runVariableAnalysis(
    variable,
    analysisType
) {

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
                            analysisType
                    })
                }
            );

        const data =
            await response.json();

        if (data.error) {

            alert(data.error);

            return;
        }

        renderStatistics(data);

        loadAnalyticsHistory();

    } catch (error) {

        console.error(error);

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

        renderAnalyticsHistory(
            data.history || []
        );

    } catch (error) {

        console.error(error);
    }
}

// ==========================================
// RENDER HISTORY
// ==========================================

function renderAnalyticsHistory(history) {

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

                    ${item.analysis_type}

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
// INIT
// ==========================================

window.addEventListener(
    "DOMContentLoaded",

    function () {

        loadAnalyticsHistory();

        activateAnalyticsButtons();
    }
);
