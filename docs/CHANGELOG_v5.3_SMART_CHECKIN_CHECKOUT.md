# StayHub v5.3 – Smart Check-in / Check-out

## Cieľ
Zjednotiť Check-in a Check-out do jednej pracovnej obrazovky pre recepciu.

## Zmeny
- Položka menu ostáva iba `Check-in / Check-out`.
- Obrazovka teraz obsahuje dve sekcie:
  - Príchody / Check-in
  - Odchody / Check-out
- Ubytované osoby majú priamo tlačidlo `Check-out`.
- Po check-oute sa osoba nastaví na `checked_out`.
- Pri poslednej aktívnej osobe v rezervácii sa rezervácia ukončí (`Ukončená`).
- Lôžko sa po refreshi uvoľní vo všetkých výpočtoch obsadenosti.
- Dashboard a kalendár čítajú jednotnú logiku cez Reservation Engine.

## Supabase
Táto verzia nevyžaduje novú migráciu databázy, ak už bola spustená v5.2.1 Database Stabilization.
