# Inštalácia v5.4.1

1. Nahraj ZIP do GitHubu alebo nahraď aktuálny projekt.
2. Vo Verceli skontroluj Environment Variables:
   - `OPENAI_API_KEY` – povinné pre reálne AI OCR
   - `SUPABASE_SERVICE_ROLE_KEY` – povinné pre upload do Supabase Storage
   - `SUPABASE_DOCUMENTS_BUCKET=stayhub-documents` – voliteľné, default je `stayhub-documents`
3. Redeploy projektu vo Verceli.
4. Supabase migrácia nie je potrebná.
