import fs from 'fs';
const file = fs.readFileSync('src/ui.js', 'utf8');
const idMatch = file.match(/const id = \(baseId\) => isEditMode \? `edit_\$\{baseId\}` : `inline_\$\{baseId\}`;/);
if (idMatch) console.log("id() adds 'inline_' prefix.");
else {
    const idMatch2 = file.match(/const id = \(baseId\) => .*/);
    console.log("id() defined as: ", idMatch2[0]);
}
