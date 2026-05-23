let chartInstance = null;

// ==========================================
// UPLOAD FILE
// ==========================================

async function uploadFile() {

    const fileInput = document.getElementById("fileInput");

    const resultDiv = document.getElementById("result");

    const file = fileInput.files[0];

    if (!file) {

        alert("Selecione um arquivo Excel.");

        return;
    }

    resultDiv.innerHTML = `
        <p>Analisando planilha...</p>
    `;

    const formData = new FormData();

    formData.append("file", file);

    try {

        const response = await fetch(
            "/upload",
            {
                method: "POST",
                body: formData
            }
        );

        const data = await response.json();

        if (data.error) {

            resultDiv.innerHTML = `

                <div class="card error">

                    <h2>Erro</h2>

                    <pre>${data.error}</pre>

                </div>
            `;

            return;
        }

        // ==========================================
        // DATASET INFO
        // ==========================================

        const datasetInfo = `

            <div class="card">

                <h2>📊 Dataset</h2>

                <p>
                    <strong>Linhas:</strong>
                    ${data.dataset_info.rows}
                </p>

                <p>
                    <strong>Colunas:</strong>
                    ${data.dataset_info.columns}
                </p>

            </div>
        `;

        // ==========================================
        // SUGGESTIONS
        // ==========================================

        const suggestions = `

            <div class="card">

                <h2>🧠 Sugestões Inteligentes</h2>

                <p>
                    <strong>Coluna temporal:</strong>
                    ${data.suggestions.date_column || "Não detectada"}
                </p>

                <p>
                    <strong>Variável alvo:</strong>
                    ${data.suggestions.target_variable || "Não detectada"}
                </p>

                <p>
                    <strong>Features:</strong>
                    ${data.suggestions.features.join(", ")}
                </p>

            </div>
        `;

        // ==========================================
        // NUMERIC COLUMNS
        // ==========================================

        const numericColumns = data.columns_analysis
            .filter(col => col.detected_type === "numeric")
            .map(col => col.name);

        // ==========================================
        // DATETIME COLUMNS
        // ==========================================

        const datetimeColumns = data.columns_analysis
            .filter(col => col.detected_type === "datetime")
            .map(col => col.name);

        // ==========================================
        // DATE OPTIONS
        // ==========================================

        let dateOptions = "";

        datetimeColumns.forEach(col => {

            const selected =
                col === data.suggestions.date_column
                ? "selected"
                : "";

            dateOptions += `
                <option value="${col}" ${selected}>
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
                <option value="${col}" ${selected}>
                    ${col}
                </option>
            `;
        });

        // ==========================================
        // FEATURE CHECKBOXES
        // ==========================================

        let featureCheckboxes = "";

        numericColumns.forEach(col => {

            const checked =
                data.suggestions.features.includes(col)
                ? "checked"
                : "";

            featureCheckboxes += `

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
        // MODEL CONFIG
        // ==========================================

        const modelConfig = `

            <div class="card">

                <h2>⚙️ Configuração do Modelo</h2>

                <div class="form-group">

                    <label>
                        📅 Coluna temporal
                    </label>

                    <select id="dateColumn">

                        ${dateOptions}

                    </select>

                </div>

                <div class="form-group">

                    <label>
                        🎯 Variável alvo
                    </label>

                    <select id="targetVariable">

                        ${targetOptions}

                    </select>

                </div>

                <div class="form-group">

                    <label>
                        📈 Variáveis explicativas
                    </label>

                    <div class="features-container">

                        ${featureCheckboxes}

                    </div>

                </div>

                <button onclick="runModel()">

                    Executar Modelo MIDAS

                </button>

                <div id="modelResult"></div>

            </div>
        `;

        // ==========================================
        // COLUMNS TABLE
        // ==========================================

        let columnsTable = `

            <div class="card">

                <h2>📋 Análise das Colunas</h2>

                <table>

                    <thead>

                        <tr>

                            <th>Coluna</th>
                            <th>Tipo</th>
                            <th>Missing</th>
                            <th>Únicos</th>

                        </tr>

                    </thead>

                    <tbody>
        `;

        data.columns_analysis.forEach(col => {

            columnsTable += `

                <tr>

                    <td>${col.name}</td>

                    <td>${col.detected_type}</td>

                    <td>${col.missing_values}</td>

                    <td>${col.unique_values}</td>

                </tr>
            `;
        });

        columnsTable += `

                    </tbody>

                </table>

            </div>
        `;

        // ==========================================
        // PREVIEW
        // ==========================================

        const preview = `

            <div class="card">

                <h2>👀 Preview</h2>

                <pre>
${JSON.stringify(data.preview, null, 2)}
                </pre>

            </div>
        `;

        // ==========================================
        // FINAL RENDER
        // ==========================================

        resultDiv.innerHTML = `
            ${datasetInfo}
            ${suggestions}
            ${modelConfig}
            ${columnsTable}
            ${preview}
        `;

    } catch (error) {

        console.error(error);

        resultDiv.innerHTML = `

            <div class="card error">

                <h2>Erro</h2>

                <pre>${error}</pre>

            </div>
        `;
    }
}

// ==========================================
// RUN MODEL
// ==========================================

async function runModel() {

    const modelResultDiv =
        document.getElementById("modelResult");

    const dateColumn =
        document.getElementById("dateColumn").value;

    const targetVariable =
        document.getElementById("targetVariable").value;

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

    if (checkedFeatures.length === 0) {

        alert(
            "Selecione ao menos uma variável explicativa."
        );

        return;
    }

    modelResultDiv.innerHTML = `
        <p>Executando modelo MIDAS...</p>
    `;

    try {

        const response = await fetch(
            "/run-model",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    date_column: dateColumn,

                    target_variable: targetVariable,

                    features: checkedFeatures
                })
            }
        );

        const data = await response.json();

        if (data.error) {

            modelResultDiv.innerHTML = `

                <div class="card error">

                    <h2>Erro</h2>

                    <pre>${data.error}</pre>

                </div>
            `;

            return;
        }

        let coefficientsHtml = "";

        Object.entries(
            data.model_results.coefficients
        ).forEach(([feature, coef]) => {

            coefficientsHtml += `

                <tr>

                    <td>${feature}</td>

                    <td>${coef.toFixed(4)}</td>

                </tr>
            `;
        });

        modelResultDiv.innerHTML = `

            <div class="card">

                <h2>📈 Resultados do Modelo</h2>

                <p>
                    <strong>Observações:</strong>
                    ${data.model_results.observations}
                </p>

                <p>
                    <strong>R²:</strong>
                    ${data.model_results.r2.toFixed(4)}
                </p>

                <p>
                    <strong>MAE:</strong>
                    ${data.model_results.mae.toFixed(4)}
                </p>

                <p>
                    <strong>RMSE:</strong>
                    ${data.model_results.rmse.toFixed(4)}
                </p>

                <p>
                    <strong>Intercepto:</strong>
                    ${data.model_results.intercept.toFixed(4)}
                </p>

                <p>
                    <strong>Interpretação:</strong>
                    ${data.model_results.interpretation}
                </p>

                <h3>Coeficientes</h3>

                <table>

                    <thead>

                        <tr>

                            <th>Variável</th>
                            <th>Coeficiente</th>

                        </tr>

                    </thead>

                    <tbody>

                        ${coefficientsHtml}

                    </tbody>

                </table>

                <canvas
                    id="predictionChart"
                    height="120"
                ></canvas>

            </div>
        `;

        // ==========================================
        // CHART
        // ==========================================

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

                labels: data.model_results.actual_values.map(
                    (_, i) => i + 1
                ),

                datasets: [

                    {
                        label: "Real",
                        data: data.model_results.actual_values,
                        borderWidth: 2
                    },

                    {
                        label: "Predito",
                        data: data.model_results.predicted_values,
                        borderWidth: 2
                    }
                ]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false
            }
        });

    } catch (error) {

        console.error(error);

        modelResultDiv.innerHTML = `

            <div class="card error">

                <h2>Erro</h2>

                <pre>${error}</pre>

            </div>
        `;
    }
}
