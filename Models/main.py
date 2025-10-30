from flask import Flask, request, jsonify, render_template
from predict_pipeline import LogEnsemblePredictor

# Update with your file paths
CATEGORICAL_COLS_PKL = "categorical_cols.pkl"
XTRAIN_ENGINEERED_LOG_COLS_PKL = "X_train_engineered_log_cols.pkl"
ENSEMBLE_MODELS_PKL = "log_transformed_averaging_ensemble_models.pkl"

app = Flask(__name__)
predictor = LogEnsemblePredictor(
    categorical_cols_path=CATEGORICAL_COLS_PKL,
    xtrain_engineered_log_cols_path=XTRAIN_ENGINEERED_LOG_COLS_PKL,
    ensemble_models_path=ENSEMBLE_MODELS_PKL
)

@app.route("/")
def index():
    return render_template("in.html")

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.form.to_dict()
        row = {
            "Area": float(data["Area"]),
            "State_Name": data["State_Name"],
            "District_Name": data["District_Name"],
            "Season": data["Season"],
            "Crop": data["Crop"]
        }
        pred = predictor.predict_from_row(row)
        return render_template("in.html", prediction=pred)
    except Exception as e:
        return render_template("in.html", error=str(e))

@app.route("/api/predict", methods=["POST"])
def api_predict():
    try:
        data = request.get_json(force=True)
        row = {
            "Area": float(data["Area"]),
            "State_Name": data["State_Name"],
            "District_Name": data["District_Name"],
            "Season": data["Season"],
            "Crop": data["Crop"]
        }
        pred = predictor.predict_from_row(row)
        return jsonify({"prediction": pred})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=7860)
