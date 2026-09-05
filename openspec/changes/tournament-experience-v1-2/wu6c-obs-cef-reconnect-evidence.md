# WU6c Retained OBS/CEF Reconnect Evidence

Task-local raw evidence is retained outside Git:

- `C:\Users\diegu\AppData\Local\OpenTournament-WU6c-obs-smoke-20260904-wd\api.reconnect5.stdout.log` SHA-256 `94e14638e959abf52081c33722d9a7afacede90fc4c0ef0eca8fad8f6d87c63b` (lines 4, 9–13).
- `C:\Users\diegu\AppData\Local\OpenTournament-WU6c-obs-smoke-20260904-wd\reconnect5-final-control.log` SHA-256 `9b76df0b43c7ff422d306848f3473772e37bef6eca814ecdc40d0783f2367d4c`.
- Screenshots: baseline `a2b6095e7e210963f5341d156e11496755722d640d262ac14f6e02ad27e632b9`; SSE mutation and later reload `97fab512c7c7219de0b97f4e419953f587312b63fb8eab7d8521667401b8594d`.

1. The retained baseline hash was captured before the control sequence began at `2026-09-05T05:26:08.9450574Z`.
2. Only task API stopped at `05:26:08.9450574Z`; port 57741 confirmed down `05:26:12.0543362Z`; same-port restart launched `05:26:21.2572607Z`.
3. Raw line 4 listened at `2026-09-05T05:26:26.647Z`; lines 9/10 requested authoritative `/overlay` and new `/events/public` at `05:26:29.072Z`/`05:26:29.080Z`; line 12 is the open-triggered `/overlay` refresh at `05:26:29.122Z`. No OBS/source/reload action occurred first.
4. Authorized mutation began `05:26:59.6558197Z`; its Browser Source screenshot at `05:27:04.5595454Z` changed to the retained SSE hash above.
5. Only afterward `refreshnocache` ran `05:27:16.1155990Z`; its `05:27:27.5215782Z` screenshot converged separately.
