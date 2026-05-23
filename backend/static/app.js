let chartInstance = null;

// ==========================================
// ACCORDION
// ==========================================

function toggleAccordion(id, headerElement) {

    const content =
        document.getElementById(id);

    const isCollapsed =
        content.classList.contains(
            "collapsed"
        );

    // fecha todos
    document
        .querySelectorAll(
            ".accordion-content"
        )
        .forEach(item => {

            item.classList.add(
                "collapsed"
            );
        });

    document
        .querySelectorAll(
            ".accordion-header"
        )
        .forEach(item => {

            item.classList.remove(
                "active"
            );
        });

    // abre selecionado
    if (isCollapsed) {

        content.classList.remove(
            "collapsed"
        );

        headerElement.classList.add(
            "active"
        );
    }
}

// ==========================================
// FORMAT NUMBER
// ==========================================

function formatNumber(value) {

    return Number(value).toLocaleString(
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
            "Selecione uma planilha Excel."
        );

        return;
    }

    document.getElementById(
        "modelConfig"
    ).innerHTML = `

        <div class="empty-state">

            Analisando dataset...

        </div>
    `;

    const formData =
        new FormData();

    formData.append(
        "file",
        file
    );

    try {

        const response = await fetch(
            "/upload",
            {
                method: "POST",
                body: formData
            }
        );

        const data =
            await response.json();

        if (data.error) {

            showError(data.error);

            return;
        }

        updateSummary(data);

        renderModelConfig(data);

        renderPreview(data.preview);

    } catch (error) {

        console.error(error);

        showError(error);
    }
}

// ==========================================
// SUMMARY
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

    const numericCount =
        data.columns_analysis.filter(
            col =>
                col.detected_type === "numeric"
        ).length;

    const datetimeCount =
        data.possible_time_columns.length;

    document.getElementById(
        "summaryNumeric"
    ).innerText =
        formatNumber(
            numericCount
        );

    document.getElementById(
        "summaryDatetime"
    ).innerText =
        formatNumber(
            datetimeCount
        );
}

// ==========================================
// MODEL CONFIG
// ==========================================

function renderModelConfig(data) {

    const numericColumns =
        data.columns_analysis
            .filter(
                col =>
                    col.detected_type === "numeric"
            )
            .map(col => col.name);

    const possibleTimeColumns =
        data.possible_time_columns;

    // ==========================================
    // DATE OPTIONS
    // ==========================================

    let dateOptions = "";

    possibleTimeColumns.forEach(col => {

        const selected =
            col === data.suggestions.date_column
            ? "selected"
            : "";

        dateOptions += `

            <option
                value="${col}"
                ${selected}
            >
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
            col === data.suggestions.target_variable
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

    let featuresHtml = "";

    numericColumns.forEach(col => {

        const checked =
            data.suggestions.features.includes(
                col
            )
            ? "checked"
            : "";

        featuresHtml += `

            <label class="feature-item">

                <input
                    type="checkbox"
                    value="${col}"
                    ${checked}
                >

                ${col}

            </label>
        `;
    });

    // ==========================================
    // RENDER
    // ==========================================

    document.getElementById(
        "modelConfig"
    ).innerHTML = `

        <div class="config-grid">

            <!-- TIME -->

            <div class="config-box">

                <label>
                    Coluna Temporal
                </label>

                <select id="dateColumn">

                    ${dateOptions}

                </select>

                <div class="suggestion-box">

                    Detectada automaticamente

                </div>

            </div>

            <!-- TARGET -->

            <div class="config-box">

                <label>
                    Variável Alvo
                </label>

                <select id="targetVariable">

                    ${targetOptions}

                </select>

                <div class="suggestion-box">

                    Sugestão MIDAS

                </div>

            </div>

        </div>

        <!-- FEATURES -->

        <div class="form-group">

            <label>

                Variáveis Explicativas

            </label>

            <div class="features-container">

                ${featuresHtml}

            </div>

        </div>

        <button
            class="primary-button"
            onclick="runModel()"
        >

            Executar Modelo MIDAS

        </button>

        <div id="modelResult"></div>
    `;
}

// ==========================================
// RUN MODEL
// ==========================================

async function runModel() {

    const modelResultDiv =
        document.getElementById(
            "modelResult"
        );

    const dateColumn =
        document.getElementById(
            "dateColumn"
        ).value;

    const targetVariable =
        document.getElementById(
            "targetVariable"
        ).value;

    const checkedFeatures = [];

    document
        .querySelectorAll(
            '.features-container input[type="checkbox"]:checked'
        )
        .forEach(checkbox => {

            checkedFeatures.push(
                checkbox.value
            );
        });

    if (
        checkedFeatures.length === 0
    ) {

        alert(
            "Selecione ao menos uma variável."
        );

        return;
    }

    // ==========================================
    // LOADING
    // ==========================================

    modelResultDiv.innerHTML = `

        <div class="empty-state">

            Executando modelo econométrico...

        </div>
    `;

    try {

        const response = await fetch(
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
                        checkedFeatures
                })
            }
        );

        const data =
            await response.json();

        if (data.error) {

            showError(data.error);

            return;
        }

        // ==========================================
        // SUCCESS MESSAGE
        // ==========================================

        modelResultDiv.innerHTML = `

            <div class="suggestion-box">

                Modelo executado com sucesso.

            </div>
        `;

        // ==========================================
        // RENDER
        // ==========================================

        renderMetrics(data);

        renderCoefficients(data);

        renderChart(data);

        renderDownloadButton();

    } catch (error) {

        console.error(error);

        showError(error);
    }
}

// ==========================================
// METRICS
// ==========================================

function renderMetrics(data) {

    const metricsGrid =
        document.getElementById(
            "metricsGrid"
        );

    metricsGrid.innerHTML = `

        <div class="metric-card">

            <div class="metric-title">

                R²

            </div>

            <div class="metric-value">

                ${formatNumber(
                    data.model_results.r2
                )}

            </div>

            <div class="metric-description">

                Qualidade do ajuste

            </div>

        </div>

        <div class="metric-card">

            <div class="metric-title">

                MAE

            </div>

            <div class="metric-value">

                ${formatNumber(
                    data.model_results.mae
                )}

            </div>

            <div class="metric-description">

                Erro absoluto médio

            </div>

        </div>

        <div class="metric-card">

            <div class="metric-title">

                RMSE

            </div>

            <div class="metric-value">

                ${formatNumber(
                    data.model_results.rmse
                )}

            </div>

            <div class="metric-description">

                Erro quadrático médio

            </div>

        </div>

        <div class="metric-card">

            <div class="metric-title">

                Observações

            </div>

            <div class="metric-value">

                ${formatNumber(
                    data.model_results.observations
                )}

            </div>

            <div class="metric-description">

                Amostra utilizada

            </div>

        </div>

        <div class="metric-card">

            <div class="metric-title">

                Intercepto

            </div>

            <div class="metric-value">

                ${formatNumber(
                    data.model_results.intercept
                )}

            </div>

            <div class="metric-description">

                Constante do modelo

            </div>

        </div>

        <div class="metric-card">

            <div class="metric-title">

                Exportação

            </div>

            <a
                href="/download-predictions"
                class="download-button"
            >

                Baixar Excel

            </a>

        </div>
    `;
}

// ==========================================
// COEFFICIENTS
// ==========================================

function renderCoefficients(data) {

    let rows = "";

    Object.entries(
        data.model_results.coefficients
    ).forEach(([feature, coef]) => {

        rows += `

            <tr>

                <td>

                    ${feature}

                </td>

                <td>

                    ${formatNumber(coef)}

                </td>

            </tr>
        `;
    });

    document.getElementById(
        "coefficientsTable"
    ).innerHTML = `

        <table>

            <thead>

                <tr>

                    <th>
                        Variável
                    </th>

                    <th>
                        Coeficiente
                    </th>

                </tr>

            </thead>

            <tbody>

                ${rows}

            </tbody>

        </table>
    `;
}

// ==========================================
// PREVIEW
// ==========================================

function renderPreview(preview) {

    if (!preview.length) {

        return;
    }

    const columns =
        Object.keys(preview[0]);

    let thead = "";

    columns.forEach(col => {

        thead += `

            <th>

                ${col}

            </th>
        `;
    });

    let tbody = "";

    preview.forEach(row => {

        tbody += "<tr>";

        columns.forEach(col => {

            tbody += `

                <td>

                    ${row[col]}

                </td>
            `;
        });

        tbody += "</tr>";
    });

    document.getElementById(
        "previewTable"
    ).innerHTML = `

        <table>

            <thead>

                <tr>

                    ${thead}

                </tr>

            </thead>

            <tbody>

                ${tbody}

            </tbody>

        </table>
    `;
}

// ==========================================
// CHART
// ==========================================

function renderChart(data) {

    const ctx =
        document.getElementById(
            "predictionChart"
        );

    if (chartInstance) {

        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {

        type: "line",

        data: {

            labels:
                data.model_results.time_values,

            datasets: [

                {
                    label: "Real",

                    data:
                        data.model_results.actual_values,

                    borderWidth: 3,

                    tension: 0.3
                },

                {
                    label: "Predito",

                    data:
                        data.model_results.predicted_values,

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

                    position: "top"
                }
            },

            scales: {

                y: {

                    ticks: {

                        callback: function(value) {

                            return formatNumber(value);
                        }
                    }
                }
            }
        }
    });
}

// ==========================================
// ERROR
// ==========================================

function showError(error) {

    console.error(error);

    document.getElementById(
        "modelConfig"
    ).innerHTML = `

        <div class="card error">

            <h2>

                Erro

            </h2>

            <pre>

${error}

            </pre>

        </div>
    `;
}
