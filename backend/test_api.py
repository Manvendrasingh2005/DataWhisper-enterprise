import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.environ.get('API_BASE_URL', 'http://127.0.0.1:8000')
USERNAME = os.environ.get('TEST_USERNAME', 'Manvendra')
PASSWORD = os.environ.get('TEST_PASSWORD', 'admin123')

print(f"Testing DataWhisper API at {BASE_URL}...")

def test_api():
    # 1. Obtain JWT Token
    token_url = f"{BASE_URL}/api/token/"
    print(f"\n1. Authenticating with {token_url}...")
    try:
        auth_res = requests.post(token_url, json={"username": USERNAME, "password": PASSWORD})
        if auth_res.status_code != 200:
            print(f"❌ Authentication failed ({auth_res.status_code}):", auth_res.text)
            print("Note: If the password changed, update TEST_PASSWORD in .env or run manage.py changepassword.")
            return
        
        token = auth_res.json().get('access')
        print("✅ Authentication successful! JWT acquired.")
    except Exception as e:
        print(f"❌ Failed to reach authentication endpoint: {e}")
        print("Ensure the Django server is running: python manage.py runserver")
        return

    # 2. Test /api/ask/
    ask_url = f"{BASE_URL}/api/ask/"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    sample_question = "What is the name and email of the customer who made the largest total order?"
    print(f"\n2. Querying AI with: '{sample_question}'...")
    
    try:
        res = requests.post(ask_url, json={"question": sample_question}, headers=headers)
        if res.status_code == 200:
            data = res.json()
            print("\n✅ SUCCESS! Response received:")
            print(f"Generated SQL: {data.get('sql')}")
            print(f"Execution Time: {data.get('execution_time_ms', 'N/A')} ms")
            print(f"Columns: {data.get('columns')}")
            print(f"Rows count: {len(data.get('rows', []))}")
            if data.get('insight'):
                print(f"AI Insight: {data.get('insight')}")
            print(json.dumps(data.get('rows')[:3], indent=2))
        else:
            print(f"\n❌ Query failed ({res.status_code}):", res.text)
    except Exception as e:
        print(f"❌ Request error: {e}")

if __name__ == '__main__':
    test_api()