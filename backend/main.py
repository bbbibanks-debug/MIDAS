# ==========================================
# VARIABLE ANALYSIS
# ==========================================

@app.post("/variable-analysis")
async def variable_analysis(
    request: VariableAnalysisRequest
):

    try:

        global uploaded_df

        # ==========================================
        # VALIDATION
        # ==========================================

        if uploaded_df is None:

            return {
                "error":
                    "Nenhum dataset carregado."
            }

        # ==========================================
        # VARIABLES
        # ==========================================

        variable = request.variable

        analysis_type = request.analysis_type

        # ==========================================
        # VARIABLE EXISTS
        # ==========================================

        if variable not in uploaded_df.columns:

            return {
                "error":
                    "Variável não encontrada."
            }

        # ==========================================
        # SERIES
        # ==========================================

        series = uploaded_df[variable]

        # ==========================================
        # CENTRAL TENDENCY
        # ==========================================

        if analysis_type == "central_tendency":

            results = (
                calculate_central_tendency(
                    series
                )
            )

        # ==========================================
        # DISPERSION
        # ==========================================

        elif analysis_type == "dispersion":

            results = (
                calculate_dispersion(
                    series
                )
            )

        # ==========================================
        # POSITION
        # ==========================================

        elif analysis_type == "position":

            results = (
                calculate_position(
                    series
                )
            )

        # ==========================================
        # INVALID
        # ==========================================

        else:

            return {
                "error":
                    "Tipo de análise inválido."
            }

        # ==========================================
        # RESPONSE
        # ==========================================

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
