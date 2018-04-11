let f=require('./f');
let r=require('request');
let ch=require('cheerio');
let fs=require('fs');

let shareReportUrl='https://you.23andme.com/published/reports/f7f1d140c18849dc/?share_id=eaf493aba2814fd7';

let ancestry={};
let randomizedAncestry={};


// Returns cryptographically secure pseudo-random number
// Parameters: b=lower bound, e=upper bound, c=inclusive (0=not, 1=inclusive)
function rng(b=0,e=1,c=1){
  let rng=require('random-js');
  let nrng=new rng(rng.engines.browserCrypto);
  return nrng.real(b,e,c);
}


// Selects item from object of item:probability pairs using rng() and supplied probabilities
// Parameter: {'x':.2,5:.4,'1-4':.3,'@':.1} // probabilities must sum to 1, object can contain items of any type
function disjointProbability(i){
  let rn=rng();
  let iSum=0;
  for (let j in i){
    if (rn>iSum&&rn<=iSum+i[j]){
      return j;
    }
    else{
      iSum+=i[j];
    }
  }
}

// Models simple exponential probability. Selects a number in specified range based on specified probability range and exponent.
// Parameters: iV = initial return value (min), fV = final return value (max), iP = initial probability (min), fP = final probability (max), x = exponent, c = continuity parameter (function returns ints if 0, floats if 1), i = return value endpoints included (0=not,1=included)
// NOTE: both value and probability must increase from initial to final -- to simulate a different relationship, subtract the result from the sum of the min and max return values


function exponentialProbability(iV=0,fV=1,iP=0,fP=1,x=2,c=1,i=0){
  let rn=rng(0,1,i);
  let srn=rn*(fP-iP)/(x+1);
  let cpr=Math.pow((x+1)*srn,1/(x+1));
  let s=0;
  if (c==1){
    s=iV+(fV-iV)*cpr;
  }
  else{
    if (i==0){
      s=Math.floor(iV+1+(fV-iV-1)*cpr);
    }
    else{
      s=Math.floor(iV+(fV-iV+1)*cpr);
    }
  }
  return s;
}

// Models an exponential function, returning a value within the specified range as a function of the supplied min and max output values, exponent, and inputs
// Parameters: iV = initial output value (min), fV = final output value (max), iS = minimum input, iE = maximum input, iA = current input
// NOTE: this function only supports functions where d/dx > 0, change iA to iE-input or subtract return value from iV+fV if d/dx < 0

function exponentialScale(iV=0,fV=0,iS=0,iE=0,x=2,iA=0){
  return iV+(fV-iV)*Math.pow((iA-iS)/(iE-iS),x);
}

// Retrieves and parses 23andMe report page HTML, saves ancestries and corresponding percentages to ancestry object
// Parameter: Callback function, called once data has been stored in the ancestry object

function getReport(next){
  r(f.reqOpt(shareReportUrl),function(e,r,b){
    let $=ch.load(b);
    $('.regions-list').eq(0).children('.region-item').each(function(){
      let rH=$(this).find('h5');
      let region=rH.eq(0).text();
      let percentage=parseFloat(rH.eq(1).text());
      if (percentage>0){
        ancestry[region]={};
        ancestry[region]['percentage']=percentage;
        ancestry[region]['subregions']={};
        $(this).next('.subregions-list').find('.subregion-label').each(function(x){
          let srH=$(this).children('h5');
          let subregion=srH.eq(0).text();
          ancestry[region]['subregions'][subregion]=parseFloat(srH.eq(1).text());
        })
      }
    });
    next();
  })
}

// Randomizes region and subregion ancestry percentages, keeping new percentages within specific thresholds and storing them within randomizedAncestries. This object will then be used to
// generate an updated HTML document.

function randomize(){
  let remaining=100; // remaining percent of ancestry to be assigned
  let thresholds={ // modification thresholds
    regions:{
      modifyT:1, // region percentage is modified only if it amounts to at least 1% of computed overall ancestry
      maxPU:function(iA){return exponentialScale(12,18,1,100,1,100-iA);}, // tentative max upward variation by percent, 18 at 1, 12 at 100 (no upward variation possible at 100 but modification range is 1-100 & remaining var ensures no overflow)
      maxPD:function(iA){return exponentialScale(12,18,1,100,1,iA);} // tentative max downward variation by percent, 12 at 1, 18 at 100 (subregion thresholds do not allow downward variation at 1 but modification range is 1-100)
    },
    subregions:{
      modifyT:.6, // subregion percentage is modified only if it amounts to at least .6% of computed overall ancestry
      ranges:[
        {
          s:.6, // lower percentage bound (inclusive)
          e:1, // upper percentage bound (inclusive),
          cont:0, // whether distribution is continuous or split by 0 (0=split,1=continuous)
          same:1, // whether the percentage can remain the same (0=no,1=yes)
          maxU:.1, // max upward variation
          maxD:0, // max downward variation
          pU:.7, // probability of there being upward variation, present only if cont==0
          pD:0, // probability of there being downward variation, present only if cont==0
          u:.1 // change if upward variation
        },
        {
          s:1.1,
          e:2.5,
          maxU:.3
        }
      ]
    }
  }

  // creates ancestry structure sorted in ascending order by region and subregion percentage
  let sortedAncestry=[];
  for (let i in ancestry){
    let region={};
    region.n=i;
    region.p=ancestry[i].percentage;
    region.s=[];
    for (let j in ancestry[i].subregions){
      region.s.push({'s':j,'p':ancestry[i].subregions[j]});
    }
    region.s.sort(function(a,b){return a.p-b.p});
    sortedAncestry.push(region);
  }
  sortedAncestry.sort(function(a,b){return a.p-b.p});

  // randomization
  console.log(JSON.stringify(sortedAncestry));
}

/*getReport(function(){
  console.log(ancestry);
  randomize();
})*/

