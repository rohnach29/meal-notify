# Debugging Notification Issues

This guide helps you understand what's happening with your notifications.

## Diagnostic Tools Added

### 1. `/api/debug` Endpoint

This endpoint shows you what's stored in memory right now.

**How to use:**
```bash
curl https://meal-notify-backend.vercel.app/api/debug
```

**What it tells you:**
- How many subscriptions are stored
- How many schedules are stored
- The actual userIds (first 30 characters)
- Whether subscriptions and schedules match (same userId)
- What notification times are set
- How many foods are available

### 2. Enhanced `/api/cron` Endpoint

The cron endpoint now returns detailed statistics about what it found.

**How to use:**
```bash
curl https://meal-notify-backend.vercel.app/api/cron
```

**What it tells you:**
- How many subscriptions were checked
- How many schedules were found
- How many time matches occurred
- How many notifications were sent
- Any issues encountered

### 3. Detailed Console Logging

Every step now logs to the console with clear prefixes:
- `[SUBSCRIBE]` - When subscriptions are saved
- `[UPDATE-SCHEDULE]` - When schedules are updated
- `[CRON]` - When cron checks for notifications

## Step-by-Step Debugging Process

### Step 1: Check if subscriptions exist

```bash
curl https://meal-notify-backend.vercel.app/api/debug
```

**What to look for:**
- `totalSubscriptions: 0` → No subscriptions stored (enable notifications first)
- `totalSubscriptions: 1` → Subscription exists ✅

### Step 2: Check if schedules exist

Look at the same response:
- `totalSchedules: 0` → No schedules stored (save settings first)
- `totalSchedules: 1` → Schedule exists ✅

### Step 3: Check if userIds match

This is critical! The userId from subscriptions must match the userId from schedules.

**In the debug response:**
- Look at `subscriptions[0].userId`
- Look at `schedules[0].userId`
- They should be **exactly the same**

**If they don't match:**
- The subscription and schedule are for "different users"
- Cron won't find the schedule for the subscription
- This is why notifications aren't sent

### Step 4: Check cron endpoint

```bash
curl https://meal-notify-backend.vercel.app/api/cron
```

**What to look for:**
- `stats.totalSubscriptions: 0` → No subscriptions found when cron runs
- `stats.subscriptionsWithSchedules: 0` → Subscriptions exist but no matching schedules
- `stats.timeMatches: 0` → Schedules exist but current time doesn't match
- `stats.notificationsSent: 0` → No notifications were sent
- `stats.issues: [...]` → List of problems found

### Step 5: Check Vercel logs

In Vercel dashboard, check the function logs for:
- `[SUBSCRIBE]` logs when you enable notifications
- `[UPDATE-SCHEDULE]` logs when you save settings
- `[CRON]` logs when cron runs

## Common Issues and Solutions

### Issue 1: No subscriptions in memory

**Symptoms:**
- `totalSubscriptions: 0` in `/api/debug`
- `stats.totalSubscriptions: 0` in `/api/cron`

**Possible causes:**
1. You haven't enabled notifications yet
2. Subscription failed to save (check logs for errors)
3. Serverless function restarted and lost memory (in-memory storage)

**Solution:**
1. Enable notifications in the app
2. Check if subscription was saved (look for `[SUBSCRIBE]` logs)
3. Immediately check `/api/debug` to see if it's there

### Issue 2: No schedules in memory

**Symptoms:**
- `totalSchedules: 0` in `/api/debug`
- `stats.subscriptionsWithSchedules: 0` in `/api/cron`

**Possible causes:**
1. You haven't saved settings yet
2. Schedule failed to save (check logs for errors)
3. Serverless function restarted and lost memory

**Solution:**
1. Save settings in the app
2. Check if schedule was saved (look for `[UPDATE-SCHEDULE]` logs)
3. Immediately check `/api/debug` to see if it's there

### Issue 3: UserIds don't match

**Symptoms:**
- Subscriptions exist (`totalSubscriptions: 1`)
- Schedules exist (`totalSchedules: 1`)
- But `subscriptionsWithSchedules: 0` in cron

**Possible causes:**
- The userId generated for subscription is different from the userId generated for schedule
- This happens if the subscription object is different between calls

**How to check:**
```bash
curl https://meal-notify-backend.vercel.app/api/debug | jq '.subscriptions[0].userId'
curl https://meal-notify-backend.vercel.app/api/debug | jq '.schedules[0].userId'
```

**Solution:**
- Check the `getUserId` function - it uses `subscription.keys?.auth || subscription.endpoint`
- Make sure the same subscription object is sent to both `/api/subscribe` and `/api/update-schedule`

### Issue 4: Time doesn't match

**Symptoms:**
- Subscriptions exist
- Schedules exist
- UserIds match
- But `timeMatches: 0` in cron

**Possible causes:**
- Current time is not within 2 minutes of scheduled time
- Cron is not running at the right time

**How to check:**
- Look at `[CRON]` logs - they show the time difference
- Check if cron is running every 5 minutes
- Check if your scheduled time is correct

**Solution:**
- Set a test time 2 minutes from now
- Call `/api/cron` manually at that time
- Check if it matches

### Issue 5: Serverless function restarts

**Symptoms:**
- Subscriptions/schedules exist immediately after saving
- But they're gone when cron runs later

**How to check:**
1. Enable notifications
2. Immediately check `/api/debug` → Should show subscription
3. Wait 5 minutes
4. Check `/api/debug` again → Might be empty

**Solution:**
- This is expected with in-memory storage on serverless
- Need to use persistent storage (database, Vercel KV, etc.)

## Understanding the Flow

### When you enable notifications:

1. Frontend creates push subscription
2. Frontend calls `/api/subscribe` with subscription
3. Backend saves subscription to Map: `subscriptions.set(userId, subscription)`
4. Backend logs: `[SUBSCRIBE] ✅ Subscription saved`
5. Check `/api/debug` → Should show `totalSubscriptions: 1`

### When you save settings:

1. Frontend calls `/api/update-schedule` with subscription + times + foods
2. Backend gets userId from subscription
3. Backend saves schedule: `userSchedules.set(userId, { notificationTimes, foods })`
4. Backend logs: `[UPDATE-SCHEDULE] ✅ Schedule updated`
5. Backend logs: `Checking if subscription exists for this userId: true/false`
6. Check `/api/debug` → Should show `totalSchedules: 1`
7. Check if userId matches between subscriptions and schedules

### When cron runs:

1. External service calls `/api/cron` every 5 minutes
2. Backend calls `checkAndSendNotifications()`
3. Backend logs: `[CRON] Total subscriptions in memory: X`
4. Backend loops through each subscription
5. For each subscription, checks if schedule exists (same userId)
6. For each schedule, checks if current time matches (within 2 minutes)
7. If match, sends notification
8. Returns statistics

## Next Steps

1. **Deploy the updated backend** with these diagnostic tools
2. **Enable notifications** in the app
3. **Check `/api/debug`** immediately - does subscription exist?
4. **Save settings** in the app
5. **Check `/api/debug`** immediately - does schedule exist? Do userIds match?
6. **Call `/api/cron`** manually - what does it find?
7. **Check Vercel logs** - what do the logs say?

This will tell us exactly where the problem is!

