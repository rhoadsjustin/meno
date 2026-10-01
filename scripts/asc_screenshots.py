#!/usr/bin/env python3
"""
Upload the App Store screenshots in store/screenshots/ to the editable version in
App Store Connect. `eas metadata:push` handles the listing text but not media; this
fills that gap.

    python3 scripts/asc_screenshots.py --plan     # what is on disk, no network, no key
    python3 scripts/asc_screenshots.py --check    # what ASC already has, read-only
    python3 scripts/asc_screenshots.py --replace  # swap ASC's screenshots for the ones on disk

Needs an App Store Connect API key (App Manager or Admin role) from
Users and Access -> Integrations -> App Store Connect API:

    export ASC_ISSUER_ID=...                  # Issuer ID shown above the keys table
    export ASC_KEY_ID=...                     # Key ID of the key
    export ASC_KEY_PATH=~/AuthKey_XXXX.p8

The key file stays where it is; the script only reads it to sign short-lived request
tokens with the system `openssl`, so the one Python dependency is `requests`.

store/screenshots/6.9/ (1320x2868 or 1290x2796, portrait) goes to Apple's APP_IPHONE_67
slot, which is the only iPhone set Apple requires; store/screenshots/6.5/ is optional and
goes to APP_IPHONE_65. Uploading is additive, so a slot that already holds screenshots is
left alone unless --replace is passed, which deletes what is there first. Files upload in
filename order and that order is written back to the set, so 01-… is the first
screenshot a customer sees.
"""
import argparse
import base64
import hashlib
import json
import os
import subprocess
import sys
import time

import requests

API = "https://api.appstoreconnect.apple.com"
BUNDLE_ID = "com.rhoadsdev.meno"
LOCALE = "en-US"

SHOTS = os.path.join(os.path.dirname(__file__), "..", "store", "screenshots")
# local directory -> Apple's display-type slot, and the portrait pixel sizes Apple accepts there
SLOTS = [
    ("6.9", "APP_IPHONE_67", {(1320, 2868), (1290, 2796)}),
    ("6.5", "APP_IPHONE_65", {(1284, 2778), (1242, 2688)}),
]
# version states whose metadata can still be edited
EDITABLE = {
    "PREPARE_FOR_SUBMISSION",
    "DEVELOPER_REJECTED",
    "REJECTED",
    "METADATA_REJECTED",
    "INVALID_BINARY",
    "WAITING_FOR_EXPORT_COMPLIANCE",
}


# ---------------------------------------------------------------- API client


def b64url(raw):
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def der_to_raw(der, size=32):
    """openssl emits an ASN.1 DER ECDSA signature; JWT's ES256 wants r||s, 32 bytes each."""
    assert der[0] == 0x30, "unexpected signature encoding"
    i = 3 if der[1] & 0x80 else 2  # skip SEQUENCE header (long-form length never exceeds 1 byte here)
    out = b""
    for _ in range(2):
        assert der[i] == 0x02, "unexpected signature encoding"
        n = der[i + 1]
        out += der[i + 2 : i + 2 + n].lstrip(b"\x00").rjust(size, b"\x00")
        i += 2 + n
    return out


def make_token(issuer, key_id, key_path):
    """A 15-minute ES256 JWT, the shape the App Store Connect API accepts."""
    header = {"alg": "ES256", "kid": key_id, "typ": "JWT"}
    now = int(time.time())
    claims = {"iss": issuer, "iat": now, "exp": now + 15 * 60, "aud": "appstoreconnect-v1"}
    signing_input = f"{b64url(json.dumps(header).encode())}.{b64url(json.dumps(claims).encode())}"
    der = subprocess.run(
        ["openssl", "dgst", "-sha256", "-sign", key_path],
        input=signing_input.encode(),
        capture_output=True,
        check=True,
    ).stdout
    return f"{signing_input}.{b64url(der_to_raw(der))}"


class Client:
    def __init__(self):
        missing = [v for v in ("ASC_ISSUER_ID", "ASC_KEY_ID", "ASC_KEY_PATH") if not os.environ.get(v)]
        if missing:
            sys.exit(f"set {', '.join(missing)} first (see the top of this file)")
        self.issuer = os.environ["ASC_ISSUER_ID"]
        self.key_id = os.environ["ASC_KEY_ID"]
        self.key_path = os.path.expanduser(os.environ["ASC_KEY_PATH"])
        if not os.path.isfile(self.key_path):
            sys.exit(f"ASC_KEY_PATH does not point at a file: {self.key_path}")
        self.token, self.minted = None, 0

    def headers(self):
        # re-mint well before the 15-minute expiry so a long upload never 401s midway
        if not self.token or time.time() - self.minted > 10 * 60:
            self.token, self.minted = make_token(self.issuer, self.key_id, self.key_path), time.time()
        return {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}

    def req(self, method, path, **kw):
        url = path if path.startswith("http") else API + path
        r = requests.request(method, url, headers=self.headers(), timeout=60, **kw)
        if r.status_code >= 400:
            sys.exit(f"{method} {path} -> {r.status_code}\n{r.text[:600]}")
        return r.json() if r.content else {}

    def get_all(self, path):
        """Follow `links.next` so lists longer than one page come back whole."""
        out, url = [], path
        while url:
            page = self.req("GET", url)
            out += page.get("data", [])
            url = page.get("links", {}).get("next")
        return out

    def post(self, type_, attributes, relationships):
        rels = {name: {"data": {"type": t, "id": i}} for name, (t, i) in relationships.items()}
        body = {"data": {"type": type_, "attributes": attributes, "relationships": rels}}
        return self.req("POST", f"/v1/{type_}", json=body)["data"]


# ---------------------------------------------------------------- local files


def local_sets():
    """[(label, display_type, accepted sizes, [paths in upload order])] for every slot on disk."""
    out = []
    for label, display, sizes in SLOTS:
        d = os.path.join(SHOTS, label)
        if not os.path.isdir(d):
            print(f"  ({os.path.normpath(d)} missing, skipped)")
            continue
        files = sorted(f for f in os.listdir(d) if f.lower().endswith(".png"))
        out.append((label, display, sizes, [os.path.join(d, f) for f in files]))
    return out


def png_size(path):
    """Width/height straight out of the PNG IHDR, so this stays dependency-free."""
    with open(path, "rb") as f:
        head = f.read(24)
    if head[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    return int.from_bytes(head[16:20], "big"), int.from_bytes(head[20:24], "big")


# ---------------------------------------------------------------- ASC lookups


def state_of(version):
    a = version["attributes"]
    return a.get("appStoreState") or a.get("appVersionState") or "UNKNOWN"


def find_version(c, bundle_id):
    apps = c.get_all(f"/v1/apps?filter[bundleId]={bundle_id}")
    if not apps:
        sys.exit(f"no app in App Store Connect with bundle id {bundle_id}")
    app = apps[0]
    versions = c.get_all(f"/v1/apps/{app['id']}/appStoreVersions?filter[platform]=IOS")
    editable = [v for v in versions if state_of(v) in EDITABLE]
    if not editable:
        states = ", ".join(f"{v['attributes'].get('versionString')}={state_of(v)}" for v in versions[:5]) or "none"
        sys.exit(f"no editable iOS version to upload to (found: {states})")
    editable.sort(key=lambda v: state_of(v) != "PREPARE_FOR_SUBMISSION")
    return app, editable[0]


def find_localization(c, version_id, create):
    for loc in c.get_all(f"/v1/appStoreVersions/{version_id}/appStoreVersionLocalizations"):
        if loc["attributes"]["locale"] == LOCALE:
            return loc["id"]
    if not create:
        sys.exit(f"no {LOCALE} localization on that version")
    print(f"  creating the {LOCALE} localization")
    return c.post("appStoreVersionLocalizations", {"locale": LOCALE}, {"appStoreVersion": ("appStoreVersions", version_id)})["id"]


def find_set(c, loc_id, display, create):
    for s in c.get_all(f"/v1/appStoreVersionLocalizations/{loc_id}/appScreenshotSets"):
        if s["attributes"]["screenshotDisplayType"] == display:
            return s["id"]
    if not create:
        return None
    print(f"  creating the {display} set")
    return c.post(
        "appScreenshotSets",
        {"screenshotDisplayType": display},
        {"appStoreVersionLocalization": ("appStoreVersionLocalizations", loc_id)},
    )["id"]


# ---------------------------------------------------------------- upload


def upload(c, set_id, path):
    """Reserve, send the parts Apple asks for, then commit with the checksum it verifies."""
    with open(path, "rb") as f:
        blob = f.read()
    shot = c.post(
        "appScreenshots",
        {"fileName": os.path.basename(path), "fileSize": len(blob)},
        {"appScreenshotSet": ("appScreenshotSets", set_id)},
    )
    for op in shot["attributes"]["uploadOperations"]:
        headers = {h["name"]: h["value"] for h in op.get("requestHeaders", [])}
        part = blob[op["offset"] : op["offset"] + op["length"]]
        r = requests.request(op["method"], op["url"], data=part, headers=headers, timeout=180)
        if r.status_code >= 400:
            sys.exit(f"upload part failed for {os.path.basename(path)}: {r.status_code} {r.text[:300]}")
    c.req(
        "PATCH",
        f"/v1/appScreenshots/{shot['id']}",
        json={
            "data": {
                "type": "appScreenshots",
                "id": shot["id"],
                "attributes": {"uploaded": True, "sourceFileChecksum": hashlib.md5(blob).hexdigest()},
            }
        },
    )
    return shot["id"]


def wait_processed(c, ids):
    """Apple validates size and transparency after the commit; surface anything it rejects."""
    pending = list(ids)
    for _ in range(20):
        still = []
        for sid in pending:
            data = c.req("GET", f"/v1/appScreenshots/{sid}")["data"]
            delivery = data["attributes"].get("assetDeliveryState") or {}
            state = delivery.get("state")
            if state == "COMPLETE":
                continue
            if state == "FAILED":
                print(f"  ! {data['attributes'].get('fileName')} rejected: {delivery.get('errors')}")
                continue
            still.append(sid)
        pending = still
        if not pending:
            return
        time.sleep(3)
    print(f"  ({len(pending)} still processing; check App Store Connect in a minute)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--plan", action="store_true", help="list what is on disk and exit (no network, no key needed)")
    ap.add_argument("--check", action="store_true", help="report what the version already has, upload nothing")
    ap.add_argument("--replace", action="store_true", help="delete the screenshots already in a slot before uploading")
    ap.add_argument("--bundle-id", default=BUNDLE_ID)
    args = ap.parse_args()

    sets = local_sets()
    bad = False
    for label, display, sizes, paths in sets:
        print(f"{label} -> {display}  ({len(paths)} files)")
        if not paths:
            print("    (no .png files)")
        for p in paths:
            got = png_size(p)
            want = " or ".join(f"{w}x{h}" for w, h in sorted(sizes))
            flag = "" if got in sizes else f"   ! is {'not a PNG' if got is None else f'{got[0]}x{got[1]}'}, Apple wants {want}"
            bad = bad or bool(flag)
            print(f"    {os.path.basename(p)}{flag}")
        if len(paths) > 10:
            print("    ! Apple allows at most 10 screenshots per slot")
            bad = True
    if not args.check and not any(paths for *_, paths in sets):
        sys.exit("\nnothing to upload: put PNGs in store/screenshots/6.9/")
    if bad:
        sys.exit("\nfix the files above first")
    if args.plan:
        return

    c = Client()
    app, version = find_version(c, args.bundle_id)
    print(f"\n{app['attributes']['name']}  version {version['attributes'].get('versionString')}  [{state_of(version)}]")
    loc_id = find_localization(c, version["id"], create=not args.check)

    # --check reports every slot, even ones with nothing on disk yet
    if args.check:
        slots = [(label, display, sizes, []) for label, display, sizes in SLOTS]
    else:
        slots = [s for s in sets if s[3]]
    for label, display, sizes, paths in slots:
        set_id = find_set(c, loc_id, display, create=not args.check)
        if set_id is None:
            print(f"  {display}: empty (no set yet)")
            continue
        existing = c.get_all(f"/v1/appScreenshotSets/{set_id}/appScreenshots")
        listing = "".join(f"\n    - {s['attributes'].get('fileName')}" for s in existing)
        print(f"  {display}: {len(existing)} already there{listing}")
        if args.check:
            continue
        if existing and not args.replace:
            print("    leaving it alone; pass --replace to overwrite")
            continue
        for s in existing:
            c.req("DELETE", f"/v1/appScreenshots/{s['id']}")
        ids = []
        for p in paths:
            print(f"    uploading {os.path.basename(p)}")
            ids.append(upload(c, set_id, p))
        # write the order back, so 01-… is the first screenshot on the product page
        c.req(
            "PATCH",
            f"/v1/appScreenshotSets/{set_id}/relationships/appScreenshots",
            json={"data": [{"type": "appScreenshots", "id": i} for i in ids]},
        )
        wait_processed(c, ids)

    print("\ndone" if not args.check else "\n(read-only check, nothing changed)")


if __name__ == "__main__":
    main()
