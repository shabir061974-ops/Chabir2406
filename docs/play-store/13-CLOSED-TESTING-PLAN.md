# Faiha Store — Closed Testing Plan & Production Access

**Verified in your live Play Console on 21 July 2026.**

| Fact | Value |
|---|---|
| Console login | `alfaihacoop26@gmail.com` |
| Developer account | **Faiha Co-operative Society** |
| **Account type** | 🔴 **Personal account** (shown under the account name) |
| Account ID | `7690653802904951108` |
| App | Faiha Store · `com.faihacoopkw.store` · **Draft** · 0 installs |
| App ID | `4975233531944573076` |
| Android developer verification | ✅ Already satisfied |

---

## 1. Verdict: Closed Testing IS REQUIRED

Your account is a **Personal** developer account, so Google requires a closed test before you
can publish to production. Google states this on your own dashboard:

> "To publish to everyone, you need to finish setting up your app, **complete a closed test,
> and apply for production access**."

And the production gate lists, verbatim:

1. Publish a closed testing release
2. **Have at least 12 testers opted-in to your closed test** — *0 testers currently opted in*
3. **Run your closed test with at least 12 testers, for at least 14 days**
4. → then "Apply for production" (button is currently greyed out)

An Organization account would have been exempt. Yours is not.

---

## 2. ⚠️ The critical-path insight

**You cannot start the 14-day clock until the app setup is finished — and that includes the
Store Listing, which requires the graphics.**

So the real sequence is:

```
Graphics (icon + feature + screenshots)
        ↓
Complete 11 setup tasks (incl. Store listing)
        ↓
Create closed test track + add 12+ testers
        ↓
Roll out closed release  ──►  14-DAY CLOCK STARTS
        ↓  (14 days, ≥12 testers opted in continuously)
Apply for production access
        ↓  (Google review, days to ~1 week)
Production release → live on Google Play
```

**Realistic earliest launch: ~3 weeks from today**, and it only starts when the graphics land.
The graphics are therefore the single highest-priority item — every day of delay there pushes
the whole launch by a day.

> **Do not lose testers mid-test.** The 12 testers must remain opted in for the full 14 days.
> If someone opts out and the count drops below 12, you risk resetting your progress. Recruit
> **15–16** to give yourself a buffer.

---

## 3. Current Console state — all 11 setup tasks are INCOMPLETE

From your dashboard, every task still shows an empty circle:

**Let us know about the content of your app**
- ○ Set privacy policy
- ○ Sign-in details (App access)
- ○ Ads
- ○ Content rating
- ○ Target audience
- ○ Data safety
- ○ Government apps
- ○ Financial features
- ○ Health

**Manage how your app is organised and presented**
- ○ Select an app category and provide contact details
- ○ Set up your Store Listing

*(Note: your default store-listing language is currently **English (United Kingdom) – en-GB**,
not en-US. That's fine — just be consistent.)*

Every answer for these is in `00-FINAL-PUBLISHING-PACKAGE.md`.

---

## 4. Tester recruitment — what you need

**Target: 15–16 people** (need 12 minimum; recruit extra as buffer).

Requirements for each tester:
- A **Google account email** (Gmail or any Google-linked address) — this is what you add to the tester list
- An **Android device** (Android 7.0 / API 24 or higher)
- Willingness to **install the app and leave it installed for the full 14 days**

Good candidates: co-op staff, board members, their family members, IT team, friendly regular
customers. They do **not** need technical skills.

⚠️ **Common mistake:** adding a tester's *phone number* or a non-Google email. It must be the
Google account email they use on their Android device, or the opt-in link won't work for them.

---

## 5. Tester invitation messages

### A. Initial invitation — Email (English)

**Subject:** Help us test the new Faiha Store app (2 minutes to join)

```
Dear [Name],

We are preparing to launch Faiha Store — the official shopping app of Al-Faiha
Co-operative Society — on Google Play, and we would love your help testing it.

What we need from you:
1. Reply with the Gmail address you use on your Android phone.
2. We will send you a link to join the test.
3. Install the app and simply keep it installed for 14 days.
4. Use it whenever you like and tell us if anything looks wrong.

It takes about 2 minutes to join. There is no cost, and you can shop normally
through the app (payment is cash on delivery).

Google requires at least 12 testers for 14 days before a new app can be published,
so your participation genuinely helps us launch.

Thank you for supporting your co-operative.

Al-Faiha Co-operative Society
info@faihacoopkw.com · +965 1861000
```

### B. Initial invitation — Email (Arabic)

**الموضوع:** ساعدنا في تجربة تطبيق متجر الفيحاء الجديد

```
عزيزي/عزيزتي [الاسم]،

نستعد لإطلاق تطبيق "متجر الفيحاء" — التطبيق الرسمي لجمعية الفيحاء التعاونية —
على متجر Google Play، ونسعد بمشاركتك في تجربته.

ما نحتاجه منك:
١. أرسل لنا بريد Gmail الذي تستخدمه على هاتفك الأندرويد.
٢. سنرسل لك رابط الانضمام إلى التجربة.
٣. قم بتثبيت التطبيق وأبقِه مثبتاً لمدة ١٤ يوماً.
٤. استخدمه كما تشاء وأخبرنا بأي ملاحظة.

لا يستغرق الانضمام سوى دقيقتين، ولا توجد أي تكلفة، ويمكنك التسوق بشكل طبيعي
(الدفع نقداً عند الاستلام).

تشترط Google وجود ١٢ مختبِراً على الأقل لمدة ١٤ يوماً قبل نشر أي تطبيق جديد،
لذا فإن مشاركتك تساعدنا فعلياً على الإطلاق.

شكراً لدعمكم جمعيتكم.

جمعية الفيحاء التعاونية
info@faihacoopkw.com · ٩٦٥١٨٦١٠٠٠+
```

### C. WhatsApp / short message (bilingual)

```
مرحباً! نحن نطلق تطبيق "متجر الفيحاء" على Google Play ونحتاج مختبرين 🙏
أرسل لنا بريد Gmail الخاص بهاتفك الأندرويد وسنرسل لك رابط التجربة.
كل المطلوب: تثبيت التطبيق وإبقاؤه ١٤ يوماً.

Hi! We're launching the Faiha Store app on Google Play and need testers 🙏
Send us the Gmail address on your Android phone and we'll send you the test link.
All you need to do: install it and keep it installed for 14 days.
```

### D. The opt-in link message (send AFTER the track is live)

```
Thank you for joining the Faiha Store test!

Step 1 — Open this link on your Android phone and tap "Become a tester":
[PASTE THE OPT-IN URL FROM PLAY CONSOLE]

Step 2 — Then tap "Download it on Google Play" and install Faiha Store.

Step 3 — Please keep the app installed until [DATE = start + 14 days].

Important: you must use the same Gmail address you gave us, on the phone itself.
If you see "item not found", give it 15–30 minutes — new tests take a little while
to appear — then try again.

Any problems, just reply to this message.
```

### E. Mid-test reminder (send on day 7)

```
Hello! Quick reminder — please keep the Faiha Store app installed until [DATE].
Google checks that testers stay opted in for the full 14 days.

If you have a moment, try browsing products and adding something to the cart,
and let us know if anything doesn't look right. Thank you! 🙏
```

---

## 6. Closed testing checklist

### Setup phase
- [ ] Produce app icon 512×512, feature graphic 1024×500, 2–8 phone screenshots
- [ ] Complete all 11 app-setup tasks (answers in `00-FINAL-PUBLISHING-PACKAGE.md`)
- [ ] Collect **15–16 tester Gmail addresses**
- [ ] Create closed test track ("Alpha" / "Closed testing")
- [ ] Create an email list in Play Console and paste all tester emails
- [ ] Select countries — **Kuwait** (plus anywhere testers live)
- [ ] Upload `app-release.aab` (SHA-256 `b1648652…`)
- [ ] Add release name `1.0.0 (1)` and release notes
- [ ] **Roll out to closed testing** ← the 14-day clock starts here
- [ ] Copy the **opt-in URL** and send message (D) to every tester
- [ ] **Record the start date:** ____________

### During the 14 days
- [ ] Day 1–2: confirm testers are opting in — Console shows the opted-in count
- [ ] **Verify the count reaches 12+** and note the date it did
- [ ] Day 7: send reminder (E)
- [ ] Keep `www.faihacoopkw.com` online and healthy the entire time
- [ ] Collect any feedback; log bugs (fix only if serious — each new build is fine, the clock
      does not reset for new releases on the same track)
- [ ] Day 14: confirm Console shows the requirement satisfied

### After 14 days
- [ ] "Apply for production" button becomes active → click it
- [ ] Answer the production-access questionnaire (§7 below)
- [ ] Submit and wait for Google's decision
- [ ] Once granted → create the Production release and submit for review

---

## 7. Production Access application — prepared answers

When you click **Apply for production**, Google asks about your closed test. Use these
(adjust the numbers to what actually happened — **never invent figures**):

**"How did you recruit testers for your closed test?"**
```
Our testers were recruited directly from within Al-Faiha Co-operative Society's own
community in Kuwait: co-operative staff, board members, their family members, and a
group of regular customers of our physical stores. We contacted them personally by
email and WhatsApp, explained the purpose of the test, and asked them to install the
app and keep it installed for the full testing period. All testers are real people
known to the co-operative and are representative of our actual customer base — Kuwaiti
households who shop with us for groceries and daily essentials.
```

**"What feedback did you receive from testers, and how did you apply it?"**
```
Testers used the app the way real customers would: browsing the product catalogue in
both English and Arabic, searching for items, adding products to the cart, applying
coupon codes, creating accounts with their phone numbers, and placing cash-on-delivery
orders.

[REPLACE WITH WHAT ACTUALLY HAPPENED, e.g.:]
- Testers confirmed the catalogue, pricing in Kuwaiti Dinar, and the Arabic/English
  language switch worked correctly on their devices.
- Feedback on [X] led us to [Y].
- No blocking defects were reported; the ordering and tracking flow completed
  successfully for testers who placed test orders.

We reviewed every piece of feedback with the team and confirmed the app was stable
across the range of Android devices our testers use before applying for production.
```

**"How did you decide your app is ready for production?"**
```
We ran the closed test for the full 14-day period with more than 12 testers opted in
continuously. During that time testers exercised the app's core journeys — browsing,
search, cart, coupons, account creation, checkout with cash on delivery, and order
tracking — on their own Android devices without encountering blocking issues.

The app is a companion to Al-Faiha Co-operative Society's established online store at
www.faihacoopkw.com, which is already in live operation, so the underlying catalogue,
pricing and ordering systems are proven in production. We also completed a privacy
review: the app requests only the INTERNET permission, contains no advertising or
third-party analytics or tracking SDKs, and our published privacy policy documents
exactly what we collect and how customers can request deletion of their data.

On that basis we are satisfied the app is stable, accurate and ready for general
availability in Kuwait.
```

> ⚠️ **Answer honestly and specifically.** Google reviewers read these. Vague or obviously
> templated answers, or claims that don't match your actual test data, are a common reason
> production access gets refused. Fill in the bracketed parts with what genuinely happened.

---

## 8. Common mistakes that cost weeks

| Mistake | Consequence |
|---|---|
| Tester count drops below 12 during the 14 days | Requirement not met; you may have to extend |
| Adding non-Google emails / phone numbers as testers | Testers can't opt in; clock effectively hasn't started |
| Assuming the clock starts when you *create* the track | It starts when you **roll out the release** |
| Letting the website/API go down mid-test | Testers see a broken app; bad feedback and reviewer risk |
| Writing generic production-access answers | Production access refused |
| Only 12 testers with no buffer | One drop-out breaks the requirement |
| Forgetting to keep the app installed | Opt-in must persist, not just be clicked once |
