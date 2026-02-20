import base64

with open('Logo Digital Center.png', 'rb') as f:
    data = base64.b64encode(f.read()).decode()

with open('logo.js', 'w') as out:
    out.write('const LOGO_B64 = "data:image/png;base64,' + data + '";')

print('listo')