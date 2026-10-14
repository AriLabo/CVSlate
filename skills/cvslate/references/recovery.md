# Stopping, backups and recovery

For any failure, start with `cvslate doctor`. It checks the runtime, the browser, the lock and the Bridge without opening resumes or printing tokens; follow the `nextAction` of each failing check.

- **Stopping:** `cvslate stop` waits for rendering in progress, then cleans up. If it times out, the error names the process still running: report it rather than killing it, since a forced kill can interrupt a write.
- **The Bridge cannot read its own files** (doctor `bridge-files` error, or inspect and export report 「无法读取安装文件」): some agent sandboxes take file access away from a background process once the shell that started it ends. The editor keeps working; run `cvslate stop` from the current session, and the next command starts a fresh Bridge.
- **Stale lock** (doctor `lock` warning naming an exited process): the next command that starts the Bridge clears it (`cvslate preview` reports it as `recoveredStaleLock`). `cvslate unlock` does the same and refuses while that process is alive. One workspace has one Bridge; never start a second next to a live one.
- **Recovery marker or integrity failure:** after an unexpected exit, startup refuses to continue. Report it and leave the workspace as it is; removing the marker or touching database files can lose the user's data.
- **Backup and restore,** only when the user asks, in this order:

```sh
cvslate backup --output "<new-backup.db>"
cvslate stop
cvslate restore-workspace --file "<backup.db>"
cvslate preview
```

Restore checks the backup's integrity and keeps a copy of what it replaces.

## Where the workspace is

`cvslate workspace` shows the directory and whether it is the default one in the user's data directory or one the user chose. Change it only when the user asks, and keep it on a local disk: a folder synced by iCloud, OneDrive or a network drive can corrupt the database.

- **Start over somewhere else:** `cvslate stop`, then `cvslate workspace "<new or empty directory>"`, then `cvslate preview`. The resumes stay in the old workspace.
- **Move the resumes:** `cvslate stop`, move the whole workspace directory to its new place, then `cvslate workspace "<new location>"`. A backup cannot be restored into another workspace, so copying the directory is the way to move.
- **Chosen workspace not found:** it may have been moved or be on a disk that is not connected. Ask the user before choosing another.
