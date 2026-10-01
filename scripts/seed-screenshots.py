#!/usr/bin/env python3
"""
Seed an iOS simulator's Meno database with believable demo data for App Store
screenshots: a Philippians 4 goal part-way through (two chunks memorized, one
learning), a finished Psalm 23, a 24-day streak, two reviews due today, and two
months of practice history for Stats. Everything is dated relative to today, so
re-run it on the day you capture.

    python3 scripts/seed-screenshots.py                 # the "Meno Screenshots 16PM" sim
    python3 scripts/seed-screenshots.py --udid <UDID>

The app must be installed and launched once first (that runs the migrations that
create the tables). The script quits the app, replaces all user data, and leaves
it closed; launch it again to see the seeded state. Deterministic: the same day
always produces the same rows.

Capture afterwards with the status bar pinned:

    xcrun simctl status_bar <UDID> override --time 9:41 --batteryState discharging \\
        --batteryLevel 100 --cellularBars 4 --wifiBars 3
"""
import argparse
import datetime as dt
import json
import os
import random
import sqlite3
import subprocess
import sys

BUNDLE_ID = "com.rhoadsdev.meno"
SCREENSHOT_SIM = "806DF638-71DF-4CAC-A04C-6292E9943C93"  # "Meno Screenshots 16PM", iPhone 16 Pro Max / iOS 26

PHIL = "demo-goal-phil4"
PS23 = "demo-goal-ps23"
STREAK_DAYS = 24


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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--udid", default=SCREENSHOT_SIM)
    args = ap.parse_args()

    path = db_path(args.udid)
    # a running app holds the DB open and would overwrite rows from memory
    subprocess.run(["xcrun", "simctl", "terminate", args.udid, BUNDLE_ID], capture_output=True)

    today = dt.datetime.combine(dt.date.today(), dt.time())  # local midnight
    rng = random.Random(today.toordinal())

    def ms(days, hour=0, minute=0):
        """Epoch ms for local midnight today + `days` (negative = past) at hour:minute."""
        t = today + dt.timedelta(days=days, hours=hour, minutes=minute)
        return int(t.timestamp() * 1000)

    def iso(days):
        return (today + dt.timedelta(days=days)).date().isoformat()

    def chunk_id(goal, osis):
        return f"{goal}:web:{osis}"

    con = sqlite3.connect(path)
    cur = con.cursor()
    for table in ("attempts", "reviewItems", "chunks", "goals", "badges", "lockEvents", "streaks", "settings"):
        cur.execute(f"DELETE FROM {table}")

    # ---------------------------------------------------------------- goals + chunks

    goals = [
        # id, book, chapter, first, last, title, created (days ago), status, challengeId
        (PS23, "Ps", 23, 1, 6, "Psalm 23", -60, "completed", None),
        (PHIL, "Phil", 4, 4, 13, "Philippians 4", -42, "active", "263YTCGX"),
    ]
    for gid, book, ch, v1, v2, title, created, status, challenge in goals:
        cur.execute(
            "INSERT INTO goals VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (gid, "web", book, ch, v1, book, ch, v2, title, ms(created, 8), None, status, challenge),
        )

    chunks = [
        # goal, book, chapter, first, last, tier, status, memorized (days ago)
        (PS23, "Ps", 23, 1, 2, 6, "memorized", -56),
        (PS23, "Ps", 23, 3, 4, 6, "memorized", -52),
        (PS23, "Ps", 23, 5, 6, 6, "memorized", -48),
        (PHIL, "Phil", 4, 4, 5, 6, "memorized", -36),
        (PHIL, "Phil", 4, 6, 7, 6, "memorized", -26),
        (PHIL, "Phil", 4, 8, 9, 3, "learning", None),
        (PHIL, "Phil", 4, 10, 11, -1, "active", None),
        (PHIL, "Phil", 4, 12, 13, -1, "locked", None),
    ]
    order = {}
    for goal, book, ch, v1, v2, tier, status, mem in chunks:
        idx = order[goal] = order.get(goal, -1) + 1
        cur.execute(
            "INSERT INTO chunks VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            (chunk_id(goal, f"{book}.{ch}.{v1}-{v2}"), goal, idx, book, ch, v1, book, ch, v2,
             tier, status, None if mem is None else ms(mem, 20)),
        )

    # ---------------------------------------------------------------- reviews: two due this morning

    reviews = [
        # chunk, interval, repetitions, due (days from today), health
        (chunk_id(PHIL, "Phil.4.4-5"), 4.0, 2, 0, "fading"),
        (chunk_id(PHIL, "Phil.4.6-7"), 6.0, 3, 0, "fresh"),
        (chunk_id(PS23, "Ps.23.1-2"), 12.0, 5, 3, "fresh"),
        (chunk_id(PS23, "Ps.23.3-4"), 14.0, 5, 5, "fresh"),
        (chunk_id(PS23, "Ps.23.5-6"), 16.0, 6, 7, "fresh"),
    ]
    for i, (cid, interval, reps, due, health) in enumerate(reviews):
        cur.execute(
            "INSERT INTO reviewItems VALUES (?,?,?,?,?,?,?,?)",
            (f"ri-{i}", cid, 2.5, interval, reps, ms(due, 7), ms(due - int(interval), 19), health),
        )

    # ---------------------------------------------------------------- practice history

    ladder = ["read", "firstLetters", "blanks25", "blanks50", "blanks75", "arrange", "type", "speak"]

    def learning_chunk(day):
        """Which chunk was being learned on a given day, per the memorized dates above."""
        for goal, book, ch, v1, v2, tier, status, mem in chunks:
            if status != "memorized" or mem >= day:
                return chunk_id(goal, f"{book}.{ch}.{v1}-{v2}")
        return None

    n = 0
    for day in range(-60, 0):
        # sparse at first, then every day for the current streak
        if day < -STREAK_DAYS and rng.random() < 0.3:
            continue
        cid = learning_chunk(day)
        for k in range(rng.choice((2, 3))):
            mode = ladder[min(len(ladder) - 1, (day + 60) % 6 + k)]
            cur.execute(
                "INSERT INTO attempts VALUES (?,?,?,?,?,?,?,?)",
                (f"a-{n}", cid, mode, round(rng.uniform(0.86, 1.0), 2), rng.randint(40, 150) * 1000,
                 "[]", ms(day, 7 + k, rng.randint(0, 50)), "practice"),
            )
            n += 1
        if day % 4 == 0:  # an occasional review of something already memorized
            done = [c for c in chunks if c[6] == "memorized" and c[7] < day]
            if done:
                goal, book, ch, v1, v2, *_ = rng.choice(done)
                cur.execute(
                    "INSERT INTO attempts VALUES (?,?,?,?,?,?,?,?)",
                    (f"a-{n}", chunk_id(goal, f"{book}.{ch}.{v1}-{v2}"), "speak",
                     round(rng.uniform(0.9, 1.0), 2), rng.randint(30, 90) * 1000, "[]", ms(day, 21), "review"),
                )
                n += 1

    # ---------------------------------------------------------------- streak, badges, lock history

    # last active yesterday: the streak is alive and today's practice is still to do
    cur.execute("INSERT INTO streaks VALUES (1,?,?,?,1,0)", (STREAK_DAYS, STREAK_DAYS, iso(-1)))

    for i, (code, day) in enumerate([("first_verse", -56), ("first_chapter", -48), ("perfect_speak", -30)]):
        cur.execute("INSERT INTO badges VALUES (?,?,?)", (f"b{i}", code, ms(day, 20)))

    m = 0
    for day in range(-21, 0):
        for _ in range(rng.randint(1, 3)):
            # the escape hatch gets used now and then (about 1 in 15), never zero
            kind = "override" if (m // 2) % 15 == 7 else "reciteSuccess"
            at = ms(day, rng.randint(7, 21), rng.randint(0, 59))
            cur.execute("INSERT INTO lockEvents VALUES (?,?,?,?,?)", (f"l-{m}", "shielded", None, None, at))
            cur.execute(
                "INSERT INTO lockEvents VALUES (?,?,?,?,?)",
                (f"l-{m + 1}", kind, chunk_id(PHIL, "Phil.4.6-7"),
                 round(rng.uniform(0.88, 1.0), 2) if kind == "reciteSuccess" else None, at + 30_000),
            )
            m += 2

    cur.executemany(
        "INSERT INTO settings VALUES (?,?)",
        [("onboardingDone", "true"), ("focusGoalId", PHIL)],
    )
    con.commit()
    con.close()

    print(f"seeded {path}")
    print(f"  2 goals, {len(chunks)} chunks, {n} attempts, {len(reviews)} review items (2 due today), "
          f"{STREAK_DAYS}-day streak, {m} lock events")


if __name__ == "__main__":
    main()
