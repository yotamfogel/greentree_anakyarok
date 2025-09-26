## Local ADFS Integration Guide

Follow the steps below to connect the application to your on-premises (or lab) Active Directory Federation Services (ADFS) instance using the built-in MSAL authentication.

### 1. Prepare an Application Group in ADFS
- Open the ADFS Management Console → *Application Groups* → *Add Application Group*.
- Choose **Web browser accessing a web application** and give it a recognizable name (e.g. `thegreentree-local`).
- When prompted:
  - Note down the **Client Identifier** that ADFS generates. You will need it in the app as `VITE_ADFS_CLIENT_ID`.
  - Set the **Redirect URI** to include the Vite dev server origin (default: `http://localhost:5173/`). If you deploy the app elsewhere, add those origins too.
- Finish the wizard and, if required, configure any access control policies so your test users can sign in.

### 2. Locate Your ADFS Authority URL
- The MSAL client needs the base discovery endpoint (also referred to as the authority).
- For a default, locally hosted farm it typically looks like:
  - `https://<your-adfs-host>/adfs`
- If you are running ADFS behind HTTPS on a custom port or host name, update the URL accordingly. Example: `https://adfs.local.contoso.com:444/adfs`.

### 3. Provide the Configuration to the App
1. Create or edit `thegreentree_project/.env.local` (Git ignores this file).
2. Add the following keys, substituting the values you obtained above:
   ```ini
   VITE_ADFS_AUTHORITY=https://your-adfs-host/adfs
   VITE_ADFS_CLIENT_ID=00000000-0000-0000-0000-000000000000
   ```
3. If you run the Vite dev server, restart `npm run dev` so the new environment variables are picked up.

### 4. (Optional) Update Redirect URIs for Production
- When building for production, ensure the deployed origin is also registered as an allowed redirect URI inside the same ADFS application group.
- The `redirectUri` in `PermissionContext` defaults to `window.location.origin`, so whatever domain serves the bundle must be listed in ADFS.

### 5. Verify the Flow
1. Start the dev server: `npm run dev`.
2. Click the login button in the UI. You should be redirected to your ADFS sign-in page (hosted locally or remotely).
3. Sign in with a user who belongs to an admin group (one of: `admin`, `admins`, `Administrators`, or `Administrators@thegreentree`) to unlock the admin-only features.
4. On success, the user’s MSAL account is cached in `localStorage` and the UI updates with the appropriate permissions.

### 6. Troubleshooting
- **Blank page after login** – check the browser console for CORS or certificate warnings. Local ADFS setups usually require trusted HTTPS certificates.
- **`interaction_required` or silent token failures** – ensure the account exists in ADFS and that the relying party trust permits the scopes `openid profile`.
- **Admin permissions missing** – confirm the signed-in user belongs to one of the configured admin group claim values or has a `role` claim of `admin`.

With these steps completed, the application will authenticate users against your local ADFS instance using MSAL.
