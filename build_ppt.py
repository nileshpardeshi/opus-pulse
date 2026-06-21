# -*- coding: utf-8 -*-
"""
Opus Pulse - TNM -> Outcome conversion: two professional decks.
  1) Opus_Pulse_Leadership_Internal.pptx  (full economics incl. cost & margin)
  2) Opus_Pulse_Client_Proposal.pptx       (price comparison + client benefits;
                                             NO internal cost/margin)
All numbers compute from the MODEL INPUTS block below (single source of truth).
"""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION, XL_LABEL_POSITION

# ════════════════════════════════ MODEL INPUTS ════════════════════════════════
R = 48147.0      # TNM monthly billing (revenue)
RY = 577760.0    # TNM yearly billing
C = 28900.0      # monthly cost
HEAD = 10        # headcount
RESERVE = 0.15   # capacity reserve
EFF = 0.10       # outcome efficiency gain
DISC = 0.05      # client discount
SPRINTS = 2      # sprints / month
MIN_SP = 120     # min invoice SP
CASE_A, CASE_B = 7, 8  # per-person SP / sprint

# ── derived ──
tnm_profit = R - C
tnm_margin = tnm_profit / R
out_cost = C / (1 + EFF)
out_bill = R * (1 - DISC)
out_bill_y = out_bill * 12
out_profit = out_bill - out_cost
out_margin = out_profit / out_bill
uplift = (out_margin - tnm_margin) * 100
opus_extra_y = (out_profit - tnm_profit) * 12
client_save_m = R - out_bill
client_save_y = client_save_m * 12
eff_saving_m = C - out_cost
disc_given_m = R * DISC

def case(pp):
    gross = pp * HEAD; eff = gross * (1 - RESERVE); msp = eff * SPRINTS
    be = R / msp; rec = be * (1 - DISC)
    return dict(pp=pp, gross=gross, eff=eff, msp=msp, be=be, rec=rec, meets=msp >= MIN_SP)
cA, cB = case(CASE_A), case(CASE_B)

def M(x): return f"${x:,.0f}"
def Mk(x): return f"${x/1000:,.1f}k"
def P(x): return f"{x*100:.1f}%"
def P0(x): return f"{x*100:.0f}%"

# ── palette ─────────────────────────────────────────────────────────────────
NAVY=RGBColor(0x1F,0x3A,0x5F); PRIMARY=RGBColor(0x1F,0x4E,0x79); ACCENT=RGBColor(0x2E,0x75,0xB6)
SKY=RGBColor(0xDD,0xEB,0xF7); GREEN=RGBColor(0x2E,0x7D,0x32); GREENL=RGBColor(0xE2,0xEF,0xDA)
RED=RGBColor(0xC0,0x39,0x2B); AMBER=RGBColor(0xBF,0x87,0x00); GREY=RGBColor(0x6E,0x77,0x81)
LGREY=RGBColor(0xF2,0xF4,0xF7); WHITE=RGBColor(0xFF,0xFF,0xFF); INK=RGBColor(0x21,0x29,0x37)
FONT="Calibri"
EMU_W, EMU_H = Inches(13.333), Inches(7.5)

def new_deck():
    prs=Presentation(); prs.slide_width=EMU_W; prs.slide_height=EMU_H; return prs
def slide(prs): return prs.slides.add_slide(prs.slide_layouts[6])
def rect(s,l,t,w,h,color,line=None,shape=MSO_SHAPE.RECTANGLE):
    sp=s.shapes.add_shape(shape,Inches(l),Inches(t),Inches(w),Inches(h))
    sp.fill.solid(); sp.fill.fore_color.rgb=color
    if line is None: sp.line.fill.background()
    else: sp.line.color.rgb=line; sp.line.width=Pt(1)
    sp.shadow.inherit=False; return sp
def text(s,l,t,w,h,runs,*,size=14,color=INK,bold=False,align=PP_ALIGN.LEFT,
         anchor=MSO_ANCHOR.TOP,font=FONT,italic=False,line_spacing=1.0):
    tb=s.shapes.add_textbox(Inches(l),Inches(t),Inches(w),Inches(h))
    tf=tb.text_frame; tf.word_wrap=True; tf.vertical_anchor=anchor
    tf.margin_left=0; tf.margin_right=0; tf.margin_top=0; tf.margin_bottom=0
    items=runs if isinstance(runs,list) else [(runs,{})]
    for i,(txt,ov) in enumerate(items):
        p=tf.paragraphs[0] if i==0 else tf.add_paragraph()
        p.alignment=ov.get("align",align); p.line_spacing=ov.get("line_spacing",line_spacing)
        if "space_after" in ov: p.space_after=Pt(ov["space_after"])
        r=p.add_run(); r.text=txt; f=r.font
        f.size=Pt(ov.get("size",size)); f.bold=ov.get("bold",bold)
        f.italic=ov.get("italic",italic); f.name=ov.get("font",font); f.color.rgb=ov.get("color",color)
    return tb
def bullets(s,l,t,w,h,items,*,size=15,color=INK,gap=8,bullet="•  "):
    tb=s.shapes.add_textbox(Inches(l),Inches(t),Inches(w),Inches(h)); tf=tb.text_frame; tf.word_wrap=True
    for i,it in enumerate(items):
        txt,lvl,strong=(it if isinstance(it,tuple) else (it,0,False))
        p=tf.paragraphs[0] if i==0 else tf.add_paragraph(); p.space_after=Pt(gap); p.level=lvl
        r=p.add_run(); r.text=("    " if lvl>0 else bullet)+txt
        r.font.size=Pt(size-lvl); r.font.name=FONT; r.font.bold=strong
        r.font.color.rgb=(GREY if lvl>0 else color)
    return tb
def title_bar(s,kicker,title,page=None,conf=None):
    rect(s,0,0,13.333,1.05,PRIMARY); rect(s,0,1.05,13.333,0.06,ACCENT)
    if kicker: text(s,0.55,0.12,12,0.28,kicker.upper(),size=11,color=SKY,bold=True)
    text(s,0.55,0.36,12.2,0.62,title,size=24,color=WHITE,bold=True)
    if conf: text(s,0.55,7.08,8,0.3,conf,size=9,color=GREY,italic=True)
    text(s,11.4,7.08,1.4,0.3,("" if page is None else str(page)),size=9,color=GREY,align=PP_ALIGN.RIGHT)
    text(s,5.0,7.08,3.3,0.3,"Opus Pulse",size=9,color=GREY,align=PP_ALIGN.CENTER,bold=True)
def cover(s,kicker,title,subtitle,tag):
    rect(s,0,0,13.333,7.5,PRIMARY); rect(s,0,4.3,13.333,0.07,ACCENT)
    text(s,0.9,0.7,6,0.4,"OPUS PULSE",size=16,color=SKY,bold=True)
    text(s,0.9,2.2,11.5,0.4,kicker.upper(),size=14,color=SKY,bold=True)
    text(s,0.9,2.7,11.5,1.4,title,size=40,color=WHITE,bold=True,line_spacing=1.05)
    text(s,0.9,4.55,11.5,0.8,subtitle,size=18,color=SKY)
    text(s,0.9,6.7,11.5,0.4,tag,size=11,color=RGBColor(0x9D,0xB8,0xD6),italic=True)
def kpi(s,l,t,w,h,label,value,sub=None,fill=PRIMARY,vcolor=WHITE):
    card=rect(s,l,t,w,h,fill,shape=MSO_SHAPE.ROUNDED_RECTANGLE); card.adjustments[0]=0.06
    text(s,l+0.15,t+0.12,w-0.3,0.3,label.upper(),size=10.5,color=(SKY if fill!=WHITE else GREY),bold=True)
    text(s,l+0.15,t+0.42,w-0.3,0.6,value,size=23,color=vcolor,bold=True)
    if sub: text(s,l+0.15,t+h-0.42,w-0.3,0.34,sub,size=10,color=(SKY if fill!=WHITE else GREY))
def table(s,l,t,w,headers,rows,*,col_w=None,header_fill=PRIMARY,fs=12,hfs=12,
          row_h=0.34,head_h=0.4,highlight_rows=None):
    nrows=len(rows)+1; ncols=len(headers); total_h=head_h+row_h*len(rows)
    gt=s.shapes.add_table(nrows,ncols,Inches(l),Inches(t),Inches(w),Inches(total_h)).table
    if col_w:
        for i,cw in enumerate(col_w): gt.columns[i].width=Inches(cw)
    gt.first_row=False; gt.horz_banding=False; gt.rows[0].height=Inches(head_h)
    for j,h in enumerate(headers):
        c=gt.cell(0,j); c.fill.solid(); c.fill.fore_color.rgb=header_fill; c.vertical_anchor=MSO_ANCHOR.MIDDLE
        p=c.text_frame.paragraphs[0]; p.alignment=PP_ALIGN.LEFT if j==0 else PP_ALIGN.CENTER
        r=p.add_run(); r.text=h; r.font.size=Pt(hfs); r.font.bold=True; r.font.color.rgb=WHITE; r.font.name=FONT
        c.margin_left=Inches(0.08); c.margin_top=Inches(0.02); c.margin_bottom=Inches(0.02)
    highlight_rows=highlight_rows or set()
    for i,row in enumerate(rows):
        gt.rows[i+1].height=Inches(row_h); hl=i in highlight_rows
        for j,val in enumerate(row):
            c=gt.cell(i+1,j); c.fill.solid(); c.fill.fore_color.rgb=GREENL if hl else (LGREY if i%2 else WHITE)
            c.vertical_anchor=MSO_ANCHOR.MIDDLE
            p=c.text_frame.paragraphs[0]; p.alignment=PP_ALIGN.LEFT if j==0 else PP_ALIGN.CENTER
            r=p.add_run(); r.text=str(val); r.font.size=Pt(fs); r.font.name=FONT; r.font.bold=hl or j==0
            r.font.color.rgb=GREEN if (hl and j>0) else INK
            c.margin_left=Inches(0.08); c.margin_top=Inches(0.02); c.margin_bottom=Inches(0.02)
    return gt
def clustered(s,l,t,w,h,cats,series,*,title=None,number_fmt='"$"#,##0',colors=None,pct=False,legend=True):
    cd=CategoryChartData(); cd.categories=cats
    for name,vals in series: cd.add_series(name,vals)
    gf=s.shapes.add_chart(XL_CHART_TYPE.COLUMN_CLUSTERED,Inches(l),Inches(t),Inches(w),Inches(h),cd)
    ch=gf.chart; ch.has_title=bool(title)
    if title:
        ch.chart_title.text_frame.text=title
        ch.chart_title.text_frame.paragraphs[0].runs[0].font.size=Pt(13)
        ch.chart_title.text_frame.paragraphs[0].runs[0].font.bold=True
    ch.has_legend=legend
    if legend:
        ch.legend.position=XL_LEGEND_POSITION.BOTTOM; ch.legend.include_in_layout=False; ch.legend.font.size=Pt(11)
    plot=ch.plots[0]; plot.gap_width=80; plot.has_data_labels=True
    plot.data_labels.number_format='0.0%' if pct else number_fmt; plot.data_labels.number_format_is_linked=False
    plot.data_labels.font.size=Pt(10); plot.data_labels.font.bold=True; plot.data_labels.position=XL_LABEL_POSITION.OUTSIDE_END
    cset=colors or [ACCENT,GREEN,AMBER]
    for i,sr in enumerate(ch.series):
        sr.format.fill.solid(); sr.format.fill.fore_color.rgb=cset[i%len(cset)]
    try:
        ch.value_axis.has_major_gridlines=True; ch.value_axis.tick_labels.font.size=Pt(10); ch.category_axis.tick_labels.font.size=Pt(11)
    except Exception: pass
    return ch
def chip(s,l,t,w,txt,color,fill):
    c=rect(s,l,t,w,0.42,fill,shape=MSO_SHAPE.ROUNDED_RECTANGLE); c.adjustments[0]=0.5
    text(s,l,t+0.05,w,0.32,txt,size=11.5,color=color,bold=True,align=PP_ALIGN.CENTER,anchor=MSO_ANCHOR.MIDDLE)

def save_pptx(prs, name):
    try:
        prs.save(name); print("Saved", name)
    except PermissionError:
        alt = name.replace(".pptx", "_UPDATED.pptx")
        prs.save(alt); print(name, "is open in PowerPoint - saved updated copy as", alt, "(close it and re-run to overwrite).")

# ════════════════════════════ DECK 1 — INTERNAL ══════════════════════════════
def build_internal():
    prs=new_deck(); pg=[0]
    def PG(): pg[0]+=1; return pg[0]
    CONF="Confidential - Internal (contains cost & margin)"

    s=slide(prs)
    cover(s,"Internal Leadership Briefing",
          "Converting Apex Bank - Payments Gateway\nfrom TNM to Outcome-Based Delivery",
          "The margin case for a TNM -> Outcome conversion",
          "Confidential - Opus internal only - contains cost & margin")

    # 1 Executive summary
    s=slide(prs); title_bar(s,"Executive summary","The opportunity in one slide",PG(),CONF)
    kpi(s,0.55,1.35,3.0,1.3,"TNM margin today",P0(tnm_margin),f"{Mk(RY)}/yr billing",PRIMARY)
    kpi(s,3.75,1.35,3.0,1.3,"Outcome margin",P(out_margin),f"+{uplift:.1f} pts",GREEN)
    kpi(s,6.95,1.35,3.0,1.3,"Opus extra profit",f"+{Mk(opus_extra_y)}/yr",f"plus mix upside",GREEN)
    kpi(s,10.15,1.35,2.65,1.3,"Client saving",f"{Mk(client_save_y)}/yr",f"~{P0(DISC)} less",ACCENT)
    bullets(s,0.6,3.0,12.2,3.6,[
        ("The ask: convert Payments Gateway from Time-&-Material to Outcome-Based delivery.",0,True),
        ("Today we bill time at a frozen rate; any efficiency we create is handed back to the client as fewer billed hours - we keep none of the upside.",0,False),
        ("Under Outcome the price is fixed per accepted story point - so a leaner resource mix and trimmed overhead become OUR margin, and we share a small slice with the client.",0,False),
        (f"Conservative case (no new tools): client pays ~{P0(DISC)} less while our margin rises {P0(tnm_margin)} -> {P(out_margin)} and the resource-mix saving we unlock is now retained, not given away.",0,True),
        ("Recommendation: pilot the conversion on this engagement and stand up the resource pyramid that funds the efficiency.",0,False),
    ],size=14,gap=10)

    # 2 Current engagement snapshot
    s=slide(prs); title_bar(s,"Current engagement","Where we are today - TNM snapshot",PG(),CONF)
    table(s,0.55,1.35,7.4,["Role","Exp (yrs)","Count","Rate/hr"],
          [["Sr Dev","5 to 8","3","$28"],["Sr Dev","8 to 10","2","$30"],
           ["Tech Lead (Dev)","9 to 12","1","$35"],["Sr QA","5 to 8","1","$28"],
           ["Lead QA","9 to 12","2","$35"],["PO","12 to 14","1","$37"],
           ["Total team","","10","$314/hr blended"]],
          col_w=[3.0,1.6,1.2,1.6],highlight_rows={6},fs=12,row_h=0.36)
    kpi(s,8.25,1.35,4.55,0.95,"Billable days / year","230","365 - 104 wknd - 10 hol - 21 leave",PRIMARY)
    kpi(s,8.25,2.45,4.55,0.95,"Monthly billing",M(R),"153.3 hrs/mo x $314 blended",ACCENT)
    kpi(s,8.25,3.55,4.55,0.95,"Yearly billing",M(RY),"",ACCENT)
    text(s,0.55,4.75,12.3,1.8,[
        ("How the numbers are built",{"size":15,"bold":True,"color":PRIMARY,"space_after":6}),
        ("Billable hours/yr = 230 days x 8 hrs = 1,840 hrs.  Monthly = 153.3 hrs.",{"size":13}),
        (f"Monthly billing = sum of (count x rate) x billable hours/month = $314/hr x 153.3 = {M(R)}.",{"size":13}),
        (f"Costs (salaries, infra, licenses, travel, training) total ~{M(C)}/month -> ~{P0(tnm_margin)} margin.",{"size":13}),
    ])

    # 3 TNM margin math
    s=slide(prs); title_bar(s,"Current economics","The TNM margin math (monthly)",PG(),CONF)
    table(s,0.55,1.4,6.2,["Line","Monthly","Yearly"],
          [["Billing (revenue)",M(R),M(RY)],["Loaded cost",M(C),M(C*12)],
           ["Profit",M(tnm_profit),M(tnm_profit*12)],["Margin %",P(tnm_margin),P(tnm_margin)]],
          col_w=[2.6,1.8,1.8],highlight_rows={3},row_h=0.42,fs=13)
    clustered(s,7.1,1.4,5.7,3.6,["Revenue","Cost","Profit"],[("Monthly $",[R,C,tnm_profit])],
              title="TNM monthly economics",colors=[ACCENT],legend=False)
    bullets(s,0.55,4.4,6.2,2.4,[
        ("Margin is healthy today - but frozen.",0,True),
        ("Appraisals raise cost; the bill rate stays flat -> margin erodes over the SOW.",0,False),
        ("Any productivity we gain reduces billed hours -> we hand the saving to the client.",0,False),
    ],size=13,gap=8)

    # 4 Why TNM caps us
    s=slide(prs); title_bar(s,"The problem","Why TNM caps our upside",PG(),CONF)
    bullets(s,0.6,1.5,12.1,5.2,[
        ("Revenue is frozen at the SOW rate.",0,True),
        ("Cost rises every year (appraisals, attrition backfills) - margin silently compresses.",1,False),
        ("Efficiency is punished, not rewarded.",0,True),
        ("Deliver the same scope with fewer / cheaper people and we simply bill less - the client keeps 100% of the saving.",1,False),
        ("No reward for delivery risk.",0,True),
        ("We carry attrition, ramp-up and rework but cannot price for it.",1,False),
        ("Outcome flips all three: price is fixed to scope, a leaner mix becomes our margin, and risk is priced in.",0,True),
    ],size=15,gap=10)

    # 5 Outcome mechanics + capacity cases
    s=slide(prs); title_bar(s,"Proposed model","Outcome mechanics & capacity cases",PG(),CONF)
    bullets(s,0.55,1.35,5.4,3.0,[
        ("Capacity -> velocity -> price per point.",0,True),
        (f"Per-person SP/sprint x 10 people, less a {P0(RESERVE)} reserve (issues / meetings / grooming).",1,False),
        (f"x {SPRINTS} sprints = deliverable SP per month.",1,False),
        ("Price per SP anchored to our TNM run-rate, then a small share-back to the client.",1,False),
    ],size=13.5,gap=8)
    table(s,6.1,1.5,6.7,["Metric",f"Case 1 ({CASE_A} SP)",f"Case 2 ({CASE_B} SP)"],
          [["Gross velocity / sprint",f"{cA['gross']:.0f} SP",f"{cB['gross']:.0f} SP"],
           [f"Less {P0(RESERVE)} reserve -> effective",f"{cA['eff']:.1f} SP",f"{cB['eff']:.0f} SP"],
           ["Deliverable SP / month",f"{cA['msp']:.0f} SP",f"{cB['msp']:.0f} SP"],
           [f"Meets {MIN_SP} SP min invoice?",("Yes" if cA['meets'] else f"No ({cA['msp']:.0f}); lower min"),("Yes" if cB['meets'] else "No")]],
          col_w=[3.1,1.8,1.8],highlight_rows={2},row_h=0.46,fs=12)
    text(s,0.55,4.7,12.3,1.8,[
        ("Reading the two cases",{"size":15,"bold":True,"color":PRIMARY,"space_after":6}),
        ("Both cases bill the same monthly total (price is anchored to the team run-rate) - velocity changes the RATE per point and whether the minimum invoice is met.",{"size":13}),
        (f"Case 1 ({CASE_A} SP) delivers {cA['msp']:.0f}/mo - just under the {MIN_SP} minimum, so renegotiate it to ~110. Case 2 ({CASE_B} SP) clears it at {cB['msp']:.0f}.",{"size":13}),
    ])

    # 6 Outcome pricing calc
    s=slide(prs); title_bar(s,"Pricing","Outcome price calculation",PG(),CONF)
    table(s,0.55,1.4,7.6,["Step",f"Case 1 ({CASE_A} SP)",f"Case 2 ({CASE_B} SP)"],
          [["Deliverable SP / month",f"{cA['msp']:.0f}",f"{cB['msp']:.0f}"],
           ["Break-even price/SP (run-rate / SP)",M(cA['be']),M(cB['be'])],
           ["Client share-back",f"-{P0(DISC)}",f"-{P0(DISC)}"],
           ["Recommended price/SP",M(cA['rec']),M(cB['rec'])],
           ["Monthly bill (price x SP)",M(out_bill),M(out_bill)],
           ["Yearly bill",M(out_bill_y),M(out_bill_y)]],
          col_w=[3.8,1.9,1.9],highlight_rows={3,4},row_h=0.40,fs=12)
    kpi(s,8.5,1.4,4.3,1.0,"Recommended price",f"{M(cB['rec'])} / SP",f"Case 2, {P0(DISC)} share-back",GREEN)
    kpi(s,8.5,2.55,4.3,1.0,"Monthly outcome bill",M(out_bill),f"vs {M(R)} TNM",ACCENT)
    kpi(s,8.5,3.7,4.3,1.0,"Outcome cost / month",M(out_cost),f"{Mk(C)} / (1 + {P0(EFF)} eff.)",PRIMARY)
    bullets(s,0.55,4.55,12.2,2.0,[
        ("Hard floor respected: price always >= cost / (1 - min margin) and >= TNM run-rate.",0,True),
        (f"The {P0(DISC)} we give the client is funded by a realistic {P0(EFF)} delivery-efficiency we keep under Outcome (next slide).",0,False),
    ],size=13,gap=8)

    # 7 Resource shuffle (NEW)
    s=slide(prs); title_bar(s,"Funding the gain - no new tools",f"Where the {P0(EFF)} efficiency comes from: resource mix",PG(),CONF)
    text(s,0.55,1.25,12.3,0.6,"We already use AI tooling under TNM - so this is NOT a new-tools gain. It comes from what Outcome unlocks: freedom over the resource mix and leaner delivery.",
         size=13,color=INK,italic=True)
    bullets(s,0.55,2.05,6.0,4.4,[
        ("Resource pyramid.",0,True),
        ("Under Outcome the price is fixed per point - the client no longer pays per named resource. Use freshers / juniors for routine work with senior oversight; blended cost drops while the price holds.",1,False),
        ("Talent rotation.",0,True),
        ("As juniors gain skill (and cost), rotate them onto other billable projects and bring in fresh low-cost joiners - this pod's blended cost stays low.",1,False),
        ("Trim the reserve 20% -> 15%.",0,True),
        ("Less ceremony / meeting overhead; the same team delivers more points per month.",1,False),
        ("Leaner delivery.",0,True),
        ("No gold-plating, tighter Definition-of-Done -> less rework (which is OUR cost under Outcome).",1,False),
    ],size=12.5,gap=5)
    table(s,6.85,2.05,5.95,["Per story point","Senior pod","Junior-heavy"],
          [["Cost / sprint","$4,000","$2,600 (-35%)"],
           ["Velocity","8 SP","6 SP (-25%)"],
           ["Cost / SP (after ~10% rework)","$500","$476"],
           ["Net efficiency / point","-","~5-10%"]],
          col_w=[2.75,1.6,1.6],highlight_rows={3},row_h=0.46,fs=11.5)
    text(s,6.85,4.55,5.95,1.1,"A 35% salary gap nets only ~5-10% after slower velocity + rework. Use a pyramid (juniors + senior oversight), never all-juniors, or velocity and quality fall and you miss the commitment.",
         size=11.5,color=INK,italic=True)
    rect(s,0.55,6.05,12.25,1.05,GREENL,shape=MSO_SHAPE.ROUNDED_RECTANGLE)
    text(s,0.75,6.12,12.0,0.95,[
        ("Why it's beneficial:",{"size":12.5,"bold":True,"color":GREEN,"space_after":2}),
        ("Every dollar of mix saving is margin under Outcome (under TNM a cheaper resource simply bills less)  -  builds a fresher talent pipeline trained on real work, then deployed billable elsewhere  -  improves utilisation across the account.",{"size":12,"color":INK}),
    ])

    # 8 Win-win economics
    s=slide(prs); title_bar(s,"The payoff","TNM vs Outcome - the win-win economics",PG(),CONF)
    clustered(s,0.55,1.4,7.0,4.2,["Client pays","Opus cost","Opus profit"],
              [("TNM (monthly)",[R,C,tnm_profit]),("Outcome (monthly)",[out_bill,out_cost,out_profit])],
              title="Monthly economics: TNM vs Outcome",colors=[GREY,GREEN])
    kpi(s,7.8,1.5,5.0,0.9,"Opus margin",f"{P0(tnm_margin)} -> {P(out_margin)}",f"+{uplift:.1f} points",GREEN)
    kpi(s,7.8,2.5,5.0,0.9,"Opus extra profit",f"+{M(opus_extra_y)} / yr",f"plus the mix upside we retain",GREEN)
    kpi(s,7.8,3.5,5.0,0.9,"Client saving",f"{M(client_save_y)} / yr",f"client pays ~{P0(DISC)} less",ACCENT)
    chip(s,7.8,4.65,5.0,"RESULT:  WIN - WIN",WHITE,GREEN)
    text(s,7.8,5.2,5.0,1.6,[
        (f"Efficiency saving {M(eff_saving_m)}/mo  >  discount given {M(disc_given_m)}/mo,",{"size":12,"italic":True,"color":INK}),
        ("so the client pays less AND Opus profit still rises. Dial the discount down (e.g. 4%) to widen Opus's share.",{"size":12,"italic":True,"color":INK}),
    ])

    # 9 Risks
    s=slide(prs); title_bar(s,"De-risking","Risks & how we control them",PG(),CONF)
    table(s,0.55,1.4,12.25,["Risk","Mitigation"],
          [["Juniors slow velocity / miss commit","Pyramid with senior oversight; anchor price to conservative velocity; min-invoice floor."],
           ["Quality / rework on junior work","Acceptance gate; strong Definition-of-Done; rework is pre-acceptance (our cost, buffered)."],
           ["Rotation loses knowledge","Stagger rotations; document; keep a stable senior core on the pod."],
           ["Scope creep on fixed price","All changes via priced change requests - nothing absorbed for free."],
           ["Client rejects fixed price","Sequence: managed-capacity -> gain-share -> outcome to build trust."]],
          col_w=[4.2,8.05],row_h=0.62,fs=12)

    # 10 Recommendation
    s=slide(prs); title_bar(s,"Decision","Recommendation & next steps",PG(),CONF)
    bullets(s,0.6,1.5,12.1,4.4,[
        ("Approve a pilot conversion of Payments Gateway to Outcome-Based delivery.",0,True),
        (f"Commit ~{cB['msp']:.0f} SP/month at {M(cB['rec'])}/SP (Case 2); lower the invoice minimum to ~110 if we staff to {CASE_A} SP/person.",0,False),
        ("Stand up the resource pyramid (fresher intake + senior oversight + rotation) that funds the efficiency.",0,False),
        ("Trim ceremonies to a 15% reserve and tighten Definition-of-Done to cut rework.",0,False),
        ("Lock the price-per-point and acceptance definition in the SOW addendum; review after 2 invoices.",0,False),
        (f"Expected: +{uplift:.1f} margin pts now, the mix saving retained as it grows, and a client paying ~{P0(DISC)} less.",0,True),
    ],size=15,gap=11)
    chip(s,0.6,6.4,6.4,f"Target: {P0(tnm_margin)} -> {P(out_margin)} margin, same team",WHITE,GREEN)

    save_pptx(prs, "Opus_Pulse_Leadership_Internal.pptx")
    return pg[0]+1

# ════════════════════════════ DECK 2 — CLIENT ════════════════════════════════
def build_client():
    prs=new_deck(); pg=[0]
    def PG(): pg[0]+=1; return pg[0]
    CONF="Prepared by Opus for Apex Bank"
    eff_per_sp = R / cB['msp']   # client's own effective spend per delivered point (not Opus cost)

    s=slide(prs)
    cover(s,"Partnership Proposal","A Better Way to Deliver\nFrom Time-&-Material to Outcome-Based",
          "Pay for delivered outcomes - with price certainty and lower cost","Prepared by Opus for Apex Bank")

    # 1 Today
    s=slide(prs); title_bar(s,"Today","Where we are today",PG(),CONF)
    bullets(s,0.6,1.45,7.0,4.5,[
        ("Our Payments Gateway team of 10 delivers under a Time-&-Material model.",0,True),
        ("You are invoiced for time - hours x rate - regardless of how much is delivered.",0,False),
        (f"You currently invest {M(R)} / month ({M(RY)} / year) in the team.",0,False),
        ("It works - but it ties your spend to effort, not to results.",0,False),
    ],size=15,gap=12)
    kpi(s,7.9,1.55,4.9,1.15,"Current monthly spend",M(R),"Time & Material",PRIMARY)
    kpi(s,7.9,2.95,4.9,1.15,"Current yearly spend",M(RY),"team of 10",PRIMARY)
    kpi(s,7.9,4.35,4.9,1.15,"Typical delivery",f"~{cB['msp']:.0f} SP/mo","story points accepted",ACCENT)

    # 2 The challenge
    s=slide(prs); title_bar(s,"The challenge","What Time-&-Material costs you",PG(),CONF)
    bullets(s,0.6,1.5,12.1,5.0,[
        ("You pay for hours - not outcomes.",0,True),
        ("Meetings, grooming, rework and ramp-up of new joiners are all on your invoice.",1,False),
        ("No price certainty.",0,True),
        ("Costs drift with team changes and annual rate revisions; budgeting is hard.",1,False),
        ("Delivery risk sits with you.",0,True),
        ("If velocity dips or people churn, you keep paying the same while output falls.",1,False),
        ("You manage the team, not just the result - timesheets, utilisation, oversight.",0,True),
    ],size=15,gap=10)

    # 3 The proposal
    s=slide(prs); title_bar(s,"Our proposal","Outcome-Based delivery",PG(),CONF)
    bullets(s,0.6,1.45,7.1,4.6,[
        ("Pay a fixed price per accepted story point - not per hour.",0,True),
        ("We commit to a monthly delivery volume with an agreed acceptance definition.",0,False),
        ("You pay only for what is delivered and accepted - rework before acceptance is on us.",0,False),
        ("Delivery risk - attrition, ramp-up, estimation - moves to Opus.",0,False),
        ("And it costs you less than today.",0,True),
    ],size=15,gap=11)
    kpi(s,7.95,1.55,4.85,1.15,"Proposed price",f"{M(cB['rec'])} / SP","per accepted story point",GREEN)
    kpi(s,7.95,2.95,4.85,1.15,"Monthly commitment",f"~{cB['msp']:.0f} SP",f"= {M(out_bill)} / month",ACCENT)
    kpi(s,7.95,4.35,4.85,1.15,"You pay only for","accepted work","quality-gated",PRIMARY)

    # 4 What you pay
    s=slide(prs); title_bar(s,"The numbers","What you pay - today vs proposed",PG(),CONF)
    table(s,0.55,1.4,7.0,["","Time & Material","Outcome-Based"],
          [["Basis","Hours x rate","Price per accepted SP"],
           ["Effective $ / delivered SP",f"~{M(eff_per_sp)}",M(cB['rec'])],
           ["Monthly invoice",M(R),M(out_bill)],
           ["Yearly invoice",M(RY),M(out_bill_y)],
           ["You pay for","All time","Accepted output only"]],
          col_w=[2.6,2.2,2.2],highlight_rows={2,3},row_h=0.46,fs=12)
    clustered(s,7.8,1.4,5.0,3.7,["Per month","Per year"],
              [("Time & Material",[R,RY]),("Outcome-Based",[out_bill,out_bill_y])],
              title="Your spend: today vs proposed",colors=[GREY,GREEN])
    chip(s,0.55,5.35,7.0,f"YOUR SAVING:  ~{Mk(client_save_y)} / year  (~{P0(DISC)})",WHITE,GREEN)
    text(s,0.55,5.95,7.0,0.9,f"Today {M(R)} buys ~{cB['msp']:.0f} delivered points (~{M(eff_per_sp)} each) and you pay it whether or not they land. At {M(cB['rec'])} per accepted point you pay less - and only for results.",
         size=12,color=INK,italic=True)

    # 5 Beyond price
    s=slide(prs); title_bar(s,"Beyond price","What you gain - beyond the saving",PG(),CONF)
    cards=[("Price certainty","A fixed rate per point. No surprises from rate revisions or slippage."),
           ("Pay for results","Rework, meetings and ramp-up are no longer on your invoice."),
           ("Risk transferred","Attrition, ramp-up and estimation risk sit with Opus."),
           ("Throughput SLA","A committed monthly delivery volume - not an open-ended timesheet."),
           ("Less overhead","You govern outcomes, not headcount and utilisation."),
           ("Built-in quality","Acceptance gate - you sign off before it is billable.")]
    x=[0.55,4.7,8.85]; y=[1.55,3.55]
    for i,(h,b) in enumerate(cards):
        cx=x[i%3]; cy=y[i//3]
        c=rect(s,cx,cy,3.85,1.75,LGREY,shape=MSO_SHAPE.ROUNDED_RECTANGLE); c.adjustments[0]=0.06
        rect(s,cx,cy,0.12,1.75,GREEN)
        text(s,cx+0.28,cy+0.18,3.4,0.4,h,size=15,color=PRIMARY,bold=True)
        text(s,cx+0.28,cy+0.62,3.45,1.0,b,size=12,color=INK)

    # 6 Side-by-side
    s=slide(prs); title_bar(s,"At a glance","Time-&-Material vs Outcome-Based",PG(),CONF)
    table(s,0.7,1.5,11.9,["Dimension","Time & Material","Outcome-Based"],
          [["You pay for","Hours worked","Accepted story points"],
           ["Price certainty","Variable","Fixed per point"],
           ["Delivery risk","Yours","Opus"],
           ["Getting faster over time","Fewer billed hours","A lower price per point"],
           ["Rework / ramp-up","On your invoice","Absorbed by Opus"],
           ["Your effort","Manage the team","Approve the outcomes"],
           ["Annual cost",M(RY),M(out_bill_y)]],
          col_w=[3.4,4.25,4.25],highlight_rows={6},row_h=0.52,fs=12.5)

    # 7 Transition + close
    s=slide(prs); title_bar(s,"Getting there","A low-risk transition",PG(),CONF)
    bullets(s,0.6,1.5,12.1,3.4,[
        ("Step 1 - Agree the story-point definition, acceptance criteria and monthly volume.",0,True),
        ("Step 2 - Run one to two monthly cycles in parallel to validate velocity and pricing.",0,False),
        ("Step 3 - Switch the SOW to a fixed price per accepted point.",0,False),
        ("Step 4 - Review quarterly; extend across other Apex Bank workstreams.",0,False),
    ],size=15,gap=12)
    chip(s,0.6,5.0,6.6,f"You save ~{Mk(client_save_y)}/yr + gain certainty",WHITE,GREEN)
    text(s,0.6,5.7,12.0,1.0,[
        ("Let's deliver outcomes, not hours.",{"size":20,"bold":True,"color":PRIMARY}),
        ("We're ready to start the parallel run next sprint.",{"size":14,"color":GREY}),
    ])

    save_pptx(prs, "Opus_Pulse_Client_Proposal.pptx")
    return pg[0]+1

print("Internal deck slides:", build_internal())
print("Client deck slides:", build_client())
print("Model: reserve", P0(RESERVE), "eff", P0(EFF), "discount", P0(DISC),
      "| client saves", M(client_save_y), "| opus extra", M(opus_extra_y), "| margin", P0(tnm_margin), "->", P(out_margin))
print("Saved both .pptx")
