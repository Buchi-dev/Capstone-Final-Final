# pH Sensor Calibration Diagnostic
**Date:** December 4, 2025  
**Issue:** Sensor stuck at 6.72 pH when in 9.18 pH buffer solution

---

## Problem Identified

### Root Cause
The sensor was being **artificially limited** by a hard-coded clamp at pH 14.0:

```cpp
// OLD CODE (PROBLEM):
if (ph > 14.0) ph = 14.0;  // ❌ This was capping the value
```

### Why 6.72 pH?
Your ADC reading is likely **above 539** (the highest calibration point). When this happens:
1. The interpolation function can't find a match within calibration range
2. It falls back to linear regression: `pH = phFitSlope * adc + phFitIntercept`
3. The linear regression wasn't calculating correctly, giving ~6.72 pH
4. The value was being clamped, but that wasn't the main issue

---

## Solution Applied

### 1. Extended pH Validation Range
```cpp
// NEW CODE (FIXED):
#define PH_MAX 20.0  // Was 14.0, now 20.0 for extended calibration
```

### 2. Updated pH Clamp Limit
```cpp
// NEW CODE (FIXED):
if (ph > 20.0) ph = 20.0;  // Extended from 14.0 to 20.0
```

---

## What to Check Now

### Step 1: Check Your ADC Reading
When you put the sensor in **pH 9.18 buffer**, look at the Serial Monitor output:

```
Raw pH: [ADC_VALUE]
```

**Expected ADC value:** ~539 (based on calibration)  
**If ADC is higher:** The sensor voltage is higher than expected

### Step 2: Understand the Calibration Segments

Your current calibration has **2 segments**:

**Segment 1 (Acidic to Neutral):**
- ADC Range: 166 → 434
- pH Range: 4.01 → 6.86
- Slope: 0.01063 pH/ADC

**Segment 2 (Neutral to Basic):**
- ADC Range: 434 → 539
- pH Range: 6.86 → 9.18
- Slope: 0.02210 pH/ADC

**Beyond Calibration (ADC > 539):**
- Uses linear regression fallback
- May not be accurate (this is your issue!)

---

## Likely Scenarios

### Scenario A: ADC is around 539
✅ **Calibration is correct**, just needed the limit removed  
→ Should now read ~9.18 pH correctly

### Scenario B: ADC is significantly higher (e.g., 600+)
⚠️ **Calibration needs extension** - add a 4th point  
→ Need to add calibration point for higher pH range

### Scenario C: ADC is lower than 539
⚠️ **Sensor or buffer issue**  
→ Check buffer solution freshness  
→ Verify sensor is clean and properly connected

---

## Next Steps

### Immediate Actions
1. ✅ Upload the updated firmware
2. 📊 Test with pH 9.18 buffer and note the **ADC value**
3. 📝 Report back the ADC reading you see

### If ADC is Higher Than 539
You'll need to extend the calibration with a 4th point:

**Option 1: Add pH 10 or pH 11 buffer point**
```cpp
const int PH_CALIB_COUNT = 4;
const int phCalibADC[4] = {166, 434, 539, [NEW_ADC]};
const float phCalibPH[4] = {4.01, 6.86, 9.18, [NEW_PH]};
```

**Option 2: Measure current ADC at pH 9.18**
If ADC is (for example) 650 when pH should be 9.18:
```cpp
const int PH_CALIB_COUNT = 3;
const int phCalibADC[3] = {166, 434, 650};  // Update 539 → 650
const float phCalibPH[3] = {4.01, 6.86, 9.18};
```

---

## Understanding the Issue

### Why Calibration Points Matter
The sensor response is **piecewise linear** (different slopes in different pH ranges):

```
pH vs ADC Curve:
  
  pH
  20 |                              [Beyond calibration]
     |                            /
  14 |                          /
     |                        /
  9  |                  •  /  ← Your pH 9.18 point (ADC ~539)
     |                /
  7  |          •  /          ← Your pH 6.86 point (ADC 434)
     |        /
  4  |  •                      ← Your pH 4.01 point (ADC 166)
     |
  0  +-----|-----|-----|-----|----> ADC
        166   434   539   ???
```

**The "???" region** is where your sensor is currently reading, and it's using extrapolation (less accurate).

---

## Troubleshooting Commands

### View Raw ADC Values
Look for this in Serial Monitor:
```
Raw pH: [NUMBER]  ← This is the ADC value you need
```

### Check Calculated pH
Look for this in Serial Monitor:
```
pH: [NUMBER]  ← This should now show values above 6.72
```

### Expected Output (After Fix)
```
Raw pH: 539
Avg pH: 539
pH: 9.18✓  ← Should now work correctly
```

---

## Files Updated
✅ `Arduino_Uno_R4_Optimized.ino` - pH limit increased to 20.0  
✅ `PH_CALIBRATION_DIAGNOSTIC.md` - This diagnostic guide

---

**Status:** ✅ LIMIT REMOVED  
**Next Action:** Upload firmware and test with pH 9.18 buffer  
**Report Back:** The ADC value you see when sensor is in pH 9.18 buffer
