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

        // upload para MESMO domínio
        const response = await fetch(
            "/upload",
            {
                method: "POST",
                body: formData
            }
        );

        // verifica erro HTTP
        if (!response.ok) {

            throw new Error(
                `Erro HTTP: ${response.status}`
            );
        }

        // converte json
        const data = await response.json();

        // exibe resultado
        resultDiv.innerHTML = `

            <h2>Análise do Dataset</h2>

            <pre>
${JSON.stringify(data, null, 2)}
            </pre>
        `;

    } catch (error) {

        console.error(error);

        resultDiv.innerHTML = `

            <h2>Erro</h2>

            <p>
                Falha ao conectar com o backend.
            </p>

            <pre>
${error}
            </pre>
        `;
    }
}
