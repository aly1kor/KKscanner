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


Browser       : 8003 ms
Worker        : -
Server        : -
Verification  : 8963 ms
Total         : 16973 ms

It tells us:

Browser waited 8 seconds for the check-in request, received no response, then entered the verification/recovery process.

==========================
Cloud flare path
https://dash.cloudflare.com/c92ae9e12630e5925c539f6ef11e2044/workers/services/edit/kkscanner-proxy/production

================================================

Appscripts config(Email sending)
1. copy all the appscripts to the new google sheet
2. in "Test Email" make YES for test emails to be sent eg core team
3. in appscripts click Email.gs and run TestEmail function
4. Emails will be sent to test recipients, modify as needed
5. Send Email to all participant, run SendAllEmails Function, email sent status is update in google sheet
6. if recipients >100 then rerun the step5  next day.

7. Deploy the appscripts (always newly )
   Execute as: Me / User deploying
Who has access: Anyone

8. copy the exec appscripts url in cloudflare - Settings - Variables and secrets - APPS_SCRIPT_URL
