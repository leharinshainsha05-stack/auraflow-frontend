import os

js_path = r'e:\auraflow-frontend\src\App.js'
with open(js_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_h1 = """<h1 style={{fontSize: '3.5rem', color: '#ffffff', fontWeight: 500, letterSpacing: '0.5px', margin: 0, animation: 'professionalFade 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards', display: 'flex', alignItems: 'center', gap: '14px'}}>
           🌊 AuraFlow
         </h1>"""

new_h1 = """<h1 style={{fontSize: '3.5rem', color: '#ffffff', fontWeight: 500, letterSpacing: '0.5px', margin: 0, animation: 'professionalFade 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
           <span style={{marginRight: '8px'}}>🌊</span>AuraFlow
         </h1>"""

if old_h1 in content:
    content = content.replace(old_h1, new_h1)
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Gap successfully reduced!")
else:
    print("WARNING: Could not find the exact h1 block. Applying fallback replacement...")
    if "🌊 AuraFlow" in content:
        content = content.replace("🌊 AuraFlow", "<span style={{marginRight: '8px'}}>🌊</span>AuraFlow")
        with open(js_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Fallback replacement done!")
