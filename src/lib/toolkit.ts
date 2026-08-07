/**
 * Wasl — the complete zero-cost GCC lead-generation Python toolkit.
 * These files are the real, runnable source the user downloads from the app.
 * Content is written with String.raw so Python escape sequences survive
 * intact. Never use backtick characters inside the raw template literals.
 */

export interface ToolkitFile {
  id: string;
  name: string;
  description: string;
  language: "python" | "text" | "markdown";
  content: string;
}

export const TOOLKIT_FILES: ToolkitFile[] = [
  {
    id: "requirements",
    name: "requirements.txt",
    language: "text",
    description: "Every dependency is a free, open-source library — no paid APIs.",
    content: String.raw`# Wasl — zero-cost GCC lead generation stack (all free tiers)
requests>=2.32
beautifulsoup4>=4.12
lxml>=5.3
google-generativeai>=0.8
groq>=0.15
pywhatkit>=5.4
selenium>=4.27
# optional: for JavaScript-heavy listing sites
playwright>=1.48
# after installing playwright, run:
#   python -m playwright install chromium
`,
  },
  {
    id: "config",
    name: "config.py",
    language: "python",
    description: "One file for every setting: provider, sources, selectors, limits.",
    content: String.raw`"""
config.py — Settings for the zero-cost GCC lead generation toolkit.

Free API keys:
  * Gemini (free tier):  https://aistudio.google.com/apikey
  * Groq (free tier):    https://console.groq.com/keys   (no credit card)
"""

# ---------------------------------------------------------------- LLM provider
LLM_PROVIDER = "gemini"            # "gemini" | "groq"
GEMINI_API_KEY = "YOUR_GEMINI_API_KEY"
GEMINI_MODEL = "gemini-2.0-flash"  # free-tier friendly
GROQ_API_KEY = "YOUR_GROQ_API_KEY"
GROQ_MODEL = "llama-3.3-70b-versatile"

# ------------------------------------------------------------------- Scraping
# Example only — replace with real listing URLs for your target directory.
SCRAPE_URLS = [
    # Live Oman yellow pages (successor of the now-defunct yellowpages.com.om).
    "https://www.yellowpages.om/yp/category/construction-companies",
]
SCRAPE_CITY = "Oman"
SCRAPE_CATEGORY = "general"
REQUEST_DELAY = 2.0                 # seconds between requests — be polite
USE_PLAYWRIGHT = False              # True for JavaScript-heavy listing sites
DEFAULT_COUNTRY_CODE = "+968"       # used when a phone number has no code

# Default selectors — adjust to the structure of YOUR target site.
CARD_SELECTOR = "div.result, div.listing-item, article"
NAME_SELECTOR = "h2, h3, .title, .name"
PHONE_SELECTOR = "a[href^='tel:'], .phone"
RATING_SELECTOR = ".rating, .stars, [aria-label*='star']"
REVIEWS_SELECTOR = ".reviews, .review-count"

# ------------------------------------------------------------------- Storage
DB_PATH = "leads.db"
CSV_PATH = "leads.csv"
EXPORT_CSV = True

# ---------------------------------------------------- WhatsApp Web messaging
WHATSAPP_DELAY = 20                 # seconds between messages — keep it slow
MESSAGES_PER_RUN = 5                # hard cap per run — review before sending
CHROME_PROFILE = "./chrome_profile"  # persistent login for the Selenium option
`,
  },
  {
    id: "scraper",
    name: "scraper.py",
    language: "python",
    description: "Requests + BeautifulSoup (with a Playwright fallback) that extracts name, phone and rating from public listings.",
    content: String.raw`"""
scraper.py — Free business-listings scraper (requests + BeautifulSoup).

No paid APIs. Extracts business name, phone and rating from public directory
pages. For JavaScript-heavy sites set USE_PLAYWRIGHT = True in config.py.

Usage:
    from scraper import scrape_all
    leads = scrape_all()
"""

import random
import re
import time
from dataclasses import dataclass

import requests
from bs4 import BeautifulSoup

import config


@dataclass
class Lead:
    name: str
    phone: str = ""
    rating: float = 0.0
    reviews: int = 0
    city: str = ""
    category: str = ""
    source_url: str = ""

    def as_dict(self) -> dict:
        return {
            "name": self.name,
            "phone": self.phone,
            "rating": self.rating,
            "reviews": self.reviews,
            "city": self.city,
            "category": self.category,
            "source_url": self.source_url,
        }


# GCC country dial codes: Oman, Saudi, UAE, Qatar, Bahrain, Kuwait.
_GCC_CODES = ("968", "966", "971", "974", "973", "965")


def normalize_phone(raw: str, default_country: str = "+968") -> str:
    """Best-effort international phone number.

    Local numbers get the default GCC country code prepended; numbers that
    already carry a GCC dial code are kept as-is.
    """
    if not raw:
        return ""
    cleaned = re.sub(r"[^\d]", "", raw)
    if cleaned.startswith("00"):
        cleaned = cleaned[2:]
    if cleaned[:3] in _GCC_CODES:
        return "+" + cleaned
    return default_country + cleaned


def fetch_html(url: str, use_playwright: bool = False) -> str:
    """Download a page. Uses Playwright (headless Chromium) when needed."""
    if use_playwright:
        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(url, timeout=30_000, wait_until="domcontentloaded")
            time.sleep(2)  # let JS-rendered listings settle
            html = page.content()
            browser.close()
            return html

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
        ),
        "Accept-Language": "en-GB,en;q=0.9,ar;q=0.8",
    }
    resp = requests.get(url, headers=headers, timeout=20)
    resp.raise_for_status()
    return resp.text


def extract_leads(html: str, source_url: str, category: str = "") -> list[Lead]:
    """Extract leads from one listing page.

    Directory sites all differ, so the default CSS selectors target the most
    common patterns (a card block containing a name, a phone and optionally a
    rating). Edit the selector constants in config.py for your target site —
    that is normally the only change needed per site.
    """
    soup = BeautifulSoup(html, "lxml")
    leads: list[Lead] = []

    for block in soup.select(config.CARD_SELECTOR):
        name_el = block.select_one(config.NAME_SELECTOR)
        if not name_el:
            continue
        name = name_el.get_text(" ", strip=True)
        if len(name) < 3:
            continue

        phone_el = block.select_one(config.PHONE_SELECTOR)
        phone_raw = phone_el.get_text(" ", strip=True) if phone_el else ""
        if not phone_raw:
            # Fallback: first phone-like fragment anywhere in the card.
            match = re.search(r"\+?\d[\d\s()\-]{6,}\d", block.get_text())
            phone_raw = match.group(0) if match else ""

        rating_el = block.select_one(config.RATING_SELECTOR)
        reviews_el = block.select_one(config.REVIEWS_SELECTOR)

        try:
            rating = float(rating_el.get_text(strip=True)) if rating_el else 0.0
        except ValueError:
            rating = 0.0

        reviews = 0
        if reviews_el:
            numbers = re.findall(r"\d+", reviews_el.get_text())
            reviews = int(numbers[0]) if numbers else 0

        leads.append(
            Lead(
                name=name,
                phone=normalize_phone(phone_raw, config.DEFAULT_COUNTRY_CODE),
                rating=rating,
                reviews=reviews,
                city=config.SCRAPE_CITY,
                category=category or config.SCRAPE_CATEGORY,
                source_url=source_url,
            )
        )
    return leads


def scrape_all() -> list[Lead]:
    """Run the full scrape across config.SCRAPE_URLS with a polite delay."""
    seen: set[tuple[str, str]] = set()
    leads: list[Lead] = []

    for url in config.SCRAPE_URLS:
        try:
            html = fetch_html(url, use_playwright=config.USE_PLAYWRIGHT)
            page_leads = extract_leads(html, url)
        except Exception as exc:  # keep going if a single source fails
            print(f"[scraper] failed {url}: {exc}")
            continue

        for lead in page_leads:
            key = (lead.name.lower(), lead.phone)
            if key in seen:
                continue
            seen.add(key)
            leads.append(lead)

        time.sleep(config.REQUEST_DELAY + random.uniform(0, 0.5))

    print(f"[scraper] collected {len(leads)} unique leads")
    return leads
`,
  },
  {
    id: "personalize",
    name: "personalize.py",
    language: "python",
    description: "Gemini (free tier) or Groq writes a warm, custom Gulf Arabic pitch for every lead.",
    content: String.raw`"""
personalize.py — Writes a custom Gulf Arabic (خليجي) WhatsApp pitch per lead.

Provider (choose in config.py):
  - "gemini": Google Gemini free tier via an AI Studio key
              https://aistudio.google.com/apikey
  - "groq":   Groq free tier via https://console.groq.com/keys

Usage:
    from personalize import personalize_lead
    pitch = personalize_lead(lead)
"""

import time

import config


def _build_prompt(lead) -> str:
    return (
        "أنت خبير تسويق رقمي في دول مجلس التعاون الخليجي. اكتب رسالة واتساب "
        "ترويجية قصيرة ومهنية ودافئة بالعربية الخليجية لشركة من نوع B2B.\n"
        f"- اسم الشركة: {lead.name}\n"
        f"- القطاع: {lead.category or 'غير محدد'}\n"
        f"- المدينة: {lead.city or 'غير محدد'}\n"
        f"- تقييم الشركة: {lead.rating or 'غير معروف'}\n"
        "الشروط:\n"
        "1. من 2 إلى 3 جمل فقط، وأقل من 40 كلمة.\n"
        "2. خاطبهم بلقب محترم حسب السياق واذكر اسم الشركة.\n"
        "3. ركّز على قيمة واحدة واضحة بدلاً من قائمة عروض.\n"
        "4. اختم بسؤال بسيط يدعو للرد، مثل: 'هل يناسبكم وقت قصير نتعرف فيه على احتياجاتكم؟'\n"
        "5. لا تستخدم كلمات سبام مثل: مجاني، احصل الآن، عاجل، خصم 90%.\n"
        "أعد الرسالة فقط بدون أي مقدمة أو شرح."
    )


def personalize_lead(lead) -> str:
    """Return the pitch text for one lead using the configured provider."""
    prompt = _build_prompt(lead)

    if config.LLM_PROVIDER == "gemini":
        import google.generativeai as genai

        genai.configure(api_key=config.GEMINI_API_KEY)
        model = genai.GenerativeModel(config.GEMINI_MODEL)
        response = model.generate_content(prompt)
        return response.text.strip()

    if config.LLM_PROVIDER == "groq":
        from groq import Groq

        client = Groq(api_key=config.GROQ_API_KEY)
        completion = client.chat.completions.create(
            model=config.GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )
        return completion.choices[0].message.content.strip()

    raise ValueError("config.LLM_PROVIDER must be 'gemini' or 'groq'")


def personalize_many(leads, limit: int | None = None) -> list[tuple[object, str]]:
    """Personalize a batch of leads. Returns [(lead, pitch), ...]."""
    results: list[tuple[object, str]] = []
    targets = leads if limit is None else leads[:limit]

    for lead in targets:
        for attempt in range(3):  # light retry on free-tier rate limits
            try:
                pitch = personalize_lead(lead)
                break
            except Exception as exc:
                print(f"[personalize] retry {attempt + 1} for {lead.name}: {exc}")
                time.sleep(5 * (attempt + 1))
        else:
            continue  # give up on this lead after retries

        results.append((lead, pitch))
        print(f"[personalize] {lead.name}: {len(pitch)} chars")
        time.sleep(0.3)  # stay well under free-tier rate limits

    return results
`,
  },
  {
    id: "storage",
    name: "storage.py",
    language: "python",
    description: "SQLite + CSV persistence — Python standard library only.",
    content: String.raw`"""
storage.py — SQLite + CSV persistence. Standard library only.

Usage:
    import storage
    storage.save_leads(leads)
    storage.export_csv()
"""

import csv
import sqlite3

import config

_SCHEMA = """
CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    rating REAL DEFAULT 0,
    reviews INTEGER DEFAULT 0,
    city TEXT,
    category TEXT,
    source_url TEXT,
    pitch TEXT,
    status TEXT DEFAULT 'new',      -- new | drafted | sent | skipped
    created_at TEXT DEFAULT (datetime('now'))
);
"""


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute(_SCHEMA)
    return conn


def save_leads(leads) -> int:
    """Insert new leads, skipping duplicates by (name, phone). Returns count."""
    saved = 0
    conn = connect()
    try:
        for lead in leads:
            duplicate = conn.execute(
                "SELECT 1 FROM leads WHERE name = ? AND phone = ?",
                (lead.name, lead.phone),
            ).fetchone()
            if duplicate:
                continue
            conn.execute(
                """INSERT INTO leads
                   (name, phone, rating, reviews, city, category, source_url)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (lead.name, lead.phone, lead.rating, lead.reviews,
                 lead.city, lead.category, lead.source_url),
            )
            saved += 1
        conn.commit()
    finally:
        conn.close()
    print(f"[storage] saved {saved} new leads into {config.DB_PATH}")
    return saved


def update_pitch(lead_id: int, pitch: str) -> None:
    conn = connect()
    try:
        conn.execute(
            "UPDATE leads SET pitch = ?, status = 'drafted' WHERE id = ?",
            (pitch, lead_id),
        )
        conn.commit()
    finally:
        conn.close()


def mark_status(lead_id: int, status: str) -> None:
    conn = connect()
    try:
        conn.execute("UPDATE leads SET status = ? WHERE id = ?", (status, lead_id))
        conn.commit()
    finally:
        conn.close()


def fetch_leads(status: str | None = None, limit: int | None = None) -> list[sqlite3.Row]:
    conn = connect()
    try:
        sql = "SELECT * FROM leads"
        params: list = []
        if status:
            sql += " WHERE status = ?"
            params.append(status)
        sql += " ORDER BY id DESC"
        if limit:
            sql += " LIMIT ?"
            params.append(limit)
        return conn.execute(sql, params).fetchall()
    finally:
        conn.close()


def export_csv(path: str = "") -> str:
    """Export every lead to CSV. Returns the file path."""
    path = path or config.CSV_PATH
    rows = fetch_leads()
    if not rows:
        print("[storage] nothing to export")
        return path
    with open(path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(dict(row) for row in rows)
    print(f"[storage] exported {len(rows)} leads to {path}")
    return path
`,
  },
  {
    id: "messenger",
    name: "messenger.py",
    language: "python",
    description: "WhatsApp Web sender stub via PyWhatKit or Selenium — zero Meta API fees, manual QR login.",
    content: String.raw`"""
messenger.py — WhatsApp Web sender stub (zero Meta API fees).

Honest caveats:
  * Both options drive WhatsApp Web in a real browser. They need you to scan
    the QR code once, and WhatsApp UI changes can break them over time.
  * Keep volumes low (config.MESSAGES_PER_RUN), personalise every message and
    respect opt-out requests. Bulk unsolicited messaging violates WhatsApp's
    terms and may break local regulations.

Option A — PyWhatKit (default): opens WhatsApp Web and sends at the next
           minute boundary after you scan the QR.
Option B — Selenium: persistent Chrome profile; chat opened by URL.

Usage:
    from messenger import send_via_pywhatkit
    send_via_pywhatkit("+96890123456", "السلام عليكم...")
"""

import time

import config


def send_via_pywhatkit(phone: str, message: str) -> None:
    """Send one message with PyWhatKit. A Chrome window opens and you scan
    the WhatsApp QR code; the message goes out a couple of minutes later."""
    import pywhatkit

    now = time.localtime()
    send_hour, send_min = now.tm_hour, now.tm_min + 2
    if send_min >= 60:
        send_min -= 60
        send_hour = (send_hour + 1) % 24

    pywhatkit.sendwhatmsg(
        phone,
        message,
        send_hour,
        send_min,
        wait_time=20,     # seconds to wait after the page opens
        tab_close=False,  # keep the tab open so you can verify delivery
    )


def send_via_selenium(phone: str, message: str) -> None:
    """Selenium alternative with a persistent profile — scan the QR once and
    the profile keeps you logged in for later runs."""
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.support.ui import WebDriverWait

    options = webdriver.ChromeOptions()
    options.add_argument(f"user-data-dir={config.CHROME_PROFILE}")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-blink-features=AutomationControlled")

    driver = webdriver.Chrome(options=options)
    try:
        driver.get(f"https://web.whatsapp.com/send?phone={phone}")
        # First run: scan the QR code in the window that opens.
        wait = WebDriverWait(driver, 180)
        message_box = wait.until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, 'div[contenteditable="true"][data-tab="10"]')
            )
        )
        message_box.send_keys(message)
        message_box.send_keys("\n")
        time.sleep(3)  # let the message leave the input box
        print(f"[messenger] queued message for {phone}")
    finally:
        driver.quit()


def send_batch(leads: list, sender=send_via_pywhatkit) -> None:
    """Send only to drafted leads, capped by config.MESSAGES_PER_RUN.
    ALWAYS review the pitches before running this."""
    sent = 0
    for lead in leads:
        if sent >= config.MESSAGES_PER_RUN:
            print("[messenger] daily cap reached, stopping")
            break
        if not getattr(lead, "pitch", ""):
            continue
        sender(lead.phone, lead.pitch)
        sent += 1
        time.sleep(config.WHATSAPP_DELAY)
    print(f"[messenger] sent/queued {sent} messages")
`,
  },
  {
    id: "main",
    name: "main.py",
    language: "python",
    description: "Orchestrator: scrape → store → personalize → export → optional send.",
    content: String.raw`"""
main.py — Run the full zero-cost pipeline end to end.

    scrape  ->  store  ->  personalize  ->  export  ->  (optional) send

Usage:
    python main.py               # scrape + personalize + export, no sending
    python main.py --send        # also open WhatsApp Web for drafted leads
    python main.py --limit 20    # only process the first 20 scraped leads
    python main.py --export-only # skip LLM calls, just export the DB to CSV

Always review generated pitches before sending anything.
"""

import argparse

import config
import storage
from personalize import personalize_many
from scraper import scrape_all


def main() -> None:
    parser = argparse.ArgumentParser(description="Zero-cost GCC lead generation")
    parser.add_argument("--send", action="store_true",
                        help="open WhatsApp Web for drafted leads")
    parser.add_argument("--limit", type=int, default=0,
                        help="max leads to process (0 = all)")
    parser.add_argument("--export-only", action="store_true",
                        help="skip LLM calls, just export DB to CSV")
    args = parser.parse_args()

    # 1. Scrape
    leads = scrape_all()
    if args.limit:
        leads = leads[: args.limit]

    # 2. Store
    storage.save_leads(leads)

    # 3. Personalize (free-tier LLM)
    if not args.export_only:
        pending = storage.fetch_leads(status="new", limit=args.limit or None)
        results = personalize_many(pending)
        for lead, pitch in results:
            storage.update_pitch(lead["id"], pitch)

    # 4. Export
    if config.EXPORT_CSV:
        storage.export_csv()

    # 5. Optional send (WhatsApp Web)
    if args.send:
        from messenger import send_batch

        drafted = storage.fetch_leads(status="drafted")
        print(f"[main] {len(drafted)} drafted leads ready - opening WhatsApp Web...")
        send_batch(drafted)

    print("[main] pipeline finished.")


if __name__ == "__main__":
    main()
`,
  },
  {
    id: "readme",
    name: "README.md",
    language: "markdown",
    description: "Full setup instructions — the same guide you'll find in the Setup tab.",
    content: String.raw`# Wasl — Zero-Cost GCC Lead Generation Toolkit

Scrape public business listings, write custom Gulf Arabic pitches with a free
LLM tier, store everything in SQLite/CSV, and reach out over WhatsApp Web —
all for **$0/month** in tooling.

> ⚠️ **Use it responsibly.** Only contact businesses you have a legitimate
> reason to reach, personalise every message, keep volumes low and honour
> opt-out requests. Bulk unsolicited messaging violates WhatsApp's terms of
> service and may breach local privacy laws (e.g. Oman's PDPL).

## 1. Requirements
- Python **3.10+** (check with: python --version)
- Google Chrome (for the WhatsApp Web sender)
- One free API key: [Gemini (AI Studio)](https://aistudio.google.com/apikey)
  or [Groq](https://console.groq.com/keys)

## 2. Install

    mkdir wasl-lead-gen && cd wasl-lead-gen
    # copy the files from this folder into it
    python -m venv .venv
    source .venv/bin/activate        # Windows: .venv\Scripts\activate
    pip install -r requirements.txt
    python -m playwright install chromium   # only if you use Playwright scraping

## 3. Configure

Open **config.py** and set:
1. GEMINI_API_KEY (or GROQ_API_KEY + LLM_PROVIDER = "groq")
2. SCRAPE_URLS — the listing pages you want to scrape
3. The CSS selectors (CARD_SELECTOR, NAME_SELECTOR, ...) to match your site

## 4. Run

    python main.py                 # scrape + personalize + export leads.csv
    python main.py --send          # after reviewing, open WhatsApp Web for drafts

The first --send run opens WhatsApp Web — scan the QR code once.

## 5. Project layout

| File             | Purpose                                        |
| ---------------- | ---------------------------------------------- |
| config.py        | All settings in one place                      |
| scraper.py       | BeautifulSoup / Playwright extraction          |
| personalize.py   | Gemini or Groq Gulf Arabic pitches             |
| storage.py       | SQLite + CSV persistence                       |
| messenger.py     | WhatsApp Web sender stub (PyWhatKit/Selenium)  |
| main.py          | End-to-end orchestrator                        |
| leads.db         | Created on first run                           |
| leads.csv        | Exported after each run                        |

## 6. Frequently asked

**Which LLM should I pick?** Gemini's free tier is the most generous for this
workload; Groq is a great no-signup-cost alternative if you prefer Llama.

**The scraper found nothing.** Selectors differ per directory — inspect the
page and update the selectors in config.py. That is the only per-site change
you normally need.

**WhatsApp stopped working.** WhatsApp Web changes its internals regularly.
Both sender options are intentionally small stubs — swap the selectors or the
driver version, or graduate to the official Meta Cloud API when you're ready
to pay for volume.

**Is this legal?** Cold outreach is generally allowed under commercial speech
rules, but spam is not. Personalise, keep volumes low, provide opt-out, and
check local rules (Oman PDPL, UAE data protection, etc.) for your use case.
`,
  },
  {
    id: "leads-sample",
    name: "leads-sample.csv",
    language: "text",
    description: "Real sample output — 89 businesses scraped from yellowpages.om across 12 categories (construction, hotels, restaurants, car hire, oilfield, …). Import it via Leads → Import CSV, or use it as the shape your main.py output should match.",
    content: `name,phone,rating,reviews,city,category,source,pitch,status
WJ Towell & Co LLC,+96824526001,,,"Ruwi, Oman",Construction Companies,yellowpages.om,السلام عليكم، مجموعة توول من الشركات العريقة في السوق العُماني منذ 1866. فريقنا متخصص في التسويق الرقمي للشركات التجارية الكبرى في الخليج، وحابين نشارككم عرضاً مخصصاً يناسب حجم أعمالكم. ممكن وقت قصير نتعرف فيه على أولوياتكم؟,drafted
Al Naba Infrastructure LLC,+96898085141,,,"Muscat, Oman",Construction Companies,yellowpages.om,,new
Al Hajiry Group Of Companies,+96824866000,,,"Muscat, Oman",Construction Companies,yellowpages.om,مرحبا، لاحظنا حضور مجموعة الحجيري القوي في قطاع الإنشاءات. نقدم لكم حملة تسويقية متكاملة لشركات المقاولات بدون أي تكلفة مبدئية. نتمنى نرسل لكم نبذة مختصرة عن خدماتنا؟,drafted
China State Construction Engineering Corp. (Middle East) LLC,+971554397052,,,"Dubai, UAE",Construction Companies,yellowpages.om,,new
Al Khalili Group,+96899376481,,,"Muscat, Oman",Construction Companies,yellowpages.om,,new
Bahwan Engineering Group,+96824597510,,,"Muscat, Oman",Construction Companies,yellowpages.om,,new
Al Naba Holding LLC,+96892880931,,,"Muscat, Oman",Construction Companies,yellowpages.om,,new
Amiantit Oman Co LLC,+96824445800,,,"Muscat, Oman",Building Materials,yellowpages.om,,new
Intisar Corporation LLC (Building Materials),+96824831072,,,"Muscat, Oman",Building Materials,yellowpages.om,,new
Muna Noor Manufacturing And Trading LLC,+96899855642,,,"Rusayl, Oman",Building Materials,yellowpages.om,,new
Al Nasr Marbles,+96896481010,,,"Muscat, Oman",Building Materials,yellowpages.om,,new
Al Kiyumi Electric & Trading Co LLC,+96824493284,,,"Muscat, Oman",Building Materials,yellowpages.om,,new
The Middle East Traders LLC,+96824590694,,,"Muttrah, Oman",Building Materials,yellowpages.om,,new
Barka Cement Products Factory,+96899321803,,,"Barka, Oman",Building Materials,yellowpages.om,,new
Genesis International Investment LLC,+96899450782,,,"Muscat, Oman",Electro Mechanical,yellowpages.om,,new
Greenland Equipments & Machinery Est. (Oman),+96895916189,,,"Ruwi, Oman",Electro Mechanical,yellowpages.om,,new
GeoMatics Middle East,+96899346640,,,"Muscat, Oman",Electro Mechanical,yellowpages.om,,new
Shaksy Engineering Services LLC,+96893201534,,,"Ruwi, Oman",Electro Mechanical,yellowpages.om,,new
Yahya Engineering,+96891799170,,,"Muscat, Oman",Electro Mechanical,yellowpages.om,,new
Maxitech International LLC,+96824696001,,,"Muscat, Oman",Electro Mechanical,yellowpages.om,,new
Al Amanah International Trading & Services LLC,+96890679556,,,"Muscat, Oman",Electro Mechanical,yellowpages.om,,new
Al Khalili Logistics LLC,+96822035000,,,"Muscat, Oman",Freight Forwarding,yellowpages.om,,new
Cargoworld Logistics LLC,+96894213011,,,"Ruwi, Oman",Freight Forwarding,yellowpages.om,,new
Asyad Shipping Company S.A.O.G,+96824400900,,,"Muscat, Oman",Freight Forwarding,yellowpages.om,,new
Gulf Agency Company (Oman) LLC,+96824477800,,,"Muscat, Oman",Freight Forwarding,yellowpages.om,,new
City Shipping And Services,+96824810820,,,"Ruwi, Oman",Freight Forwarding,yellowpages.om,,new
Duqm United Logistics LLC,+96871557883,,,"Duqm, Oman",Freight Forwarding,yellowpages.om,,new
WIN Lines,+96826643915,,,"Muscat, Oman",Freight Forwarding,yellowpages.om,,new
Special Technical Services LLC,+96824603480,,,"Muscat, Oman",Oilfield Supplies,yellowpages.om,,new
Al Kiyumi Oilfield & Gas Equipment & Industrial Appliances LLC,+96893211909,,,"Sohar, Oman",Oilfield Supplies,yellowpages.om,,new
Saih Al Nihaidah Trading & Contracting (SANTCO),+96824385095,,,"Muscat, Oman",Oilfield Supplies,yellowpages.om,,new
Gulf Oilfields & Industrial Supplies LLC,+96824819168,,,"Muscat, Oman",Oilfield Supplies,yellowpages.om,,new
Business International Group LLC,+96896012531,,,"Muscat, Oman",Oilfield Supplies,yellowpages.om,,new
Muscat Overseas Oilfield Supplies Co LLC,+96822005691,,,"Muscat, Oman",Oilfield Supplies,yellowpages.om,,new
Rees Oil & Gas Services LLC,+96824481448,,,"Muscat, Oman",Oilfield Supplies,yellowpages.om,,new
Applus Velosi LLC,+96899440539,,,"Muscat, Oman",Safety Equipment,yellowpages.om,,new
"Addhia Trading & Contracting LLC (Fire, Security And Gas Division)",+96824491349,,,"Muscat, Oman",Safety Equipment,yellowpages.om,,new
Toolex Industrial Supplies & Solutions (Thanki Enterprises LLC),+96899822968,,,"Muscat, Oman",Safety Equipment,yellowpages.om,,new
Dareen Global LLC,+96892803889,,,"Qurum, Oman",Safety Equipment,yellowpages.om,,new
G4S Security Solutions LLC,+96824684900,,,"Qurum, Oman",Safety Equipment,yellowpages.om,,new
Union Technical Trading & Supply Co,+96896212342,,,"Seeb, Oman",Safety Equipment,yellowpages.om,,new
FAHUD Safety & Technical Trading SPC,+96891796734,,,"Muscat, Oman",Safety Equipment,yellowpages.om,,new
Shangri La Barr Al Jissah,+96824776666,,,"Muscat, Oman",Hotels & Travel,yellowpages.om,,new
Alila Jabal Akhdar,+96825344200,,,"Al Jabal Al Akhdar, Oman",Hotels & Travel,yellowpages.om,,new
Sohar Beach Hotel,+96826841111,,,"Sohar, Oman",Hotels & Travel,yellowpages.om,,new
Desert Nights Camp,+96892818388,,,"Al Wasil, Oman",Hotels & Travel,yellowpages.om,,new
Al Wadi Hotel - Sohar,+96826840058,,,"Sohar, Oman",Hotels & Travel,yellowpages.om,,new
City Seasons Muscat,+96824394800,,,"Muscat, Oman",Hotels & Travel,yellowpages.om,,new
RazmAzaan Restaurant,+96891944999,,,"Muscat, Oman",Restaurants,yellowpages.om,,new
Kamat Restaurant,+96824793355,,,"Ruwi, Oman",Restaurants,yellowpages.om,,new
#968 The Food Studio,+96890968968,,,"Al Khuwair, Oman",Restaurants,yellowpages.om,,new
Aangan By Rohit Ghai,+96879269247,,,"Muscat, Oman",Restaurants,yellowpages.om,,new
AL Andalus Restaurant,+96822550000,,,"Muscat, Oman",Restaurants,yellowpages.om,,new
Al Aqr Traditional Restaurant,+96872237373,,,"Nizwa, Oman",Restaurants,yellowpages.om,,new
Al Baha Restaurant,+96825218000,,,"Nizwa, Oman",Restaurants,yellowpages.om,,new
Al Falaj The Restaurant,+96894303207,,,"Ruwi, Oman",Restaurants,yellowpages.om,,new
Khana Khazana Restaurant,+96899107745,,,"Ruwi, Oman",Restaurants,yellowpages.om,,new
Bombay Chaat Corner & Restaurant,+96899368514,,,"Wadi Kabir, Oman",Restaurants,yellowpages.om,,new
Golden Moon Restaurant Ghala,+96893514008,,,"Ghala, Oman",Restaurants,yellowpages.om,,new
Global Car Rental & Leasing (Al Hashar Group),+96895032958,,,"Qurum, Oman",Car Hire & Leasing,yellowpages.om,,new
Budget Rent A Car (Travel & Allied Services LLC),+96822351860,,,"Al Khuwair, Oman",Car Hire & Leasing,yellowpages.om,,new
Autorent Oman,+96879999466,,,"Azaiba, Oman",Car Hire & Leasing,yellowpages.om,,new
Orbit Car Rental & Leasing,+96872727696,,,"Muscat, Oman",Car Hire & Leasing,yellowpages.om,,new
MHD - ACERE - MHD Leasing LLC,+96871557334,,,"Muscat, Oman",Car Hire & Leasing,yellowpages.om,,new
Dollar Car Rental,+96824590824,,,"Muscat, Oman",Car Hire & Leasing,yellowpages.om,,new
Sixt Rent A Car,+96822080940,,,"Muscat, Oman",Car Hire & Leasing,yellowpages.om,,new
Europcar Oman,+96897867424,,,"Muscat, Oman",Car Hire & Leasing,yellowpages.om,,new
International Rent A Car,+96897090063,,,"Muscat, Oman",Car Hire & Leasing,yellowpages.om,,new
ABC Rent A Car,+96892804099,,,"Ghala, Oman",Car Hire & Leasing,yellowpages.om,,new
Sayarti Car Rentals,+96899684331,,,"Azaiba, Oman",Car Hire & Leasing,yellowpages.om,,new
Avis Oman,+96824607235,,,"Muscat, Oman",Car Hire & Leasing,yellowpages.om,,new
Al Moosa Rent A Car,+96893266064,,,"Muscat, Oman",Car Hire & Leasing,yellowpages.om,,new
TMTEC Trading & Technical Services LLC,+96824595838,,,"Muttrah, Oman",Automotive,yellowpages.om,,new
Techno Gears Industries LLC,+96824446782,,,"Muscat, Oman",Automotive,yellowpages.om,,new
Gulf Services & Industrial Supplies Co LLC,+96893214159,,,"Ruwi, Oman",Automotive,yellowpages.om,,new
Precision Tune Auto Care,+96824479986,,,"Ruwi, Oman",Automotive,yellowpages.om,,new
Oman Mechanical Services Co Ltd LLC (Lubricant Division),+96824502820,,,"Muscat, Oman",Automotive,yellowpages.om,,new
Oman Mechanical Services Co Ltd LLC(Material Handling Division),+96824592235,,,"Muscat, Oman",Automotive,yellowpages.om,,new
MHD - ACERE - Automotive Division,+96824496560,,,"Muscat, Oman",Automotive,yellowpages.om,,new
MHD - ACERE - Tyres & Batteries Division,+96871557334,,,"Muscat, Oman",Automotive,yellowpages.om,,new
AL Ariq Equipment LLC,+96824502925,,,"Ruwi, Oman",Pest Control,yellowpages.om,,new
Peace Of Mind LLC,+96892487777,,,"Muscat, Oman",Pest Control,yellowpages.om,,new
Luster Overall Excellence Foundation,+96893572480,,,"Muscat, Oman",Pest Control,yellowpages.om,,new
National Pest Control Services LLC,+96890116213,,,"Al Amerat, Oman",Pest Control,yellowpages.om,,new
ART Group Of Companies,+96898702485,,,"Muscat, Oman",Pest Control,yellowpages.om,,new
Towell Engineering Group,+96824526084,,,"Ruwi, Oman",Engineering Consultants,yellowpages.om,,new
Miles Engineering Consultancy,+96897221599,,,"Seeb, Oman",Engineering Consultants,yellowpages.om,,new
National Engineering Office,+96822507668,,,"Muscat, Oman",Engineering Consultants,yellowpages.om,,new
Dawood Engineering Consultancy,+96824499466,,,"Azaiba, Oman",Engineering Consultants,yellowpages.om,,new
`,
  },
];

export interface QuickStartStep {
  title: string;
  detail: string;
  code?: string;
}

export const QUICKSTART_STEPS: QuickStartStep[] = [
  {
    title: "Get the scripts",
    detail: "Download the 9 files from the Script Library and put them in one folder.",
    code: "mkdir wasl-lead-gen && cd wasl-lead-gen",
  },
  {
    title: "Install the stack",
    detail: "Python 3.10+, a venv, and the free libraries from requirements.txt.",
    code: "python -m venv .venv\nsource .venv/bin/activate\npip install -r requirements.txt",
  },
  {
    title: "Add your free API key",
    detail: "Grab a Gemini AI Studio key (or Groq) and paste it into config.py.",
    code: '# config.py\nGEMINI_API_KEY = "AIza..."   # aistudio.google.com/apikey',
  },
  {
    title: "Point the scraper at a directory",
    detail: "Set SCRAPE_URLS and the CSS selectors to match your target listing site.",
    code: 'SCRAPE_URLS = ["https://www.yellowpages.om/yp/category/construction-companies"]',
  },
  {
    title: "Run the pipeline",
    detail: "Scrape, draft pitches, and export leads.csv — all offline and free.",
    code: "python main.py",
  },
  {
    title: "Review, then send",
    detail: "Open drafted pitches, approve them, and run with --send. Scan the QR once.",
    code: "python main.py --send",
  },
];

export const FREE_TOOLS = [
  { name: "BeautifulSoup", role: "Scraping" },
  { name: "Playwright", role: "JS rendering" },
  { name: "Google Gemini", role: "Free tier LLM" },
  { name: "Groq", role: "Free tier LLM" },
  { name: "SQLite", role: "Storage" },
  { name: "CSV", role: "Export" },
  { name: "WhatsApp Web", role: "Delivery" },
] as const;
