# StayHub v6.3 – Payment Workspace

Type: APP ONLY

## Supabase
Netreba spúšťať žiadny SQL súbor.

Táto verzia používa existujúce tabuľky:
- `bookings`
- `payments`
- `companies`

## Deploy
1. Nahraj ZIP do GitHubu alebo nahraď obsah projektu.
2. Neposielaj `node_modules` ani `dist`.
3. Vo Verceli spusti Redeploy.

## Čo testovať
1. Otvor menu `Platby`.
2. Skontroluj karty: Cena spolu / Zaplatené / Zostáva / Po splatnosti.
3. Vyber rezerváciu s dlhom.
4. Klikni `+ Platba`.
5. Ulož úhradu.
6. Over, že sa zmení `Zaplatené` a `Zostáva`.
7. Obnov stránku a skontroluj, že stav zostal správny.

## Poznámka
Payment Workspace prepočítava dlh z `bookings.total_price` a súčtu zaplatených platieb v `payments`.
