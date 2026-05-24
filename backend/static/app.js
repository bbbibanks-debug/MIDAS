// ==========================================
// MIDAS FINAL SYNC ENGINE
// ==========================================

let uploadedData = null;

let predictionChart = null;

// ==========================================
// INIT
// ==========================================

document.addEventListener(
    "DOMContentLoaded",

    function () {

        initializeSystem();
    }
);

// ==========================================
// INITIALIZE
// ==========================================

function initializeSystem() {

    const uploadButton =
        document.getElementById(
            "uploadButton"
        );

    if (uploadButton) {

        uploadButton.addEventListener(
            "click",
            uploadFile
        );
    }

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
                maximumFractionDigits: 2
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

async function uploadFile() {

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
            "UPLOAD RESPONSE:",
            data
        );

        if (data.error) {

            alert(data.error);

            return;
        }

        uploadedData = data;

        updateSummary(data);

        populateStatisticsVariable(data);

        renderModelConfig(data);

        alert(
            "Dataset carregado com sucesso."
        );

    } catch (error) {

        console.error(error);

        alert(
            "Erro no upload."
        );
    }
}

// ==========================================
// SUMMARY
// ==========================================

function updateSummary(data) {

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
        data.numeric_columns?.length || 0
    );

    setText(
        "summaryDatetime",
        data.possible_time_columns?.length || 0
    );
}

// ==========================================
// POPULATE STATISTICS
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

    const numeric =
        data.numeric_columns || [];

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

    numeric.forEach(col => {

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

    const numeric =
        data.numeric_columns || [];

    const temporal =
        data.possible_time_columns || [];

    if (numeric.length < 2) {

        container.innerHTML = `

            <div class="empty-state">

                São necessárias pelo menos
                duas variáveis numéricas.

            </div>
        `;

        return;
    }

    // ==========================================
    // TEMPORAL
    // ==========================================

    let temporalOptions = "";

    temporal.forEach(col => {

        temporalOptions += `

            <option value="${col}">

                ${col}

            </option>
        `;
    });

    // ==========================================
    // TARGET
    // ==========================================

    let targetOptions = "";

    numeric.forEach((col, index) => {

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

    numeric.forEach((col, index) => {

        if (index !== 0) {

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

        <button
            id="downloadButton"
            class="primary-button"
            style="margin-top:12px;"
        >

            DOWNLOAD RESULTADOS

        </button>
    `;

    // ==========================================
    // EVENTS
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

    initializeDownloadButton();
}

// ==========================================
// RUN MODEL
// ==========================================

async function runModel() {

    try {

        if (!uploadedData) {

            alert(
                "Carregue um dataset."
            );

            return;
        }

        const target =
            document.getElementById(
                "targetVariable"
            )?.value;

        const temporal =
            document.getElementById(
                "dateColumn"
            )?.value;

        const checked =
            document.querySelectorAll(
                ".features-grid input:checked"
            );

        let features = [];

        checked.forEach(item => {

            features.push(
                item.value
            );
        });

        if (!target) {

            alert(
                "Selecione variável alvo."
            );

            return;
        }

        if (features.length === 0) {

            alert(
                "Selecione ao menos uma variável explicativa."
            );

            return;
        }

        const payload = {

            date_column:
                temporal,

            target_variable:
                target,

            features:
                features
        };

        console.log(
            "MODEL PAYLOAD:",
            payload
        );

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
// ANALYTICS BUTTONS
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

                if (!uploadedData) {

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

                const analysisType =
                    this.dataset.analysis;

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

        const payload = {

            variable:
                variable,

            analysis_type:
                analysisType
        };

        console.log(
            "ANALYSIS PAYLOAD:",
            payload
        );

        const response =
            await fetch(
                "/variable-analysis",
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
            "ANALYSIS RESPONSE:",
            data
        );

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
