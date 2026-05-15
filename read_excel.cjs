const XLSX = require('xlsx');
const workbook = XLSX.readFile('src/Casos/EDNALDO PEREIRA DA SILVA - 11112.xls');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
console.log("Data sample:");
for(let i=0; i<15; i++) {
  if(data[i]) console.log(`Row ${i}:`, data[i].join(' | '));
}
