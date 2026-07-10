# StayHub v6.2 – Smart Check-in / AI OCR

Type: APP ONLY

## Pridané / zjednotené

- Smart Check-in workflow priamo v obrazovke Check-in / Check-out.
- Výber rezervácie a osoby/lôžka z pridelených lôžok rezervácie.
- Prepínač dokladu: Pas / Občiansky preukaz.
- Upload alebo fotenie dokladu z mobilu.
- Link `Skontrolovať fotku` po nahratí dokladu.
- Tlačidlo `AI OCR` s napojením na backend `/api/documents/ocr`.
- Predvyplnenie údajov: meno, priezvisko, číslo dokladu, národnosť, dátumy.
- Uloženie dokumentu do Supabase Storage bucketu `stayhub-documents`.
- Vytvorenie / aktualizácia osoby v `checkin_persons`.
- Priradenie lôžka a nastavenie osoby na `checked_in`.
- Po uložení sa spustí workflow sync, aby sa aktualizovali rezervácie, lôžka, dashboard a kalendár.

## Supabase

Nová SQL migrácia nie je potrebná, ak už boli spustené migrácie v5.2.1 a hotfix `checked_out_at`.

## Vercel ENV

Pre funkčné OCR musí byť vo Verceli nastavené:

- `OPENAI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Voliteľne:

- `OPENAI_OCR_MODEL`

Default model je `gpt-4.1-mini`.
