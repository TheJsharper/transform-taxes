import {TaxTransformer} from './src/transform.js';
//const transform = require("./src/transform.js");
(() => {
  // console.log("===>", "Hello World", transform);
   //const transform = new transform.TaxTransformer();
   const transform = new TaxTransformer();
   transform.transformTaxJson();
  //console.log("===>", transform.firstName, transform.lastName);
  })();