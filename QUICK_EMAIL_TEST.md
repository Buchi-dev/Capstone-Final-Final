# 🚀 Quick Test Commands - Email Alert System

## Step 1: Deploy the Test Functions

```powershell
cd C:\Users\Administrator\Desktop\Capstone-Final-Final\functions
firebase deploy --only functions
```

Wait for deployment to complete. Note the function URLs from the output.

---

## Step 2: Find Your Function URLs

After deployment, you'll see URLs like:
```
✔  functions[us-central1-testEmailConfig] https://us-central1-YOURPROJECT.cloudfunctions.net/testEmailConfig
✔  functions[us-central1-testAlertEmail] https://us-central1-YOURPROJECT.cloudfunctions.net/testAlertEmail
```

Or check in Firebase Console: https://console.firebase.google.com/project/YOUR_PROJECT/functions

---

## Step 3: Test Email Configuration (Optional)

Check if email is properly configured:

```powershell
# Replace with your actual URL
Invoke-WebRequest -Uri "https://us-central1-YOURPROJECT.cloudfunctions.net/testEmailConfig" -Method GET
```

Expected output includes: `"configured": true`

---

## Step 4: Send Test Alert Email

### **Method 1: PowerShell (Recommended)**

```powershell
# Replace YOUR_EMAIL and YOUR_FUNCTION_URL
$url = "https://us-central1-YOURPROJECT.cloudfunctions.net/testAlertEmail"
$body = @{
    email = "YOUR_EMAIL@example.com"
    severity = "Critical"
    parameter = "ph"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri $url -Method POST -Body $body -ContentType "application/json"
$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

### **Method 2: Using curl (if installed)**

```bash
curl -X POST https://us-central1-YOURPROJECT.cloudfunctions.net/testAlertEmail \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"YOUR_EMAIL@example.com\",\"severity\":\"Warning\",\"parameter\":\"tds\"}"
```

### **Method 3: Using Postman or Insomnia**

- **URL:** `https://us-central1-YOURPROJECT.cloudfunctions.net/testAlertEmail`
- **Method:** POST
- **Headers:** `Content-Type: application/json`
- **Body (raw JSON):**
```json
{
  "email": "your-email@example.com",
  "severity": "Critical",
  "parameter": "ph",
  "deviceId": "TEST_DEVICE_001"
}
```

---

## Step 5: Check Results

### ✅ What to Check:

1. **Response JSON** - Should show `"success": true` and `"emailSent": true`
2. **Email Inbox** - Check for email (may take 10-30 seconds)
3. **Spam Folder** - Gmail might filter it initially
4. **Firestore Console** - Check `alerts` collection for new document
5. **Function Logs:**
   ```powershell
   firebase functions:log --only testAlertEmail
   ```

---

## 📝 Test Scenarios

### Test 1: Critical TDS Alert
```powershell
$body = @{
    email = "admin@example.com"
    severity = "Critical"
    parameter = "tds"
} | ConvertTo-Json
```

### Test 2: Warning pH Alert
```powershell
$body = @{
    email = "admin@example.com"
    severity = "Warning"
    parameter = "ph"
} | ConvertTo-Json
```

### Test 3: Advisory Turbidity Alert
```powershell
$body = @{
    email = "admin@example.com"
    severity = "Advisory"
    parameter = "turbidity"
    deviceId = "DEVICE_LAB_001"
} | ConvertTo-Json
```

---

## 🔧 Troubleshooting

### Email Not Configured?
```powershell
firebase functions:config:set email.user="your-email@gmail.com" email.password="your-app-password"
firebase deploy --only functions
```

### Check Logs
```powershell
# View all logs
firebase functions:log

# View specific function
firebase functions:log --only testAlertEmail

# Stream in real-time
firebase functions:log --follow
```

### Function Not Found?
Make sure deployment completed successfully:
```powershell
firebase functions:list
```

---

## 📧 Expected Email Content

You should receive an email with:
- **Subject:** `[Critical] Water Quality Alert - pH Level`
- **Color-coded severity badge**
- Device name and ID
- Parameter and current value
- Threshold exceeded
- Recommended action
- Timestamp

---

## ✨ Success Indicators

- ✅ HTTP 200 response
- ✅ `"success": true` in JSON
- ✅ `"emailSent": true` in response
- ✅ Email received within 30 seconds
- ✅ Alert document in Firestore
- ✅ No errors in function logs

---

## 🎯 Next Steps

Once email testing is successful:

1. **Set up real notification preferences** in Firestore
2. **Test with real sensor readings** that exceed thresholds
3. **Configure quiet hours** for production
4. **Add multiple admin users** to notification preferences
5. **Monitor in production** with real-time alerts

---

**Need the full guide?** See `EMAIL_TESTING_GUIDE.md` for detailed instructions and troubleshooting.
