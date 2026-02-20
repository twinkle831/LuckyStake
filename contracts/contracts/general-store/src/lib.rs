#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, log, Address, Env, String};

// ─────────────────────────────────────────────
//  Storage Key
// ─────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    Store(String), // any string key → any i128 value
}

// ─────────────────────────────────────────────
//  Contract
// ─────────────────────────────────────────────

#[contract]
pub struct GeneralStore;

#[contractimpl]
impl GeneralStore {
    /// Store any value under any key.
    pub fn set(env: Env, caller: Address, key: String, value: i128) {
        caller.require_auth();

        env.storage()
            .instance()
            .set(&DataKey::Store(key.clone()), &value);

        log!(&env, "Set: key={} value={}", key, value);
    }

    /// Retrieve a value by key. Returns 0 if key doesn't exist.
    pub fn get(env: Env, key: String) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::Store(key))
            .unwrap_or(0)
    }

    /// Check if a key exists.
    pub fn has(env: Env, key: String) -> bool {
        env.storage().instance().has(&DataKey::Store(key))
    }

    /// Delete a key.
    pub fn remove(env: Env, caller: Address, key: String) {
        caller.require_auth();

        env.storage()
            .instance()
            .remove(&DataKey::Store(key.clone()));

        log!(&env, "Removed: key={}", key);
    }

    /// Update a value — same as set, but only works if key already exists.
    pub fn update(env: Env, caller: Address, key: String, value: i128) {
        caller.require_auth();

        assert!(
            env.storage().instance().has(&DataKey::Store(key.clone())),
            "key does not exist, use set() instead"
        );

        env.storage()
            .instance()
            .set(&DataKey::Store(key.clone()), &value);

        log!(&env, "Updated: key={} value={}", key, value);
    }
}
