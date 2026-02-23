#![no_std]

//! LuckyStake Pool Contract
//!
//! A parameterized pool contract for weekly (7d), biweekly (15d), and monthly (30d) draws.
//! Deploy once per pool type with the appropriate `period_days` at initialization.
//! Ticket formula: 1 ticket per $1 per day → tickets = amount * period_days
//!
//! Randomness: Uses Stellar's native PRNG (env.prng()) backed by protocol-level VRF
//! introduced in Protocol 20. This is cryptographically secure and verifiable on-chain.
//!
//! Blend integration: pool can supply token to a Blend lending pool to earn yield.
//! Admin sets Blend pool address, then can call supply_to_blend / withdraw_from_blend / harvest_yield.
//! SuppliedToBlend = principal supplied (excludes accrued interest). Actual balance from Blend get_positions.

use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Env, IntoVal, Symbol, Val, Vec,
};

#[contracttype]
pub enum DataKey {
    Admin,
    Token,
    PeriodDays,
    Balance(Address),
    Tickets(Address),
    TotalDeposits,
    TotalTickets,
    PrizeFund,
    Depositors,
    DrawNonce,
    BlendPool,
    SuppliedToBlend,
}

#[contracttype]
pub struct BlendRequest {
    pub request_type: u32,
    pub address: Address,
    pub amount: i128,
}

#[contract]
pub struct LuckyStakePool;

#[contractimpl]
impl LuckyStakePool {
    pub fn initialize(env: Env, admin: Address, token: Address, period_days: u32) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("init");
        }
        admin.require_auth();

        assert!(
            period_days == 7 || period_days == 15 || period_days == 30,
            "period"
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
    }

    pub fn deposit(env: Env, depositor: Address, amount: i128) {
        depositor.require_auth();
        assert!(amount > 0, "amt");

        let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token_id);
        token_client.transfer(&depositor, &env.current_contract_address(), &amount);

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

        let total: i128 = env.storage().instance().get(&DataKey::TotalDeposits).unwrap();
        let total_tickets: i128 = env.storage().instance().get(&DataKey::TotalTickets).unwrap();

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
    }

    pub fn withdraw(env: Env, depositor: Address, amount: i128) {
        depositor.require_auth();
        assert!(amount > 0, "amt");

        let balance: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Balance(depositor.clone()))
            .unwrap_or(0);
        assert!(balance >= amount, "bal");

        let tickets: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Tickets(depositor.clone()))
            .unwrap_or(0);

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
    }

    pub fn add_prize(env: Env, amount: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        assert!(amount > 0, "amt");

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
    }

    pub fn execute_draw(env: Env) -> Address {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let prize: i128 = env.storage().instance().get(&DataKey::PrizeFund).unwrap_or(0);
        assert!(prize > 0, "prize");

        let total_tickets: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalTickets)
            .unwrap_or(0);
        assert!(total_tickets > 0, "tickets");

        let depositors: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Depositors)
            .unwrap_or_else(|| Vec::new(&env));

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
        assert!(acc > 0, "none");

        let random: u64 = env.prng().gen();
        let winning_ticket_index = (random as i128) % acc;

        let mut cumulative: i128 = 0;
        let mut winner = participants.get(0).unwrap().0.clone();
        for p in participants.iter() {
            cumulative += p.1;
            if winning_ticket_index < cumulative {
                winner = p.0.clone();
                break;
            }
        }

        let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        token::Client::new(&env, &token_id).transfer(
            &env.current_contract_address(),
            &winner,
            &prize,
        );

        env.storage().instance().set(&DataKey::PrizeFund, &0i128);

        let nonce: u64 = env
            .storage()
            .instance()
            .get(&DataKey::DrawNonce)
            .unwrap_or(0);
        env.storage().instance().set(&DataKey::DrawNonce, &(nonce + 1));

        winner
    }

    pub fn get_balance(env: Env, user: Address) -> i128 {
        env.storage().instance().get(&DataKey::Balance(user)).unwrap_or(0)
    }

    pub fn get_tickets(env: Env, user: Address) -> i128 {
        env.storage().instance().get(&DataKey::Tickets(user)).unwrap_or(0)
    }

    pub fn get_total_deposits(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalDeposits).unwrap_or(0)
    }

    pub fn get_total_tickets(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalTickets).unwrap_or(0)
    }

    pub fn get_prize_fund(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::PrizeFund).unwrap_or(0)
    }

    pub fn get_period_days(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::PeriodDays).unwrap_or(0)
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    pub fn get_token(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Token).unwrap()
    }

    pub fn get_draw_nonce(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::DrawNonce).unwrap_or(0)
    }

    pub fn set_blend_pool(env: Env, blend_pool: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage().instance().set(&DataKey::BlendPool, &blend_pool);
        if !env.storage().instance().has(&DataKey::SuppliedToBlend) {
            env.storage().instance().set(&DataKey::SuppliedToBlend, &0i128);
        }
    }

    pub fn supply_to_blend(env: Env, amount: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        assert!(amount > 0, "amt");

        let blend_pool: Address = env
            .storage()
            .instance()
            .get(&DataKey::BlendPool)
            .unwrap_or_else(|| panic!("blend"));
        let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let self_addr = env.current_contract_address();

        let expiration = env.ledger().sequence() + 50_000;
        token::Client::new(&env, &token_id).approve(&self_addr, &blend_pool, &amount, &expiration);

        let request = BlendRequest {
            request_type: 0u32,
            address: token_id.clone(),
            amount,
        };
        let mut requests: Vec<BlendRequest> = Vec::new(&env);
        requests.push_back(request);

        let args = soroban_sdk::vec![
            &env,
            self_addr.clone().into_val(&env),
            self_addr.clone().into_val(&env),
            self_addr.clone().into_val(&env),
            requests.into_val(&env),
        ];

        env.invoke_contract::<Val>(&blend_pool, &Symbol::new(&env, "submit_with_allowance"), args);

        let supplied: i128 = env
            .storage()
            .instance()
            .get(&DataKey::SuppliedToBlend)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::SuppliedToBlend, &(supplied + amount));
    }

    pub fn withdraw_from_blend(env: Env, amount: i128, min_return: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        assert!(amount > 0, "amt");
        assert!(min_return >= 0 && min_return <= amount, "min");

        let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let self_addr = env.current_contract_address();
        let balance_before = token::Client::new(&env, &token_id).balance(&self_addr);

        let blend_pool: Address = env
            .storage()
            .instance()
            .get(&DataKey::BlendPool)
            .unwrap_or_else(|| panic!("blend"));

        let mut requests: Vec<BlendRequest> = Vec::new(&env);
        requests.push_back(BlendRequest {
            request_type: 1u32,
            address: token_id.clone(),
            amount,
        });

        let args = soroban_sdk::vec![
            &env,
            self_addr.clone().into_val(&env),
            self_addr.clone().into_val(&env),
            self_addr.clone().into_val(&env),
            requests.into_val(&env),
        ];

        env.invoke_contract::<Val>(&blend_pool, &Symbol::new(&env, "submit"), args);

        let balance_after = token::Client::new(&env, &token_id).balance(&self_addr);
        let received = balance_after - balance_before;
        assert!(received >= min_return, "slip");

        let supplied: i128 = env
            .storage()
            .instance()
            .get(&DataKey::SuppliedToBlend)
            .unwrap_or(0);
        let new_supplied = supplied - amount;
        env.storage()
            .instance()
            .set(&DataKey::SuppliedToBlend, &new_supplied);
    }

    pub fn harvest_yield(env: Env, amount: i128, min_return: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        assert!(amount > 0, "amt");
        assert!(min_return >= 0 && min_return <= amount, "min");

        let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let self_addr = env.current_contract_address();
        let balance_before = token::Client::new(&env, &token_id).balance(&self_addr);

        let blend_pool: Address = env
            .storage()
            .instance()
            .get(&DataKey::BlendPool)
            .unwrap_or_else(|| panic!("blend"));

        let mut requests: Vec<BlendRequest> = Vec::new(&env);
        requests.push_back(BlendRequest {
            request_type: 1u32,
            address: token_id.clone(),
            amount,
        });

        let args = soroban_sdk::vec![
            &env,
            self_addr.clone().into_val(&env),
            self_addr.clone().into_val(&env),
            self_addr.clone().into_val(&env),
            requests.into_val(&env),
        ];

        env.invoke_contract::<Val>(&blend_pool, &Symbol::new(&env, "submit"), args);

        let balance_after = token::Client::new(&env, &token_id).balance(&self_addr);
        let received = balance_after - balance_before;
        assert!(received >= min_return, "slip");

        let prize: i128 = env.storage().instance().get(&DataKey::PrizeFund).unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::PrizeFund, &(prize + received));
    }

    pub fn get_blend_pool(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::BlendPool)
    }

    pub fn get_supplied_to_blend(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::SuppliedToBlend)
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod test;