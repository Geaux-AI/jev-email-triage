"""Pull your most recent Gmail messages into emails.gmail.json for the demo.

Uses IMAP with a Gmail app password (Google Account > Security > 2-Step Verification > App passwords).
Put these in .env yourself:
    GMAIL_ADDRESS=you@gmail.com
    GMAIL_APP_PASSWORD=abcd efgh ijkl mnop

Usage:
    python3 import_gmail.py              # newest 1700 from the inbox
    python3 import_gmail.py 500 "[Gmail]/All Mail"

Messages are fetched with BODY.PEEK so nothing gets marked as read. Nothing is changed in your mailbox.
"""

import email
import html
import imaplib
import json
import os
import re
import sys
from email.header import decode_header, make_header
from email.utils import parsedate_to_datetime

HERE = os.path.dirname(os.path.abspath(__file__))
BODY_CHARS = 1500  # keep requests small and cheap; the start of an email is what matters for triage
BATCH = 100


def load_env():
    path = os.path.join(HERE, ".env")
    if not os.path.exists(path):
        return
    for line in open(path):
        m = re.match(r"\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$", line)
        if m and m.group(1) not in os.environ:
            os.environ[m.group(1)] = m.group(2).strip("'\"")


def header(msg, name):
    raw = msg.get(name)
    if not raw:
        return ""
    try:
        return str(make_header(decode_header(raw))).strip()
    except Exception:
        return str(raw).strip()


def sender_name(raw):
    name, addr = email.utils.parseaddr(raw)
    return name or addr


def text_body(msg):
    plain, htm = None, None
    for part in msg.walk() if msg.is_multipart() else [msg]:
        if part.get_content_maintype() == "multipart" or part.get_filename():
            continue
        try:
            payload = part.get_payload(decode=True)
            if payload is None:
                continue
            text = payload.decode(part.get_content_charset() or "utf-8", errors="replace")
        except Exception:
            continue
        ctype = part.get_content_type()
        if ctype == "text/plain" and plain is None:
            plain = text
        elif ctype == "text/html" and htm is None:
            htm = text
    if plain is None and htm is not None:
        htm = re.sub(r"(?is)<(script|style).*?</\1>", " ", htm)
        plain = html.unescape(re.sub(r"<[^>]+>", " ", htm))
    return re.sub(r"\s+", " ", plain or "").strip()[:BODY_CHARS]


def main():
    load_env()
    addr = os.environ.get("GMAIL_ADDRESS")
    pw = os.environ.get("GMAIL_APP_PASSWORD")
    if not addr or not pw:
        sys.exit("Add GMAIL_ADDRESS and GMAIL_APP_PASSWORD to .env first (see the top of this file).")
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 1700
    mailbox = sys.argv[2] if len(sys.argv) > 2 else "INBOX"

    imap = imaplib.IMAP4_SSL("imap.gmail.com")
    imap.login(addr, pw.replace(" ", ""))
    status, _ = imap.select(f'"{mailbox}"', readonly=True)
    if status != "OK":
        sys.exit(f"Could not open mailbox {mailbox}")
    _, data = imap.uid("search", None, "ALL")
    uids = data[0].split()[-limit:][::-1]  # newest first
    print(f"Fetching {len(uids)} messages from {mailbox}...")

    out = []
    for start in range(0, len(uids), BATCH):
        chunk = uids[start : start + BATCH]
        _, resp = imap.uid("fetch", b",".join(chunk), "(BODY.PEEK[])")
        for item in resp:
            if not isinstance(item, tuple):
                continue
            msg = email.message_from_bytes(item[1])
            try:
                sent = parsedate_to_datetime(msg.get("Date")).isoformat()
            except Exception:
                sent = ""
            out.append(
                {
                    "id": len(out) + 1,
                    "from": sender_name(header(msg, "From")),
                    "from_address": email.utils.parseaddr(header(msg, "From"))[1],
                    "to": header(msg, "To"),
                    "subject": header(msg, "Subject") or "(no subject)",
                    "sent_at": sent,
                    "has_list_unsubscribe_header": bool(msg.get("List-Unsubscribe")),
                    "body": text_body(msg),
                }
            )
        print(f"  {len(out)} / {len(uids)}")
    imap.logout()

    path = os.path.join(HERE, "emails.gmail.json")
    with open(path, "w") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
    print(f"Saved {len(out)} emails to {path}")
    print("Start the demo on them with:  EMAILS_FILE=emails.gmail.json node server.js")


if __name__ == "__main__":
    main()
