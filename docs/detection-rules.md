# Detection Rules

## RULE 01 / Sequence Gap

If `received sequence > previous sequence + 1`, create a `LINK / CAUTION` event. The event reports expected sequence, received sequence, and missing frame count.

## RULE 02 / Invalid Sample

If a numeric channel value is `null`, `undefined`, `NaN`, infinite, or non-numeric, flag the sample invalid and create a `DATA / WARNING` event.

## RULE 03 / Flatline

If the same channel value remains unchanged within configured tolerance for a defined number of consecutive samples, create a `DATA / ADVISORY` event named `POSSIBLE CHANNEL FLATLINE`.

## RULE 04 / Rapid Value Change

Calculate `absolute(currentValue - previousValue)` and compare it to the channel threshold. If exceeded, create a `DATA / ADVISORY` event named `RAPID VALUE CHANGE`.

## RULE 05 / Packet Rate Drop

Calculate the recent packet rate over a rolling window. If the rate drops below the configured expected range, create a `LINK / CAUTION` event named `FRAME RATE BELOW EXPECTED RANGE`.
