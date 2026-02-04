from flask import Flask, request, jsonify
from flask_cors import CORS
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.efficientnet import preprocess_input
import tensorflow as tf
import numpy as np
import io
import os
from PIL import Image

# ----------------------------------------------------
# 1️⃣ Flask App Setup
# ----------------------------------------------------
app = Flask(__name__)
CORS(app)

# ----------------------------------------------------
# 2️⃣ Load Trained Model
# ----------------------------------------------------
MODEL_PATH = "efficientnetb0_phase2_final.keras"
MODEL = tf.keras.models.load_model(MODEL_PATH)
print("✅ EfficientNetB0 model loaded successfully.")

# ----------------------------------------------------
# 3️⃣ Class Definitions
# ----------------------------------------------------
CLASSES = [
    'A_caps','B_caps','C_caps','D_caps','E_caps','F_caps','G_caps','H_caps','I_caps','J_caps','K_caps','L_caps','M_caps','N_caps','O_caps','P_caps','Q_caps','R_caps','S_caps','T_caps','U_caps','V_caps','W_caps','X_caps','Y_caps','Z_caps',
    'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'
]

def label_to_char(lbl):
    """Convert 'A_caps' → 'A', lowercase stays same"""
    return lbl[0].upper() if lbl.endswith("_caps") else lbl

def topk(probs, k=3):
    """Return top-k predictions with labels + probabilities"""
    idxs = probs.argsort()[::-1][:k]
    out = []
    for i in idxs:
        raw = CLASSES[i]
        out.append({
            "label": label_to_char(raw),
            "prob": float(probs[i])
        })
    return out

# ----------------------------------------------------
# 4️⃣ Helper Function – Preprocess + Predict
# ----------------------------------------------------
def preprocess_image(pil_img):
    pil_img = pil_img.convert("RGB").resize((224, 224))
    arr = np.asarray(pil_img).astype("float32")
    arr = np.expand_dims(arr, 0)
    arr = preprocess_input(arr)
    return arr

def predict_image(img: Image.Image):
    """Predict top1 + top3"""
    x = preprocess_image(img)
    logits = MODEL.predict(x, verbose=0)[0]

    # If not softmaxed, normalize it
    probs = logits if np.isclose(np.sum(logits), 1.0, atol=1e-2) else tf.nn.softmax(logits).numpy()

    k3 = topk(probs, k=3)
    return k3[0], k3

# ----------------------------------------------------
# 5️⃣ API Endpoint
# ----------------------------------------------------
@app.route("/predict", methods=["POST"])
def predict():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    try:
        # Read file into memory
        img_bytes = file.read()
        img = Image.open(io.BytesIO(img_bytes))

        top1, top3 = predict_image(img)

        print(f"🧠 Predicted: {top1['label']} ({top1['prob']*100:.2f}%)")

        return jsonify({
            "top1": top1,
            "top3": top3
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ----------------------------------------------------
# 6️⃣ Run the Server
# ----------------------------------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
