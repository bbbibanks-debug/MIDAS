async function uploadFile() {

    const fileInput = document.getElementById("fileInput");

    const resultDiv = document.getElementById("result");

    const file = fileInput.files[0];

    // valida arquivo
    if (!file) {

        alert("Selecione um arquivo Excel.");

        return;
    }

    // loading
    resultDiv.innerHTML = `
        <p>Analisando planilha...</p>
    `;

    // formdata
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

        if (!response.ok) {

            throw new Error(
                `Erro HTTP: ${response.status}`
            );
        }

        const data = await response.json();

        // =========================
        // DATASET INFO
        // =========================

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

        // =========================
        // SUGGESTIONS
        // =========================

        const suggestions = `
            <div class="card">

                <h2>🧠 Sugestões Inteligentes</h2>

                <p>
                    <strong>Coluna temporal:</strong>
                    ${data.suggestions.date_column}
                </p>

                <p>
                    <strong>Variável alvo:</strong>
                    ${data.suggestions.target_variable}
                </p>

                <p>
                    <strong>Features:</strong>
                    ${data.suggestions.features.join(", ")}
                </p>

            </div>
        `;

        // =========================
        // PREPARED DATASET
        // =========================

        const preparedDataset = `
            <div class="card">

                <h2>🧹 Dataset Preparado</h2>

                <p>
                    <strong>Linhas válidas:</strong>
                    ${data.prepared_dataset.rows_after_cleaning}
                </p>

            </div>
        `;

        // =========================
        // NUMERIC COLUMNS
        // =========================

        const numericColumns = data.columns_analysis
            .filter(col => col.detected_type === "numeric")
            .map(col => col.name);

        // =========================
        // DATETIME COLUMNS
        // =========================

        const datetimeColumns = data.columns_analysis
            .filter(col => col.detected_type === "datetime")
            .map(col => col.name);

        // =========================
        // DATE OPTIONS
        // =========================

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

        // =========================
        // TARGET OPTIONS
        // =========================

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

        // =========================
        // FEATURE CHECKBOXES
        // =========================

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

        // =========================
        // MODEL CONFIG
        // =========================

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

        // =========================
        // COLUMNS TABLE
        // =========================

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

        // =========================
        // PREVIEW
        // =========================

        const preview = `
            <div class="card">

                <h2>👀 Preview</h2>

                <pre>
${JSON.stringify(data.preview, null, 2)}
                </pre>

            </div>
        `;

        // =========================
        // FINAL RENDER
        // =========================

        resultDiv.innerHTML = `
            ${datasetInfo}
            ${suggestions}
            ${preparedDataset}
            ${modelConfig}
            ${columnsTable}
            ${preview}
        `;

    } catch (error) {

        console.error(error);

        resultDiv.innerHTML = `

            <div class="card error">

                <h2>Erro</h2>

                <p>
                    Falha ao processar a planilha.
                </p>

                <pre>
${error}
                </pre>

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

    // =========================
    // CAPTURE VALUES
    // =========================

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

    // =========================
    // VALIDATION
    // =========================

    if (checkedFeatures.length === 0) {

        alert(
            "Selecione ao menos uma variável explicativa."
        );

        return;
    }

    // =========================
    // LOADING
    // =========================

    modelResultDiv.innerHTML = `
        <p>Executando modelo MIDAS...</p>
    `;

    try {

        // =========================
        // REQUEST
        // =========================

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

        // =========================
        // ERROR
        // =========================

        if (data.error) {

            modelResultDiv.innerHTML = `

                <div class="card error">

                    <h2>Erro</h2>

                    <pre>
${data.error}
                    </pre>

                </div>
            `;

            return;
        }

        // =========================
        // COEFFICIENTS
        // =========================

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

        // =========================
        // RESULT RENDER
        // =========================

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
                    <strong>Intercepto:</strong>
                    ${data.model_results.intercept.toFixed(4)}
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

            </div>
        `;

    } catch (error) {

        console.error(error);

        modelResultDiv.innerHTML = `

            <div class="card error">

                <h2>Erro</h2>

                <pre>
${error}
                </pre>

            </div>
        `;
    }
}
