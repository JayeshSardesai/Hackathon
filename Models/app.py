from flask import Flask, request, render_template, jsonify
import pickle
import pandas as pd

app = Flask(__name__)

# Load trained model
with open("new_voting_classifier.pkl", "rb") as f:
    model = pickle.load(f)

# Load training feature columns
with open("X_train_columns.pkl", "rb") as f:
    X_train_columns = pickle.load(f)


# 🔹 Cleaning function (same as training)
def clean_text(text):
    return text.strip().replace("\xa0", " ").lower()


@app.route("/", methods=["GET", "POST"])
def index():
    prediction = None
    top_crops = None

    if request.method == "POST":
        # Support both JSON (from Node backend) and HTML form posts
        if request.is_json:
            payload = request.get_json(silent=True) or {}
            try:
                data_sample = {
                    "SOIL_PH": [float(payload["SOIL_PH"])],
                    "TEMP": [float(payload["TEMP"])],
                    "RELATIVE_HUMIDITY": [float(payload["RELATIVE_HUMIDITY"])],
                    "N": [float(payload["N"])],
                    "P": [float(payload["P"])],
                    "K": [float(payload["K"])],
                    "SOIL": [payload["SOIL"]],
                    "SEASON": [payload["SEASON"]]
                }
            except KeyError as e:
                return jsonify({"error": f"Missing key: {str(e)}"}), 400
        else:
            # Collect input data from form
            data_sample = {
                "SOIL_PH": [float(request.form["SOIL_PH"])],
                "TEMP": [float(request.form["TEMP"])],
                "RELATIVE_HUMIDITY": [float(request.form["RELATIVE_HUMIDITY"])],
                "N": [float(request.form["N"])],
                "P": [float(request.form["P"])],
                "K": [float(request.form["K"])],
                "SOIL": [request.form["SOIL"]],
                "SEASON": [request.form["SEASON"]]
            }

        sample_df = pd.DataFrame(data_sample)

        # Preprocess same as training
        categorical_cols_sample = sample_df.select_dtypes(include=['object']).columns
        sample_df = pd.get_dummies(sample_df, columns=categorical_cols_sample, drop_first=True)
        sample_df = sample_df.reindex(columns=X_train_columns, fill_value=0)

        # Predict probabilities
        probabilities = model.predict_proba(sample_df)[0]
        class_labels = model.classes_

        # Create probability series
        probability_series = pd.Series(probabilities, index=class_labels)

        # Sort and get top 5 crops
        top_crops = probability_series.sort_values(ascending=False).head(5).round(3).to_dict()

        # Best prediction (top-1)
        prediction = max(top_crops, key=top_crops.get)

        # If JSON request, return JSON response
        if request.is_json:
            return jsonify({
                "prediction": prediction,
                "top_crops": top_crops
            })

    return render_template("index.html", prediction=prediction, top_crops=top_crops)

if __name__ == "__main__":
    app.run(debug=True, port=5001)
