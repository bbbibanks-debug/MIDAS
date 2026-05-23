from fastapi import FastAPI, UploadFile, File
import pandas as pd
import os

app = FastAPI()

UPLOAD_FOLDER = "uploads"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.get("/")
def home():
    return {"message": "MIDAS ONLINE"}

@app.post("/upload")
async def upload_excel(file: UploadFile = File(...)):

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)

    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    df = pd.read_excel(file_path)

    preview = df.head(10).to_dict(orient="records")

    return {
        "filename": file.filename,
        "columns": list(df.columns),
        "rows_preview": preview,
        "total_rows": len(df)
    }
