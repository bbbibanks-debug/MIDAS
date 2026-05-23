from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder

import pandas as pd
import os

# ==========================================
# APP
# ==========================================

app = FastAPI()

# ==========================================
# CORS
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://bbbibanks-debug.github.io/MIDAS/"
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# UPLOAD FOLDER
# ==========================================

UPLOAD_FOLDER = "uploads"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ==========================================
# HOME
# ==========================================

@app.get("/")
def home():

    return {
        "message": "MIDAS ONLINE"
    }

# ==========================================
# OPTIONS ROUTE
# ==========================================

@app.options("/upload")
async def upload_options():

    return {
        "message": "OK"
    }

# ==========================================
# DETECT COLUMN TYPES
# ==========================================

def detect_column_type(series, column_name):

    clean_series = series.dropna()

    # vazio
    if len(clean_series) == 0:
        return "unknown"

    # numérico primeiro
    if pd.api.types.is_numeric_dtype(clean_series):
        return "numeric"

    # palavras relacionadas a data
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

    # tenta datetime
    if has_date_keyword:

        try:

            converted = pd.to_datetime(
                clean_series,
                errors="coerce"
            )

            valid_ratio = converted.notnull().mean()

            if valid_ratio > 0.8:
                return "datetime"

        except:
            pass

    return "categorical"

# ==========================================
# UPLOAD EXCEL
# ==========================================

@app.post("/upload")
async def upload_excel(file: UploadFile = File(...)):

    try:

        # salva arquivo
        file_path = os.path.join(
            UPLOAD_FOLDER,
            file.filename
        )

        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())

        # lê excel
        df = pd.read_excel(file_path)

        # ==========================================
        # ANALYSIS
        # ==========================================

        columns_analysis = []

        detected_date_column = None

        numeric_columns = []

        for col in df.columns:

            detected_type = detect_column_type(
                df[col],
                col
            )

            # detecta coluna temporal
            if (
                detected_type == "datetime"
                and detected_date_column is None
            ):
                detected_date_column = col

            # detecta colunas numéricas
            if detected_type == "numeric":
                numeric_columns.append(col)

            columns_analysis.append({

                "name": str(col),

                "detected_type": str(detected_type),

                "missing_values": int(
                    df[col].isnull().sum()
                ),

                "unique_values": int(
                    df[col].nunique()
                )
            })

        # ==========================================
        # TARGET
        # ==========================================

        target_variable = None

        if len(numeric_columns) > 0:
            target_variable = numeric_columns[0]

        # ==========================================
        # FEATURES
        # ==========================================

        features = []

        for col in numeric_columns:

            if col != target_variable:
                features.append(str(col))

        # ==========================================
        # DATA PREPARATION
        # ==========================================

        prepared_rows = 0

        # tratamento temporal
        if detected_date_column is not None:

            try:

                df[detected_date_column] = pd.to_datetime(
                    df[detected_date_column],
                    errors="coerce"
                )

                # remove inválidas
                df = df.dropna(
                    subset=[detected_date_column]
                )

                # ordena cronologicamente
                df = df.sort_values(
                    by=detected_date_column
                )

            except:
                pass

        # remove missing target
        if target_variable is not None:

            df = df.dropna(
                subset=[target_variable]
            )

        prepared_rows = len(df)

        # ==========================================
        # PREVIEW
        # ==========================================

        preview_data = (
            df.head(5)
            .astype(str)
            .to_dict(orient="records")
        )

        # ==========================================
        # RESPONSE
        # ==========================================

        response_data = {

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

            "prepared_dataset": {

                "rows_after_cleaning": int(prepared_rows),

                "target_variable": target_variable,

                "features": features,

                "date_column": detected_date_column
            },

            "preview": preview_data
        }

        return jsonable_encoder(response_data)

    except Exception as e:

        return {
            "error": str(e)
        }
