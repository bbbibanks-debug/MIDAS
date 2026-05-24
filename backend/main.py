# ==========================================
# ANALYTICS HISTORY
# ==========================================

analytics_history = []

# ==========================================
# SAVE ANALYSIS
# ==========================================

def save_analysis_history(

    variable,
    analysis_type,
    results,
    insights

):

    global analytics_history

    entry = {

        "variable":
            variable,

        "analysis_type":
            analysis_type,

        "results":
            results,

        "insights":
            insights,

        "timestamp":
            pd.Timestamp.now()
            .strftime(
                "%d/%m/%Y %H:%M:%S"
            )
    }

    analytics_history.insert(
        0,
        entry
    )

    # ==========================================
    # LIMIT HISTORY
    # ==========================================

    analytics_history = (
        analytics_history[:20]
    )

# ==========================================
# GET HISTORY
# ==========================================

@app.get("/analytics-history")
async def get_analytics_history():

    global analytics_history

    return {

        "history":
            analytics_history
    }
