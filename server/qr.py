from html import escape


def gf_multiply(x: int, y: int) -> int:
    z = 0
    while y:
        if y & 1:
            z ^= x
        x <<= 1
        if x & 0x100:
            x ^= 0x11D
        y >>= 1
    return z


def gf_pow(x: int, power: int) -> int:
    result = 1
    for _ in range(power):
        result = gf_multiply(result, x)
    return result


def rs_generator_poly(degree: int) -> list[int]:
    poly = [1]
    for i in range(degree):
        factor = [1, gf_pow(2, i)]
        next_poly = [0] * (len(poly) + 1)
        for j, coeff in enumerate(poly):
            next_poly[j] ^= gf_multiply(coeff, factor[0])
            next_poly[j + 1] ^= gf_multiply(coeff, factor[1])
        poly = next_poly
    return poly


def rs_remainder(data: list[int], degree: int) -> list[int]:
    generator = rs_generator_poly(degree)
    result = [0] * degree
    for byte in data:
        factor = byte ^ result.pop(0)
        result.append(0)
        for i in range(degree):
            result[i] ^= gf_multiply(generator[i + 1], factor)
    return result


def append_bits(bits: list[int], value: int, length: int) -> None:
    for i in range(length - 1, -1, -1):
        bits.append((value >> i) & 1)


def make_qr_svg(data: str, border: int = 4, module_size: int = 8) -> str:
    # Fixed QR version 4-L: enough for the local pairing URL and simple to keep dependency-free.
    version = 4
    size = 21 + 4 * (version - 1)
    data_codewords = 80
    ecc_codewords = 20
    modules = [[False for _ in range(size)] for _ in range(size)]
    is_function = [[False for _ in range(size)] for _ in range(size)]

    def set_module(x: int, y: int, value: bool, function: bool = True) -> None:
        if 0 <= x < size and 0 <= y < size:
            modules[y][x] = value
            if function:
                is_function[y][x] = True

    def draw_finder(x: int, y: int) -> None:
        for dy in range(-1, 8):
            for dx in range(-1, 8):
                xx = x + dx
                yy = y + dy
                if not (0 <= xx < size and 0 <= yy < size):
                    continue
                value = (
                    0 <= dx <= 6
                    and 0 <= dy <= 6
                    and (dx in {0, 6} or dy in {0, 6} or (2 <= dx <= 4 and 2 <= dy <= 4))
                )
                set_module(xx, yy, value)

    def draw_alignment(cx: int, cy: int) -> None:
        for dy in range(-2, 3):
            for dx in range(-2, 3):
                distance = max(abs(dx), abs(dy))
                set_module(cx + dx, cy + dy, distance in {0, 2})

    def format_bits() -> int:
        data_bits = 0b01000
        value = data_bits << 10
        generator = 0x537
        for i in range(14, 9, -1):
            if (value >> i) & 1:
                value ^= generator << (i - 10)
        return ((data_bits << 10) | value) ^ 0x5412

    def draw_format() -> None:
        bits = format_bits()
        get = lambda i: bool((bits >> i) & 1)
        for i in range(6):
            set_module(8, i, get(i))
        set_module(8, 7, get(6))
        set_module(8, 8, get(7))
        set_module(7, 8, get(8))
        for i in range(9, 15):
            set_module(14 - i, 8, get(i))
        for i in range(8):
            set_module(size - 1 - i, 8, get(i))
        for i in range(8, 15):
            set_module(8, size - 15 + i, get(i))
        set_module(8, size - 8, True)

    draw_finder(0, 0)
    draw_finder(size - 7, 0)
    draw_finder(0, size - 7)
    draw_alignment(26, 26)
    for i in range(8, size - 8):
        set_module(i, 6, i % 2 == 0)
        set_module(6, i, i % 2 == 0)
    draw_format()

    payload = data.encode("utf-8")
    if len(payload) > 78:
        raise ValueError("QR payload too long")

    bits: list[int] = []
    append_bits(bits, 0b0100, 4)
    append_bits(bits, len(payload), 8)
    for byte in payload:
        append_bits(bits, byte, 8)
    append_bits(bits, 0, min(4, data_codewords * 8 - len(bits)))
    while len(bits) % 8:
        bits.append(0)

    codewords = []
    for i in range(0, len(bits), 8):
        codewords.append(sum(bits[i + j] << (7 - j) for j in range(8)))
    for pad in [0xEC, 0x11] * data_codewords:
        if len(codewords) >= data_codewords:
            break
        codewords.append(pad)
    codewords.extend(rs_remainder(codewords, ecc_codewords))
    data_bits = [(byte >> i) & 1 for byte in codewords for i in range(7, -1, -1)]

    bit_index = 0
    upward = True
    x = size - 1
    while x > 0:
        if x == 6:
            x -= 1
        for vertical in range(size):
            y = size - 1 - vertical if upward else vertical
            for dx in range(2):
                xx = x - dx
                if is_function[y][xx]:
                    continue
                value = bit_index < len(data_bits) and bool(data_bits[bit_index])
                bit_index += 1
                if (xx + y) % 2 == 0:
                    value = not value
                modules[y][xx] = value
        upward = not upward
        x -= 2

    total = (size + border * 2) * module_size
    rects = []
    for y, row in enumerate(modules):
        for x, value in enumerate(row):
            if value:
                rects.append(
                    f'<rect x="{(x + border) * module_size}" y="{(y + border) * module_size}" '
                    f'width="{module_size}" height="{module_size}"/>'
                )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total} {total}" '
        f'width="{total}" height="{total}" shape-rendering="crispEdges">'
        f'<rect width="100%" height="100%" fill="#fff"/>'
        f'<g fill="#000">{"".join(rects)}</g></svg>'
    )


def pairing_url(host: str, port: int, pin: str) -> str:
    return f"http://{host}:{port}/?pin={pin}"


def pairing_page(pin: str, url: str) -> str:
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>iPad Display — Pair</title>
  <style>
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}

    body {{
      min-height: 100dvh;
      display: grid;
      place-items: center;
      background: #000;
      color: #f5f5f7;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
      padding: 24px;
      position: relative;
      overflow: hidden;
    }}

    body::before {{
      content: '';
      position: fixed;
      inset: 0;
      background:
        radial-gradient(ellipse 80% 55% at 50% -5%, rgba(10,132,255,0.18) 0%, transparent 60%),
        radial-gradient(ellipse 50% 40% at 85% 100%, rgba(48,209,88,0.07) 0%, transparent 55%);
      pointer-events: none;
    }}

    @keyframes rise {{
      from {{ opacity: 0; transform: translateY(14px); }}
      to   {{ opacity: 1; transform: translateY(0); }}
    }}

    main {{
      position: relative;
      width: min(420px, 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      background: rgba(28,28,30,0.78);
      backdrop-filter: blur(40px) saturate(200%);
      -webkit-backdrop-filter: blur(40px) saturate(200%);
      border: 0.5px solid rgba(255,255,255,0.1);
      border-radius: 24px;
      padding: 36px 28px 28px;
      box-shadow: 0 28px 80px rgba(0,0,0,0.65), inset 0 0.5px 0 rgba(255,255,255,0.07);
      animation: rise 0.4s cubic-bezier(0.25,0.46,0.45,0.94) both;
    }}

    .icon {{
      width: 64px; height: 64px;
      background: rgba(10,132,255,0.1);
      border: 0.5px solid rgba(10,132,255,0.28);
      border-radius: 18px;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 20px;
      font-size: 28px;
      box-shadow: 0 0 32px rgba(10,132,255,0.15);
    }}

    h1 {{
      font-size: 24px; font-weight: 600;
      letter-spacing: -0.025em;
      color: #f5f5f7;
      margin-bottom: 6px;
    }}

    .subtitle {{
      font-size: 14px;
      color: rgba(235,235,245,0.5);
      text-align: center;
      line-height: 1.5;
      margin-bottom: 28px;
    }}

    .qr-card {{
      background: #fff;
      border-radius: 16px;
      padding: 14px;
      margin-bottom: 28px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.35);
    }}
    .qr-card img {{
      display: block;
      width: min(260px, 68vw);
      height: auto;
    }}

    .divider {{
      width: 100%;
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
      color: rgba(235,235,245,0.25);
      font-size: 12px;
      letter-spacing: 0.05em;
    }}
    .divider::before, .divider::after {{
      content: '';
      flex: 1;
      height: 0.5px;
      background: rgba(84,84,88,0.5);
    }}

    .pin-group {{
      width: 100%;
      background: rgba(44,44,46,0.9);
      border: 0.5px solid rgba(255,255,255,0.07);
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      margin-bottom: 12px;
    }}
    .pin-label {{
      font-size: 11px; font-weight: 600;
      color: rgba(235,235,245,0.42);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 8px;
    }}
    .pin {{
      font-size: 40px; font-weight: 700;
      letter-spacing: 0.18em;
      font-variant-numeric: tabular-nums;
      font-family: "SF Mono", "Menlo", monospace;
      color: #f5f5f7;
    }}

    .url-group {{
      width: 100%;
      background: rgba(44,44,46,0.9);
      border: 0.5px solid rgba(255,255,255,0.07);
      border-radius: 12px;
      padding: 12px 14px;
    }}
    .url-label {{
      font-size: 11px; font-weight: 600;
      color: rgba(235,235,245,0.42);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 6px;
    }}
    .url {{
      font-size: 13px;
      font-family: "SF Mono", "Menlo", monospace;
      color: #0a84ff;
      word-break: break-all;
      line-height: 1.45;
      cursor: pointer;
      user-select: all;
    }}

    .hint {{
      margin-top: 20px;
      font-size: 12px;
      color: rgba(235,235,245,0.3);
      text-align: center;
      line-height: 1.5;
    }}
  </style>
</head>
<body>
  <main>
    <div class="icon">📱</div>
    <h1>iPad Display</h1>
    <p class="subtitle">Scan with your iPad's camera<br>or enter the PIN in the app</p>

    <div class="qr-card">
      <img alt="Pairing QR code" src="/pair-qr.svg" />
    </div>

    <div class="divider">or enter manually</div>

    <div class="pin-group">
      <div class="pin-label">Pairing PIN</div>
      <div class="pin">{escape(pin)}</div>
    </div>

    <div class="url-group">
      <div class="url-label">URL</div>
      <div class="url" title="Click to copy" onclick="navigator.clipboard?.writeText(this.textContent).then(()=>this.style.color='#30d158').catch(()=>{{}})">{escape(url)}</div>
    </div>

    <p class="hint">Keep this window open while pairing.<br>Tap the URL to copy it.</p>
  </main>
</body>
</html>"""
