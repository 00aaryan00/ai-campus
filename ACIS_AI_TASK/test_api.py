import requests
import json

url = "http://localhost:8000/generate-same-test"
payload = {"transcript": "The sun is a star at the center of the solar system. It is composed primarily of hydrogen and helium."}
headers = {"Content-Type": "application/json"}

try:
    response = requests.post(url, json=payload)
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
