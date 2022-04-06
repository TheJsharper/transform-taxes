
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from 'url'

export class TaxTransformer {

	constructor() {
		this.filename = fileURLToPath(import.meta.url)
	}

	transformTaxJson() {

		const rawdata = readFileSync(resolve(dirname(this.filename), '../db-json/tax-from-wiki.json'));
		const taxes = JSON.parse(rawdata);

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
		writeFileSync(resolve(dirname(this.filename), "../db-json/taxes2.json"), JSON.stringify({ countries: t }));
	}
	transformTaxJsonDifferencial() {
		const rawdata = readFileSync(resolve(dirname(this.filename), '../db-json/world-country-taxes.json'));
		const taxes = JSON.parse(rawdata);
		const normalCountries = taxes.countries.countryNormal
			.map((country) => ({ ...country, differencialTaxes: !country.differencialTaxes ? [] : country.differencialTaxes }));
		const result = [...normalCountries, ...taxes.countries.countryLaw]
			.map((country) => {
				const differencialTaxes = country.differencialTaxes
					.map(value => ({ ...value, porcentage: value.porcentage.replace(",", ".") }))
					.map(tax => ({ ...tax, value: parseFloat(tax.porcentage) }));
				const taxes = country.taxes
					.map((taxes) => taxes.replace(",", "."))
					/*.reduce(tax=>{

					})*/
					.map(tax => ({ value: parseFloat(tax), porcentage: tax }));
				return { ...country, taxes, differencialTaxes }
			});

		writeFileSync(resolve(dirname(this.filename), "../db-json/taxes-output.json"), JSON.stringify({ countries: result }, null, 4));

	}
}

