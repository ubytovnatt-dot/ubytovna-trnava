# StayHub v3.5A.2 – Aurora Interactive Timeline

## Hlavný cieľ
Interaktívna timeline vrstva nad Aurora Calendar bez zásahu do pôvodných modulov StayHub.

## Opravené
- Opravené chybné radenie obsadenosti izieb/lôžok podľa dátumu check-in.
- Rezervácie aj ubytované osoby sa normalizujú a triedia chronologicky podľa check-in dátumu.
- Pri rovnakom check-in dátume sa používa check-out a kód rezervácie ako stabilný fallback.

## Pridané
- Timeline teraz kreslí rezervácie ako súvislé časové bloky cez viac dní.
- Každý blok zobrazuje názov hosťa/firmy a rozsah check-in → check-out.
- Hover efekt pre rýchle čítanie detailu rezervácie.
- Prekrývajúce segmenty na rovnakom lôžku sa zvýraznia ako konflikt.
- Lôžka sa v timeline zoraďujú podľa najbližšieho check-in dátumu, potom podľa čísla izby a lôžka.

## Stav
Read-only Interactive Timeline. Drag & drop úprava dátumov bude ďalšia fáza.
