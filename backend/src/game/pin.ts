// Game PIN generation. A 6-digit numeric code players type to join. `rand` is injectable
// so tests are deterministic; production uses Math.random (collisions are re-rolled by the
// engine against the active-PIN unique index).
export function generatePin(rand: () => number = Math.random): string {
  let pin = "";
  for (let i = 0; i < 6; i++) pin += Math.floor(rand() * 10).toString();
  return pin;
}

export function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}
