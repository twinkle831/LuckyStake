#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, log, token, Address, Env};

// ─────────────────────────────────────────────
//  Storage Keys
// ─────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    Admin,            // contract owner
    Token,            // accepted token (XLM / USDC)
    Balance(Address), // how much each user has deposited
    TotalDeposits,    // sum of all deposits in the contract
}

// ─────────────────────────────────────────────
//  Contract
// ─────────────────────────────────────────────

#[contract]
pub struct LuckyStake;

#[contractimpl]
impl LuckyStake {
    /// Called once after deployment.
    /// Sets the admin and the token users will deposit.
    pub fn initialize(env: Env, admin: Address, token: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialised");
        }

        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage()
            .instance()
            .set(&DataKey::TotalDeposits, &0i128);
    }

    /// User deposits `amount` tokens into the contract.
    /// Their individual balance is tracked and added to the total.
    pub fn deposit(env: Env, depositor: Address, amount: i128) {
        // 1. Verify the depositor signed this transaction.
        depositor.require_auth();

        // 2. Amount must be positive.
        assert!(amount > 0, "deposit amount must be greater than zero");

        // 3. Pull tokens from the user's wallet into this contract.
        let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token_id);
        token_client.transfer(
            &depositor,                      // from: user
            &env.current_contract_address(), // to:   contract vault
            &amount,
        );

        // 4. Update the user's personal balance.
        let current_balance: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Balance(depositor.clone()))
            .unwrap_or(0);

        let new_balance = current_balance + amount;
        env.storage()
            .instance()
            .set(&DataKey::Balance(depositor.clone()), &new_balance);

        // 5. Update the contract-wide total.
        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalDeposits)
            .unwrap();
        env.storage()
            .instance()
            .set(&DataKey::TotalDeposits, &(total + amount));

        log!(
            &env,
            "Deposit: {} deposited {} | their total: {} | contract total: {}",
            depositor,
            amount,
            new_balance,
            total + amount
        );
    }

    // ──────────────────────────────────────────
    //  Read helpers
    // ──────────────────────────────────────────

    /// Returns how much a specific user has deposited.
    pub fn get_balance(env: Env, user: Address) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::Balance(user))
            .unwrap_or(0)
    }

    /// Returns the total amount deposited across all users.
    pub fn get_total_deposits(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalDeposits)
            .unwrap_or(0)
    }
}
mod test;
