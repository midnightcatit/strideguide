# Google Health data: what we request and what comes back

A reference for the connected-health surfaces (the dashboard card, the progress
health drill-down, the recovery view). It records the data types we pull from the
Google Health API, how each maps to a stored metric, the units, and which ones a
watch usually reports, so the UI names the right things and the empty states are
honest.

## The pipeline

1. OAuth: `apps/api/src/routes/connections.ts` stores the encrypted tokens in the
   `connections` row. On the callback it kicks off the first sync in the
   background.
2. Sync: `apps/api/src/lib/sync.ts` reads a window of each data type from
   `https://health.googleapis.com/v4` (the Google Health API v4), using the
   granted scopes. It walks pages and hands the points to a mapper.
3. Map: `apps/api/src/lib/google-health-map.ts` turns points into a daily patch
   (one row per civil day in `health_metrics`) or a point sample (one row in
   `health_samples`). Interval types (steps, distance, energy) are summed for the
   day; daily and session types carry one value already.
4. Read: `GET /health-metrics?window=7|30|90` returns `metrics` (daily, keyed by
   the metric name) and `samples` (sparse point measurements). A metric absent
   from the payload means the device never reported it, not zero.
5. Show: the web reads that payload. The dashboard card shows a short summary and
   links to the full drill-down at `/progress/health`.

## Daily metrics (one row per civil day)

| Data type | Read as | Stored metric key | Unit |
| --- | --- | --- | --- |
| steps | list, interval, summed | `steps` | count |
| distance | list, interval, summed | `distance_m` | metres |
| activeEnergyBurned | list, interval, summed | `active_energy_kcal` | kcal |
| floors | reconcile, interval | `floors` | count |
| activeZoneMinutes | list, interval | `active_zone_min` | minutes |
| activeMinutes | list, interval | `active_min` | minutes |
| altitude | list, interval | `altitude_gain_m` | metres |
| sedentaryPeriod | list, interval | `sedentary_min` | minutes |
| sleep | reconcile, sleep sessions | `sleep_min`, `sleep_deep_min`, `sleep_rem_min`, `sleep_light_min`, `sleep_awake_min` | minutes |
| dailyRestingHeartRate | list, daily | `resting_hr` | bpm |
| dailyHeartRateVariability | list, daily | `hrv_ms` | ms |
| dailyOxygenSaturation | list, daily | `spo2_avg`, `spo2_low`, `spo2_high` | percent |
| dailyRespiratoryRate | list, daily | `respiratory_rate` | breaths/min |
| dailyVo2Max | list, daily | `vo2_max` | ml/kg/min |
| dailySleepTemperatureDerivations | list, daily | `sleep_temp_c` | celsius |

### Rollups (aggregated per day)

| Data type | Why a rollup | Stored metric key | Unit |
| --- | --- | --- | --- |
| heartRate | arrives about once a second | `hr_min`, `hr_avg`, `hr_max` | bpm |
| totalCalories | no list method at all | `total_calories_kcal` | kcal |

## Point samples (a measurement at an instant)

| Data type | Stored metric key | Unit |
| --- | --- | --- |
| weight | `weight_kg` | kg |
| bodyFat | `body_fat_pct` | percent |
| height | `height_mm` | millimetres |
| coreBodyTemperature | `core_temp_c` | celsius |
| bloodGlucose | `blood_glucose_mgdl` | mg/dL |

Types that also have a daily or rollup form (heart rate, SpO2, VO2 max) are read
through those instead, so no measurement is stored twice.

## What a watch usually reports

Commonly present, most days, once a watch is worn:

- resting heart rate, HRV, sleep (with stages), steps, distance, active energy,
  active minutes, active zone minutes, heart rate range, total calories.

Reported when the device supports it, less consistently:

- SpO2 and respiratory rate (often only during sleep), VO2 max (a watch estimates
  it, usually after a qualifying run), sleep temperature (needs the specific
  sensor and a baseline), floors and altitude (needs a barometer).

Sparse by nature, only when the runner records them:

- weight, body fat, height, core body temperature, blood glucose. These can be
  empty for weeks, so the UI must never treat them as expected.

## How this maps to the card's states

- No connection: nothing to pull. The card points to Settings.
- Connected, first sync in flight: the callback and the on-view sync are pulling
  the first window. The card says it is pulling.
- Connected, no data in the last 30 days: the connection works but the device
  reported nothing in the window (a fresh account, or a watch not worn). The card
  says there is no data and points to Settings to sync.
- Connected with data: the summary shows the present metrics, and a missing
  metric is simply skipped, never drawn as zero.

## Notes and follow-ups

- The 20-minute reuse window (see `MANUAL_SYNC_WINDOW_MS`) means opening a view
  refreshes from our stored data most of the time rather than calling the
  provider again.
- The exact availability of each type per device is worth confirming against a
  real account's payloads over a week or two; this note records what we request
  and how we read it, not a guarantee per device.
