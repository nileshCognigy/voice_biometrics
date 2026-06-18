Voice Biometrics — Render deployment notes

Render Disk

- In your Render service → Settings → Disks → Add Disk.
- Mount path: `/data`
- Size: `1GB` (free tier)

The application checks `process.env.RENDER_DISK_PATH` and will use the Render disk when available. Render automatically sets `RENDER_DISK_PATH` to the disk mount path (for example `/data`). If the variable is not present the app falls back to a local file `./voice_profiles.db`.

Quick deploy

1. Create a new Web Service on Render and connect it to this repository and branch `main`.
2. Ensure `render.yaml` is present in the repo root (it is), which declares the service and disk options.
3. Add the disk in the Render UI with mount path `/data`.
4. Deploy — the service `startCommand` is `node index.js`.
