# Sandy Beauty & Academy - Booking & Business System

A working prototype of a client booking platform, smart waitlist, and staff/owner
efficiency dashboards, built for a pitch to Sandy Beauty & Academy (Surbiton).

## How to open it

Double-click `index.html`. It runs in any browser with no installation and no
setup. All data lives in the browser, so it is safe to click around and it
resets cleanly.

For the smoothest demo, use Chrome or Safari full screen on a laptop, ideally
with internet so the display fonts (Cormorant Garamond + Plus Jakarta Sans, from
Google Fonts) load. Offline it still works and falls back to system fonts.

## Appearance panel (make it hers)

The circular button in the bottom-left corner opens an **Appearance** panel where
you can reshape the whole look live: palette (Blush / Plum / Peach / Champagne),
softness (Crisp / Soft / Pillowy), and headline font (Editorial / Dramatic /
Classic). Great for letting Sandy pick her vibe on the spot. Choices persist; use
"Reset to default" to return to the Blush theme.

## Demo logins (bottom of the sign-in screen)

| Person        | Role          | PIN  |
|---------------|---------------|------|
| Sandy Kaur    | Owner         | 1234 |
| Amira Hassan  | Aesthetician  | 1111 |
| Priya Shah    | Aesthetician  | 2222 |
| Lena Novak    | Aesthetician  | 3333 |

## What it does (mapped to the brief)

1. **Clients book services** - the home page is a branded booking site with her
   real treatment menu and prices. Pick a treatment, then choose the **location**,
   the **aesthetician** (or "any available"), a **date** from the calendar, and a
   time. If another branch has an earlier opening, the booking screen says so and
   offers to switch with one tap.
2. **Waitlist** - when a treatment shows as fully booked, clients join the
   waitlist instead.
3. **Automatic cascade** - when an appointment is cancelled, the freed slot is
   offered to the first 3 matching waitlist clients by text and email. They get
   24 hours to claim it. If nobody does, it cascades to the next 3, and so on,
   until the slot is filled.
4. **Running list of clients and treatments** - the Clients tab and the
   Treatments tab keep a live record of everyone and every procedure.
5. **Logins for aestheticians and the owner** - separate, role-aware dashboards.
6. **Aesthetician view** - daily, weekly and monthly workload plus earnings,
   with commission and deductions already worked out.
7. **Owner view** - the numbers a clinic owner actually wants: revenue and
   profit, most popular treatment, most profitable treatment, revenue by
   category, team performance, top clients, and revenue rescued by the waitlist.
8. **Manage-my-booking** - clients look up their appointments by email and can
   cancel themselves, which triggers the waitlist automatically.
9. **Client-side claim experience** - a phone preview showing the exact text a
   waitlisted client receives, with Claim / Not-this-time buttons.
10. **Smart insights** - the owner dashboard reads its own numbers and surfaces
    plain-English opportunities (quiet windows, pricing, waitlist recovery),
    plus a busiest-times heatmap and operations metrics (utilisation,
    cancellation and no-show rates, rebooking rate).
11. **Aesthetician extras** - next-appointment countdown and a monthly target ring.
12. **Multi-location / calendar management** - her two clinics (Kingston upon
    Thames and Shoreditch). Each aesthetician has a weekly rota of which branch
    they work.
    Booking shows each branch's earliest date, greys out days a branch has no
    availability, and surfaces "another branch has an earlier slot". The team
    schedule shows which branch each person is at each day, and the owner sees
    revenue split by location.

## The 4-minute demo script

1. Open the site. "This is what her clients see. Real treatments, real prices,
   the special offer, book in seconds." Open a booking, pick a slot, confirm.
2. Find a fully booked treatment, join the waitlist. "Right now, if she is
   booked up, that client is gone. Here, they wait in line automatically."
3. Click **Manage booking** (top right), enter the email you just booked with,
   and **Cancel**. "Watch what happens the instant a client cancels."
4. Sign in as the Owner (1234). Overview: revenue, profit, chair utilisation,
   the **busiest-times heatmap** ("these pale squares are empty chairs"), and
   the **Smart insights** the system writes on its own.
5. Go to Treatments. "This tells her which treatments fill the book, and which
   ones quietly make the most money." Point at most popular vs most profitable.
6. Go to Waitlist. Find a live offer and press **📱 Open offer**. "This is the
   exact text the client gets on their phone." Press **Claim this slot** and
   watch the revenue get recovered. To show the cascade, cancel an appointment
   with people waiting, then use **Advance 24h** in the Demo control bar
   (bottom right): "Nobody claimed it, so it rolls to the next three, on its own."
7. Sign in as an aesthetician (1111). My Day shows their next appointment, their
   monthly target ring, and their workload. My Earnings breaks down their pay
   after deductions. "Every practitioner sees their own numbers, live."

## Why this is worth the investment

- **It recovers money that is currently lost.** Every late cancellation she
  cannot re-fill is a wasted premium slot. The waitlist turns those back into
  revenue with zero manual chasing. The dashboard even totals it up.
- **It removes admin.** No more clients checking her website every day, no more
  manual texting round to fill a gap.
- **It gives her the numbers to run the business** - what to promote, who her
  best clients are, how each treatment and each team member performs.

## Files

- `index.html` - entry point
- `styles.css` - all styling
- `data.js` - services, team, seed data, and the waitlist cascade engine
- `charts.js` - the charts (no external libraries)
- `app.js` - screens and interactions

## Note on the demo vs a live rollout

This prototype runs entirely in the browser with realistic sample data so it can
be shown anywhere, instantly. A production rollout would add a secure database,
real SMS and email sending, online deposits/payments, and her live calendar. The
screens, flows and logic here are the real thing.
