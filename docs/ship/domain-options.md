# Domain options for the Meno website (checked 2026-10-25)

The site is served by GitHub Pages from the `gh-pages` branch at
https://rhoadsjustin.github.io/meno/ (source: `site/`, publish with
`scripts/deploy-site.sh`). This note records what a custom domain would take.
Status was read from the registries' RDAP/WHOIS services on 2026-10-25; it changes
daily, so re-check before buying.

## meno.com — not available

- Registered since **1998-01-07** (registrar Tucows, expires 2027-01-06, status
  `active`, no hold). It is an operating business, not a parked name:
  www.meno.com is the Squarespace site of **Meno Electronics**, a laser-tag
  equipment manufacturer (name servers under genesislasertag.com).
- There is no for-sale listing and no broker record for it. The only path is an
  unsolicited offer, either directly or through a broker (GoDaddy Domain Broker
  Service, Sedo, Afternic). A four-letter dictionary-word .com held by a company
  that uses it typically costs high five to six figures if it sells at all:
  memento.com went for $148,000 at Sedo in 2020
  ([report](https://domaininvesting.com/memento-com-sold-via-sedo-for-148000)),
  and mena.com is listed at $1,020,000
  ([BrandBucket](https://www.brandbucket.com/names/mena)).
- Recommendation: do not chase it for a free app. A single broker inquiry costs
  little if you are curious, but plan around another name.

## meno.app — not available

Registered 2023-08-07 (Tucows, expires 2027-08-07) and in use: www.meno.app is
"MENO | Private Communication", a peer-to-peer messaging product on Vercel. The
`applinks:meno.app` scaffold in `app.config.ts` (commented out) and the
`meno.app/c/<code>` challenge links in `docs/06-gamification-social.md` must move
to whichever domain is chosen.

## Recommended: meno.bible — available

- Unregistered at the .bible registry (RDAP and WHOIS both return no record).
- .bible is run by the American Bible Society. Registrants agree to its code of
  conduct (content consistent with respect for the Bible); a Scripture memory app
  qualifies on its face. No membership or paperwork is required.
- Price varies by registrar: about $42/yr at Dynadot
  ([domaindetails](https://domaindetails.com/tlds/bible)), $69.99 first year and
  $94.99 renewal at 101domain
  ([101domain](https://www.101domain.com/bible-information-help.htm)); some
  resellers charge over $120.
- Reads well in every place it would appear: meno.bible, meno.bible/privacy,
  meno.bible/c/<code> for challenge links.

## Other names checked

| Domain | Status | Notes |
|---|---|---|
| meno.co | registered, **clientHold** | Created 2016 (InternetX); on hold in its auto-renew grace period since 2026-10-21. If the registrant does not pay it could drop around December 2026; a backorder (DropCatch, Dynadot) is possible but not dependable. |
| meno.io | registered | Parked at Afternic (for-sale lander). Aftermarket price, not a registration. |
| meno.dev | registered 2026-04 | Porkbun; no site. |
| meno.so, meno.page, meno.one, meno.life, meno.world, meno.study, meno.church, meno.faith | registered | — |
| getmeno.com, menoapp.com, meno-app.com, trymeno.com, usemeno.com | registered | — |
| menoapp.app, getmeno.app | available | Google's .app TLD, HTTPS enforced. |
| menobible.com, menoscripture.com, hidemeno.com, memorizemeno.com | available | Standard .com pricing. |
| meno.site, meno.space, meno.day | available | Weaker fit. |

## Attaching a custom domain to GitHub Pages

1. Buy the domain (the owner does this; it is a purchase).
2. DNS: for the apex, four `A` records to GitHub Pages (185.199.108.153,
   185.199.109.153, 185.199.110.153, 185.199.111.153) plus `AAAA` records if the
   registrar supports them; for `www`, a `CNAME` to `rhoadsjustin.github.io`.
3. Add the domain to `site/CNAME` (one line), deploy, then in the repo's
   Settings → Pages set the custom domain and tick Enforce HTTPS once the
   certificate is issued. Verify the domain under the account's Pages settings
   first so nobody else can claim it.
4. Update `og:url`, `canonical` and `og:image` in `site/index.html`, the privacy
   policy URL in `store.config.json` and `docs/ship/app-store-listing.md`
   (push with `eas metadata:push`), and the universal-link domain for M8.

Universal links (M8) need `/.well-known/apple-app-site-association` served with a
JSON content type. GitHub Pages serves extensionless files as
`application/octet-stream`, which Apple's CDN may not accept; verify before
relying on it, or serve that one path from Cloudflare, Vercel or Netlify.
