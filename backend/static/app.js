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
        // COLUMNS ANALYSIS
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
        // RENDER FINAL
        // =========================

        resultDiv.innerHTML = `
            ${datasetInfo}
            ${suggestions}
            ${preparedDataset}
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
