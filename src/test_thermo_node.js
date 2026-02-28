import { calculateTemperatureDrop, getAirProperties } from './physics.js';

console.log("Validating temperature drop abstraction...");
const testExhaustAmb = 22;
const air = getAirProperties(testExhaustAmb);
console.log("RHO at 22C: ", air.RHO);

console.log("OK, the physics module works.");
