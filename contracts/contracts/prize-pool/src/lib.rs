#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, log, token, Address, Env, Vec};

#[contracttype]
pub enum DataKey {
    Admin,
    Token,
    PrizeFund,
    Balance(Address),
    TotalDeposits,
    Depositors,
}

#[contract]
pub struct PrizePoolContract;

#[contractimpl]
impl PrizePoolContract {
    pub fn initialize(env: Env, admin: Address, token: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialised");
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::PrizeFund, &0i128);
        env.storage()
            .instance()
            .set(&DataKey::TotalDeposits, &0i128);
        let empty: Vec<Address> = Vec::new(&env);
        env.storage().instance().set(&DataKey::Depositors, &empty);
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

        log!(
            &env,
            "Prize fund topped up: {} | total: {}",
            amount,
            current + amount
        );
    }

    /// Distributes prize fund proportionally to all depositors.
    pub fn distribute(env: Env) {
        let prize: i128 = env.storage().instance().get(&DataKey::PrizeFund).unwrap();
        assert!(prize > 0, "no prize to distribute");

        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalDeposits)
            .unwrap();
        assert!(total > 0, "no deposits");

        let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token_id);

        let depositors: Vec<Address> = env.storage().instance().get(&DataKey::Depositors).unwrap();

        for depositor in depositors.iter() {
            let balance: i128 = env
                .storage()
                .instance()
                .get(&DataKey::Balance(depositor.clone()))
                .unwrap_or(0);

            if balance == 0 {
                continue;
            }

            let share = (prize * balance) / total;
            if share > 0 {
                token_client.transfer(&env.current_contract_address(), &depositor, &share);
                log!(&env, "{} received prize share: {}", depositor, share);
            }
        }

        env.storage().instance().set(&DataKey::PrizeFund, &0i128);
    }

    pub fn get_prize_fund(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::PrizeFund)
            .unwrap_or(0)
    }

    pub fn get_user_share_bp(env: Env, user: Address) -> u64 {
        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalDeposits)
            .unwrap_or(0);
        if total == 0 {
            return 0;
        }
        let balance: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Balance(user))
            .unwrap_or(0);
        ((balance * 10_000) / total) as u64
    }
}
