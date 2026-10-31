#!/usr/bin/env python3
"""
Seed a simulator's Meno database for checking Year in the Word (docs/10).

    python3 scripts/seed-wrapped.py --udid <UDID> --profile full    # a whole year, morning persona
    python3 scripts/seed-wrapped.py --udid <UDID> --profile first   # started mid-October, evenings, ESV passage
    python3 scripts/seed-wrapped.py --udid <UDID> --profile thin    # two days: not enough for a recap yet

Every profile turns on the tester preview (settings `wrappedPreview`), so
the Today card and Stats row show out of season. The app must have been
launched once (migrations create the tables). The script quits the app,
replaces all user data, and leaves it closed. Deterministic per profile
and day. Everything is dated in the current year and never after today.
"""
import argparse
import datetime as dt
import os
import random
import sqlite3
import subprocess
import sys

BUNDLE_ID = "com.rhoadsdev.meno"


def db_path(udid):
    try:
        container = subprocess.run(
            ["xcrun", "simctl", "get_app_container", udid, BUNDLE_ID, "data"],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
    except subprocess.CalledProcessError as e:
        sys.exit(f"Meno isn't installed on {udid}: {e.stderr.strip()}")
    path = os.path.join(container, "Documents", "SQLite", "meno.db")
    if not os.path.isfile(path):
        sys.exit("no meno.db yet: launch the app once so its migrations create the tables")
    return path


# goal id, translation, book, chapter, first, last, title, chunk size, status
PROFILES = {
    "full": {
        "start": (2, 3),  # Feb 3
        "hours": (6, 8),  # mornings -> The Morning Watch
        "skip": 0.18,
        "goals": [
            ("w-ps23", "web", "Ps", 23, 1, 6, "Psalm 23", 2, "completed"),
            ("w-john3", "web", "John", 3, 16, 17, "John 3:16–17", 1, "completed"),
            ("w-phil4", "web", "Phil", 4, 4, 13, "Philippians 4:4–13", 2, "active"),
        ],
        "memorized_share": 0.8,
        "speak_share": 0.15,
        "unlocks": 214,
        "badges": ["first_verse", "first_chapter", "perfect_speak", "century_reviews", "dawn_reciter", "steady_30"],
    },
    "first": {
        "start": (10, 12),  # Oct 12
        "hours": (21, 23),  # evenings -> The Night Meditator
        "skip": 0.1,
        "goals": [
            ("w-ps23", "esv", "Ps", 23, 1, 6, "Psalm 23", 2, "active"),
        ],
        "memorized_share": 0.5,
        "speak_share": 0.05,
        "unlocks": 0,
        "badges": ["first_verse"],
    },
    "thin": {
        "start": None,  # two days ending yesterday
        "hours": (12, 13),
        "skip": 0,
        "goals": [
            ("w-john3", "web", "John", 3, 16, 16, "John 3:16", 1, "active"),
        ],
        "memorized_share": 0,
        "speak_share": 0,
        "unlocks": 0,
        "badges": [],
    },
}

LADDER = ["read", "firstLetters", "blanks25", "blanks50", "blanks75", "arrange", "type", "speak"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--udid", required=True)
    ap.add_argument("--profile", choices=sorted(PROFILES), default="full")
    args = ap.parse_args()
    p = PROFILES[args.profile]

    path = db_path(args.udid)
    subprocess.run(["xcrun", "simctl", "terminate", args.udid, BUNDLE_ID], capture_output=True)

    today = dt.date.today()
    rng = random.Random(f"{args.profile}-{today.isoformat()}")
    first_day = (
        dt.date(today.year, *p["start"]) if p["start"] else today - dt.timedelta(days=2)
    )
    days = [first_day + dt.timedelta(days=i) for i in range((today - first_day).days)]
    days = [d for d in days if rng.random() >= p["skip"]] or days

    def ms(day, hour, minute=0):
        return int(dt.datetime.combine(day, dt.time(hour % 24, minute)).timestamp() * 1000)

    con = sqlite3.connect(path)
    cur = con.cursor()
    for table in ("attempts", "reviewItems", "chunks", "goals", "badges", "lockEvents", "streaks", "settings"):
        cur.execute(f"DELETE FROM {table}")

    # goals and chunks; chunks memorize one after another across the year
    chunk_rows = []
    for gi, (gid, tr, book, ch, v1, v2, title, size, status) in enumerate(p["goals"]):
        created = days[min(len(days) - 1, gi * len(days) // max(1, len(p["goals"])))]
        cur.execute(
            "INSERT INTO goals VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (gid, tr, book, ch, v1, book, ch, v2, title, ms(created, 8), None, status, None),
        )
        for idx, start in enumerate(range(v1, v2 + 1, size)):
            end = min(v2, start + size - 1)
            chunk_rows.append((f"{gid}:{tr}:{book}.{ch}.{start}-{end}", gid, idx, book, ch, start, end))

    memorize_count = int(len(chunk_rows) * p["memorized_share"])
    span = max(1, len(days))
    memorized_on = {}
    for i, row in enumerate(chunk_rows):
        cid, gid, idx, book, ch, start, end = row
        mem_day = days[min(span - 1, (i + 1) * span // (len(chunk_rows) + 1))] if i < memorize_count else None
        memorized_on[cid] = mem_day
        cur.execute(
            "INSERT INTO chunks VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            (cid, gid, idx, book, ch, start, book, ch, end,
             6 if mem_day else 2, "memorized" if mem_day else ("learning" if i == memorize_count else "locked"),
             ms(mem_day, p["hours"][0] + 1) if mem_day else None),
        )

    # practice: two to four attempts a day on the chunk being learned, plus reviews
    n = 0
    for day in days:
        learning = next((r for r in chunk_rows if not memorized_on[r[0]] or memorized_on[r[0]] >= day), chunk_rows[-1])
        for k in range(rng.choice((2, 3, 4))):
            mode = "speak" if rng.random() < p["speak_share"] else LADDER[rng.randint(0, 6)]
            hour = rng.randint(*p["hours"])
            cur.execute(
                "INSERT INTO attempts VALUES (?,?,?,?,?,?,?,?)",
                (f"a-{n}", learning[0], mode, round(rng.uniform(0.85, 1.0), 2), rng.randint(45, 180) * 1000,
                 "[]", ms(day, hour, rng.randint(0, 59)), "practice"),
            )
            n += 1
        done = [r for r in chunk_rows if memorized_on[r[0]] and memorized_on[r[0]] < day]
        if done and rng.random() < 0.35:
            cur.execute(
                "INSERT INTO attempts VALUES (?,?,?,?,?,?,?,?)",
                (f"a-{n}", rng.choice(done)[0], "speak" if rng.random() < 0.5 else "type",
                 round(rng.uniform(0.9, 1.0), 2), rng.randint(30, 90) * 1000, "[]",
                 ms(day, p["hours"][1], rng.randint(0, 59)), "review"),
            )
            n += 1

    for i in range(p["unlocks"]):
        day = days[rng.randint(0, len(days) - 1)]
        cur.execute(
            "INSERT INTO lockEvents VALUES (?,?,?,?,?)",
            (f"l-{i}", "reciteSuccess", chunk_rows[0][0], round(rng.uniform(0.9, 1.0), 2), ms(day, 6, rng.randint(0, 59))),
        )

    for i, code in enumerate(p["badges"]):
        day = days[min(len(days) - 1, (i + 1) * len(days) // (len(p["badges"]) + 1))]
        cur.execute("INSERT INTO badges VALUES (?,?,?)", (f"b{i}", code, ms(day, 20)))

    cur.execute("INSERT INTO streaks VALUES (1,?,?,?,1,0)", (3, 12, days[-1].isoformat()))
    cur.executemany(
        "INSERT INTO settings VALUES (?,?)",
        [("onboardingDone", "true"), ("wrappedPreview", "true"), ("focusGoalId", p["goals"][-1][0])],
    )
    con.commit()
    con.close()

    print(f"seeded {path} with profile '{args.profile}'")
    print(f"  {len(days)} active days from {days[0]} to {days[-1]}, {len(chunk_rows)} chunks "
          f"({memorize_count} memorized), {n} attempts, {p['unlocks']} unlocks, {len(p['badges'])} badges")


if __name__ == "__main__":
    main()
