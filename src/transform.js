
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

				const result = country.taxes
					.map((taxes) => taxes.replace(",", "."));

				const uniqueList = result.reduce((prev, cur) => {
					if (!prev.has(cur)) {
						prev.set(cur, [cur]);
						return prev;
					} else {
						prev.get(cur).push(cur);
						return prev;
					}
				}, new Map()).keys();

				const taxes = Array.from(uniqueList)
					.map(tax => ({ value: parseFloat(tax), porcentage: tax }));
				return { ...country, taxes, differencialTaxes }
			});

		writeFileSync(resolve(dirname(this.filename), "../db-json/taxes-output.json"), JSON.stringify({ countries: result }, null, 4));
		this.#printAllCountries();
	}
	#mergeAllContriesWithTaxes(countryName) {
		const rawDataTaxes = readFileSync(resolve(dirname(this.filename), '../db-json/taxes-output.json'));
		const taxes = JSON.parse(rawDataTaxes);
		const rawDataConutries = readFileSync(resolve(dirname(this.filename), /*'../db-json/all-countries.json'*/ countryName));
		const countries = JSON.parse(rawDataConutries)
		.map(country => {
			const tax = taxes.countries.find(c => {
				const countryName = c.country.toUpperCase();
				const name = c.name.toUpperCase();
				const commonName = country.name.common.toUpperCase();
				const officialName = country.name.official.toUpperCase();
				const isContainsName = countryName.includes(commonName) || name.includes(officialName) ||
					countryName.includes(officialName) || name.includes(commonName);
				return isContainsName;
			});
			if (tax) {
				return { ...country, tax };
			}
			return { ...country };
		});
		return countries;

	}
	#printAllCountries() {
		const folder = '../db-json';
		[
			`all-countries.json`,
			`america-countries.json`,
			`asia-countries.json`,
			`africa-countries.json`,
			`europe-countries.json`,
			`oceania-countries.json`,
		].map(path => ({
			country: this.#mergeAllContriesWithTaxes(`${folder}/${path}`), path
		})
		).map(countryData => ({
			country: countryData, path: `${folder}/output/taxed-${countryData.path}`
		})).map(result => {
			writeFileSync(resolve(dirname(this.filename), result.path/* "../db-json/taxes-output.json"*/), JSON.stringify(result.country, null, 4));
			return { ...result, succes: true };
		}).forEach(result => console.log("===>", result.path, "===>", result.succes));
	}
}

