-- Demo dáta: 8 izieb po 3 lôžkach
insert into rooms (room_number, floor, capacity, status, price_daily, price_monthly)
values
(1, 'I.NP', 3, 'Trong', 18, 320),
(2, 'I.NP', 3, 'Trong', 18, 320),
(3, 'I.NP', 3, 'Trong', 18, 320),
(4, 'II.NP', 3, 'Trong', 18, 320),
(5, 'II.NP', 3, 'Trong', 18, 320),
(6, 'II.NP', 3, 'Trong', 18, 320),
(7, '0.NP', 3, 'Trong', 16, 300),
(8, '0.NP', 3, 'Trong', 16, 300)
on conflict (room_number) do nothing;

insert into companies (company_name, email, phone, contract_status, monthly_amount)
values ('Demo Firma s.r.o.', 'demo@firma.sk', '+421900000000', 'active', 960)
on conflict do nothing;
