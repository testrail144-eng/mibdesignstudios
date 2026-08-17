# Safe GitHub upload instructions

## Data safety

The application data is stored in Firebase Firestore, not in GitHub. Uploading these files to GitHub does not delete Firestore data.

The new version only adds fields and collections such as:

- quotation descriptions and room/area sections
- attendance photos and timestamps
- expense entries
- activity/audit events
- team invitations

Existing documents continue to work because the app uses fallback values when these new fields are not present.

Before publishing, do not delete the Firebase project or Firestore database. For extra safety, export/back up the Firestore database from the Firebase/Google Cloud console first.

## Upload through GitHub's browser

1. Download and extract `mibdesignstudios-github-upload.zip`.
2. Open the existing GitHub repository.
3. Click **Add file → Upload files**.
4. Open the extracted `mibdesignstudios-github-upload` folder on your computer.
5. Drag the **contents inside that folder** into the GitHub upload area. Do not drag the ZIP itself, and do not upload `.env.local` or `node_modules`.
6. Select **Commit directly to the `main` branch** and commit the changes.
7. Wait for Vercel to redeploy.

## Required after upload

1. Publish the updated `firestore.rules` in Firebase → Firestore Database → Rules. This is required for Admin promotion, expenses, attendance and the activity feed.
2. Keep the existing `NEXT_PUBLIC_FIREBASE_*` variables in Vercel.
3. Add the server-only variables from `.env.local.example` if Gmail notifications are required:
   - `GMAIL_USER`
   - `GMAIL_APP_PASSWORD`
   - `NOTIFY_TO`
   - Firebase Admin credentials
4. Test an existing site before creating or deleting anything new.

Use a Gmail App Password for email notifications. Never upload `.env.local`, passwords, service-account JSON files, or private keys to GitHub.
