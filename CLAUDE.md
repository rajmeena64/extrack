# Project Instructions

- This project is at `C:\Newapp`.
- On Windows, do not pass raw `C:\Newapp` paths to Bash commands. Prefer running commands from the current working directory, for example `git status --short`.
- If using Bash with an absolute path, use `/c/Newapp` instead of `C:\Newapp`.
- Do not run PowerShell commands such as `Get-ChildItem` inside Bash. Use `powershell.exe -NoProfile -Command "Get-ChildItem -Name"` or use Bash equivalents such as `ls`.
- Do not run `npm run build` repeatedly.
- First inspect `package.json` and relevant config files.
- Only run `npm run build` once after changes are complete.
- If build takes more than 120 seconds, stop and report the likely cause.
- Use targeted checks first, such as `npm run lint` or `node --check` where applicable.
- Never leave long-running commands hanging indefinitely.
