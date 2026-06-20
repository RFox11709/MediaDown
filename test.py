import subprocess
import json

url = "https://www.pinterest.com/pin/1111755858050649941/"
result = subprocess.run(["gallery-dl", "-j", url], capture_output=True, text=True, timeout=20)
print("Return code:", result.returncode)
print("Stdout empty?", not bool(result.stdout.strip()))

data = []
for line in result.stdout.strip().split('\n'):
    try:
        parsed = json.loads(line)
        print("Is list?", isinstance(parsed, list))
        print("Len parsed:", len(parsed))
        print("Is first element list?", isinstance(parsed[0], list))
        if isinstance(parsed, list) and len(parsed) > 0 and isinstance(parsed[0], list):
            for item in parsed:
                if len(item) > 1 and isinstance(item[1], dict):
                    data.append(item[1])
    except Exception as e:
        print("Exception:", e)

print("Found data len:", len(data))
