const fs = require('fs');
let code = fs.readFileSync('src/app/admin-panel/page.js', 'utf8');

code = code.replace(/it\.status === \"Pending\"/g, 'it.status?.toLowerCase() === \"pending\"');
code = code.replace(/i\.status === \"Pending\"/g, 'i.status?.toLowerCase() === \"pending\"');
code = code.replace(/item\.status === \"Pending\"/g, 'item.status?.toLowerCase() === \"pending\"');
code = code.replace(/item\.status !== \"Pending\"/g, 'item.status?.toLowerCase() !== \"pending\"');

fs.writeFileSync('src/app/admin-panel/page.js', code);
console.log('Done!');
