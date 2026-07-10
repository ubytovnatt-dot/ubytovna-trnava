# StayHub v6.4.0 – Security & Fixes

Vychádza z auditu zo 7. 7. 2026. Zmeny oproti v6.3.3-lts:

## Bezpečnosť (kritické)
- RLS lockdown (supabase/migrations/20260707_01_rls_lockdown.sql): zavrie anonymný prístup k DB
  cez publishable/anon kľúč (predtým sa dali čítať aj zapisovať všetky tabuľky vrátane osobných
  údajov hostí). Opravuje aj otvorené RLS na payments. Spusti v Supabase ako prvé.
- Anti dvojrezervácia (supabase/migrations/20260707_02_bed_double_booking_guard.sql): DB trigger
  odmietne to isté lôžko v prekrývajúcom sa termíne aj pri súbehu.
- CORS obmedzený na povolené domény (env CORS_ALLOWED_ORIGINS) namiesto origin: true.
- Fail-closed rola: pri zlyhaní profilu sa priradí viewer (len čítanie), nie reception.

## Opravy
- Backend guest_name: dopĺňa sa na serveri (firemná rezervácia nespadne na NOT NULL).
- Dashboard: dlaždica Voľné lôžka počíta kapacitu robustne (koniec "0 z 0").
- i18n: menu/sidebar surová slovenčina + translateDom -> menu sa už prekladá so zvyškom.

## Po nasadení
1. Supabase SQL Editor: 01_rls_lockdown.sql, potom 02_bed_double_booking_guard.sql.
2. Vercel env: CORS_ALLOWED_ORIGINS (voliteľné, má default).
3. npm install && npm run build a deploy.

## v6.4.1 – UX
- Rezervačný formulár: možnosť pridať novú firmu priamo pri vytváraní rezervácie (Typ = "+ Nová firma": názov + nepovinné IČO; firma sa uloží a rovno použije). Osoba bola dostupná už predtým.

## v6.4.2 – deploy fix
- Pridaný .npmrc (registry=registry.npmjs.org) — Vercel inštalácia serverless API funkcie padala na internom proxy registri (ETIMEDOUT na picomatch). Toto ju smeruje na npmjs.org.

## v6.4.3 – deploy fix (izolovane API deps)
- Pridany api/package.json len s runtime zavislostami (express, cors, @supabase/supabase-js). Vercel tak pre serverless funkciu neinstaluje devDependencies (vite/tailwind), cim sa uz neťaha picomatch a druha instalacia nepada na internom proxy registri.

## v6.4.4 – dashboard cisla
- translateDom uz nezasahuje do cisto ciselnych textovych uzlov (ceny, pocty). Predtym si zacachoval pociatocnu "0" a po dotiahnuti dat ju vratil spat, takze dashboard cisla padali na 0 az do prepnutia tabu.

## v6.4.5 – sprístupnenie menu
- Do navigácie a rolí pridané záložky Izby (rooms) a Reporty (reports). Predtým boli komponenty v kóde, ale bez cesty z menu — vrátane exportu cudzineckej polície CSV, exportu platieb a tlače zmluvy. Recepcia má teraz prístup k Reportom (hlásenie polície), správu izieb admin/manager/housekeeping.

## v6.4.6 – mobil: navigacia prekryvala Ulozit
- Modal (dialog) mal nizsi z-index (50) nez fixna spodna navigacia (95), takze na mobile nav prekryvala tlacidla Ulozit/Zrusit. Zvyseny z-index modalu na 130 + pri otvorenom modale sa spodna navigacia skryje.

## v6.4.7 – oneskoreny check-out
- Odstranene pravidlo, ktore blokovalo check-out po poslednom dni rezervacie ("Check-out je mozny najneskor..."). Prespanie / zabudnuty odhlas sa uz da odhlasit; luzko sa uvolni. Kontrola "nie pred zaciatkom rezervacie" ostava.
- Rezervaciu s ubytovanymi hostami uz nemozno zmazat (predtym hostia osireli). Najprv treba check-out.

## v6.4.8 – zrusene AI OCR
- Odstranene AI OCR z check-inu (tlacidlo aj backend endpoint /api/documents/ocr vrati 410). Doklady sa uz NEPOSIELAJU do OpenAI (riesi GDPR bod z auditu).
- Ostava: odfotenie/nahranie fotky dokladu -> ulozi sa do Supabase uloziska; udaje (meno, cislo dokladu...) sa vyplnaju rucne.

## v6.4.9 – vykon
- translateDom sa spusta len pri zmene jazyka/tabu/po nacitani (nie pri kazdej zmene dat) + pri slovencine preskocene prehladavanie DOM. Vyrazne mensia zataz UI.
- workflow/sync bezi na pozadi (uz neblokuje kazde nacitanie/obnovu).
