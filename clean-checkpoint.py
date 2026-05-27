import pandas as pd
from sklearn.preprocessing import MinMaxScaler
df = pd.read_csv("final_joined_dataset.csv")
print(df.info())

numerical_cols = df.select_dtypes(include=['float64']).columns

print("Numerical columns to normalize:")
print(numerical_cols)
scaler = MinMaxScaler()
df[numerical_cols] = scaler.fit_transform(df[numerical_cols])

print(df[numerical_cols].describe())
df.to_csv("final_normalized_dataset.csv", index=False)
print("Numerical columns normalized successfully")
