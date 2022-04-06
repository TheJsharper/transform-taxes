const fs = require('fs');
const path = require('path');

let rawdata = fs.readFileSync(path.resolve(__dirname, 'tax-raw.json'));
let taxes = JSON.parse(rawdata);

const t = taxes.rows.map((values) => {
	const result = values.cols.reduce((prev, cur) => {
		if (cur.nodeValue.includes("%")) {
			if (!prev.taxes) {
				prev.taxes = [cur.nodeValue];
			} else {
				prev.taxes.push(cur.nodeValue);
			}
		}
		if (cur.nodeValue != "") {
			if (cur.nodeValue.startsWith("&nbsp;")) {
				if (!prev.country) {
					prev.country = cur.nodeValue.substring(6, cur.nodeValue.length);
				}
			} else {
				prev.name = cur.nodeValue;
			}
		}
		return prev;

	}, {});
	return result;

}).map((value) => {
	const name = value.name.replace(/\[(.*?)\]/gm, "").trim().replace("&nbsp;", "");
	const country = value.country.replace(/\[(.*?)\]/gm, "").trim().replace("&nbsp;", "");
	if (!value.taxes) {
		return { ...value, name, country, taxes: [] };
	}
	else {
		const taxes = value.taxes.map(t => t.replace(/\[(.*?)\]/gm, "").trim())

		return { ...value, name, country, taxes };
	}
}).reduce((prev, cur) => {
	if (cur.taxes.length >= 1) {
		const count = cur.taxes.filter(t => (t.match(/(\d*\%)/gm) || []).length > 1).length;
		if (count >= 1) {
			prev.countryLaw.push(cur);
			return prev;
		} else {
			prev.countryNormal.push(cur);
			return prev;
		}

	} else {
		prev.countryNormal.push(cur);
		return prev;
	}


}, { countryNormal: [], countryLaw: [] })

console.log("Normal country ==>", t.countryNormal.length, "Law Country", t.countryLaw.length);
fs.writeFileSync("./taxes2.json", JSON.stringify({ countries: t }));