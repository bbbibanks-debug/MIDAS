import numpy as np
import pandas as pd

from scipy.stats import (
    skew,
    kurtosis,
    entropy,
    mode
)

# ==========================================
# GINI
# ==========================================

def calculate_gini(values):

    values = np.sort(values)

    n = len(values)

    cumulative = np.cumsum(values)

    if cumulative[-1] == 0:

        return 0

    gini = (
        n + 1
        - 2 * np.sum(cumulative) / cumulative[-1]
    ) / n

    return gini

# ==========================================
# HHI
# ==========================================

def calculate_hhi(values):

    counts = pd.Series(values).value_counts()

    proportions = counts / counts.sum()

    return np.sum(
        proportions ** 2
    )

# ==========================================
# SIMPSON
# ==========================================

def calculate_simpson(values):

    counts = pd.Series(values).value_counts()

    proportions = counts / counts.sum()

    return np.sum(
        proportions ** 2
    )

# ==========================================
# BOWLEY SKEWNESS
# ==========================================

def bowley_skewness(q1, q2, q3):

    denominator = q3 - q1

    if denominator == 0:

        return 0

    return (
        (q3 + q1 - 2*q2)
        /
        denominator
    )

# ==========================================
# KELLY SKEWNESS
# ==========================================

def kelly_skewness(p10, p50, p90):

    denominator = p90 - p10

    if denominator == 0:

        return 0

    return (
        (p90 + p10 - 2*p50)
        /
        denominator
    )

# ==========================================
# PERCENTILE KURTOSIS
# ==========================================

def percentile_kurtosis(
    p10,
    p25,
    p75,
    p90
):

    denominator = p75 - p25

    if denominator == 0:

        return 0

    return (
        (p90 - p10)
        /
        denominator
    )

# ==========================================
# SHAPE ANALYTICS
# ==========================================

def calculate_shape(series):

    s = (
        pd.to_numeric(
            series,
            errors="coerce"
        )
        .dropna()
    )

    if len(s) == 0:

        return {
            "error":
                "Série vazia."
        }

    values = s.values

    # ==========================================
    # BASIC
    # ==========================================

    mean = np.mean(values)

    median = np.median(values)

    try:

        mode_value = mode(
            values,
            keepdims=True
        ).mode[0]

    except:

        mode_value = np.nan

    std = np.std(values)

    # ==========================================
    # QUANTILES
    # ==========================================

    q1 = np.percentile(values, 25)

    q2 = np.percentile(values, 50)

    q3 = np.percentile(values, 75)

    p10 = np.percentile(values, 10)

    p50 = np.percentile(values, 50)

    p90 = np.percentile(values, 90)

    # ==========================================
    # SKEWNESS
    # ==========================================

    pearson_1 = 0

    if std != 0:

        pearson_1 = (
            mean - mode_value
        ) / std

    pearson_2 = 0

    if std != 0:

        pearson_2 = (
            3 * (mean - median)
        ) / std

    fisher_skewness = skew(values)

    bowley = bowley_skewness(
        q1,
        q2,
        q3
    )

    kelly = kelly_skewness(
        p10,
        p50,
        p90
    )

    # ==========================================
    # KURTOSIS
    # ==========================================

    fisher_kurtosis = kurtosis(
        values,
        fisher=False
    )

    excess_kurtosis = kurtosis(
        values,
        fisher=True
    )

    percentile_k = percentile_kurtosis(
        p10,
        q1,
        q3,
        p90
    )

    # ==========================================
    # CONCENTRATION
    # ==========================================

    positive_values = values

    positive_values = positive_values[
        positive_values > 0
    ]

    if len(positive_values) == 0:

        shannon = 0

    else:

        proportions = (
            positive_values
            /
            np.sum(positive_values)
        )

        shannon = entropy(
            proportions
        )

    gini = calculate_gini(
        np.abs(values)
    )

    simpson = calculate_simpson(
        values
    )

    hhi = calculate_hhi(
        values
    )

    # ==========================================
    # RESULTS
    # ==========================================

    return {

        "pearson_skewness_1":
            round(
                float(pearson_1),
                4
            ),

        "pearson_skewness_2":
            round(
                float(pearson_2),
                4
            ),

        "fisher_skewness":
            round(
                float(fisher_skewness),
                4
            ),

        "bowley_skewness":
            round(
                float(bowley),
                4
            ),

        "kelly_skewness":
            round(
                float(kelly),
                4
            ),

        "fisher_kurtosis":
            round(
                float(fisher_kurtosis),
                4
            ),

        "excess_kurtosis":
            round(
                float(excess_kurtosis),
                4
            ),

        "percentile_kurtosis":
            round(
                float(percentile_k),
                4
            ),

        "gini_coefficient":
            round(
                float(gini),
                4
            ),

        "shannon_entropy":
            round(
                float(shannon),
                4
            ),

        "simpson_index":
            round(
                float(simpson),
                4
            ),

        "hhi_index":
            round(
                float(hhi),
                4
            )
    }
