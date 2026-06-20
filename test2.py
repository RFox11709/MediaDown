import subprocess
import json

url = "https://www.pinterest.com/pin/1111755858050649941/"
result = subprocess.run(["gallery-dl", "-j", url], capture_output=True, text=True, timeout=20)
try:
    parsed = json.loads(result.stdout)
    print("Parsed type:", type(parsed))
    if isinstance(parsed, list):
        print("Len parsed:", len(parsed))
        if len(parsed) > 0:
            print("First element type:", type(parsed[0]))
            print("First element len:", len(parsed[0]))
            if isinstance(parsed[0], list):
                print("First item of first element:", parsed[0][0])
                print("Second item keys:", parsed[0][1].keys())
except Exception as e:
    print("Exception:", e)
