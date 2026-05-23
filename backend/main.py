from fastapi import FastAPI, UploadFile, File
import pandas as pd
import os

app = FastAPI()

UPLOAD_FOLDER = "uploads"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.get("/")
def home():
    return {"message": "MIDAS ONLINE"}


def detect_column_type(series):

    # tenta detectar datas
    try:
        pd.to_datetime(series.dropna(), errors='raise')
        return "datetime"
    except:
        pass

    # numérico
    if pd.api.types.is_numeric_dtype(series):
        return "numeric"

    # texto/categórico
    return "categorical"


@app.post("/upload")
async def upload_excel(file: UploadFile = File(...)):

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)

    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    df = pd.read_excel(file_path)

    columns_analysis = []

    detected_date_column = None
    numeric_columns = []

    for col in df.columns:

        detected_type = detect_column_type(df[col])

        if detected_type == "datetime" and detected_date_column is None:
            detected_date_column = col

        if detected_type == "numeric":
            numeric_columns.append(col)

        columns_analysis.append({
            "name": col,
            "detected_type": detected_type,
            "missing_values": int(df[col].isnull().sum()),
            "unique_values": int(df[col].nunique())
        })

    # sugestão de variável alvo
    target_variable = None

    if len(numeric_columns) > 0:
        target_variable = numeric_columns[0]

    # variáveis explicativas
    features = []

    for col in numeric_columns:
        if col != target_variable:
            features.append(col)

    return {

        "dataset_info": {
            "rows": int(len(df)),
            "columns": int(len(df.columns))
        },

        "columns_analysis": columns_analysis,

        "suggestions": {
            "date_column": detected_date_column,
            "target_variable": target_variable,
            "features": features
        },

        "preview": df.head(5).to_dict(orient="records")
    }
