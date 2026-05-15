const XLSX = require('xlsx');
const workbook = XLSX.readFile('src/Casos/ROMERO FRANCISCO DA SILVA - 12114.xls');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
console.log("Headers:", data[0]);
console.log("Row 1:", data[1]);
console.log("Row 2:", data[2]);
console.log("Row 3:", data[3]);
