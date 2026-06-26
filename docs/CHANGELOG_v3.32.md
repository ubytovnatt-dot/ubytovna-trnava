# StayHub v3.32 – Clean Localization + Administration Reset

- Clean i18n layer: SK/EN/VI are separated.
- SK remains Slovak, EN English, VI Vietnamese.
- Pricing labels: SK deň/mesiac, EN day/month, VI ngày/tháng.
- DB pricing values normalized to daily/monthly.
- Added Settings → Administration → Factory Reset (Test Mode).

Recommended SQL cleanup:

```sql
update public.bookings set pricing_model = 'daily' where lower(coalesce(pricing_model, '')) in ('deň','den','day','daily','ngày','ngay');
update public.bookings set pricing_model = 'monthly' where lower(coalesce(pricing_model, '')) in ('mesiac','mesac','month','monthly','tháng','thang');
update public.bookings set pricing_model = 'daily' where pricing_model is null or trim(pricing_model) = '';
```
