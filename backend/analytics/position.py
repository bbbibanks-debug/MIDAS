import pandas as pd

# ==========================================
# POSITION METRICS
# ==========================================

def calculate_position(series):

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
    # QUARTILES
    # ==========================================

    q1 = clean_series.quantile(0.25)

    q2 = clean_series.quantile(0.50)

    q3 = clean_series.quantile(0.75)

    # ==========================================
    # DECILES
    # ==========================================

    deciles = {}

    for i in range(1, 10):

        deciles[f"D{i}"] = round(
            float(
                clean_series.quantile(
                    i / 10
                )
            ),
            4
        )

    # ==========================================
    # PERCENTILES
    # ==========================================

    percentiles = {

        "P1":
            round(
                float(
                    clean_series.quantile(
                        0.01
                    )
                ),
                4
            ),

        "P5":
            round(
                float(
                    clean_series.quantile(
                        0.05
                    )
                ),
                4
            ),

        "P10":
            round(
                float(
                    clean_series.quantile(
                        0.10
                    )
                ),
                4
            ),

        "P90":
            round(
                float(
                    clean_series.quantile(
                        0.90
                    )
                ),
                4
            ),

        "P95":
            round(
                float(
                    clean_series.quantile(
                        0.95
                    )
                ),
                4
            ),

        "P99":
            round(
                float(
                    clean_series.quantile(
                        0.99
                    )
                ),
                4
            )
    }

    # ==========================================
    # RETURN
    # ==========================================

    return {

        "minimum":
            round(
                float(
                    clean_series.min()
                ),
                4
            ),

        "maximum":
            round(
                float(
                    clean_series.max()
                ),
                4
            ),

        "quartiles": {

            "Q1":
                round(
                    float(q1),
                    4
                ),

            "Q2":
                round(
                    float(q2),
                    4
                ),

            "Q3":
                round(
                    float(q3),
                    4
                )
        },

        "deciles":
            deciles,

        "percentiles":
            percentiles
    }
