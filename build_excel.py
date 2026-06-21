# -*- coding: utf-8 -*-
"""
Opus Pulse - TNM -> Outcome conversion model (styled, formula-driven workbook).
All YELLOW cells are inputs; everything else is a live formula. Charts read from
formula cells so they redraw on any change.
"""
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.chart import BarChart, PieChart, Reference
from openpyxl.chart.label import DataLabelList

# ── palette ─────────────────────────────────────────────────────────────────
PRIMARY="1F4E79"; ACCENT="2E75B6"; BAND="DDEBF7"; LIGHT="F4F9FD"
YELLOW="FFF2CC"; GREEN="C6EFCE"; GREENBAND="E2EFDA"; GREY="EFEFEF"; WHITE="FFFFFF"
INK="1F2937"; MUTE="6E7781"
thin = Side(style="thin", color="BFD3E6")
border = Border(left=thin, right=thin, top=thin, bottom=thin)
F_TITLE=Font(bold=True,size=18,color=WHITE)
F_SUB=Font(italic=True,size=10,color=BAND)
F_SEC=Font(bold=True,size=11,color=WHITE)
F_HDR=Font(bold=True,size=10,color=WHITE)
F_BOLD=Font(bold=True,color=INK)
F_MUTE=Font(italic=True,size=9,color=MUTE)
F_BIG=Font(bold=True,size=16,color=PRIMARY)
F_BIGW=Font(bold=True,size=15,color=WHITE)
MONEY='$#,##0'; MONEY2='$#,##0.00'; PCT='0.0%'; NUM='#,##0'; NUM1='#,##0.0'

wb = Workbook()

def W(ws, c, w): ws.column_dimensions[c].width = w
def put(ws, ref, val, *, font=None, fill=None, fmt=None, ha=None, bd=False, wrap=False, va="center"):
    cl = ws[ref]; cl.value = val
    if font: cl.font = font
    if fill: cl.fill = PatternFill("solid", fgColor=fill)
    if fmt: cl.number_format = fmt
    cl.alignment = Alignment(horizontal=ha, vertical=va, wrap_text=wrap, indent=1 if ha=="left" else 0)
    if bd: cl.border = border
    return cl
def banner(ws, last_col, title, subtitle):
    ws.merge_cells(f"A1:{last_col}1"); ws.merge_cells(f"A2:{last_col}2")
    put(ws, "A1", title, font=F_TITLE, fill=PRIMARY, ha="left")
    put(ws, "A2", subtitle, font=F_SUB, fill=PRIMARY, ha="left")
    ws.row_dimensions[1].height=30; ws.row_dimensions[2].height=18
def section(ws, row, last_col, text):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=last_col)
    put(ws, f"A{row}", text, font=F_SEC, fill=ACCENT, ha="left")
    ws.row_dimensions[row].height=19
def headers(ws, row, cols, start=1):
    for i,t in enumerate(cols):
        c=ws.cell(row=row, column=start+i, value=t)
        c.font=F_HDR; c.fill=PatternFill("solid",fgColor=PRIMARY); c.border=border
        c.alignment=Alignment(horizontal="center", vertical="center", wrap_text=True)
def style_bar(ch, colors, pct=False):
    ch.style=10; ch.height=7.2; ch.width=11
    for i,s in enumerate(ch.series):
        if i < len(colors): s.graphicalProperties.solidFill=colors[i]
    ch.dataLabels=DataLabelList(); ch.dataLabels.showVal=True; ch.dataLabels.numFmt='0%' if pct else '$#,##0'
    ch.gapWidth=60

SH_RATE="'Rate Card'"; SH_BILL="'Billing (TNM)'"; SH_OUT="'Outcome'"

# ═══════════════════════════════ 1) INFORMATION ═══════════════════════════════
ws=wb.active; ws.title="Information"; ws.sheet_view.showGridLines=False
ws.sheet_properties.tabColor=PRIMARY
W(ws,"A",30); W(ws,"B",96)
banner(ws,"B","Opus Pulse  -  TNM to Outcome Conversion Model","A live model. Change any YELLOW input cell and every result, table and chart recalculates.")
rows=[
 ("S","Tabs in this workbook",""),
 ("Rate Card","Master billing rate per role x experience. The Billing tab looks rates up from here (INDEX/MATCH)."),
 ("Billing (TNM)","Time & Material model: team, calendar (holidays/leaves) and expenses -> monthly & yearly billing, profit and margin. Includes a revenue/expense/profit chart and an expense pie."),
 ("Outcome","Outcome-based conversion: two per-person capacity cases (7 vs 8 SP) with a 20% reserve. Derives velocity, price per story point, margin and the client win-win. Three comparison charts."),
 ("Dashboard","One-screen verdict: TNM vs Outcome, who benefits, by how much."),
 ("S","How to use",""),
 ("Step 1","Edit only the YELLOW cells (team counts, rates, holidays, leaves, expenses, capacity, reserve %, efficiency %, discount %, min invoice)."),
 ("Step 2","All white / shaded cells are formulas and update automatically. Charts redraw on any change."),
 ("S","Key assumptions",""),
 ("Weekends","104 days/year. Working days = 365 minus 104 minus holidays minus leaves."),
 ("Hours/day","8 (configurable). Billable hours/year = working days x hours/day."),
 ("Currency","USD in this model."),
 ("S","Formula reference",""),
 ("Billable days/year","365  -  104 weekends  -  holidays  -  leaves"),
 ("Monthly billing","Sum of (count x rate x billable hours per month)"),
 ("Profit margin %","(revenue  -  expenses)  /  revenue"),
 ("Effective velocity","per-person SP  x  headcount  x  (1 - reserve %)"),
 ("Deliverable SP/month","effective velocity  x  sprints per month"),
 ("Break-even price/SP","TNM monthly billing  /  deliverable SP per month"),
 ("Recommended price/SP","break-even  x  (1 - client discount %)"),
 ("Outcome cost/month","TNM monthly cost  /  (1 + efficiency gain %)"),
 ("Outcome margin %","(monthly bill  -  outcome cost)  /  monthly bill"),
 ("WIN-WIN test","client pays less than TNM  AND  Opus absolute profit is not lower"),
 ("S","Why a client converts (the core insight)",""),
 ("Pay for results","Under TNM the client pays for TIME and its waste (rework, ramp-up, the 15% meeting/grooming reserve, attrition, rate hikes). Under Outcome the client pays only for ACCEPTED story points at a fixed rate."),
 ("Risk transfer","Schedule, attrition, ramp-up and estimation risk move from the client to Opus; the client gets price certainty and a throughput SLA."),
 ("Shared surplus","Outcome lets Opus KEEP efficiency gains (accelerators / reuse / cheaper mix) that TNM would return as fewer billed hours. Opus prices below the client's TNM cost-per-point and still earns more - both win."),
]
r=4
for tag,text in [(x[0],x[1]) for x in rows]:
    if tag=="S":
        section(ws,r,2,text)
    else:
        put(ws,f"A{r}",tag,font=F_BOLD,fill=LIGHT,ha="left",bd=True)
        put(ws,f"B{r}",text,wrap=True,ha="left",bd=True)
        ws.row_dimensions[r].height = 30 if len(text)>92 else (28 if len(text)>70 else 16)
    r+=1

# ═══════════════════════════════ 2) RATE CARD ═════════════════════════════════
ws=wb.create_sheet("Rate Card"); ws.sheet_view.showGridLines=False; ws.sheet_properties.tabColor=ACCENT
W(ws,"A",22); W(ws,"B",16); W(ws,"C",18); W(ws,"D",22)
banner(ws,"D","Account Rate Card  -  Apex Bank","Standard billing rate by role and experience. YELLOW = editable.")
headers(ws,4,["Role","Experience (yrs)","Billing Rate/hr ($)","Key (auto)"])
rate_rows=[("Sr Dev","5 to 8",28),("Sr Dev","8 to 10",30),("Tech Lead (Dev)","9 to 12",35),
           ("Sr QA","5 to 8",28),("Lead QA","9 to 12",35),("PO","12 to 14",37)]
RC0=5
for i,(role,exp,rate) in enumerate(rate_rows):
    rr=RC0+i; bandfill = LIGHT if i%2 else WHITE
    put(ws,f"A{rr}",role,bd=True,ha="left",fill=bandfill)
    put(ws,f"B{rr}",exp,bd=True,ha="center",fill=bandfill)
    put(ws,f"C{rr}",rate,fill=YELLOW,fmt=MONEY2,bd=True,ha="center")
    put(ws,f"D{rr}",f'=A{rr}&"|"&B{rr}',bd=True,font=F_MUTE,ha="center",fill=bandfill)
RCn=RC0+len(rate_rows)-1
RATE_RANGE=f"{SH_RATE}!$C${RC0}:$C${RCn}"; KEY_RANGE=f"{SH_RATE}!$D${RC0}:$D${RCn}"

# ═══════════════════════════════ 3) BILLING (TNM) ═════════════════════════════
ws=wb.create_sheet("Billing (TNM)"); ws.sheet_view.showGridLines=False; ws.sheet_properties.tabColor="375623"
for c,w in [("A",32),("B",16),("C",12),("D",13),("E",16),("F",16),("G",2),("H",18),("I",14)]: W(ws,c,w)
banner(ws,"F","Billing Simulator  -  Time & Material (TNM)","YELLOW = inputs. Revenue, profit and margin are live formulas.")
section(ws,3,2,"Company calendar & hours")
calc=[("Hours per day",8,True,NUM),("Weekend days / year",104,False,NUM),
      ("Public holidays / year",10,True,NUM),("Leaves / year",21,True,NUM),
      ("Billable days / year","=365-B5-B6-B7",False,NUM),
      ("Billable hours / year (per resource)","=B8*B4",False,NUM),
      ("Billable hours / month (per resource)","=B9/12",False,NUM1)]
for i,(lbl,val,inp,fmt) in enumerate(calc):
    rr=4+i
    put(ws,f"A{rr}",lbl,bd=True,ha="left",fill=LIGHT if not inp else None)
    put(ws,f"B{rr}",val,fill=YELLOW if inp else GREY,fmt=fmt,bd=True,ha="center",font=None if inp else F_BOLD)
B_HRS_MO="$B$10"; B_HRS_YR="$B$9"

R0=13
section(ws,12,6,"Project team")
headers(ws,R0,["Role","Experience","Count","Rate/hr","Monthly Revenue","Yearly Revenue"])
res_rows=[("Sr Dev","5 to 8",3),("Sr Dev","8 to 10",2),("Tech Lead (Dev)","9 to 12",1),
          ("Sr QA","5 to 8",1),("Lead QA","9 to 12",2),("PO","12 to 14",1)]
for i,(role,exp,cnt) in enumerate(res_rows):
    rr=R0+1+i; bf=LIGHT if i%2 else WHITE
    put(ws,f"A{rr}",role,bd=True,ha="left",fill=bf)
    put(ws,f"B{rr}",exp,bd=True,ha="center",fill=bf)
    put(ws,f"C{rr}",cnt,fill=YELLOW,fmt=NUM,bd=True,ha="center")
    put(ws,f"D{rr}",f'=INDEX({RATE_RANGE},MATCH(A{rr}&"|"&B{rr},{KEY_RANGE},0))',fmt=MONEY2,bd=True,ha="center",fill=bf)
    put(ws,f"E{rr}",f"=C{rr}*D{rr}*{B_HRS_MO}",fmt=MONEY,bd=True,fill=bf)
    put(ws,f"F{rr}",f"=C{rr}*D{rr}*{B_HRS_YR}",fmt=MONEY,bd=True,fill=bf)
Rn=R0+len(res_rows); TR=Rn+1
put(ws,f"A{TR}","Total team",font=F_BOLD,fill=BAND,bd=True,ha="left"); ws.merge_cells(f"A{TR}:B{TR}")
put(ws,f"C{TR}",f"=SUM(C{R0+1}:C{Rn})",font=F_BOLD,fill=BAND,fmt=NUM,bd=True,ha="center")
put(ws,f"D{TR}","",fill=BAND,bd=True)
put(ws,f"E{TR}",f"=SUM(E{R0+1}:E{Rn})",font=F_BOLD,fill=BAND,fmt=MONEY,bd=True)
put(ws,f"F{TR}",f"=SUM(F{R0+1}:F{Rn})",font=F_BOLD,fill=BAND,fmt=MONEY,bd=True)
COUNT_CELL=f"C{TR}"

E0=TR+2
section(ws,E0,4,"Project expenses (cost)")
headers(ws,E0+1,["Category","Amount","Frequency","Yearly Amount"])
exp_rows=[("Salaries",24000,"monthly"),("Infrastructure / seats",2500,"monthly"),
          ("Software licenses",1200,"monthly"),("Travel",700,"monthly"),("Training",6000,"yearly")]
EX0=E0+2
for i,(catg,amt,freq) in enumerate(exp_rows):
    rr=EX0+i; bf=LIGHT if i%2 else WHITE
    put(ws,f"A{rr}",catg,bd=True,ha="left",fill=bf)
    put(ws,f"B{rr}",amt,fill=YELLOW,fmt=MONEY,bd=True,ha="center")
    put(ws,f"C{rr}",freq,fill=YELLOW,bd=True,ha="center")
    put(ws,f"D{rr}",f'=IF(C{rr}="monthly",B{rr}*12,B{rr})',fmt=MONEY,bd=True,fill=bf)
EXn=EX0+len(exp_rows)-1; EXP_TY=EXn+1
put(ws,f"A{EXP_TY}","Total yearly expenses",font=F_BOLD,fill=BAND,bd=True,ha="left"); ws.merge_cells(f"A{EXP_TY}:C{EXP_TY}")
put(ws,f"D{EXP_TY}",f"=SUM(D{EX0}:D{EXn})",font=F_BOLD,fill=BAND,fmt=MONEY,bd=True)
EXP_TM=EXP_TY+1
put(ws,f"A{EXP_TM}","Total monthly expenses",font=F_BOLD,fill=BAND,bd=True,ha="left"); ws.merge_cells(f"A{EXP_TM}:C{EXP_TM}")
put(ws,f"D{EXP_TM}",f"=D{EXP_TY}/12",font=F_BOLD,fill=BAND,fmt=MONEY,bd=True)

RES0=EXP_TM+2
section(ws,RES0,2,"Results")
results=[("Monthly billing (revenue)",f"=E{TR}",MONEY,LIGHT),
         ("Yearly billing (revenue)",f"=F{TR}",MONEY,WHITE),
         ("Monthly expenses (cost)",f"=D{EXP_TM}",MONEY,LIGHT),
         ("Yearly expenses (cost)",f"=D{EXP_TY}",MONEY,WHITE),
         ("Monthly profit",None,MONEY,LIGHT),
         ("Yearly profit",None,MONEY,WHITE),
         ("Profit margin %",None,PCT,GREEN)]
rmap={}
for i,(lbl,frm,fmt,fl) in enumerate(results):
    rr=RES0+1+i; rmap[lbl]=rr
    put(ws,f"A{rr}",lbl,font=F_BOLD,bd=True,ha="left",fill=fl)
    put(ws,f"B{rr}",frm if frm else 0,fmt=fmt,bd=True,fill=fl,font=F_BOLD)
put(ws,f"B{rmap['Monthly profit']}",f"=B{rmap['Monthly billing (revenue)']}-B{rmap['Monthly expenses (cost)']}",fmt=MONEY,bd=True,fill=LIGHT,font=F_BOLD)
put(ws,f"B{rmap['Yearly profit']}",f"=B{rmap['Yearly billing (revenue)']}-B{rmap['Yearly expenses (cost)']}",fmt=MONEY,bd=True,fill=WHITE,font=F_BOLD)
put(ws,f"B{rmap['Profit margin %']}",f"=B{rmap['Yearly profit']}/B{rmap['Yearly billing (revenue)']}",fmt=PCT,bd=True,fill=GREEN,font=F_BIG)
BILL_MO_REV=f"{SH_BILL}!$B${rmap['Monthly billing (revenue)']}"
BILL_MO_EXP=f"{SH_BILL}!$B${rmap['Monthly expenses (cost)']}"

CD=4
put(ws,f"H{CD}","Monthly ($)",font=F_BOLD); put(ws,f"I{CD}","Value",font=F_BOLD)
put(ws,f"H{CD+1}","Revenue"); put(ws,f"I{CD+1}",f"=B{rmap['Monthly billing (revenue)']}",fmt=MONEY)
put(ws,f"H{CD+2}","Expenses"); put(ws,f"I{CD+2}",f"=B{rmap['Monthly expenses (cost)']}",fmt=MONEY)
put(ws,f"H{CD+3}","Profit");   put(ws,f"I{CD+3}",f"=B{rmap['Monthly profit']}",fmt=MONEY)
bar=BarChart(); bar.title="Monthly Revenue / Expenses / Profit"; bar.type="col"
data=Reference(ws,min_col=9,min_row=CD,max_row=CD+3); cats=Reference(ws,min_col=8,min_row=CD+1,max_row=CD+3)
bar.add_data(data,titles_from_data=True); bar.set_categories(cats); bar.legend=None
style_bar(bar,["2E75B6"]); ws.add_chart(bar,f"H{CD+5}")
pie=PieChart(); pie.title="Expense breakdown (yearly)"; pie.height=7; pie.width=11; pie.style=10
pdata=Reference(ws,min_col=4,min_row=EX0,max_row=EXn); plabels=Reference(ws,min_col=1,min_row=EX0,max_row=EXn)
pie.add_data(pdata,titles_from_data=False); pie.set_categories(plabels)
pie.dataLabels=DataLabelList(); pie.dataLabels.showPercent=True
ws.add_chart(pie,f"H{CD+21}")
ws.freeze_panes="A3"

# ═══════════════════════════════ 4) OUTCOME ═══════════════════════════════════
ws=wb.create_sheet("Outcome"); ws.sheet_view.showGridLines=False; ws.sheet_properties.tabColor="7030A0"
for c,w in [("A",34),("B",15),("C",15),("D",2),("E",12),("F",2),("N",11),("O",13),("P",13)]: W(ws,c,w)
banner(ws,"C","Outcome-Based Cost Simulation","Two capacity cases. YELLOW = inputs. Team & cost inherited from Billing (TNM).")
section(ws,3,2,"Inputs")
inp=[("Headcount (from Billing)",f"={SH_BILL}!{COUNT_CELL}",False,NUM),
     ("Per-person SP / sprint  -  Case 1",7,True,NUM),
     ("Per-person SP / sprint  -  Case 2",8,True,NUM),
     ("Capacity reserve %",0.15,True,PCT),
     ("Sprints per month",2,True,NUM),
     ("Minimum invoice SP",120,True,NUM),
     ("Outcome efficiency gain %",0.10,True,PCT),
     ("Client discount %",0.05,True,PCT),
     ("TNM monthly billing (R)",f"={BILL_MO_REV}",False,MONEY),
     ("Monthly cost (C)",f"={BILL_MO_EXP}",False,MONEY)]
for i,(lbl,val,isin,fmt) in enumerate(inp):
    rr=4+i
    put(ws,f"A{rr}",lbl,bd=True,ha="left",fill=None if isin else LIGHT)
    put(ws,f"B{rr}",val,fill=YELLOW if isin else GREY,fmt=fmt,bd=True,ha="center",font=None if isin else F_BOLD)
HC="$B$4"; CA="$B$5"; CB="$B$6"; RES="$B$7"; SPM="$B$8"; MIN="$B$9"; EFF="$B$10"; DIS="$B$11"; R="$B$12"; C="$B$13"

T0=16
section(ws,T0-1,3,"Case 1 vs Case 2  -  step-by-step")
headers(ws,T0,["Metric","Case 1","Case 2"])
rows=[]
def rowf(label,f1,f2,fmt): rows.append((label,f1,f2,fmt))
rowf("Per-person SP / sprint",f"={CA}",f"={CB}",NUM)
rowf("Gross team velocity / sprint",f"=B{T0+1}*{HC}",f"=C{T0+1}*{HC}",NUM1)
rowf("Effective velocity (after reserve)",f"=B{T0+2}*(1-{RES})",f"=C{T0+2}*(1-{RES})",NUM1)
rowf("Deliverable SP / month",f"=B{T0+3}*{SPM}",f"=C{T0+3}*{SPM}",NUM)
rowf("Meets min invoice?",f'=IF(B{T0+4}>={MIN},"Yes","No (short "&TEXT({MIN}-B{T0+4},"0")&")")',f'=IF(C{T0+4}>={MIN},"Yes","No (short "&TEXT({MIN}-C{T0+4},"0")&")")',None)
rowf("Break-even price / SP",f"={R}/B{T0+4}",f"={R}/C{T0+4}",MONEY2)
rowf("Recommended price / SP",f"=B{T0+6}*(1-{DIS})",f"=C{T0+6}*(1-{DIS})",MONEY2)
rowf("Monthly outcome bill",f"=B{T0+7}*B{T0+4}",f"=C{T0+7}*C{T0+4}",MONEY)
rowf("Yearly outcome bill",f"=B{T0+8}*12",f"=C{T0+8}*12",MONEY)
rowf("Outcome cost / month",f"={C}/(1+{EFF})",f"={C}/(1+{EFF})",MONEY)
rowf("Opus margin  -  TNM",f"=({R}-{C})/{R}",f"=({R}-{C})/{R}",PCT)
rowf("Opus margin  -  Outcome",f"=(B{T0+8}-B{T0+10})/B{T0+8}",f"=(C{T0+8}-C{T0+10})/C{T0+8}",PCT)
rowf("Margin uplift (pts)",f"=B{T0+12}-B{T0+11}",f"=C{T0+12}-C{T0+11}",PCT)
rowf("Opus profit  -  TNM / month",f"={R}-{C}",f"={R}-{C}",MONEY)
rowf("Opus profit  -  Outcome / month",f"=B{T0+8}-B{T0+10}",f"=C{T0+8}-C{T0+10}",MONEY)
rowf("Opus extra profit / year",f"=(B{T0+15}-B{T0+14})*12",f"=(C{T0+15}-C{T0+14})*12",MONEY)
rowf("Client saving / month",f"={R}-B{T0+8}",f"={R}-C{T0+8}",MONEY)
rowf("Client saving / year",f"=B{T0+17}*12",f"=C{T0+17}*12",MONEY)
rowf("WIN-WIN?",f'=IF(AND(B{T0+8}<{R},(B{T0+8}-B{T0+10})>=({R}-{C})),"YES - WIN-WIN","Not yet")',
               f'=IF(AND(C{T0+8}<{R},(C{T0+8}-C{T0+10})>=({R}-{C})),"YES - WIN-WIN","Not yet")',None)
emph={"Recommended price / SP","Monthly outcome bill","Opus margin  -  Outcome","Client saving / year","WIN-WIN?","Opus extra profit / year"}
for i,(lbl,f1,f2,fmt) in enumerate(rows):
    rr=T0+1+i; e=lbl in emph; fl=GREEN if e else (LIGHT if i%2 else WHITE)
    put(ws,f"A{rr}",lbl,font=F_BOLD if e else None,bd=True,ha="left",fill=fl)
    put(ws,f"B{rr}",f1,fmt=fmt,bd=True,fill=fl,font=F_BOLD if e else None,ha="center")
    put(ws,f"C{rr}",f2,fmt=fmt,bd=True,fill=fl,font=F_BOLD if e else None,ha="center")
MB1=f"B{T0+8}";MB2=f"C{T0+8}";BE1=f"B{T0+6}";BE2=f"C{T0+6}";RP1=f"B{T0+7}";RP2=f"C{T0+7}";TM1=f"B{T0+11}";TM2=f"C{T0+11}";OM1=f"B{T0+12}";OM2=f"C{T0+12}"

def block(top,title,h1,h2,v1a,v1b,v2a,v2b,fmt):
    put(ws,f"N{top}",title,font=F_BOLD); put(ws,f"O{top}",h1,font=F_BOLD); put(ws,f"P{top}",h2,font=F_BOLD)
    put(ws,f"N{top+1}","Case 1"); put(ws,f"O{top+1}",v1a,fmt=fmt); put(ws,f"P{top+1}",v1b,fmt=fmt)
    put(ws,f"N{top+2}","Case 2"); put(ws,f"O{top+2}",v2a,fmt=fmt); put(ws,f"P{top+2}",v2b,fmt=fmt)
    return top
b1=block(16,"Client pays","TNM","Outcome",f"={R}",f"={MB1}",f"={R}",f"={MB2}",MONEY)
b2=block(20,"Opus margin","TNM","Outcome",f"={TM1}",f"={OM1}",f"={TM2}",f"={OM2}",PCT)
b3=block(24,"Price/SP","Break-even","Recommended",f"={BE1}",f"={RP1}",f"={BE2}",f"={RP2}",MONEY2)
def add_bar(anchor,top,title,colors,pct=False):
    ch=BarChart(); ch.type="col"; ch.title=title
    d=Reference(ws,min_col=15,max_col=16,min_row=top,max_row=top+2)
    c=Reference(ws,min_col=14,min_row=top+1,max_row=top+2)
    ch.add_data(d,titles_from_data=True); ch.set_categories(c); style_bar(ch,colors,pct)
    ws.add_chart(ch,anchor)
add_bar("E16",b1,"Client pays  -  TNM vs Outcome",["A6A6A6","2E75B6"])
add_bar("E32",b2,"Opus margin %  -  TNM vs Outcome",["A6A6A6","375623"],pct=True)
add_bar("E48",b3,"Price per story point",["A6A6A6","7030A0"])
ws.freeze_panes="A3"

# ═══════════════════════════════ 5) DASHBOARD ═════════════════════════════════
ws=wb.create_sheet("Dashboard"); ws.sheet_view.showGridLines=False; ws.sheet_properties.tabColor="C55A11"
for c,w in [("A",30),("B",20),("C",3),("D",24),("E",20)]: W(ws,c,w)
banner(ws,"E","Dashboard  -  TNM vs Outcome (Case 2, feasible)","Headline verdict for the 8 SP/person case.")
section(ws,4,2,"Key numbers")
kpis=[("TNM monthly billing",f"={SH_OUT}!$B$12",MONEY,WHITE),
      ("TNM yearly billing",f"={SH_OUT}!$B$12*12",MONEY,LIGHT),
      ("TNM margin",f"={SH_OUT}!C{T0+11}",PCT,WHITE),
      ("Outcome monthly bill",f"={SH_OUT}!C{T0+8}",MONEY,LIGHT),
      ("Outcome margin",f"={SH_OUT}!C{T0+12}",PCT,GREEN),
      ("Opus extra profit / year",f"={SH_OUT}!C{T0+16}",MONEY,GREEN),
      ("Client saving / year",f"={SH_OUT}!C{T0+18}",MONEY,GREEN)]
for i,(lbl,frm,fmt,fl) in enumerate(kpis):
    rr=5+i
    put(ws,f"A{rr}",lbl,font=F_BOLD,bd=True,ha="left",fill=fl)
    put(ws,f"B{rr}",frm,fmt=fmt,bd=True,fill=fl,font=F_BIG if fl==GREEN else F_BOLD,ha="center")
# verdict banner
ws.merge_cells("A13:B14")
put(ws,"A13",f'={SH_OUT}!C{T0+19}',font=F_BIGW,fill="375623",ha="center")
ws.row_dimensions[13].height=24; ws.row_dimensions[14].height=24

put(ws,"D4","Who benefits (annual $)",font=F_BOLD)
put(ws,"D5","Client saving"); put(ws,"E5",f"={SH_OUT}!C{T0+18}",fmt=MONEY)
put(ws,"D6","Opus extra profit"); put(ws,"E6",f"={SH_OUT}!C{T0+16}",fmt=MONEY)
ch=BarChart(); ch.type="col"; ch.title="Who benefits (annual $)"
d=Reference(ws,min_col=5,min_row=5,max_row=6); c=Reference(ws,min_col=4,min_row=5,max_row=6)
ch.add_data(d,titles_from_data=False); ch.set_categories(c); ch.legend=None
style_bar(ch,["2E75B6","375623"]); ch.height=8; ch.width=12
ws.add_chart(ch,"D8")
put(ws,"A16","Both parties end up better off: the client pays less than TNM while Opus earns more - because Outcome lets Opus keep the efficiency gain that TNM would have handed back as fewer billed hours.",wrap=True,font=Font(italic=True,color=PRIMARY),ha="left")
ws.merge_cells("A16:E18"); ws.row_dimensions[16].height=54

# ═══════════════════════════════ VALIDATE & SAVE ══════════════════════════════
bad=[]
for sh in wb.worksheets:
    for row in sh.iter_rows():
        for cl in row:
            v=cl.value
            if isinstance(v,str) and v.startswith("=") and any(ord(ch)>127 for ch in v):
                bad.append((sh.title,cl.coordinate,v))
if bad:
    for x in bad: print("BAD FORMULA:",x)
    raise SystemExit("Aborting: non-ASCII characters inside a formula would corrupt the file.")
print("Formula validation passed (no non-ASCII in any formula).")

OUT="Opus_Pulse_TNM_vs_Outcome_Model.xlsx"
try:
    wb.save(OUT)
    print("Saved",OUT)
except PermissionError:
    alt=OUT.replace(".xlsx","_UPDATED.xlsx")
    wb.save(alt)
    print("Original file is open in Excel - saved updated copy as",alt,"(close the original and re-run to overwrite it).")
