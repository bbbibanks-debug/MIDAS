from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.encoders import jsonable_encoder

from pydantic import BaseModel

from sklearn.linear_model import LinearRegression
from sklearn.metrics import (
    r2_score,
    mean_absolute_error,
    mean_squared_error
)

import pandas as pd
import numpy as np
import os
import re

# ==========================================
# APP
# ==========================================

app = FastAPI()

# ==========================================
# GLOBAL DATAFRAME
# ==========================================

uploaded_df = None

last_predictions_df = None

# ==========================================
# MODEL REQUEST
# ==========================================

class ModelRequest(BaseModel):

    date_column: str

    target_variable: str

    features: list[str]

# ==========================================
# UPLOAD FOLDER
# ==========================================

UPLOAD_FOLDER = "uploads"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ==========================================
# STATIC FILES
# ==========================================

app.mount(
    "/static",
    StaticFiles(directory="static"),
    name="static"
)

# ==========================================
# HOME
# ==========================================

@app.get("/")
async def home():

    return FileResponse("static/index.html")

# ==========================================
# DETECT COLUMN TYPES
# ==========================================

def detect_column_type(series, column_name):

    clean_series = series.dropna()

    if len(clean_series) == 0:
        return "unknown"

    if pd.api.types.is_numeric_dtype(clean_series):
        return "numeric"

    sample_values = clean_series.astype(str).head(20)

    temporal_patterns = [

        r"^\d{4}-\d{2}$",
        r"^\d{4}/\d{2}$",
        r"^\d{4}Q[1-4]$",
        r"^\d{4}q[1-4]$",
        r"^\d{4}M\d{2}$",
        r"^[A-Za-z]{3}-\d{2}$",
        r"^[A-Za-z]{3}/\d{2}$",
        r"^\d{4}$"
    ]

    temporal_matches = 0

    for value in sample_values:

        for pattern in temporal_patterns:

            if re.match(pattern, value):

                temporal_matches += 1

                break

    temporal_ratio = (
        temporal_matches / len(sample_values)
    )

    if temporal_ratio > 0.6:
        return "datetime"

    return "categorical"

# ==========================================
# UPLOAD
# ==========================================

@app.post("/upload")
async def upload_excel(file: UploadFile = File(...)):

    try:

        global uploaded_df

        file_path = os.path.join(
            UPLOAD_FOLDER,
            file.filename
        )

        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())

        df = pd.read_excel(file_path)

        uploaded_df = df.copy()

        columns_analysis = []

        detected_date_column = None

        numeric_columns = []

        possible_time_columns = []

        for col in df.columns:

            detected_type = detect_column_type(
                df[col],
                col
            )

            if detected_type in [
                "datetime",
                "categorical"
            ]:

                possible_time_columns.append(
                    str(col)
                )

            if (
                detected_type == "datetime"
                and detected_date_column is None
            ):
                detected_date_column = str(col)

            if detected_type == "numeric":

                numeric_columns.append(str(col))

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

        target_variable = None

        if len(numeric_columns) > 0:

            target_variable = numeric_columns[0]

        features = []

        for col in numeric_columns:

            if col != target_variable:

                features.append(str(col))

        preview_data = (
            df.head(5)
            .astype(str)
            .to_dict(orient="records")
        )

        response_data = {

            "dataset_info": {

                "rows": int(len(df)),

                "columns": int(len(df.columns))
            },

            "columns_analysis": columns_analysis,

            "possible_time_columns":
                possible_time_columns,

            "suggestions": {

                "date_column":
                    detected_date_column,

                "target_variable":
                    target_variable,

                "features":
                    features
            },

            "preview": preview_data
        }

        return jsonable_encoder(
            response_data
        )

    except Exception as e:

        return {
            "error": str(e)
        }

# ==========================================
# RUN MODEL
# ==========================================

@app.post("/run-model")
async def run_model(request: ModelRequest):

    try:

        global uploaded_df
        global last_predictions_df

        df = uploaded_df.copy()

        target_variable =
            request.target_variable

        features =
            request.features

        date_column =
            request.date_column

        model_df = df[
            [date_column] +
            [target_variable] +
            features
        ].dropna()

        X = model_df[features]

        y = model_df[target_variable]

        model = LinearRegression()

        model.fit(X, y)

        predictions = model.predict(X)

        # ==========================================
        # EXPORT DATAFRAME
        # ==========================================

        export_df = pd.DataFrame({

            "Tempo":
                model_df[date_column]
                .astype(str),

            "Valor_Real":
                y.astype(float),

            "Valor_Predito":
                predictions.astype(float)
        })

        last_predictions_df = export_df

        # ==========================================
        # METRICS
        # ==========================================

        r2 = r2_score(
            y,
            predictions
        )

        mae = mean_absolute_error(
            y,
            predictions
        )

        rmse = np.sqrt(
            mean_squared_error(
                y,
                predictions
            )
        )

        # ==========================================
        # COEFFICIENTS
        # ==========================================

        coefficients = {}

        for feature, coef in zip(
            features,
            model.coef_
        ):

            coefficients[feature] = float(coef)

        # ==========================================
        # INTERPRETATION
        # ==========================================

        interpretation = ""

        if r2 >= 0.8:

            interpretation = (
                "O modelo apresentou excelente ajuste estatístico."
            )

        elif r2 >= 0.6:

            interpretation = (
                "O modelo apresentou bom ajuste estatístico."
            )

        elif r2 >= 0.4:

            interpretation = (
                "O modelo apresentou ajuste moderado."
            )

        else:

            interpretation = (
                "O modelo apresentou baixo poder explicativo."
            )

        # ==========================================
        # RESPONSE
        # ==========================================

        return {

            "model_results": {

                "observations":
                    int(len(model_df)),

                "r2":
                    round(float(r2), 2),

                "mae":
                    round(float(mae), 2),

                "rmse":
                    round(float(rmse), 2),

                "intercept":
                    round(
                        float(model.intercept_),
                        2
                    ),

                "coefficients": {

                    k: round(v, 2)

                    for k, v in
                    coefficients.items()
                },

                "time_values":
                    list(
                        model_df[date_column]
                        .astype(str)
                    ),

                "actual_values":
                    [
                        round(float(v), 2)
                        for v in y
                    ],

                "predicted_values":
                    [
                        round(float(v), 2)
                        for v in predictions
                    ],

                "interpretation":
                    interpretation
            }
        }

    except Exception as e:

        return {
            "error": str(e)
        }

# ==========================================
# DOWNLOAD PREDICTIONS
# ==========================================

@app.get("/download-predictions")
async def download_predictions():

    global last_predictions_df

    if last_predictions_df is None:

        return {
            "error":
                "Nenhum modelo executado."
        }

    file_path = os.path.join(
        UPLOAD_FOLDER,
        "midas_predictions.xlsx"
    )

    last_predictions_df.to_excel(
        file_path,
        index=False
    )

    return FileResponse(
        file_path,
        filename="midas_predictions.xlsx"
    )
