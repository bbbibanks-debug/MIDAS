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
// UPLOAD FILE
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

        activateAnalyticsButtons();

    } catch (error) {

        console.error(error);

        alert(
            "Erro ao carregar planilha."
        );
    }
}

// ==========================================
// UPDATE SUMMARY
// ==========================================

function updateSummary(data) {

    document.getElementById(
        "summaryRows"
    ).innerText =
        formatNumber(
            data.dataset_info.rows
        );

    document.getElementById(
        "summaryColumns"
    ).innerText =
        formatNumber(
            data.dataset_info.columns
        );

    document.getElementById(
        "summaryNumeric"
    ).innerText =
        formatNumber(
            data.numeric_columns.length
        );

    document.getElementById(
        "summaryDatetime"
    ).innerText =
        formatNumber(
            data.possible_time_columns.length
        );
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

    const dateColumn =
        document.getElementById(
            "dateColumn"
        ).value;

    const targetVariable =
        document.getElementById(
            "targetVariable"
        ).value;

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

    const ctx =
        document
            .getElementById(
                "predictionChart"
            )
            .getContext("2d");

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

                            backgroundColor:
                                "rgba(255,107,0,0.08)",

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

                            backgroundColor:
                                "rgba(0,163,255,0.08)",

                            borderWidth: 3,

                            tension: 0.3
                        }
                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {

                            labels: {

                                color: "#ffffff"
                            }
                        }
                    },

                    scales: {

                        x: {

                            ticks: {

                                color: "#94a3b8"
                            },

                            grid: {

                                color:
                                    "rgba(255,255,255,0.05)"
                            }
                        },

                        y: {

                            ticks: {

                                color: "#94a3b8"
                            },

                            grid: {

                                color:
                                    "rgba(255,255,255,0.05)"
                            }
                        }
                    }
                }
            }
        );
}

// ==========================================
// ANALYTICS BUTTONS
// ==========================================

function activateAnalyticsButtons() {

    const statisticsSelect =
        document.getElementById(
            "statisticsVariable"
        );

    statisticsSelect.innerHTML = `
        <option value="">
            Selecione uma variável
        </option>
    `;

    uploadedData.numeric_columns.forEach(col => {

        statisticsSelect.innerHTML += `

            <option value="${col}">

                ${col}

            </option>
        `;
    });

    const buttons =
        document.querySelectorAll(
            ".analysis-button"
        );

    buttons.forEach(button => {

        button.onclick =
            async function () {

                if (!uploadedData) {

                    alert(
                        "Carregue uma planilha primeiro."
                    );

                    return;
                }

                const variable =
                    statisticsSelect.value;

                if (!variable) {

                    alert(
                        "Selecione uma variável estatística."
                    );

                    return;
                }

                let analysisType =
                    "";

                const buttonText =
                    this.innerText.trim();

                // ==========================================
                // ROUTER
                // ==========================================

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

    } catch (error) {

        console.error(error);

        alert(
            "Erro na análise estatística."
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

    let html = `

        <div class="statistics-header">

            <div class="statistics-variable">

                VARIÁVEL:
                ${data.variable}

            </div>

            <div class="statistics-type">

                ANÁLISE:
                ${data.analysis_type
                    .replaceAll("_", " ")
                    .toUpperCase()}

            </div>

        </div>

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

    container.innerHTML =
        html;
}

// ==========================================
// CREATE CARD
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
