# MongoDB Atlas Troubleshooting Guide

The "Authentication failed" error is a direct message from MongoDB Atlas indicating that the credentials (username/password) provided do not match their records for the cluster `clustertl.o4ysjwf`.

### Please Perform These Steps in MongoDB Atlas:

1.  **Reset Password**:
    *   Go to **Database Access** in the left sidebar.
    *   Find the user **openTL_db**.
    *   Click **Edit** -> **Edit Password**.
    *   Select **Autogenerate Secure Password** or set it specifically to `openTL@dk30` again.
    *   Click **Update User**.

2.  **Verify IP Whitelist**:
    *   Go to **Network Access** in the left sidebar.
    *   Ensure your IP is listed.
    *   *Tip*: Add `0.0.0.0/0` temporarily to test if it's a network issue (though "bad auth" usually means credentials).

3.  **Check Connection String**:
    *   Click **Database** in the sidebar.
    *   Click **Connect** on your cluster.
    *   Select **Drivers** -> **Node.js**.
    *   Copy the string and compare it to the one in your `.env`.

### Current .env Status:
Your `.env` currently uses:
`MONGODB_URI=mongodb+srv://openTL_db:openTL%40dk30@clustertl.o4ysjwf.mongodb.net/discord?appName=ClusterTL`

If you change the password to something else, please update the `.env` accordingly. If the new password has special characters like `@`, encode it as `%40` in the URI.
