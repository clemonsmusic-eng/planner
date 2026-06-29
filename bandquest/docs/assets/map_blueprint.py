# Scaled blueprint of Symphonica. Concerta = origin (0,0). +X east, +Y north. Miles.
PPM = 0.8  # px per mile  (20 px/inch ÷ 25 mi/inch)
Xmin, Xmax = -660, 380
Ymax, Ymin = 240, -250
M = 70  # margin
W = int((Xmax - Xmin) * PPM) + 2*M
H = int((Ymax - Ymin) * PPM) + 2*M

def sx(x): return M + (x - Xmin) * PPM
def sy(y): return M + (Ymax - y) * PPM

cities = {  # to-scale positions; icon is symbolic
 "Concerta  (metropolis)": (0,0),
 "Arco  · String School": (300,25),
 "Fairwind  · Wind Academy": (106,-106),
 "Coralis  · Choral College": (0,-200),
 "Clavier  · Piano Institute": (-87,152),
}
towns = {
 "Crotchet": (-60,0),
 "Batterhead Dale": (55,-55),
 "Legato": (60,65),
 "Crescendo Keep": (-165,0),
 "Caesura Crossing": (-255,-115),
 "Adagio": (-250,120),
 "Coda Cove": (-385,-35),
}
spec = {
 "Wind Academy": (132,-82),
 "Trioasis": (-243,-132),
 "Presto Pass": (-132,2),
 "The Maelstrom": (-460,-30),
}
island_city = {"DISCORDIA  (Hall of Discord)": (-565,-10)}
regions = {  # italic area labels
 "MELODIOUS MEADOWS": (60,55),
 "SANDS OF TIME": (-255,-150),
 "FORGOTTEN FOREST": (-235,30),
 "CHROMATIC  COASTS": (-400,70),
 "SYNCOPATED  SEA": (-470,-155),
 "CONCORD  SEA": (215,-212),
 "THE  STAFF  RANGE": (-132,195),
 "DISSONANT DUNES": (-556,-92),
}

import math
def zig(x0, y0, y1, amp, step):
    pts=[]; y=y0; i=0
    while y>y1:
        pts.append((x0 + (amp if i%2 else -amp), y)); y-=step; i+=1
    return pts

mtn = zig(-132, 222, -212, 12, 24)
westcoast = [(-392 + 14*math.sin(t/55.0), t) for t in range(240,-250,-12)]
eastcoast = [(362 + 10*math.sin(t/50.0), t) for t in range(240,-250,-12)]
# south (Concord) sea coastline sweeping from the range up the SE
southcoast = [(-130,-185),(-40,-200),(60,-205),(170,-198),(280,-185),(362,-170)]
river = [(-132,210),(-90,150),(-40,90),(0,0),(20,-70),(15,-140),(8,-200)]
island = [(-610,30),(-560,55),(-515,20),(-505,-30),(-545,-70),(-600,-45),(-625,-5)]

def poly(pts): return " ".join(f"{sx(x):.1f},{sy(y):.1f}" for x,y in pts)

svg=[]
svg.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="Georgia, serif">')
svg.append(f'<rect width="{W}" height="{H}" fill="#efe2c4"/>')
# sea fill (west of west coast)
seapts=[(Xmin,Ymax)]+westcoast+[(Xmin,Ymin)]
svg.append(f'<polygon points="{poly(seapts)}" fill="#cfd8d0"/>')
# concord sea fill (south-east)
csea=[(Xmax,Ymin)]+list(reversed(southcoast))+[(Xmax,-170)]
svg.append(f'<polygon points="{poly(csea)}" fill="#cfd8d0"/>')
# island
svg.append(f'<polygon points="{poly(island)}" fill="#b9aeb8" stroke="#5b4a55" stroke-width="2"/>')
# coasts
for c in (westcoast, eastcoast, southcoast):
    svg.append(f'<polyline points="{poly(c)}" fill="none" stroke="#6b5a3e" stroke-width="2"/>')
# river
svg.append(f'<polyline points="{poly(river)}" fill="none" stroke="#7d9bb0" stroke-width="2.5"/>')
# mountains
svg.append(f'<polyline points="{poly(mtn)}" fill="none" stroke="#5a4632" stroke-width="3"/>')
for (x,y) in mtn:  # little peaks
    svg.append(f'<text x="{sx(x):.0f}" y="{sy(y)+4:.0f}" font-size="15" fill="#5a4632" text-anchor="middle">▲</text>')
# border
svg.append(f'<rect x="14" y="14" width="{W-28}" height="{H-28}" fill="none" stroke="#5a4632" stroke-width="3"/>')
svg.append(f'<rect x="22" y="22" width="{W-44}" height="{H-44}" fill="none" stroke="#5a4632" stroke-width="1"/>')

def dot(x,y,r,fill):
    svg.append(f'<circle cx="{sx(x):.1f}" cy="{sy(y):.1f}" r="{r}" fill="{fill}" stroke="#3a2c1c" stroke-width="1.5"/>')
def label(x,y,t,size,dx,dy,style='fill="#2c2114"'):
    svg.append(f'<text x="{sx(x)+dx:.1f}" y="{sy(y)+dy:.1f}" font-size="{size}" {style}>{t}</text>')

for n,(x,y) in regions.items():
    label(x,y,n,13,0,0,'text-anchor="middle" font-style="italic" fill="#6a5436" letter-spacing="1"')
for n,(x,y) in cities.items():
    dot(x,y,7,"#c2562e"); label(x,y,n,13,11,4,'font-weight="bold" fill="#2c2114"')
for n,(x,y) in towns.items():
    dot(x,y,4,"#7a5a2e"); label(x,y,n,11,8,3,'fill="#2c2114"')
for n,(x,y) in spec.items():
    dot(x,y,3,"#3a2c1c"); label(x,y,n,10,7,3,'font-style="italic" fill="#2c2114"')
for n,(x,y) in island_city.items():
    dot(x,y,7,"#3a2630"); label(x,y,n,12,12,-12,'font-weight="bold" text-anchor="start" fill="#3a2630"')

# scale bar: 100 mi = 100*PPM px
bx,by,bl = M+10, H-40, 100*PPM
svg.append(f'<rect x="{bx}" y="{by}" width="{bl}" height="7" fill="#2c2114"/>')
svg.append(f'<rect x="{bx}" y="{by}" width="{bl/2}" height="7" fill="#efe2c4" stroke="#2c2114"/>')
svg.append(f'<text x="{bx}" y="{by-6}" font-size="11">0</text>')
svg.append(f'<text x="{bx+bl-12}" y="{by-6}" font-size="11">100 mi</text>')
svg.append(f'<text x="{bx}" y="{by+20}" font-size="10" font-style="italic">scale 1 in = 25 mi  ·  positions to scale, settlement icons symbolic</text>')
# compass NE
cxp,cyp=W-70,70
svg.append(f'<circle cx="{cxp}" cy="{cyp}" r="22" fill="none" stroke="#5a4632" stroke-width="1.5"/>')
svg.append(f'<text x="{cxp}" y="{cyp-24}" font-size="13" text-anchor="middle" font-weight="bold">N</text>')
svg.append(f'<polygon points="{cxp},{cyp-18} {cxp-6},{cyp+6} {cxp+6},{cyp+6}" fill="#c2562e"/>')
# title
svg.append(f'<text x="{W/2}" y="48" font-size="26" text-anchor="middle" font-weight="bold" letter-spacing="4" fill="#5a4632">SYMPHONICA</text>')
svg.append('</svg>')
open("/tmp/claude-0/-home-user-planner/dba25327-0022-5afc-896b-ca9b1e95ea7e/scratchpad/symphonica_blueprint.svg","w").write("\n".join(svg))
print("SVG written", W, "x", H)
