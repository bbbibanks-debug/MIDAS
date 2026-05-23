import numpy as np
import pandas as pd

from scipy import stats

# ==========================================
# CENTRAL TENDENCY
# ==========================================

def calculate_central_tendency(series):

    clean_series = (
        pd.to_numeric(
            series,
            errors="coerce"
        )
        .dropna()
    )

    if len(clean_series) == 0:

        return {
            "error":
                "Série sem valores numéricos."
        }

    # ==========================================
    # BASIC
    # ==========================================

    mean_value = clean_series.mean()

    median_value = clean_series.median()

    mode_series = clean_series.mode()

    mode_value = (
        mode_series.iloc[0]
        if len(mode_series) > 0
        else None
    )

    # ==========================================
    # GEOMETRIC MEAN
    # ==========================================

    positive_values = clean_series[
        clean_series > 0
    ]

    geometric_mean = None

    if len(positive_values) > 0:

        geometric_mean = stats.gmean(
            positive_values
        )

    # ==========================================
    # HARMONIC MEAN
    # ==========================================

    harmonic_mean = None

    if len(positive_values) > 0:

        harmonic_mean = stats.hmean(
            positive_values
        )

    # ==========================================
    # TRIMMED MEAN
    # ==========================================

    trimmed_mean = stats.trim_mean(
        clean_series,
        0.1
    )

    # ==========================================
    # MIDRANGE
    # ==========================================

    midrange = (
        clean_series.min() +
        clean_series.max()
    ) / 2

    # ==========================================
    # RETURN
    # ==========================================

    return {

        "mean":
            round(
                float(mean_value),
                4
            ),

        "median":
            round(
                float(median_value),
                4
            ),

        "mode":
            round(
                float(mode_value),
                4
            )
            if mode_value is not None
            else None,

        "geometric_mean":
            round(
                float(geometric_mean),
                4
            )
            if geometric_mean is not None
            else None,

        "harmonic_mean":
            round(
                float(harmonic_mean),
                4
            )
            if harmonic_mean is not None
            else None,

        "trimmed_mean":
            round(
                float(trimmed_mean),
                4
            ),

        "midrange":
            round(
                float(midrange),
                4
            )
    }
