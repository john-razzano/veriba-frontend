from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets" / "images"

START = (178, 108, 50)
END = (86, 110, 116)
WHITE = (255, 255, 255, 255)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def lerp_color(start: tuple[int, int, int], end: tuple[int, int, int], t: float) -> tuple[int, int, int, int]:
    return (
        int(lerp(start[0], end[0], t)),
        int(lerp(start[1], end[1], t)),
        int(lerp(start[2], end[2], t)),
        255,
    )


def diagonal_gradient(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size))
    pixels: list[tuple[int, int, int, int]] = []

    for y in range(size):
        for x in range(size):
            t = ((x + y) / (2 * (size - 1))) ** 0.92
            pixels.append(lerp_color(START, END, t))

    image.putdata(pixels)
    return image


def alpha_fill(image: Image.Image, bbox: tuple[float, float, float, float], opacity: float) -> None:
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.ellipse(bbox, fill=(255, 255, 255, int(255 * opacity)))
    image.alpha_composite(overlay)


def cubic_bezier(
    p0: tuple[float, float],
    p1: tuple[float, float],
    p2: tuple[float, float],
    p3: tuple[float, float],
    steps: int = 48,
) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []

    for step in range(steps + 1):
        t = step / steps
        mt = 1 - t
        x = (
            mt**3 * p0[0]
            + 3 * mt**2 * t * p1[0]
            + 3 * mt * t**2 * p2[0]
            + t**3 * p3[0]
        )
        y = (
            mt**3 * p0[1]
            + 3 * mt**2 * t * p1[1]
            + 3 * mt * t**2 * p2[1]
            + t**3 * p3[1]
        )
        points.append((x, y))

    return points


def shield_points(scale: float) -> list[tuple[float, float]]:
    start = (512 * scale, 242 * scale)
    left_top = cubic_bezier(
        start,
        (365 * scale, 242 * scale),
        (272 * scale, 330 * scale),
        (272 * scale, 436 * scale),
    )
    left_side = [(272 * scale, 624 * scale)]
    left_bottom = cubic_bezier(
        (272 * scale, 624 * scale),
        (272 * scale, 756 * scale),
        (373 * scale, 846 * scale),
        (512 * scale, 908 * scale),
    )
    right_bottom = cubic_bezier(
        (512 * scale, 908 * scale),
        (651 * scale, 846 * scale),
        (752 * scale, 756 * scale),
        (752 * scale, 624 * scale),
    )
    right_side = [(752 * scale, 436 * scale)]
    right_top = cubic_bezier(
        (752 * scale, 436 * scale),
        (752 * scale, 330 * scale),
        (659 * scale, 242 * scale),
        start,
    )
    return left_top + left_side + left_bottom + right_bottom + right_side + right_top


def draw_shield(base: Image.Image, foreground_only: bool = False, monochrome: bool = False) -> Image.Image:
    canvas = Image.new("RGBA", base.size, (0, 0, 0, 0)) if foreground_only else base.copy()
    draw = ImageDraw.Draw(canvas, "RGBA")
    scale = base.size[0] / 1024
    points = shield_points(scale)

    if monochrome:
      draw.line(points + [points[0]], fill=WHITE, width=max(24, int(52 * scale)), joint="curve")
      draw.line(
          [
              (432 * scale, 514 * scale),
              (510 * scale, 592 * scale),
              (654 * scale, 460 * scale),
          ],
          fill=WHITE,
          width=max(24, int(52 * scale)),
          joint="curve",
      )
      return canvas

    fill_overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    fill_draw = ImageDraw.Draw(fill_overlay, "RGBA")
    fill_draw.polygon(points, fill=(255, 255, 255, int(255 * (0.16 if not foreground_only else 0.2))))
    canvas = Image.alpha_composite(canvas, fill_overlay)

    draw = ImageDraw.Draw(canvas, "RGBA")
    draw.line(points + [points[0]], fill=(255, 255, 255, int(255 * 0.36)), width=max(2, int(4 * scale)), joint="curve")
    draw.line(
        [
            (446 * scale, 534 * scale),
            (512 * scale, 600 * scale),
            (642 * scale, 484 * scale),
        ],
        fill=WHITE,
        width=max(10, int(18 * scale)),
        joint="curve",
    )
    return canvas


def save_icon(path: Path, image: Image.Image, size: int) -> None:
    image.resize((size, size), Image.Resampling.LANCZOS).save(path)


def main() -> None:
    size = 2048
    background = diagonal_gradient(size)

    alpha_fill(background, (1080, -200, 2200, 920), 0.1)
    alpha_fill(background, (-320, 1160, 960, 2440), 0.055)

    artwork = draw_shield(background)
    android_background = background
    android_foreground = draw_shield(Image.new("RGBA", (size, size), (0, 0, 0, 0)), foreground_only=True)
    android_monochrome = draw_shield(Image.new("RGBA", (size, size), (0, 0, 0, 0)), monochrome=True)

    save_icon(ASSETS / "icon.png", artwork, 1024)
    save_icon(ASSETS / "favicon.png", artwork, 256)
    save_icon(ASSETS / "android-icon-background.png", android_background, 1024)
    save_icon(ASSETS / "android-icon-foreground.png", android_foreground, 1024)
    save_icon(ASSETS / "android-icon-monochrome.png", android_monochrome, 1024)


if __name__ == "__main__":
    main()
