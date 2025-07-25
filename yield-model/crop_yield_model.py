import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
import matplotlib.pyplot as plt
import seaborn as sns
import joblib

# Load the dataset
data = pd.read_csv('crop_yield_data.csv')

# Data Exploration
print("Dataset shape:", data.shape)
print("\nFirst few rows:")
print(data.head())
print("\nData types and missing values:")
print(data.info())
print("\nDescriptive statistics:")
print(data.describe())

# Feature Engineering
# Let's create some additional features that might be useful
data['temp_range'] = data['temp_max'] - data['temp_min']
data['humidity_range'] = data['humidity_max'] - data['humidity_min']
data['season'] = data['month'].apply(lambda x: 'Winter' if x in [12,1,2] else 
                                     'Spring' if x in [3,4,5] else
                                     'Summer' if x in [6,7,8] else 'Autumn')

# Define features and target
features = ['ndvi', 'temp_min', 'temp_max', 'temp_range', 
            'humidity_min', 'humidity_max', 'humidity_range',
            'rainfall_mm', 'soil_moisture', 'crop_type', 
            'cloud_condition', 'season']
target = 'crop_yield'

X = data[features]
y = data[target]

# Split data into train and test sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Preprocessing pipeline
numeric_features = ['ndvi', 'temp_min', 'temp_max', 'temp_range', 
                   'humidity_min', 'humidity_max', 'humidity_range',
                   'rainfall_mm', 'soil_moisture']
categorical_features = ['crop_type', 'cloud_condition', 'season']

numeric_transformer = Pipeline(steps=[
    ('scaler', StandardScaler())])

categorical_transformer = Pipeline(steps=[
    ('onehot', OneHotEncoder(handle_unknown='ignore'))])

preprocessor = ColumnTransformer(
    transformers=[
        ('num', numeric_transformer, numeric_features),
        ('cat', categorical_transformer, categorical_features)])

# Model pipeline
model = Pipeline(steps=[
    ('preprocessor', preprocessor),
    ('regressor', RandomForestRegressor(n_estimators=100, random_state=42))])

# Train the model
model.fit(X_train, y_train)

# Evaluate the model
y_pred = model.predict(X_test)

mse = mean_squared_error(y_test, y_pred)
rmse = np.sqrt(mse)
r2 = r2_score(y_test, y_pred)

print("\nModel Performance:")
print(f"Root Mean Squared Error: {rmse:.4f}")
print(f"R-squared: {r2:.4f}")

# Feature Importance
# Get feature names after one-hot encoding
feature_names = numeric_features.copy()
ohe_categories = model.named_steps['preprocessor'].named_transformers_['cat'].named_steps['onehot'].categories_
for i, col in enumerate(categorical_features):
    for cat in ohe_categories[i]:
        feature_names.append(f"{col}_{cat}")

# Get feature importances
rf = model.named_steps['regressor']
importances = rf.feature_importances_
indices = np.argsort(importances)[::-1]

print("\nFeature Importances:")
for f in range(len(feature_names)):
    print(f"{feature_names[indices[f]]}: {importances[indices[f]]:.4f}")

# Visualization of feature importances
plt.figure(figsize=(12, 8))
plt.title("Feature Importances")
plt.bar(range(len(feature_names)), importances[indices], align="center")
plt.xticks(range(len(feature_names)), [feature_names[i] for i in indices], rotation=90)
plt.tight_layout()
plt.show()

# Actual vs Predicted plot
plt.figure(figsize=(8, 6))
plt.scatter(y_test, y_pred, alpha=0.5)
plt.plot([y.min(), y.max()], [y.min(), y.max()], 'k--', lw=2)
plt.xlabel('Actual')
plt.ylabel('Predicted')
plt.title('Actual vs Predicted Crop Yield')
plt.show()

# Save the model
joblib.dump(model, 'crop_yield_predictor.pkl')

# Example prediction function
def predict_yield(ndvi, temp_min, temp_max, humidity_min, humidity_max, 
                  rainfall, soil_moisture, cloud_condition, crop_type, month):
    """
    Predict crop yield based on input parameters.
    
    Parameters:
    - ndvi: Normalized Difference Vegetation Index (-1 to 1)
    - temp_min: Minimum temperature (°C)
    - temp_max: Maximum temperature (°C)
    - humidity_min: Minimum humidity (%)
    - humidity_max: Maximum humidity (%)
    - rainfall: Rainfall in mm
    - soil_moisture: Soil moisture content
    - cloud_condition: 'Clear', 'Cloudy', 'Partly Cloudy', 'Overcast'
    - crop_type: Type of crop (e.g., 'Maize', 'Wheat', 'Rice')
    - month: Month number (1-12)
    
    Returns:
    - Predicted crop yield
    """
    # Calculate derived features
    temp_range = temp_max - temp_min
    humidity_range = humidity_max - humidity_min
    season = 'Winter' if month in [12,1,2] else 'Spring' if month in [3,4,5] else 'Summer' if month in [6,7,8] else 'Autumn'
    
    # Create input dataframe
    input_data = pd.DataFrame({
        'ndvi': [ndvi],
        'temp_min': [temp_min],
        'temp_max': [temp_max],
        'temp_range': [temp_range],
        'humidity_min': [humidity_min],
        'humidity_max': [humidity_max],
        'humidity_range': [humidity_range],
        'rainfall_mm': [rainfall],
        'soil_moisture': [soil_moisture],
        'crop_type': [crop_type],
        'cloud_condition': [cloud_condition],
        'season': [season]
    })
    
    # Make prediction
    prediction = model.predict(input_data)
    return prediction[0]

# Example usage
example_prediction = predict_yield(
    ndvi=0.5,
    temp_min=20,
    temp_max=30,
    humidity_min=40,
    humidity_max=70,
    rainfall=200,
    soil_moisture=0.3,
    cloud_condition='Partly Cloudy',
    crop_type='Maize',
    month=6
)

print(f"\nExample Prediction: {example_prediction:.4f}")