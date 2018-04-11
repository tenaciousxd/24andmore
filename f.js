function getLocalRoot(){
  return __filename.slice(0,__filename.indexOf('\\public\\')+8);
}

function getRequestData(){
  let fs=require('fs'); // should probably use a global to store the data instead
  return JSON.parse(fs.readFileSync(getLocalRoot()+'data/requestData.json').toString());
}

function createHeritageCalcUrl(enabled,code,kitN,delta='',eth=''){
  let requestData=getRequestData();
  let reqUrl=requestData.tests[0].parentUrl;
  if (delta.length==0){delta=requestData.tests[0].currentDelta;}
  reqUrl+='?enabled='+enabled+'&delta='+delta+'&kit_num='+kitN+'&code='+code+'&ethnicity='+eth+'&xsubmit=Continue';
  return reqUrl;
}

function createHeritageBCCalcUrl(enabled,code,kitN,delta=''){
  let requestData=getRequestData();
  let reqUrl=requestData.tests[1].parentUrl;
  if (delta.length==0){delta=requestData.tests[1].currentDelta;}
  reqUrl+='?enabled='+enabled+'&delta='+delta+'&kit_num='+kitN+'&code='+code+'&xsubmit=Continue';
  return reqUrl;
}

function reqOpt(url){
  return {
    url:url,
    headers:{
      'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_3) AppleWebKit/604.5.6 (KHTML, like Gecko) Version/11.0.3 Safari/604.5.6'
    }
  }
}

function getAllHeritageHtml(){
  let r=require('request');
  let fs=require('fs');
  let requestData=getRequestData();
  for (let j in requestData.projects){
    for (let k in requestData.projects[j].calculators){
      r(reqOpt(createHeritageCalcUrl(requestData.projects[j].enabled,requestData.projects[j].calculators[k],'SZ9150895')),function(e,r,b){
        fs.writeFile(getLocalRoot()+'heritageHtml/'+requestData.projects[j].enabled+'-'+requestData.projects[j].calculators[k]+'.html',b,'utf8',function(){})
      })
    }
  }
}

function getProjectList(){
  let fs=require('fs');
  let requestData=JSON.parse(fs.readFileSync(getLocalRoot()+'data/requestData.json').toString());
  let projects={};
  for (let project in requestData.projects){
    projects[project]=JSON.stringify(requestData['projects'][project]);
  }
  return projects;
}

function parseHeritageHtml(body){
  let ch=require('cheerio');
  let $=ch.load(body);
  let results={};
  results.populations=[];
  results.percentages=[];
  let i=0;
 $('tr').each(function(){
    if(i==1){
      if ($(this).find('td').eq(1).attr('align')=='right') {
        let cd = $(this).find('td');
        results.populations.push(cd.eq(0).text());
        if (cd.eq(1).text().indexOf('-') == -1) {
          results.percentages.push(parseFloat(cd.eq(1).text()));
        }
        else {
          results.percentages.push(0);
        }
      }
    }
    if (i==0){
      if ($(this).find('td').eq(0).attr('bgcolor')){
        if ($(this).find('td').eq(0).attr('bgcolor').toLowerCase()=='#ffffff'&&$(this).text().toLowerCase().indexOf('population')!=-1){
          i=1;
        }
      }
    }
  });
  return results;
}

function calculateHeritage([enabled,code,kitN,delta='',eth=''],next){
  let r=require('request');
  r(reqOpt(createHeritageCalcUrl(enabled,code,kitN,delta,eth)),function(e,r,b){
    next(parseHeritageHtml(b));
  })
}

function getSpreadsheetData(path){
  let ch=require('cheerio');
  let fs=require('fs');
  let ssb=fs.readFileSync(path).toString();
  let $=ch.load(ssb);
  let ssd={};
  let testNameBegin=ssb.indexOf('Population Spreadsheet for');
  ssd.calculator=ssb.slice(ssb.indexOf('for',testNameBegin)+4,ssb.indexOf('.',testNameBegin));
  ssd.labels=[];
  ssd.populations=[];
  $('tr').eq(0).find('td').each(function(){
    ssd.labels.push($(this).text());
  })
  $('tr').each(function(cu){
    let tvals=[];
    if (cu>0){
      $(this).find('td').each(function(c){
        if (c==0) {
          tvals.push($(this).text());
        }
        else{
          tvals.push(parseFloat($(this).text()));
        }
      })
      ssd.populations.push(tvals);
    }
  });
  return ssd;

}



module.exports={
  reqOpt:reqOpt,
  getLocalRoot:getLocalRoot,
  getProjectList:getProjectList,
  getSpreadsheetData:getSpreadsheetData,
  getAllHeritageHtml:getAllHeritageHtml,
  parseHeritageHtml:parseHeritageHtml,
  calculateHeritage:calculateHeritage
}