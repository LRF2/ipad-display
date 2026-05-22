"""
Windows HDR auto-management for accurate screen capture.

When Windows HDR is enabled, DXGI Desktop Duplication captures in a color
space that doesn't match sRGB, causing visible color mismatches on the iPad.
This module temporarily disables HDR on HDR-enabled displays at capture start
and restores the original state automatically when the server stops.
"""

import atexit
import ctypes
import ctypes.wintypes as wintypes
import sys

_WIN = sys.platform == "win32"

if _WIN:
    _u32 = ctypes.windll.user32

    _QDC_ACTIVE = 0x2   # QDC_ONLY_ACTIVE_PATHS
    _OK = 0             # ERROR_SUCCESS
    _GET_ADV_COLOR = 14  # DISPLAYCONFIG_DEVICE_INFO_GET_ADVANCED_COLOR_INFO
    _SET_ADV_COLOR = 15  # DISPLAYCONFIG_DEVICE_INFO_SET_ADVANCED_COLOR_STATE

    class _LUID(ctypes.Structure):
        _fields_ = [("lo", ctypes.c_ulong), ("hi", ctypes.c_long)]

    class _SrcInfo(ctypes.Structure):  # 20 bytes
        _fields_ = [
            ("adapterId", _LUID),
            ("id", ctypes.c_uint),
            ("modeInfoIdx", ctypes.c_uint),
            ("statusFlags", ctypes.c_uint),
        ]

    class _TgtInfo(ctypes.Structure):  # 48 bytes
        _fields_ = [
            ("adapterId", _LUID),
            ("id", ctypes.c_uint),
            ("modeInfoIdx", ctypes.c_uint),
            ("outputTechnology", ctypes.c_uint),
            ("rotation", ctypes.c_uint),
            ("scaling", ctypes.c_uint),
            ("refreshRateNum", ctypes.c_uint),   # DISPLAYCONFIG_RATIONAL.Numerator
            ("refreshRateDen", ctypes.c_uint),   # DISPLAYCONFIG_RATIONAL.Denominator
            ("scanLineOrdering", ctypes.c_uint),
            ("targetAvailable", ctypes.c_int),   # BOOL = 4-byte int
            ("statusFlags", ctypes.c_uint),
        ]

    class _PathInfo(ctypes.Structure):  # 72 bytes
        _fields_ = [
            ("sourceInfo", _SrcInfo),
            ("targetInfo", _TgtInfo),
            ("flags", ctypes.c_uint),
        ]

    class _ModeInfo(ctypes.Structure):  # 64 bytes
        _fields_ = [
            ("infoType", ctypes.c_uint),
            ("id", ctypes.c_uint),
            ("adapterId", _LUID),
            ("data", ctypes.c_byte * 48),  # union of mode types (max = TARGET_MODE)
        ]

    class _AdvColorInfo(ctypes.Structure):  # 32 bytes
        _fields_ = [
            ("infoType", ctypes.c_uint),   # header
            ("size", ctypes.c_uint),       # header
            ("adapterId", _LUID),          # header
            ("id", ctypes.c_uint),         # header
            ("value", ctypes.c_uint),      # bit 0=supported, bit 1=enabled
            ("colorEncoding", ctypes.c_uint),
            ("bitsPerColorChannel", ctypes.c_uint),
        ]

    class _SetColorState(ctypes.Structure):  # 24 bytes
        _fields_ = [
            ("infoType", ctypes.c_uint),   # header
            ("size", ctypes.c_uint),       # header
            ("adapterId", _LUID),          # header
            ("id", ctypes.c_uint),         # header
            ("value", ctypes.c_uint),      # bit 0 = enableAdvancedColor
        ]


def _query_paths() -> list:
    if not _WIN:
        return []
    try:
        np, nm = wintypes.UINT(), wintypes.UINT()
        if _u32.GetDisplayConfigBufferSizes(_QDC_ACTIVE, ctypes.byref(np), ctypes.byref(nm)) != _OK:
            return []
        paths = (_PathInfo * np.value)()
        modes = (_ModeInfo * nm.value)()
        if _u32.QueryDisplayConfig(
            _QDC_ACTIVE,
            ctypes.byref(np), paths,
            ctypes.byref(nm), modes,
            None,
        ) != _OK:
            return []
        # Slice creates independent copies so they survive after the array goes out of scope.
        return list(paths[:np.value])
    except OSError:
        return []


def _get_hdr(path) -> bool | None:
    """Return True if HDR is enabled, False if supported but off, None on error."""
    try:
        info = _AdvColorInfo()
        info.infoType = _GET_ADV_COLOR
        info.size = ctypes.sizeof(_AdvColorInfo)
        info.adapterId.lo = path.targetInfo.adapterId.lo
        info.adapterId.hi = path.targetInfo.adapterId.hi
        info.id = path.targetInfo.id
        if _u32.DisplayConfigGetDeviceInfo(ctypes.byref(info)) != _OK:
            return None
        return bool(info.value & 0x2)  # bit 1 = advancedColorEnabled
    except OSError:
        return None


def _set_hdr(path, enabled: bool) -> bool:
    try:
        s = _SetColorState()
        s.infoType = _SET_ADV_COLOR
        s.size = ctypes.sizeof(_SetColorState)
        s.adapterId.lo = path.targetInfo.adapterId.lo
        s.adapterId.hi = path.targetInfo.adapterId.hi
        s.id = path.targetInfo.id
        s.value = 1 if enabled else 0
        return _u32.DisplayConfigSetDeviceInfo(ctypes.byref(s)) == _OK
    except OSError:
        return False


_to_restore: list = []


def _restore_on_exit() -> None:
    for path in _to_restore:
        if _set_hdr(path, True):
            print(f"[hdr] HDR restored (display target {path.targetInfo.id}).")
    _to_restore.clear()


atexit.register(_restore_on_exit)


def disable_for_capture() -> bool:
    """
    Disable HDR on all HDR-enabled displays and register restore-on-exit.
    Returns True if any displays were changed.
    """
    global _to_restore
    if not _WIN:
        return False
    _to_restore.clear()
    for path in _query_paths():
        if _get_hdr(path) is True:
            if _set_hdr(path, False):
                _to_restore.append(path)
                print(f"[hdr] HDR temporarily disabled (display {path.targetInfo.id}) for color-accurate capture.")
    if _to_restore:
        print("[hdr] HDR will be automatically restored when the server stops.")
    return bool(_to_restore)


def has_hdr() -> bool:
    """Return True if any active display currently has HDR enabled."""
    return any(_get_hdr(p) is True for p in _query_paths())
