# StayHub v3.6 – Clean Product Branding

Fix pre check-in kapacitu a duplicity.

## Opravené
- kontrola kapacity pri check-ine: už nemôže vzniknúť 22/10,
- prehľad voľných miest pri check-ine,
- automatické uzamknutie po naplnení kapacity,
- zobrazenie 0/10, 5/10, 10/10 podľa jedinečných lôžok,
- backend validácia, že check-in osoba patrí iba k pridelenému lôžku rezervácie,
- backend už nevytvára duplicitný check-in na rovnaké lôžko; existujúci záznam aktualizuje.

SQL netreba púšťať.
