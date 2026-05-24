# ==========================================
# MIDAS AI ANALYTICS ENGINE
# ==========================================

def classify_volatility(value):

    if value < 1:

        return (
            "Baixa volatilidade temporal."
        )

    elif value < 5:

        return (
            "Volatilidade moderada."
        )

    return (
        "Alta volatilidade temporal."
    )

# ==========================================
# SKEWNESS
# ==========================================

def classify_skewness(value):

    if value < -1:

        return (
            "Distribuição fortemente assimétrica à esquerda."
        )

    elif value < -0.3:

        return (
            "Assimetria moderada à esquerda."
        )

    elif value <= 0.3:

        return (
            "Distribuição aproximadamente simétrica."
        )

    elif value <= 1:

        return (
            "Assimetria moderada à direita."
        )

    return (
        "Distribuição fortemente assimétrica à direita."
    )

# ==========================================
# KURTOSIS
# ==========================================

def classify_kurtosis(value):

    if value < 2:

        return (
            "Distribuição platicúrtica."
        )

    elif value <= 3.5:

        return (
            "Distribuição mesocúrtica."
        )

    return (
        "Distribuição leptocúrtica."
    )

# ==========================================
# GINI
# ==========================================

def classify_gini(value):

    if value < 0.2:

        return (
            "Baixa concentração."
        )

    elif value < 0.5:

        return (
            "Concentração moderada."
        )

    return (
        "Alta concentração distributiva."
    )

# ==========================================
# ENTROPY
# ==========================================

def classify_entropy(value):

    if value < 1:

        return (
            "Baixa diversidade distributiva."
        )

    elif value < 2:

        return (
            "Diversidade moderada."
        )

    return (
        "Alta diversidade distributiva."
    )

# ==========================================
# GROWTH
# ==========================================

def classify_growth(value):

    if value < -10:

        return (
            "Contração acumulada elevada."
        )

    elif value < 0:

        return (
            "Contração moderada."
        )

    elif value < 10:

        return (
            "Crescimento estável."
        )

    return (
        "Crescimento acumulado elevado."
    )

# ==========================================
# GENERATE INSIGHTS
# ==========================================

def generate_insights(results):

    insights = []

    # ==========================================
    # VOLATILITY
    # ==========================================

    if "rolling_volatility" in results:

        insights.append({

            "title":
                "Volatilidade",

            "message":
                classify_volatility(
                    results[
                        "rolling_volatility"
                    ]
                ),

            "severity":
                "info"
        })

    # ==========================================
    # SKEWNESS
    # ==========================================

    if "fisher_skewness" in results:

        insights.append({

            "title":
                "Assimetria",

            "message":
                classify_skewness(
                    results[
                        "fisher_skewness"
                    ]
                ),

            "severity":
                "warning"
        })

    # ==========================================
    # KURTOSIS
    # ==========================================

    if "fisher_kurtosis" in results:

        insights.append({

            "title":
                "Curtose",

            "message":
                classify_kurtosis(
                    results[
                        "fisher_kurtosis"
                    ]
                ),

            "severity":
                "info"
        })

    # ==========================================
    # GINI
    # ==========================================

    if "gini_coefficient" in results:

        insights.append({

            "title":
                "Concentração",

            "message":
                classify_gini(
                    results[
                        "gini_coefficient"
                    ]
                ),

            "severity":
                "warning"
        })

    # ==========================================
    # ENTROPY
    # ==========================================

    if "shannon_entropy" in results:

        insights.append({

            "title":
                "Entropia",

            "message":
                classify_entropy(
                    results[
                        "shannon_entropy"
                    ]
                ),

            "severity":
                "info"
        })

    # ==========================================
    # GROWTH
    # ==========================================

    if "cumulative_growth" in results:

        insights.append({

            "title":
                "Crescimento",

            "message":
                classify_growth(
                    results[
                        "cumulative_growth"
                    ]
                ),

            "severity":
                "success"
        })

    return insights
