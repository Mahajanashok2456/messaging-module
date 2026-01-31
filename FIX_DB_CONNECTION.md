# 🚨 CRITICAL: Database Connection Fix Required

Your internet provider's DNS (hyd-tdc-bngs-22) is blocking the "Short" MongoDB connection string (`mongodb+srv://...`). You **MUST** use the "Standard" connection string to bypass this.

## Step 1: Get the Standard String
1.  Log in to [MongoDB Atlas](https://cloud.mongodb.com).
2.  Click **Connect** on your cluster.
3.  Click **Drivers**.
4.  **IMPORTANT**: In the **Version** dropdown, select **Node.js 2.2.12 or later** (do NOT leave it on "4.1 or later").
    *   *Why?* This gives you the long `mongodb://` string that works even if DNS is bad.
5.  Copy the long connection string. It will look like:
    ```text
    mongodb://cluster0-shard-00-00.7ypf3ek.mongodb.net:27017,cluster0-shard-00-01.7ypf3ek.mongodb.net:27017,cluster0-shard-00-02.7ypf3ek.mongodb.net:27017/?ssl=true&replicaSet=atlas-xxx-shard-0&authSource=admin&retryWrites=true&w=majority
    ```

## Step 2: Update .env
1.  Open your `.env` file.
2.  Delete the current `MONGO_URI` line.
3.  Paste the *new* long string you copied.
4.  **Update the password**: Replace `<password>` in the string with your actual password: `2456`.
5.  **Verify User**: Ensure the username in the string matches your database user (e.g., `message` or `ashokroshan78_db_user`).

## Step 3: Restart
1.  Stop the server (Ctrl+C).
2.  Run `npm start` (or `npm run dev`).
