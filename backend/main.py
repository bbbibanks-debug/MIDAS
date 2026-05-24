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

from analytics.shape import (
    calculate_shape
)

from analytics.moving_averages import (
    calculate_temporal_analytics
)

from analytics.insights import (
    generate_insights
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
# GLOBALS
# ==========================================

uploaded_df = None

last_predictions_df = None

analytics_history = []

# ==========================================
# PATHS
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
# STATIC
# ==========================================

app.mount(
    "/static",
    StaticFiles(directory=STATIC_DIR),
    name="static"
)

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
# HELPERS
# ==========================================

def safe_float(value):

    try:

        return round(
            float(value),
            4
        )

    except:

        return None

# ==========================================
# SERIALIZE
# ==========================================

def serialize_results(results):

    serialized = {}

    for key, value in results.items():

        if isinstance(
            value,
            (
                np.integer,
                np.floating
            )
        ):

            serialized[key] = (
                float(value)
            )

        elif isinstance(
            value,
            np.ndarray
        ):

            serialized[key] = (
                value.tolist()
            )

        else:

            serialized[key] = value

    return serialized

# ==========================================
# SAVE HISTORY
# ==========================================

def save_analysis_history(

    variable,
    analysis_type,
    results,
    insights

):

    global analytics_history

    analytics_history.insert(
        0,
        {

            "variable":
                variable,

            "analysis_type":
                analysis_type,

            "results":
                serialize_results(
                    results
                ),

            "insights":
                insights,

            "timestamp":
                pd.Timestamp.now()
                .strftime(
                    "%d/%m/%Y %H:%M:%S"
                )
        }
    )

    analytics_history = (
        analytics_history[:20]
    )

# ==========================================
# DETECT TYPE
# ==========================================

def detect_column_type(series):

    clean = series.dropna()

    if len(clean) == 0:

        return "unknown"

    if pd.api.types.is_numeric_dtype(clean):

        return "numeric"

    sample = (
        clean
        .astype(str)
        .head(20)
    )

    patterns = [

        r"^\d{4}$",
        r"^\d{4}-\d{2}$",
        r"^\d{4}/\d{2}$",
        r"^\d{4}Q[1-4]$"
    ]

    matches = 0

    for value in sample:

        for pattern in patterns:

            if re.match(pattern, value):

                matches += 1

                break

    ratio = matches / len(sample)

    if ratio > 0.5:

        return "datetime"

    return "categorical"

# ==========================================
# HISTORY
# ==========================================

@app.get("/analytics-history")
async def analytics_history_route():

    return {

        "history":
            analytics_history
    }

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

        # ==========================================
        # FALLBACK INDEX
        # ==========================================

        df["__index__"] = (
            np.arange(len(df))
        )

        uploaded_df = df.copy()

        numeric_columns = []

        temporal_columns = []

        columns_analysis = []

        for col in df.columns:

            if col == "__index__":

                continue

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

                temporal_columns.append(
                    str(col)
                )

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

        if len(temporal_columns) == 0:

            temporal_columns.append(
                "__index__"
            )

        target_variable = None

        if len(numeric_columns) > 0:

            target_variable = (
                numeric_columns[0]
            )

        features = []

        for col in numeric_columns:

            if col != target_variable:

                features.append(col)

        return {

            "dataset_info": {

                "rows":
                    int(len(df)),

                "columns":
                    int(len(df.columns) - 1)
            },

            "numeric_columns":
                numeric_columns,

            "possible_time_columns":
                temporal_columns,

            "columns_analysis":
                columns_analysis,

            "suggestions": {

                "date_column":
                    temporal_columns[0],

                "target_variable":
                    target_variable,

                "features":
                    features
            }
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

        # ==========================================
        # ANALYSIS
        # ==========================================

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

        elif analysis_type == "shape":

            results = (
                calculate_shape(
                    series
                )
            )

        elif analysis_type == "temporal":

            results = (
                calculate_temporal_analytics(
                    series
                )
            )

        else:

            return {
                "error":
                    "Tipo de análise inválido."
            }

        results = serialize_results(
            results
        )

        insights = (
            generate_insights(
                results
            )
        )

        save_analysis_history(

            variable,
            analysis_type,
            results,
            insights
        )

        return {

            "variable":
                variable,

            "analysis_type":
                analysis_type,

            "results":
                results,

            "insights":
                insights
        }

    except Exception as e:

        return {

            "error":
                str(e)
        }

# ==========================================
# MODEL
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

        target = request.target_variable

        features = request.features

        date_column = request.date_column

        # ==========================================
        # FALLBACK
        # ==========================================

        if (
            date_column
            not in uploaded_df.columns
        ):

            date_column = "__index__"

        if target not in uploaded_df.columns:

            return {

                "error":
                    "Variável alvo inválida."
            }

        valid_features = []

        for feature in features:

            if (
                feature in uploaded_df.columns
                and feature != target
            ):

                valid_features.append(
                    feature
                )

        if len(valid_features) == 0:

            return {

                "error":
                    "Nenhuma variável explicativa válida."
            }

        model_df = uploaded_df[

            [date_column]
            +
            [target]
            +
            valid_features

        ].dropna()

        if len(model_df) < 3:

            return {

                "error":
                    "Poucos dados para regressão."
            }

        X = model_df[
            valid_features
        ]

        y = model_df[
            target
        ]

        model = LinearRegression()

        model.fit(X, y)

        predictions = (
            model.predict(X)
        )

        # ==========================================
        # EXPORT
        # ==========================================

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

        coefficients = {}

        for feature, coef in zip(
            valid_features,
            model.coef_
        ):

            coefficients[
                feature
            ] = safe_float(coef)

        return {

            "model_results": {

                "observations":
                    int(
                        len(model_df)
                    ),

                "r2":
                    safe_float(r2),

                "mae":
                    safe_float(mae),

                "rmse":
                    safe_float(rmse),

                "intercept":
                    safe_float(
                        model.intercept_
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
                        safe_float(v)
                        for v in y
                    ],

                "predicted_values":
                    [
                        safe_float(v)
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

        filename=
            "midas_predictions.xlsx"
    )
