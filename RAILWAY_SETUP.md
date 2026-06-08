Railway setup — add Firebase service account securely
===============================================

Goal
----
Provide steps to set the Firebase Admin service account on Railway **without committing secrets** to GitHub.

Options
-------
1) Web UI (recommended)
   - Go to your Railway project > Settings > Variables
   - Add a new variable `FIREBASE_SERVICE_ACCOUNT_JSON`
   - Paste the entire JSON contents of your `serviceAccountKey.json` as the value (including newlines)
   - Save and redeploy

2) Railway CLI (if installed)
   - Install Railway CLI: https://docs.railway.app/cli
   - From your repo root run (bash/powershell):

     # Bash
     railway login
     railway link # choose your project
     railway variables set FIREBASE_SERVICE_ACCOUNT_JSON "$(cat path/to/serviceAccountKey.json)"

     # PowerShell
     railway login
     railway link
     $json = Get-Content -Raw path\to\serviceAccountKey.json
     railway variables set FIREBASE_SERVICE_ACCOUNT_JSON "$json"

Notes
-----
- Do NOT commit your service account JSON to the repository.
- If you prefer to upload a file in Railway, set `FIREBASE_SERVICE_ACCOUNT_PATH` to the path used by Railway filesystem, but the web UI secret is safer.
- After setting the variable, redeploy the Railway service so the backend can read the secret.

Verify
------
- After redeploy, check:
  - `https://your-backend-url/health` returns 200
  - In DevTools, requests to `/api/*` return 200 or 401 (if not authenticated) rather than 500
