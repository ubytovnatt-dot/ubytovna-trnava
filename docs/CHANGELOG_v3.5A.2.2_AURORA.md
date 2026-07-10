# StayHub v3.5A.2.2 – Aurora Timeline Date Fix

## Opravené

- Timeline už neťahá blok rezervácie podľa pôvodného dlhého termínu, ak je rezervácia v stave Check-in a existuje reálny check-in záznam osoby.
- Reálny pobyt osoby má prioritu pred rezerváciou na rovnakom lôžku a rovnakej rezervácii.
- Segment osoby používa `expected_checkout_date`, takže napríklad pobyt 26.06.–28.06. sa zobrazí iba na tieto dni.
- Odstránené falošné konflikty typu rezervácia + osoba na tom istom lôžku v rámci tej istej rezervácie.

## Poznámka

Ak je rezervácia ešte bez check-in osoby, Aurora stále zobrazuje plánovaný rozsah rezervácie podľa `check_in_date` a `check_out_date`.
