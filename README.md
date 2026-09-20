# Ledger of Shame

**Live demo:** [ledger-of-shame.vercel.app](https://ledger-of-shame.vercel.app)

It's a group expense splitter. You log who paid for what, and it works out how everyone can settle up in as few payments as it can manage.

## The corkboard

Every group is a "case". People get pinned to a corkboard like suspects, and each debt is a piece of red string between two of them. Hit "Crack the Case" and the tangle of strings collapses into the short list of payments that clears everything. It's all plain CSS and SVG, no image files and no animation library.

## The $100 bill riddle

This is the part I cared about getting right, so here's the riddle it's built around.

A traveler walks into a broke little town and drops a $100 bill on the hotel desk while he goes to look at a room. The hotel owner grabs it and runs off to pay the butcher. The butcher pays the farmer. The farmer pays the guy he owed, and that guy pays the next guy, and so on around the town until someone finally pays the hotel owner, who was owed money too. The hotel owner puts the bill back on the desk. The traveler comes down, says the room isn't for him, pockets his $100, and leaves.

Nobody in town gained a cent, and everybody's debts are gone. The same bill just went around a loop.

There's a SrGrafo comic about this called "Debt Cycle" that tells it better than I just did, so consider this a nod to it. I'm not linking it because I'm not sure of the exact URL.

The useful part is that a loop of debts is basically free to erase. If A owes B, B owes C, and C owes A, all for the same amount, then nobody needs to pay anybody. They're already even, they just don't know it yet.

## How the settling works

The trick is to stop thinking about who owes whom and just think about each person's balance. Add up everything a person is owed, subtract everything they owe, and you get one number. Positive means the group owes you. Negative means you owe the group. Zero means you're square.

Once everyone is a single number, the loops disappear on their own (that's the riddle above, everyone in the loop nets to zero). Then the code does this:

1. Split people into two piles: everyone with a negative balance (they owe) and everyone with a positive one (they're owed). Sort each pile once, biggest first.
2. Look at the top person in each pile. The debtor pays the creditor whichever is smaller, what the debtor owes or what the creditor is owed.
3. Take that amount off both of them. Whoever hits zero is done, so move down to the next person in their pile. Whoever still has a balance stays on top and gets matched with the next person on the other side.
4. Repeat until both piles are empty.

It only sorts once. It doesn't go back and hunt for the biggest person left after every payment, it just walks down the two sorted lists. Ties stay in the order people showed up.

Every payment finishes at least one person, and the last one finishes two, so if `k` people aren't square yet, you never need more than `k - 1` payments. The code is in `lib/simplifyDebts.ts` and it works in integer cents the whole way through.

### It's a heuristic

I want to be upfront about this. Walking down two sorted lists like this is a greedy shortcut, and it is not guaranteed to find the true minimum number of payments. Finding the real minimum means splitting the group into as many self-contained "these people cancel each other out" clusters as possible, and that's a known hard problem (NP-hard, if you like that sort of thing).

Here's a case where greedy loses. Say the balances are -$9, -$9, -$8, +$1, +$8, +$8, +$9. The best you can do is 4 payments: one -$9 pays the +$9, the -$8 pays a +$8, and the other -$9 covers the leftover +$8 and +$1. Greedy takes 5. The comment at the top of the file says the same thing, this isn't a secret.

## Stack

- Next.js (App Router)
- Prisma on Postgres, hosted on Neon
- Deployed on Vercel
- No auth and no external APIs

Since there's no auth, every case on the live demo is visible to anyone who has the link. Don't put your real rent numbers in there.

## Running it locally

You need a Postgres database (I use Neon, but any Postgres works) and a recent Node (I'm on 24).

```
npm install
```

Make a `.env` file in the project root with your own connection string. Don't commit it.

```
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
```

Then create the tables and start it up:

```
npx prisma migrate dev
npm run dev
```

The app runs on http://localhost:3000.

Tests are `npm test`. That covers the settling algorithm (debt chains, loops, groups that are already even) and the equal-split math (including uneven cents).

## GraphQL API

The UI talks to a few REST routes, and there's also a GraphQL endpoint at `/api/graphql` (built with graphql-yoga). In development, opening that URL in a browser gives you GraphiQL to poke around in. It's switched off in production.

Every amount is an integer number of cents. `1000` means $10.00, and nothing gets converted to a float anywhere.

Query a group, with its people and the computed settle-up payments, in one request:

```graphql
query {
  group(id: "GROUP_ID") {
    name
    people { id name }
    settlements { from to amountCents }
  }
}
```

Log an expense. One person paid, and it gets split equally among the participants:

```graphql
mutation {
  addExpense(
    groupId: "GROUP_ID"
    payerId: "PERSON_ID"
    amountCents: 1000
    participantIds: ["PERSON_ID", "OTHER_ID", "THIRD_ID"]
    description: "dinner"
  ) {
    fromId
    toId
    amountCents
  }
}
```

If the amount doesn't divide evenly, the leftover cents go one each to the first people in sorted id order. The payer's own share isn't recorded as a debt, since they don't owe themselves.

There's also `settleDebt(groupId, fromId, toId, amountCents)`, for when someone actually pays someone back. It records the opposite debt so the two balances net out.
