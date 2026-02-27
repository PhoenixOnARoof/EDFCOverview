import { parse } from 'csv-parse/sync';
import { readFileSync, readdirSync } from 'fs';

export function capitalizer(sentence = '') {
    return sentence.split(' ').map((word) => {
        return word[0].toUpperCase() + word.substring(1);
    }).join(" ");
}

// export const commodities = parse(readFileSync('./asset_ids/commodity.csv', 'utf-8').toLowerCase(), {
//     columns: true,
//     skip_empty_lines: true,
//     objname: 'symbol'
// });

let csvs = {};

const files = readdirSync('./asset_ids/').filter(x => x.endsWith('.csv'));

for (const file_name of files) {

    const file = readFileSync('./asset_ids/' + file_name, 'utf-8').toLowerCase();

    csvs[file_name.split('.')[0].toLowerCase()] = parse(file, {
        columns: true,
        skip_empty_lines: true,
        relaxColumnCount: true,
        objname: 'symbol'
    });

}

export default csvs;