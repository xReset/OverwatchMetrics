# GitHub Actions Monitoring Guide

This guide explains how to monitor your daily scraper and ensure it's running correctly at 2:00 AM UTC.

---

## Quick Access

**GitHub Actions Dashboard:**  
https://github.com/xReset/OverwatchMetrics/actions

---

## 1. Viewing Workflow Runs

### Step-by-Step:
1. Go to your repository: https://github.com/xReset/OverwatchMetrics
2. Click the **"Actions"** tab at the top
3. You'll see a list of all workflow runs
4. Click on **"Daily Overwatch Stats Scraper"** in the left sidebar

### What You'll See:
- ✅ Green checkmark = Successful run
- ❌ Red X = Failed run
- 🟡 Yellow dot = Currently running
- ⏸️ Gray circle = Skipped or cancelled

---

## 2. Checking Run Details

### Click on any run to see:
- **Duration:** How long the scraper took
- **Logs:** Detailed output from each step
- **Artifacts:** Any files generated (if configured)
- **Commit:** Which code version was used

### Example Log Output:
```
🗺️  Scraping Competitive PC Americas All for ALL 26 Maps

Fetching: all-maps
  ✓ Got 50 heroes
  Top 3: mizuki, moira, kiriko

Fetching: busan
  ✓ Got 50 heroes
  Top 3: mizuki, moira, kiriko

...

✅ Scraping complete!
Success: 28 maps
Failed: 0 maps

📁 Backend data saved
📁 Frontend data saved

🎉 All maps scraped successfully!
```

---

## 3. Schedule Information

### Current Schedule:
- **Frequency:** Daily
- **Time:** 2:00 AM UTC
- **Cron Expression:** `0 2 * * *`

### Time Zone Conversions:
- **EST (UTC-5):** 9:00 PM (previous day)
- **PST (UTC-8):** 6:00 PM (previous day)
- **CET (UTC+1):** 3:00 AM
- **JST (UTC+9):** 11:00 AM

### Next Scheduled Run:
Check the Actions page - GitHub shows "Next scheduled run" timestamp

---

## 4. Manual Triggering

### How to Run Manually:
1. Go to Actions → Daily Overwatch Stats Scraper
2. Click **"Run workflow"** button (top right)
3. Select branch: **master**
4. Click **"Run workflow"** to confirm

### When to Use:
- Testing after code changes
- Immediate data update needed
- Verifying scraper works correctly

---

## 5. Understanding the Workflow Steps

### Step 1: Checkout repository
- Downloads your code to GitHub's server
- **Expected:** Always succeeds

### Step 2: Setup Node.js
- Installs Node.js version 18
- **Expected:** Always succeeds

### Step 3: Install scraper dependencies
- Runs `npm install` in scraper folder
- **Expected:** ~5-10 seconds

### Step 4: Run scraper with deduplication
- Executes the scraper script
- **Expected:** ~30 seconds for 28 maps
- **Output:** Shows progress for each map

### Step 5: Commit and push if changes detected
- Commits new data to repository
- Pushes to GitHub (triggers Vercel deployment)
- **Expected:** Only runs if data changed
- **Note:** Skipped if no changes detected

---

## 6. Troubleshooting

### ❌ Workflow Failed

**Common Causes:**
1. **Blizzard API down:** Wait and retry manually
2. **Network timeout:** Temporary issue, will retry next day
3. **Dependency issue:** Check logs for npm errors

**How to Fix:**
- Check the error logs in the failed run
- If it's a temporary issue, it will auto-retry tomorrow
- If persistent, manually trigger to test

### ⚠️ No New Commit

**This is Normal if:**
- Data hasn't changed (deduplication working)
- Changes are below 0.1% threshold
- All hero stats are identical to previous snapshot

**This is a Problem if:**
- Multiple days with no commits
- You know Blizzard updated hero balance

**How to Check:**
- Look at commit history: https://github.com/xReset/OverwatchMetrics/commits/master
- Should see "chore: update Overwatch stats snapshot" when data changes

### 🟡 Workflow Taking Too Long

**Expected Duration:** 30-60 seconds  
**If Longer:** Check logs to see which step is slow

---

## 7. Email Notifications

### GitHub Sends Emails When:
- ✅ Workflow succeeds (first time after failures)
- ❌ Workflow fails
- 🔄 Workflow is re-enabled after being disabled

### Configure Notifications:
1. GitHub Settings → Notifications
2. Scroll to "Actions"
3. Choose notification preferences

---

## 8. Monitoring Checklist

### Daily (Optional):
- [ ] Check if new commit was made (if expecting data changes)

### Weekly:
- [ ] Visit Actions page to verify runs are succeeding
- [ ] Check latest commit has updated data

### Monthly:
- [ ] Review workflow run history
- [ ] Verify data is still accurate (spot check against Blizzard website)

---

## 9. What Success Looks Like

### Healthy System:
- ✅ Daily runs at 2:00 AM UTC
- ✅ Green checkmarks on most runs
- ✅ Commits when data changes
- ✅ No commits when data is identical (deduplication working)
- ✅ Vercel auto-deploys after commits

### Expected Behavior:
- **After hero balance patch:** New commit with updated stats
- **Normal days:** May skip commits if no changes
- **After new hero release:** New commit with 51 heroes

---

## 10. Quick Reference

| What | Where | When |
|------|-------|------|
| View runs | [Actions Tab](https://github.com/xReset/OverwatchMetrics/actions) | Anytime |
| Manual trigger | Actions → Run workflow | As needed |
| Check logs | Click on any run → Click step | After run |
| View commits | [Commits](https://github.com/xReset/OverwatchMetrics/commits/master) | Anytime |
| Scheduled run | 2:00 AM UTC | Daily |

---

## Support

If you see persistent failures or unexpected behavior:
1. Check the workflow logs for error messages
2. Verify Blizzard's API is accessible: https://overwatch.blizzard.com/en-us/career/
3. Try manual trigger to test
4. Review recent code changes if any

**Remember:** Your PC does NOT need to be on. GitHub Actions runs in the cloud automatically!
