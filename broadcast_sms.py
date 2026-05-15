import csv
import time
import requests

# Config
ENDPOINT = "http://192.168.0.216:8082"
TOKEN = "b2c07958-bf84-46ff-b104-45c4f820d931"
CSV_FILE = "students.csv"  # Ensure your CSV has a column with phone numbers
MESSAGE = "New Winter Drive is live at UIU! Scan QR to contribute."

def send_sms(to, message):
    payload = {
        "to": to,
        "message": message
    }
    headers = {
        "Authorization": TOKEN,
        "Content-Type": "application/json"
    }
    try:
        response = requests.post(ENDPOINT, json=payload, headers=headers, timeout=10)
        if response.status_code == 200 or response.status_code == 201:
            print(f"[SUCCESS] Message sent to {to}")
            return True
        else:
            print(f"[FAILED] Status: {response.status_code} for {to}. Response: {response.text}")
            return False
    except Exception as e:
        print(f"[ERROR] Connection failed for {to}: {str(e)}")
        return False

def broadcast():
    try:
        with open(CSV_FILE, mode='r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            count = 0
            for row in reader:
                # Adjust 'phone' to your CSV header name
                phone = row.get('phone') or row.get('mobile') or row.get('number')
                
                if phone:
                    print(f"Sending to {phone}...")
                    send_sms(phone, MESSAGE)
                    count += 1
                    
                    # Anti-Spam Delay
                    print("Sleeping for 10 seconds to prevent blocking...")
                    time.sleep(10)
            
            print(f"\nBroadcast Finished! Total messages sent: {count}")
            
    except FileNotFoundError:
        print(f"Error: {CSV_FILE} not found. Please place your CSV file in the same directory.")
    except Exception as e:
        print(f"An error occurred: {str(e)}")

if __name__ == "__main__":
    broadcast()
