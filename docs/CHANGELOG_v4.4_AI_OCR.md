# StayHub v4.4 – Simple AI OCR

- Modul Dokumenty premenovaný na **AI OCR**.
- Zachovaný jednoduchý upload do private Supabase Storage.
- Pridané tlačidlo **AI OCR** pri nahratom scane.
- OCR predvyplní číslo dokladu, meno, dátum vydania, dátum platnosti a poznámku.
- Pridaný backend endpoint `/api/documents/ocr`.
- Ak je nastavený `OPENAI_API_KEY`, používa sa AI OCR pre obrázky.
- Ak API kľúč nie je nastavený, endpoint vráti bezpečný fallback bez pádu aplikácie.

Poznámka: PDF OCR bude ďalšia fáza; v4.4 je optimalizované najmä pre fotky/scany z mobilu.
