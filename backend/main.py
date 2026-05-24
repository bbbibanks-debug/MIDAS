from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from pydantic import BaseModel

from sklearn.linear_model import LinearRegression
from sklearn.metrics import (
    r2_score,
    mean_absolute_error,
    mean_squared_error
)

# ==========================================
# ANALYTICS
# ==========================================

from analytics.central_tendency import (
    calculate_central_tendency
)

from analytics.dispersion import (
    calculate_dispersion
)

from analytics.position import (
    calculate_position
)

# ==========================================
# LIBS
# ==========================================

import pandas as pd
import numpy as np
import os
import re

# ==========================================
# APP
# ==========================================

app = FastAPI()

# ==========================================
# BASE PATHS
# ==========================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

STATIC_DIR = os.path.join(
    BASE_DIR,
    "static"
)

UPLOAD_FOLDER = os.path.join(
    BASE_DIR,
    "uploads"
)

os.makedirs(
    UPLOAD_FOLDER,
    exist_ok=True
)

# ==========================================
# STATIC FILES
# ==========================================

app.mount(
    "/static",
    StaticFiles(directory=STATIC_DIR),
    name="static"
)

# ==========================================
# GLOBALS
# ==========================================

uploaded_df = None

last_predictions_df = None

# ==========================================
# REQUESTS
# ==========================================

class ModelRequest(BaseModel):

    date_column: str

    target_variable: str

    features: list[str]

class VariableAnalysisRequest(BaseModel):

    variable: str

    analysis_type: str

# ==========================================
# HOME
# ==========================================

@app.get("/")
async def home():

    return FileResponse(
        os.path.join(
            STATIC_DIR,
            "index.html"
        )
    )

# ==========================================
# DETECT COLUMN TYPE
# ==========================================

def detect_column_type(series):

    clean_series = series.dropna()

    if len(clean_series) == 0:

        return "unknown"

    if pd.api.types.is_numeric_dtype(
        clean_series
    ):

        return "numeric"

    sample_values = (
        clean_series
        .astype(str)
        .head(20)
    )

    temporal_patterns = [

        r"^\d{4}-\d{2}$",
        r"^\d{4}/\d{2}$",
        r"^\d{4}Q[1-4]$",
        r"^\d{4}$"
    ]

    temporal_matches = 0

    for value in sample_values:

        for pattern in temporal_patterns:

            if re.match(
                pattern,
                value
            ):

                temporal_matches += 1

                break

    ratio = (
        temporal_matches /
        len(sample_values)
    )

    if ratio > 0.6:

        return "datetime"

    return "categorical"

# ==========================================
# UPLOAD
# ==========================================

@app.post("/upload")
async def upload_excel(
    file: UploadFile = File(...)
):

    try:

        global uploaded_df

        file_path = os.path.join(
            UPLOAD_FOLDER,
            file.filename
        )

        with open(
            file_path,
            "wb"
        ) as buffer:

            buffer.write(
                await file.read()
            )

        df = pd.read_excel(
            file_path
        )

        uploaded_df = df.copy()

        columns_analysis = []

        numeric_columns = []

        possible_time_columns = []

        detected_date_column = None

        for col in df.columns:

            detected_type = (
                detect_column_type(
                    df[col]
                )
            )

            if detected_type == "numeric":

                numeric_columns.append(
                    str(col)
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

            columns_analysis.append({

                "name":
                    str(col),

                "detected_type":
                    detected_type,

                "missing_values":
                    int(
                        df[col]
                        .isnull()
                        .sum()
                    ),

                "unique_values":
                    int(
                        df[col]
                        .nunique()
                    )
            })

        target_variable = None

        if len(numeric_columns) > 0:

            target_variable = (
                numeric_columns[0]
            )

        features = []

        for col in numeric_columns:

            if col != target_variable:

                features.append(col)

        preview_data = (
            df.head(5)
            .astype(str)
            .to_dict(
                orient="records"
            )
        )

        return {

            "dataset_info": {

                "rows":
                    int(len(df)),

                "columns":
                    int(len(df.columns))
            },

            "columns_analysis":
                columns_analysis,

            "numeric_columns":
                numeric_columns,

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

            "preview":
                preview_data
        }

    except Exception as e:

        return {
            "error":
                str(e)
        }

# ==========================================
# VARIABLE ANALYSIS
# ==========================================

@app.post("/variable-analysis")
async def variable_analysis(
    request: VariableAnalysisRequest
):

    try:

        global uploaded_df

        if uploaded_df is None:

            return {
                "error":
                    "Nenhum dataset carregado."
            }

        variable = request.variable

        analysis_type = request.analysis_type

        if variable not in uploaded_df.columns:

            return {
                "error":
                    "Variável não encontrada."
            }

        series = uploaded_df[
            variable
        ]

        if analysis_type == "central_tendency":

            results = (
                calculate_central_tendency(
                    series
                )
            )

        elif analysis_type == "dispersion":

            results = (
                calculate_dispersion(
                    series
                )
            )

        elif analysis_type == "position":

            results = (
                calculate_position(
                    series
                )
            )

        else:

            return {
                "error":
                    "Tipo de análise inválido."
            }

        return {

            "variable":
                variable,

            "analysis_type":
                analysis_type,

            "results":
                results
        }

    except Exception as e:

        return {
            "error":
                str(e)
        }

# ==========================================
# RUN MODEL
# ==========================================

@app.post("/run-model")
async def run_model(
    request: ModelRequest
):

    try:

        global uploaded_df
        global last_predictions_df

        if uploaded_df is None:

            return {
                "error":
                    "Nenhum dataset carregado."
            }

        df = uploaded_df.copy()

        target_variable = request.target_variable

        features = request.features

        date_column = request.date_column

        model_df = df[
            [date_column] +
            [target_variable] +
            features
        ].dropna()

        X = model_df[
            features
        ]

        y = model_df[
            target_variable
        ]

        model = LinearRegression()

        model.fit(X, y)

        predictions = model.predict(X)

        export_df = pd.DataFrame({

            "Tempo":
                model_df[
                    date_column
                ].astype(str),

            "Valor_Real":
                y.astype(float),

            "Valor_Predito":
                predictions.astype(float)
        })

        last_predictions_df = export_df

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

        coefficients = {}

        for feature, coef in zip(
            features,
            model.coef_
        ):

            coefficients[
                feature
            ] = round(
                float(coef),
                2
            )

        return {

            "model_results": {

                "observations":
                    int(
                        len(model_df)
                    ),

                "r2":
                    round(
                        float(r2),
                        2
                    ),

                "mae":
                    round(
                        float(mae),
                        2
                    ),

                "rmse":
                    round(
                        float(rmse),
                        2
                    ),

                "intercept":
                    round(
                        float(
                            model.intercept_
                        ),
                        2
                    ),

                "coefficients":
                    coefficients,

                "time_values":
                    list(
                        model_df[
                            date_column
                        ].astype(str)
                    ),

                "actual_values":
                    [
                        round(
                            float(v),
                            2
                        )
                        for v in y
                    ],

                "predicted_values":
                    [
                        round(
                            float(v),
                            2
                        )
                        for v in predictions
                    ]
            }
        }

    except Exception as e:

        return {
            "error":
                str(e)
        }

# ==========================================
# DOWNLOAD
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
