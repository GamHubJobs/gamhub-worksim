/**
 * The people of the neighbourhood's places: who they are, so each can be
 * talked to (see game/encounters.ts). Staff serve and advise; customers and
 * members are people with their own day, who may or may not want to chat.
 * Original characters.
 */
import type { Who } from '../game/encounters'

const who = (
  id: string,
  name: string,
  role: string,
  kind: Who['kind'],
  personality: Who['personality'],
): Who => ({ id, name, role, kind, personality })

export const TOWN_PEOPLE = {
  // The Daily Grind café
  barista: who('cafe:barista', 'Maya Lindqvist', 'Barista', 'barista', 'warm'),
  cafeReader: who('cafe:reader', 'Jonah Fields', 'Café regular', 'diner', 'quiet'),
  cafeFriend: who('cafe:friend', 'Priti Shah', 'Café regular', 'diner', 'chatty'),
  cafeLaptop: who(
    'cafe:laptop',
    'Felix Osei',
    'Working from the café',
    'diner',
    'focused',
  ),
  // Daily Basket supermarket
  cashier: who('shop:cashier', 'Ana Silva', 'Cashier', 'cashier', 'warm'),
  shopper: who('shop:shopper', 'Ian Moss', 'Shopper', 'shopper', 'dry'),
  shopStaff: who('shop:staff', 'Bea Kaur', 'Shop assistant', 'shop-staff', 'focused'),
  // The gym
  gymDesk: who('gym:desk', 'Lena Novak', 'Front desk', 'gym-staff', 'warm'),
  trainer: who('gym:trainer', 'Ruth Adebayo', 'Personal trainer', 'trainer', 'focused'),
  runner1: who('gym:runner1', 'Chris Hale', 'Gym member', 'gym-member', 'chatty'),
  runner2: who('gym:runner2', 'Mei Tanaka', 'Gym member', 'gym-member', 'quiet'),
  rider: who('gym:rider', 'Dev Patel', 'Gym member', 'gym-member', 'dry'),
  // The park
  walter: who('park:walter', 'Walter Brooks', 'Neighbour', 'neighbour', 'chatty'),
  // Cog & Kerb
  sales: who('garage:sales', 'Kofi Asante', 'Sales', 'salesperson', 'chatty'),
  mechanic: who('garage:mechanic', 'Sam Doyle', 'Mechanic', 'mechanic', 'dry'),
  // At the door at home
  courier: who('home:courier', 'Jordan Reece', 'Delivery courier', 'courier', 'warm'),
} satisfies Record<string, Who>

const LOCALS: Array<[string, Who['personality']]> = [
  ['Hannah Moreau', 'warm'],
  ['Tariq Aziz', 'chatty'],
  ['Elsie Grant', 'dry'],
  ['Marco Bianchi', 'warm'],
  ['Yusuf Kaya', 'quiet'],
  ['Ruby Clarke', 'chatty'],
  ['Pete Lowe', 'dry'],
  ['Ines Duarte', 'focused'],
  ['Gwen Harper', 'warm'],
  ['Oskar Lind', 'quiet'],
  ['Nadia Rahman', 'chatty'],
  ['Felipe Cruz', 'dry'],
]

/** Someone walking down the street, or through the park: a local. */
export function local(where: 'street' | 'park', i: number): Who {
  const [name, personality] = LOCALS[(i + (where === 'park' ? 5 : 0)) % LOCALS.length]
  return who(`${where}:local${i}`, name, 'Local', 'neighbour', personality)
}
