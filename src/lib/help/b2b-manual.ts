import type { HelpModule } from "@/lib/help/types";

/**
 * The partner-facing manual.
 *
 * Written for somebody who has never used a booking system: plain words, short
 * sentences, one idea at a time, and every piece of trade jargon explained the
 * first time it appears. Staff already know what an allotment is — a travel
 * agent's new hire does not, and that is who this is for.
 *
 * It uses the same shape as the staff manual so both render through the same
 * components. Screenshots are captured by scripts/capture-help-screenshots.ts
 * into public/help/b2b/, so a UI change is a re-run rather than a re-shoot.
 */
export const b2bManual: HelpModule = {
  slug: "b2b",
  name: "Portal guide",
  icon: "BookOpen",
  color: "blue",
  description:
    "How to use the booking portal, from your first login to your monthly statement.",
  overview:
    "This guide walks you through everything the portal does, in order. You do not need any experience with booking systems — each section says what to click, what happens next, and what to do if something looks wrong. If a word is new to you, it is explained the first time it appears.",
  sections: [
    {
      id: "getting-started",
      title: "1. Getting started",
      description:
        "Your first login: setting a password, linking your phone, and saving the codes that get you back in if you lose it.",
      features: [
        "Your invitation link works once and expires after 7 days",
        "You choose your own password — nobody here knows it",
        "Two-factor authentication is required, not optional",
        "Backup codes are shown once, and only once",
        "You accept the terms of use before your first booking",
      ],
      screenshot: "01-login.png",
      steps: [
        {
          step: 1,
          title: "Open the invitation email",
          description:
            "You will get an email with a link. Click it. If it says the link has expired or has already been used, ask your account manager for a new one — links cannot be reused, on purpose.",
        },
        {
          step: 2,
          title: "Choose a password",
          description:
            "At least 12 characters, with a capital letter, a small letter and a number. Type it twice so a typo cannot lock you out. Nobody at our end can see it.",
        },
        {
          step: 3,
          title: "Install an authenticator app",
          description:
            "On your phone, install Google Authenticator, Microsoft Authenticator, or a similar free app. This is what proves it is really you when you sign in — a password on its own is not enough here, because these logins can spend money.",
        },
        {
          step: 4,
          title: "Scan the square code",
          description:
            "Open the app, choose 'add account' or the + button, and point your camera at the square code on screen. The app will start showing a 6-digit number that changes every 30 seconds. Type the current number into the box.",
        },
        {
          step: 5,
          title: "Save your backup codes",
          description:
            "You will be shown ten short codes made of letters. Each one signs you in once, without your phone. Copy them somewhere safe — a password manager, or printed and locked away. You will not be shown them again, and if you lose your phone with no codes left, only your account manager can get you back in.",
        },
        {
          step: 6,
          title: "Accept the terms",
          description:
            "Read them and tick the box. You are accepting on behalf of your company. If we publish a new version later, you will be asked again.",
        },
      ],
    },
    {
      id: "finding-your-way",
      title: "2. Finding your way around",
      description:
        "What is on the screen, what the numbers on the dashboard mean, and where everything lives.",
      features: [
        "The menu on the left is grouped: Book, Account, Settings",
        "The dashboard is the first thing you see after signing in",
        "You are signed out after 15 minutes of doing nothing",
        "Every session ends after 4 hours, even if you are busy",
      ],
      screenshot: "02-dashboard.png",
      steps: [
        {
          step: 1,
          title: "Read the dashboard",
          description:
            "'Available credit' is how much you can still spend before bookings need our approval. 'Arrivals' counts guests arriving soon. 'Needs attention' counts bookings that are not settled yet — on request or waiting for approval.",
        },
        {
          step: 2,
          title: "Use the menu",
          description:
            "Book is where you search and manage bookings. Account is money and rate sheets. Settings is your own login and, if you are an administrator, your colleagues'.",
        },
        {
          step: 3,
          title: "Expect to be signed out",
          description:
            "If you walk away for 15 minutes you will have to sign in again. This is deliberate — an unattended screen is how someone else makes a booking in your name.",
        },
      ],
    },
    {
      id: "searching",
      title: "3. Searching for a hotel",
      description:
        "How to look for rooms, what the results are telling you, and why a hotel or a date sometimes does not appear.",
      features: [
        "You only see hotels your company is contracted to sell",
        "Prices shown are net — see section 4",
        "A minimum stay can hide short trips from the results",
        "'Sold out' and 'on request' mean different things",
      ],
      screenshot: "03-search.png",
      steps: [
        {
          step: 1,
          title: "Enter the trip",
          description:
            "Choose where, the arrival and departure dates, and who is travelling. Count adults, children and infants separately — a child's price depends on their age, so enter each child's age when asked.",
        },
        {
          step: 2,
          title: "Read the results",
          description:
            "Each card is a hotel; each row inside it is a room type with a board basis. Board basis is what meals are included: RO is room only, BB is bed and breakfast, HB is half board (breakfast and dinner), FB is full board, AI is all-inclusive.",
        },
        {
          step: 3,
          title: "If a hotel is missing",
          description:
            "Three usual reasons. It is not on your company's list — ask your account manager. The contract does not cover those dates. Or the stay is shorter than the hotel's minimum, which is common over peak periods.",
        },
        {
          step: 4,
          title: "If a room says 'on request'",
          description:
            "The hotel has run out of the rooms set aside for us — that set-aside is called the allotment. You can still book it, but we have to ask the hotel first. See section 5.",
        },
      ],
    },
    {
      id: "understanding-price",
      title: "4. Understanding the price",
      description:
        "What net means, what an SPO is, and where your own margin fits in.",
      features: [
        "Net rate — what you pay us, with nothing added",
        "SPO — a special offer, applied for you automatically",
        "Your markup — what you add on top for your own client",
        "Client price — net plus your markup, the figure your customer sees",
      ],
      // Not captured yet: needs a live search result. A named figure with no
      // file behind it falls back to the placeholder, so naming it here records
      // the intent and it appears by itself once the capture script can make it.
      screenshot: "04-price.png",
      steps: [
        {
          step: 1,
          title: "Net rate",
          description:
            "The price you see in search is the net rate: your cost. It already includes the room, the board basis you picked, and any child charges. It does not include anything you add for yourself.",
        },
        {
          step: 2,
          title: "SPO — special offer",
          description:
            "SPO stands for Special Promotion Offer: a deal the hotel is running, such as 'stay 7 nights, pay 6', or 15% off if you book early. You do not have to ask for it. The system picks the best one you qualify for and it is already in the price shown.",
        },
        {
          step: 3,
          title: "Your markup",
          description:
            "PPPN means 'per person per night'. If your markup is 5 PPPN, a room with 2 adults for 4 nights adds 2 × 4 × 5 = 40. Section 8 explains how to set it.",
        },
        {
          step: 4,
          title: "Client price",
          description:
            "Net plus your markup. This is the figure on the documents you give your own customer. Your net rate never appears on a voucher — your cost is not your customer's business.",
        },
      ],
    },
    {
      id: "making-a-booking",
      title: "5. Making a booking",
      description:
        "Filling in the guests, adding flights, and what happens after you press confirm.",
      features: [
        "Guest names must match their passports",
        "Your own reference is optional and searchable",
        "'Confirmed' means the room is yours",
        "'On request' means we are asking the hotel",
        "'Awaiting approval' means we have to release it",
      ],
      screenshot: "05-booking.png",
      steps: [
        {
          step: 1,
          title: "Fill in the guests",
          description:
            "First name and last name for each guest, spelled as on their passport. Hotels turn people away over mismatched names, and airlines charge to change them.",
        },
        {
          step: 2,
          title: "Add flights if you know them",
          description:
            "Flight number, time and airports. This is optional, but it is how the hotel knows when to expect them and how transfers get arranged.",
        },
        {
          step: 3,
          title: "Add your own reference",
          description:
            "Your file or invoice number. It appears on your bookings list and you can search by it, which is far quicker than remembering ours.",
        },
        {
          step: 4,
          title: "Confirm, and read what comes back",
          description:
            "'Confirmed' means the room is held and your credit has been used. 'On request' means the hotel is out of allotment and we have asked them — nothing is held and no credit is used until they answer, usually within 48 hours. 'Awaiting approval' means the booking is over your credit limit or over the value your account can confirm on its own, so a colleague of ours has to release it.",
        },
        {
          step: 5,
          title: "If it is refused",
          description:
            "A stop sale means the hotel has closed those dates entirely and nobody can book them — not even us. Choose different dates.",
        },
      ],
    },
    {
      id: "managing-bookings",
      title: "6. Managing bookings",
      description:
        "Changing a booking, cancelling one, and why a change sometimes costs more or has to wait for us.",
      features: [
        "Names, flights and your reference change freely, at no cost",
        "Dates, rooms and occupancy are re-priced from the contract",
        "A re-price that comes out higher is yours to absorb",
        "Cancelling inside the penalty window needs our approval",
        "You always see the price before you agree to it",
      ],
      screenshot: "06-booking-detail.png",
      steps: [
        {
          step: 1,
          title: "Free changes",
          description:
            "Open the booking, go to 'Guests & flights', edit and save. Correcting a spelling or adding a flight costs nothing and needs nobody's permission.",
        },
        {
          step: 2,
          title: "Changing dates or rooms",
          description:
            "Press 'Change dates or rooms', set what you want, then 'Price this change'. Nothing has moved yet. You will see the old price, the new price, and the difference.",
        },
        {
          step: 3,
          title: "Why it can cost more",
          description:
            "The new dates are priced from the contract, exactly as a fresh booking would be. A different season, or an offer that has ended, can make it dearer. That difference is yours — but you see it first, and nothing changes until you press confirm.",
        },
        {
          step: 4,
          title: "When a change has to wait",
          description:
            "Two cases. If the new dates have no allotment left, the change goes on request and your existing booking stays exactly as it is. And if the change reduces the value while you are inside the penalty window, we have to approve it — see the next step for what that window is.",
        },
        {
          step: 5,
          title: "The penalty window",
          description:
            "Every contract says how close to arrival you can cancel for free, and what it costs after that. That period near arrival is the penalty window. Outside it, cancelling is free and instant. Inside it, cancelling costs money, so the request comes to us rather than going through on its own.",
        },
        {
          step: 6,
          title: "Cancelling",
          description:
            "Press 'Cancel'. You will be shown the penalty before you commit. If it is zero, the booking is cancelled straight away and the credit goes back. If there is a penalty, we are asked and your booking stays live until we answer.",
        },
      ],
    },
    {
      id: "your-money",
      title: "7. Your money",
      description:
        "Your credit limit, what a statement shows, and what to do when the portal stops letting you book.",
      features: [
        "Credit limit — the most you may owe us at any moment",
        "Used — what your live bookings currently add up to",
        "Available — what is left to spend",
        "Statements show every movement over a period",
        "You are warned at 85%, before it becomes a problem",
      ],
      screenshot: "07-credit.png",
      steps: [
        {
          step: 1,
          title: "Read the three numbers",
          description:
            "Limit is your ceiling. Used goes up when a booking confirms and down when you pay or cancel. Available is the difference — that is what you can still book without asking anyone.",
        },
        {
          step: 2,
          title: "Pull a statement",
          description:
            "Choose a period and the page shows your opening balance, every movement in between, and your closing balance. 'PDF' downloads the same thing for your accounts department.",
        },
        {
          step: 3,
          title: "When bookings stop confirming",
          description:
            "If a booking comes back as 'awaiting approval' and you are near your limit, that is why. Settling outstanding invoices frees the limit again. If you need more room permanently, that is a conversation with your account manager, not something the portal can change.",
        },
      ],
    },
    {
      id: "your-markup",
      title: "8. Setting your markup",
      description:
        "How to add your own margin so the documents your customer sees carry your price, not ours.",
      features: [
        "PPPN — per person per night",
        "Set it per hotel, or per hotel and season",
        "It never changes what you pay us",
        "It is what turns the net rate into your client price",
      ],
      screenshot: "08-markup.png",
      steps: [
        {
          step: 1,
          title: "How PPPN works",
          description:
            "Your markup is an amount per person, per night. Everybody in the room counts, and every night of the stay counts.",
        },
        {
          step: 2,
          title: "A worked example",
          description:
            "Net rate 400 for the stay. Two adults and one child, four nights. Markup 5 PPPN. That is 3 people × 4 nights × 5 = 60. Your client price is 460. You still owe us 400.",
        },
        {
          step: 3,
          title: "Choosing where it applies",
          description:
            "Set one figure for a hotel and it applies all year. Set one for a hotel and a season and it applies only in that season, which is how you take more margin in peak weeks without touching the rest.",
        },
      ],
    },
    {
      id: "reports",
      title: "9. Reports and downloads",
      description: "What you can take away, and what each document is for.",
      features: [
        "Booking confirmation — what you owe us, for your files",
        "Voucher — for your traveller, with no prices on it",
        "Rate sheet — net rates, policies and current offers per hotel",
        "Statement — your account over a period",
        "Reports — production and cancellations, as Excel or PDF",
      ],
      screenshot: "09-documents.png",
      steps: [
        {
          step: 1,
          title: "Confirmation and voucher",
          description:
            "Both are on the booking. The confirmation is yours and shows the net total. The voucher is for the traveller to show at the hotel and deliberately carries no rates at all. A voucher only exists once the booking is confirmed.",
        },
        {
          step: 2,
          title: "Rate sheets",
          description:
            "One per contract, on 'Rate sheets'. Net rates by room and season, then the terms behind them: cancellation, child policy, offers currently running, and any closed dates.",
        },
        {
          step: 3,
          title: "Reports",
          description:
            "Under 'Reports'. Choose the period, then download as Excel to work with the numbers or PDF to send them on.",
        },
      ],
    },
    {
      id: "getting-help",
      title: "10. Getting help",
      description: "Who to contact, and what to tell them so it gets sorted first time.",
      features: [
        "Your account manager handles commercial questions",
        "Only we can reset two-factor authentication",
        "The booking reference is the fastest thing to quote",
      ],
      steps: [
        {
          step: 1,
          title: "What to send",
          description:
            "The booking reference (it looks like BK-00123), what you expected, and what actually happened. A screenshot helps. With the reference we can see the whole history of the booking, including every change and who made it.",
        },
        {
          step: 2,
          title: "Locked out",
          description:
            "Three wrong passwords locks the account for 30 minutes. Wait, or ask your account manager to release it sooner.",
        },
        {
          step: 3,
          title: "Lost your phone",
          description:
            "Use a backup code to sign in, then go to My account and generate a new set. If you have no codes left either, contact your account manager — resetting two-factor is something only we can do, and that is on purpose.",
        },
      ],
    },
  ],
};

/** Portal pages link into the section that explains them. */
export const HELP_LINKS: Record<string, string> = {
  "/b2b": "finding-your-way",
  "/b2b/search": "searching",
  "/b2b/book": "making-a-booking",
  "/b2b/bookings": "managing-bookings",
  "/b2b/credit": "your-money",
  "/b2b/rate-sheets": "reports",
  "/b2b/markup": "your-markup",
  "/b2b/excursions": "understanding-price",
  "/b2b/transfers": "understanding-price",
  "/b2b/packages": "understanding-price",
  "/b2b/users": "getting-started",
  "/b2b/account": "getting-started",
};
