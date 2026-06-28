# StayHub v5.2.1 – Database Stabilization

## Čo táto verzia robí

Táto verzia nemení existujúci dátový model od základov. Stabilizuje tvoju aktuálnu databázu:

- zachováva `bookings` ako hlavnú tabuľku rezervácií,
- používa existujúce `checkin_persons`, `documents`, `rooms`, `companies`, `payments`,
- pridáva stabilné `bed_id` do `checkin_persons`,
- dopĺňa OCR polia pre budúci Check-in OCR,
- vytvára SQL views pre aktuálnu obsadenosť,
- používa existujúci Storage bucket `stayhub-documents`.

## Presný postup v Supabase

### 1. Pred spustením

Uisti sa, že už existuje tabuľka `beds`. Ak si predtým spustil prvú časť migrácie a máš 25 lôžok, je to v poriadku.

### 2. Spusti iba tento súbor

V Supabase otvor:

`SQL Editor → New Query`

Skopíruj celý obsah súboru:

`supabase/migrations/20260628_stayhub_v5_2_1_database_stabilization.sql`

Potom klikni `Run`.

### 3. Nespúšťaj staršie migrácie

Nespúšťaj znova tieto súbory:

- `20260627_stayhub_v4_1_documents_storage.sql`
- `20260627_stayhub_v4_2_document_center_private_bucket.sql`
- `20260627_stayhub_v5_1_core_architecture.sql`
- `20260628_stayhub_v5_2_reservation_engine_refactor.sql`

Dôvod: časť zmien už v databáze máš a nechceme riskovať konflikt.

### 4. Overenie po spustení

V SQL Editore spusti:

```sql
select count(*) as beds_total from public.beds;
```

Očakávaný výsledok: približne `25`.

Potom:

```sql
select count(*) as persons_total,
       count(bed_id) as persons_with_bed_id
from public.checkin_persons;
```

`persons_with_bed_id` má byť väčšie ako 0, ak už máš check-in osoby s izbou a posteľou.

Potom:

```sql
select * from public.v_stayhub_bed_occupancy_today limit 20;
```

Toto musí vrátiť zoznam postelí s hodnotami `occupied_now` a `reserved_today`.

## Ak nastane chyba

Nič nemaž ručne. Skopíruj presnú chybu zo Supabase a pošli ju späť do chatu.

## Deploy na Vercel

Po úspešnej migrácii:

1. nahraj ZIP na GitHub alebo Vercel,
2. skontroluj env premenné:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` iba pre server/API,
3. sprav nový deploy.
