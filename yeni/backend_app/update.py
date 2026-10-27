import os

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

items = [
    ('sensor-5.html', 'Sensör 5'),
    ('sensor-d.html', 'Sensör D'),
    ('sensor-x.html', 'Sensör X'),
    ('blower-de-icing.html', 'Blower De-icing'),
    ('branda-de-icing.html', 'Branda De-icing'),
    ('radom-de-icing.html', 'Radom De-icing'),
    ('termoplastik-de-icing.html', 'Termoplastik De-icing'),
    ('ped-de-icing.html', 'Ped De-icing')
]

for file, name in items:
    path = os.path.join(base_dir, 'items', file)
    if not os.path.exists(path):
        continue
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace navbar
    content = content.replace(
        '<li><a href="../contact.html">İletişim</a></li>\n    </ul>',
        '<li><a href="../contact.html">İletişim</a></li>\n      <li><a href="../cart.html" class="cart-nav-link">Sepet <span id="cart-badge" style="display:none;">0</span></a></li>\n    </ul>'
    )
    
    # Replace button
    btn_html = f'''<div style="margin-top: 2rem; display: flex; gap: 1rem; align-items: center;">
          <input type="number" id="qty-input" value="1" min="1" style="width: 80px; padding: 0.75rem; border-radius: 4px; border: 1px solid var(--border-color); background: #111; color: #fff;">
          <button class="btn" onclick="window.cart.addItem('{name}', document.getElementById('qty-input').value)">Sepete Ekle</button>
        </div>'''
    
    content = content.replace(
        '<a href="../contact.html" class="btn" style="margin-top: 2rem;">Teklif İste</a>',
        btn_html
    )
    
    # Add JS script to the bottom if missing
    if '<script src="../js/app.js"></script>' not in content:
        content = content.replace('</body>', '  <script src="../js/app.js"></script>\n</body>')
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# Update main pages
mains = ['index.html', 'about.html', 'projects.html', 'references.html', 'contact.html']
for m in mains:
    path = os.path.join(base_dir, 'frontend', m)
    if not os.path.exists(path):
        path = os.path.join(base_dir, m)
    if not os.path.exists(path):
        continue
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace(
        '<li><a href="contact.html" style="color: var(--accent-red);">İletişim</a></li>\n    </ul>',
        '<li><a href="contact.html" style="color: var(--accent-red);">İletişim</a></li>\n      <li><a href="cart.html" class="cart-nav-link">Sepet <span id="cart-badge" style="display:none;">0</span></a></li>\n    </ul>'
    )
    content = content.replace(
        '<li><a href="contact.html">İletişim</a></li>\n    </ul>',
        '<li><a href="contact.html">İletişim</a></li>\n      <li><a href="cart.html" class="cart-nav-link">Sepet <span id="cart-badge" style="display:none;">0</span></a></li>\n    </ul>'
    )
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Updates complete.")
