from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import os

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://bbbibanks-debug.github.io/MIDAS/"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = "uploads"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.get("/")
def home():
    return {"message": "MIDAS ONLINE"}


def detect_column_type(series, column_name):

    # remove nulos
    clean_series = series.dropna()

    # vazio
    if len(clean_series) == 0:
        return "unknown"

    # verifica numérico primeiro
    if pd.api.types.is_numeric_dtype(clean_series):
        return "numeric"

    # palavras comuns de data
    date_keywords = [
        "data",
        "date",
        "periodo",
        "period",
        "mes",
        "month",
        "ano",
        "year"
    ]

    column_lower = column_name.lower()

    has_date_keyword = any(
        keyword in column_lower
        for keyword in date_keywords
    )

    # só tenta datetime se nome sugerir tempo
    if has_date_keyword:

        try:

            converted = pd.to_datetime(
                clean_series,
                errors='coerce'
            )

            valid_ratio = converted.notnull().mean()

            # pelo menos 80% válidos
            if valid_ratio > 0.8:
                return "datetime"

        except:
            pass

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

        detected_type = detect_column_type(df[col], col)

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
