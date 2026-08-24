# -*- coding: utf-8 -*-
import io, os

LIGHT = dict(
    chrome='#FFFFFF', stage='#F2F4F8', line='#DEE1E8', ink='#14171F', ink2='#565E70',
    ink3='#8A90A0', hover='#ECEEF3', accent='#3D4E8F', accentBg='#E9EBF5',
    btnBorder='#DBDEE6', btnBg='#FFFFFF', btnInk='#2B3242', tbBg='#FFFFFF',
    tbBorder='#E2E5EC', divider='#E5E8EE', nav='#7A8194', navHover='rgba(255,255,255,.74)',
    closeInk='#3C4354', tbInk='#3C4354',
    tbShadow='0 2px 4px rgba(20,26,32,.05), 0 14px 34px -16px rgba(20,26,32,.34)',
    paperShadow='0 0 0 1px rgba(20,26,32,.055), 0 1px 2px rgba(20,26,32,.08), 0 16px 38px -14px rgba(20,26,32,.34)',
    linkA='#3D4E8F', linkB='#2C3A6E', ns='l')
DARK = dict(
    chrome='#1B1D24', stage='#121419', line='#2A2E3A', ink='#E5E7EE', ink2='#959BAE',
    ink3='#7A8093', hover='#282C38', accent='#8E9BDB', accentBg='#242840',
    btnBorder='#343949', btnBg='#232735', btnInk='#D4D8E4', tbBg='#23262F',
    tbBorder='#303543', divider='#333849', nav='#767D90', navHover='rgba(255,255,255,.06)',
    closeInk='#B4BACA', tbInk='#A6ADBE',
    tbShadow='0 18px 40px -18px rgba(0,0,0,.9)',
    paperShadow='0 0 0 1px rgba(255,255,255,.06), 0 18px 48px -18px rgba(0,0,0,.8)',
    linkA='#8E9BDB', linkB='#A9B3E5', ns='d')

FONTS = ("<link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?"
         "family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&"
         "family=Noto+Sans+SC:wght@400;500&display=swap\">")

I_CLOSE  = '<path d="M5.5 5.5l9 9M14.5 5.5l-9 9"/>'
I_PREV   = '<path d="M12.5 4.5L7 10l5.5 5.5"/>'
I_NEXT   = '<path d="M7.5 4.5L13 10l-5.5 5.5"/>'
I_ZOUT   = '<circle cx="8.7" cy="8.7" r="5.4"/><path d="M12.7 12.7L16.8 16.8M6.4 8.7h4.6"/>'
I_ZIN    = '<circle cx="8.7" cy="8.7" r="5.4"/><path d="M12.7 12.7L16.8 16.8M6.4 8.7h4.6M8.7 6.4v4.6"/>'
I_ROTL   = '<path d="M3.6 10a6.4 6.4 0 1 1 1.9 4.5"/><path d="M3.2 6.2v3.9h3.9"/>'
I_ROTR   = '<path d="M16.4 10a6.4 6.4 0 1 0-1.9 4.5"/><path d="M16.8 6.2v3.9h-3.9"/>'
I_FIT    = '<path d="M3 7V3h4M17 7V3h-4M3 13v4h4M17 13v4h-4"/>'
I_DL     = '<path d="M10 3.5v8.5M6.6 8.8L10 12.2l3.4-3.4M4 14.2v2.3h12v-2.3"/>'
I_ONE_FRAMED = ('<rect x="3" y="3" width="14" height="14" rx="2.6"/>'
    '<text x="10" y="12.45" text-anchor="middle" font-family="\'IBM Plex Mono\',ui-monospace,monospace" '
    'font-size="6.4" font-weight="600" fill="currentColor" stroke="none" letter-spacing="-.15">1:1</text>')
I_RETRY  = '<path d="M16.4 10a6.4 6.4 0 1 1-1.9-4.5"/><path d="M16.8 2.6v3.9h-3.9"/>'

def sv(body, size=19, stroke='currentColor', w=1.5, extra=''):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 20 20" fill="none" '
            f'stroke="{stroke}" stroke-width="{w}" stroke-linecap="round" '
            f'stroke-linejoin="round"{extra}>{body}</svg>')

def head(t, name):
    n = t['ns'] + name
    return f'''<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  {FONTS}
  <style>
    body {{ margin: 0; }}
    a {{ color: {t['linkA']}; }} a:hover {{ color: {t['linkB']}; }}
    .{n} * {{ box-sizing: border-box; }}
    .{n} svg {{ display: block; }}
    .{n} .tb {{ display:flex; align-items:center; justify-content:center; height:32px; min-width:32px; padding:0 7px; border:0; background:transparent; border-radius:6px; color:{t['tbInk']}; cursor:pointer; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:12px; font-weight:600; letter-spacing:.02em; }}
    .{n} .tb:hover {{ background:{t['hover']}; color:{t['ink']}; }}
    .{n} .tb[data-on="1"] {{ background:{t['accentBg']}; color:{t['accent']}; }}
    .{n} .tb[data-off="1"] {{ color:{t['ink3']}; opacity:.5; cursor:default; }}
    .{n} .nav {{ position:absolute; top:50%; transform:translateY(-50%); width:56px; height:96px; display:flex; align-items:center; justify-content:center; border:0; background:transparent; color:{t['nav']}; cursor:pointer; border-radius:8px; }}
    .{n} .nav:hover {{ background:{t['navHover']}; color:{t['ink']}; }}
  </style>
</helmet>
'''

def topbar(t, name, fname='采购合同_扫描件_第3页.jpg', dim=False):
    n = t['ns'] + name
    ink = t['ink3'] if dim else t['ink']
    return f'''  <div style="height:48px; flex:none; display:flex; align-items:center; gap:12px; padding:0 12px 0 8px; background:{t['chrome']}; border-bottom:1px solid {t['line']};">
      <button style="display:flex; align-items:center; gap:7px; height:32px; padding:0 11px 0 9px; border:0; background:transparent; border-radius:6px; color:{t['closeInk']}; font-family:inherit; font-size:13px; cursor:pointer;">
        {sv(I_CLOSE, 18)}
        关闭
      </button>
      <div style="width:1px; height:18px; background:{t['line']};"></div>
      <div style="font-size:13.5px; font-weight:500; color:{ink}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0;">{fname}</div>
      <div style="flex:1;"></div>
      <button style="display:flex; align-items:center; gap:7px; height:32px; padding:0 12px; border:1px solid {t['btnBorder']}; background:{t['btnBg']}; border-radius:6px; color:{t['btnInk']}; font-family:inherit; font-size:13px; cursor:pointer;">
        {sv(I_DL, 16)}
        下载
      </button>
  </div>
'''

def toolbar(t, name, fit_on=True, one_on=False, muted=False):
    op = ' opacity:.62;' if muted else ''
    off = ' data-off="1"' if muted else ''
    fit_attr = '' if muted else (' data-on="1"' if fit_on else '')
    one_attr = '' if muted else (' data-on="1"' if one_on else '')
    return f'''    <div style="position:absolute; left:50%; bottom:22px; transform:translateX(-50%); display:flex; align-items:center; gap:4px; height:44px; padding:0 7px; background:{t['tbBg']}; border:1px solid {t['tbBorder']}; border-radius:11px; box-shadow:{t['tbShadow']};{op}">
      <button class="tb"{off} title="缩小  −">{sv(I_ZOUT)}</button>
      <button class="tb"{off} title="放大  +">{sv(I_ZIN)}</button>
      <div style="width:1px; height:22px; background:{t['divider']}; margin:0 4px;"></div>
      <button class="tb"{off} title="向左旋转  ⇧R">{sv(I_ROTL)}</button>
      <button class="tb"{off} title="向右旋转  R">{sv(I_ROTR)}</button>
      <div style="width:1px; height:22px; background:{t['divider']}; margin:0 4px;"></div>
      <button class="tb"{off}{fit_attr} title="适应窗口  0">{sv(I_FIT)}</button>
      <button class="tb"{off}{one_attr} title="原始尺寸 3024 × 4032  1">{sv(I_ONE_FRAMED)}</button>
    </div>
'''

def navs(t, opacity=1.0, hidden_right=False):
    o = f' opacity:{opacity};' if opacity < 1 else ''
    right = '' if hidden_right else f'''    <button class="nav" style="right:10px;{o}">{sv(I_NEXT, 26, w=1.6)}</button>
'''
    return f'''    <button class="nav" style="left:10px;{o}">{sv(I_PREV, 26, w=1.6)}</button>
{right}'''

def paper(w, h, pad, gap, scale=1.0, sig=True):
    u = lambda v: round(v * scale, 1)
    rows = ''.join(f'<div style="width:{p}%; height:{u(6)}px; background:#D2D9DE; border-radius:1px;"></div>'
                   for p in (100, 94, 97, 61))
    rows2 = ''.join(f'<div style="width:{p}%; height:{u(6)}px; background:#D2D9DE; border-radius:1px;"></div>'
                    for p in (88, 73))
    cells = ''.join(f'<div style="background:{c}; height:{u(22)}px;"></div>'
                    for c in ['#F3F5F6']*3 + ['#FDFCFA']*6)
    sigblock = f'''
      <div style="flex:1;"></div>
      <div style="display:flex; align-items:flex-end; justify-content:space-between;">
        <svg width="{u(118)}" height="{u(44)}" viewBox="0 0 118 44" fill="none" stroke="#3B4750" stroke-width="{max(1.6, 1.6/scale):.1f}" stroke-linecap="round"><path d="M4 32c9-16 14-20 18-13s-2 20 4 20 9-14 15-21 11 6 17 3 9-12 14-14 12 8 20 6"/></svg>
        <svg width="{u(66)}" height="{u(66)}" viewBox="0 0 66 66" fill="none" style="transform:rotate(-13deg); opacity:.5;">
          <circle cx="33" cy="33" r="27" stroke="#B4453C" stroke-width="{max(2.2, 2.2/scale):.1f}"/>
          <circle cx="33" cy="33" r="21" stroke="#B4453C" stroke-width="{max(1, 1/scale):.1f}"/>
          <rect x="16" y="30" width="34" height="6" rx="1" fill="#B4453C"/>
        </svg>
      </div>''' if sig else ''
    return f'''<div style="display:flex; flex-direction:column; gap:{u(16)}px; padding:{u(38)}px {u(40)}px; height:100%;">
      <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:{u(16)}px;">
        <div style="display:flex; flex-direction:column; gap:{u(7)}px;">
          <div style="width:{u(96)}px; height:{u(9)}px; background:#2E3A42; border-radius:1px;"></div>
          <div style="width:{u(64)}px; height:{u(5)}px; background:#B9C3C9; border-radius:1px;"></div>
        </div>
        <div style="width:{u(44)}px; height:{u(44)}px; border:{max(1.5,1.5/scale):.1f}px solid #DAE0E4; border-radius:3px;"></div>
      </div>
      <div style="height:1px; background:#E4E8EA;"></div>
      <div style="display:flex; flex-direction:column; gap:{u(9)}px;">{rows}</div>
      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:1px; background:#E4E8EA; border:1px solid #E4E8EA;">{cells}</div>
      <div style="display:flex; flex-direction:column; gap:{u(9)}px;">{rows2}</div>{sigblock}
    </div>'''

def shell(t, name, body, w=1280, h=800):
    n = t['ns'] + name
    return (head(t, name)
            + f'''
<div class="{n}" style="width:{w}px; height:{h}px; display:flex; flex-direction:column; background:{t['chrome']}; font-family:\'IBM Plex Sans\',\'Noto Sans SC\',system-ui,sans-serif; color:{t['ink']}; overflow:hidden;">
{body}</div>
</x-dc>

<script data-dc-script data-props='{{}}'>
class Component extends DCLogic {{ renderVals() {{ return {{}}; }} }}
</script>
</body>
</html>
''')

def stage(t, inner, extra_style=''):
    return f'''  <div style="flex:1; position:relative; background:{t['stage']}; display:flex; align-items:center; justify-content:center; min-height:0;{extra_style}">
{inner}  </div>
'''

# ---------- Main ----------
body = topbar(LIGHT, 'main') + stage(LIGHT,
    navs(LIGHT)
    + f'''    <div style="width:432px; height:576px; background:#FDFCFA; box-shadow:{LIGHT['paperShadow']};">{paper(432,576,38,16)}</div>
'''
    + toolbar(LIGHT, 'main', fit_on=True))
open('Main.dc.html','w').write(shell(LIGHT, 'main', body))

# ---------- Zoomed ----------
zbody = topbar(LIGHT, 'zoom') + f'''  <div style="flex:1; position:relative; background:{LIGHT['stage']}; overflow:hidden; min-height:0;">
    <div style="position:absolute; left:50%; top:50%; transform:translate(-58%, -46%); width:864px; height:1152px; background:#FDFCFA; box-shadow:0 0 0 1px rgba(20,26,32,.055), 0 14px 44px -16px rgba(20,26,32,.34);">{paper(864,1152,76,32,scale=2.0,sig=False)}</div>
{navs(LIGHT, opacity=0.45)}{toolbar(LIGHT, 'zoom', fit_on=False, one_on=False)}  </div>
'''
open('Zoomed.dc.html','w').write(shell(LIGHT, 'zoom', zbody))
os.path.exists('ZoomMenu.dc.html') and os.remove('ZoomMenu.dc.html')

# ---------- Loading ----------
lbody = topbar(LIGHT, 'load') + stage(LIGHT,
    f'''    <div style="position:absolute; top:0; left:0; right:0; height:2px; background:rgba(61,78,143,.14);"><div style="width:46%; height:100%; background:{LIGHT['accent']};"></div></div>
'''
    + navs(LIGHT)
    + f'''    <div style="width:432px; height:576px; border:1px dashed #C9D0D5; border-radius:2px; background:rgba(255,255,255,.42); display:flex; align-items:center; justify-content:center;">
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="13" r="10" stroke="#CBD3D8" stroke-width="2.4"/><path d="M13 3a10 10 0 0 1 8.66 5" stroke="{LIGHT['accent']}" stroke-width="2.4" stroke-linecap="round"/></svg>
    </div>
'''
    + toolbar(LIGHT, 'load', muted=True))
open('Loading.dc.html','w').write(shell(LIGHT, 'load', lbody))

# ---------- Error ----------
ebody = topbar(LIGHT, 'err') + stage(LIGHT,
    navs(LIGHT)
    + f'''    <div style="width:400px; display:flex; flex-direction:column; align-items:center; text-align:center;">
      <svg width="46" height="46" viewBox="0 0 46 46" fill="none" style="margin-bottom:20px;">
        <path d="M23 7.5L42 39.5H4z" stroke="#C0968F" stroke-width="2" stroke-linejoin="round" fill="#F5EDEC"/>
        <path d="M23 20v8.4M23 33.2v.1" stroke="#B4453C" stroke-width="2.4" stroke-linecap="round"/>
      </svg>
      <div style="font-size:15px; font-weight:600; line-height:1.4; margin-bottom:8px;">无法加载这张图片</div>
      <div style="font-size:13px; line-height:1.65; color:{LIGHT['ink2']}; margin-bottom:22px;">文件可能已损坏，或使用了浏览器不支持的编码格式。<br>原始文件仍可下载后用本地工具打开。</div>
      <div style="display:flex; align-items:center; gap:10px;">
        <button style="display:flex; align-items:center; gap:7px; height:34px; padding:0 15px; border:1px solid {LIGHT['btnBorder']}; background:#FFFFFF; border-radius:7px; color:{LIGHT['btnInk']}; font-family:inherit; font-size:13px; cursor:pointer;">{sv(I_RETRY,16)}重试</button>
        <button style="display:flex; align-items:center; gap:7px; height:34px; padding:0 15px; border:1px solid {LIGHT['accent']}; background:{LIGHT['accent']}; border-radius:7px; color:#FFFFFF; font-family:inherit; font-size:13px; cursor:pointer;">{sv(I_DL,16)}下载原文件</button>
      </div>
      <div style="font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:11px; color:#9AA4AC; margin-top:20px; letter-spacing:.02em;">ERR_IMAGE_DECODE</div>
    </div>
'''
    + toolbar(LIGHT, 'err', muted=True))
open('Error.dc.html','w').write(shell(LIGHT, 'err', ebody))

# ---------- Dark ----------
dbody = topbar(DARK, 'main') + stage(DARK,
    navs(DARK)
    + f'''    <div style="width:432px; height:576px; background:#FDFCFA; box-shadow:{DARK['paperShadow']};">{paper(432,576,38,16)}</div>
'''
    + toolbar(DARK, 'main', fit_on=True))
open('Dark.dc.html','w').write(shell(DARK, 'main', dbody))

print("regenerated:", ", ".join(sorted(f for f in os.listdir('.') if f.endswith('.dc.html'))))
