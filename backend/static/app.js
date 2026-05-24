// ==========================================
// VARIABLE ANALYSIS
// ==========================================

async function runVariableAnalysis() {

    const variable =
        document.getElementById(
            "univariateVariable"
        ).value;

    const analysisType =
        document.getElementById(
            "analysisType"
        ).value;

    const resultsContainer =
        document.getElementById(
            "statisticsResults"
        );

    // ==========================================
    // VALIDATION
    // ==========================================

    if (!variable) {

        alert(
            "Selecione uma variável."
        );

        return;
    }

    // ==========================================
    // LOADING
    // ==========================================

    resultsContainer.innerHTML = `

        <div class="empty-state">

            Calculando estatísticas...

        </div>
    `;

    try {

        // ==========================================
        // REQUEST
        // ==========================================

        const response = await fetch(
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

        // ==========================================
        // ERROR
        // ==========================================

        if (data.error) {

            resultsContainer.innerHTML = `

                <div class="card error">

                    <h2>
                        Erro
                    </h2>

                    <pre>

${data.error}

                    </pre>

                </div>
            `;

            return;
        }

        // ==========================================
        // RENDER
        // ==========================================

        renderVariableAnalysis(
            data
        );

    } catch (error) {

        console.error(error);

        resultsContainer.innerHTML = `

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
}

// ==========================================
// RENDER VARIABLE ANALYSIS
// ==========================================

function renderVariableAnalysis(data) {

    const container =
        document.getElementById(
            "statisticsResults"
        );

    const variable =
        data.variable;

    const analysisType =
        data.analysis_type;

    const results =
        data.results;

    // ==========================================
    // TITLES
    // ==========================================

    let analysisTitle =
        "";

    if (
        analysisType ===
        "central_tendency"
    ) {

        analysisTitle =
            "Tendência Central";
    }

    else if (
        analysisType ===
        "dispersion"
    ) {

        analysisTitle =
            "Dispersão";
    }

    else if (
        analysisType ===
        "position"
    ) {

        analysisTitle =
            "Separatrizes";
    }

    // ==========================================
    // HEADER
    // ==========================================

    let html = `

        <div class="analysis-header">

            <div>

                <div class="analysis-variable">

                    ${variable}

                </div>

                <div class="analysis-type">

                    ${analysisTitle}

                </div>

            </div>

            <div class="analysis-badge">

                MIDAS Analytics Engine

            </div>

        </div>
    `;

    // ==========================================
    // GRID
    // ==========================================

    html += `

        <div class="statistics-grid">
    `;

    // ==========================================
    // OBJECT RENDER
    // ==========================================

    Object.entries(results).forEach(

        ([key, value]) => {

            // ==========================================
            // NESTED OBJECT
            // ==========================================

            if (
                typeof value === "object"
                &&
                value !== null
            ) {

                Object.entries(value).forEach(

                    ([subKey, subValue]) => {

                        html += createStatCard(
                            `${key} ${subKey}`,
                            subValue
                        );
                    }
                );
            }

            // ==========================================
            // SIMPLE VALUE
            // ==========================================

            else {

                html += createStatCard(
                    key,
                    value
                );
            }
        }
    );

    html += `

        </div>
    `;

    // ==========================================
    // RENDER
    // ==========================================

    container.innerHTML =
        html;
}

// ==========================================
// CREATE STAT CARD
// ==========================================

function createStatCard(
    title,
    value
) {

    // ==========================================
    // LABEL FORMAT
    // ==========================================

    const formattedTitle =
        title
            .replaceAll("_", " ")
            .toUpperCase();

    // ==========================================
    // VALUE FORMAT
    // ==========================================

    let formattedValue =
        value;

    if (
        typeof value === "number"
    ) {

        formattedValue =
            formatNumber(value);
    }

    return `

        <div class="stat-card">

            <div class="stat-title">

                ${formattedTitle}

            </div>

            <div class="stat-value">

                ${formattedValue}

            </div>

            <div class="stat-subtitle">

                Estatística calculada pela engine MIDAS.

            </div>

        </div>
    `;
}
