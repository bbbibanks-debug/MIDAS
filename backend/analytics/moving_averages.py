import numpy as np
import pandas as pd

# ==========================================
# SIMPLE MOVING AVERAGE
# ==========================================

def calculate_sma(series, window=5):

    return (
        series
        .rolling(window=window)
        .mean()
    )

# ==========================================
# EXPONENTIAL MOVING AVERAGE
# ==========================================

def calculate_ema(series, span=5):

    return (
        series
        .ewm(span=span, adjust=False)
        .mean()
    )

# ==========================================
# WEIGHTED MOVING AVERAGE
# ==========================================

def calculate_wma(series, window=5):

    weights = np.arange(1, window + 1)

    return (
        series
        .rolling(window)
        .apply(
            lambda prices:
            np.dot(prices, weights)
            / weights.sum(),
            raw=True
        )
    )

# ==========================================
# ROLLING VOLATILITY
# ==========================================

def calculate_rolling_volatility(
    series,
    window=5
):

    return (
        series
        .rolling(window=window)
        .std()
    )

# ==========================================
# ROLLING VARIANCE
# ==========================================

def calculate_rolling_variance(
    series,
    window=5
):

    return (
        series
        .rolling(window=window)
        .var()
    )

# ==========================================
# PERCENT CHANGE
# ==========================================

def calculate_pct_change(series):

    return (
        series
        .pct_change() * 100
    )

# ==========================================
# CUMULATIVE GROWTH
# ==========================================

def calculate_cumulative_growth(series):

    first_value = series.iloc[0]

    if first_value == 0:

        return pd.Series(
            [0] * len(series)
        )

    return (
        (
            series / first_value
        ) - 1
    ) * 100

# ==========================================
# TEMPORAL ANALYTICS
# ==========================================

def calculate_temporal_analytics(series):

    s = (
        pd.to_numeric(
            series,
            errors="coerce"
        )
        .dropna()
    )

    if len(s) < 5:

        return {
            "error":
                "Série insuficiente para análise temporal."
        }

    sma_5 = calculate_sma(
        s,
        5
    )

    sma_10 = calculate_sma(
        s,
        10
    )

    ema_5 = calculate_ema(
        s,
        5
    )

    ema_10 = calculate_ema(
        s,
        10
    )

    wma_5 = calculate_wma(
        s,
        5
    )

    volatility = (
        calculate_rolling_volatility(
            s,
            5
        )
    )

    variance = (
        calculate_rolling_variance(
            s,
            5
        )
    )

    pct_change = (
        calculate_pct_change(s)
    )

    cumulative_growth = (
        calculate_cumulative_growth(s)
    )

    return {

        "sma_5_last":
            round(
                float(
                    sma_5.iloc[-1]
                ),
                4
            ),

        "sma_10_last":
            round(
                float(
                    sma_10.iloc[-1]
                ),
                4
            ),

        "ema_5_last":
            round(
                float(
                    ema_5.iloc[-1]
                ),
                4
            ),

        "ema_10_last":
            round(
                float(
                    ema_10.iloc[-1]
                ),
                4
            ),

        "wma_5_last":
            round(
                float(
                    wma_5.iloc[-1]
                ),
                4
            ),

        "rolling_volatility":
            round(
                float(
                    volatility.iloc[-1]
                ),
                4
            ),

        "rolling_variance":
            round(
                float(
                    variance.iloc[-1]
                ),
                4
            ),

        "last_pct_change":
            round(
                float(
                    pct_change.iloc[-1]
                ),
                4
            ),

        "cumulative_growth":
            round(
                float(
                    cumulative_growth.iloc[-1]
                ),
                4
            ),

        "series_length":
            int(len(s))
    }
