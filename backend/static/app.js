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
// RENDER MODEL CONFIG
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

    // ==========================================
    // DATE OPTIONS
    // ==========================================

    let dateOptions = "";

    dateColumns.forEach(col => {

        dateOptions += `

            <option value="${col}">

                ${col}

            </option>
        `;
    });

    // ==========================================
    // TARGET OPTIONS
    // ==========================================

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

    // ==========================================
    // FEATURES
    // ==========================================

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

    // ==========================================
    // RENDER
    // ==========================================

    container.innerHTML = `

        <div class="model-grid">

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
// RENDER CHART
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
                                "#f97316",

                            backgroundColor:
                                "rgba(249,115,22,0.1)",

                            tension: 0.3
                        },

                        {
                            label:
                                "Predito",

                            data:
                                results.predicted_values,

                            borderColor:
                                "#3b82f6",

                            backgroundColor:
                                "rgba(59,130,246,0.1)",

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

                                color: "#cbd5e1"
                            },

                            grid: {

                                color:
                                    "rgba(255,255,255,0.08)"
                            }
                        },

                        y: {

                            ticks: {

                                color: "#cbd5e1"
                            },

                            grid: {

                                color:
                                    "rgba(255,255,255,0.08)"
                            }
                        }
                    }
                }
            }
        );
}

// ==========================================
// VARIABLE ANALYSIS
// ==========================================

async function runVariableAnalysis() {

    alert(
        "Módulo estatístico em integração."
    );
}
