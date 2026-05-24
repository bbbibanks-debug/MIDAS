from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import pandas as pd
import numpy as np

from sklearn.linear_model import LinearRegression
from sklearn.metrics import (
    mean_squared_error,
    mean_absolute_error,
    r2_score
)

import uvicorn

from datetime import datetime
from typing import List
from pathlib import Path

# ==========================================
# PATHS
# ==========================================

BASE_DIR = Path(__file__).resolve().parent

STATIC_DIR = BASE_DIR / "static"

# ==========================================
# APP
# ==========================================

app = FastAPI()

# ==========================================
# STATIC FILES
# ==========================================

app.mount(
    "/static",
    StaticFiles(directory=STATIC_DIR),
    name="static"
)

# ==========================================
# GLOBAL STORAGE
# ==========================================

DATAFRAME = None
LAST_PREDICTIONS = None
ANALYTICS_HISTORY = []

# ==========================================
# ROOT
# ==========================================

@app.get("/")
async def root():

    return FileResponse(
        STATIC_DIR / "index.html"
    )

# ==========================================
# ECONOMETRICS
# ==========================================

@app.get("/econometrics")
async def econometrics():

    return FileResponse(
        STATIC_DIR / "econometrics.html"
    )

# ==========================================
# STATISTICS
# ==========================================

@app.get("/statistics")
async def statistics():

    return FileResponse(
        STATIC_DIR / "statistics.html"
    )

# ==========================================
# REQUEST MODELS
# ==========================================

class ModelRequest(BaseModel):

    date_column: str
    target_variable: str
    features: List[str]
    forecast_horizon: int = 3

class AnalysisRequest(BaseModel):

    variable: str
    analysis_type: str

# ==========================================
# UPLOAD
# ==========================================

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...)
):

    global DATAFRAME

    try:

        filename = file.filename.lower()

        # ======================================
        # LOAD FILE
        # ======================================

        if filename.endswith(".csv"):

            df = pd.read_csv(file.file)

        else:

            df = pd.read_excel(file.file)

        DATAFRAME = df.copy()

        # ======================================
        # NUMERIC
        # ======================================

        numeric_columns = (
            df.select_dtypes(include=np.number)
            .columns
            .tolist()
        )

        # ======================================
        # TIME COLUMNS
        # ======================================

        possible_time_columns = []

        for col in df.columns:

            try:

                pd.to_datetime(df[col])

                possible_time_columns.append(col)

            except:

                pass

        # ======================================
        # COLUMN ANALYSIS
        # ======================================

        columns_analysis = []

        for col in df.columns:

            dtype = str(df[col].dtype)

            if "float" in dtype or "int" in dtype:

                detected = "numeric"

            elif "datetime" in dtype:

                detected = "temporal"

            else:

                detected = "categorical"

            columns_analysis.append({

                "name":
                    col,

                "detected_type":
                    detected,

                "missing_values":
                    int(df[col].isna().sum()),

                "unique_values":
                    int(df[col].nunique())
            })

        # ======================================
        # SUGGESTIONS
        # ======================================

        target = (
            numeric_columns[0]
            if numeric_columns
            else None
        )

        features = (
            numeric_columns[1:]
            if len(numeric_columns) > 1
            else []
        )

        date_column = (
            possible_time_columns[0]
            if possible_time_columns
            else None
        )

        # ======================================
        # RESPONSE
        # ======================================

        return {

            "dataset_info": {

                "rows":
                    int(df.shape[0]),

                "columns":
                    int(df.shape[1])
            },

            "numeric_columns":
                numeric_columns,

            "possible_time_columns":
                possible_time_columns,

            "columns_analysis":
                columns_analysis,

            "suggestions": {

                "date_column":
                    date_column,

                "target_variable":
                    target,

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
# RUN MODEL
# ==========================================

@app.post("/run-model")
async def run_model(
    request: ModelRequest
):

    global DATAFRAME
    global LAST_PREDICTIONS

    try:

        if DATAFRAME is None:

            return {

                "error":
                    "Nenhum dataset carregado."
            }

        df = DATAFRAME.copy()

        required_cols = (
            [request.target_variable]
            + request.features
        )

        df = df.dropna(
            subset=required_cols
        )

        X = df[request.features]
        y = df[request.target_variable]

        # ======================================
        # MODEL
        # ======================================

        model = LinearRegression()

        model.fit(X, y)

        predictions = model.predict(X)

        # ======================================
        # METRICS
        # ======================================

        r2 = r2_score(y, predictions)

        rmse = np.sqrt(
            mean_squared_error(
                y,
                predictions
            )
        )

        mae = mean_absolute_error(
            y,
            predictions
        )

        # ======================================
        # FORECAST
        # ======================================

        forecast_horizon = (
            request.forecast_horizon
        )

        last_row = (
            X.iloc[-1]
            .copy()
            .astype(float)
        )

        future_predictions = []

        for _ in range(
            forecast_horizon
        ):

            input_data = (
                last_row
                .values
                .reshape(1, -1)
            )

            pred = model.predict(
                input_data
            )[0]

            pred = float(pred)

            future_predictions.append(
                pred
            )

            # ==================================
            # RECURSIVE UPDATE
            # ==================================

            if len(last_row) > 0:

                last_row.iloc[0] = pred

        # ======================================
        # FUTURE DATES
        # ======================================

        future_dates = []

        if request.date_column:

            try:

                time_series = pd.to_datetime(
                    df[request.date_column]
                )

                last_date = (
                    time_series.iloc[-1]
                )

                for i in range(
                    1,
                    forecast_horizon + 1
                ):

                    next_date = (
                        last_date
                        + pd.DateOffset(
                            months=i
                        )
                    )

                    future_dates.append(
                        str(next_date.date())
                    )

            except:

                for i in range(
                    1,
                    forecast_horizon + 1
                ):

                    future_dates.append(
                        f"T+{i}"
                    )

        else:

            for i in range(
                1,
                forecast_horizon + 1
            ):

                future_dates.append(
                    f"T+{i}"
                )

        # ======================================
        # COEFFICIENTS
        # ======================================

        coefficients = {}

        for idx, feature in enumerate(
            request.features
        ):

            coefficients[feature] = float(
                model.coef_[idx]
            )

        # ======================================
        # SAVE
        # ======================================

        LAST_PREDICTIONS = pd.DataFrame({

            "actual":
                y,

            "predicted":
                predictions
        })

        # ======================================
        # RESPONSE
        # ======================================

        return {

            "model_results": {

                "r2":
                    float(r2),

                "rmse":
                    float(rmse),

                "mae":
                    float(mae),

                "observations":
                    int(len(df)),

                "coefficients":
                    coefficients,

                "actual_values":
                    y.tolist(),

                "predicted_values":
                    predictions.tolist(),

                "time_values":
                    (
                        df[
                            request.date_column
                        ]
                        .astype(str)
                        .tolist()
                    )
                    if request.date_column
                    else list(
                        range(len(df))
                    ),

                "future_predictions":
                    future_predictions,

                "future_dates":
                    future_dates,

                "forecast_horizon":
                    forecast_horizon
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
    request: AnalysisRequest
):

    global DATAFRAME
    global ANALYTICS_HISTORY

    try:

        if DATAFRAME is None:

            return {

                "error":
                    "Nenhum dataset carregado."
            }

        series = DATAFRAME[
            request.variable
        ].dropna()

        results = {}

        # ======================================
        # CENTRAL TENDENCY
        # ======================================

        if request.analysis_type == "central_tendency":

            results = {

                "mean":
                    float(series.mean()),

                "median":
                    float(series.median()),

                "mode":
                    float(series.mode().iloc[0])
            }

        # ======================================
        # DISPERSION
        # ======================================

        elif request.analysis_type == "dispersion":

            results = {

                "std":
                    float(series.std()),

                "variance":
                    float(series.var()),

                "range":
                    float(
                        series.max()
                        - series.min()
                    )
            }

        # ======================================
        # POSITION
        # ======================================

        elif request.analysis_type == "position":

            results = {

                "q1":
                    float(
                        series.quantile(0.25)
                    ),

                "q2":
                    float(
                        series.quantile(0.50)
                    ),

                "q3":
                    float(
                        series.quantile(0.75)
                    )
            }

        # ======================================
        # SHAPE
        # ======================================

        elif request.analysis_type == "shape":

            results = {

                "skewness":
                    float(series.skew()),

                "kurtosis":
                    float(series.kurtosis())
            }

        # ======================================
        # TEMPORAL
        # ======================================

        elif request.analysis_type == "temporal":

            results = {

                "autocorrelation":
                    float(series.autocorr()),

                "trend":
                    float(
                        np.polyfit(
                            range(len(series)),
                            series,
                            1
                        )[0]
                    )
            }

        # ======================================
        # INSIGHTS
        # ======================================

        insights = []

        for key, value in results.items():

            severity = "info"

            if abs(value) > 10:

                severity = "warning"

            insights.append({

                "title":
                    key.upper(),

                "message":
                    f"{key} calculado: {round(value, 4)}",

                "severity":
                    severity
            })

        # ======================================
        # HISTORY
        # ======================================

        ANALYTICS_HISTORY.append({

            "timestamp":
                datetime.now().strftime(
                    "%Y-%m-%d %H:%M:%S"
                ),

            "variable":
                request.variable,

            "analysis_type":
                request.analysis_type,

            "insights":
                insights
        })

        return {

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
# ANALYTICS HISTORY
# ==========================================

@app.get("/analytics-history")
async def analytics_history():

    return {

        "history":
            ANALYTICS_HISTORY[-20:]
    }

# ==========================================
# DOWNLOAD PREDICTIONS
# ==========================================

@app.get("/download-predictions")
async def download_predictions():

    global LAST_PREDICTIONS

    if LAST_PREDICTIONS is None:

        return {

            "error":
                "Nenhuma previsão disponível."
        }

    output_path = "predictions.xlsx"

    LAST_PREDICTIONS.to_excel(
        output_path,
        index=False
    )

    return FileResponse(

        output_path,

        filename="predictions.xlsx"
    )

# ==========================================
# MAIN
# ==========================================

if __name__ == "__main__":

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000
    )
