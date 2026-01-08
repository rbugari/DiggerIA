import os
import sys

print("Current Working Directory:", os.getcwd())
print("Python Path:", sys.path)

CIR_PATH = r"app\models\cir.py"
print(f"\nChecking content of {CIR_PATH}:")
if os.path.exists(CIR_PATH):
    with open(CIR_PATH, "r") as f:
        print(f.read())
else:
    print(f"File {CIR_PATH} does not exist!")

print("\nAttempting import:")
try:
    from app.models.cir import CIRNode
    print("Import Successful:", CIRNode)
except Exception as e:
    print("Import Failed:", e)
    import traceback
    traceback.print_exc()
