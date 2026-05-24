// ==========================================
// MIDAS MASTER WORKSPACE ENGINE
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

function calculateSMA(
    values,
    period = 5
) {

    let sma = [];

    for (
        let i = 0;
        i < values.length;
        i++
    ) {

        if (i < period - 1) {

            sma.push(null);

            continue;
        }

        let subset =
            values.slice(
                i - period + 1,
                i + 1
            );

        let avg =
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

function calculateEMA(
    values,
    period = 5
) {

    let ema = [];

    const multiplier =
        2 / (period + 1);

    let previousEMA =
        values[0];

    ema.push(previousEMA);

    for (
        let i = 1;
        i < values.length;
        i++
    ) {

        let currentEMA = (

            (
                values[i]
                - previousEMA
            )

            * multiplier

        ) + previousEMA;

        ema.push(currentEMA);

        previousEMA =
            currentEMA;
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

    const file =
        fileInput.files[0];

    if (!file) {

        alert(
            "Selecione uma planilha."
        );

        return;
    }

    const formData =
        new FormData();

    formData.append(
        "file",
        file
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
            "Erro ao carregar planilha."
        );
    }
}

// ==========================================
// SUMMARY
// ==========================================

function updateSummary(data) {

    document.getElementById(
        "summaryRows"
    ).innerText =
        data.dataset_info.rows;

    document.getElementById(
        "summaryColumns"
    ).innerText =
        data.dataset_info.columns;

    document.getElementById(
        "summaryNumeric"
    ).innerText =
        data.numeric_columns.length;

    document.getElementById(
        "summaryDatetime"
    ).innerText =
        data.possible_time_columns.length;
}

// ==========================================
// POPULATE STATISTICS
// ==========================================

function populateStatisticsVariable(data) {

    const statisticsSelect =
        document.getElementById(
            "statisticsVariable"
        );

    if (!statisticsSelect) {

        return;
    }

    statisticsSelect.innerHTML = `

        <option value="">
            Selecione uma variável
        </option>
    `;

    data.numeric_columns.forEach(col => {

        statisticsSelect.innerHTML += `

            <option value="${col}">
                ${col}
            </option>
        `;
    });
}

// ==========================================
// MODEL CONFIG
// ==========================================

function renderModelConfig(data) {

    const container =
        document.getElementById(
            "modelConfig"
        );

    const dateColumns =
        data.possible_time_columns;

    const numericColumns =
        data.numeric_columns;

    const suggestedTarget =
        data.suggestions.target_variable;

    let dateOptions = "";

    dateColumns.forEach(col => {

        dateOptions += `

            <option value="${col}">
                ${col}
            </option>
        `;
    });

    let targetOptions = "";

    numericColumns.forEach(col => {

        const selected =
            col === suggestedTarget
            ? "selected"
            : "";

        targetOptions += `

            <option
                value="${col}"
                ${selected}
            >
                ${col}
            </option>
        `;
    });

    let featureOptions = "";

    numericColumns.forEach(col => {

        if (col !== suggestedTarget) {

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

                ${dateOptions}

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
            class="primary-button"
            onclick="runModel()"
        >

            EXECUTAR MODELO

        </button>
    `;
}

// ==========================================
// RUN MODEL
// ==========================================

async function runModel() {

    try {

        const dateColumn =
            document.getElementById(
                "dateColumn"
            )?.value;

        const targetVariable =
            document.getElementById(
                "targetVariable"
            )?.value;

        const checkedFeatures =
            document.querySelectorAll(
                ".features-grid input:checked"
            );

        let features = [];

        checkedFeatures.forEach(item => {

            if (
                item.value !== targetVariable
            ) {

                features.push(
                    item.value
                );
            }
        });

        if (features.length === 0) {

            alert(
                "Selecione pelo menos uma variável explicativa."
            );

            return;
        }

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
                            dateColumn,

                        target_variable:
                            targetVariable,

                        features:
                            features
                    })
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

    const sma =
        calculateSMA(
            actual,
            5
        );

    const ema =
        calculateEMA(
            actual,
            5
        );

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

                            borderWidth: 3,

                            tension: 0.3
                        },

                        {
                            label:
                                "Predito",

                            data:
                                results.predicted_values,

                            borderColor:
                                "#00a3ff",

                            borderWidth: 3,

                            tension: 0.3
                        },

                        {
                            label:
                                "SMA (5)",

                            data:
                                sma,

                            borderColor:
                                "#39ff14",

                            borderDash: [5, 5],

                            borderWidth: 2
                        },

                        {
                            label:
                                "EMA (5)",

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

        button.onclick =
            async function () {

                const statisticsSelect =
                    document.getElementById(
                        "statisticsVariable"
                    );

                const variable =
                    statisticsSelect?.value;

                if (!variable) {

                    alert(
                        "Selecione uma variável."
                    );

                    return;
                }

                const buttonText =
                    this.innerText.trim();

                let analysisType = "";

                if (
                    buttonText.includes(
                        "TENDÊNCIA"
                    )
                ) {

                    analysisType =
                        "central_tendency";
                }

                else if (
                    buttonText.includes(
                        "DISPERSÃO"
                    )
                ) {

                    analysisType =
                        "dispersion";
                }

                else if (
                    buttonText.includes(
                        "POSIÇÃO"
                    )
                ) {

                    analysisType =
                        "position";
                }

                else if (
                    buttonText.includes(
                        "FORMA"
                    )
                ) {

                    analysisType =
                        "shape";
                }

                else if (
                    buttonText.includes(
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
            };
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

        renderStatistics(
            data
        );

        loadAnalyticsHistory();

    } catch (error) {

        console.error(error);

        alert(
            "Erro na análise estatística."
        );
    }
}

// ==========================================
// INSIGHTS
// ==========================================

function renderInsights(insights) {

    if (
        !insights
        ||
        insights.length === 0
    ) {

        return "";
    }

    let html = `

        <div class="insights-container">

            <div class="ai-analytics-header">

                <div class="ai-pulse"></div>

                <div class="insights-title">

                    AI ANALYTICS

                </div>

            </div>
    `;

    insights.forEach(insight => {

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

    return html;
}

// ==========================================
// RENDER STATISTICS
// ==========================================

function renderStatistics(data) {

    const container =
        document.getElementById(
            "statisticsResults"
        );

    let html = `

        <div class="statistics-grid">
    `;

    Object.entries(
        data.results
    ).forEach(([key, value]) => {

        html += createStatCard(
            key,
            value
        );
    });

    html += `</div>`;

    html += renderInsights(
        data.insights
    );

    container.innerHTML =
        html;
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
            data.history
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

    if (
        !history
        ||
        history.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-state">

                Nenhuma análise registrada.

            </div>
        `;

        return;
    }

    let html = "";

    history.forEach(item => {

        let firstInsight = "";

        if (
            item.insights
            &&
            item.insights.length > 0
        ) {

            firstInsight =
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

                    ${firstInsight}

                </div>

            </div>
        `;
    });

    container.innerHTML =
        html;
}

// ==========================================
// CARD
// ==========================================

function createStatCard(
    title,
    value
) {

    return `

        <div class="stat-card">

            <div class="stat-title">

                ${title
                    .replaceAll("_", " ")
                    .toUpperCase()}

            </div>

            <div class="stat-value">

                ${formatNumber(value)}

            </div>

        </div>
    `;
}

// ==========================================
// INITIAL LOAD
// ==========================================

window.onload = function () {

    loadAnalyticsHistory();
};
