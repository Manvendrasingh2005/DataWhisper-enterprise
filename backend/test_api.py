import urllib.request
import json

url = 'http://127.0.0.1:8000/api/ask/'
payload = json.dumps({
    "question": "What is the name and email of the customer who made the largest total order?"
}).encode('utf-8')

req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})

print("Sending request to Django...")
try:
    response = urllib.request.urlopen(req)
    data = json.loads(response.read().decode('utf-8'))
    print("\n✅ SUCCESS! Here is the data:")
    print(json.dumps(data, indent=2))
except urllib.error.HTTPError as e:
    print("\n❌ SERVER CRASHED (Error {})".format(e.code))
    error_body = e.read().decode('utf-8')
    print("Error Details:", error_body)
except Exception as e:
    print("\n❌ CONNECTION FAILED:", str(e))
    print("Make sure your Django server is running!")