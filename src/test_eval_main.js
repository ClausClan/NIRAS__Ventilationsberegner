import fs from 'fs';
const file = fs.readFileSync('main.js', 'utf8');
const match = file.match(/function traverseAndCalculateThermodynamics\([\s\S]*?return tempLeavingTowardsAHU;/);
console.log(match ? "Found traversal" : "Not found");
