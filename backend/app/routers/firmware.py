"""Firmware management API for LEGO hubs."""

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.request

router = APIRouter()


BACKEND_ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BUNDLED_LEGO_RESTORE_BIN_PATH = os.path.join(
    BACKEND_ROOT_DIR,
    "firmware",
    "prime-v1.3.00.0000-e8c274a.15bc498f956dc12eda9f.bin",
)


class FirmwareInstallResponse(BaseModel):
    success: bool
    message: str
    output: str = ""


class LegoRestoreInfoResponse(BaseModel):
    success: bool
    message: str
    restore_url: str
    note: str = ""


def _restore_firmware_bin(bin_path: str, source_label: str) -> FirmwareInstallResponse:
    result = subprocess.run(
        [sys.executable, "-m", "pybricksdev", "dfu", "restore", bin_path],
        capture_output=True,
        text=True,
        timeout=300,
    )

    output = (result.stdout or "") + ("\n" + result.stderr if result.stderr else "")
    if result.returncode != 0:
        if "No LEGO DFU USB device found" in output or "RuntimeError: No LEGO DFU USB device found" in output:
            raise HTTPException(
                status_code=400,
                detail=(
                    "No LEGO DFU USB device found.\n"
                    "Put SPIKE Prime in DFU mode exactly as follows: unplug USB, power hub OFF, hold the Bluetooth button, plug USB while still holding, keep holding until LED flashes red/green/blue.\n"
                    "Then click Restore FW again.\n"
                    "If still not detected, replug USB and verify device appears with: lsusb | grep 0694"
                ),
            )
        if "No working DFU found." in output or "dfu-util" in output:
            raise HTTPException(
                status_code=501,
                detail=(
                    "Restore prerequisites are missing (dfu-util/libusb).\n"
                    "Install tools on Linux: sudo apt update && sudo apt install -y dfu-util libusb-1.0-0\n"
                    "Put SPIKE Prime in DFU mode: unplug USB, power OFF, hold Bluetooth button, plug USB, keep holding until LED flashes red/green/blue.\n"
                    "If permission is denied, run: pybricksdev udev | sudo tee /etc/udev/rules.d/99-pybricksdev.rules && "
                    "sudo udevadm control --reload-rules && sudo udevadm trigger"
                ),
            )
        if "No DFU" in output:
            raise HTTPException(
                status_code=400,
                detail=(
                    "No DFU device found. Put SPIKE Prime in DFU mode, connect via USB, then try again."
                ),
            )
        if "Permission to access USB device denied" in output:
            raise HTTPException(
                status_code=403,
                detail=(
                    "USB permission denied. Run: pybricksdev udev | sudo tee /etc/udev/rules.d/99-pybricksdev.rules "
                    "then reload udev rules and reconnect the hub."
                ),
            )
        raise HTTPException(
            status_code=500,
            detail=f"pybricksdev restore failed. {output.strip() or 'Unknown error'}",
        )

    return FirmwareInstallResponse(
        success=True,
        message=f"Restored LEGO firmware from {source_label}",
        output=output.strip(),
    )


def _flash_firmware_zip(zip_path: str) -> str:
    result = subprocess.run(
        [sys.executable, "-m", "pybricksdev", "flash", zip_path],
        capture_output=True,
        text=True,
        timeout=300,
    )

    output = (result.stdout or "") + ("\n" + result.stderr if result.stderr else "")
    if result.returncode != 0:
        if "No DFU devices found." in output:
            raise HTTPException(
                status_code=400,
                detail=(
                    "No DFU device found. For LEGO SPIKE Prime (PrimeHub): "
                    "1) Unplug USB. 2) Turn hub OFF. 3) Press and hold the Bluetooth button. "
                    "4) While holding it, plug in USB. 5) Keep holding until Bluetooth LED flashes red/green/blue. "
                    "Then click Install FW again."
                ),
            )
        raise HTTPException(
            status_code=500,
            detail=f"pybricksdev flash failed. {output.strip() or 'Unknown error'}",
        )

    return output.strip()


def _get_latest_stable_primehub_asset_url() -> tuple[str, str]:
    req = urllib.request.Request(
        "https://api.github.com/repos/pybricks/pybricks-micropython/releases/latest",
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "code-lego-spike-portal",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            data = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch latest Pybricks release metadata: {exc}",
        )

    assets = data.get("assets") or []
    pattern = re.compile(r"^pybricks-primehub-v\d+\.\d+\.\d+\.zip$", re.IGNORECASE)
    for asset in assets:
        name = str(asset.get("name") or "")
        url = str(asset.get("browser_download_url") or "")
        if pattern.match(name) and url:
            return name, url

    raise HTTPException(
        status_code=404,
        detail="Could not find stable PrimeHub firmware asset in latest release",
    )


@router.post("/pybricks/install", response_model=FirmwareInstallResponse)
async def install_pybricks_firmware(firmware: UploadFile = File(...)):
    """Flash Pybricks firmware using pybricksdev.

    Expects a firmware .zip file downloaded from pybricks.com.
    """
    filename = firmware.filename or "firmware.zip"
    if not filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Firmware file must be a .zip archive")

    temp_path = ""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp:
            content = await firmware.read()
            if not content:
                raise HTTPException(status_code=400, detail="Uploaded firmware file is empty")
            tmp.write(content)
            temp_path = tmp.name

        output = _flash_firmware_zip(temp_path)

        return FirmwareInstallResponse(
            success=True,
            message="Pybricks firmware installed successfully.",
            output=output.strip(),
        )

    except FileNotFoundError:
        raise HTTPException(
            status_code=501,
            detail="pybricksdev is not installed. Install with: pip install pybricksdev",
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Firmware flashing timed out")
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/pybricks/install/primehub/stable", response_model=FirmwareInstallResponse)
async def install_latest_stable_primehub_firmware():
    """Fetch latest stable PrimeHub firmware from GitHub releases and flash it."""
    temp_path = ""
    try:
        asset_name, asset_url = _get_latest_stable_primehub_asset_url()
        req = urllib.request.Request(
            asset_url,
            headers={"User-Agent": "code-lego-spike-portal"},
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                firmware_bytes = response.read()
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Failed to download firmware archive: {exc}",
            )

        if not firmware_bytes:
            raise HTTPException(status_code=502, detail="Downloaded firmware archive is empty")

        with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp:
            tmp.write(firmware_bytes)
            temp_path = tmp.name

        output = _flash_firmware_zip(temp_path)

        return FirmwareInstallResponse(
            success=True,
            message=f"Installed latest stable PrimeHub firmware: {asset_name}",
            output=output,
        )

    except FileNotFoundError:
        raise HTTPException(
            status_code=501,
            detail="pybricksdev is not installed. Install with: pip install pybricksdev",
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Firmware flashing timed out")
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


@router.get("/lego/restore-info", response_model=LegoRestoreInfoResponse)
async def get_lego_restore_info():
    """Get official LEGO restore source for SPIKE Prime firmware."""
    return LegoRestoreInfoResponse(
        success=True,
        message="Use the official LEGO Education app/download page to restore or update firmware.",
        restore_url="https://education.lego.com/en-us/product-resources/spike-prime/downloads/",
        note="LEGO does not publish a direct standalone SPIKE Prime firmware .zip for manual flashing.",
    )


@router.post("/lego/restore/local", response_model=FirmwareInstallResponse)
async def restore_lego_firmware_from_local_backup(backup: UploadFile = File(...)):
    """Restore LEGO firmware from a local backup .bin using DFU."""
    filename = backup.filename or "firmware-backup.bin"
    if not filename.lower().endswith(".bin"):
        raise HTTPException(status_code=400, detail="Backup file must be a .bin file")

    temp_path = ""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".bin") as tmp:
            content = await backup.read()
            if not content:
                raise HTTPException(status_code=400, detail="Uploaded backup file is empty")
            tmp.write(content)
            temp_path = tmp.name

        return _restore_firmware_bin(temp_path, f"backup: {filename}")

    except FileNotFoundError:
        raise HTTPException(
            status_code=501,
            detail="pybricksdev is not installed. Install with: pip install pybricksdev",
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Firmware restore timed out")
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/lego/restore/bundled", response_model=FirmwareInstallResponse)
async def restore_lego_firmware_from_bundled_bin():
    """Restore LEGO firmware from bundled BIN file on backend."""
    if not os.path.exists(BUNDLED_LEGO_RESTORE_BIN_PATH):
        raise HTTPException(
            status_code=404,
            detail=(
                "Bundled restore BIN not found on backend. Expected: "
                f"{BUNDLED_LEGO_RESTORE_BIN_PATH}"
            ),
        )

    return _restore_firmware_bin(
        BUNDLED_LEGO_RESTORE_BIN_PATH,
        f"bundled BIN: {os.path.basename(BUNDLED_LEGO_RESTORE_BIN_PATH)}",
    )
