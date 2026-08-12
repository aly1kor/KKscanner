Version: 1.0

Frontend
- GitHub Pages

Backend
- Google Apps Script

Proxy
- Cloudflare Worker

Database
- Google Sheets

Status
✔ Production Ready

Diagnostics

Browser time
= time from browser sending request
  until browser receives/processes response

Worker time
= time measured inside Cloudflare Worker

Server time
= time measured inside Apps Script

Browser : 2623 ms
Worker  : 2432 ms
Server  : 614 ms

Timings overall as below so total is not the sum of 3, total is timing as seen by user from click of button till response (also seen by user)

Browser:  ├────────────────────────────── 2623 ms ──────────────────────────────┤
          │                                                                      │
Worker:   │   ├────────────────────── 2432 ms ────────────────────────┤         │
          │   │                                                        │         │
Server:   │   │       ├──── 614 ms ────┤                              │         │
          │   │       └────────────────┘                              │         │
          │   └────────────────────────────────────────────────────────┘         │
          └──────────────────────────────────────────────────────────────────────┘

          Browser overhead outside Worker 2623 - 2432 = 191 ms
          Worker time outside Apps Script 2432 - 614 = 1818 ms

          Timing	Value	Meaning
Browser	2623 ms	End-to-end request as experienced by browser
Worker	2432 ms	Worker-side request duration
Server	614 ms	Apps Script processing
Browser − Worker	191 ms	Browser/network overhead around Worker
Worker − Server	1818 ms	Worker ↔ Apps Script / Worker-side overhead
Total	—	Separate user-perceived operation time
