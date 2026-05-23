import numpy as np
import pandas as pd

from scipy.stats import median_abs_deviation

# ==========================================
# DISPERSION
# ==========================================

def calculate_dispersion(series):

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

    variance = clean_series.var()

    std_dev = clean_series.std()

    minimum = clean_series.min()

    maximum = clean_series.max()

    data_range = maximum - minimum

    # ==========================================
    # IQR
    # ==========================================

    q1 = clean_series.quantile(0.25)

    q3 = clean_series.quantile(0.75)

    iqr = q3 - q1

    # ==========================================
    # MAD
    # ==========================================

    mad = median_abs_deviation(
        clean_series
    )

    # ==========================================
    # CV
    # ==========================================

    coefficient_variation = None

    if clean_series.mean() != 0:

        coefficient_variation = (
            std_dev /
            clean_series.mean()
        ) * 100

    # ==========================================
    # RETURN
    # ==========================================

    return {

        "variance":
            round(
                float(variance),
                4
            ),

        "std_dev":
            round(
                float(std_dev),
                4
            ),

        "minimum":
            round(
                float(minimum),
                4
            ),

        "maximum":
            round(
                float(maximum),
                4
            ),

        "range":
            round(
                float(data_range),
                4
            ),

        "iqr":
            round(
                float(iqr),
                4
            ),

        "mad":
            round(
                float(mad),
                4
            ),

        "coefficient_variation":
            round(
                float(
                    coefficient_variation
                ),
                4
            )
            if coefficient_variation is not None
            else None
    }
