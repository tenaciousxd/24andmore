let f=require('../f');
let fs=require('fs');

let spreadsheetDir='';

let spreadsheets=fs.readdirSync(spreadsheetDir);

let spreadsheetData={};

for (let i=0;i<spreadsheets.length;i++){
  let currSSD=f.getSpreadsheetData(spreadsheetDir+'/'+spreadsheets[i]);
  spreadsheetData[currSSD.calculator]=currSSD;
}

fs.writeFileSync(f.getLocalRoot()+'data/spreadsheetData.json',JSON.stringify(spreadsheetData),'utf8');

console.log(JSON.stringify(spreadsheetData));