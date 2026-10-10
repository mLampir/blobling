"""Shows finished frames on the LED panel.

The matrix library has official bindings for Python, but none for Node. So
this small script is all that talks to the panel: another process draws the
frames and sends them here through a pipe.

Messages on stdin:
    b"F" + cols * rows * 3 bytes   one frame, RGB, row by row
    b"B" + 1 byte                  brightness in percent (1-100), from the next frame on

Answers on stdout:
    b"R"   once, as soon as the panel is ready
    b"K"   after each frame, as soon as it is on the panel

It ends when stdin is closed, and clears the panel on the way out.
"""

import argparse
import logging
import os
import signal
import sys

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("panel-driver")


class DummyMatrix:
    """Minimal stand-in for RGBMatrix without hardware."""

    brightness = 100

    def CreateFrameCanvas(self):
        return self

    def SetImage(self, image, *args):
        pass

    def SwapOnVSync(self, canvas):
        return canvas

    def Clear(self):
        pass


def create_matrix(args):
    """The real matrix, or a dummy if the library is missing (development on a PC)."""
    try:
        from rgbmatrix import RGBMatrix, RGBMatrixOptions
    except ImportError:
        log.warning("rgbmatrix is not installed – running without hardware (dummy matrix)")
        return DummyMatrix(), None

    # Imported before the matrix starts: the library gives up root afterwards.
    from PIL import Image

    options = RGBMatrixOptions()
    options.rows = args.rows
    options.cols = args.cols
    options.hardware_mapping = args.hardware_mapping
    options.gpio_slowdown = args.gpio_slowdown
    options.brightness = args.brightness
    options.show_refresh_rate = args.show_refresh_rate
    return RGBMatrix(options=options), Image


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--rows", type=int, default=64)
    parser.add_argument("--cols", type=int, default=64)
    parser.add_argument("--hardware-mapping", default="adafruit-hat")
    parser.add_argument("--gpio-slowdown", type=int, default=2)
    parser.add_argument("--brightness", type=int, default=50)
    parser.add_argument("--show-refresh-rate", action="store_true",
                        help="let the matrix library print its refresh rate to stderr")
    args = parser.parse_args()

    # stdout carries the answers only: whatever the matrix library prints goes to stderr.
    answers = os.fdopen(os.dup(1), "wb", buffering=0)
    os.dup2(2, 1)
    frames = sys.stdin.buffer

    matrix, Image = create_matrix(args)
    canvas = matrix.CreateFrameCanvas()
    size = (args.cols, args.rows)
    frame_bytes = args.cols * args.rows * 3
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))

    answers.write(b"R")
    try:
        while True:
            kind = frames.read(1)
            if not kind:
                break
            if kind == b"F":
                data = frames.read(frame_bytes)
                if len(data) < frame_bytes:
                    break
                if Image is not None:
                    canvas.SetImage(Image.frombytes("RGB", size, data))
                canvas = matrix.SwapOnVSync(canvas)
                answers.write(b"K")
            elif kind == b"B":
                value = frames.read(1)
                if not value:
                    break
                matrix.brightness = min(100, max(1, value[0]))
            else:
                log.error("Unknown message %r – giving up", kind)
                return 2
    except BrokenPipeError:
        pass
    finally:
        matrix.Clear()
    return 0


if __name__ == "__main__":
    sys.exit(main())
