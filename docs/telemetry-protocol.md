# Telemetry Protocol

Packets are generic engineering telemetry records.

```json
{
  "deviceId": "ASTRA-01",
  "sequence": 4812,
  "timestamp": 1720953021,
  "channels": {
    "temperature": 31.428,
    "accelerationX": 0.128,
    "accelerationY": -0.042,
    "accelerationZ": 9.712,
    "batteryVoltage": 11.824
  }
}
```

`channels` may contain any numeric field. New numeric fields are dynamically registered and become available in the channel monitor and telemetry selector.

The application reports data behavior only. It does not claim physical causes for anomalies.
