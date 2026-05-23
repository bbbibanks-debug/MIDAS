async function uploadFile() {

    const fileInput = document.getElementById('fileInput');

    const resultDiv = document.getElementById('result');

    const file = fileInput.files[0];

    if (!file) {

        alert("Selecione um arquivo Excel.");

        return;
    }

    resultDiv.innerHTML = "Analisando planilha...";

    const formData = new FormData();

    formData.append("file", file);

    try {

        const response = await fetch(
            "https://SEUAPP.onrender.com/upload",
            {
                method: "POST",
                body: formData
            }
        );

        const data = await response.json();

        resultDiv.innerHTML = `
            <h2>Análise do Dataset</h2>

            <pre>${JSON.stringify(data, null, 2)}</pre>
        `;

    } catch (error) {

        resultDiv.innerHTML = `
            <p>Erro ao conectar com o backend.</p>
        `;

        console.error(error);
    }
}
