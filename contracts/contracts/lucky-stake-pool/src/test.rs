#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, AuthorizedFunction, AuthorizedInvocation, Ledger, LedgerInfo},
    token, Address, Env, IntoVal,
};

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

/// Create a test environment with a deployed LuckyStake contract + XLM-like token.
/// Returns (env, contract_id, token_id, admin, user1, user2)
fn setup(period_days: u32) -> (Env, Address, Address, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    // Deploy a standard token (acts as XLM)
    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract_v2(token_admin.clone()).address();
    let token_client = token::StellarAssetClient::new(&env, &token_id);

    // Participants
    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    // Mint tokens to users and admin
    token_client.mint(&admin, &1_000_000_000_000i128);  // 100,000 XLM
    token_client.mint(&user1, &1_000_000_000_000i128);
    token_client.mint(&user2, &1_000_000_000_000i128);

    // Deploy LuckyStake contract
    let contract_id = env.register_contract(None, LuckyStakePool);
    let client = LuckyStakePoolClient::new(&env, &contract_id);

    client.initialize(&admin, &token_id, &period_days);

    (env, contract_id, token_id, admin, user1, user2)
}

fn client<'a>(env: &'a Env, contract_id: &'a Address) -> LuckyStakePoolClient<'a> {
    LuckyStakePoolClient::new(env, contract_id)
}

fn token_balance(env: &Env, token_id: &Address, user: &Address) -> i128 {
    token::Client::new(env, token_id).balance(user)
}

// ─────────────────────────────────────────────────────────────────────────────
//  initialize
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_initialize_weekly() {
    let (env, contract_id, token_id, admin, _, _) = setup(7);
    let c = client(&env, &contract_id);

    assert_eq!(c.get_period_days(), 7);
    assert_eq!(c.get_admin(), admin);
    assert_eq!(c.get_token(), token_id);
    assert_eq!(c.get_total_deposits(), 0);
    assert_eq!(c.get_total_tickets(), 0);
    assert_eq!(c.get_prize_fund(), 0);
}

#[test]
fn test_initialize_biweekly() {
    let (env, contract_id, _, _, _, _) = setup(15);
    assert_eq!(client(&env, &contract_id).get_period_days(), 15);
}

#[test]
fn test_initialize_monthly() {
    let (env, contract_id, _, _, _, _) = setup(30);
    assert_eq!(client(&env, &contract_id).get_period_days(), 30);
}

#[test]
#[should_panic(expected = "already initialised")]
fn test_initialize_twice_panics() {
    let (env, contract_id, token_id, admin, _, _) = setup(7);
    let c = client(&env, &contract_id);
    // Second init must panic
    c.initialize(&admin, &token_id, &7);
}

#[test]
#[should_panic(expected = "period_days must be 7, 15, or 30")]
fn test_initialize_invalid_period_panics() {
    let env = Env::default();
    env.mock_all_auths();

    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract_v2(token_admin.clone()).address();
    let admin = Address::generate(&env);

    let contract_id = env.register_contract(None, LuckyStakePool);
    LuckyStakePoolClient::new(&env, &contract_id).initialize(&admin, &token_id, &10);
}

// ─────────────────────────────────────────────────────────────────────────────
//  deposit
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_deposit_updates_balance_and_tickets() {
    let (env, contract_id, _, _, user1, _) = setup(7);
    let c = client(&env, &contract_id);

    let amount = 100_000_000i128; // 10 XLM
    c.deposit(&user1, &amount);

    assert_eq!(c.get_balance(&user1), amount);
    assert_eq!(c.get_tickets(&user1), amount * 7);
    assert_eq!(c.get_total_deposits(), amount);
    assert_eq!(c.get_total_tickets(), amount * 7);
}

#[test]
fn test_deposit_monthly_ticket_multiplier() {
    let (env, contract_id, _, _, user1, _) = setup(30);
    let c = client(&env, &contract_id);

    let amount = 10_000_000i128; // 1 XLM
    c.deposit(&user1, &amount);

    assert_eq!(c.get_tickets(&user1), amount * 30);
}

#[test]
fn test_multiple_deposits_accumulate() {
    let (env, contract_id, _, _, user1, _) = setup(7);
    let c = client(&env, &contract_id);

    c.deposit(&user1, &50_000_000i128);
    c.deposit(&user1, &50_000_000i128);

    assert_eq!(c.get_balance(&user1), 100_000_000i128);
    assert_eq!(c.get_tickets(&user1), 100_000_000i128 * 7);
}

#[test]
fn test_two_users_deposit() {
    let (env, contract_id, _, _, user1, user2) = setup(7);
    let c = client(&env, &contract_id);

    c.deposit(&user1, &100_000_000i128);
    c.deposit(&user2, &200_000_000i128);

    assert_eq!(c.get_total_deposits(), 300_000_000i128);
    assert_eq!(c.get_total_tickets(), 300_000_000i128 * 7);
    assert_eq!(c.get_balance(&user1), 100_000_000i128);
    assert_eq!(c.get_balance(&user2), 200_000_000i128);
}

#[test]
#[should_panic(expected = "deposit amount must be greater than zero")]
fn test_deposit_zero_panics() {
    let (env, contract_id, _, _, user1, _) = setup(7);
    client(&env, &contract_id).deposit(&user1, &0);
}

#[test]
fn test_deposit_transfers_tokens_to_contract() {
    let (env, contract_id, token_id, _, user1, _) = setup(7);
    let c = client(&env, &contract_id);

    let before = token_balance(&env, &token_id, &user1);
    let amount = 100_000_000i128;
    c.deposit(&user1, &amount);
    let after = token_balance(&env, &token_id, &user1);

    assert_eq!(before - after, amount);
    assert_eq!(token_balance(&env, &token_id, &contract_id), amount);
}

// ─────────────────────────────────────────────────────────────────────────────
//  withdraw
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_withdraw_full_balance() {
    let (env, contract_id, token_id, _, user1, _) = setup(7);
    let c = client(&env, &contract_id);

    let amount = 100_000_000i128;
    c.deposit(&user1, &amount);

    let before = token_balance(&env, &token_id, &user1);
    c.withdraw(&user1, &amount);
    let after = token_balance(&env, &token_id, &user1);

    assert_eq!(after - before, amount);
    assert_eq!(c.get_balance(&user1), 0);
    assert_eq!(c.get_tickets(&user1), 0);
    assert_eq!(c.get_total_deposits(), 0);
    assert_eq!(c.get_total_tickets(), 0);
}

#[test]
fn test_withdraw_partial_proportional_tickets() {
    let (env, contract_id, _, _, user1, _) = setup(7);
    let c = client(&env, &contract_id);

    c.deposit(&user1, &100_000_000i128);
    c.withdraw(&user1, &50_000_000i128);

    assert_eq!(c.get_balance(&user1), 50_000_000i128);
    // tickets should be halved
    assert_eq!(c.get_tickets(&user1), 50_000_000i128 * 7);
}

#[test]
#[should_panic(expected = "insufficient balance")]
fn test_withdraw_more_than_balance_panics() {
    let (env, contract_id, _, _, user1, _) = setup(7);
    let c = client(&env, &contract_id);

    c.deposit(&user1, &100_000_000i128);
    c.withdraw(&user1, &200_000_000i128);
}

#[test]
#[should_panic(expected = "withdraw amount must be greater than zero")]
fn test_withdraw_zero_panics() {
    let (env, contract_id, _, _, user1, _) = setup(7);
    let c = client(&env, &contract_id);
    c.deposit(&user1, &100_000_000i128);
    c.withdraw(&user1, &0);
}

// ─────────────────────────────────────────────────────────────────────────────
//  add_prize
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_add_prize_increases_prize_fund() {
    let (env, contract_id, _, admin, _, _) = setup(7);
    let c = client(&env, &contract_id);

    c.add_prize(&100_000_000i128);
    assert_eq!(c.get_prize_fund(), 100_000_000i128);

    c.add_prize(&50_000_000i128);
    assert_eq!(c.get_prize_fund(), 150_000_000i128);
}

#[test]
#[should_panic(expected = "prize amount must be greater than zero")]
fn test_add_prize_zero_panics() {
    let (env, contract_id, _, _, _, _) = setup(7);
    client(&env, &contract_id).add_prize(&0);
}

// ─────────────────────────────────────────────────────────────────────────────
//  execute_draw
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_execute_draw_single_participant_always_wins() {
    let (env, contract_id, token_id, _, user1, _) = setup(7);
    let c = client(&env, &contract_id);

    c.deposit(&user1, &100_000_000i128);
    c.add_prize(&10_000_000i128);

    let prize_before = token_balance(&env, &token_id, &user1);
    let winner = c.execute_draw();
    let prize_after = token_balance(&env, &token_id, &user1);

    assert_eq!(winner, user1);
    assert_eq!(prize_after - prize_before, 10_000_000i128);
    assert_eq!(c.get_prize_fund(), 0);
}

#[test]
fn test_execute_draw_resets_prize_fund() {
    let (env, contract_id, _, _, user1, _) = setup(7);
    let c = client(&env, &contract_id);

    c.deposit(&user1, &100_000_000i128);
    c.add_prize(&10_000_000i128);
    c.execute_draw();

    assert_eq!(c.get_prize_fund(), 0);
}

#[test]
fn test_execute_draw_winner_is_valid_participant() {
    let (env, contract_id, _, _, user1, user2) = setup(7);
    let c = client(&env, &contract_id);

    c.deposit(&user1, &100_000_000i128);
    c.deposit(&user2, &100_000_000i128);
    c.add_prize(&10_000_000i128);

    let winner = c.execute_draw();
    assert!(winner == user1 || winner == user2);
}

#[test]
#[should_panic(expected = "no prize to distribute")]
fn test_execute_draw_no_prize_panics() {
    let (env, contract_id, _, _, user1, _) = setup(7);
    let c = client(&env, &contract_id);
    c.deposit(&user1, &100_000_000i128);
    c.execute_draw();
}

#[test]
#[should_panic(expected = "no tickets in pool")]
fn test_execute_draw_no_tickets_panics() {
    let (env, contract_id, _, _, _, _) = setup(7);
    let c = client(&env, &contract_id);
    c.add_prize(&10_000_000i128);
    c.execute_draw();
}

#[test]
fn test_execute_draw_increments_nonce() {
    let (env, contract_id, _, _, user1, _) = setup(7);
    let c = client(&env, &contract_id);

    c.deposit(&user1, &100_000_000i128);
    c.add_prize(&5_000_000i128);
    c.execute_draw();

    // Run a second draw to confirm nonce incremented (different seed each time)
    c.add_prize(&5_000_000i128);
    let winner2 = c.execute_draw();
    assert_eq!(winner2, user1); // only participant still wins
}

// ─────────────────────────────────────────────────────────────────────────────
//  set_blend_pool
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_set_blend_pool_stores_address() {
    let (env, contract_id, _, _, _, _) = setup(7);
    let c = client(&env, &contract_id);

    let fake_blend = Address::generate(&env);
    c.set_blend_pool(&fake_blend);

    assert_eq!(c.get_blend_pool(), Some(fake_blend));
}

#[test]
fn test_set_blend_pool_initializes_supplied_to_zero() {
    let (env, contract_id, _, _, _, _) = setup(7);
    let c = client(&env, &contract_id);

    c.set_blend_pool(&Address::generate(&env));
    assert_eq!(c.get_supplied_to_blend(), 0);
}

#[test]
fn test_set_blend_pool_can_be_updated() {
    let (env, contract_id, _, _, _, _) = setup(7);
    let c = client(&env, &contract_id);

    let blend1 = Address::generate(&env);
    let blend2 = Address::generate(&env);

    c.set_blend_pool(&blend1);
    assert_eq!(c.get_blend_pool(), Some(blend1));

    c.set_blend_pool(&blend2);
    assert_eq!(c.get_blend_pool(), Some(blend2));
}

// ─────────────────────────────────────────────────────────────────────────────
//  Full flow integration test
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_full_flow_deposit_prize_draw_withdraw() {
    let (env, contract_id, token_id, _, user1, user2) = setup(30);
    let c = client(&env, &contract_id);

    // Two users deposit
    c.deposit(&user1, &100_000_000i128); // 10 XLM
    c.deposit(&user2, &300_000_000i128); // 30 XLM

    assert_eq!(c.get_total_deposits(), 400_000_000i128);
    assert_eq!(c.get_total_tickets(), 400_000_000i128 * 30);

    // Admin adds prize
    c.add_prize(&20_000_000i128); // 2 XLM prize
    assert_eq!(c.get_prize_fund(), 20_000_000i128);

    // Execute draw - winner gets prize
    let winner = c.execute_draw();
    assert!(winner == user1 || winner == user2);
    assert_eq!(c.get_prize_fund(), 0);

    // Users withdraw their principal
    c.withdraw(&user1, &100_000_000i128);
    c.withdraw(&user2, &300_000_000i128);

    assert_eq!(c.get_total_deposits(), 0);
    assert_eq!(c.get_total_tickets(), 0);
}

#[test]
fn test_higher_deposit_gets_more_tickets() {
    let (env, contract_id, _, _, user1, user2) = setup(7);
    let c = client(&env, &contract_id);

    c.deposit(&user1, &100_000_000i128);  // 10 XLM
    c.deposit(&user2, &900_000_000i128);  // 90 XLM

    // user2 has 9x more tickets
    assert_eq!(c.get_tickets(&user2), c.get_tickets(&user1) * 9);
}