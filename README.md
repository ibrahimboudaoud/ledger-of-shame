# Ledger of Shame

**Live demo:** [ledger-of-shame.vercel.app](https://ledger-of-shame.vercel.app)

An expense splitter, but the part I actually cared about building was figuring out the smallest possible number of payments to settle everyone up, instead of everyone just paying everyone back one at a time.

## Why I built this

There's a meme about this exact situation, three friends going in a circle owing each other money and nobody just cancels it out. I've lived that meme more times than I'd like to admit. So instead of complaining about it again I just built the thing that fixes it.

## The corkboard

Every group ("case") gets its own board. People are pinned up like suspects, debts are red string connecting them, and the whole thing is styled like a detective's evidence wall instead of a boring finance app. Hit "Crack the Case" and watch the messy tangle of debts collapse down into the minimal settle-up plan, strings pull back, new ones snap taut, case closed.

## How it actually works

- Log an expense: who paid, how much, split between who.
- Everyone's net balance gets computed, what they paid minus their share of everything.
- Then the algorithm matches whoever owes the most against whoever's owed the most and cancels between them, repeat until everyone's at zero. That's what actually gets you the minimum number of payments instead of a pile of individual debts.

## Running it locally

```
npm install
npm run dev
```

Needs a Postgres database (I used Neon), `DATABASE_URL` in `.env`.

## Tests

The settle-up algorithm and the equal-split math are both pure functions with their own tests, covering things like debt chains, already-settled groups, and uneven splits.

## Stack

Next.js, Prisma, Postgres. No external APIs. The corkboard look is plain CSS and SVG, no image assets, no animation library.

## Heads up, still working on this part

Right now there's no auth, no accounts, so every case on the live demo is visible to anyone with the link and there's no privacy between cases. Fine for a demo, not fine for actually splitting rent with your roommates. Next thing on my list is either a private unguessable link per case or real accounts if it needs to go further than that. Also right now everyone in a case has to be added up front, no adding a new suspect to an existing case later, which is annoying and on the list to fix. Once real accounts exist there's a bigger idea too: if Bob's in both the ski trip and the roommate case, settle him up across both at once instead of treating every case as its own island. What's live right now is a proof of concept, not the finished thing.

## What actually clicked for me building this

I figured the hard part would be the splitting math, but the real "oh" moment was the netting. You'd think you need to track and pay off every individual debt, but once you net everyone down to a single number, up or down, the whole tangled mess mostly collapses on its own. Seeing the strings actually retract on the board made that click way more than just reading about it ever did.
