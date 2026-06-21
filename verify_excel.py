# -*- coding: utf-8 -*-
import openpyxl, os
f = 'Opus_Pulse_TNM_vs_Outcome_Model.xlsx'
wb = openpyxl.load_workbook(f)

info = wb['Information']
info_formulas = [c.coordinate for row in info.iter_rows() for c in row
                 if isinstance(c.value, str) and c.value.startswith('=')]
print('Information formula cells (must be 0):', len(info_formulas), info_formulas[:5])

bad = [(s.title, c.coordinate) for s in wb.worksheets for row in s.iter_rows() for c in row
       if isinstance(c.value, str) and c.value.startswith('=') and any(ord(ch) > 127 for ch in c.value)]
print('Non-ASCII formulas (must be 0):', len(bad))
print('Total charts:', sum(len(s._charts) for s in wb.worksheets))
print('Size KB:', round(os.path.getsize(f) / 1024, 1))

# Independent recompute of the model logic
USD = chr(36)
days = 365 - 104 - 10 - 21
hpd = 8; hy = days * hpd; hm = hy / 12
team = [('Sr Dev', 3, 28), ('Sr Dev', 2, 30), ('TL', 1, 35), ('Sr QA', 1, 28), ('Lead QA', 2, 35), ('PO', 1, 37)]
sum_cr = sum(cnt * rate for _, cnt, rate in team)
hc = sum(cnt for _, cnt, _ in team)
R = sum_cr * hm; Ry = sum_cr * hy
exp_m = 24000 + 2500 + 1200 + 700; exp_y = exp_m * 12 + 6000; C = exp_y / 12
print(f'Billable days={days}  hrs/yr={hy:.0f}  hrs/mo={hm:.2f}  headcount={hc}')
print(f'TNM billing: monthly={USD}{R:,.0f}  yearly={USD}{Ry:,.0f}  margin={(Ry-exp_y)/Ry:.1%}')
print(f'Monthly cost C={USD}{C:,.0f}')
res = 0.20; spm = 2; eff = 0.18; dis = 0.07; minsp = 120
for name, pp in [('Case1(7SP)', 7), ('Case2(8SP)', 8)]:
    msp = pp * hc * (1 - res) * spm
    be = R / msp; rec = be * (1 - dis); bill = rec * msp; ocost = C / (1 + eff)
    tnm_m = (R - C) / R; out_m = (bill - ocost) / bill
    extra = ((bill - ocost) - (R - C)) * 12; csave = (R - bill) * 12
    ww = 'YES' if (bill < R and (bill - ocost) >= (R - C)) else 'No'
    print(f'{name}: deliv={msp:.0f}SP meets120={msp>=minsp} breakeven={USD}{be:.0f} rec={USD}{rec:.0f} '
          f'bill={USD}{bill:,.0f}/mo TNMmargin={tnm_m:.1%} OUTmargin={out_m:.1%} '
          f'OpusExtra/yr={USD}{extra:,.0f} ClientSave/yr={USD}{csave:,.0f} WINWIN={ww}')
