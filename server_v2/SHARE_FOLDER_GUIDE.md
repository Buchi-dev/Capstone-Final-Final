# Share Google Drive Backup Folder

## Method 1: Using curl (Command Line)

Open PowerShell and run:

```powershell
# First, login and get your auth token
# Then run this command:

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer YOUR_AUTH_TOKEN_HERE"
}

$body = @{
    email = "hed-tjyuzon@smu.edu.ph"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/v1/backups/share-folder" -Method POST -Headers $headers -Body $body
```

## Method 2: Using the Browser Console

1. Open your admin dashboard at `http://localhost:5173`
2. Make sure you're logged in as admin
3. Open browser DevTools (F12)
4. Go to Console tab
5. Paste this code:

```javascript
fetch('http://localhost:5000/api/v1/backups/share-folder', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // Add your auth header here if needed
  },
  credentials: 'include', // Include cookies
  body: JSON.stringify({
    email: 'hed-tjyuzon@smu.edu.ph'
  })
})
.then(res => res.json())
.then(data => console.log('✅ Success:', data))
.catch(err => console.error('❌ Error:', err));
```

## Method 3: Add a Button in Frontend (Recommended)

I can add a button in your admin backup page to trigger this. Would you like me to do that?

## Expected Response

Success:
```json
{
  "status": "success",
  "message": "Successfully shared PureTrack_Backups folder with hed-tjyuzon@smu.edu.ph",
  "data": {
    "success": true,
    "message": "Successfully shared PureTrack_Backups folder with hed-tjyuzon@smu.edu.ph"
  }
}
```

## After Sharing

1. Check your email: `hed-tjyuzon@smu.edu.ph`
2. You should receive a Google Drive notification
3. Open the link in the email
4. Or go to Google Drive > "Shared with me"
5. You should see `PureTrack_Backups` folder

## Troubleshooting

If you get an error:
- Make sure Google Drive API is enabled in your Firebase project
- Check that you're logged in as admin
- Verify the email address is correct
- Check server logs for detailed error messages
