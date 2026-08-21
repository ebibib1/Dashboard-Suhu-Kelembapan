import csv
import os
import time
from datetime import datetime

from sensor_config import (
    CSV_OUTPUT,
    MODBUS_HOST,
    MODBUS_MODE,
    MODBUS_PORT,
    POLL_INTERVAL,
    REGISTER_COUNT,
    SLAVE_ID,
    START_ADDRESS,
)
from sensor_reader import read_sensor


def csv_name(prefix: str, dt: datetime) -> str:

    base, ext = os.path.splitext(prefix)

    if not ext:

        ext = ".csv"

    return f"{base}_" f"{dt.strftime('%Y%m%d_%H%M')}" f"{ext}"


def write_header_if_needed(
    csvfile,
    writer,
    filename: str,
):

    file_exists = os.path.exists(filename) and os.path.getsize(filename) > 0

    if file_exists:

        return

    writer.writerow(
        [
            "timestamp",
            "mode",
            "host",
            "port",
            "slave",
            "address",
            "raw_temperature",
            "raw_humidity",
            "temperature_c",
            "humidity_rh",
            "status",
            "error",
        ]
    )

    csvfile.flush()


def main():

    print("=" * 60)

    print("XY-MD02 SENSOR LOGGER")

    print("=" * 60)

    print(f"Mode      : {MODBUS_MODE}")

    print(f"Device    : " f"{MODBUS_HOST}:{MODBUS_PORT}")

    print(f"Slave ID  : {SLAVE_ID}")

    print(f"Address   : {START_ADDRESS}")

    print(f"Interval  : " f"{POLL_INTERVAL} seconds")

    print("=" * 60)

    csvfile = None

    current_minute = None

    writer = None

    try:

        while True:

            now = datetime.now()

            minute_key = now.strftime("%Y%m%d_%H%M")

            timestamp = now.isoformat(timespec="seconds")

            # =================================================
            # CREATE CSV SETIAP MENIT
            # =================================================

            if minute_key != current_minute:

                if csvfile:

                    csvfile.close()

                current_minute = minute_key

                filename = csv_name(
                    CSV_OUTPUT,
                    now,
                )

                csvfile = open(
                    filename,
                    "a",
                    newline="",
                    encoding="utf-8",
                )

                writer = csv.writer(csvfile)

                write_header_if_needed(
                    csvfile,
                    writer,
                    filename,
                )

                print(f"\n📁 CSV: {filename}")

            # =================================================
            # READ SENSOR
            # =================================================

            reading = read_sensor(
                host=MODBUS_HOST,
                port=MODBUS_PORT,
                slave_id=SLAVE_ID,
                address=START_ADDRESS,
                count=REGISTER_COUNT,
                mode=MODBUS_MODE,
            )

            # =================================================
            # SUCCESS
            # =================================================

            if reading["ok"]:

                raw_temp = reading["raw"]["temperature"]

                raw_hum = reading["raw"]["humidity"]

                temperature = reading["suhu"]

                humidity = reading["kelembaban"]

                writer.writerow(
                    [
                        timestamp,
                        MODBUS_MODE,
                        MODBUS_HOST,
                        MODBUS_PORT,
                        SLAVE_ID,
                        START_ADDRESS,
                        raw_temp,
                        raw_hum,
                        f"{temperature:.1f}",
                        f"{humidity:.1f}",
                        "OK",
                        "",
                    ]
                )

                csvfile.flush()

                print(
                    f"{timestamp} | "
                    f"🌡️ {temperature:.1f} °C | "
                    f"💧 {humidity:.1f} %RH"
                )

            # =================================================
            # ERROR
            # =================================================

            else:

                writer.writerow(
                    [
                        timestamp,
                        MODBUS_MODE,
                        MODBUS_HOST,
                        MODBUS_PORT,
                        SLAVE_ID,
                        START_ADDRESS,
                        "",
                        "",
                        "",
                        "",
                        "ERROR",
                        reading["error"],
                    ]
                )

                csvfile.flush()

                print(f"{timestamp} | " f"❌ ERROR | " f"{reading['error']}")

            # =================================================
            # WAIT
            # =================================================

            time.sleep(POLL_INTERVAL)

    except KeyboardInterrupt:

        print("\n\n Logger dihentikan.")

    finally:

        if csvfile:

            csvfile.close()


if __name__ == "__main__":

    main()
