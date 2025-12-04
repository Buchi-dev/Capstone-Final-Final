# DEPLOYMENT TESTING CHECKLIST
**Server Version:** v2 with Bug Fixes  
**Firmware Version:** 8.2.0  
**Test Date:** _______________  
**Tester:** _______________

---

## PRE-DEPLOYMENT PREPARATION

### Database Migration
- [ ] **Backup production database** (CRITICAL - do not skip!)
  ```bash
  mongodump --uri="mongodb://..." --out=./backup-$(date +%Y%m%d)
  ```
- [ ] **Test migration on staging database**
  ```javascript
  // In MongoDB shell:
  db.sensorReadings.updateMany(
    { pH_valid: { $exists: false } },
    { $set: { pH_valid: true, tds_valid: true, turbidity_valid: true } }
  );
  ```
- [ ] **Verify migration count**
  ```javascript
  db.sensorReadings.countDocuments({ pH_valid: { $exists: true } });
  ```
- [ ] **Sample check - view 3 migrated documents**
  ```javascript
  db.sensorReadings.find().limit(3).pretty();
  ```

### Code Deployment
- [ ] **Compile TypeScript** - Verify no errors
  ```bash
  cd server_v2
  npm run build
  ```
- [ ] **Deploy to staging environment**
  ```bash
  npm start
  ```
- [ ] **Verify server starts without errors**
- [ ] **Check logs for MQTT subscription confirmations**
  - Look for: `✅ MQTT: Subscribed to devices/+/status`

---

## TEST #1: LWT OFFLINE DETECTION 🔴

**Objective:** Verify server detects device going offline via Last Will Testament

### Setup:
1. Flash device with firmware v8.2.0
2. Power on device and verify it connects to MQTT
3. Check server logs for device registration
4. Open server logs in real-time:
   ```bash
   tail -f logs/app.log
   ```

### Test Steps:
1. [ ] **Verify device is online**
   - Check dashboard shows device status: "online"
   - Check database: `db.devices.findOne({ deviceId: "arduino_r4_..." })`
   - Verify `status: "online"`

2. [ ] **Unplug device** (simulate power loss)

3. [ ] **Check server logs within 5 seconds**
   - Expected log: `🔴 MQTT: Device arduino_r4_... went OFFLINE (LWT triggered)`
   - Should appear immediately

4. [ ] **Check database updated**
   ```javascript
   db.devices.findOne({ deviceId: "arduino_r4_..." })
   ```
   - Verify `status: "offline"`
   - Verify `lastSeen` timestamp updated

5. [ ] **Check dashboard**
   - Device should show as "offline"

### Expected Results:
- ✅ Server logs "Device went OFFLINE (LWT triggered)" within 5 seconds
- ✅ Database status updated to "offline"
- ✅ Dashboard reflects offline status
- ✅ No errors in server logs

### Actual Results:
- Server log timestamp: _______________
- Database status: _______________
- Dashboard status: _______________
- **Test Status:** [ ] PASS [ ] FAIL

---

## TEST #2: SENSOR VALIDITY FLAGS ⚠️

**Objective:** Verify server handles invalid sensors correctly

### Setup:
1. Power on device (if offline from Test #1)
2. Wait for device to come online
3. Verify device sending normal sensor data

### Test Steps:

#### Part A: Disconnect pH Sensor
1. [ ] **Physically disconnect pH sensor from device**

2. [ ] **Wait for next transmission cycle** (device sends every X minutes)

3. [ ] **Check server logs**
   - Expected: `⚠️ MQTT: Device arduino_r4_... reporting invalid sensors: ['pH']`

4. [ ] **Check database - latest sensor reading**
   ```javascript
   db.sensorReadings.find({ deviceId: "arduino_r4_..." }).sort({ timestamp: -1 }).limit(1).pretty()
   ```
   - Verify: `pH: null` (not a number!)
   - Verify: `pH_valid: false`
   - Verify: `tds: <number>` (still valid)
   - Verify: `tds_valid: true`
   - Verify: `turbidity: <number>` (still valid)
   - Verify: `turbidity_valid: true`

5. [ ] **Check analytics/dashboard**
   - pH should show as "invalid" or "N/A"
   - TDS and turbidity should still display normally

#### Part B: Reconnect pH Sensor
1. [ ] **Reconnect pH sensor**

2. [ ] **Wait for next transmission**

3. [ ] **Check database**
   ```javascript
   db.sensorReadings.find({ deviceId: "arduino_r4_..." }).sort({ timestamp: -1 }).limit(1).pretty()
   ```
   - Verify: `pH: <number>` (valid reading)
   - Verify: `pH_valid: true`
   - Verify: All sensors back to valid

### Expected Results:
- ✅ Server logs warning when sensor invalid
- ✅ Invalid sensor stored as `null` with `valid: false`
- ✅ Valid sensors continue working normally
- ✅ Reconnected sensor resumes normal operation
- ✅ No errors, only warnings

### Actual Results:
- Disconnected pH:
  - Server log: _______________
  - Database `pH` value: _______________
  - Database `pH_valid`: _______________
- Reconnected pH:
  - Database `pH` value: _______________
  - Database `pH_valid`: _______________
- **Test Status:** [ ] PASS [ ] FAIL

---

## TEST #3: TIMESTAMP VALIDATION ⏰

**Objective:** Verify server rejects invalid timestamps

### Setup:
1. Install MQTT client tool (e.g., MQTT Explorer, mosquitto_pub)
2. Get MQTT broker credentials from `.env` file
3. Prepare test payloads

### Test Steps:

#### Part A: Timestamp Too Old (Before 2020)
1. [ ] **Publish message with old timestamp**
   ```bash
   mosquitto_pub -h <broker> -p 8883 -u <user> -P <pass> --cafile <cert> \
     -t "devices/arduino_r4_TEST123/data" \
     -m '{"deviceId":"arduino_r4_TEST123","pH":7.2,"tds":450,"turbidity":12,"timestamp":946684800,"pH_valid":true,"tds_valid":true,"turbidity_valid":true}'
   ```
   - Note: `946684800` = Jan 1, 2000 (before min valid epoch)

2. [ ] **Check server logs**
   - Expected: `❌ MQTT: Invalid timestamp from arduino_r4_TEST123: 946684800 (before Jan 1, 2020)`

3. [ ] **Check database - message should NOT be stored**
   ```javascript
   db.sensorReadings.find({ deviceId: "arduino_r4_TEST123", timestamp: new Date(946684800 * 1000) })
   ```
   - Result should be empty (0 documents)

#### Part B: Timestamp Too Far in Future
1. [ ] **Publish message with future timestamp**
   ```bash
   mosquitto_pub ... -m '{"deviceId":"arduino_r4_TEST123","pH":7.2,"tds":450,"turbidity":12,"timestamp":9999999999,"pH_valid":true,"tds_valid":true,"turbidity_valid":true}'
   ```
   - Note: `9999999999` = year 2286 (way in future)

2. [ ] **Check server logs**
   - Expected: `❌ MQTT: Future timestamp from arduino_r4_TEST123: 9999999999 (... seconds ahead of server)`

3. [ ] **Check database - message should NOT be stored**

#### Part C: Valid Timestamp
1. [ ] **Publish message with current timestamp**
   ```bash
   # Get current epoch: date +%s
   mosquitto_pub ... -m '{"deviceId":"arduino_r4_TEST123","pH":7.2,"tds":450,"turbidity":12,"timestamp":<current_epoch>,"pH_valid":true,"tds_valid":true,"turbidity_valid":true}'
   ```

2. [ ] **Check server logs**
   - Expected: `📊 MQTT: Processed sensor data from arduino_r4_TEST123`

3. [ ] **Check database - message SHOULD be stored**
   ```javascript
   db.sensorReadings.find({ deviceId: "arduino_r4_TEST123" }).sort({ timestamp: -1 }).limit(1).pretty()
   ```
   - Verify data stored correctly

### Expected Results:
- ✅ Old timestamps (before 2020) rejected with error
- ✅ Future timestamps (>1hr ahead) rejected with error
- ✅ Valid timestamps accepted and stored
- ✅ No crashes or exceptions

### Actual Results:
- Old timestamp test: [ ] Rejected [ ] Accepted (ERROR!)
- Future timestamp test: [ ] Rejected [ ] Accepted (ERROR!)
- Valid timestamp test: [ ] Accepted [ ] Rejected (ERROR!)
- **Test Status:** [ ] PASS [ ] FAIL

---

## TEST #4: SENSOR RANGE VALIDATION 📊

**Objective:** Verify server rejects out-of-range sensor values

### Test Steps:

#### Part A: pH Out of Range
1. [ ] **Publish message with pH > 14**
   ```bash
   mosquitto_pub ... -m '{"deviceId":"arduino_r4_TEST123","pH":100,"tds":450,"turbidity":12,"timestamp":<current_epoch>,"pH_valid":true,"tds_valid":true,"turbidity_valid":true}'
   ```

2. [ ] **Check server logs**
   - Expected: `❌ MQTT: Sensor values out of range from arduino_r4_TEST123: ["pH: 100 (valid range: 0-14)"]`

3. [ ] **Verify NOT stored in database**

4. [ ] **Publish message with pH < 0**
   ```bash
   mosquitto_pub ... -m '{"deviceId":"arduino_r4_TEST123","pH":-5,"tds":450,"turbidity":12,"timestamp":<current_epoch>,"pH_valid":true,"tds_valid":true,"turbidity_valid":true}'
   ```

5. [ ] **Check logs - should reject**

#### Part B: TDS Out of Range
1. [ ] **Publish message with TDS > 2000**
   ```bash
   mosquitto_pub ... -m '{"deviceId":"arduino_r4_TEST123","pH":7.2,"tds":5000,"turbidity":12,"timestamp":<current_epoch>,"pH_valid":true,"tds_valid":true,"turbidity_valid":true}'
   ```

2. [ ] **Check server logs**
   - Expected: `❌ MQTT: Sensor values out of range from arduino_r4_TEST123: ["TDS: 5000 (valid range: 0-2000 ppm)"]`

3. [ ] **Verify NOT stored**

#### Part C: Turbidity Out of Range
1. [ ] **Publish message with turbidity > 1000**
   ```bash
   mosquitto_pub ... -m '{"deviceId":"arduino_r4_TEST123","pH":7.2,"tds":450,"turbidity":9999,"timestamp":<current_epoch>,"pH_valid":true,"tds_valid":true,"turbidity_valid":true}'
   ```

2. [ ] **Check server logs**
   - Expected: `❌ MQTT: Sensor values out of range from arduino_r4_TEST123: ["Turbidity: 9999 (valid range: 0-1000 NTU)"]`

3. [ ] **Verify NOT stored**

#### Part D: Multiple Out of Range
1. [ ] **Publish message with ALL sensors out of range**
   ```bash
   mosquitto_pub ... -m '{"deviceId":"arduino_r4_TEST123","pH":999,"tds":-100,"turbidity":5000,"timestamp":<current_epoch>,"pH_valid":true,"tds_valid":true,"turbidity_valid":true}'
   ```

2. [ ] **Check server logs**
   - Expected error listing ALL three sensors out of range

3. [ ] **Verify NOT stored**

#### Part E: Valid Ranges
1. [ ] **Publish message with all valid ranges**
   ```bash
   mosquitto_pub ... -m '{"deviceId":"arduino_r4_TEST123","pH":7.2,"tds":450,"turbidity":12,"timestamp":<current_epoch>,"pH_valid":true,"tds_valid":true,"turbidity_valid":true}'
   ```

2. [ ] **Check server logs**
   - Expected: `📊 MQTT: Processed sensor data from arduino_r4_TEST123`

3. [ ] **Verify stored in database**

### Expected Results:
- ✅ pH outside 0-14 rejected
- ✅ TDS outside 0-2000 rejected
- ✅ Turbidity outside 0-1000 rejected
- ✅ Multiple violations detected correctly
- ✅ Valid ranges accepted and stored

### Actual Results:
- pH validation: [ ] PASS [ ] FAIL
- TDS validation: [ ] PASS [ ] FAIL
- Turbidity validation: [ ] PASS [ ] FAIL
- Multiple violations: [ ] PASS [ ] FAIL
- Valid ranges: [ ] PASS [ ] FAIL
- **Test Status:** [ ] PASS [ ] FAIL

---

## TEST #5: NORMAL OPERATION (1 HOUR) ⏱️

**Objective:** Verify all fixes work correctly during normal operation

### Setup:
1. Power on device with all sensors connected properly
2. Let device run for 1 hour in normal conditions
3. Monitor server logs continuously

### Monitoring Checklist:

#### Every 10 Minutes:
- [ ] Check server logs for errors
- [ ] Verify sensor data being received
- [ ] Check database for new readings
- [ ] Verify all validity flags are `true`

#### After 1 Hour:
- [ ] **Count total readings received**
   ```javascript
   db.sensorReadings.countDocuments({ 
     deviceId: "arduino_r4_...",
     timestamp: { $gte: new Date(Date.now() - 3600000) }
   })
   ```

- [ ] **Verify no invalid timestamps**
   ```javascript
   db.sensorReadings.countDocuments({ 
     timestamp: { $lt: new Date('2020-01-01') }
   })
   ```
   - Should be 0

- [ ] **Verify no out-of-range values**
   ```javascript
   db.sensorReadings.countDocuments({ 
     $or: [
       { pH: { $lt: 0 } },
       { pH: { $gt: 14 } },
       { tds: { $lt: 0 } },
       { tds: { $gt: 2000 } },
       { turbidity: { $lt: 0 } },
       { turbidity: { $gt: 1000 } }
     ]
   })
   ```
   - Should be 0

- [ ] **Check all readings have validity flags**
   ```javascript
   db.sensorReadings.countDocuments({ 
     pH_valid: { $exists: false }
   })
   ```
   - Should be 0 (for new readings after migration)

- [ ] **Review server logs for any warnings/errors**
- [ ] **Check server memory/CPU usage** - should be stable
- [ ] **Verify MQTT connection remained stable**

### Expected Results:
- ✅ All sensor data received and stored correctly
- ✅ No invalid timestamps in database
- ✅ No out-of-range values in database
- ✅ All readings have validity flags
- ✅ No server errors or crashes
- ✅ Stable performance throughout 1 hour

### Actual Results:
- Readings received: _______________
- Invalid timestamps: _______________
- Out-of-range values: _______________
- Warnings/errors: _______________
- Server stability: [ ] STABLE [ ] UNSTABLE
- **Test Status:** [ ] PASS [ ] FAIL

---

## FINAL CHECKLIST

### All Tests Complete:
- [ ] Test #1: LWT Offline Detection - **PASS**
- [ ] Test #2: Sensor Validity Flags - **PASS**
- [ ] Test #3: Timestamp Validation - **PASS**
- [ ] Test #4: Sensor Range Validation - **PASS**
- [ ] Test #5: Normal Operation (1 Hour) - **PASS**

### Post-Test Verification:
- [ ] No errors in server logs
- [ ] Database integrity verified
- [ ] All new readings have validity flags
- [ ] Dashboard displaying data correctly
- [ ] Alerts functioning properly
- [ ] Analytics queries working

### Deployment Decision:

**If ALL tests PASS:**
- [ ] ✅ **APPROVED FOR PRODUCTION DEPLOYMENT**
- [ ] Schedule deployment time: _______________
- [ ] Notify stakeholders of deployment
- [ ] Prepare rollback plan (just in case)

**If ANY test FAILS:**
- [ ] ❌ **DEPLOYMENT BLOCKED**
- [ ] Document failure details below
- [ ] Create bug tickets for failures
- [ ] Fix issues and re-test

---

## FAILURE DOCUMENTATION (If Any)

**Test Failed:** _______________  
**Failure Description:**
```
[Describe what went wrong]
```

**Error Logs:**
```
[Paste relevant error logs]
```

**Database State:**
```javascript
// Commands to verify issue
db.sensorReadings.find(...).pretty()
```

**Root Cause:**
```
[Analysis of why it failed]
```

**Required Fix:**
```
[What needs to be changed]
```

---

## SIGN-OFF

**Tester Name:** _______________  
**Date:** _______________  
**Signature:** _______________

**Engineering Lead Approval:**  
**Name:** _______________  
**Date:** _______________  
**Signature:** _______________

**Deployment Status:** [ ] APPROVED [ ] BLOCKED

---

## ROLLBACK PROCEDURE (If Needed)

If critical issues are discovered after production deployment:

1. **Stop server immediately**
   ```bash
   pm2 stop server_v2
   ```

2. **Restore database from backup**
   ```bash
   mongorestore --uri="mongodb://..." --drop backup-<date>
   ```

3. **Rollback to previous server version**
   ```bash
   git checkout <previous-commit>
   npm run build
   pm2 start server_v2
   ```

4. **Verify rollback successful**
   - Check server logs
   - Verify old data format working
   - Confirm no errors

5. **Notify team and investigate issue**
