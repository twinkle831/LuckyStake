#![cfg(test)]

extern crate std;

use soroban_sdk::{testutils::Address as _, Address, Env};

use crate::{LuckyStakePool, LuckyStakePoolClient};

fn setup(env: &Env, period_days: u32) -> (LuckyStakePoolClient, Address, Address, Address) {
    let admin = Address::generate(env);
    let user1 = Address::generate(env);
    let token = env.register_stellar_asset_contract(admin.clone());

    let contract_id = env.register_contract(None, LuckyStakePool);
    let client = LuckyStakePoolClient::new(env, &contract_id);

    env.mock_all_auths();
    client.initialize(&admin, &token, &period_days);

    (client, contract_id, token, user1)
}

#[test]
fn test_initialize_weekly() {
    let env = Env::default();
    let (client, _contract, _token, _user) = setup(&env, 7);

    assert_eq!(client.get_period_days(), 7);
    assert_eq!(client.get_total_deposits(), 0);
    assert_eq!(client.get_total_tickets(), 0);
    assert_eq!(client.get_prize_fund(), 0);
}

#[test]
fn test_initialize_biweekly() {
    let env = Env::default();
    let (client, _contract, _token, _user) = setup(&env, 15);

    assert_eq!(client.get_period_days(), 15);
}

#[test]
fn test_initialize_monthly() {
    let env = Env::default();
    let (client, _contract, _token, _user) = setup(&env, 30);

    assert_eq!(client.get_period_days(), 30);
}

#[test]
#[should_panic(expected = "period_days must be 7, 15, or 30")]
fn test_initialize_invalid_period() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let token = env.register_stellar_asset_contract(admin.clone());
    let contract_id = env.register_contract(None, LuckyStakePool);
    let client = LuckyStakePoolClient::new(&env, &contract_id);
    env.mock_all_auths();
    client.initialize(&admin, &token, &5); // invalid
}

#[test]
fn test_deposit_and_tickets_weekly() {
    let env = Env::default();
    let (client, _contract, token, user) = setup(&env, 7);

    // Mint tokens to user
    let token_admin = soroban_sdk::token::StellarAssetClient::new(&env, &token);
    token_admin.mint(&user, &1_000_000); // 1M units

    client.deposit(&user, &1_000);

    assert_eq!(client.get_balance(&user), 1_000);
    assert_eq!(client.get_tickets(&user), 7_000); // 1000 * 7 days
    assert_eq!(client.get_total_deposits(), 1_000);
    assert_eq!(client.get_total_tickets(), 7_000);
}

#[test]
fn test_deposit_and_withdraw() {
    let env = Env::default();
    let (client, _contract, token, user) = setup(&env, 7);

    let token_admin = soroban_sdk::token::StellarAssetClient::new(&env, &token);
    token_admin.mint(&user, &1_000_000);

    client.deposit(&user, &1_000);
    assert_eq!(client.get_balance(&user), 1_000);

    client.withdraw(&user, &500);
    assert_eq!(client.get_balance(&user), 500);
    assert_eq!(client.get_total_deposits(), 500);
}

#[test]
fn test_add_prize_and_draw() {
    let env = Env::default();
    let (client, _contract, token, user) = setup(&env, 7);

    let token_admin = soroban_sdk::token::StellarAssetClient::new(&env, &token);
    let admin = client.get_admin();
    token_admin.mint(&admin, &10_000);
    token_admin.mint(&user, &1_000);

    client.deposit(&user, &500);
    client.add_prize(&100);

    assert_eq!(client.get_prize_fund(), 100);

    let winner = client.execute_draw();
    assert_eq!(winner, user);
    assert_eq!(client.get_prize_fund(), 0);
}
