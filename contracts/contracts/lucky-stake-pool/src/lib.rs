#![no_std]

//! LuckyStake Pool Contract
//!
//! A parameterized pool contract for weekly (7d), biweekly (15d), and monthly (30d) draws.
//! Deploy once per pool type with the appropriate `period_days` at initialization.
//!
//! Ticket formula: 1 ticket per $1 per day → tickets = amount * period_days

use soroban_sdk::{
    contract, contractimpl, contracttype, log, token, Address, Env, Vec,
};

#[contracttype]
pub enum DataKey {
    Admin,
    Token,
    PeriodDays,      // 7, 15, or 30
    Balance(Address),
    Tickets(Address),
    TotalDeposits,
    TotalTickets,
    PrizeFund,
    Depositors,
    DrawNonce,       // Increments each draw for entropy
}

#[contract]
pub struct LuckyStakePool;

#[contractimpl]
impl LuckyStakePool {
    /// Initialize the pool. Call with period_days = 7 (weekly), 15 (biweekly), or 30 (monthly).
    pub fn initialize(env: Env, admin: Address, token: Address, period_days: u32) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialised");
        }
        admin.require_auth();

        assert!(
            period_days == 7 || period_days == 15 || period_days == 30,
            "period_days must be 7, 15, or 30"
        );

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::PeriodDays, &period_days);
        env.storage().instance().set(&DataKey::TotalDeposits, &0i128);
        env.storage().instance().set(&DataKey::TotalTickets, &0i128);
        env.storage().instance().set(&DataKey::PrizeFund, &0i128);
        env.storage().instance().set(&DataKey::DrawNonce, &0u64);

        let empty: Vec<Address> = Vec::new(&env);
        env.storage().instance().set(&DataKey::Depositors, &empty);

        log!(
            &env,
            "Pool initialized: period_days={}",
            period_days
        );
    }

    /// User deposits tokens. Tickets = amount * period_days (1 ticket per $1 per day).
    pub fn deposit(env: Env, depositor: Address, amount: i128) {
        depositor.require_auth();
        assert!(amount > 0, "deposit amount must be greater than zero");

        let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token_id);
        token_client.transfer(
            &depositor,
            &env.current_contract_address(),
            &amount,
        );

        let period_days: u32 = env.storage().instance().get(&DataKey::PeriodDays).unwrap();
        let tickets_to_add = amount * (period_days as i128);

        let current_balance: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Balance(depositor.clone()))
            .unwrap_or(0);
        let current_tickets: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Tickets(depositor.clone()))
            .unwrap_or(0);

        let new_balance = current_balance + amount;
        let new_tickets = current_tickets + tickets_to_add;

        env.storage()
            .instance()
            .set(&DataKey::Balance(depositor.clone()), &new_balance);
        env.storage()
            .instance()
            .set(&DataKey::Tickets(depositor.clone()), &new_tickets);

        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalDeposits)
            .unwrap();
        let total_tickets: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalTickets)
            .unwrap();

        env.storage()
            .instance()
            .set(&DataKey::TotalDeposits, &(total + amount));
        env.storage()
            .instance()
            .set(&DataKey::TotalTickets, &(total_tickets + tickets_to_add));

        // Add to depositors list if new
        let mut depositors: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Depositors)
            .unwrap_or_else(|| Vec::new(&env));

        let mut found = false;
        for d in depositors.iter() {
            if d == depositor {
                found = true;
                break;
            }
        }
        if !found {
            depositors.push_back(depositor.clone());
            env.storage().instance().set(&DataKey::Depositors, &depositors);
        }

        log!(
            &env,
            "Deposit: {} deposited {} | balance: {} | tickets: {}",
            depositor,
            amount,
            new_balance,
            new_tickets
        );
    }

    /// User withdraws tokens. Tickets and balance decrease proportionally.
    pub fn withdraw(env: Env, depositor: Address, amount: i128) {
        depositor.require_auth();
        assert!(amount > 0, "withdraw amount must be greater than zero");

        let balance: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Balance(depositor.clone()))
            .unwrap_or(0);
        assert!(balance >= amount, "insufficient balance");

        let tickets: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Tickets(depositor.clone()))
            .unwrap_or(0);

        // Proportional ticket burn: tickets_to_remove = tickets * (amount / balance)
        let tickets_to_remove = if balance > 0 {
            (tickets * amount) / balance
        } else {
            0i128
        };

        let new_balance = balance - amount;
        let new_tickets = tickets - tickets_to_remove;

        env.storage()
            .instance()
            .set(&DataKey::Balance(depositor.clone()), &new_balance);
        env.storage()
            .instance()
            .set(&DataKey::Tickets(depositor.clone()), &new_tickets);

        let total: i128 = env.storage().instance().get(&DataKey::TotalDeposits).unwrap();
        let total_tickets: i128 = env.storage().instance().get(&DataKey::TotalTickets).unwrap();

        env.storage()
            .instance()
            .set(&DataKey::TotalDeposits, &(total - amount));
        env.storage()
            .instance()
            .set(&DataKey::TotalTickets, &(total_tickets - tickets_to_remove));

        let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        token::Client::new(&env, &token_id).transfer(
            &env.current_contract_address(),
            &depositor,
            &amount,
        );

        log!(
            &env,
            "Withdraw: {} withdrew {} | remaining balance: {} | tickets: {}",
            depositor,
            amount,
            new_balance,
            new_tickets
        );
    }

    /// Admin injects yield into the prize fund.
    pub fn add_prize(env: Env, amount: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        assert!(amount > 0, "prize amount must be greater than zero");

        let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        token::Client::new(&env, &token_id).transfer(
            &admin,
            &env.current_contract_address(),
            &amount,
        );

        let current: i128 = env.storage().instance().get(&DataKey::PrizeFund).unwrap();
        env.storage()
            .instance()
            .set(&DataKey::PrizeFund, &(current + amount));

        log!(&env, "Prize fund topped up: {} | total: {}", amount, current + amount);
    }

    /// Execute draw: select one random winner by ticket weight, transfer prize.
    /// Uses Stellar ledger entropy (timestamp + sequence) as fallback for randomness.
    pub fn execute_draw(env: Env) -> Address {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let prize: i128 = env.storage().instance().get(&DataKey::PrizeFund).unwrap_or(0);
        assert!(prize > 0, "no prize to distribute");

        let total_tickets: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalTickets)
            .unwrap_or(0);
        assert!(total_tickets > 0, "no tickets in pool");

        let depositors: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Depositors)
            .unwrap_or_else(|| Vec::new(&env));

        // Build (address, tickets) for participants with tickets > 0
        let mut participants: Vec<(Address, i128)> = Vec::new(&env);
        let mut acc: i128 = 0;
        for d in depositors.iter() {
            let t: i128 = env
                .storage()
                .instance()
                .get(&DataKey::Tickets(d.clone()))
                .unwrap_or(0);
            if t > 0 {
                acc += t;
                participants.push_back((d.clone(), t));
            }
        }
        assert!(acc > 0, "no participants with tickets");

        // Randomness: Stellar block entropy (timestamp + sequence + nonce)
        let ledger = env.ledger();
        let timestamp = ledger.timestamp() as u128;
        let sequence = ledger.sequence() as u128;
        let nonce: u64 = env
            .storage()
            .instance()
            .get(&DataKey::DrawNonce)
            .unwrap_or(0);
        let nonce_wide = nonce as u128;

        // Combine into a seed; use modulo for winning ticket index
        let seed = timestamp
            .wrapping_mul(31)
            .wrapping_add(sequence)
            .wrapping_mul(31)
            .wrapping_add(nonce_wide);
        let winning_ticket_index = (seed % (acc as u128)) as i128;

        // Find winner: iterate until accumulated tickets exceed winning index
        let mut cumulative: i128 = 0;
        let mut winner = participants.get(0).unwrap().0.clone();
        for p in participants.iter() {
            cumulative += p.1;
            if winning_ticket_index < cumulative {
                winner = p.0.clone();
                break;
            }
        }

        // Transfer prize to winner
        let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        token::Client::new(&env, &token_id).transfer(
            &env.current_contract_address(),
            &winner,
            &prize,
        );

        env.storage().instance().set(&DataKey::PrizeFund, &0i128);
        env.storage()
            .instance()
            .set(&DataKey::DrawNonce, &(nonce + 1));

        log!(
            &env,
            "Draw executed: winner={} | prize={} | winning_ticket_index={}",
            winner,
            prize,
            winning_ticket_index
        );

        winner
    }

    // ──────────────────────────────────────────
    //  Read helpers
    // ──────────────────────────────────────────

    pub fn get_balance(env: Env, user: Address) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::Balance(user))
            .unwrap_or(0)
    }

    pub fn get_tickets(env: Env, user: Address) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::Tickets(user))
            .unwrap_or(0)
    }

    pub fn get_total_deposits(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalDeposits)
            .unwrap_or(0)
    }

    pub fn get_total_tickets(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalTickets)
            .unwrap_or(0)
    }

    pub fn get_prize_fund(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::PrizeFund)
            .unwrap_or(0)
    }

    pub fn get_period_days(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::PeriodDays)
            .unwrap_or(0)
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    pub fn get_token(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Token).unwrap()
    }
}

#[cfg(test)]
mod test;
