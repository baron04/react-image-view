# -*- coding: utf-8 -*-
P = [
 dict(key='indigo', name='靛青墨', en='Ink Indigo', pick=True,
      idea='档案与墨水的联想。群青自古是文书用色，冷而正式，适合"这是一份需要被核对的材料"。',
      pro='比青蓝有性格，仍然克制；蓝色系不会和成功/警告的语义色打架。',
      con='冷色调偏严肃，长期盯着略显硬。',
      L=dict(stage='#F2F4F8', chrome='#FFFFFF', line='#DEE1E8', ink='#14171F', ink2='#565E70', ac='#3D4E8F', acbg='#E9EBF5'),
      D=dict(stage='#121419', chrome='#1B1D24', line='#2A2E3A', ink='#E5E7EE', ink2='#959BAE', ac='#8E9BDB', acbg='#242840')),
 dict(key='celadon', name='青瓷', en='Celadon',
      idea='去饱和的青绿，取自瓷器釉色。是四个里最安静的一个，几乎不参与视觉竞争。',
      pro='中性感最强，对图片颜色判断的干扰最小；开发工具里罕见，不会撞脸。',
      con='绿色天然带"通过/成功"的语义，和状态色需要拉开距离才不混淆。',
      L=dict(stage='#E4E9E6', chrome='#FFFFFF', line='#DAE1DD', ink='#151A18', ink2='#556059', ac='#3E7A66', acbg='#E2EFEA'),
      D=dict(stage='#111412', chrome='#1A1E1C', line='#28302C', ink='#E4EAE7', ink2='#93A09A', ac='#63B396', acbg='#1C3229')),
 dict(key='ochre', name='赭石', en='Ochre',
      idea='暖色中性打底 + 赭石强调，来自暗房和相纸的联想。四个里唯一的暖色系。',
      pro='最有记忆点；暖灰打底看久了比冷灰舒服，配黑白扫描件尤其好看。',
      con='暖色容易被读成"警告"，用在激活态要靠形状和位置把语义说清。',
      L=dict(stage='#EAE7E1', chrome='#FFFDFA', line='#E1DDD5', ink='#1B1815', ink2='#5F5850', ac='#9A6428', acbg='#F3E9D9'),
      D=dict(stage='#16140F', chrome='#201E1A', line='#312D26', ink='#EBE7E0', ink2='#A09990', ac='#D19A55', acbg='#33291A')),
 dict(key='mono', name='无彩', en='Achromatic',
      idea='完全不用彩色强调。激活态是反色的石墨块，焦点环靠纯明度对比。',
      pro='最贴合"安静的仪表，不抢图片"——界面上任何有色元素都会轻微影响对图片颜色的判断，这一版把干扰归零。',
      con='最克制也最冷淡，缺少品牌记忆点；失败态的主按钮要另想办法强调。',
      L=dict(stage='#E8EAEA', chrome='#FFFFFF', line='#DFE2E2', ink='#131616', ink2='#575C5C', ac='#131616', acbg='#131616', inv='#FFFFFF'),
      D=dict(stage='#121414', chrome='#1B1D1D', line='#2A2D2D', ink='#E6E8E8', ink2='#909595', ac='#E6E8E8', acbg='#E6E8E8', inv='#131616')),
]

ZO='<circle cx="8.7" cy="8.7" r="5.4"/><path d="M12.7 12.7L16.8 16.8M6.4 8.7h4.6"/>'
ZI='<circle cx="8.7" cy="8.7" r="5.4"/><path d="M12.7 12.7L16.8 16.8M6.4 8.7h4.6M8.7 6.4v4.6"/>'
RL='<path d="M3.6 10a6.4 6.4 0 1 1 1.9 4.5"/><path d="M3.2 6.2v3.9h3.9"/>'
RR='<path d="M16.4 10a6.4 6.4 0 1 0-1.9 4.5"/><path d="M16.8 6.2v3.9h-3.9"/>'
FT='<path d="M3 7V3h4M17 7V3h-4M3 13v4h4M17 13v4h-4"/>'
ONE=('<rect x="2.5" y="4.75" width="15" height="10.5" rx="2"/><text x="10" y="12.7" text-anchor="middle" '
     'font-family="\'IBM Plex Mono\',monospace" font-size="7.6" font-weight="600" fill="currentColor" '
     'stroke="none" letter-spacing="-.2">1:1</text>')
DL='<path d="M10 3.5v8.5M6.6 8.8L10 12.2l3.4-3.4M4 14.2v2.3h12v-2.3"/>'
CL='<path d="M5.5 5.5l9 9M14.5 5.5l-9 9"/>'

def ic(b, s=18, jo=False):
    lc = '' if jo else ' stroke-linecap="round"'
    return (f'<svg width="{s}" height="{s}" viewBox="0 0 20 20" fill="none" stroke="currentColor" '
            f'stroke-width="1.5"{lc} stroke-linejoin="round">{b}</svg>')

def strip(c, mono=False):
    acbg = c['acbg']; acfg = c.get('inv', c['ac'])
    on = f'background:{acbg}; color:{acfg};'
    btn = lambda b, extra='': f'<div style="display:flex;align-items:center;justify-content:center;height:30px;min-width:30px;padding:0 6px;border-radius:6px;color:{c["ink2"]};{extra}">{ic(b)}</div>'
    return f'''<div style="border:1px solid {c['line']}; border-radius:8px; overflow:hidden; background:{c['chrome']};">
  <div style="height:40px; display:flex; align-items:center; gap:9px; padding:0 10px 0 7px; border-bottom:1px solid {c['line']};">
    <div style="display:flex;align-items:center;gap:6px;color:{c['ink2']};font-size:12px;">{ic(CL,16)}关闭</div>
    <div style="width:1px;height:15px;background:{c['line']};"></div>
    <div style="font-size:12px;font-weight:500;color:{c['ink']};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">采购合同_扫描件.jpg</div>
    <div style="flex:1;"></div>
    <div style="display:flex;align-items:center;gap:5px;height:26px;padding:0 9px;border:1px solid {c['line']};border-radius:5px;color:{c['ink2']};font-size:11.5px;">{ic(DL,14)}下载</div>
  </div>
  <div style="height:120px; background:{c['stage']}; display:flex; align-items:center; justify-content:center; position:relative;">
    <div style="position:absolute;top:0;left:0;right:0;height:2px;background:{c['line']};"><div style="width:44%;height:100%;background:{c['ac']};"></div></div>
    <div style="width:74px;height:96px;background:#FDFCFA;box-shadow:0 6px 18px -8px rgba(0,0,0,.34);display:flex;flex-direction:column;gap:5px;padding:11px 10px;">
      <div style="width:60%;height:4px;background:#2E3A42;"></div>
      <div style="width:100%;height:3px;background:#D2D9DE;"></div>
      <div style="width:88%;height:3px;background:#D2D9DE;"></div>
      <div style="width:96%;height:3px;background:#D2D9DE;"></div>
      <div style="width:52%;height:3px;background:#D2D9DE;"></div>
    </div>
  </div>
  <div style="display:flex; align-items:center; justify-content:center; padding:11px 0 13px; background:{c['chrome']};">
    <div style="display:flex;align-items:center;gap:3px;height:40px;padding:0 6px;background:{c['chrome']};border:1px solid {c['line']};border-radius:10px;box-shadow:0 8px 20px -12px rgba(0,0,0,.45);">
      {btn(ZO)}{btn(ZI)}
      <div style="width:1px;height:19px;background:{c['line']};margin:0 3px;"></div>
      {btn(RL)}{btn(RR)}
      <div style="width:1px;height:19px;background:{c['line']};margin:0 3px;"></div>
      {btn(FT, on)}{btn(ONE, f'box-shadow:0 0 0 2px {c["chrome"]}, 0 0 0 4px {c["ac"]};')}
    </div>
  </div>
</div>'''

cards = ''
for p in P:
    cards += f'''<div style="display:flex; flex-direction:column; gap:12px;{'outline:2px solid #3D4E8F; outline-offset:11px; border-radius:2px;' if p.get('pick') else ''}">
  <div style="display:flex; align-items:baseline; gap:8px;">
    <span style="font-size:15px; font-weight:600;">{p['name']}</span>
    <span style="font-family:'IBM Plex Mono',monospace; font-size:10.5px; color:#969CAC; letter-spacing:.04em;">{p['en']}</span>
    {'<span style="font-family:&#39;IBM Plex Mono&#39;,monospace; font-size:9.5px; font-weight:600; letter-spacing:.08em; background:#E9EBF5; color:#3D4E8F; padding:2px 6px; border-radius:3px;">选定</span>' if p.get('pick') else ''}
  </div>
  <div style="display:flex; gap:5px;">
    <div style="flex:1;height:26px;border-radius:4px;background:{p['L']['ac']};"></div>
    <div style="flex:1;height:26px;border-radius:4px;background:{p['L']['stage']};border:1px solid rgba(0,0,0,.07);"></div>
    <div style="flex:1;height:26px;border-radius:4px;background:{p['D']['stage']};"></div>
    <div style="flex:1;height:26px;border-radius:4px;background:{p['D']['ac']};"></div>
  </div>
  <div style="font-size:11.5px; line-height:1.6; color:#565E70;">{p['idea']}</div>
  {strip(p['L'])}
  {strip(p['D'], mono=(p['key']=='mono'))}
  <div style="display:flex; flex-direction:column; gap:5px; font-size:11px; line-height:1.55;">
    <div style="color:#2F6B52;"><strong>长</strong> {p['pro']}</div>
    <div style="color:#8C5A50;"><strong>短</strong> {p['con']}</div>
  </div>
</div>'''

html = f'''<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;700&display=swap">
  <style>
    body {{ margin: 0; }}
    a {{ color: #3D4E8F; }} a:hover {{ color: #2C3A6E; }}
    .pal * {{ box-sizing: border-box; }}
    .pal svg {{ display: block; }}
  </style>
</helmet>

<div class="pal" style="width:1440px; height:960px; background:#F6F7FA; font-family:'IBM Plex Sans','Noto Sans SC',system-ui,sans-serif; color:#14171F; padding:40px 44px; display:flex; flex-direction:column; gap:26px;">
  <div style="display:flex; flex-direction:column; gap:9px;">
    <div style="font-family:'IBM Plex Mono',monospace; font-size:10px; font-weight:500; letter-spacing:.14em; text-transform:uppercase; color:#969CAC;">待定 · 主题色方向</div>
    <div style="font-size:24px; font-weight:600; letter-spacing:-.01em;">四个方向，深浅两版一起看</div>
    <div style="font-size:13px; line-height:1.65; color:#565E70; max-width:96ch;">强调色在这个产品里只出现在四个地方：<strong style="color:#14171F;">激活态、键盘焦点环、加载进度条、失败态的主按钮</strong>。面积极小，所以选色的标准不是"好不好看"，是<strong style="color:#14171F;">会不会干扰使用者对被审阅那张图的颜色判断</strong>——每个方向的中性灰也跟着换了，这比换强调色本身影响更大。<br>下面每格：上半是浅色，下半是暗色，「适应窗口」为激活态，「1:1」带键盘焦点环。</div>
  </div>
  <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:22px;">{cards}</div>
</div>
</x-dc>

<script data-dc-script data-props='{{}}'>
class Component extends DCLogic {{ renderVals() {{ return {{}}; }} }}
</script>
</body>
</html>
'''
open('Palette.dc.html','w').write(html)
print('Palette.dc.html', len(html), 'bytes')
