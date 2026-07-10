# StayHub v3.8.3 Enterprise

## Added
- Kalendár obsadenosti po lôžkach na 14 dní
- Modul Dokumenty: pas, OP, pobyt, pracovné povolenie, zmluva, GDPR
- Expirácie dokumentov do 30 dní
- Reporty: platby, dlžníci, firmy podľa obratu, aktívne osoby
- CSV export platieb
- CSV export pre cudzineckú políciu
- Generovanie zmluvy o ubytovaní do tlače/PDF cez prehliadač
- SQL upgrade `docs/stayhub_v3_8_3_upgrade.sql`

## Notes
- Pred deployom spusti SQL upgrade, ak ešte nemáš tabuľku `documents`.
- SQL je idempotentný a bezpečný na opakované spustenie.
