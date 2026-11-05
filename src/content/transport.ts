/**
 * Ways to get around that the player can own: a bike (bought once, sold
 * second-hand) and a small car on a weekly lease. Both are on offer at Cog &
 * Kerb on the high street. Money is in pence.
 */

export const BIKE = {
  name: 'City bike',
  price: 24000,
  /** The share of the price it sells for second-hand. */
  resale: 0.4,
  description:
    'Ride to work in 20 minutes for nothing, and get round the neighbourhood twice as fast.',
}

export const CAR = {
  name: 'Small car (weekly lease)',
  /** Paid when the lease starts; it covers the first week. */
  deposit: 25000,
  /** Taken every Monday with the rent, until the lease ends. */
  weekly: 6000,
  description:
    'Drive to work in 15 minutes, whatever the weather. Fuel and parking are £4.50 a trip.',
}
