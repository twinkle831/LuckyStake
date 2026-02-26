

## Slide 1: Title

**LuckyStake**  
*Decentralized Savings + Prize Draws on Stellar*

- Savings pools with **guaranteed principal return**
- One winner per draw gets the **yield** (prize)
- Yield from **different yielding protocols** lending on Stellar
- **Fair, on-chain** winner selection (Protocol 20 VRF)

---

## Slide 2: Problem & Solution

**Problem**
- People want savings yield but don’t want to lock funds with no upside.
- Traditional lotteries: you can lose your stake.

**Solution**
- **Deposit XLM** into weekly / biweekly / monthly pools.
- Funds earn **yield via Blend**; your **principal is always returned** after the draw.
- **One random winner** per draw wins the **entire yield** as prize.
- Everyone else gets principal back. **No one loses principal.**

---


---

## Slide 4: Core Maths — Tickets

**Ticket formula (on-chain):**

```
tickets = amount × period_days
```

- **amount** = deposit in XLM (in stroops: × 10⁷).
- **period_days** = 7 (weekly), 15 (biweekly), or 30 (monthly).

**Examples:**
- 10 XLM in **Weekly**  → 10 × 7  = **70 tickets**
- 10 XLM in **Biweekly** → 10 × 15 = **150 tickets**
- 10 XLM in **Monthly**  → 10 × 30 = **300 tickets**

**Interpretation:** 1 ticket per 1 XLM per day of lock.

---

## Slide 5: Core Maths — Win Probability

**Your chance to win** (proportional to tickets):

```
P(you win) = (your_tickets / total_tickets) × 100%
```

**total_tickets** = sum of all participants’ tickets in that pool.

**Example:**  
Pool has 1,000 total tickets; you have 70 tickets  
→ **P(win) = 70 / 1,000 = 7%.**

**On-chain draw:**  
- Contract has `TotalTickets` and per-user `Tickets`.
- Random number from **Stellar VRF** (Protocol 20): `random = env.prng().gen()`.
- Winner index: `winning_ticket_index = random % total_tickets`.
- Winner = depositor who “owns” that ticket in a cumulative ticket range.

---


```


Contract updates:
- `Balance(depositor) -= amount`
- `Tickets(depositor) -= tickets_to_remove`
- `TotalDeposits` and `TotalTickets` reduced by same amounts.

---

## Slide 7: Where Does the Prize (Yield) Come From? — Blend

**Blend** = lending protocol on Stellar. Lenders supply assets and earn **APY**. and other protocols

**Flow:**
1. Users deposit XLM into **LuckyStake contract**.
2. **Admin** calls `supply_to_blend(amount)` → contract sends XLM to **Blend pool**.
3. Blend uses the capital for lending; **yield accrues** (e.g. ~5–7% APY).
4. Before each draw, admin calls **`harvest_yield`** → yield is withdrawn from Blend and **added to contract’s PrizeFund**.
5. **`execute_draw`** sends the **PrizeFund** to the **VRF-selected winner**.

**Profit for users:** The “profit” is the **yield**; one winner gets 100% of it; others get principal back (no loss).

---

## Slide 8: Blend Integration — Contract Side

**Storage:**
- `BlendPool` — Blend pool contract address.
- `SuppliedToBlend` — Principal currently supplied (for accounting).

**Admin-only functions:**
- **`set_blend_pool(blend_pool)`** — Set Blend pool address.
- **`supply_to_blend(amount)`** — Approve & supply XLM to Blend (`submit_with_allowance`).
- **`withdraw_from_blend(amount, min_return)`** — Withdraw principal back to contract (e.g. before draw so users can claim).
- **`harvest_yield(amount, min_return)`** — Withdraw **yield** from Blend; contract adds it to **PrizeFund**.

**Read-only:** `get_supplied_to_blend()`, `get_blend_pool()`.

---

## Slide 9: Blend Integration — Draw Automation (Cron)

**When a pool period ends**, backend cron:

1. **Harvest yield** (optional): `harvest_yield` → yield → **PrizeFund**.
2. **Withdraw principal from Blend**: `withdraw_from_blend(total_deposits)` so the contract holds XLM again.
3. **Execute draw**: `execute_draw()` → VRF picks winner; contract sends **PrizeFund** to winner.
4. **Record draw**; users **claim principal** via contract `withdraw()` from the frontend.

**Result:** Winner gets **prize (yield)** on-chain; everyone can claim **principal** from the contract. No one loses principal.

---

## Slide 10: Yield → Prize (Math)

**Approximate yield over one period:**

```
yield ≈ Principal × (APY / 100) × (period_days / 365)
```

**Example (10,000 XLM, 7-day pool, 5.8% APY):**
- yield ≈ 10,000 × 0.058 × (7/365) ≈ **11.1 XLM** → that’s the **prize** for that draw.

**Minimum prize (display):** We floor the **displayed** prize at **100 XLM** so the UI never shows an empty or tiny prize. Actual on-chain prize can be higher when Blend yield is harvested.

---

## Slide 11: Security & Fairness

- **Principal safety:** Funds in Soroban contract; winner only gets **PrizeFund** (yield), not principal.
- **Randomness:** Stellar **Protocol 20 VRF** (`env.prng().gen()`) — verifiable, not manipulable by admin.
- **Blend:** Only **admin** can supply/withdraw/harvest; users only deposit/withdraw/claim from the pool contract.
- **Transparency:** All deposits, draws, and winner payouts are on-chain (Stellar Expert).

---

## Slide 12: Tech Stack

| Layer      | Tech |
|-----------|------|
| **Chain** | Stellar, Soroban (Rust contracts) |
| **Contracts** | LuckyStake pool: deposit, withdraw, execute_draw, Blend (supply / withdraw / harvest) |
| **Backend** | Node.js, Express, cron for draw + Blend harvest |
| **Frontend** | Next.js, Freighter/xBull, real-time pool data |
| **Yield** | Blend lending protocol on Stellar |

---

## Slide 13: Pool Types at a Glance

| Pool      | Period | Tickets (per XLM) | Min displayed prize |
|-----------|--------|--------------------|----------------------|
| Weekly   | 7 days | 7                  | 100 XLM              |
| Biweekly | 15 days| 15                 | 100 XLM              |
| Monthly  | 30 days| 30                 | 100 XLM              |

**APY (Blend):** ~5.8% (weekly), ~6.2% (biweekly), ~7.1% (monthly) — used for estimates and UI.

---




*End of slide content. Copy each section into one slide; adjust titles and add your branding/links as needed.*
